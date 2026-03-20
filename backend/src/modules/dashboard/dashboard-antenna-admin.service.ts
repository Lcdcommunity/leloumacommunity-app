//backend/src/modules/dashboard/dashboard-antenna-admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, ContributionStatus, ProjectStatus } from '@prisma/client';

@Injectable()
export class DashboardAntennaAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(adminUserId: string) {
    // 1. Identifier l'antenne de l'admin
    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId },
      include: { antenna: true },
    });

    if (!assignment) throw new NotFoundException("Aucune antenne assignée à ce compte.");
    const antennaId = assignment.antennaId;
    const associationId = assignment.antenna.associationId; // Nécessaire pour la vue globale

    // 2. Calcul des statistiques locales de SON antenne
    const [members, pendingAcc, pendingCont, projects, totalAmount] = await Promise.all([
      this.prisma.membership.count({ where: { antennaId, user: { status: UserStatus.ACTIVE } } }),
      this.prisma.membership.count({ where: { antennaId, user: { status: UserStatus.PENDING_APPROVAL } } }),
      this.prisma.contribution.count({ where: { antennaId, status: ContributionStatus.PENDING_VALIDATION } }),
      this.prisma.project.count({ where: { antennaId, status: ProjectStatus.IN_PROGRESS } }),
      this.prisma.contribution.aggregate({
        where: { antennaId, status: ContributionStatus.VALIDATED },
        _sum: { amount: true },
      }),
    ]);

    // 👇 3. AJOUT CHIRURGICAL : Calcul des soldes de TOUTES les antennes (Transparence)
    const allAntennas = await this.prisma.antenna.findMany({
      where: { associationId, isActive: true },
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

    return {
      antennaName: assignment.antenna.name,
      stats: {
        members,
        pendingApprovals: pendingAcc,
        pendingContributions: pendingCont,
        activeProjects: projects,
        totalValidatedAmount: Number(totalAmount._sum.amount ?? 0),
        currency: assignment.antenna.defaultCurrency || 'GNF',
      },
      // 👇 Injection du tableau global pour les cartes de devises sur le front
      antennaBalances, 
      recentPendingAccounts: await this.prisma.user.findMany({
        where: { memberships: { some: { antennaId } }, status: UserStatus.PENDING_APPROVAL },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true }
      }),
    };
  }
}