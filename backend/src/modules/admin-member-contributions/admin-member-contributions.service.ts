// backend/src/modules/admin-member-contributions/admin-member-contributions.service.ts
//
// v1.1 — 🔥 AJOUT : blocage d'un second paiement de carte membre pour un
// membre qui en a déjà une valide. La carte n'a pas de champ "montant déjà
// payé cumulé" en base (c'est un forfait unique, pas une cotisation
// mensuelle) — la source de vérité fiable est VirtualCard.expiresAt (posé
// à validatedAt + 1 an à chaque paiement de carte validé, cf. bloc
// MEMBERSHIP_CARD plus bas et admin.service.ts::validateContribution).
// Tant que expiresAt est dans le futur et que la carte n'est pas
// verrouillée, on refuse un nouveau paiement MEMBERSHIP_CARD pour ce
// membre — corrige le bug de doublons observé (plusieurs clics sur
// "Soumettre" faute de retour visuel créaient chacun une cotisation
// carte validée). hasValidMembershipCard/membershipCardExpiresAt sont
// aussi renvoyés par searchTargetMembers pour que le frontend désactive
// l'option "Carte membre annuelle" avant même la tentative de soumission.
//
// v1.0 — NOUVEAU : cf. changelog d'origine (permet à un ANTENNA_ADMIN ou
// SUPER_ADMIN d'enregistrer une cotisation validée au nom d'un membre qui
// ne peut pas utiliser l'outil lui-même).
//
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  UserRole,
  UserStatus,
  ContributionStatus,
  ContributionPurpose,
  PaymentMethod,
  CurrencyCode,
  LedgerEntryType,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { memberMapper } from '../member/member.mapper';
import { CreateContributionForMemberDto } from './dto/create-contribution-for-member.dto';

// ─── Helpers (dupliqués volontairement — même pattern que member.service.ts
//   / admin.service.ts / dashboard-member.service.ts) ────────────────────────
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

  if (checkMonth < 1) { checkMonth = 12; checkYear--; }

  for (let i = 0; i < maxLookback; i++) {
    const key = `${checkYear}-${String(checkMonth).padStart(2, '0')}`;
    const monthStart = new Date(checkYear, checkMonth - 1, 1);

    if (monthStart < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1)) break;
    if (!coveredMonths.has(key)) lateMonths++;

    checkMonth--;
    if (checkMonth < 1) { checkMonth = 12; checkYear--; }
  }

  return lateMonths;
}

function findEarliestUncoveredMonth(
  coveredMonths: Set<string>,
  joinDate: Date,
  maxLookahead = 24,
): { month: number; year: number } | null {
  let m = joinDate.getMonth() + 1;
  let y = joinDate.getFullYear();

  for (let i = 0; i < maxLookahead; i++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!coveredMonths.has(key)) return { month: m, year: y };
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return null;
}

// ─── Helper : carte membre encore valide ? ────────────────────────────────
function hasValidCard(virtualCard: { expiresAt: Date | null; isLocked: boolean } | null | undefined): boolean {
  if (!virtualCard || !virtualCard.expiresAt || virtualCard.isLocked) return false;
  return virtualCard.expiresAt.getTime() > Date.now();
}

@Injectable()
export class AdminMemberContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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

  private async getAdminContext(adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, associationId: true },
    });

    if (!user) throw new ForbiddenException('Utilisateur introuvable.');

    if (user.role === UserRole.SUPER_ADMIN) {
      return { antennaIds: undefined as string[] | undefined, associationId: user.associationId };
    }

    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { adminUserId: adminId, isActive: true },
      include: { antenna: true },
    });

    if (assignments.length === 0 || !assignments[0].antenna) {
      throw new ForbiddenException("Vous n'avez aucune antenne active assignée.");
    }

    return {
      antennaIds: assignments.map((a) => a.antennaId),
      associationId: assignments[0].antenna.associationId,
    };
  }

  // ─── Recherche d'un membre cible, scopée aux antennes de l'admin ─────────
  async searchTargetMembers(adminId: string, q: string) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);
    if (!q || q.trim().length < 2) return [];

    const [association, allPricing] = await Promise.all([
      this.prisma.association.findUnique({
        where: { id: associationId },
        select: { defaultCurrency: true },
      }),
      this.getPricingMap(associationId),
    ]);

    const users = await this.prisma.user.findMany({
      where: {
        associationId,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}),
        OR: [
          { firstName: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { lastName: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { phone: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        memberships: {
          where: antennaIds ? { antennaId: { in: antennaIds } } : undefined,
          take: 1,
          select: {
            antenna: { select: { id: true, name: true, defaultCurrency: true } },
          },
        },
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
        // 🔥 AJOUT (v1.1) : pour désactiver côté frontend l'option "Carte
        // membre annuelle" quand ce membre en a déjà une valide.
        virtualCard: { select: { expiresAt: true, isLocked: true } },
      },
    });

    return users.map((u) => {
      const antenna = u.memberships[0]?.antenna;
      const currency = antenna?.defaultCurrency ?? association?.defaultCurrency ?? 'EUR';
      const pricing = allPricing[currency] || { monthlyQuota: 0, membershipCard: 0 };
      const covered = buildCoveredMonths(u.contributions, pricing.monthlyQuota);
      const earliest = findEarliestUncoveredMonth(covered, u.createdAt);
      const cardValid = hasValidCard(u.virtualCard);

      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        antennaId: antenna?.id ?? null,
        antennaName: antenna?.name ?? null,
        currency,
        monthlyQuota: pricing.monthlyQuota,
        membershipCardPrice: pricing.membershipCard,
        hasValidMembershipCard: cardValid,
        membershipCardExpiresAt: u.virtualCard?.expiresAt?.toISOString() ?? null,
        lateMonths: computeLateMonths(covered, u.createdAt),
        earliestUnpaidMonth: earliest?.month ?? null,
        earliestUnpaidYear: earliest?.year ?? null,
      };
    });
  }

  // ─── Création + validation immédiate ──────────────────────────────────────
  async createContributionForMember(adminId: string, dto: CreateContributionForMemberDto) {
    const { antennaIds, associationId } = await this.getAdminContext(adminId);

    const target = await this.prisma.user.findFirst({
      where: {
        id: dto.memberId,
        associationId,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        ...(antennaIds ? { memberships: { some: { antennaId: { in: antennaIds } } } } : {}),
      },
      include: {
        memberships: {
          where: antennaIds ? { antennaId: { in: antennaIds } } : undefined,
          include: { antenna: true },
        },
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
        // 🔥 AJOUT (v1.1) : nécessaire pour le blocage carte membre ci-dessous.
        virtualCard: { select: { expiresAt: true, isLocked: true } },
      },
    });

    if (!target) {
      throw new NotFoundException('Membre introuvable ou hors de votre périmètre.');
    }

    const membership = target.memberships[0];
    const finalAntennaId = membership?.antennaId;
    if (!finalAntennaId) {
      throw new BadRequestException("Ce membre n'est rattaché à aucune antenne.");
    }

    const purpose = dto.purpose || ContributionPurpose.REGULAR_QUOTA;

    // 🔥 AJOUT (v1.1) : blocage — un membre ne peut pas payer une deuxième
    // fois sa carte membre tant que celle en cours n'est pas expirée.
    // Corrige le bug observé : sans retour visuel de succès, plusieurs
    // clics créaient chacun une cotisation "carte membre" validée.
    if (purpose === ContributionPurpose.MEMBERSHIP_CARD && hasValidCard(target.virtualCard)) {
      const expiry = target.virtualCard!.expiresAt!.toLocaleDateString('fr-FR');
      throw new BadRequestException(
        `${target.firstName} ${target.lastName} a déjà une carte membre valide jusqu'au ${expiry}. Impossible d'enregistrer un nouveau paiement de carte avant cette date.`,
      );
    }

    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
      select: { defaultCurrency: true },
    });

    const resolvedCurrency: CurrencyCode =
      dto.currency ?? membership.antenna?.defaultCurrency ?? association?.defaultCurrency ?? CurrencyCode.EUR;

    const allPricing = await this.getPricingMap(associationId);
    const localPricing = allPricing[resolvedCurrency] || { monthlyQuota: 0, membershipCard: 0 };
    const monthlyPrice = Number(localPricing.monthlyQuota) || 0;
    const cardPrice = Number(localPricing.membershipCard) || 0;

    const totalAmount = Number(dto.amount);

    let boundMonth = new Date().getMonth() + 1;
    let boundYear = new Date().getFullYear();

    if (purpose === ContributionPurpose.REGULAR_QUOTA || purpose === ContributionPurpose.LATE_QUOTA) {
      const covered = buildCoveredMonths(target.contributions, monthlyPrice);
      const earliest = findEarliestUncoveredMonth(covered, target.createdAt);
      if (earliest) {
        boundMonth = earliest.month;
        boundYear = earliest.year;
      }
    }

    const refMonth = dto.monthReference ?? boundMonth;
    const refYear = dto.yearReference ?? boundYear;

    if (purpose === ContributionPurpose.REGULAR_QUOTA || purpose === ContributionPurpose.LATE_QUOTA) {
      const chosenKey = refYear * 12 + refMonth;
      const maxKey = boundYear * 12 + boundMonth;
      if (chosenKey > maxKey) {
        throw new BadRequestException(
          `Le mois de référence choisi (${refMonth}/${refYear}) est postérieur au plus ancien mois non couvert (${boundMonth}/${boundYear}). Choisissez ce mois ou un mois antérieur.`,
        );
      }
    }

    if (purpose === ContributionPurpose.MEMBERSHIP_CARD && cardPrice > 0 && totalAmount < cardPrice) {
      throw new BadRequestException(
        `Le montant minimum pour la carte membre est ${cardPrice} ${resolvedCurrency}.`,
      );
    }

    const autoReference = `ADM-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const createdId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.contribution.create({
        data: {
          associationId,
          antennaId: finalAntennaId,
          memberUserId: target.id,
          submitterUserId: adminId,
          currency: resolvedCurrency,
          amount: new Prisma.Decimal(totalAmount),
          paymentMethod: dto.method || PaymentMethod.OTHER,
          purpose,
          status: ContributionStatus.VALIDATED,
          externalReference: autoReference,
          contributionDate: dto.depositedAt ? new Date(dto.depositedAt) : new Date(),
          memberComment: dto.note?.trim() || null,
          monthReference:
            purpose === ContributionPurpose.REGULAR_QUOTA || purpose === ContributionPurpose.LATE_QUOTA
              ? refMonth
              : (dto.monthReference ?? null),
          yearReference:
            purpose === ContributionPurpose.REGULAR_QUOTA || purpose === ContributionPurpose.LATE_QUOTA
              ? refYear
              : (dto.yearReference ?? null),
          validatedByUserId: adminId,
          validatedAt: new Date(),
        },
      });

      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          associationId,
          antennaId: finalAntennaId,
          contributionId: created.id,
          type: LedgerEntryType.CONTRIBUTION_IN,
          amount: created.amount,
          currency: created.currency,
          title: `Cotisation enregistrée par l'administrateur (${purpose})`,
          createdByUserId: adminId,
        },
      });

      await tx.contribution.update({
        where: { id: created.id },
        data: { ledgerEntryId: ledgerEntry.id },
      });

      return created.id;
    });

    await this.notifications.createForUserWithPush({
      associationId,
      userId: target.id,
      type: NotificationType.CONTRIBUTION_VALIDATED,
      title: 'Cotisation enregistrée',
      message: `Un versement de ${totalAmount} ${resolvedCurrency} a été enregistré et validé pour vous par l'administrateur de votre antenne.`,
      pushTitle: '✅ Cotisation enregistrée',
      pushBody: `Un versement de ${totalAmount} ${resolvedCurrency} a été enregistré pour vous.`,
    });

    if (purpose === ContributionPurpose.MEMBERSHIP_CARD) {
      const now = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(now.getFullYear() + 1);

      await this.prisma.virtualCard.upsert({
        where: { userId: target.id },
        create: {
          userId: target.id,
          cardNumber: `LCD-${now.getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          issuedAt: now,
          expiresAt: nextYear,
          isLocked: false,
        },
        update: { issuedAt: now, expiresAt: nextYear, isLocked: false },
      });

      await this.notifications.createForUserWithPush({
        associationId,
        userId: target.id,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Carte membre active',
        message: `Votre carte membre virtuelle a été générée et activée par l'administrateur.`,
        pushTitle: '💳 Carte membre active',
        pushBody: `Votre carte membre est maintenant active.`,
      });
    }

    const full = await this.prisma.contribution.findUnique({
      where: { id: createdId },
      include: {
        submitter: { select: { firstName: true, lastName: true } },
        member: { select: { firstName: true, lastName: true } },
      },
    });

    return memberMapper.contribution(full);
  }
}