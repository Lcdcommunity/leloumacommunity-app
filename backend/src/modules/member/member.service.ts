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
  ExpenseStatus,
  CurrencyCode,
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
import { PushSubscriptionDto } from './dto/push-subscription.dto';

// ─── Helper : calcule les mois de retard d'un membre ─────────────────────────
// Logique centralisée ici pour être réutilisée dans getDashboard ET listLateMembers
function computeLateMonths(
  contributions: Array<{
    monthReference: number | null;
    yearReference: number | null;
    validatedAt: Date | null;
    createdAt: Date;
  }>,
  joinDate: Date,
  maxLookback = 24,
): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Construire l'ensemble des mois couverts par des contributions VALIDATED REGULAR/LATE
  const coveredMonths = new Set<string>();
  for (const c of contributions) {
    if (c.monthReference && c.yearReference) {
      coveredMonths.add(
        `${c.yearReference}-${String(c.monthReference).padStart(2, '0')}`,
      );
    } else {
      // Fallback : utiliser le mois de validation si pas de référence explicite
      const d = c.validatedAt ?? c.createdAt;
      const d2 = new Date(d);
      coveredMonths.add(
        `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}`,
      );
    }
  }

  let lateMonths = 0;
  let checkYear = currentYear;
  let checkMonth = currentMonth;

  for (let i = 0; i < maxLookback; i++) {
    const key = `${checkYear}-${String(checkMonth).padStart(2, '0')}`;
    const monthStart = new Date(checkYear, checkMonth - 1, 1);

    // Ne pas compter les mois avant l'inscription
    if (monthStart < new Date(joinDate.getFullYear(), joinDate.getMonth(), 1)) break;

    if (!coveredMonths.has(key)) {
      lateMonths++;
    }

    checkMonth--;
    if (checkMonth < 1) {
      checkMonth = 12;
      checkYear--;
    }
  }

  return lateMonths;
}

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
        function: true,
        professionalStatus: true,
        birthDate: true,
        placeOfBirth: true,
        countryOfBirth: true,
        createdAt: true,
        updatedAt: true,
        profilePhoto: {
          select: {
            url: true,
          },
        },
      },
    });

    if (!user || !user.associationId) {
      throw new NotFoundException('Utilisateur ou association introuvable');
    }

    return {
      ...user,
      associationId: user.associationId,
      antennaId: user.memberships[0]?.antennaId || null,
    };
  }

  async getDashboard(userId: string) {
    const me = await this.getMeOrThrow(userId);

    const [
      totalMyContributions,
      activeProjects,
      virtualCard,
      allAntennas,
      // ✅ FIX : Récupérer TOUTES les contributions régulières/retard validées
      // avec leurs références mensuelles pour calculer lateMonths correctement
      myRegularContributions,
      // ✅ FIX : Récupérer la dernière contribution validée (toutes purposes)
      lastContribution,
    ] = await Promise.all([
      this.prisma.contribution.aggregate({
        where: {
          associationId: me.associationId,
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
        select: { id: true, name: true, defaultCurrency: true },
      }),
      // ✅ FIX : Pas de limite de page — on prend TOUT l'historique pour le calcul
      this.prisma.contribution.findMany({
        where: {
          associationId: me.associationId,
          memberUserId: userId,
          status: ContributionStatus.VALIDATED,
          purpose: { in: [ContributionPurpose.REGULAR_QUOTA, ContributionPurpose.LATE_QUOTA] },
        },
        select: {
          monthReference: true,
          yearReference: true,
          validatedAt: true,
          createdAt: true,
        },
      }),
      // ✅ FIX : Dernière contribution validée toutes purposes confondues
      this.prisma.contribution.findFirst({
        where: {
          associationId: me.associationId,
          memberUserId: userId,
          status: ContributionStatus.VALIDATED,
        },
        orderBy: { validatedAt: 'desc' },
        select: { validatedAt: true, createdAt: true },
      }),
    ]);

    // ✅ FIX : Calculer lateMonths avec la fonction centralisée
    const lateMonths = computeLateMonths(myRegularContributions, me.createdAt);

    // ✅ FIX : Calculer myLastContributionAt depuis la vraie dernière contribution
    const myLastContributionAt = lastContribution
      ? (lastContribution.validatedAt ?? lastContribution.createdAt).toISOString()
      : null;

    const antennaBalances = await Promise.all(
      allAntennas.map(async (ant) => {
        const [aggC, aggE] = await Promise.all([
          this.prisma.contribution.aggregate({
            where: {
              associationId: me.associationId,
              antennaId: ant.id,
              status: ContributionStatus.VALIDATED,
            },
            _sum: { amount: true },
          }),
          this.prisma.expense.aggregate({
            where: {
              associationId: me.associationId,
              antennaId: ant.id,
              status: ExpenseStatus.VALIDATED,
            },
            _sum: { amount: true },
          }),
        ]);

        return {
          id: ant.id,
          name: ant.name,
          balance: Number(aggC._sum.amount ?? 0) - Number(aggE._sum.amount ?? 0),
          currency: ant.defaultCurrency || 'EUR',
        };
      }),
    );

    let cardData = null;

    if (virtualCard && virtualCard.user.associationId === me.associationId) {
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
          function: virtualCard.user.function,
          professionalStatus: virtualCard.user.professionalStatus,
        },
      };
    }

    return {
      user: memberMapper.userSummary(me as any),
      stats: {
        myTotalContributions: Number(totalMyContributions._sum.amount ?? 0),
        activeProjects,
        // ✅ FIX : Ces champs sont maintenant correctement calculés
        lateMonths,
        myLastContributionAt,
      },
      virtualCard: cardData,
      antennaBalances,
    };
  }

  private ensureMemberActiveEnough(status: UserStatus): void {
    if (status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Compte non actif. Attendez la validation admin.');
    }
  }

  async updateProfile(userId: string, dto: MemberProfileUpdateDto) {
    const me = await this.getMeOrThrow(userId);

    const updated = await this.prisma.user.update({
      where: { id: userId, associationId: me.associationId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1.trim() || null } : {}),
        ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country.trim() || null } : {}),
        ...(dto.function !== undefined ? { function: dto.function.trim() || null } : {}),
        ...(dto.professionalStatus !== undefined ? { professionalStatus: dto.professionalStatus.trim() || null } : {}),
        ...(dto.originSubPrefecture !== undefined ? { originSubPrefecture: dto.originSubPrefecture.trim() || null } : {}),
        ...(dto.placeOfBirth !== undefined ? { placeOfBirth: dto.placeOfBirth.trim() || null } : {}),
        ...(dto.countryOfBirth !== undefined ? { countryOfBirth: dto.countryOfBirth.trim() || null } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode.trim() || null } : {}),
        ...(dto.birthDate !== undefined ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null } : {}),
      },
    });

    return memberMapper.userSummary(updated as any);
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

  async subscribeToPushNotifications(userId: string, dto: PushSubscriptionDto) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });
    return { message: 'Abonnement push enregistré avec succès.' };
  }

  async searchMembers(userId: string, q: string) {
    const me = await this.getMeOrThrow(userId);
    if (!q || q.trim().length < 2) return [];

    const members = await this.prisma.user.findMany({
      where: {
        associationId: me.associationId,
        role: 'MEMBER',
        status: 'ACTIVE',
        id: { not: me.id },
        OR: [
          { firstName: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { lastName: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { phone: { contains: q, mode: Prisma.QueryMode.insensitive } },
        ],
      },
      take: 10,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    });
    return members;
  }

  async createContribution(userId: string, dto: CreateMemberContributionDto) {
    const me = await this.getMeOrThrow(userId);
    this.ensureMemberActiveEnough(me.status);

    if (!me.associationId || !me.antennaId) {
      throw new BadRequestException('Utilisateur non rattaché à une association / antenne.');
    }

    let finalMemberId = me.id;
    let finalAntennaId = me.antennaId;
    let submitterId: string | null = null;

    if (dto.targetMemberId && dto.targetMemberId !== me.id) {
      const target = await this.prisma.user.findFirst({
        where: { id: dto.targetMemberId, associationId: me.associationId, role: 'MEMBER', status: 'ACTIVE' },
        include: { memberships: true },
      });
      if (!target) throw new NotFoundException('Membre tiers introuvable ou inactif.');
      finalMemberId = target.id;
      submitterId = me.id;
      const primaryMembership = target.memberships.find(m => m.isPrimary) || target.memberships[0];
      if (primaryMembership?.antennaId) finalAntennaId = primaryMembership.antennaId;
    }

    const pricingSetting = await this.prisma.associationSetting.findUnique({
      where: { associationId_key: { associationId: me.associationId, key: 'PRICING_CONFIG' } },
    });
    const allPricing = (pricingSetting?.value as Record<string, any>) || {};
    const resolvedCurrency = dto.currency || 'EUR';
    const localPricing = allPricing[resolvedCurrency] || { monthlyQuota: 0, membershipCard: 0 };
    const monthlyPrice = Number(localPricing.monthlyQuota) || 0;
    const cardPrice = Number(localPricing.membershipCard) || 0;

    const purpose = (dto.purpose as ContributionPurpose) || ContributionPurpose.REGULAR_QUOTA;
    const totalAmount = Number(dto.amount);

    if (purpose === ContributionPurpose.MEMBERSHIP_CARD && cardPrice > 0) {
      if (totalAmount < cardPrice) {
        throw new BadRequestException(
          `Le montant minimum pour la carte membre est ${cardPrice} ${resolvedCurrency}.`,
        );
      }
    }

    const autoReference = `TR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const baseData = {
      associationId: me.associationId,
      antennaId: finalAntennaId,
      memberUserId: finalMemberId,
      submitterUserId: submitterId,
      currency: resolvedCurrency as CurrencyCode,
      paymentMethod: (dto.method as PaymentMethod) || PaymentMethod.OTHER,
      externalReference: autoReference,
      contributionDate: dto.depositedAt ? new Date(dto.depositedAt) : new Date(),
      memberComment: dto.note ?? null,
      proofFileId: dto.receiptFileAssetId ?? null,
      status: ContributionStatus.PENDING_VALIDATION,
      purpose,
    };

    const contributionsToCreate: Prisma.ContributionUncheckedCreateInput[] = [];

    if (purpose === ContributionPurpose.MEMBERSHIP_CARD && cardPrice > 0) {
      contributionsToCreate.push({
        ...baseData,
        amount: new Prisma.Decimal(cardPrice),
        monthReference: null,
        yearReference: null,
      });
      const excess = totalAmount - cardPrice;
      if (excess > 0 && monthlyPrice > 0) {
        let remaining = excess;
        let m = new Date().getMonth() + 1;
        let y = new Date().getFullYear();
        while (remaining >= monthlyPrice) {
          contributionsToCreate.push({
            ...baseData,
            purpose: ContributionPurpose.REGULAR_QUOTA,
            amount: new Prisma.Decimal(monthlyPrice),
            monthReference: m,
            yearReference: y,
            memberComment: '[Anticipation depuis excédent carte]',
          });
          remaining -= monthlyPrice;
          m++;
          if (m > 12) { m = 1; y++; }
        }
      }
    } else if (
      (purpose === ContributionPurpose.REGULAR_QUOTA || purpose === ContributionPurpose.LATE_QUOTA) &&
      monthlyPrice > 0 &&
      totalAmount >= monthlyPrice
    ) {
      let remaining = totalAmount;
      let m = dto.monthReference ?? (new Date().getMonth() + 1);
      let y = dto.yearReference ?? new Date().getFullYear();

      while (remaining >= monthlyPrice) {
        contributionsToCreate.push({
          ...baseData,
          amount: new Prisma.Decimal(monthlyPrice),
          monthReference: m,
          yearReference: y,
          memberComment: remaining !== totalAmount
            ? `${dto.note?.trim() || ''} [Avance automatique]`.trim()
            : dto.note?.trim() ?? null,
        });
        remaining -= monthlyPrice;
        m++;
        if (m > 12) { m = 1; y++; }
      }
    } else {
      contributionsToCreate.push({
        ...baseData,
        amount: new Prisma.Decimal(totalAmount),
        monthReference: dto.monthReference ?? null,
        yearReference: dto.yearReference ?? null,
      });
    }

    const created = await this.prisma.$transaction(
      contributionsToCreate.map(data => this.prisma.contribution.create({ data })),
    );

    const targetName = submitterId ? 'un membre tiers' : `${me.firstName} ${me.lastName}`;
    await this.notifications.notifyAntennaAdminsWithPush(
      finalAntennaId,
      me.associationId,
      `Un nouveau versement de ${dto.amount} ${resolvedCurrency} a été déclaré pour ${targetName}.`,
      NotificationType.CONTRIBUTION_SUBMITTED,
      { contributionId: created[0].id },
      '💰 Nouveau dépôt soumis',
    );

    return memberMapper.contribution(created[0]);
  }

  async listMyContributions(
    userId: string,
    query: MemberContributionsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.ContributionWhereInput = {
      associationId: me.associationId,
      OR: [
        { memberUserId: userId },
        { submitterUserId: userId },
      ],
      ...(query.status ? { status: query.status as ContributionStatus } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.contribution.count({ where }),
      this.prisma.contribution.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          submitter: { select: { firstName: true, lastName: true } },
          member: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return {
      items: items.map(c => ({
        ...memberMapper.contribution(c),
        currency: c.currency,
        // ✅ FIX : Exposer monthReference et yearReference au frontend
        monthReference: c.monthReference,
        yearReference: c.yearReference,
      })),
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
      currency: association.defaultCurrency || 'EUR',
      lastUpdatedAt: new Date().toISOString(),
    };
  }

  async getPricing(userId: string): Promise<Record<string, { monthlyQuota: number; membershipCard: number }>> {
    const me = await this.getMeOrThrow(userId);

    const pricings = await this.prisma.pricing.findMany({
      where: { associationId: me.associationId },
      select: { currency: true, monthlyQuota: true, membershipCard: true },
    });

    return pricings.reduce<Record<string, { monthlyQuota: number; membershipCard: number }>>(
      (acc, p) => {
        acc[p.currency] = {
          monthlyQuota: Number(p.monthlyQuota),
          membershipCard: Number(p.membershipCard),
        };
        return acc;
      },
      {},
    );
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
        createdAt: true,
        memberships: { include: { antenna: true } },
        contributions: {
          where: {
            status: 'VALIDATED',
            associationId: me.associationId,
            purpose: { in: ['REGULAR_QUOTA', 'LATE_QUOTA'] },
          },
          select: {
            amount: true,
            currency: true,
            monthReference: true,
            yearReference: true,
            validatedAt: true,
            createdAt: true,
          },
          orderBy: { validatedAt: 'desc' },
        },
      },
    });

    // ✅ FIX : Utiliser la même fonction centralisée computeLateMonths
    const computed = members
      .map(m => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        antennaName: m.memberships[0]?.antenna?.name ?? null,
        lateMonths: computeLateMonths(m.contributions, m.createdAt),
      }))
      .filter(x => x.lateMonths >= 3)
      .sort((a, b) => b.lateMonths - a.lateMonths);

    const start = (page - 1) * pageSize;
    return { items: computed.slice(start, start + pageSize), total: computed.length, page, pageSize };
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
          { title: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
          { summary: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
          { locationText: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
          { promoterName: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
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

    const initialStatus =
      (dto as any).status === 'DRAFT'
        ? ProposalStatus.DRAFT
        : ProposalStatus.SUBMITTED;

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
        currency: dto.currency || CurrencyCode.EUR,
        status: initialStatus,
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

    if (me.antennaId && initialStatus === ProposalStatus.SUBMITTED) {
      await this.notifications.notifyAntennaAdminsWithPush(
        me.antennaId,
        me.associationId,
        `Une nouvelle proposition de projet "${dto.title.trim()}" a été soumise par ${me.firstName} ${me.lastName}.`,
        NotificationType.PROJECT_PROPOSAL_SUBMITTED,
        { proposalId: created.id },
        '💡 Nouvelle proposition de projet',
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
      associationId: me.associationId,
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
        include: {
          attachments: {
            include: {
              file: {
                select: {
                  id: true,
                  url: true,
                  mimeType: true,
                  sizeBytes: true,
                  originalFilename: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: items.map((p) => ({
        ...memberMapper.projectProposal(p),
        estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null,
        currency: p.currency,
      })),
      total,
      page,
      pageSize,
    };
  }

  async updateProjectProposal(
    userId: string,
    proposalId: string,
    dto: Partial<CreateProjectProposalDto> & {
      attachmentFileAssetId?: string | null;
      status?: string;
    },
  ) {
    const me = await this.getMeOrThrow(userId);

    const proposal = await this.prisma.projectProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.authorUserId !== me.id) {
      throw new NotFoundException('Proposition introuvable.');
    }

    if (
      proposal.status !== ProposalStatus.DRAFT &&
      proposal.status !== ProposalStatus.SUBMITTED &&
      proposal.status !== ProposalStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Cette proposition ne peut plus être modifiée.');
    }

    const isSubmitting =
      dto.status === 'SUBMITTED' && proposal.status === ProposalStatus.DRAFT;

    let newStatus: ProposalStatus | undefined;
    if (dto.status === 'DRAFT') newStatus = ProposalStatus.DRAFT;
    else if (dto.status === 'SUBMITTED') newStatus = ProposalStatus.SUBMITTED;

    const updated = await this.prisma.projectProposal.update({
      where: { id: proposalId },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.description ? { description: dto.description.trim() } : {}),
        ...(dto.expectedBudget !== undefined
          ? { estimatedBudget: dto.expectedBudget ? new Prisma.Decimal(dto.expectedBudget) : null }
          : {}),
        ...(dto.currency ? { currency: dto.currency as CurrencyCode } : {}),
        ...(newStatus !== undefined ? { status: newStatus } : {}),
        ...(dto.attachmentFileAssetId !== undefined
          ? {
              attachments: dto.attachmentFileAssetId
                ? {
                    deleteMany: {},
                    create: { fileId: dto.attachmentFileAssetId },
                  }
                : { deleteMany: {} },
            }
          : {}),
      },
    });

    if (isSubmitting && me.antennaId) {
      await this.notifications.notifyAntennaAdminsWithPush(
        me.antennaId,
        me.associationId,
        `Une proposition de projet "${updated.title}" a été soumise par ${me.firstName} ${me.lastName}.`,
        NotificationType.PROJECT_PROPOSAL_SUBMITTED,
        { proposalId: updated.id },
        '💡 Nouvelle proposition de projet',
      );
    }

    return memberMapper.projectProposal(updated);
  }

  async deleteProjectProposal(userId: string, proposalId: string) {
    const me = await this.getMeOrThrow(userId);

    const proposal = await this.prisma.projectProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.authorUserId !== me.id) {
      throw new NotFoundException('Proposition introuvable.');
    }

    if (
      proposal.status !== ProposalStatus.DRAFT &&
      proposal.status !== ProposalStatus.SUBMITTED &&
      proposal.status !== ProposalStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException('Cette proposition ne peut plus être supprimée.');
    }

    await this.prisma.projectProposal.delete({
      where: { id: proposalId },
    });

    return { success: true };
  }

  async listDocuments(
    userId: string,
    query: MemberDocumentsQueryDto,
  ): Promise<PaginatedResponseDto<any>> {
    const me = await this.getMeOrThrow(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const visibilityOr: Prisma.DocumentWhereInput[] = [
      { visibility: { in: ['ALL', 'MEMBER'] } },
    ];

    if (me.antennaId) {
      visibilityOr.push({
        antennaId: me.antennaId,
        visibility: { in: ['ALL', 'MEMBER', 'ANTENNA'] },
      });
    }

    const andFilters: Prisma.DocumentWhereInput[] = [
      { associationId: me.associationId },
      { publishedAt: { not: null } },
      { OR: visibilityOr },
    ];

    if (query.q) {
      andFilters.push({
        OR: [
          { title: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
          { description: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
        ],
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
          { title: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
          { content: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
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

  async updateMyContribution(userId: string, contributionId: string, newAmount: number) {
    const me = await this.getMeOrThrow(userId);

    const contribution = await this.prisma.contribution.findFirst({
      where: {
        id: contributionId,
        associationId: me.associationId,
        OR: [
          { memberUserId: userId },
          { submitterUserId: userId },
        ],
      },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution introuvable.');
    }

    if (contribution.status !== ContributionStatus.PENDING_VALIDATION) {
      throw new BadRequestException(
        'Seules les contributions en attente de validation peuvent être modifiées.',
      );
    }

    if (newAmount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à 0.');
    }

    return this.prisma.contribution.update({
      where: { id: contributionId },
      data: { amount: new Prisma.Decimal(newAmount) },
    });
  }

  async deleteMyContribution(userId: string, contributionId: string) {
    const me = await this.getMeOrThrow(userId);

    const contribution = await this.prisma.contribution.findFirst({
      where: {
        id: contributionId,
        associationId: me.associationId,
        OR: [
          { memberUserId: userId },
          { submitterUserId: userId },
        ],
      },
    });

    if (!contribution) {
      throw new NotFoundException('Contribution introuvable.');
    }

    if (contribution.status !== ContributionStatus.PENDING_VALIDATION) {
      throw new BadRequestException(
        'Seules les contributions en attente de validation peuvent être supprimées.',
      );
    }

    await this.prisma.contribution.delete({ where: { id: contributionId } });

    return { success: true };
  }
}