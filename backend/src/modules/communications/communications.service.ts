// backend/src/modules/communications/communications.service.ts
//
// v1.0 — Fichier neuf, isolé (module communications). Ne modifie ni
//   n'importe AdminService : `getAdminContext()` y est privée (donc non
//   réutilisable depuis l'extérieur), et buildCoveredMonths/computeLateMonths
//   sont des fonctions non exportées définies au niveau du fichier. Le
//   couple est donc dupliqué ici à l'identique — même choix déjà fait
//   plusieurs fois dans ce code (cf. commentaire en tête de admin.service.ts
//   sur getPricingMap()), pas une entorse à la convention mais la convention
//   elle-même.
//
// Portée (scope) : un ANTENNA_ADMIN reste toujours restreint à ses propres
//   antennes ; un SUPER_ADMIN peut filtrer sur une antenne précise ou laisser
//   `antennaId` vide pour "toutes les antennes" de son association — c'est le
//   seul filtre supplémentaire demandé pour le super admin.
//
// Limite connue, non traitée à ce stade : l'envoi se fait de façon
//   synchrone et séquentielle dans sendCampaign() (un appel SMTP/Twilio à la
//   fois). Suffisant pour la taille actuelle des associations gérées ; à
//   revoir (file d'attente / batchs parallèles) si une association dépasse
//   plusieurs centaines de membres actifs.
//
import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Prisma,
  UserRole,
  UserStatus,
  ContributionStatus,
  ContributionPurpose,
  ReminderKind,
  NotificationChannel,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CommunicationsMailerService, CommunicationAssociationBranding } from './communications-mailer.service';
import { TwilioSmsService } from './twilio-sms.service';
import {
  SendCommunicationDto,
  CommunicationAudienceType,
  CommunicationSelectionMode,
} from './dto/send-communication.dto';

// ─── Helpers retard (dupliqués depuis admin.service.ts — voir note en tête
//   de fichier) ──────────────────────────────────────────────────────────
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

function computeLateMonths(coveredMonths: Set<string>, joinDate: Date, maxLookback = 24): number {
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

    if (monthStart < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1)) break;
    if (!coveredMonths.has(key)) lateMonths++;

    checkMonth--;
    if (checkMonth < 1) { checkMonth = 12; checkYear--; }
  }

  return lateMonths;
}

export interface CommunicationMemberEntry {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  antennaId: string | null;
  antennaName: string | null;
}

export interface CommunicationLateMemberEntry extends CommunicationMemberEntry {
  lateMonths: number;
}

export interface CommunicationAntennaOption {
  id: string;
  name: string;
}

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: CommunicationsMailerService,
    private readonly sms: TwilioSmsService,
  ) {}

  // ─── Scope (dupliqué depuis AdminService.getAdminContext — privée,
  //   non réutilisable depuis l'extérieur du module admin) ────────────────
  private async resolveScope(userId: string): Promise<{ antennaIds: string[] | undefined; associationId: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, associationId: true },
    });

    if (!user || !user.associationId) throw new ForbiddenException('Utilisateur introuvable.');

    if (user.role === UserRole.SUPER_ADMIN) {
      return { antennaIds: undefined, associationId: user.associationId };
    }

    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { adminUserId: userId, isActive: true },
      select: { antennaId: true, antenna: { select: { associationId: true } } },
    });

    if (assignments.length === 0) {
      throw new ForbiddenException("Vous n'avez aucune antenne active assignée.");
    }

    return {
      antennaIds: assignments.map((a) => a.antennaId),
      associationId: assignments[0].antenna.associationId,
    };
  }

  // Résout le filtre d'antenne effectif à partir du scope + du paramètre
  // optionnel demandé par le frontend. `undefined` en retour = pas de
  // filtre (toutes les antennes de l'association).
  private resolveAntennaFilter(antennaIds: string[] | undefined, requestedAntennaId?: string): string[] | undefined {
    if (antennaIds) {
      // ANTENNA_ADMIN : toujours restreint à ses propres antennes.
      if (requestedAntennaId) {
        if (!antennaIds.includes(requestedAntennaId)) {
          throw new ForbiddenException("Cette antenne ne fait pas partie de vos antennes assignées.");
        }
        return [requestedAntennaId];
      }
      return antennaIds;
    }
    // SUPER_ADMIN : filtre optionnel, sinon toutes les antennes.
    return requestedAntennaId ? [requestedAntennaId] : undefined;
  }

  private async getPricingMap(associationId: string): Promise<Record<string, number>> {
    const rows = await this.prisma.pricing.findMany({ where: { associationId } });
    const map: Record<string, number> = {};
    for (const p of rows) map[p.currency] = Number(p.monthlyQuota);
    return map;
  }

  async getAntennas(userId: string): Promise<CommunicationAntennaOption[]> {
    const { antennaIds, associationId } = await this.resolveScope(userId);
    const antennas = await this.prisma.antenna.findMany({
      where: {
        associationId,
        isActive: true,
        ...(antennaIds ? { id: { in: antennaIds } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return antennas;
  }

  async getLateMembers(userId: string, antennaId?: string): Promise<CommunicationLateMemberEntry[]> {
    const { antennaIds, associationId } = await this.resolveScope(userId);
    const effectiveAntennaIds = this.resolveAntennaFilter(antennaIds, antennaId);

    const [users, pricingByCurrency] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          associationId,
          status: UserStatus.ACTIVE,
          role: UserRole.MEMBER,
          ...(effectiveAntennaIds ? { memberships: { some: { antennaId: { in: effectiveAntennaIds } } } } : {}),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          approvedAt: true,
          createdAt: true,
          contributions: {
            where: {
              status: ContributionStatus.VALIDATED,
              purpose: { in: [ContributionPurpose.REGULAR_QUOTA, ContributionPurpose.LATE_QUOTA] },
            },
            select: { monthReference: true, yearReference: true, validatedAt: true, createdAt: true, amount: true },
          },
          memberships: {
            where: { isPrimary: true },
            take: 1,
            select: { antenna: { select: { id: true, name: true, defaultCurrency: true } } },
          },
        },
        orderBy: { lastName: 'asc' },
      }),
      this.getPricingMap(associationId),
    ]);

    return users
      .map((u) => {
        const antenna = u.memberships[0]?.antenna ?? null;
        const currency = antenna?.defaultCurrency ?? 'EUR';
        const monthlyPrice = pricingByCurrency[currency] || pricingByCurrency['EUR'] || 0;
        const covered = buildCoveredMonths(u.contributions, monthlyPrice);
        const referenceDate = u.approvedAt || u.createdAt;
        const lateMonths = computeLateMonths(covered, referenceDate);

        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          antennaId: antenna?.id ?? null,
          antennaName: antenna?.name ?? null,
          lateMonths,
        };
      })
      .filter((m) => m.lateMonths >= 1)
      .sort((a, b) => b.lateMonths - a.lateMonths);
  }

  async getAllMembers(userId: string, antennaId?: string, q?: string): Promise<CommunicationMemberEntry[]> {
    const { antennaIds, associationId } = await this.resolveScope(userId);
    const effectiveAntennaIds = this.resolveAntennaFilter(antennaIds, antennaId);

    const where: Prisma.UserWhereInput = {
      associationId,
      status: UserStatus.ACTIVE,
      role: UserRole.MEMBER,
      ...(effectiveAntennaIds ? { memberships: { some: { antennaId: { in: effectiveAntennaIds } } } } : {}),
    };

    if (q && q.trim().length > 0) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        memberships: {
          where: { isPrimary: true },
          take: 1,
          select: { antenna: { select: { id: true, name: true } } },
        },
      },
      orderBy: { lastName: 'asc' },
      take: 500,
    });

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      antennaId: u.memberships[0]?.antenna?.id ?? null,
      antennaName: u.memberships[0]?.antenna?.name ?? null,
    }));
  }

  async sendCampaign(userId: string, dto: SendCommunicationDto) {
    const { antennaIds, associationId } = await this.resolveScope(userId);
    const effectiveAntennaIds = this.resolveAntennaFilter(antennaIds, dto.antennaId);

    if (!dto.channels.email && !dto.channels.sms) {
      throw new BadRequestException('Choisis au moins un canal (email ou SMS).');
    }

    let recipients: Array<{ id: string; email: string; phone: string | null }>;

    if (dto.selectionMode === CommunicationSelectionMode.INDIVIDUAL) {
      // Sélection manuelle : s'applique aussi bien à l'audience retardataires
      // qu'à l'audience "tous les membres" — la liste vient de ce que
      // l'utilisateur a coché dans l'un ou l'autre pool côté frontend.
      // `audienceType` reste conservé pour la journalisation (ReminderKind)
      // mais n'est pas re-vérifié ici : re-filtrer strictement sur "toujours
      // en retard au moment précis de l'envoi" ajouterait une fenêtre de
      // course sans bénéfice réel — le scope multi-tenant (association +
      // antenne) reste, lui, strictement vérifié.
      if (!dto.recipientUserIds || dto.recipientUserIds.length === 0) {
        throw new BadRequestException('Aucun destinataire sélectionné.');
      }
      recipients = await this.prisma.user.findMany({
        where: {
          id: { in: dto.recipientUserIds },
          associationId,
          status: UserStatus.ACTIVE,
          ...(effectiveAntennaIds ? { memberships: { some: { antennaId: { in: effectiveAntennaIds } } } } : {}),
        },
        select: { id: true, email: true, phone: true },
      });
    } else if (dto.audienceType === CommunicationAudienceType.LATE_PAYERS) {
      const late = await this.getLateMembers(userId, dto.antennaId);
      recipients = late.map((m) => ({ id: m.id, email: m.email, phone: m.phone }));
    } else {
      const all = await this.getAllMembers(userId, dto.antennaId);
      recipients = all.map((m) => ({ id: m.id, email: m.email, phone: m.phone }));
    }

    if (recipients.length === 0) {
      throw new BadRequestException('Aucun destinataire ne correspond à ces critères.');
    }

    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
      select: {
        name: true,
        phone: true,
        email: true,
        websiteUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        postalCode: true,
        country: true,
        logoFile: { select: { url: true } },
      },
    });
    if (!association) throw new NotFoundException('Association introuvable.');

    const branding: CommunicationAssociationBranding = {
      name: association.name,
      logoUrl: association.logoFile?.url ?? null,
      phone: association.phone,
      email: association.email,
      websiteUrl: association.websiteUrl,
      addressLine1: association.addressLine1,
      addressLine2: association.addressLine2,
      city: association.city,
      postalCode: association.postalCode,
      country: association.country,
    };

    let successCount = 0;
    let failedCount = 0;
    const perRecipientResults: Array<{ userId: string; email?: boolean; sms?: boolean }> = [];

    for (const r of recipients) {
      let anySent = false;
      const outcome: { userId: string; email?: boolean; sms?: boolean } = { userId: r.id };

      if (dto.channels.email) {
        if (r.email) {
          try {
            await this.mailer.sendCampaignEmail({
              to: r.email,
              subject: dto.subject || dto.title,
              title: dto.title,
              bodyText: dto.body,
              association: branding,
            });
            outcome.email = true;
            anySent = true;
          } catch {
            outcome.email = false;
          }
        } else {
          outcome.email = false;
        }
      }

      if (dto.channels.sms) {
        if (r.phone) {
          try {
            await this.sms.sendSms({ to: r.phone, body: dto.body });
            outcome.sms = true;
            anySent = true;
          } catch {
            outcome.sms = false;
          }
        } else {
          outcome.sms = false;
        }
      }

      if (anySent) successCount++; else failedCount++;
      perRecipientResults.push(outcome);
    }

    const kind =
      dto.audienceType === CommunicationAudienceType.LATE_PAYERS
        ? ReminderKind.CONTRIBUTION_DELAY_CUSTOM
        : ReminderKind.GENERAL_ANNOUNCEMENT;

    const singleChannel: NotificationChannel | null =
      dto.channels.email && !dto.channels.sms
        ? NotificationChannel.EMAIL
        : dto.channels.sms && !dto.channels.email
          ? NotificationChannel.SMS
          : null;

    await this.prisma.reminderRunLog.create({
      data: {
        associationId,
        antennaId: effectiveAntennaIds && effectiveAntennaIds.length === 1 ? effectiveAntennaIds[0] : null,
        kind,
        channel: singleChannel,
        recipientsCount: recipients.length,
        successCount,
        failedCount,
        details: {
          audienceType: dto.audienceType,
          channels: dto.channels,
          title: dto.title,
          subject: dto.subject ?? null,
          body: dto.body,
          results: perRecipientResults,
        } as unknown as Prisma.InputJsonValue,
        triggeredByUserId: userId,
      },
    });

    return { recipientsCount: recipients.length, successCount, failedCount };
  }
}