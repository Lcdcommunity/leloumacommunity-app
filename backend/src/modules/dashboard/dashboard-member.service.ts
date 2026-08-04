//backend/src/modules/dashboard/dashboard-member.service.ts
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
// CORRECTION BUG PAIEMENTS GROUPÉS :
// Un admin peut valider un unique versement de 24 € avec monthReference = 3.
// Sans ce helper, on ne verrait qu'un seul mois couvert (mars).
// Avec ce helper : 24 € / 2 € = 12 mois → on peuple mars à février de l'année suivante.
// Pour les contributions déjà splittées (12 × 2 €), Math.floor(2/2) = 1 → comportement inchangé.
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

@Injectable()
export class DashboardMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  // 🔥 CORRECTION : solde recalculé via LedgerService.getBalances (source
  // unique de vérité, incluant les virements inter-antennes TRANSFER_IN /
  // TRANSFER_OUT), au lieu de Contribution - Expense qui les ignorait.
  private async getAntennaBalance(associationId: string, antennaId: string, currency: string): Promise<number> {
    const { totalByCurrency } = await this.ledger.getBalances(associationId, antennaId);
    return totalByCurrency[currency] ?? 0;
  }

  // ─── getPricingMap (dupliqué du même pattern que member.service.ts /
  //   contributions.service.ts) ─────────────────────────────────────────────
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
    const [aggAll, aggValidated, pendingCount, lastValidContrib, myRegularContributions, allPricing] =
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
        // Dernier versement validé (toutes natures) — sert uniquement à
        // l'affichage "Dernière cotisation", plus au calcul du retard.
        this.prisma.contribution.findFirst({
          where: { memberUserId: userId, status: ContributionStatus.VALIDATED },
          orderBy: [{ validatedAt: 'desc' }],
          select: { validatedAt: true },
        }),
        // 🔥 AJOUT : historique complet des cotisations (régulières + retard)
        // validées, avec les champs nécessaires à buildCoveredMonths — c'est
        // ÇA qui manquait pour ne pas compter un versement anticipé comme
        // "plus payé depuis janvier".
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

    // 🔥 AJOUT : nombre de membres actifs de l'association — nécessaire pour
    // la carte "Membres" côté dashboard membre (même compteur que
    // dashboard-super-admin.service.ts).
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

    // 🔥 Événements à venir pour le carrousel
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

    // 🔥 CORRECTION (v1.2) : retardataires de l'association — basé sur les
    // mois réellement couverts (buildCoveredMonths/computeLateMonths),
    // requête via Membership (pour récupérer l'antenne → sa devise → son
    // tarif mensuel), même schéma que member.service.ts::listLateMembers().
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
      .filter((x) => x.lateMonths > 3)
      .sort((a, b) => b.lateMonths - a.lateMonths)
      .slice(0, 10);

    // 🔥 CORRECTION (v1.2) : retard du membre connecté — mêmes helpers,
    // remplace monthDiff(dernière validation, maintenant).
    const myMonthlyPrice =
      Number(allPricing[primaryAntennaCurrency]?.monthlyQuota) ||
      Number(allPricing['EUR']?.monthlyQuota)                  ||
      0;
    const myCoveredMonths = buildCoveredMonths(myRegularContributions, myMonthlyPrice);
    const myLateMonths = computeLateMonths(myCoveredMonths, me.createdAt);

    return {
      stats: {
        myContributionsTotal: Number(aggAll._sum.amount ?? 0),
        myContributionsValidatedTotal: Number(aggValidated._sum.amount ?? 0),
        myPendingContributionsCount: pendingCount,
        myLastContributionAt: lastValidContrib?.validatedAt?.toISOString() ?? null,
        associationTotalBalance: totalAssociationBalance, 
        // 🔥 CORRECTION : On renvoie la devise de l'antenne au lieu de 'EUR'
        currency: primaryAntennaCurrency,
        lateMonths: myLateMonths, // Valeur corrigée (mois réellement couverts)
        members: membersCount, // 🔥 AJOUT
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