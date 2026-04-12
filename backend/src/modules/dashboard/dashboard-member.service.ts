//backend/src/modules/dashboard/dashboard-member.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  ContributionStatus, 
  ProjectStatus, 
  PostStatus, 
  UserRole, 
  UserStatus,
  ExpenseStatus 
} from '@prisma/client';

@Injectable()
export class DashboardMemberService {
  constructor(private readonly prisma: PrismaService) {}

  async getMemberDashboard(userId: string) {
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
        function: true,              // 🔥 AJOUT : Poste occupé
        professionalStatus: true,    // 🔥 AJOUT : Statut pro
        originSubPrefecture: true,   // 🔥 AJOUT : Pour la carte
        createdAt: true,             // 🔥 REQUIS pour calcul retard initial
        memberships: {
          where: { isPrimary: true },
          select: { 
            antennaId: true,
            // 🔥 CORRECTION : On récupère aussi la devise par défaut de l'antenne pour le dashboard
            antenna: { select: { defaultCurrency: true } }
          },
        },
        updatedAt: true,
      },
    });

    if (!me) throw new Error('Utilisateur introuvable');

    const primaryAntennaId = me.memberships[0]?.antennaId ?? null;
    const primaryAntennaCurrency = me.memberships[0]?.antenna?.defaultCurrency || 'EUR';

    // 🔥 AJOUT : On récupère la carte virtuelle pour qu'elle s'affiche correctement sur le dashboard !
    const virtualCard = await this.prisma.virtualCard.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            memberships: { include: { antenna: true } },
            profilePhoto: true,
          },
        },
      },
    });

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
          birthDate: virtualCard.user.birthDate ? virtualCard.user.birthDate.toISOString() : null,
          placeOfBirth: virtualCard.user.placeOfBirth,
          originVillage: virtualCard.user.originSubPrefecture,
          country: virtualCard.user.country,
          city: virtualCard.user.city,
          profilePhotoUrl: virtualCard.user.profilePhoto?.url || null,
          function: virtualCard.user.function,                       // 🔥 AJOUT
          professionalStatus: virtualCard.user.professionalStatus,   // 🔥 AJOUT
        },
      };
    }

    // 🔥 CORRECTION CRITIQUE 1 & 2 : Les agrégations
    const [aggAll, aggValidated, pendingCount, lastValidContrib] =
      await Promise.all([
        this.prisma.contribution.aggregate({
          // Exclure les annulations et rejets du total global
          where: { 
            memberUserId: userId,
            status: { notIn: ['REJECTED', 'CANCELLED'] } 
          },
          _sum: { amount: true },
        }),
        this.prisma.contribution.aggregate({
          where: { memberUserId: userId, status: ContributionStatus.VALIDATED },
          _sum: { amount: true },
        }),
        this.prisma.contribution.count({
          where: { 
            memberUserId: userId, 
            status: { in: ['PENDING_VALIDATION', 'SUBMITTED'] } // Compter tout ce qui est en attente
          },
        }),
        // Ne récupérer QUE la dernière cotisation validée pour le calcul du retard
        this.prisma.contribution.findFirst({
          where: { memberUserId: userId, status: ContributionStatus.VALIDATED },
          orderBy: [{ validatedAt: 'desc' }],
          select: { validatedAt: true },
        }),
      ]);

    const allAntennas = await this.prisma.antenna.findMany({
      where: { associationId: me.associationId, isActive: true },
      select: { id: true, name: true, defaultCurrency: true }
    });

    let totalAssociationBalance = 0;

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
        
        const localBalance = Number(aggC._sum.amount ?? 0) - Number(aggE._sum.amount ?? 0);
        totalAssociationBalance += localBalance;

        return {
          id: ant.id,
          name: ant.name,
          balance: localBalance,
          currency: ant.defaultCurrency || 'EUR' 
        };
      })
    );

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
        locationText: true,           // Utile pour le carrousel
        summary: true,                // Utile pour le carrousel
        coverImageFile: { select: { url: true } } // Image pour le carrousel
      },
    });

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
        coverImageFile: { select: { url: true } } // Image pour le carrousel
      },
    });

    // 🔥 NOUVEAUTÉ : Récupération des événements à venir pour le carrousel
    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        associationId: me.associationId,
        status: 'PUBLISHED',
        startsAt: { gte: new Date() } // Uniquement les événements futurs
      },
      orderBy: [{ startsAt: 'asc' }],
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        locationText: true,
        coverImage: { select: { url: true } } // Image pour le carrousel
      }
    });

    // 🔥 CORRECTION CRITIQUE 3 : Calcul correct des retards de l'antenne (basé sur validé)
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
        createdAt: true,
        contributions: {
          where: { status: ContributionStatus.VALIDATED },
          orderBy: [{ validatedAt: 'desc' }],
          take: 1,
          select: { validatedAt: true },
        },
      },
    });

    const now = new Date();
    
    // Calcul du retard du membre connecté
    const myLastDate = lastValidContrib?.validatedAt ?? me.createdAt;
    const myLateMonths = monthDiff(myLastDate, now);

    const lateMembersPreview = lateMembersPreviewRaw
      .map((u) => {
        const lastDate = u.contributions[0]?.validatedAt ?? u.createdAt;
        const lateMonths = monthDiff(lastDate, now);
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

    return {
      stats: {
        myContributionsTotal: Number(aggAll._sum.amount ?? 0),
        myContributionsValidatedTotal: Number(aggValidated._sum.amount ?? 0),
        myPendingContributionsCount: pendingCount,
        myLastContributionAt: lastValidContrib?.validatedAt?.toISOString() ?? null,
        associationTotalBalance: totalAssociationBalance, 
        // 🔥 CORRECTION : On renvoie la devise de l'antenne au lieu de 'EUR'
        currency: primaryAntennaCurrency,
        lateMonths: myLateMonths, // Valeur corrigée
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
        function: me.function,                     // 🔥 AJOUT
        professionalStatus: me.professionalStatus, // 🔥 AJOUT
        originSubPrefecture: me.originSubPrefecture, // 🔥 AJOUT
      },
      virtualCard: cardData,                       // 🔥 AJOUT pour le dashboard
      antennaBalances, 
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
      upcomingEvents, // 🔥 Export des événements ajoutés pour le front
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