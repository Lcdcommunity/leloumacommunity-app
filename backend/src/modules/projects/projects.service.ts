//backend/src/modules/projects/projects.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { 
  ProjectStatus, 
  ProposalStatus, 
  NotificationType, 
  Prisma, 
  UserRole 
} from '@prisma/client';
import { memberMapper } from '../member/member.mapper';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── PROPOSITIONS (MEMBRES) ─────────────────────────────────────────

  async submitProposal(userId: string, associationId: string, antennaId: string, data: any) {
    const proposal = await this.prisma.projectProposal.create({
      data: {
        title: data.title,
        description: data.description,
        estimatedBudget: data.estimatedBudget ? new Prisma.Decimal(data.estimatedBudget) : null,
        authorUserId: userId,
        associationId,
        antennaId,
        status: ProposalStatus.SUBMITTED,
      },
      include: { author: true }
    });

    // ✅ NOTIFICATION : Informer les admins de l'antenne
    await this.notifications.notifyAntennaAdmins(
      antennaId,
      associationId,
      `Nouvelle proposition : "${proposal.title}" soumise par ${proposal.author.firstName}.`,
      NotificationType.PROJECT_PROPOSAL_SUBMITTED,
      { proposalId: proposal.id }
    );

    return proposal;
  }

  async approveProposal(proposalId: string, adminId: string, reviewComment?: string) {
    const proposal = await this.prisma.projectProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) throw new NotFoundException("Proposition introuvable.");

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Proposition
      const updated = await tx.projectProposal.update({
        where: { id: proposalId },
        data: {
          status: ProposalStatus.APPROVED,
          reviewedByUserId: adminId,
          reviewedAt: new Date(),
          reviewComment,
        },
      });

      // 2. Créer le projet réel
      const project = await tx.project.create({
        data: {
          associationId: proposal.associationId,
          antennaId: proposal.antennaId,
          title: proposal.title,
          description: proposal.description,
          budgetAmount: proposal.estimatedBudget,
          status: ProjectStatus.APPROVED,
          sourceProposalId: proposal.id,
          createdByUserId: adminId,
        },
      });

      // 3. Notifier l'auteur
      await this.notifications.createForUser({
        associationId: proposal.associationId,
        userId: proposal.authorUserId,
        message: `Félicitations ! Votre projet "${proposal.title}" a été approuvé.`,
        type: NotificationType.PROJECT_PROPOSAL_APPROVED,
      });

      return { proposal: updated, project };
    });
  }

  async rejectProposal(proposalId: string, adminId: string, reviewComment: string) {
    const proposal = await this.prisma.projectProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) throw new NotFoundException("Proposition introuvable.");

    const updated = await this.prisma.projectProposal.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.REJECTED,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
        reviewComment,
      },
    });

    // ✅ NOTIFICATION : Informer le membre
    await this.notifications.createForUser({
      associationId: proposal.associationId,
      userId: proposal.authorUserId,
      message: `Votre projet "${proposal.title}" a été refusé. Motif : ${reviewComment}`,
      type: NotificationType.PROJECT_PROPOSAL_REJECTED,
    });

    return updated;
  }

  // ─── GESTION DES PROJETS (ADMIN / SUPER-ADMIN) ──────────────────────

  async listProjects(params: { associationId: string; antennaId?: string; q?: string; status?: ProjectStatus; page: number; pageSize: number }) {
    const skip = (params.page - 1) * params.pageSize;
    const where: Prisma.ProjectWhereInput = {
      associationId: params.associationId,
      ...(params.antennaId ? { antennaId: params.antennaId } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.q ? { title: { contains: params.q, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: params.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { antenna: true, attachments: { include: { file: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: items.map(p => memberMapper.project(p)),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async createProject(adminId: string, associationId: string, antennaId: string, data: any) {
    const project = await this.prisma.project.create({
      data: {
        ...data,
        associationId,
        antennaId,
        createdByUserId: adminId,
        status: data.status || ProjectStatus.APPROVED,
      },
    });

    // ✅ NOTIFICATION : Informer le Super Admin
    await this.notifications.notifySuperAdmins(
      associationId,
      `Un nouveau projet officiel "${project.title}" a été lancé.`,
      NotificationType.PROJECT_CREATED
    );

    return project;
  }

  async deleteProject(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException("Projet introuvable.");
    return this.prisma.project.delete({ where: { id } });
  }
}