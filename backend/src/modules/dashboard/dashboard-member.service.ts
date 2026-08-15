//backend/src/modules/dashboard/dashboard-member.service.ts
//
// v1.6 — 🔥 CORRIGÉ (15/08) : lateMembersMemberships interrogeait Membership
//   avec un double filtre status==='APPROVED' ET isPrimary===true — même
//   famille de bug que member.service.ts::listLateMembers() (déjà corrigée
//   là-bas, jamais reportée ici) : des membres réellement actifs
//   (User.status===ACTIVE) mais dont la ligne Membership est désynchronisée
//   étaient exclus silencieusement. Réécrit pour interroger User directement
//   avec status===ACTIVE, exactement comme admin.service.ts::listLateMembers()
//   (qui affiche correctement les mêmes membres côté admin).
//
// v1.5 — 🔥 CORRIGÉ (15/08) : lateMembersMemberships (alimente
//   lateMembersPreview, panneau "Retardataires · +3 mois" de la page
//   d'accueil membre) n'était pas scopé par antenne — un membre voyait les
//   retardataires de TOUTE l'association au lieu de sa propre antenne
//   uniquement (contrairement à admin.service.ts, déjà scopé). Ajout de
//   `antennaId: primaryAntennaId` à la requête.
//
// v1.4 — 🔥 CORRIGÉ (08/08) : findEarliestUncoveredMonth ne s'arrête plus au
//   mois courant. L'ancienne version renvoyait null (→ repli sur
//   "aujourd'hui") dès qu'elle atteignait le mois en cours, même si des mois
//   APRÈS étaient déjà couverts par une avance — un membre à jour jusqu'à
//   décembre 2026 se voyait renvoyer earliestUnpaidMonth=aujourd'hui au lieu
//   de janvier 2027. Ici : on scanne simplement en avant depuis le mois
//   d'adhésion jusqu'au premier trou réel, qu'il soit avant, à, ou après le
//   mois courant.
//
// v1.3 — 🔥 AJOUT : stats.earliestUnpaidMonth/earliestUnpaidYear (plus ancien
//   mois non couvert du membre). Complète le chantier v1.2 : le calcul était
//   prévu ("cas Thierno") mais jamais réellement câblé dans la réponse.
//   Seuil lateMembersPreview aligné sur celui de member.service.ts::listLateMembers
//   (>= 3 au lieu de > 3).
//
// v1.2 — 🔥 CORRECTION CRITIQUE : bug des retardataires sur paiement anticipé.
//   myLateMonths et lateMembersPreview utilisaient monthDiff(validatedAt le
//   plus récent, maintenant) au lieu de regarder les mois réellement couverts
//   (monthReference/yearReference). Fix : buildCoveredMonths/computeLateMonths.
//
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { 
  ContributionStatus, 
  ContributionPurpose,
  ProjectStatus, 
  PostStatus, 
  UserRole, 
  UserStatus,
} from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';

// ─── Helpers retard (identiques à member.service.ts) ──────────────────────
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

// 🔥 CORRIGÉ (v1.4) : ne s'arrête plus au mois courant — cf. changelog.
function findEarliestUncoveredMonth(
  coveredMonths: Set<string>,
  joinDate: Date,
  maxLookahead = 24,
): { month: number; year: number } | null {
  let m = joinDate.getMonth() + 1;
  let y = joinDate.getFullYear();

  for (let i = 0; i < maxLookahead; i++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (!coveredMonths.has(key)) return { month: m, year: y };
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return null;
}

@Injectable()
export class DashboardMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private async getAntennaBalance(associationId: string, antennaId: string, currency: string): Promise<number> {
    const { totalByCurrency } = await this.ledger.getBalances(associationId, antennaId);
    return totalByCurrency[currency] ?? 0;
  }

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
        function: true,
        professionalStatus: true,
        originSubPrefecture: true,
        createdAt: true,
        memberships: {
          where: { isPrimary: true },
          select: { 
            antennaId: true,
            antenna: { select: { defaultCurrency: true } }
          },
        },
        updatedAt: true,
      },
    });

    if (!me) throw new Error('Utilisateur introuvable');

    const primaryAntennaId = me.memberships[0]?.antennaId ?? null;
    const primaryAntennaCurrency = me.memberships[0]?.antenna?.defaultCurrency || 'EUR';

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
          function: virtualCard.user.function,
          professionalStatus: virtualCard.user.professionalStatus,
        },
      };
    }

    const [aggAll, aggValidated, pendingCount, lastValidContrib, myRegularContributions, allPricing] =
      await Promise.all([
        this.prisma.contribution.aggregate({
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
            status: { in: ['PENDING_VALIDATION', 'SUBMITTED'] }
          },
        }),
        this.prisma.contribution.findFirst({
          where: { memberUserId: userId, status: ContributionStatus.VALIDATED },
          orderBy: [{ validatedAt: 'desc' }],
          select: { validatedAt: true },
        }),
        this.prisma.contribution.findMany({
          where: {
            memberUserId: userId,
            status: ContributionStatus.VALIDATED,
            purpose: { in: [ContributionPurpose.REGULAR_QUOTA, ContributionPurpose.LATE_QUOTA] },
          },
          select: {
            monthReference: true,
            yearReference: true,
            validatedAt: true,
            createdAt: true,
            amount: true,
          },
        }),
        this.getPricingMap(me.associationId),
      ]);

    const allAntennas = await this.prisma.antenna.findMany({
      where: { associationId: me.associationId, isActive: true },
      select: { id: true, name: true, defaultCurrency: true }
    });

    const membersCount = await this.prisma.user.count({
      where: { associationId: me.associationId, role: UserRole.MEMBER, status: UserStatus.ACTIVE },
    });

    let totalAssociationBalance = 0;

    const antennaBalances = await Promise.all(
      allAntennas.map(async (ant) => {
        const currency = ant.defaultCurrency || 'EUR';
        const localBalance = await this.getAntennaBalance(me.associationId, ant.id, currency);
        totalAssociationBalance += localBalance;

        return {
          id: ant.id,
          name: ant.name,
          balance: localBalance,
          currency,
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
        locationText: true,
        summary: true,
        coverImageFile: { select: { url: true } }
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
        coverImageFile: { select: { url: true } }
      },
    });

    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        associationId: me.associationId,
        status: 'PUBLISHED',
        startsAt: { gte: new Date() }
      },
      orderBy: [{ startsAt: 'asc' }],
      take: 5,
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        locationText: true,
        coverImage: { select: { url: true } }
      }
    });

    // 🔥 CORRIGÉ (v1.6) : interroge User directement (status===ACTIVE),
    // exactement comme admin.service.ts::listLateMembers() — au lieu de
    // Membership avec status==='APPROVED' + isPrimary===true, qui excluait
    // silencieusement des membres actifs dont la ligne Membership était
    // désynchronisée. Le filtre d'antenne (v1.5) est conservé, via la
    // relation memberships.
    const lateMembersUsers = await this.prisma.user.findMany({
      where: {
        associationId: me.associationId,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE,
        ...(primaryAntennaId
          ? { memberships: { some: { antennaId: primaryAntennaId } } }
          : {}),
      },
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        contributions: {
          where: {
            status: ContributionStatus.VALIDATED,
            purpose: { in: [ContributionPurpose.REGULAR_QUOTA, ContributionPurpose.LATE_QUOTA] },
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

    const lateMembersMonthlyPrice =
      Number(allPricing[primaryAntennaCurrency]?.monthlyQuota) ||
      Number(allPricing['EUR']?.monthlyQuota)                  ||
      0;

    const lateMembersPreview = lateMembersUsers
      .map((u) => {
        const covered = buildCoveredMonths(u.contributions, lateMembersMonthlyPrice);
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          lateMonths: computeLateMonths(covered, u.createdAt),
        };
      })
      .filter((x) => x.lateMonths >= 3)
      .sort((a, b) => b.lateMonths - a.lateMonths)
      .slice(0, 10);

    const myMonthlyPrice =
      Number(allPricing[primaryAntennaCurrency]?.monthlyQuota) ||
      Number(allPricing['EUR']?.monthlyQuota)                  ||
      0;
    const myCoveredMonths = buildCoveredMonths(myRegularContributions, myMonthlyPrice);
    const myLateMonths = computeLateMonths(myCoveredMonths, me.createdAt);
    const myEarliestUnpaid = findEarliestUncoveredMonth(myCoveredMonths, me.createdAt);

    return {
      stats: {
        myContributionsTotal: Number(aggAll._sum.amount ?? 0),
        myContributionsValidatedTotal: Number(aggValidated._sum.amount ?? 0),
        myPendingContributionsCount: pendingCount,
        myLastContributionAt: lastValidContrib?.validatedAt?.toISOString() ?? null,
        associationTotalBalance: totalAssociationBalance, 
        currency: primaryAntennaCurrency,
        lateMonths: myLateMonths,
        members: membersCount,
        earliestUnpaidMonth: myEarliestUnpaid?.month ?? null,
        earliestUnpaidYear: myEarliestUnpaid?.year ?? null,
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
        function: me.function,
        professionalStatus: me.professionalStatus,
        originSubPrefecture: me.originSubPrefecture,
      },
      virtualCard: cardData,
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
      upcomingEvents,
      lateMembersPreview,
    };
  }
}