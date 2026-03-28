// backend/src/modules/dashboard/dashboard-super-admin.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, ContributionStatus, ProjectStatus, UserStatus, ExpenseStatus } from '@prisma/client';

@Injectable()
export class DashboardSuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSuperAdminDashboard() {
    const [
      associationsCount,
      antennasCount,
      membersCount,
      pendingAccountsCount,
      pendingContributionsCount,
      activeProjectsCount,
      aggValidatedContributions,
    ] = await Promise.all([
      this.prisma.association.count(),
      this.prisma.antenna.count(),
      this.prisma.user.count({ where: { role: UserRole.MEMBER } }),
      this.prisma.user.count({ where: { status: UserStatus.PENDING_APPROVAL } }),
      this.prisma.contribution.count({ where: { status: ContributionStatus.PENDING_VALIDATION } }),
      this.prisma.project.count({ where: { status: ProjectStatus.IN_PROGRESS } }),
      this.prisma.contribution.aggregate({
        where: { status: ContributionStatus.VALIDATED },
        _sum: { amount: true },
      }),
    ]);

    // On récupère TOUTES les antennes
    const allAntennas = await this.prisma.antenna.findMany({
      select: { id: true, name: true, defaultCurrency: true }
    });

    const antennaBalances = await Promise.all(
      allAntennas.map(async (ant) => {
        // 1. Total de TOUTES les cotisations validées (Historique inclus)
        const inAgg = await this.prisma.contribution.aggregate({
          where: { antennaId: ant.id, status: ContributionStatus.VALIDATED },
          _sum: { amount: true }
        });
        
        // 2. Total de TOUTES les dépenses validées
        const outAgg = await this.prisma.expense.aggregate({
          where: { antennaId: ant.id, status: ExpenseStatus.VALIDATED },
          _sum: { amount: true }
        });

        const totalIn = Number(inAgg._sum.amount ?? 0);
        const totalOut = Number(outAgg._sum.amount ?? 0);

        return {
          id: ant.id,
          name: ant.name,
          balance: totalIn - totalOut, // Le VRAI solde positif
          currency: ant.defaultCurrency || 'GNF'
        };
      })
    );

    const recentPendingAccounts = await this.prisma.user.findMany({
      where: { status: UserStatus.PENDING_APPROVAL },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const recentContributions = await this.prisma.contribution.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        member: { 
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    const recentProjects = await this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        budgetAmount: true,
        amountSpent: true,
        createdAt: true,
      },
    });

    return {
      stats: {
        associations: associationsCount,
        antennas: antennasCount,
        members: membersCount,
        pendingAccounts: pendingAccountsCount,
        pendingContributions: pendingContributionsCount,
        activeProjects: activeProjectsCount,
        totalValidatedContributionsAmount: Number(aggValidatedContributions._sum.amount ?? 0),
      },
      antennaBalances,
      recentPendingAccounts,
      recentContributions: recentContributions.map((c) => ({
        ...c,
        amount: Number(c.amount),
      })),
      recentProjects: recentProjects.map((p) => ({
        ...p,
        budgetAmount: p.budgetAmount ? Number(p.budgetAmount) : null,
        amountSpent: p.amountSpent ? Number(p.amountSpent) : null,
      })),
    };
  }

  async listAntennas(page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    return this.prisma.antenna.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      skip,
      take: pageSize,
      include: { association: true },
    });
  }

  async listAntennaAdmins(page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    return this.prisma.user.findMany({
      where: {
        role: UserRole.ANTENNA_ADMIN,
        ...(q ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      skip,
      take: pageSize,
    });
  }
}