// backend/src/modules/dashboard/dashboard-super-admin.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, ContributionStatus, ProjectStatus, UserStatus, ExpenseStatus } from '@prisma/client';

@Injectable()
export class DashboardSuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  // 💉 Le service exige maintenant l'associationId
  async getSuperAdminDashboard(associationId: string) {
    const [
      associationsCount,
      antennasCount,
      membersCount,
      pendingAccountsCount,
      pendingContributionsCount,
      activeProjectsCount,
      aggValidatedContributions,
    ] = await Promise.all([
      // 🔒 Cloisonnement de CHAQUE requête
      this.prisma.association.count({ where: { id: associationId } }), 
      this.prisma.antenna.count({ where: { associationId } }),
      this.prisma.user.count({ where: { role: UserRole.MEMBER, associationId } }),
      this.prisma.user.count({ where: { status: UserStatus.PENDING_APPROVAL, associationId } }),
      this.prisma.contribution.count({ where: { status: ContributionStatus.PENDING_VALIDATION, associationId } }),
      this.prisma.project.count({ where: { status: ProjectStatus.IN_PROGRESS, associationId } }),
      this.prisma.contribution.aggregate({
        where: { status: ContributionStatus.VALIDATED, associationId },
        _sum: { amount: true },
      }),
    ]);

    // 🔒 On récupère UNIQUEMENT les antennes de cette association
    const allAntennas = await this.prisma.antenna.findMany({
      where: { associationId },
      select: { id: true, name: true, defaultCurrency: true }
    });

    const antennaBalances = await Promise.all(
      allAntennas.map(async (ant) => {
        // 🔒 Cloisonnement des cotisations par antenne ET par association
        const inAgg = await this.prisma.contribution.aggregate({
          where: { antennaId: ant.id, associationId, status: ContributionStatus.VALIDATED },
          _sum: { amount: true }
        });
        
        // 🔒 Cloisonnement des dépenses par antenne ET par association
        const outAgg = await this.prisma.expense.aggregate({
          where: { antennaId: ant.id, associationId, status: ExpenseStatus.VALIDATED },
          _sum: { amount: true }
        });

        const totalIn = Number(inAgg._sum.amount ?? 0);
        const totalOut = Number(outAgg._sum.amount ?? 0);

        return {
          id: ant.id,
          name: ant.name,
          balance: totalIn - totalOut,
          currency: ant.defaultCurrency || 'GNF'
        };
      })
    );

    const recentPendingAccounts = await this.prisma.user.findMany({
      where: { status: UserStatus.PENDING_APPROVAL, associationId }, // 🔒 Cloisonné
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
      where: { associationId }, // 🔒 Cloisonné
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
      where: { associationId }, // 🔒 Cloisonné
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
        associations: associationsCount, // Affichera 1 (sa propre association)
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

  // 💉 Injection de l'associationId ici aussi
  async listAntennas(associationId: string, page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    return this.prisma.antenna.findMany({
      where: {
        associationId, // 🔒 Cloisonné
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {})
      },
      skip,
      take: pageSize,
      include: { association: true },
    });
  }

  // 💉 Injection de l'associationId ici aussi
  async listAntennaAdmins(associationId: string, page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    return this.prisma.user.findMany({
      where: {
        associationId, // 🔒 Cloisonné
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