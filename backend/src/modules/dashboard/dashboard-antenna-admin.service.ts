// backend/src/modules/dashboard/dashboard-antenna-admin.service.ts
//
// v1.2 — 🔥 RETRAIT : champ lateMembers retiré de la réponse. C'était un
//   tableau vide codé en dur ([]), jamais réellement calculé, et vérifié
//   comme non consommé par admin/page.tsx (qui utilise un state séparé
//   alimenté par api.listLateMembersOver3Months(), pas ce champ). Un champ
//   toujours vide qui a l'air d'une vraie donnée est trompeur — supprimé
//   plutôt que rempli, puisqu'aucun consommateur n'en a besoin.
//
// v1.1 — 🔥 CORRECTION CRITIQUE MULTI-TENANT :
//   getDashboard() interrogeait antennaAdminAssignment.findFirst({ where: { adminUserId } })
//   SANS filtrer sur isActive: true. Comme cette table conserve l'historique des
//   affectations d'un admin (réaffectations d'antenne dans le temps), Prisma pouvait
//   retourner n'importe quelle ligne (souvent la plus ancienne) au lieu de l'affectation
//   active — ce qui faisait que TOUS les admins voyaient le nom/soldes de la même antenne
//   (celle de la toute première ligne en base), indépendamment de leur vrai rattachement.
//   Fix : ajout de isActive: true (même pattern que admin.service.ts::getAdminContext).
//   ⚠️ Pas d'orderBy: { updatedAt } — ce champ n'existe pas sur AntennaAdminAssignment.
//
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, ContributionStatus, ProjectStatus } from '@prisma/client';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class DashboardAntennaAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private async getAntennaBalance(associationId: string, antennaId: string, currency: string): Promise<number> {
    const { totalByCurrency } = await this.ledger.getBalances(associationId, antennaId);
    return totalByCurrency[currency] ?? 0;
  }

  async getDashboard(adminUserId: string) {
    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId, isActive: true },
      include: { antenna: true },
    });

    if (!assignment) throw new NotFoundException("Aucune antenne assignée à ce compte.");
    const antennaId = assignment.antennaId;
    const associationId = assignment.antenna.associationId;
    const antennaCurrency = assignment.antenna.defaultCurrency || 'GNF';

    const [members, pendingAcc, pendingCont, projects, totalExpectedContributions] = await Promise.all([
      this.prisma.membership.count({ where: { antennaId, user: { status: UserStatus.ACTIVE } } }),
      this.prisma.membership.count({ where: { antennaId, user: { status: UserStatus.PENDING_APPROVAL } } }),
      this.prisma.contribution.count({ where: { antennaId, status: ContributionStatus.PENDING_VALIDATION } }),
      this.prisma.project.count({ where: { antennaId, status: ProjectStatus.IN_PROGRESS } }),
      this.prisma.contribution.aggregate({
        where: { antennaId },
        _sum: { amount: true },
      }),
    ]);

    const inAgg = await this.prisma.contribution.aggregate({
      where: { antennaId, status: ContributionStatus.VALIDATED },
      _sum: { amount: true }
    });
    const totalIn = Number(inAgg._sum.amount ?? 0);

    const expected = Number(totalExpectedContributions._sum.amount ?? 0);
    let collectionRate = 0;
    if (expected > 0) {
      collectionRate = Math.min((totalIn / expected) * 100, 100);
    }

    const localBalance = await this.getAntennaBalance(associationId, antennaId, antennaCurrency);

    const allAntennas = await this.prisma.antenna.findMany({
      where: { associationId },
      select: { id: true, name: true, defaultCurrency: true }
    });

    const antennaBalances = await Promise.all(
      allAntennas.map(async (ant) => {
        const currency = ant.defaultCurrency || 'GNF';
        return {
          id: ant.id,
          name: ant.name,
          balance: await this.getAntennaBalance(associationId, ant.id, currency),
          currency,
        };
      })
    );

    return {
      antennaName: assignment.antenna.name,
      stats: {
        members,
        pendingApprovals: pendingAcc,
        pendingContributions: pendingCont,
        activeProjects: projects,
        totalValidatedAmount: localBalance,
        currency: antennaCurrency,
        collectionRate: Math.round(collectionRate),
      },
      antennaBalances, 
      recentPendingAccounts: await this.prisma.user.findMany({
        where: { memberships: { some: { antennaId } }, status: UserStatus.PENDING_APPROVAL },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true }
      }),
      recentPendingContributions: await this.prisma.contribution.findMany({
        where: { antennaId, status: ContributionStatus.PENDING_VALIDATION },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { member: { select: { firstName: true, lastName: true } } },
      }).then(res => res.map(c => ({ ...c, amount: Number(c.amount) }))),
      recentProjects: await this.prisma.project.findMany({
        where: { antennaId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, budgetAmount: true, amountSpent: true, createdAt: true },
      }).then(res => res.map(p => ({ ...p, budgetAmount: p.budgetAmount ? Number(p.budgetAmount) : null, amountSpent: p.amountSpent ? Number(p.amountSpent) : null }))),
    };
  }
}