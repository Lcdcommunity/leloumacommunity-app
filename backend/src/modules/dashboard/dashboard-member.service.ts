//backend/src/modules/dashboard/dashboard-member.service.ts
//
// v1.4 — 🔧 Renommage findEarliestUnpaidMonth -> findEarliestUncoveredMonth
//   pour coller au vocabulaire "covered/uncovered" utilisé dans les helpers
//   voisins. Fix accessoire : la comparaison de fin de boucle se faisait sur
//   une clé string (`${y}-${mm}`) comparée à la clé du mois courant — ça ne
//   marche que si on tombe exactement dessus, donc si maxLookahead ne
//   traverse pas pile le mois courant (ex. décalage d'année), on pouvait
//   dépasser le mois courant sans jamais matcher la clé et continuer à
//   chercher dans le "futur". Remplacé par une comparaison de Date
//   (monthStart >= currentMonthStart), plus robuste. maxLookahead ramené de
//   600 à 24 (aligné sur maxLookback de computeLateMonths, inutile de
//   chercher 50 ans en avant pour un mois impayé qui doit forcément être
//   récent).
//
// v1.3 — 🔥 AJOUT : stats.earliestUnpaidMonth/earliestUnpaidYear (plus ancien
//   mois non couvert du membre). Complète le chantier v1.2 : le calcul était
//   prévu ("cas Thierno") mais jamais réellement câblé dans la réponse — le
//   frontend (contributions/new/page.tsx) n'avait donc rien à transmettre à
//   ContributionCreateForm. Réutilise myCoveredMonths déjà calculé plus bas,
//   aucune requête supplémentaire. Sert désormais aussi de plafond côté
//   member.service.ts::createContribution (on ne peut plus choisir un mois
//   de référence postérieur à ce mois).
//   Seuil lateMembersPreview aligné sur celui de member.service.ts::listLateMembers
//   (>= 3 au lieu de > 3) — cohérence stricte avec la règle "visible aux
//   autres membres à partir de 3 mois de retard".
//
// v1.2 — 🔥 CORRECTION CRITIQUE : bug des retardataires sur paiement anticipé.
//   myLateMonths et lateMembersPreview utilisaient monthDiff(validatedAt le
//   plus récent, maintenant) : un membre ayant payé ses 12 mois d'un coup en
//   janvier (validatedAt = janvier) ressortait "en retard" dès février, parce
//   que le calcul ne regardait QUE la date de validation du dernier
//   versement, jamais les mois que ce versement couvre réellement
//   (monthReference/yearReference). Le module member.service.ts avait déjà
//   la bonne logique (buildCoveredMonths/computeLateMonths, cf. son
//   commentaire "24€/2€=12 mois") pour /member/late-members — mais
//   dashboard-member.service.ts (qui alimente /member/dashboard, donc le
//   dashboard membre ET son mini-tableau "Retardataires") ne l'utilisait
//   pas. Fix : mêmes helpers repris ici (pattern déjà dupliqué ailleurs dans
//   le code, ex. getPricingMap() dans member.service.ts et
//   contributions.service.ts), appliqués à myLateMonths et à
//   lateMembersPreview. monthDiff() supprimée (plus utilisée nulle part).
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

// 🔧 RENOMMÉ (v1.4, ex-findEarliestUnpaidMonth) : plus ancien mois NON
// couvert — même fonction que member.service.ts::findEarliestUncoveredMonth
// (dupliquée, même pattern que les deux helpers ci-dessus).
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

    const lateMembersMemberships = await this.prisma.membership.findMany({
      where: {
        associationId: me.associationId,
        status: 'APPROVED',
        isPrimary: true,
      },
      take: 50,
      select: {
        user: {
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
        },
        antenna: { select: { defaultCurrency: true } },
      },
    });

    const lateMembersPreview = lateMembersMemberships
      .map(({ user: u, antenna }) => {
        const antCurrency = antenna?.defaultCurrency ?? 'EUR';
        const mPrice =
          Number(allPricing[antCurrency]?.monthlyQuota) ||
          Number(allPricing['EUR']?.monthlyQuota)        ||
          0;
        const covered = buildCoveredMonths(u.contributions, mPrice);
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          lateMonths: computeLateMonths(covered, u.createdAt),
        };
      })
      // 🔥 CORRIGÉ (v1.3) : >= 3 au lieu de > 3, cohérent avec le seuil "3
      // mois" utilisé partout ailleurs pour la visibilité communautaire.
      .filter((x) => x.lateMonths >= 3)
      .sort((a, b) => b.lateMonths - a.lateMonths)
      .slice(0, 10);

    const myMonthlyPrice =
      Number(allPricing[primaryAntennaCurrency]?.monthlyQuota) ||
      Number(allPricing['EUR']?.monthlyQuota)                  ||
      0;
    const myCoveredMonths = buildCoveredMonths(myRegularContributions, myMonthlyPrice);
    const myLateMonths = computeLateMonths(myCoveredMonths, me.createdAt);
    // 🔧 RENOMMÉ (v1.4) : plus ancien mois non couvert — réutilise
    // myCoveredMonths déjà calculé ci-dessus, aucune requête supplémentaire.
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