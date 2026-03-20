//backend/src/modules/dashboard/dashboard-member.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  ContributionStatus, 
  ProjectStatus, 
  PostStatus, 
  UserRole, 
  UserStatus 
} from '@prisma/client';

@Injectable()
export class DashboardMemberService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberDashboard(userId: string) {
    // 1. Récupération des informations du membre
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        associationId: true,
        memberships: {
          where: { isPrimary: true },
          select: { antennaId: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!me) throw new Error('Utilisateur introuvable');

    const primaryAntennaId = me.memberships[0]?.antennaId ?? null;

    // 2. Agrégations des contributions
    const [aggAll, aggValidated, pendingCount, lastContribution, associationAgg] =
      await Promise.all([
        this.prisma.contribution.aggregate({
          where: { memberUserId: userId },
          _sum: { amount: true },
        }),
        this.prisma.contribution.aggregate({
          where: { memberUserId: userId, status: ContributionStatus.VALIDATED },
          _sum: { amount: true },
        }),
        this.prisma.contribution.count({
          where: { memberUserId: userId, status: ContributionStatus.PENDING_VALIDATION },
        }),
        this.prisma.contribution.findFirst({
          where: { memberUserId: userId },
          orderBy: [{ createdAt: 'desc' }],
          select: { createdAt: true },
        }),
        this.prisma.contribution.aggregate({
          where: {
            associationId: me.associationId,
            status: ContributionStatus.VALIDATED,
          },
          _sum: { amount: true },
        }),
      ]);

    // 👇 2.5 AJOUT CHIRURGICAL : Récupération des soldes de toutes les antennes
    const allAntennas = await this.prisma.antenna.findMany({
      where: { associationId: me.associationId, isActive: true },
      select: { id: true, name: true, defaultCurrency: true }
    });

    const antennaBalances = await Promise.all(
      allAntennas.map(async (ant) => {
        const agg = await this.prisma.contribution.aggregate({
          where: { antennaId: ant.id, status: ContributionStatus.VALIDATED },
          _sum: { amount: true }
        });
        return {
          id: ant.id,
          name: ant.name,
          balance: Number(agg._sum.amount ?? 0),
          currency: ant.defaultCurrency || 'GNF'
        };
      })
    );

    // 3. Dernières contributions du membre
    const recentContributions = await this.prisma.contribution.findMany({
      where: { memberUserId: userId },
      orderBy: [{ createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        externalReference: true,
        status: true,
        contributionDate: true,
        createdAt: true,
        validatedAt: true,
      },
    });

    // 4. Projets en cours dans l'association
    const projectsInProgress = await this.prisma.project.findMany({
      where: {
        associationId: me.associationId,
        status: { in: [ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS] },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        startDate: true,
        endDate: true,
        budgetAmount: true,
        amountSpent: true,
      },
    });

    // 5. Dernières actualités (NewsPosts)
    const latestContents = await this.prisma.newsPost.findMany({
      where: {
        associationId: me.associationId,
        status: PostStatus.PUBLISHED,
      },
      orderBy: [{ publishedAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        content: true,
      },
    });

    // 6. Aperçu des membres en retard
    const lateMembersPreviewRaw = await this.prisma.user.findMany({
      where: {
        associationId: me.associationId,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
      },
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        contributions: {
          orderBy: [{ createdAt: 'desc' }],
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const now = new Date();
    const lateMembersPreview = lateMembersPreviewRaw
      .map((u) => {
        const last = u.contributions[0]?.createdAt ?? null;
        const lateMonths = last ? monthDiff(last, now) : 999;
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          lateMonths,
        };
      })
      .filter((x) => x.lateMonths > 3)
      .sort((a, b) => b.lateMonths - a.lateMonths)
      .slice(0, 10);

    // 7. Formatage de la réponse
    return {
      stats: {
        myContributionsTotal: Number(aggAll._sum.amount ?? 0),
        myContributionsValidatedTotal: Number(aggValidated._sum.amount ?? 0),
        myPendingContributionsCount: pendingCount,
        myLastContributionAt: lastContribution?.createdAt?.toISOString() ?? null,
        associationTotalBalance: Number(associationAgg._sum.amount ?? 0),
        currency: 'EUR',
        lateMonths: (() => {
          const mine = recentContributions[0]?.createdAt ?? null;
          return mine ? monthDiff(mine, now) : 999;
        })(),
      },
      me: {
        id: me.id,
        firstName: me.firstName,
        lastName: me.lastName,
        name: `${me.firstName} ${me.lastName}`.trim(),
        email: me.email,
        phone: me.phone,
        role: me.role,
        status: me.status,
        associationId: me.associationId,
        antennaId: primaryAntennaId,
      },
      antennaBalances, // <-- INJECTION DU TABLEAU DES SOLDES
      recentContributions: recentContributions.map((x) => ({
        ...x,
        amount: Number(x.amount),
      })),
      projectsInProgress: projectsInProgress.map((x) => ({
        ...x,
        budgetAmount: x.budgetAmount != null ? Number(x.budgetAmount) : null,
        amountSpent: x.amountSpent != null ? Number(x.amountSpent) : null,
      })),
      latestContents,
      lateMembersPreview,
    };
  }
}

function monthDiff(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const total = years * 12 + months;
  return total < 0 ? 0 : total;
}