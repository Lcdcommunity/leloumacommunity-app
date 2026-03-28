// backend/src/modules/member/member.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ContributionStatus,
  ProjectStatus,
  ProposalStatus,
  PostStatus,
  UserStatus,
  PaymentMethod,
  ContributionPurpose,
  NotificationType,
  ExpenseStatus, // 👇 AJOUT: Requis pour filtrer les dépenses
} from '@prisma/client';
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
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async getMeOrThrow(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        status: true,
        associationId: true,
        memberships: {
          where: { isPrimary: true },
          select: {
            antennaId: true,
          },
        },
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        city: true,
        country: true,
        addressLine1: true,
        addressLine2: true,
        postalCode: true,
        originSubPrefecture: true,
        createdAt: true,
        updatedAt: true,
        profilePhoto: {
          select: {
            url: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return {
      ...user,
      antennaId: user.memberships[0]?.antennaId || null,
    };
  }

  async getDashboard(userId: string) {
    const me = await this.getMeOrThrow(userId);

    const [totalMyContributions, activeProjects, virtualCard, allAntennas] = await Promise.all([
      this.prisma.contribution.aggregate({
        where: {
          memberUserId: userId,
          status: ContributionStatus.VALIDATED,
        },
        _sum: { amount: true },
      }),
      this.prisma.project.count({
        where: {
          associationId: me.associationId,
          status: ProjectStatus.IN_PROGRESS,
        },
      }),
      this.prisma.virtualCard.findUnique({
        where: { userId },
        include: {
          user: {
            include: {
              memberships: {
                include: {
                  antenna: true,
                },
              },
              profilePhoto: true,
            },
          },
        },
      }),
      this.prisma.antenna.findMany({
        where: { associationId: me.associationId, isActive: true },
        select: { id: true, name: true, defaultCurrency: true }
      })
    ]);

    // 👇 CORRECTION DÉFINITIVE : Calcul des soldes (Cotisations - Dépenses) pour le Dashboard Membre
    const antennaBalances = await Promise.all(
      allAntennas.map(async (ant) => {
        const [aggC, aggE] = await Promise.all([
          this.prisma.contribution.aggregate({
            where: { antennaId: ant.id, status: ContributionStatus.VALIDATED },
            _sum: { amount: true }
          }),
          this.prisma.expense.aggregate({
            where: { antennaId: ant.id, status: ExpenseStatus.VALIDATED },
            _sum: { amount: true }
          })
        ]);
        
        return {
          id: ant.id,
          name: ant.name,
          balance: Number(aggC._sum.amount ?? 0) - Number(aggE._sum.amount ?? 0),
          currency: ant.defaultCurrency || 'EUR' // Fallback
        };
      })
    );

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
          birthDate: virtualCard.user.birthDate
            ? virtualCard.user.birthDate.toISOString()
            : null,
          placeOfBirth: virtualCard.user.placeOfBirth,
          originVillage: virtualCard.user.originSubPrefecture,
          country: virtualCard.user.country,
          city: virtualCard.user.city,
          profilePhotoUrl: virtualCard.user.profilePhoto?.url || null,
        },
      };
    }

    return {
      user: memberMapper.userSummary(me),
      stats: {
        myTotalContributions: Number(totalMyContributions._sum.amount ?? 0),
        activeProjects,
      },
      virtualCard: cardData,
      antennaBalances, // On renvoie enfin les bons soldes déduits !
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
        ...(dto.addressLine1 !== undefined
          ? { addressLine1: dto.addressLine1.trim() || null }
          : {}),
        ...(dto.addressLine2 !== undefined
          ? { addressLine2: dto.addressLine2.trim() || null }
          : {}),
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
        ...(dto.emailNotifications !== undefined
          ? { emailEnabled: dto.emailNotifications }
          : {}),
        ...(dto.smsNotifications !== undefined
          ? { smsEnabled: dto.smsNotifications }
          : {}),
        ...(dto.pushNotifications !== undefined
          ? { pushEnabled: dto.pushNotifications }
          : {}),
      },
    });

    return { ok: true as const };
  }

  async createContribution(userId: string, dto: CreateMemberContributionDto) {
    const me = await this.getMeOrThrow(userId);
    this.ensureMemberActiveEnough(me.status);

    if (!me.associationId || !me.antennaId) {
      throw new BadRequestException(
        'Utilisateur non rattaché à une association / antenne.',
      );
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
        currency: 'EUR', // Note : Ici la devise est encore forcée
        paymentMethod: (dto.method as PaymentMethod) || PaymentMethod.OTHER,
        externalReference: autoReference,
        contributionDate: dto.depositedAt ? new Date(dto.depositedAt) : new Date(),
        memberComment: dto.note ?? null,
        proofFileId: dto.receiptFileAssetId ?? null,
        status: ContributionStatus.PENDING_VALIDATION,
        purpose: dto.purpose || ContributionPurpose.REGULAR_QUOTA,
      },
    });

    await this.notifications.notifyAntennaAdmins(
      me.antennaId,
      me.associationId,
      `Un nouveau versement de ${dto.amount} EUR a été déclaré par ${me.firstName} ${me.lastName}.`,
      NotificationType.CONTRIBUTION_SUBMITTED,
      { contributionId: created.id },
    );

    return memberMapper.contribution(created);
  }

  async listMyContributions(
    userId: string,
    query: MemberContributionsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
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

    return {
      items: items.map(memberMapper.contribution),
      total,
      page,
      pageSize,
    };
  }

  async getAssociationBalanceSummary(userId: string) {
    const me = await this.getMeOrThrow(userId);

    const [association, agg] = await Promise.all([
      this.prisma.association.findUnique({
        where: { id: me.associationId },
      }),
      this.prisma.contribution.aggregate({
        where: {
          associationId: me.associationId,
          status: ContributionStatus.VALIDATED,
        },
        _sum: { amount: true },
      }),
    ]);

    if (!association) {
      throw new NotFoundException('Association introuvable.');
    }

    return {
      associationId: association.id,
      associationName: association.name,
      totalValidatedContributionsAmount: Number(agg._sum.amount ?? 0),
      currency: 'EUR',
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  async listLateMembers(
    userId: string,
    query: LateMembersQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const members = await this.prisma.user.findMany({
      where: {
        associationId: me.associationId,
        role: 'MEMBER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        memberships: {
          include: {
            antenna: true,
          },
        },
        contributions: {
          where: { status: 'VALIDATED' },
          orderBy: [{ validatedAt: 'desc' }],
          take: 1,
          select: {
            validatedAt: true,
            createdAt: true,
          },
        },
      },
    });
    const now = new Date();

    const computed = members
      .map((m) => {
        const last = m.contributions[0]?.validatedAt ?? m.createdAt;

        return {
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          antennaName: m.memberships[0]?.antenna?.name ?? null,
          lateMonths: monthDiff(last, now),
        };
      })
      .filter((x) => x.lateMonths >= 3)
      .sort((a, b) => b.lateMonths - a.lateMonths);

    const start = (page - 1) * pageSize;

    return {
      items: computed.slice(start, start + pageSize),
      total: computed.length,
      page,
      pageSize,
    };
  }

  async listProjectsForMembers(
    userId: string,
    query: MemberProjectsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const projectSearchOr: Prisma.ProjectWhereInput[] = query.q
      ? [
          {
            title: {
              contains: query.q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            description: {
              contains: query.q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            summary: {
              contains: query.q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            locationText: {
              contains: query.q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            promoterName: {
              contains: query.q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ]
      : [];

    const where: Prisma.ProjectWhereInput = {
      associationId: me.associationId,
      isPublicToMembers: true,
      ...(query.status ? { status: query.status as ProjectStatus } : {}),
      ...(projectSearchOr.length > 0 ? { OR: projectSearchOr } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          coverImageFile: {
            select: {
              id: true,
              url: true,
              originalFilename: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
          attachments: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            include: {
              file: {
                select: {
                  id: true,
                  url: true,
                  originalFilename: true,
                  mimeType: true,
                  sizeBytes: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: items.map(memberMapper.project),
      total,
      page,
      pageSize,
    };
  }

  async createProjectProposal(
    userId: string,
    dto: CreateProjectProposalDto & { attachmentFileAssetId?: string },
  ) {
    const me = await this.getMeOrThrow(userId);
    this.ensureMemberActiveEnough(me.status);

    const created = await this.prisma.projectProposal.create({
      data: {
        associationId: me.associationId,
        antennaId: me.antennaId,
        authorUserId: me.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        estimatedBudget: dto.expectedBudget
          ? new Prisma.Decimal(dto.expectedBudget)
          : null,
        status: ProposalStatus.SUBMITTED,
        ...(dto.attachmentFileAssetId
          ? {
              attachments: {
                create: {
                  fileId: dto.attachmentFileAssetId,
                },
              },
            }
          : {}),
      },
    });

    if (me.antennaId) {
      await this.notifications.notifyAntennaAdmins(
        me.antennaId,
        me.associationId,
        `Une nouvelle proposition de projet "${dto.title.trim()}" a été soumise par ${me.firstName} ${me.lastName}.`,
        NotificationType.PROJECT_PROPOSAL_SUBMITTED,
        { proposalId: created.id },
      );
    }

    return memberMapper.projectProposal(created);
  }

  async listMyProjectProposals(
    userId: string,
    query: MemberProjectProposalsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
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
      items: items.map((p) => ({
        ...memberMapper.projectProposal(p),
        estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async listDocuments(
    userId: string,
    query: MemberDocumentsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const visibilityOr: Prisma.DocumentWhereInput[] = [
      {
        visibility: {
          in: ['ALL', 'MEMBER'],
        },
      },
    ];

    if (me.antennaId) {
      visibilityOr.push({
        antennaId: me.antennaId,
      });
    }

    const andFilters: Prisma.DocumentWhereInput[] = [
      {
        associationId: me.associationId,
      },
      {
        publishedAt: {
          not: null,
        },
      },
      {
        OR: visibilityOr,
      },
    ];

    if (query.q) {
      const documentSearchOr: Prisma.DocumentWhereInput[] = [
        {
          title: {
            contains: query.q,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          description: {
            contains: query.q,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ];

      andFilters.push({
        OR: documentSearchOr,
      });
    }

    const where: Prisma.DocumentWhereInput = {
      AND: andFilters,
    };

    const [total, items] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          file: {
            select: {
              id: true,
              storageKey: true,
              url: true,
              mimeType: true,
              sizeBytes: true,
              originalFilename: true,
            },
          },
        },
      }),
    ]);

    return {
      items: items.map(memberMapper.documentItem),
      total,
      page,
      pageSize,
    };
  }

  async listContents(
    userId: string,
    query: MemberContentsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const contentSearchOr: Prisma.NewsPostWhereInput[] = query.q
      ? [
          {
            title: {
              contains: query.q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            content: {
              contains: query.q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ]
      : [];

    const where: Prisma.NewsPostWhereInput = {
      associationId: me.associationId,
      status: PostStatus.PUBLISHED,
      ...(contentSearchOr.length > 0 ? { OR: contentSearchOr } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.newsPost.count({ where }),
      this.prisma.newsPost.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { coverImageFile: true },
      }),
    ]);

    return {
      items: items.map((c) => {
        const mapped = memberMapper.contentPost({ ...c, body: c.content });
        return {
          ...mapped,
          coverImageFile: c.coverImageFile ? { url: c.coverImageFile.url } : null,
        };
      }),
      total,
      page,
      pageSize,
    };
  }
}

function monthDiff(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const total = years * 12 + months;

  return total < 0 ? 0 : total;
}