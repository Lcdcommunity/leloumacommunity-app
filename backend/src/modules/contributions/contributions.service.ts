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

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

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

    // 🔥 CORRECTION : Priorité stricte à la devise envoyée par le frontend
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

    // 🔥 CORRECTION : Détection fiable de l'antenne du bénéficiaire
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
            where: { isPrimary: true, status: 'APPROVED' }, // On s'assure de prendre l'antenne valide du bénéficiaire
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

    const pricingSetting =
      await this.prisma.associationSetting.findUnique({
        where: {
          associationId_key: {
            associationId: actor.associationId,
            key: 'PRICING_CONFIG',
          },
        },
      });

    const allPricing =
      (pricingSetting?.value as Record<
        string,
        any
      >) || {};

    const localPricing =
      allPricing[resolvedCurrency] || {
        monthlyQuota: 0,
        membershipCard: 0,
      };

    const monthlyPrice =
      Number(localPricing.monthlyQuota) || 0;

    const contributionsToCreate: Prisma.ContributionUncheckedCreateInput[] =
      [];

    let remainingAmount = Number(dto.amount);

    let currentMonth =
      dto.monthReference ??
      new Date().getMonth() + 1;

    let currentYear =
      dto.yearReference ??
      new Date().getFullYear();

    const baseData: Omit<
      Prisma.ContributionUncheckedCreateInput,
      'amount'
    > = {
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
          dto.monthReference ?? null,
        yearReference:
          dto.yearReference ?? null,
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

    // 🔥 AJOUT CHIRURGICAL : Déclenchement de la notification (In-App + Push)
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

    // 🔥 AJOUT CHIRURGICAL : Déclenchement de la notification (In-App + Push)
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

  // 🔥 CORRECTION : L'historique ramène les cotisations payées ET les cotisations effectuées pour autrui
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
        member: true, // Requis par ton front pour afficher "Pour: X"
        submitter: true, // Requis par ton front pour afficher "Payé par: Y"
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

  async lateMembers(
    associationId: string,
    antennaId?: string,
    thresholdMonths = 3,
  ) {
    const thresholdDate = new Date();
    thresholdDate.setMonth(
      thresholdDate.getMonth() -
        thresholdMonths,
    );

    const memberships =
      await this.prisma.membership.findMany({
        where: {
          associationId,
          antennaId:
            antennaId || undefined,
          status: 'APPROVED',
          isPrimary: true,
        },
        include: {
          user: {
            include: {
              contributions: {
                where: {
                  status:
                    ContributionStatus.VALIDATED,
                },
                orderBy: {
                  validatedAt: 'desc',
                },
                take: 1,
              },
            },
          },
          antenna: true,
        },
      });

    return memberships.filter((m) => {
      const last =
        m.user.contributions?.[0]
          ?.validatedAt;

      return (
        !last || last < thresholdDate
      );
    });
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