// backend/src/modules/dashboard/dashboard-antenna-admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, ContributionStatus, ProjectStatus, ExpenseStatus } from '@prisma/client';

@Injectable()
export class DashboardAntennaAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(adminUserId: string) {
    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId },
      include: { antenna: true },
    });

    if (!assignment) throw new NotFoundException("Aucune antenne assignée à ce compte.");
    const antennaId = assignment.antennaId;
    const associationId = assignment.antenna.associationId;

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

    // Vrai solde de l'antenne locale (Cotisations - Dépenses)
    const inAgg = await this.prisma.contribution.aggregate({
      where: { antennaId, status: ContributionStatus.VALIDATED },
      _sum: { amount: true }
    });
    const outAgg = await this.prisma.expense.aggregate({
      where: { antennaId, status: ExpenseStatus.VALIDATED },
      _sum: { amount: true }
    });

    const totalIn = Number(inAgg._sum.amount ?? 0);
    const totalOut = Number(outAgg._sum.amount ?? 0);
    const localBalance = totalIn - totalOut;

    const expected = Number(totalExpectedContributions._sum.amount ?? 0);
    let collectionRate = 0;
    if (expected > 0) {
      collectionRate = Math.min((totalIn / expected) * 100, 100);
    }

    const allAntennas = await this.prisma.antenna.findMany({
      where: { associationId },
      select: { id: true, name: true, defaultCurrency: true }
    });

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
          currency: ant.defaultCurrency || 'GNF'
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
        currency: assignment.antenna.defaultCurrency || 'GNF',
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
      lateMembers: [],
    };
  }
}