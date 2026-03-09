// backend/src/modules/admin/admin.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, ContributionStatus, ProjectStatus, PostStatus, Prisma, UserRole, ProposalStatus } from '@prisma/client';
import { memberMapper } from '../member/member.mapper';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper privé pour récupérer l'ID de l'antenne assignée à l'administrateur
   */
  private async getAdminAntennaId(adminId: string) {
    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId: adminId },
    });
    if (!assignment) throw new ForbiddenException("Vous n'avez aucune antenne assignée.");
    return assignment.antennaId;
  }

  // --- GESTION DES MEMBRES (APPROBATIONS) ---

  async listPendingApprovals(adminId: string, page: number, pageSize: number) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;
    const where: any = { status: UserStatus.PENDING_APPROVAL, role: UserRole.MEMBER, memberships: { some: { antennaId } } };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' }, 
        include: { memberships: { include: { antenna: true } } } 
      }),
      this.prisma.user.count({ where }),
    ]);

    return { 
      items: items.map(u => memberMapper.userSummary(u)), 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize) 
    };
  }

  async approveMember(userId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const user = await this.prisma.user.findFirst({ where: { id: userId, role: UserRole.MEMBER as any, memberships: { some: { antennaId } } } });
    if (!user) throw new NotFoundException("Membre introuvable.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.ACTIVE, approvedByUserId: adminId, approvedAt: new Date() } 
    });
  }

  async rejectMember(userId: string, adminId: string, reason: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const user = await this.prisma.user.findFirst({ where: { id: userId, role: UserRole.MEMBER as any, memberships: { some: { antennaId } } } });
    if (!user) throw new NotFoundException("Membre introuvable.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.REJECTED, rejectedByUserId: adminId, rejectedAt: new Date(), rejectionReason: reason } 
    });
  }

  async listMembers(adminId: string, page: number, pageSize: number, q?: string, status?: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput | any = { 
      memberships: { some: { antennaId } },
      role: UserRole.MEMBER,
      ...(status ? { status: status as UserStatus } : {}) 
    };

    if (q) { 
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } }, 
        { lastName: { contains: q, mode: 'insensitive' } }, 
        { email: { contains: q, mode: 'insensitive' } }
      ]; 
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: pageSize, orderBy: { lastName: 'asc' } }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map(u => memberMapper.userSummary(u)), total, page, pageSize };
  }

  async exportMembers(adminId: string): Promise<string> {
    const antennaId = await this.getAdminAntennaId(adminId);
    const members = await this.prisma.user.findMany({ 
      where: { memberships: { some: { antennaId } }, role: UserRole.MEMBER as any }, 
      orderBy: { lastName: 'asc' } 
    });

    const header = "Nom;Prenom;Email;Statut;Date d'inscription\n";
    const rows = members.map(m => `${m.lastName};${m.firstName};${m.email};${m.status};${m.createdAt.toISOString()}`).join('\n');
    return header + rows;
  }

  async listLateMembers(adminId: string, page: number, pageSize: number) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;

    const where: any = { memberships: { some: { antennaId } }, status: UserStatus.ACTIVE, role: UserRole.MEMBER };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: pageSize, orderBy: { lastName: 'asc' } }),
      this.prisma.user.count({ where }),
    ]);

    return { 
      items: items.map(u => ({
        ...memberMapper.userSummary(u),
        delayMonths: 3,
        lastContributionDate: null 
      })), 
      total, 
      page, 
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  // --- GESTION DES COTISATIONS ---

  async listContributions(adminId: string, page: number, pageSize: number, status?: string, q?: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;

    let contributionStatus: ContributionStatus | undefined = undefined;
    if (status) {
      contributionStatus = status === 'PENDING' ? ContributionStatus.PENDING_VALIDATION : (status as ContributionStatus);
    }

    const where: Prisma.ContributionWhereInput = { antennaId, ...(contributionStatus ? { status: contributionStatus } : {}) };
    if (q) { 
      where.OR = [
        { externalReference: { contains: q, mode: 'insensitive' } }, 
        { member: { lastName: { contains: q, mode: 'insensitive' } } }
      ]; 
    }

    const [items, total] = await Promise.all([
      this.prisma.contribution.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { member: true } }),
      this.prisma.contribution.count({ where }),
    ]);

    return {
      items: items.map(c => ({ 
        ...memberMapper.contribution(c), 
        memberName: c.member ? `${c.member.firstName} ${c.member.lastName}` : 'Inconnu' 
      })),
      total, page, pageSize
    };
  }

  // 👇 MISE A JOUR LOGIQUE DE VALIDATION (CARTE MEMBRE)
  async validateContribution(contributionId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { id: contributionId, antennaId },
      include: { member: true } 
    });
    
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    // 1. Valider la cotisation
    const updated = await this.prisma.contribution.update({ 
      where: { id: contributionId }, 
      data: { status: ContributionStatus.VALIDATED, validatedAt: new Date(), validatedByUserId: adminId } 
    });

    // 2. LOGIQUE CARTE MEMBRE : Si le motif est la carte membre
    if (contribution.purpose === 'MEMBERSHIP_CARD') {
      const now = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(now.getFullYear() + 1);

      // Générer un numéro de carte unique (ex: LCD-2026-XXXX)
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const cardNumber = `LCD-${now.getFullYear()}-${randomSuffix}`;

      // Upsert (Créer ou Mettre à jour et déverrouiller) la carte du membre
      await this.prisma.virtualCard.upsert({
        where: { userId: contribution.memberUserId },
        create: {
          userId: contribution.memberUserId,
          cardNumber: cardNumber,
          issuedAt: now,
          expiresAt: nextYear,
          isLocked: false,
        },
        update: {
          issuedAt: now,
          expiresAt: nextYear,
          isLocked: false,
        }
      });
    }

    return updated;
  }

  async rejectContribution(contributionId: string, adminId: string, reason: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const contribution = await this.prisma.contribution.findFirst({ where: { id: contributionId, antennaId } });
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    return this.prisma.contribution.update({ 
      where: { id: contributionId }, 
      data: { status: ContributionStatus.REJECTED, rejectionReason: reason, validatedAt: new Date(), validatedByUserId: adminId } 
    });
  }

  async updateContribution(contributionId: string, adminId: string, amount: number) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const contribution = await this.prisma.contribution.findFirst({ where: { id: contributionId, antennaId } });
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    return this.prisma.contribution.update({ 
      where: { id: contributionId }, 
      data: { amount: new Prisma.Decimal(amount) } 
    });
  }

  // --- GESTION DES PROJETS ET PROPOSITIONS ---

  async listProjects(adminId: string, page: number, pageSize: number, status?: string, q?: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProjectWhereInput = { antennaId, ...(status ? { status: status as ProjectStatus } : {}) };
    if (q) { 
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } }, 
        { description: { contains: q, mode: 'insensitive' } }
      ]; 
    }

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.project.count({ where }),
    ]);

    return { 
      items: items.map(p => memberMapper.project(p)), 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize) 
    };
  }

  // 👇 NOUVEAU : Récupération des propositions de projets (demandé tout à l'heure)
  async listProjectProposals(adminId: string, page: number, pageSize: number, status?: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;
    
    const where: Prisma.ProjectProposalWhereInput = { 
      antennaId, 
      ...(status ? { status: status as ProposalStatus } : {}) 
    };

    const [items, total] = await Promise.all([
      this.prisma.projectProposal.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' },
        include: { author: true }
      }),
      this.prisma.projectProposal.count({ where }),
    ]);

    return { 
      items: items.map(p => ({
        ...memberMapper.projectProposal(p),
        authorName: p.author ? `${p.author.firstName} ${p.author.lastName}` : 'Inconnu',
        estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null
      })), 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize) 
    };
  }

  async createProject(adminId: string, data: any) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const antenna = await this.prisma.antenna.findUnique({ where: { id: antennaId }, select: { associationId: true } });

    if (!antenna?.associationId) throw new BadRequestException("Antenne non rattachée à une association.");

    let safeStatus = undefined;
    if (data.status && Object.values(ProjectStatus).includes(data.status)) {
      safeStatus = data.status as ProjectStatus;
    }

    return this.prisma.project.create({
      data: { 
        title: data.title,
        description: data.description,
        ...(safeStatus ? { status: safeStatus } : {}),
        startDate: data.startsAt ? new Date(data.startsAt) : null,
        endDate: data.endsAt ? new Date(data.endsAt) : null,
        antennaId, 
        associationId: antenna.associationId, 
        budgetAmount: data.budgetPlanned ? new Prisma.Decimal(data.budgetPlanned) : null, 
        amountSpent: data.budgetSpent ? new Prisma.Decimal(data.budgetSpent) : new Prisma.Decimal(0),

        ...(data.photoIds && data.photoIds.length > 0 ? {
          attachments: {
            create: data.photoIds.map((fileId: string) => ({
              fileId: fileId
            }))
          }
        } : {})
      }
    });
  }

  async updateProject(projectId: string, adminId: string, data: any) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, antennaId } });
    if (!project) throw new NotFoundException("Projet introuvable.");

    let safeStatus = undefined;
    if (data.status && Object.values(ProjectStatus).includes(data.status)) {
      safeStatus = data.status as ProjectStatus;
    }

    return this.prisma.project.update({ 
      where: { id: projectId }, 
      data: { 
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(safeStatus ? { status: safeStatus } : {}),
        ...(data.startsAt !== undefined ? { startDate: data.startsAt ? new Date(data.startsAt) : null } : {}),
        ...(data.endsAt !== undefined ? { endDate: data.endsAt ? new Date(data.endsAt) : null } : {}),
        ...(data.budgetPlanned !== undefined ? { budgetAmount: data.budgetPlanned ? new Prisma.Decimal(data.budgetPlanned) : null } : {}),
        ...(data.budgetSpent !== undefined ? { amountSpent: data.budgetSpent ? new Prisma.Decimal(data.budgetSpent) : null } : {}),

        ...(data.photoIds && data.photoIds.length > 0 ? {
          attachments: {
            create: data.photoIds.map((fileId: string) => ({
              fileId: fileId
            }))
          }
        } : {})
      } 
    });
  }

  async deleteProject(projectId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, antennaId } });
    if (!project) throw new NotFoundException("Projet introuvable.");
    return this.prisma.project.delete({ where: { id: projectId } });
  }

  // --- GESTION DES DOCUMENTS ---

  async listDocuments(adminId: string, page: number, pageSize: number, q?: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;

    const where: Prisma.DocumentWhereInput = {
      antennaId,
      ...(q ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { file: true },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map(d => memberMapper.documentItem(d)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createDocument(adminId: string, data: any) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const antenna = await this.prisma.antenna.findUnique({
      where: { id: antennaId },
      select: { associationId: true }
    });

    if (!antenna?.associationId) throw new BadRequestException("Antenne non rattachée.");

    return this.prisma.document.create({
      data: {
        title: data.title,
        description: data.description,
        fileId: data.fileId as string,
        antennaId: antennaId as string,
        associationId: antenna.associationId as string,
        uploadedByUserId: adminId as string, 
        publishedAt: new Date(),
      },
    });
  }

  async deleteDocument(documentId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);

    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, antennaId },
    });

    if (!doc) throw new NotFoundException("Document introuvable.");

    return this.prisma.document.delete({
      where: { id: documentId },
    });
  }

  // --- GESTION DES CONTENUS (INFORMATIONS / NEWS) ---

  async listContents(adminId: string, page: number, pageSize: number, q?: string, status?: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;

    const where: Prisma.NewsPostWhereInput = {
      antennaId,
      ...(status ? { status: status as PostStatus } : {}),
    };

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.newsPost.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.newsPost.count({ where }),
    ]);

    return {
      items: items.map(c => memberMapper.contentPost({ ...c, body: c.content })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createContent(adminId: string, data: any) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const antenna = await this.prisma.antenna.findUnique({
      where: { id: antennaId },
      select: { associationId: true }
    });

    if (!antenna?.associationId) throw new BadRequestException("Antenne non rattachée à une association.");

    return this.prisma.newsPost.create({
      data: {
        title: data.title,
        content: data.content || data.body || '',
        status: data.status || PostStatus.DRAFT,
        coverImageFileId: data.coverImageFileId,
        antennaId: antennaId as string,
        associationId: antenna.associationId as string,
        createdByUserId: adminId as string,
        scope: 'ANTENNA',
        ...(data.status === PostStatus.PUBLISHED ? { publishedAt: new Date(), publishedByUserId: adminId } : {})
      },
    });
  }

  async updateContent(contentId: string, adminId: string, data: any) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const post = await this.prisma.newsPost.findFirst({ where: { id: contentId, antennaId } });

    if (!post) throw new NotFoundException("Contenu introuvable.");

    const isPublishing = data.status === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED;

    return this.prisma.newsPost.update({
      where: { id: contentId },
      data: {
        title: data.title,
        content: data.content !== undefined ? data.content : data.body,
        status: data.status,
        coverImageFileId: data.coverImageFileId,
        ...(isPublishing ? { publishedAt: new Date(), publishedByUserId: adminId } : {})
      },
    });
  }

  async deleteContent(contentId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const post = await this.prisma.newsPost.findFirst({ where: { id: contentId, antennaId } });

    if (!post) throw new NotFoundException("Contenu introuvable.");

    return this.prisma.newsPost.delete({ where: { id: contentId } });
  }

  // --- NOTIFICATIONS ---
  async listNotifications(adminId: string, page: number, pageSize: number) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = { antennaId };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);

    return { 
      items: items.map(n => memberMapper.notification({ ...n, isRead: false })), 
      total, 
      page, 
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }
}