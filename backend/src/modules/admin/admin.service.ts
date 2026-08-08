// backend/src/modules/admin/admin.service.ts
//
// v1.1 — 🔥 CORRECTION : bug des retardataires (même famille que
//   dashboard-member.service.ts). listLateMembers() calculait diffMonths à
//   partir de la date de validation du DERNIER versement uniquement
//   (orderBy validatedAt desc, take 1) puis un diff de dates brut — un
//   membre ayant validé ses 12 mois d'un coup en janvier (donc
//   validatedAt = janvier pour les 12) ressortait "en retard" dès février,
//   sans jamais regarder monthReference/yearReference. Repris ici le même
//   couple buildCoveredMonths/computeLateMonths que member.service.ts et
//   dashboard-member.service.ts (pattern déjà dupliqué à plusieurs endroits
//   du code, ex. getPricingMap()).
//
// v1.2 — 🔥 AJOUT : listLateMembers() renvoie désormais `currency` et
//   `antennaName` par membre, requis par LateMembersModal (admin/page.tsx et
//   super-admin/page.tsx) pour estimer le montant dû (mois × tarif) — absent
//   jusqu'ici, ce qui faisait retomber ces pages sur un repli 'GNF'
//   silencieusement faux pour toute autre devise. Seuil également abaissé à
//   1 mois (au lieu de 3) : cette liste alimente /admin/late-members,
//   consultée par ANTENNA_ADMIN et SUPER_ADMIN pour relancer tôt,
//   contrairement à la vue "communautaire" (member.service.ts::listLateMembers)
//   qui reste à 3.
//
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, ContributionStatus, ContributionPurpose, ProjectStatus, PostStatus, Prisma, UserRole, ProposalStatus, NotificationType, LedgerEntryType } from '@prisma/client';
import { memberMapper } from '../member/member.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs';
import { CreateMemberDto } from './dto/create-member.dto';

// ─── Helpers retard (identiques à member.service.ts / dashboard-member.service.ts) ──
function buildCoveredMonths(
  contributions: Array<{
    monthReference: number | null;
    yearReference: number | null;
    validatedAt: Date | null;
    createdAt: Date;
    amount?: unknown;
  }>,
  monthlyPrice: number,
): Set<string> {
  const covered = new Set<string>();

  for (const c of contributions) {
    const amt = c.amount != null ? Number(c.amount) : 0;

    const numMonths =
      monthlyPrice > 0 && amt > 0
        ? Math.min(48, Math.max(1, Math.floor(amt / monthlyPrice)))
        : 1;

    let m: number;
    let y: number;

    if (c.monthReference && c.yearReference) {
      m = c.monthReference;
      y = c.yearReference;
    } else {
      const d = new Date(c.validatedAt ?? c.createdAt);
      m = d.getMonth() + 1;
      y = d.getFullYear();
    }

    for (let i = 0; i < numMonths; i++) {
      covered.add(`${y}-${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
  }

  return covered;
}

function computeLateMonths(
  coveredMonths: Set<string>,
  joinDate: Date,
  maxLookback = 24,
): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let lateMonths = 0;
  let checkMonth = currentMonth - 1;
  let checkYear = currentYear;

  if (checkMonth < 1) {
    checkMonth = 12;
    checkYear--;
  }

  for (let i = 0; i < maxLookback; i++) {
    const key = `${checkYear}-${String(checkMonth).padStart(2, '0')}`;
    const monthStart = new Date(checkYear, checkMonth - 1, 1);

    if (monthStart < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1))
      break;

    if (!coveredMonths.has(key)) lateMonths++;

    checkMonth--;
    if (checkMonth < 1) { checkMonth = 12; checkYear--; }
  }

  return lateMonths;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── getPricingMap (même pattern dupliqué que member.service.ts /
  //   contributions.service.ts / dashboard-member.service.ts) ──────────────
  private async getPricingMap(
    associationId: string,
  ): Promise<Record<string, { monthlyQuota: number; membershipCard: number }>> {
    const rows = await this.prisma.pricing.findMany({ where: { associationId } });
    const map: Record<string, { monthlyQuota: number; membershipCard: number }> = {};
    for (const p of rows) {
      map[p.currency] = {
        monthlyQuota: Number(p.monthlyQuota),
        membershipCard: Number(p.membershipCard),
      };
    }
    return map;
  }

  /**
   * Helper privé pour récupérer le contexte complet (Antenne(s) + Association)
   * CORRECTION CHIRURGICALE : Support du SUPER_ADMIN sans assignation d'antenne fixe.
   * CORRECTION (2) : un admin peut être responsable de PLUSIEURS antennes (tant
   * qu'elles partagent la même devise) — on renvoie donc désormais la liste
   * complète de ses antennes actives (`antennaIds`) via `findMany`, au lieu
   * d'une seule antenne choisie arbitrairement par `findFirst`. C'était la
   * cause du bug où un admin multi-antennes ne voyait les cotisations/membres/
   * projets/documents/annonces que d'UNE seule de ses antennes.
   */
  private async getAdminContext(adminId: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: adminId },
      select: { id: true, role: true, associationId: true }
    });

    if (!user) throw new ForbiddenException("Utilisateur introuvable.");

    if (user.role === UserRole.SUPER_ADMIN) {
      return {
        antennaIds: undefined,
        associationId: user.associationId
      };
    }

    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { adminUserId: adminId, isActive: true },
      include: { antenna: true }
    });

    if (assignments.length === 0 || !assignments[0].antenna) {
      throw new ForbiddenException("Vous n'avez aucune antenne active assignée.");
    }

    return {
      antennaIds: assignments.map(a => a.antennaId),
      associationId: assignments[0].antenna.associationId
    };
  }

  /**
   * Vérifie s'il reste au moins une contribution MEMBERSHIP_CARD validée
   * pour ce membre. Si oui → carte déverrouillée. Sinon → reverrouillée.
   */
  private async _syncVirtualCardLock(memberUserId: string, associationId: string): Promise<void> {
    const activeCardContribution = await this.prisma.contribution.findFirst({
      where: {
        memberUserId,
        associationId,
        purpose: 'MEMBERSHIP_CARD',
        status: ContributionStatus.VALIDATED,
      },
    });

    const shouldLock = !activeCardContribution;

    await this.prisma.virtualCard.updateMany({
      where: { userId: memberUserId },
      data: { isLocked: shouldLock },
    });

    if (shouldLock) {
      await this.notifications.createForUser({
        associationId,
        userId: memberUserId,
        message: `Votre carte membre a été désactivée suite à l'annulation de votre cotisation.`,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Carte membre désactivée',
      });
    }
  }

  /**
   * Détermine l'antenne cible d'un nouveau MEMBRE pour un admin qui peut gérer
   * plusieurs antennes. Un membre doit toujours appartenir à une antenne réelle
   * (jamais "global"). Si le front envoie un antennaId explicite (sélecteur),
   * on vérifie qu'il fait bien partie des antennes actives de l'admin. Sinon,
   * on retombe sur le comportement historique (première antenne gérée, ou
   * première antenne de l'association pour un SUPER_ADMIN) — ce fallback est
   * volontairement conservé pour ne rien casser tant que le sélecteur n'est
   * pas branché sur le formulaire de création.
   */
  private async resolveRequiredAntennaId(
    antennaIds: string[] | undefined,
    associationId: string,
    requestedAntennaId?: string,
  ): Promise<string> {
    if (requestedAntennaId) {
      if (antennaIds && !antennaIds.includes(requestedAntennaId)) {
        throw new ForbiddenException("Cette antenne ne fait pas partie de vos antennes assignées.");
      }
      return requestedAntennaId;
    }

    if (antennaIds?.length) {
      return antennaIds[0];
    }

    const fallback = await this.prisma.antenna.findFirst({ where: { associationId } });
    if (!fallback) throw new NotFoundException("Aucune antenne disponible pour cette association.");
    return fallback.id;
  }

  /**
   * Même logique que `resolveRequiredAntennaId`, mais pour les entités qui
   * peuvent rester "globales" (antennaId null) — projets, documents, annonces.
   */
  private async resolveOptionalAntennaId(
    antennaIds: string[] | undefined,
    requestedAntennaId?: string,
  ): Promise<string | null> {
    if (requestedAntennaId) {
      if (antennaIds && !antennaIds.includes(requestedAntennaId)) {
        throw new ForbiddenException("Cette antenne ne fait pas partie de vos antennes assignées.");
      }
      return requestedAntennaId;
    }
    return antennaIds?.[0] || null;
  }

  // --- GESTION DES MEMBRES (APPROBATIONS) ---

  async listPendingApprovals(adminId: string, page: number, pageSize: number) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = { 
      associationId,
      status: UserStatus.PENDING_APPROVAL, 
      role: UserRole.MEMBER, 
      ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}) 
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' }, 
        include: { memberships: { include: { antenna: true } } } 
      }),
      this.prisma.user.count({ where }),
    ]);

    return { 
      items: items.map(u => memberMapper.userSummary(u)), 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize) 
    };
  }

  async approveMember(userId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { 
        id: userId, 
        associationId, 
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}) 
      } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    const updated = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.ACTIVE, approvedByUserId: adminId, approvedAt: new Date() } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.id,
      message: `Félicitations ! Votre compte a été approuvé par l'administration.`,
      type: NotificationType.ACCOUNT_APPROVED,
      title: 'Compte activé',
    });

    return updated;
  }

  async rejectMember(userId: string, adminId: string, reason: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { 
        id: userId, 
        associationId, 
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}) 
      } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    const updated = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.REJECTED, rejectedByUserId: adminId, rejectedAt: new Date(), rejectionReason: reason } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.id,
      message: `Votre demande d'adhésion a été rejetée. Motif : ${reason}`,
      type: NotificationType.ACCOUNT_REJECTED,
      title: 'Demande refusée',
    });

    return updated;
  }

  async listMembers(adminId: string, page: number, pageSize: number, q?: string, status?: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = { 
      associationId,
      role: UserRole.MEMBER,
      ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}),
      ...(status ? { status: status as UserStatus } : { NOT: { status: UserStatus.DELETED } }) 
    };

    if (q) { 
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } }, 
        { lastName: { contains: q, mode: 'insensitive' } }, 
        { email: { contains: q, mode: 'insensitive' } }
      ]; 
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { lastName: 'asc' },
        include: { virtualCard: true }
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map(u => memberMapper.userSummary(u)), total, page, pageSize };
  }

  async exportMembers(adminId: string): Promise<string> {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const members = await this.prisma.user.findMany({ 
      where: { 
        associationId,
        role: UserRole.MEMBER,
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {})
      }, 
      orderBy: { lastName: 'asc' } 
    });

    const header = "Nom;Prenom;Email;Statut;Date d'inscription\n";
    const rows = members.map(m => `${m.lastName};${m.firstName};${m.email};${m.status};${m.createdAt.toISOString()}`).join('\n');
    return header + rows;
  }

  // 🔥 CORRIGÉ (v1.1) : basé sur les mois réellement couverts
  // (buildCoveredMonths/computeLateMonths, alignés sur member.service.ts et
  // dashboard-member.service.ts) au lieu d'un simple diff sur la date de
  // validation du dernier versement — cf. commentaire en tête de fichier.
  // 🔥 v1.2 : ajout de `currency` / `antennaName` dans le retour, et seuil
  // abaissé à 1 mois (cf. commentaire en tête de fichier).
  async listLateMembers(adminId: string, page: number, pageSize: number) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);

    const [users, allPricing] = await Promise.all([
      this.prisma.user.findMany({ 
        where: { 
          associationId,
          status: UserStatus.ACTIVE, 
          role: UserRole.MEMBER,
          ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}) 
        },
        orderBy: { lastName: 'asc' },
        include: {
          // Historique complet des cotisations régulières/retard validées,
          // avec les champs nécessaires à buildCoveredMonths.
          contributions: {
            where: {
              status: ContributionStatus.VALIDATED,
              purpose: { in: [ContributionPurpose.REGULAR_QUOTA, ContributionPurpose.LATE_QUOTA] },
            },
            select: {
              monthReference: true,
              yearReference: true,
              validatedAt: true,
              createdAt: true,
              amount: true,
            },
          },
          // Dernier versement validé (toutes natures) — pour l'affichage
          // "dernier paiement", indépendant du calcul des mois couverts.
          memberships: {
            where: { isPrimary: true },
            take: 1,
            select: { antenna: { select: { defaultCurrency: true, name: true } } },
          },
        },
      }),
      this.getPricingMap(associationId),
    ]);

    // Dernier versement validé (toutes natures confondues), par utilisateur —
    // requête séparée car le filtre de purpose ci-dessus exclut carte
    // membre / dons, qui doivent quand même compter pour "dernier paiement".
    const lastAnyValidated = await this.prisma.contribution.findMany({
      where: {
        associationId,
        status: ContributionStatus.VALIDATED,
        memberUserId: { in: users.map(u => u.id) },
      },
      orderBy: { validatedAt: 'desc' },
      distinct: ['memberUserId'],
      select: { memberUserId: true, validatedAt: true },
    });
    const lastValidatedByUser = new Map(lastAnyValidated.map(c => [c.memberUserId, c.validatedAt]));

    const lateMembers = users
      .map((u) => {
        const antCurrency = u.memberships[0]?.antenna?.defaultCurrency ?? 'EUR';
        const monthlyPrice =
          Number(allPricing[antCurrency]?.monthlyQuota) ||
          Number(allPricing['EUR']?.monthlyQuota)        ||
          0;
        const covered = buildCoveredMonths(u.contributions, monthlyPrice);
        const referenceDate = u.approvedAt || u.createdAt;
        const lateMonths = computeLateMonths(covered, referenceDate);

        return {
          ...memberMapper.userSummary(u),
          lateMonths,
          lastValidatedContributionAt: lastValidatedByUser.get(u.id) ?? null,
          // 🔥 AJOUT : requis par LateMembersModal (admin/page.tsx et
          // super-admin/page.tsx) pour estimer le montant dû (mois × tarif)
          // — absent jusqu'ici, ce qui faisait retomber ces pages sur un
          // repli 'GNF' silencieusement faux pour toute autre devise.
          currency: antCurrency,
          antennaName: u.memberships[0]?.antenna?.name ?? null,
        };
      })
      // 🔥 CORRIGÉ : seuil abaissé à 1 mois — cette liste alimente
      // /admin/late-members, consultée par ANTENNA_ADMIN et SUPER_ADMIN
      // pour relancer tôt, contrairement à la vue "communautaire"
      // (member.service.ts::listLateMembers) qui reste à 3.
      .filter((m) => m.lateMonths >= 1)
      .sort((a, b) => b.lateMonths - a.lateMonths);

    const skip = (page - 1) * pageSize;
    const paginatedItems = lateMembers.slice(skip, skip + pageSize);

    return { 
      items: paginatedItems, 
      total: lateMembers.length, 
      page, 
      pageSize,
      totalPages: Math.ceil(lateMembers.length / pageSize)
    };
  }

  async createMember(adminId: string, data: CreateMemberDto & { antennaId?: string }) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);

    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException("Cet email est déjà utilisé.");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Sélecteur d'antenne (admin multi-antennes) : utilise l'antenne choisie
    // côté front si fournie et valide, sinon retombe sur le comportement
    // historique (première antenne gérée par l'admin).
    const targetAntennaId = await this.resolveRequiredAntennaId(antennaIds, associationId, data.antennaId);

    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        originSubPrefecture: data.originSubPrefecture,
        professionalStatus: data.professionalStatus,
        function: data.function,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        placeOfBirth: data.placeOfBirth,
        countryOfBirth: data.birthCountry,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        associationId,
        createdByUserId: adminId,
        approvedByUserId: adminId,
        approvedAt: new Date(),
        emailVerifiedAt: new Date(),
        memberships: {
          create: {
            antennaId: targetAntennaId,
            associationId,
            status: 'APPROVED',
            isPrimary: true,
            joinedAt: new Date(),
            approvedByUserId: adminId,
            approvedAt: new Date(),
          }
        }
      }
    });

    return { 
      message: "Membre créé avec succès.",
      user: memberMapper.userSummary(newUser)
    };
  }

  async suspendUser(userId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { 
        id: userId, 
        associationId, 
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}) 
      } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    const updated = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.SUSPENDED, suspendedByUserId: adminId, suspendedAt: new Date() } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.id,
      message: `Votre compte membre a été suspendu par l'administration.`,
      type: NotificationType.ACCOUNT_SUSPENDED,
      title: 'Compte suspendu',
    });

    return updated;
  }

  async activateUser(userId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { 
        id: userId, 
        associationId, 
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}) 
      } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    const updated = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.ACTIVE, suspendedByUserId: null, suspendedAt: null } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.id,
      message: `Votre compte membre a été réactivé. Vous pouvez à nouveau accéder à tous les services.`,
      type: NotificationType.ACCOUNT_APPROVED,
    });

    return updated;
  }

  async deleteUser(userId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { 
        id: userId, 
        associationId, 
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}) 
      } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.DELETED, deletedByUserId: adminId, deletedAt: new Date() } 
    });
  }

  async updateAntennaMember(userId: string, adminId: string, data: any) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { 
        id: userId, 
        associationId, 
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}) 
      } 
    });

    if (!user) throw new NotFoundException("Membre introuvable.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { 
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
        ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 } : {}),
        ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 } : {}),
        ...(data.originSubPrefecture !== undefined ? { originSubPrefecture: data.originSubPrefecture } : {}),
        ...(data.professionalStatus !== undefined ? { professionalStatus: data.professionalStatus } : {}),
        ...(data.function !== undefined ? { function: data.function } : {}),
        ...(data.birthDate !== undefined ? { birthDate: data.birthDate ? new Date(data.birthDate) : null } : {}),
        ...(data.placeOfBirth !== undefined ? { placeOfBirth: data.placeOfBirth } : {}),
        ...(data.birthCountry !== undefined ? { countryOfBirth: data.birthCountry } : {}),
      } 
    });
  }

  // --- GESTION DES COTISATIONS ---

  async listContributions(adminId: string, page: number, pageSize: number, status?: string, q?: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;

    let contributionStatus: ContributionStatus | undefined = undefined;
    if (status) {
      contributionStatus = status === 'PENDING' ? ContributionStatus.PENDING_VALIDATION : (status as ContributionStatus);
    }

    const where: Prisma.ContributionWhereInput = { 
      associationId,
      ...(antennaIds ? { antennaId: { in: antennaIds } } : {}), 
      ...(contributionStatus ? { status: contributionStatus } : {}) 
    };
    if (q) { 
      where.OR = [
        { externalReference: { contains: q, mode: 'insensitive' } }, 
        { member: { lastName: { contains: q, mode: 'insensitive' } } }
      ]; 
    }

    const [items, total] = await Promise.all([
      this.prisma.contribution.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' }, 
        include: { 
          member: true,
          submitter: { select: { firstName: true, lastName: true } }
        } 
      }),
      this.prisma.contribution.count({ where }),
    ]);

    return {
      items: items.map(c => ({ 
        ...memberMapper.contribution(c),
        member: c.member ? {
          id: c.member.id,
          firstName: c.member.firstName,
          lastName: c.member.lastName,
          email: c.member.email,
          phone: c.member.phone
        } : null,
        memberName: c.member ? `${c.member.firstName} ${c.member.lastName}` : 'Inconnu' 
      })),
      total, page, pageSize
    };
  }

  /**
   * 🔥 CORRECTION : crée désormais une LedgerEntry (CONTRIBUTION_IN) dans la
   * même transaction que le passage au statut VALIDATED, sur le modèle de
   * contributions.service.ts::validateContribution. Sans ça, LedgerService.getBalances
   * (qui ne lit QUE LedgerEntry) ignorait totalement les cotisations validées
   * depuis ce panneau admin.
   */
  async validateContribution(contributionId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { 
        id: contributionId, 
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {})
      },
      include: { member: true } 
    });

    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    const updated = await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerEntry.create({
        data: {
          associationId: contribution.associationId,
          antennaId: contribution.antennaId,
          contributionId: contribution.id,
          type: LedgerEntryType.CONTRIBUTION_IN,
          amount: contribution.amount,
          currency: contribution.currency,
          title: `Cotisation validée (${contribution.purpose})`,
          createdByUserId: adminId,
        },
      });

      return tx.contribution.update({
        where: { id: contributionId },
        data: {
          status: ContributionStatus.VALIDATED,
          validatedAt: new Date(),
          validatedByUserId: adminId,
          ledgerEntryId: ledger.id,
        },
      });
    });

    await this.notifications.createForUser({
      associationId,
      userId: contribution.memberUserId,
      message: `Votre versement de ${contribution.amount} ${contribution.currency} a été validé.`,
      type: NotificationType.CONTRIBUTION_VALIDATED,
    });

    if (contribution.purpose === 'MEMBERSHIP_CARD') {
      const now = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(now.getFullYear() + 1);

      await this.prisma.virtualCard.upsert({
        where: { userId: contribution.memberUserId },
        create: {
          userId: contribution.memberUserId,
          cardNumber: `LCD-${now.getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          issuedAt: now,
          expiresAt: nextYear,
          isLocked: false,
        },
        update: {
          issuedAt: now,
          expiresAt: nextYear,
          isLocked: false,
        }
      });

      await this.notifications.createForUser({
        associationId,
        userId: contribution.memberUserId,
        message: `Votre carte membre virtuelle a été générée et activée !`,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Carte membre active',
      });
    }

    return updated;
  }

  async rejectContribution(contributionId: string, adminId: string, reason: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { 
        id: contributionId, 
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {})
      } 
    });
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    const updated = await this.prisma.contribution.update({ 
      where: { id: contributionId }, 
      data: { status: ContributionStatus.REJECTED, rejectionReason: reason, validatedAt: new Date(), validatedByUserId: adminId } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.memberUserId,
      message: `Votre versement de ${updated.amount} ${updated.currency} a été refusé. Motif : ${reason}`,
      type: NotificationType.CONTRIBUTION_REJECTED,
    });

    // 🔥 Si c'était une carte membre, resynchroniser le verrou de la carte
    if (contribution.purpose === 'MEMBERSHIP_CARD') {
      await this._syncVirtualCardLock(contribution.memberUserId, associationId);
    }

    return updated;
  }

  /**
   * 🔥 CORRECTION : si la cotisation était déjà VALIDATED (donc reliée à une
   * LedgerEntry), on met à jour le montant de cette écriture dans la même
   * transaction — sinon le solde continue d'afficher l'ancien montant après
   * une correction manuelle.
   */
  async updateContribution(contributionId: string, adminId: string, amount: number) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { 
        id: contributionId, 
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}) 
      } 
    });
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    return this.prisma.$transaction(async (tx) => {
      if (contribution.status === ContributionStatus.VALIDATED && contribution.ledgerEntryId) {
        await tx.ledgerEntry.update({
          where: { id: contribution.ledgerEntryId },
          data: { amount: new Prisma.Decimal(amount) },
        });
      }
      return tx.contribution.update({ 
        where: { id: contributionId }, 
        data: { amount: new Prisma.Decimal(amount) } 
      });
    });
  }

  /**
   * 🔥 CORRECTION : si la cotisation était VALIDATED, on supprime aussi sa
   * LedgerEntry associée dans la même transaction, pour ne pas laisser une
   * écriture comptable orpheline (ou pire, une contribution supprimée dont
   * l'argent reste compté dans le solde).
   */
  async deleteContribution(contributionId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { 
        id: contributionId, 
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}) 
      } 
    });
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    await this.prisma.$transaction(async (tx) => {
      await tx.contribution.delete({ where: { id: contributionId } });
      if (contribution.status === ContributionStatus.VALIDATED && contribution.ledgerEntryId) {
        await tx.ledgerEntry.delete({ where: { id: contribution.ledgerEntryId } });
      }
    });

    // 🔥 Si c'était une carte membre validée, resynchroniser le verrou
    if (contribution.purpose === 'MEMBERSHIP_CARD') {
      await this._syncVirtualCardLock(contribution.memberUserId, associationId);
    }

    return { success: true };
  }

  // --- GESTION DES PROJETS ET PROPOSITIONS ---

  async listProjects(adminId: string, page: number, pageSize: number, status?: string, q?: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProjectWhereInput = { 
      associationId,
      ...(status ? { status: status as ProjectStatus } : {}) 
    };

    const andConditions: Prisma.ProjectWhereInput[] = [];

    if (antennaIds) {
      andConditions.push({
        OR: [
          { antennaId: { in: antennaIds } },
          { status: { notIn: [ProjectStatus.PROPOSED, ProjectStatus.UNDER_REVIEW] } }
        ]
      });
    }

    if (q) { 
      andConditions.push({
        OR: [
          { title: { contains: q, mode: 'insensitive' } }, 
          { description: { contains: q, mode: 'insensitive' } }
        ]
      }); 
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' },
        include: { attachments: { include: { file: true } } }
      }),
      this.prisma.project.count({ where }),
    ]);

    return { 
      items: items.map(p => {
        const mappedProject = memberMapper.project(p);
        return {
          ...mappedProject,
          attachments: p.attachments?.map(a => ({
            id: a.file.id,
            url: a.file.url
          })) || []
        };
      }), 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize) 
    };
  }

  async exportProjectPdf(projectId: string, adminId: string): Promise<Buffer> {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const project = await this.prisma.project.findFirst({
      where: { 
        id: projectId, 
        associationId,
        ...(antennaIds ? { 
          OR: [
            { antennaId: { in: antennaIds } },
            { status: { notIn: [ProjectStatus.PROPOSED, ProjectStatus.UNDER_REVIEW] } }
          ]
        } : {})
      },
      include: { attachments: { include: { file: true } } }
    });

    if (!project) throw new NotFoundException("Projet introuvable.");

    const PDFDocument = require('pdfkit');

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const addSection = (title: string, content: string | null | undefined) => {
          if (!content) return;
          doc.moveDown();
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#1D4ED8').text(title);
          doc.moveDown(0.5);
          doc.fontSize(11).font('Helvetica').fillColor('#374151').text(content, { align: 'justify' });
        };

        const safeStringify = (val: any) => typeof val === 'string' ? val : JSON.stringify(val, null, 2);

        doc.fontSize(24).font('Helvetica-Bold').fillColor('#0F172A').text(project.title, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font('Helvetica').fillColor('#6B7280');
        if (project.promoterName) doc.text(`Promoteur: ${project.promoterName}`, { align: 'center' });
        if (project.locationText) doc.text(`Localisation: ${project.locationText}`, { align: 'center' });
        doc.text(`Statut: ${project.status}`, { align: 'center' });
        doc.moveDown(2);

        addSection('Résumé', project.summary);
        addSection('Description Complète', project.description);
        addSection('Bénéficiaires Cibles', project.targetBeneficiaries);
        addSection('Impact sur la Population', project.populationImpact);
        addSection('Impact Environnemental', project.environmentalImpact);

        if (project.specificObjectives) addSection('Objectifs Spécifiques', safeStringify(project.specificObjectives));
        if (project.expectedResults) addSection('Résultats Attendus', safeStringify(project.expectedResults));
        if (project.successIndicators) addSection('Indicateurs de Succès', safeStringify(project.successIndicators));

        addSection("Méthode d'Implémentation", project.implementationMethod);
        addSection('Risques et Mitigations', project.risksAndMitigation);

        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1D4ED8').text('Budget & Exécution');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#374151');
        doc.text(`Budget Prévu: ${project.budgetAmount ? project.budgetAmount.toString() : 'Non défini'}`);
        doc.text(`Budget Dépensé: ${project.amountSpent ? project.amountSpent.toString() : '0'}`);
        if (project.startDate) doc.text(`Date de début: ${project.startDate.toLocaleDateString('fr-FR')}`);
        if (project.endDate) doc.text(`Date de fin: ${project.endDate.toLocaleDateString('fr-FR')}`);

        if (project.attachments && project.attachments.length > 0) {
          doc.addPage();
          doc.fontSize(18).font('Helvetica-Bold').fillColor('#1D4ED8').text('Galerie Photos', { align: 'center' });
          doc.moveDown();

          for (const att of project.attachments) {
            if (att.file && att.file.url) {
              try {
                const response = await fetch(att.file.url);
                if (response.ok) {
                  const arrayBuffer = await response.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  doc.moveDown();
                  doc.image(buffer, { fit: [450, 350], align: 'center' });
                  doc.moveDown(2);
                }
              } catch (e) {
                console.error('Erreur image PDF:', e);
              }
            }
          }
        }
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async listProjectProposals(adminId: string, page: number, pageSize: number, status?: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProjectProposalWhereInput = { 
      associationId,
      ...(antennaIds ? { antennaId: { in: antennaIds } } : {}), 
      ...(status ? { status: status as ProposalStatus } : {}) 
    };

    const [items, total] = await Promise.all([
      this.prisma.projectProposal.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { author: true } }),
      this.prisma.projectProposal.count({ where }),
    ]);

    return { 
      items: items.map(p => ({
        ...memberMapper.projectProposal(p),
        authorName: p.author ? `${p.author.firstName} ${p.author.lastName}` : 'Inconnu',
        estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null
      })), 
      total, page, pageSize, totalPages: Math.ceil(total / pageSize) 
    };
  }

  async approveProjectProposal(proposalId: string, adminId: string, reviewComment?: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);

    const proposal = await this.prisma.projectProposal.findFirst({
      where: {
        id: proposalId,
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}),
      },
      include: { author: true },
    });

    if (!proposal) throw new NotFoundException('Proposition introuvable.');

    const updated = await this.prisma.projectProposal.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.APPROVED,
        reviewComment: reviewComment ?? null,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
      },
    });

    const project = await this.prisma.project.create({
      data: {
        associationId,
        // On garde l'antenne d'origine de la proposition (non ambigu) ; on ne
        // retombe sur la première antenne de l'admin que si la proposition
        // elle-même n'en avait pas (ex. proposition créée par un super admin).
        antennaId: proposal.antennaId ?? antennaIds?.[0] ?? null,
        title: proposal.title,
        description: proposal.description,
        budgetAmount: proposal.estimatedBudget ?? null,
        currency: proposal.currency ?? 'EUR',
        status: ProjectStatus.PROPOSED,
        createdByUserId: adminId,
      },
    });

    if (proposal.authorUserId) {
      await this.notifications.createForUserWithPush({
        associationId,
        userId: proposal.authorUserId,
        message: `Votre proposition de projet "${proposal.title}" a été approuvée !${reviewComment ? ` Commentaire : ${reviewComment}` : ''}`,
        type: NotificationType.PROJECT_PROPOSAL_APPROVED,
        title: '✅ Proposition approuvée',
        pushTitle: '✅ Proposition approuvée',
        pushBody: `Votre projet "${proposal.title}" est maintenant officiel.`,
      });
    }

    return {
      ...memberMapper.projectProposal(updated),
      project: memberMapper.project({ ...project, attachments: [] }),
    };
  }

  async rejectProjectProposal(proposalId: string, adminId: string, reviewComment?: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);

    const proposal = await this.prisma.projectProposal.findFirst({
      where: {
        id: proposalId,
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}),
      },
      include: { author: true },
    });

    if (!proposal) throw new NotFoundException('Proposition introuvable.');

    const updated = await this.prisma.projectProposal.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.REJECTED,
        reviewComment: reviewComment ?? null,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
      },
    });

    if (proposal.authorUserId) {
      await this.notifications.createForUserWithPush({
        associationId,
        userId: proposal.authorUserId,
        message: `Votre proposition de projet "${proposal.title}" n'a pas été retenue.${reviewComment ? ` Motif : ${reviewComment}` : ''}`,
        type: NotificationType.PROJECT_PROPOSAL_REJECTED,
        title: '❌ Proposition rejetée',
        pushTitle: '❌ Proposition rejetée',
        pushBody: `Votre projet "${proposal.title}" n'a pas été retenu.`,
      });
    }

    return memberMapper.projectProposal(updated);
  }

  async createProject(adminId: string, data: any) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);

    let safeStatus = data.status;
    if (safeStatus === 'DRAFT') safeStatus = ProjectStatus.PROPOSED;
    if (safeStatus === 'PENDING_APPROVAL') safeStatus = ProjectStatus.UNDER_REVIEW;
    if (safeStatus === 'SUSPENDED') safeStatus = ProjectStatus.ON_HOLD;

    const targetAntennaId = await this.resolveOptionalAntennaId(antennaIds, data.antennaId);

    const project = await this.prisma.project.create({
      data: { 
        associationId,
        antennaId: targetAntennaId,
        title: data.title,
        summary: data.summary,
        description: data.description,
        locationText: data.locationText,
        promoterName: data.promoterName,
        targetBeneficiaries: data.targetBeneficiaries,
        populationImpact: data.populationImpact,
        environmentalImpact: data.environmentalImpact,
        implementationMethod: data.implementationMethod,
        risksAndMitigation: data.risksAndMitigation,
        specificObjectives: data.specificObjectives,
        expectedResults: data.expectedResults,
        successIndicators: data.successIndicators,
        startDate: data.startsAt ? new Date(data.startsAt) : null,
        endDate: data.endsAt ? new Date(data.endsAt) : null,
        status: safeStatus || ProjectStatus.APPROVED,
        createdByUserId: adminId,
        budgetAmount: data.budgetPlanned ? new Prisma.Decimal(data.budgetPlanned) : null, 
        amountSpent: data.budgetSpent ? new Prisma.Decimal(data.budgetSpent) : 0,
        attachments: {
          create: (data.photoIds || []).map((fileId: string) => ({ fileId }))
        }
      }
    });

    await this.notifications.notifySuperAdmins(
      associationId,
      `Un nouveau projet "${project.title}" a été lancé.`,
      NotificationType.PROJECT_CREATED
    );

    return project;
  }

  async updateProject(projectId: string, adminId: string, data: any) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}),
      },
    });
    if (!project) throw new NotFoundException('Projet introuvable.');

    let safeStatus = data.status;
    if (safeStatus === 'DRAFT')            safeStatus = ProjectStatus.PROPOSED;
    if (safeStatus === 'PENDING_APPROVAL') safeStatus = ProjectStatus.UNDER_REVIEW;
    if (safeStatus === 'SUSPENDED')        safeStatus = ProjectStatus.ON_HOLD;

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        title:                data.title,
        summary:              data.summary,
        description:          data.description,
        locationText:         data.locationText,
        promoterName:         data.promoterName,
        targetBeneficiaries:  data.targetBeneficiaries,
        populationImpact:     data.populationImpact,
        environmentalImpact:  data.environmentalImpact,
        implementationMethod: data.implementationMethod,
        risksAndMitigation:   data.risksAndMitigation,
        specificObjectives:   data.specificObjectives,
        expectedResults:      data.expectedResults,
        successIndicators:    data.successIndicators,
        status:               safeStatus,
        startDate:  data.startsAt ? new Date(data.startsAt) : undefined,
        endDate:    data.endsAt   ? new Date(data.endsAt)   : undefined,
        budgetAmount: data.budgetPlanned ? new Prisma.Decimal(data.budgetPlanned) : undefined,
        amountSpent:  data.budgetSpent   ? new Prisma.Decimal(data.budgetSpent)   : undefined,
      },
    });

    if (Array.isArray(data.photoIds) && data.photoIds.length > 0) {
      await this.prisma.projectAttachment.deleteMany({ where: { projectId } });
      await this.prisma.projectAttachment.createMany({
        data: data.photoIds.map((fileId: string) => ({ projectId, fileId })),
      });
    }

    return updated;
  }

  async deleteProject(projectId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const project = await this.prisma.project.findFirst({ 
      where: { 
        id: projectId, 
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}) 
      } 
    });
    if (!project) throw new NotFoundException("Projet introuvable.");
    return this.prisma.project.delete({ where: { id: projectId } });
  }

  // --- GESTION DES DOCUMENTS ---

  async listDocuments(adminId: string, page: number, pageSize: number, q?: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.DocumentWhereInput = { 
      associationId,
      ...(antennaIds ? { antennaId: { in: antennaIds } } : {}) 
    };

    if (q) {
      where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { file: true } }),
      this.prisma.document.count({ where }),
    ]);

    return { items: items.map(d => memberMapper.documentItem(d)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createDocument(adminId: string, data: any) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);

    const targetAntennaId = await this.resolveOptionalAntennaId(antennaIds, data.antennaId);

    const doc = await this.prisma.document.create({
      data: {
        title: data.title,
        description: data.description,
        fileId: data.fileId,
        antennaId: targetAntennaId,
        associationId,
        uploadedByUserId: adminId, 
        publishedAt: new Date(),
        visibility: 'ALL'
      },
    });

    await this.notifications.notifySuperAdmins(associationId, `Nouveau document : "${doc.title}".`, NotificationType.DOCUMENT_PUBLISHED);
    return doc;
  }

  async deleteDocument(documentId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const doc = await this.prisma.document.findFirst({ 
      where: { 
        id: documentId, 
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}) 
      } 
    });
    if (!doc) throw new NotFoundException("Document introuvable.");
    return this.prisma.document.delete({ where: { id: documentId } });
  }

  // --- GESTION DES CONTENUS (ANNONCES) ---

  async listContents(adminId: string, page: number, pageSize: number, q?: string, status?: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.NewsPostWhereInput = { 
      associationId,
      ...(antennaIds ? { antennaId: { in: antennaIds } } : {}), 
      ...(status ? { status: status as PostStatus } : {}) 
    };

    if (q) {
      where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.newsPost.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' }, 
        include: { coverImageFile: true, attachments: { include: { file: true } } } 
      }),
      this.prisma.newsPost.count({ where }),
    ]);    

    return {
      items: items.map(c => ({
        ...memberMapper.contentPost({ ...c, body: c.content }),
        coverFileAssetId: c.coverImageFileId,
        coverImageFileId: c.coverImageFileId,
        coverImageFile: c.coverImageFile ? { url: c.coverImageFile.url } : null,
        attachments: c.attachments?.map(att => ({ id: att.file.id, url: att.file.url })) || []
      })),
      total, page, pageSize, totalPages: Math.ceil(total / pageSize)
    };
  }

  async createContent(adminId: string, data: any) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);

    const targetAntennaId = await this.resolveOptionalAntennaId(antennaIds, data.antennaId);

    const post = await this.prisma.newsPost.create({
      data: {
        title: data.title,
        content: data.content || data.body || '',
        status: data.status || PostStatus.DRAFT,
        coverImageFileId: data.coverImageFileId || data.coverFileAssetId || null,
        antennaId: targetAntennaId,
        associationId,
        createdByUserId: adminId,
        scope: targetAntennaId ? 'ANTENNA' : 'GLOBAL',
        ...(data.status === PostStatus.PUBLISHED ? { publishedAt: new Date(), publishedByUserId: adminId } : {}),
        attachments: data.imageIds?.length > 0 ? {
          create: data.imageIds.slice(0, 3).map((fileId: string) => ({ fileId }))
        } : undefined
      },
    });

    if (post.status === PostStatus.PUBLISHED) {
      await this.notifications.notifySuperAdmins(associationId, `Nouveau contenu publié : "${post.title}".`, NotificationType.NEWS_PUBLISHED);
    }

    return post;
  }

  async updateContent(contentId: string, adminId: string, data: any) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const post = await this.prisma.newsPost.findFirst({ 
      where: { 
        id: contentId, 
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}) 
      } 
    });
    if (!post) throw new NotFoundException("Contenu introuvable.");

    const imageId = data.coverImageFileId !== undefined ? data.coverImageFileId : data.coverFileAssetId;

    if (data.imageIds !== undefined) {
      await this.prisma.newsPostAttachment.deleteMany({ where: { newsPostId: contentId }});
    }

    return this.prisma.newsPost.update({
      where: { id: contentId },
      data: {
        title: data.title,
        content: data.content ?? data.body,
        status: data.status,
        ...(imageId !== undefined ? { coverImageFileId: imageId } : {}),
        ...(data.imageIds?.length > 0 ? {
          attachments: {
            create: data.imageIds.slice(0, 3).map((fileId: string) => ({ fileId }))
          }
        } : {})
      },
    });
  }

  async deleteContent(contentId: string, adminId: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const post = await this.prisma.newsPost.findFirst({ 
      where: { 
        id: contentId, 
        associationId,
        ...(antennaIds ? { antennaId: { in: antennaIds } } : {}) 
      } 
    });
    if (!post) throw new NotFoundException("Contenu introuvable.");
    return this.prisma.newsPost.delete({ where: { id: contentId } });
  }

  // --- NOTIFICATIONS ---
  async listNotifications(adminId: string, page: number, pageSize: number) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = { 
      associationId,
      ...(antennaIds ? { antennaId: { in: antennaIds } } : {}) 
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);

    return { 
      items: items.map(n => memberMapper.notification(n)), 
      total, page, pageSize, totalPages: Math.ceil(total / pageSize)
    };
  }
}