//backend/src/modules/contributions/contributions.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContributionStatus,
  PaymentMethod,
  Prisma,
  UserRole,
  NotificationType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ValidateContributionDto } from './dto/validate-contribution.dto';
import { RejectContributionDto } from './dto/reject-contribution.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

type CreateContributionInputCompat = CreateContributionDto & {
  method?: string;
  depositedAt?: string;
  note?: string;
  reference?: string;
  receiptFileAssetId?: string | null;
  targetMemberId?: string;
  currency?: string;
};

// ─── Helpers (même pattern que member.service.ts / dashboard-member.service.ts) ──
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

// 🔥 HARMONISÉ (07/08) : même nom et même logique que
// member.service.ts::findEarliestUncoveredMonth /
// dashboard-member.service.ts::findEarliestUncoveredMonth (chantier "cas
// Thierno"). Ce module (/contributions, POST) est un second chemin de
// création de cotisation en parallèle de /member/contributions
// (member.service.ts::createContribution, celui réellement branché sur le
// frontend actuel) — la même règle y est appliquée par cohérence/sécurité,
// au cas où ce chemin serait appelé directement.
function findEarliestUncoveredMonth(
  coveredMonths: Set<string>,
  joinDate: Date,
  maxLookahead = 24,
): { month: number; year: number } | null {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let m = joinDate.getMonth() + 1;
  let y = joinDate.getFullYear();

  for (let i = 0; i < maxLookahead; i++) {
    const monthStart = new Date(y, m - 1, 1);
    if (monthStart >= currentMonthStart) return null; // à jour jusqu'au mois courant

    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!coveredMonths.has(key)) return { month: m, year: y };

    m++;
    if (m > 12) { m = 1; y++; }
  }

  return null;
}

// 🔥 AJOUT (harmonisation lateMembers ci-dessous) : identique à
// buildCoveredMonths/computeLateMonths des autres modules
// (member.service.ts, admin.service.ts, dashboard-member.service.ts).
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
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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

  async createForMember(dto: CreateContributionDto, actor: AuthUser) {
    if (actor.role !== UserRole.MEMBER) {
      throw new ForbiddenException(
        'Seul un membre peut créer une cotisation',
      );
    }

    const incoming = dto as CreateContributionInputCompat;

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: actor.id,
        antennaId: dto.antennaId,
        associationId: actor.associationId,
        isPrimary: true,
        status: 'APPROVED',
      },
      include: {
        antenna: {
          select: {
            id: true,
            defaultCurrency: true,
          },
        },
        association: {
          select: {
            id: true,
            defaultCurrency: true,
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Membre non approuvé sur cette antenne',
      );
    }

    const rawCurrency = dto.currency ?? incoming.currency;
    const resolvedCurrency =
      rawCurrency ??
      membership.antenna.defaultCurrency ??
      membership.association.defaultCurrency ??
      'EUR';

    const rawPaymentMethod =
      dto.paymentMethod ?? incoming.method;

    if (!rawPaymentMethod) {
      throw new BadRequestException(
        'Mode de paiement requis',
      );
    }

    let finalMemberId = actor.id;
    let finalAntennaId = dto.antennaId;
    let submitterId: string | null = null;

    if (
      incoming.targetMemberId &&
      incoming.targetMemberId !== actor.id
    ) {
      const target = await this.prisma.user.findFirst({
        where: {
          id: incoming.targetMemberId,
          associationId: actor.associationId,
        },
        include: {
          memberships: {
            where: { isPrimary: true, status: 'APPROVED' },
            take: 1,
          },
        },
      });

      if (target) {
        finalMemberId = target.id;
        submitterId = actor.id;

        if (target.memberships.length > 0) {
          finalAntennaId = target.memberships[0].antennaId;
        }
      }
    }

    const contributionDateInput =
      dto.contributionDate ??
      incoming.depositedAt;

    const memberCommentInput =
      dto.memberComment ??
      incoming.note;

    const externalReferenceInput =
      dto.externalReference ??
      incoming.reference;

    const proofFileIdInput =
      dto.proofFileId ??
      incoming.receiptFileAssetId ??
      undefined;

    const purpose =
      (dto.purpose as any) ?? 'REGULAR_QUOTA';

    const allPricing = await this.getPricingMap(actor.associationId);

    const localPricing =
      allPricing[resolvedCurrency] || {
        monthlyQuota: 0,
        membershipCard: 0,
      };

    const monthlyPrice =
      Number(localPricing.monthlyQuota) || 0;

    // Plus ancien mois non couvert du bénéficiaire (finalMemberId) — borne
    // et défaut de monthReference/yearReference, même règle que
    // member.service.ts::createContribution.
    let boundMonth = new Date().getMonth() + 1;
    let boundYear = new Date().getFullYear();

    if (purpose === 'REGULAR_QUOTA' || purpose === 'LATE_QUOTA') {
      const beneficiary = await this.prisma.user.findUnique({
        where: { id: finalMemberId },
        select: {
          createdAt: true,
          contributions: {
            where: {
              status: ContributionStatus.VALIDATED,
              purpose: { in: ['REGULAR_QUOTA', 'LATE_QUOTA'] as any },
            },
            select: {
              monthReference: true,
              yearReference: true,
              validatedAt: true,
              createdAt: true,
              amount: true,
            },
          },
        },
      });

      if (beneficiary) {
        const covered = buildCoveredMonths(beneficiary.contributions, monthlyPrice);
        const earliest = findEarliestUncoveredMonth(covered, beneficiary.createdAt);
        if (earliest) {
          boundMonth = earliest.month;
          boundYear = earliest.year;
        }
      }
    }

    const hasExplicitReference =
      dto.monthReference !== undefined || dto.yearReference !== undefined;
    let currentMonth = dto.monthReference ?? boundMonth;
    let currentYear = dto.yearReference ?? boundYear;

    if ((purpose === 'REGULAR_QUOTA' || purpose === 'LATE_QUOTA') && hasExplicitReference) {
      const chosenKey = currentYear * 12 + currentMonth;
      const maxKey = boundYear * 12 + boundMonth;
      if (chosenKey > maxKey) {
        throw new BadRequestException(
          `Le mois de référence choisi (${currentMonth}/${currentYear}) est postérieur au plus ancien mois non couvert (${boundMonth}/${boundYear}). Choisissez ce mois ou un mois antérieur.`,
        );
      }
    }

    const contributionsToCreate: Prisma.ContributionUncheckedCreateInput[] =
      [];

    let remainingAmount = Number(dto.amount);

    const baseData: Omit<Prisma.ContributionUncheckedCreateInput, 'amount'> = {
      associationId: actor.associationId,
      antennaId: finalAntennaId,
      memberUserId: finalMemberId,
      submitterUserId: submitterId,
      currency: resolvedCurrency,
      paymentMethod:
        rawPaymentMethod as PaymentMethod,
      purpose,
      status:
        ContributionStatus.PENDING_VALIDATION,
      contributionDate: contributionDateInput
        ? new Date(contributionDateInput)
        : null,
      memberComment:
        memberCommentInput?.trim() ?? null,
      externalReference:
        externalReferenceInput?.trim() ??
        null,
      proofFileId: proofFileIdInput ?? null,
    };

    if (
      (purpose === 'REGULAR_QUOTA' ||
        purpose === 'LATE_QUOTA') &&
      monthlyPrice > 0 &&
      remainingAmount > monthlyPrice
    ) {
      while (remainingAmount > 0) {
        const amountToApply =
          remainingAmount >= monthlyPrice
            ? monthlyPrice
            : remainingAmount;

        contributionsToCreate.push({
          ...baseData,
          amount: new Prisma.Decimal(
            amountToApply,
          ),
          monthReference: currentMonth,
          yearReference: currentYear,
          memberComment:
            remainingAmount !== Number(dto.amount)
              ? `${memberCommentInput?.trim() || ''} [Avance automatique]`.trim()
              : memberCommentInput?.trim() ??
                null,
        });

        remainingAmount -= amountToApply;
        currentMonth++;

        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    } else {
      contributionsToCreate.push({
        ...baseData,
        amount: new Prisma.Decimal(
          remainingAmount,
        ),
        monthReference:
          purpose === 'REGULAR_QUOTA' || purpose === 'LATE_QUOTA'
            ? currentMonth
            : (dto.monthReference ?? null),
        yearReference:
          purpose === 'REGULAR_QUOTA' || purpose === 'LATE_QUOTA'
            ? currentYear
            : (dto.yearReference ?? null),
      });
    }

    const createdContributions =
      await this.prisma.$transaction(
        contributionsToCreate.map((data) =>
          this.prisma.contribution.create({
            data,
          }),
        ),
      );

    const targetName = submitterId
      ? 'un membre tiers'
      : `${actor.firstName} ${actor.lastName}`;

    await this.notifications.notifyAntennaAdmins(
      finalAntennaId,
      actor.associationId,
      `Un nouveau dépôt de ${dto.amount} ${resolvedCurrency} a été soumis pour ${targetName}.`,
      NotificationType.CONTRIBUTION_SUBMITTED,
    );

    await this.audit.log({
      associationId: actor.associationId,
      antennaId: finalAntennaId,
      actorUserId: actor.id,
      action: 'SUBMIT_CONTRIBUTION' as any,
      entity: 'Contribution',
      entityId: createdContributions[0].id,
      targetUserId: finalMemberId,
      details: {
        summary: `Dépôt soumis (Total: ${dto.amount}${resolvedCurrency})`,
        currency: resolvedCurrency,
        splitCount:
          createdContributions.length,
      },
    });

    return createdContributions[0];
  }

  async validateContribution(
    id: string,
    dto: ValidateContributionDto,
    actor: AuthUser,
  ) {
    const contribution =
      await this.prisma.contribution.findFirst({
        where: {
          id,
          associationId:
            actor.associationId,
        },
      });

    if (!contribution) {
      throw new NotFoundException(
        'Cotisation introuvable',
      );
    }

    await this.assertAntennaAdminCanValidate(
      actor,
      contribution.antennaId,
    );

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const ledger =
            await tx.ledgerEntry.create({
              data: {
                associationId:
                  contribution.associationId,
                antennaId:
                  contribution.antennaId,
                contributionId:
                  contribution.id,
                type: 'CONTRIBUTION_IN',
                amount:
                  contribution.amount,
                currency:
                  contribution.currency,
                title: `Cotisation validée (${contribution.purpose})`,
                createdByUserId:
                  actor.id,
              },
            });

          const updated =
            await tx.contribution.update({
              where: {
                id: contribution.id,
              },
              data: {
                status:
                  ContributionStatus.VALIDATED,
                validatedByUserId:
                  actor.id,
                validatedAt: new Date(),
                adminComment:
                  dto.adminComment?.trim(),
                validationChannel:
                  dto.validationChannel,
                ledgerEntryId:
                  ledger.id,
              },
            });

          return { updated, ledger };
        },
      );

    await this.notifications.createForUserWithPush({
      associationId: contribution.associationId,
      userId: contribution.memberUserId,
      type: NotificationType.CONTRIBUTION_VALIDATED,
      title: 'Cotisation validée',
      message: `Votre cotisation de ${contribution.amount} ${contribution.currency} a été validée avec succès.`,
      pushTitle: '✅ Cotisation validée',
      pushBody: `Votre dépôt de ${contribution.amount} ${contribution.currency} a bien été enregistré sur le compte de l'antenne.`,
    });

    return result;
  }

  async rejectContribution(
    id: string,
    dto: RejectContributionDto,
    actor: AuthUser,
  ) {
    const contribution =
      await this.prisma.contribution.findFirst({
        where: {
          id,
          associationId:
            actor.associationId,
        },
      });

    if (!contribution) {
      throw new NotFoundException(
        'Cotisation introuvable',
      );
    }

    await this.assertAntennaAdminCanValidate(
      actor,
      contribution.antennaId,
    );

    const updatedContribution = await this.prisma.contribution.update({
      where: { id },
      data: {
        status:
          ContributionStatus.REJECTED,
        rejectedByUserId: actor.id,
        rejectedAt: new Date(),
        rejectionReason:
          dto.rejectionReason.trim(),
        adminComment:
          dto.adminComment?.trim(),
      },
    });

    await this.notifications.createForUserWithPush({
      associationId: contribution.associationId,
      userId: contribution.memberUserId,
      type: NotificationType.CONTRIBUTION_REJECTED,
      title: 'Cotisation refusée',
      message: `Votre dépôt de ${contribution.amount} ${contribution.currency} a été refusé. Motif : ${dto.rejectionReason.trim()}`,
      pushTitle: '❌ Cotisation refusée',
      pushBody: `Motif : ${dto.rejectionReason.trim()}`,
    });

    return updatedContribution;
  }

  async listMine(actor: AuthUser) {
    return this.prisma.contribution.findMany({
      where: {
        associationId: actor.associationId,
        OR: [
          { memberUserId: actor.id },
          { submitterUserId: actor.id }
        ]
      },
      include: {
        member: true,
        submitter: true,
        antenna: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  async findAll(
    associationId: string,
    antennaId?: string,
  ) {
    return this.prisma.contribution.findMany({
      where: {
        associationId,
        antennaId:
          antennaId || undefined,
      },
      include: {
        member: true,
        submitter: true,
        antenna: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  async findOne(
    id: string,
    associationId: string,
  ) {
    const contribution =
      await this.prisma.contribution.findFirst({
        where: {
          id,
          associationId,
        },
        include: {
          member: true,
          submitter: true,
          antenna: true,
          proofFile: true,
        },
      });

    if (!contribution) {
      throw new NotFoundException(
        'Cotisation introuvable',
      );
    }

    return contribution;
  }

  async cancelContribution(
    id: string,
    actor: AuthUser,
  ) {
    const contribution =
      await this.prisma.contribution.findFirst({
        where: {
          id,
          associationId:
            actor.associationId,
          memberUserId: actor.id,
        },
      });

    if (!contribution) {
      throw new NotFoundException(
        'Cotisation introuvable',
      );
    }

    if (
      contribution.status !==
      ContributionStatus.PENDING_VALIDATION
    ) {
      throw new BadRequestException(
        "Impossible d'annuler une cotisation déjà traitée",
      );
    }

    return this.prisma.contribution.update({
      where: { id },
      data: {
        status:
          ContributionStatus.CANCELLED,
        cancelledByUserId: actor.id,
        cancelledAt: new Date(),
      },
    });
  }

  // 🔥 HARMONISÉ (07/08) : même famille de bug que admin.service.ts /
  // member.service.ts / dashboard-member.service.ts avant leurs correctifs
  // — filtrer sur la date du DERNIER versement validé fait ressortir "en
  // retard" un membre qui a payé toute son année d'un coup, dès que
  // thresholdMonths se sont écoulés depuis CE versement, même si les mois
  // suivants sont déjà couverts. Repris ici le calcul par mois réellement
  // couverts (buildCoveredMonths/computeLateMonths). Endpoint non consommé
  // par le frontend actuel (aucun appel /contributions/late-members dans
  // api-client.ts au 07/08) — corrigé quand même pour ne pas laisser ce
  // piège si la route est un jour rebranchée.
  async lateMembers(
    associationId: string,
    antennaId?: string,
    thresholdMonths = 3,
  ) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        associationId,
        antennaId: antennaId || undefined,
        status: 'APPROVED',
        isPrimary: true,
      },
      include: {
        user: {
          include: {
            contributions: {
              where: {
                status: ContributionStatus.VALIDATED,
                purpose: { in: ['REGULAR_QUOTA', 'LATE_QUOTA'] as any },
              },
              select: {
                monthReference: true,
                yearReference: true,
                validatedAt: true,
                createdAt: true,
                amount: true,
              },
            },
          },
        },
        antenna: true,
      },
    });

    const allPricing = await this.getPricingMap(associationId);

    return memberships
      .map((m) => {
        const currency = m.antenna?.defaultCurrency ?? 'EUR';
        const monthlyPrice =
          Number(allPricing[currency]?.monthlyQuota) ||
          Number(allPricing['EUR']?.monthlyQuota) ||
          0;
        const covered = buildCoveredMonths(m.user.contributions, monthlyPrice);
        const lateMonths = computeLateMonths(covered, m.user.createdAt);
        return { ...m, lateMonths };
      })
      .filter((m) => m.lateMonths >= thresholdMonths);
  }

  private async assertAntennaAdminCanValidate(
    actor: AuthUser,
    antennaId: string,
  ): Promise<void> {
    if (
      actor.role ===
        UserRole.SUPER_ADMIN ||
      actor.role ===
        UserRole.SYSTEM_ADMIN
    ) {
      return;
    }

    if (
      actor.role !==
      UserRole.ANTENNA_ADMIN
    ) {
      throw new ForbiddenException(
        'Non autorisé',
      );
    }

    const assignment =
      await this.prisma.antennaAdminAssignment.findFirst(
        {
          where: {
            adminUserId: actor.id,
            antennaId,
            isActive: true,
            canValidateContributions:
              true,
          },
        },
      );

    if (!assignment) {
      throw new ForbiddenException(
        'Admin non affecté à cette antenne',
      );
    }
  }
}