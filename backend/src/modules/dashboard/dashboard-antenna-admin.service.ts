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

    // 2. Calcul des statistiques locales
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

    return {
      antennaName: assignment.antenna.name,
      stats: {
        members,
        pendingApprovals: pendingAcc,
        pendingContributions: pendingCont,
        activeProjects: projects,
        totalValidatedAmount: Number(totalAmount._sum.amount ?? 0),
      },
      recentPendingAccounts: await this.prisma.user.findMany({
        where: { memberships: { some: { antennaId } }, status: UserStatus.PENDING_APPROVAL },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true }
      }),
    };
  }
}