// src/modules/contributions/contributions.service.ts
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
};

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Création d'une cotisation par un membre avec logique de split automatique
   */
  async createForMember(dto: CreateContributionDto, actor: AuthUser) {
    if (actor.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Seul un membre peut créer une cotisation');
    }

    const incoming = dto as CreateContributionInputCompat;

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: actor.id,
        antennaId: dto.antennaId,
        associationId: actor.associationId, // 🔒 Cloisonnement Asso
        isPrimary: true,
        status: 'APPROVED',
      },
      include: {
        antenna: { select: { id: true, defaultCurrency: true } },
        association: { select: { id: true, defaultCurrency: true } },
      },
    });

    if (!membership) {
      throw new ForbiddenException('Membre non approuvé sur cette antenne');
    }

    const resolvedCurrency =
      membership.antenna.defaultCurrency ??
      membership.association.defaultCurrency ??
      'EUR';

    const rawPaymentMethod = dto.paymentMethod ?? incoming.method;
    if (!rawPaymentMethod) {
      throw new BadRequestException('Mode de paiement requis');
    }

    const contributionDateInput = dto.contributionDate ?? incoming.depositedAt;
    const memberCommentInput = dto.memberComment ?? incoming.note;
    const externalReferenceInput = dto.externalReference ?? incoming.reference;
    const proofFileIdInput = dto.proofFileId ?? incoming.receiptFileAssetId ?? undefined;
    const purpose = (dto.purpose as any) ?? 'REGULAR_QUOTA';

    const pricingSetting = await this.prisma.associationSetting.findUnique({
      where: {
        associationId_key: {
          associationId: actor.associationId,
          key: 'PRICING_CONFIG',
        },
      },
    });

    const allPricing = (pricingSetting?.value as Record<string, any>) || {};
    const localPricing = allPricing[resolvedCurrency] || { monthlyQuota: 0, membershipCard: 0 };
    const monthlyPrice = Number(localPricing.monthlyQuota) || 0;

    const contributionsToCreate = [];
    let remainingAmount = Number(dto.amount);
    let currentMonth = dto.monthReference ?? new Date().getMonth() + 1;
    let currentYear = dto.yearReference ?? new Date().getFullYear();

    const baseData = {
      associationId: actor.associationId,
      antennaId: dto.antennaId,
      memberUserId: actor.id,
      currency: resolvedCurrency,
      paymentMethod: rawPaymentMethod as PaymentMethod,
      purpose,
      status: ContributionStatus.PENDING_VALIDATION,
      contributionDate: contributionDateInput ? new Date(contributionDateInput) : null,
      memberComment: memberCommentInput?.trim(),
      externalReference: externalReferenceInput?.trim(),
      proofFileId: proofFileIdInput ?? null,
    };

    if (
      (purpose === 'REGULAR_QUOTA' || purpose === 'LATE_QUOTA') &&
      monthlyPrice > 0 &&
      remainingAmount > monthlyPrice
    ) {
      while (remainingAmount > 0) {
        const amountToApply = remainingAmount >= monthlyPrice ? monthlyPrice : remainingAmount;
        contributionsToCreate.push({
          ...baseData,
          amount: new Prisma.Decimal(amountToApply),
          monthReference: currentMonth,
          yearReference: currentYear,
          memberComment: remainingAmount !== Number(dto.amount)
            ? `${memberCommentInput?.trim() || ''} [Avance automatique]`.trim()
            : memberCommentInput?.trim(),
        });
        remainingAmount -= amountToApply;
        currentMonth++;
        if (currentMonth > 12) { currentMonth = 1; currentYear++; }
      }
    } else {
      contributionsToCreate.push({
        ...baseData,
        amount: new Prisma.Decimal(remainingAmount),
        monthReference: dto.monthReference,
        yearReference: dto.yearReference,
      });
    }

    const createdContributions = await this.prisma.$transaction(
      contributionsToCreate.map((data) => this.prisma.contribution.create({ data })),
    );

    await this.notifications.notifyAntennaAdmins(
      dto.antennaId,
      actor.associationId,
      `Un nouveau dépôt de ${dto.amount} ${resolvedCurrency} a été soumis par ${actor.firstName} ${actor.lastName}.`,
      NotificationType.CONTRIBUTION_SUBMITTED,
    );

    await this.audit.log({
      associationId: actor.associationId,
      antennaId: dto.antennaId,
      actorUserId: actor.id,
      action: 'SUBMIT_CONTRIBUTION' as any,
      entity: 'Contribution',
      entityId: createdContributions[0].id,
      targetUserId: actor.id,
      details: {
        summary: `Dépôt soumis (Total: ${dto.amount}${resolvedCurrency})`,
        currency: resolvedCurrency,
        splitCount: createdContributions.length,
      },
    });

    return createdContributions[0];
  }

  /**
   * Validation d'une cotisation
   */
  async validateContribution(id: string, dto: ValidateContributionDto, actor: AuthUser) {
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { id, associationId: actor.associationId } 
    });

    if (!contribution) throw new NotFoundException('Cotisation introuvable dans votre association');

    await this.assertAntennaAdminCanValidate(actor, contribution.antennaId);

    if (contribution.status === ContributionStatus.VALIDATED) return { message: 'Déjà validée', contribution };
    if (['CANCELLED', 'REJECTED'].includes(contribution.status)) {
      throw new BadRequestException('Cotisation non validable dans cet état');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerEntry.create({
        data: {
          associationId: contribution.associationId,
          antennaId: contribution.antennaId,
          contributionId: contribution.id,
          type: 'CONTRIBUTION_IN',
          amount: contribution.amount,
          currency: contribution.currency,
          title: `Cotisation validée (${contribution.purpose})`,
          createdByUserId: actor.id,
        },
      });

      const updated = await tx.contribution.update({
        where: { id: contribution.id },
        data: {
          status: ContributionStatus.VALIDATED,
          validatedByUserId: actor.id,
          validatedAt: new Date(),
          adminComment: dto.adminComment?.trim(),
          validationChannel: dto.validationChannel,
          ledgerEntryId: ledger.id,
        },
      });
      return { updated, ledger };
    });

    await this.notifications.createForUser({
      associationId: contribution.associationId,
      userId: contribution.memberUserId,
      message: `Votre versement de ${contribution.amount} ${contribution.currency} a été validé.`,
      type: NotificationType.CONTRIBUTION_VALIDATED,
    });

    await this.audit.log({
      associationId: contribution.associationId,
      antennaId: contribution.antennaId,
      actorUserId: actor.id,
      action: 'VALIDATE_CONTRIBUTION' as any,
      entity: 'Contribution',
      entityId: contribution.id,
      targetUserId: contribution.memberUserId,
      details: { summary: 'Validation + écriture comptable', ledgerEntryId: result.ledger.id },
    });

    return result;
  }

  /**
   * Rejet d'une cotisation
   */
  async rejectContribution(id: string, dto: RejectContributionDto, actor: AuthUser) {
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { id, associationId: actor.associationId } 
    });
    if (!contribution) throw new NotFoundException('Cotisation introuvable');

    await this.assertAntennaAdminCanValidate(actor, contribution.antennaId);

    const updated = await this.prisma.contribution.update({
      where: { id },
      data: {
        status: ContributionStatus.REJECTED,
        rejectedByUserId: actor.id,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason.trim(),
        adminComment: dto.adminComment?.trim(),
      },
    });

    await this.notifications.createForUser({
      associationId: updated.associationId,
      userId: updated.memberUserId,
      message: `Votre versement de ${updated.amount} ${updated.currency} a été refusé. Motif : ${dto.rejectionReason}`,
      type: NotificationType.CONTRIBUTION_REJECTED,
    });

    return updated;
  }

  async listMine(actor: AuthUser) {
    const contributions = await this.prisma.contribution.findMany({
      where: { memberUserId: actor.id, associationId: actor.associationId },
      include: { antenna: { select: { id: true, name: true, code: true } } },
      orderBy: { submittedAt: 'desc' },
    });

    return contributions.map((c) => ({
      ...c,
      amount: Number(c.amount),
      method: c.paymentMethod,
      depositedAt: c.contributionDate?.toISOString() || null,
      note: c.memberComment,
      validatedAt: c.validatedAt?.toISOString() || null,
    }));
  }

  /**
   * 🔥 ENRICHI : Liste globale avec tous les détails membres nécessaires
   */
  async findAll(associationId: string, antennaId?: string) {
    return this.prisma.contribution.findMany({
      where: { associationId, antennaId: antennaId || undefined },
      include: {
        member: { 
          select: { 
            firstName: true, 
            lastName: true, 
            email: true,
            phone: true,
            professionalStatus: true,
            function: true
          } 
        },
        antenna: { select: { name: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * 🔥 ENRICHI : Détail unitaire avec infos membres complètes pour la modale
   */
  async findOne(id: string, associationId: string) {
    const contribution = await this.prisma.contribution.findFirst({
      where: { id, associationId },
      include: {
        member: { 
          select: { 
            firstName: true, 
            lastName: true, 
            email: true, 
            phone: true,
            professionalStatus: true,
            function: true
          } 
        },
        antenna: { select: { name: true, code: true } },
        proofFile: true,
      },
    });
    if (!contribution) throw new NotFoundException('Cotisation introuvable');
    return contribution;
  }

  async cancelContribution(id: string, actor: AuthUser) {
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { id, associationId: actor.associationId, memberUserId: actor.id } 
    });

    if (!contribution) throw new NotFoundException('Cotisation introuvable');
    if (contribution.status !== ContributionStatus.PENDING_VALIDATION) {
      throw new BadRequestException('Impossible d\'annuler une cotisation déjà traitée');
    }

    return this.prisma.contribution.update({
      where: { id },
      data: { 
        status: ContributionStatus.CANCELLED,
        cancelledByUserId: actor.id,
        cancelledAt: new Date()
      },
    });
  }

  async lateMembers(associationId: string, antennaId?: string, thresholdMonths = 3) {
    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);

    const memberships = await this.prisma.membership.findMany({
      where: {
        associationId,
        antennaId: antennaId || undefined,
        status: 'APPROVED',
        isPrimary: true,
        user: { status: { in: ['ACTIVE', 'PENDING_APPROVAL'] } },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            contributions: {
              where: { status: ContributionStatus.VALIDATED },
              orderBy: { validatedAt: 'desc' },
              take: 1,
              select: { id: true, amount: true, validatedAt: true, currency: true },
            },
          },
        },
        antenna: { select: { id: true, name: true, code: true } },
      },
    });

    return memberships
      .map((m) => ({
        membershipId: m.id,
        user: m.user,
        antenna: m.antenna,
        lastValidatedContribution: m.user.contributions[0] ?? null,
      }))
      .filter((r) => {
        const last = r.lastValidatedContribution?.validatedAt;
        return !last || new Date(last) < thresholdDate;
      });
  }

  private async assertAntennaAdminCanValidate(actor: AuthUser, antennaId: string): Promise<void> {
    const antenna = await this.prisma.antenna.findFirst({
        where: { id: antennaId, associationId: actor.associationId }
    });
    if (!antenna) throw new ForbiddenException('Cette antenne ne fait pas partie de votre association');

    if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.SYSTEM_ADMIN) return;
    if (actor.role !== UserRole.ANTENNA_ADMIN) throw new ForbiddenException('Non autorisé');

    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: {
        adminUserId: actor.id,
        antennaId,
        isActive: true,
        canValidateContributions: true,
      },
    });

    if (!assignment) throw new ForbiddenException('Admin non affecté à cette antenne');
  }
}