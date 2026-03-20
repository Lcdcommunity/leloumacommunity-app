//backend/src/modules/dashboard/dashboard-super-admin.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, ContributionStatus, ProjectStatus, UserStatus } from '@prisma/client';

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

    // 👇 AJOUT CHIRURGICAL : Récupération des soldes de toutes les antennes pour les cartes dynamiques
    const allAntennas = await this.prisma.antenna.findMany({
      where: { isActive: true },
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
      antennaBalances, // <-- INJECTION DU TABLEAU DES SOLDES
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