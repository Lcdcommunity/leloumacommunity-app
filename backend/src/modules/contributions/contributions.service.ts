//src/modules/contributions/contributions.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContributionStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateContributionDto } from './dto/create-contribution.dto';
import { ValidateContributionDto } from './dto/validate-contribution.dto';
import { RejectContributionDto } from './dto/reject-contribution.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createForMember(dto: CreateContributionDto, actor: AuthUser) {
    if (actor.role !== UserRole.MEMBER) {
      throw new ForbiddenException('Seul un membre peut créer une cotisation');
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: actor.id,
        antennaId: dto.antennaId,
        isPrimary: true,
        status: 'APPROVED',
      },
    });

    if (!membership) {
      throw new ForbiddenException('Membre non approuvé sur cette antenne');
    }

    const contribution = await this.prisma.contribution.create({
      data: {
        associationId: actor.associationId,
        antennaId: dto.antennaId,
        memberUserId: actor.id,
        amount: new Prisma.Decimal(dto.amount),
        currency: dto.currency ?? 'EUR',
        paymentMethod: dto.paymentMethod,
        status: ContributionStatus.PENDING_VALIDATION,
        contributionDate: dto.contributionDate ? new Date(dto.contributionDate) : null,
        monthReference: dto.monthReference,
        yearReference: dto.yearReference,
        memberComment: dto.memberComment?.trim(),
        externalReference: dto.externalReference?.trim(),
        proofFileId: dto.proofFileId,
      },
    });

    await this.audit.log({
      associationId: contribution.associationId,
      antennaId: contribution.antennaId,
      actorUserId: actor.id,
      action: 'SUBMIT_CONTRIBUTION',
      targetModel: 'Contribution',
      targetId: contribution.id,
      targetUserId: actor.id,
      summary: 'Dépôt de cotisation soumis par membre',
    });

    return contribution;
  }

  private async assertAntennaAdminCanValidate(actor: AuthUser, antennaId: string): Promise<void> {
    if (actor.role === UserRole.SUPER_ADMIN) return;

    if (actor.role !== UserRole.ANTENNA_ADMIN) {
      throw new ForbiddenException('Non autorisé');
    }

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

  async validateContribution(id: string, dto: ValidateContributionDto, actor: AuthUser) {
    const contribution = await this.prisma.contribution.findUnique({ where: { id } });
    if (!contribution) throw new NotFoundException('Cotisation introuvable');

    await this.assertAntennaAdminCanValidate(actor, contribution.antennaId);

    if (contribution.status === ContributionStatus.VALIDATED) {
      return { message: 'Déjà validée', contribution };
    }

    if ([ContributionStatus.CANCELLED, ContributionStatus.REJECTED].includes(contribution.status)) {
      throw new BadRequestException('Cotisation non validable dans cet état');
    }

    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerEntry.create({
        data: {
          associationId: contribution.associationId,
          antennaId: contribution.antennaId,
          contributionId: contribution.id,
          type: 'CONTRIBUTION_IN',
          amount: contribution.amount,
          currency: contribution.currency,
          title: 'Cotisation validée',
          createdByUserId: actor.id,
        },
      });

      const updated = await tx.contribution.update({
        where: { id: contribution.id },
        data: {
          status: ContributionStatus.VALIDATED,
          validatedByUserId: actor.id,
          validatedAt: now,
          adminComment: dto.adminComment?.trim(),
          validationChannel: dto.validationChannel,
          ledgerEntryId: ledger.id,
        },
      });

      return { updated, ledger };
    });

    await this.audit.log({
      associationId: contribution.associationId,
      antennaId: contribution.antennaId,
      actorUserId: actor.id,
      action: 'VALIDATE_CONTRIBUTION',
      targetModel: 'Contribution',
      targetId: contribution.id,
      targetUserId: contribution.memberUserId,
      summary: 'Validation cotisation + écriture ledger',
      metadata: { ledgerEntryId: result.ledger.id },
    });

    return result;
  }

  async rejectContribution(id: string, dto: RejectContributionDto, actor: AuthUser) {
    const contribution = await this.prisma.contribution.findUnique({ where: { id } });
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

    await this.audit.log({
      associationId: updated.associationId,
      antennaId: updated.antennaId,
      actorUserId: actor.id,
      action: 'REJECT_CONTRIBUTION',
      targetModel: 'Contribution',
      targetId: updated.id,
      targetUserId: updated.memberUserId,
      summary: 'Refus cotisation',
      metadata: { reason: dto.rejectionReason.trim() },
    });

    return updated;
  }

  async listMine(actor: AuthUser) {
    return this.prisma.contribution.findMany({
      where: { memberUserId: actor.id },
      include: { antenna: { select: { id: true, name: true, code: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async lateMembers(associationId: string, antennaId?: string, thresholdMonths = 3) {
    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() - thresholdMonths);

    const memberships = await this.prisma.membership.findMany({
      where: {
        associationId,
        antennaId: antennaId ?? undefined,
        status: 'APPROVED',
        isPrimary: true,
        user: { status: { in: ['ACTIVE', 'PENDING_APPROVAL'] } },
      },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            contributions: {
              where: { status: ContributionStatus.VALIDATED },
              orderBy: { validatedAt: 'desc' },
              take: 1,
              select: { id: true, amount: true, validatedAt: true, currency: true }
            }
          }
        },
        antenna: { select: { id: true, name: true, code: true } }
      }
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
}