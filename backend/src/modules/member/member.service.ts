// backend/src/modules/member/member.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ContributionStatus, ProjectStatus, ProposalStatus, PostStatus, UserStatus, PaymentMethod, ContributionPurpose } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { memberMapper } from './member.mapper';
import { MemberProfileUpdateDto } from './dto/member-profile-update.dto';
import { MemberPreferencesUpdateDto } from './dto/member-preferences-update.dto';
import { CreateMemberContributionDto } from './dto/create-member-contribution.dto';
import { MemberContributionsQueryDto } from './dto/member-contributions-query.dto';
import { LateMembersQueryDto } from './dto/late-members-query.dto';
import { MemberProjectsQueryDto } from './dto/member-projects-query.dto';
import { CreateProjectProposalDto } from './dto/create-project-proposal.dto';
import { MemberProjectProposalsQueryDto } from './dto/member-project-proposals-query.dto';
import { MemberDocumentsQueryDto } from './dto/member-documents-query.dto';
import { MemberContentsQueryDto } from './dto/member-contents-query.dto';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

@Injectable()
export class MemberService {
  constructor(private readonly prisma: PrismaService) {}

  async getMeOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true,
        associationId: true,
        memberships: { where: { isPrimary: true }, select: { antennaId: true } },
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        country: true,
        addressLine1: true,
        addressLine2: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return { ...user, antennaId: user.memberships[0]?.antennaId || null };
  }

  async getDashboard(userId: string) {
    const me = await this.getMeOrThrow(userId);

    const [totalMyContributions, activeProjects, virtualCard] = await Promise.all([
      this.prisma.contribution.aggregate({
        where: { memberUserId: userId, status: ContributionStatus.VALIDATED },
        _sum: { amount: true },
      }),
      this.prisma.project.count({
        where: { associationId: me.associationId, status: ProjectStatus.IN_PROGRESS },
      }),
      this.prisma.virtualCard.findUnique({
        where: { userId },
        include: {
          user: {
            include: { memberships: { include: { antenna: true } }, profilePhoto: true }
          }
        }
      })
    ]);

    let cardData = null;
    if (virtualCard) {
      cardData = {
        cardNumber: virtualCard.cardNumber,
        isLocked: virtualCard.isLocked,
        expiresAt: virtualCard.expiresAt ? virtualCard.expiresAt.toISOString() : null,
        qrToken: virtualCard.qrToken,
        antennaName: virtualCard.user.memberships[0]?.antenna?.name || 'Inconnue',
        user: {
          firstName: virtualCard.user.firstName,
          lastName: virtualCard.user.lastName,
          birthDate: virtualCard.user.birthDate ? virtualCard.user.birthDate.toISOString() : null,
          
          // 👇 AJOUT CHIRURGICAL : Récupération des données pour la carte
          placeOfBirth: virtualCard.user.placeOfBirth,
          originVillage: virtualCard.user.originSubPrefecture, // Mappé sur originSubPrefecture
          
          country: virtualCard.user.country,
          city: virtualCard.user.city,
          profilePhotoUrl: virtualCard.user.profilePhoto?.url || null,
        }
      };
    }

    return {
      user: memberMapper.userSummary(me),
      stats: {
        myTotalContributions: Number(totalMyContributions._sum.amount ?? 0),
        activeProjects,
      },
      virtualCard: cardData
    };
  }

  private ensureMemberActiveEnough(status: UserStatus): void {
    if (status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Compte non actif. Attendez la validation admin.');
    }
  }

  async updateProfile(userId: string, dto: MemberProfileUpdateDto) {
    await this.getMeOrThrow(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1.trim() || null } : {}),
        ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country.trim() || null } : {}),
      },
    });

    return memberMapper.userSummary(updated);
  }

  async updatePreferences(userId: string, dto: MemberPreferencesUpdateDto) {
    await this.getMeOrThrow(userId);

    await this.prisma.userNotificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        emailEnabled: dto.emailNotifications ?? true,
        smsEnabled: dto.smsNotifications ?? false,
        pushEnabled: dto.pushNotifications ?? false,
      },
      update: {
        ...(dto.emailNotifications !== undefined ? { emailEnabled: dto.emailNotifications } : {}),
        ...(dto.smsNotifications !== undefined ? { smsEnabled: dto.smsNotifications } : {}),
        ...(dto.pushNotifications !== undefined ? { pushEnabled: dto.pushNotifications } : {}),
      },
    });

    return { ok: true as const };
  }

  async createContribution(userId: string, dto: CreateMemberContributionDto) {
    const me = await this.getMeOrThrow(userId);
    this.ensureMemberActiveEnough(me.status);

    if (!me.associationId || !me.antennaId) {
      throw new BadRequestException('Utilisateur non rattaché à une association / antenne.');
    }

    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const autoReference = `TR-${datePart}-${randomPart}`;

    const created = await this.prisma.contribution.create({
      data: {
        associationId: me.associationId,
        antennaId: me.antennaId,
        memberUserId: me.id,
        amount: new Prisma.Decimal(dto.amount),
        currency: 'EUR',
        paymentMethod: (dto.method as PaymentMethod) || PaymentMethod.OTHER,
        externalReference: autoReference,
        contributionDate: dto.depositedAt ? new Date(dto.depositedAt) : new Date(),
        memberComment: dto.note ?? null,
        proofFileId: dto.receiptFileAssetId ?? null,
        status: ContributionStatus.PENDING_VALIDATION,
        purpose: dto.purpose || ContributionPurpose.REGULAR_QUOTA,
      },
    });

    return memberMapper.contribution(created);
  }

  async listMyContributions(userId: string, query: MemberContributionsQueryDto): Promise<PaginatedResponseDto<any>> {
    await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.ContributionWhereInput = {
      memberUserId: userId,
      ...(query.status ? { status: query.status as ContributionStatus } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.contribution.count({ where }),
      this.prisma.contribution.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items: items.map(memberMapper.contribution), total, page, pageSize };
  }

  async getAssociationBalanceSummary(userId: string) {
    const me = await this.getMeOrThrow(userId);

    const [association, agg] = await Promise.all([
      this.prisma.association.findUnique({ where: { id: me.associationId } }),
      this.prisma.contribution.aggregate({
        where: { associationId: me.associationId, status: ContributionStatus.VALIDATED },
        _sum: { amount: true },
      }),
    ]);

    if (!association) throw new NotFoundException('Association introuvable.');

    return {
      associationId: association.id,
      associationName: association.name,
      totalValidatedContributionsAmount: Number(agg._sum.amount ?? 0),
      currency: 'EUR',
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  async listLateMembers(userId: string, query: LateMembersQueryDto): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const members = await this.prisma.user.findMany({
      where: { associationId: me.associationId, role: 'MEMBER', status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        memberships: { include: { antenna: true } },
        contributions: {
          where: { status: 'VALIDATED' },
          orderBy: [{ validatedAt: 'desc' }],
          take: 1,
          select: { validatedAt: true, createdAt: true },
        },
      },
    });

    const now = new Date();
    const computed = members
      .map((m) => {
        const last = m.contributions[0]?.validatedAt ?? m.contributions[0]?.createdAt ?? null;
        return {
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          antennaName: m.memberships[0]?.antenna?.name ?? null,
          lateMonths: last ? monthDiff(last, now) : 999,
        };
      })
      .filter((x) => x.lateMonths > 3)
      .sort((a, b) => b.lateMonths - a.lateMonths);

    const start = (page - 1) * pageSize;
    return { items: computed.slice(start, start + pageSize), total: computed.length, page, pageSize };
  }

  async listProjectsForMembers(userId: string, query: MemberProjectsQueryDto): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.ProjectWhereInput = {
      associationId: me.associationId,
      ...(query.status ? { status: query.status as ProjectStatus } : {}),
      ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({ where, orderBy: [{ createdAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    ]);

    return { items: items.map(memberMapper.project), total, page, pageSize };
  }

  async createProjectProposal(userId: string, dto: CreateProjectProposalDto & { attachmentFileAssetId?: string }) {
    const me = await this.getMeOrThrow(userId);
    this.ensureMemberActiveEnough(me.status);

    const created = await this.prisma.projectProposal.create({
      data: {
        associationId: me.associationId,
        antennaId: me.antennaId,
        authorUserId: me.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        estimatedBudget: dto.expectedBudget ? new Prisma.Decimal(dto.expectedBudget) : null,
        status: ProposalStatus.SUBMITTED,
        ...(dto.attachmentFileAssetId ? {
          attachments: {
            create: {
              fileId: dto.attachmentFileAssetId
            }
          }
        } : {})
      },
    });

    return memberMapper.projectProposal(created);
  }

  async listMyProjectProposals(userId: string, query: MemberProjectProposalsQueryDto): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.ProjectProposalWhereInput = {
      authorUserId: me.id,
      ...(query.status ? { status: query.status as ProposalStatus } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.projectProposal.count({ where }),
      this.prisma.projectProposal.findMany({ 
        where, 
        orderBy: [{ createdAt: 'desc' }], 
        skip: (page - 1) * pageSize, 
        take: pageSize,
      }),
    ]);

    return { 
      items: items.map(p => ({
        ...memberMapper.projectProposal(p),
        estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null 
      })), 
      total, 
      page, 
      pageSize 
    };
  }

  async listDocuments(userId: string, query: MemberDocumentsQueryDto): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.DocumentWhereInput = {
      associationId: me.associationId,
      publishedAt: { not: null },
      ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { description: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { file: { select: { id: true, storageKey: true, url: true } } },
      }),
    ]);

    return { items: items.map(memberMapper.documentItem), total, page, pageSize };
  }

  async listContents(userId: string, query: MemberContentsQueryDto): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.NewsPostWhereInput = {
      associationId: me.associationId,
      status: PostStatus.PUBLISHED,
      ...(query.q ? { OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { content: { contains: query.q, mode: 'insensitive' } }] } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.newsPost.count({ where }),
      this.prisma.newsPost.findMany({ where, orderBy: [{ updatedAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
    ]);

    return { items: items.map(memberMapper.contentPost), total, page, pageSize };
  }
}

function monthDiff(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const total = years * 12 + months;
  return total < 0 ? 0 : total;
}