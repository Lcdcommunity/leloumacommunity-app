// backend/src/modules/projects/projects.service.ts
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

    await this.notifications.notifyAntennaAdmins(
      antennaId,
      associationId,
      `Nouvelle proposition : "${proposal.title}" soumise par ${proposal.author.firstName}.`,
      NotificationType.PROJECT_PROPOSAL_SUBMITTED,
      { proposalId: proposal.id }
    );

    return proposal;
  }

  async approveProposal(proposalId: string, associationId: string, adminId: string, reviewComment?: string) {
    const proposal = await this.prisma.projectProposal.findUnique({
      where: { id: proposalId, associationId },
    });

    if (!proposal) throw new NotFoundException("Proposition introuvable ou vous n'avez pas les droits.");

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.projectProposal.update({
        where: { id: proposalId }, 
        data: {
          status: ProposalStatus.APPROVED,
          reviewedByUserId: adminId,
          reviewedAt: new Date(),
          reviewComment,
        },
      });

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

      await this.notifications.createForUser({
        associationId: proposal.associationId,
        userId: proposal.authorUserId,
        message: `Félicitations ! Votre projet "${proposal.title}" a été approuvé.`,
        type: NotificationType.PROJECT_PROPOSAL_APPROVED,
      });

      return { proposal: updated, project };
    });
  }

  async rejectProposal(proposalId: string, associationId: string, adminId: string, reviewComment: string) {
    const proposal = await this.prisma.projectProposal.findUnique({
      where: { id: proposalId, associationId },
    });

    if (!proposal) throw new NotFoundException("Proposition introuvable ou vous n'avez pas les droits.");

    const updated = await this.prisma.projectProposal.update({
      where: { id: proposalId },
      data: {
        status: ProposalStatus.REJECTED,
        reviewedByUserId: adminId,
        reviewedAt: new Date(),
        reviewComment,
      },
    });

    await this.notifications.createForUser({
      associationId: proposal.associationId,
      userId: proposal.authorUserId,
      message: `Votre projet "${proposal.title}" a été refusé. Motif : ${reviewComment}`,
      type: NotificationType.PROJECT_PROPOSAL_REJECTED,
    });

    return updated;
  }

  // ─── GESTION DES PROJETS (ADMIN / SUPER-ADMIN / MEMBER) ───────────────

  async listProjects(params: { associationId: string; antennaId?: string; q?: string; status?: ProjectStatus; page: number; pageSize: number }) {
    const skip = (params.page - 1) * params.pageSize;
    
    const where: Prisma.ProjectWhereInput = {
      associationId: params.associationId,
      ...(params.status ? { status: params.status } : {}),
    };

    const andConditions: Prisma.ProjectWhereInput[] = [];

    // 🔥 CORRECTION : Règle de visibilité partagée
    if (params.antennaId) {
      andConditions.push({
        OR: [
          { antennaId: params.antennaId },
          { status: { notIn: [ProjectStatus.PROPOSED, ProjectStatus.UNDER_REVIEW] } }
        ]
      });
    }

    if (params.q) {
      andConditions.push({
        OR: [
          { title: { contains: params.q, mode: 'insensitive' } },
          { description: { contains: params.q, mode: 'insensitive' } }
        ]
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

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

    await this.notifications.notifySuperAdmins(
      associationId,
      `Un nouveau projet officiel "${project.title}" a été lancé.`,
      NotificationType.PROJECT_CREATED
    );

    return project;
  }

  async deleteProject(id: string, associationId: string) {
    const project = await this.prisma.project.findUnique({ where: { id, associationId } });
    if (!project) throw new NotFoundException("Projet introuvable ou vous n'avez pas les droits de le supprimer.");
    return this.prisma.project.delete({ where: { id } });
  }
}