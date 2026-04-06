// backend/src/modules/admin/admin.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, ContributionStatus, ProjectStatus, PostStatus, Prisma, UserRole, ProposalStatus, NotificationType } from '@prisma/client';
import { memberMapper } from '../member/member.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs';
import { CreateMemberDto } from './dto/create-member.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Helper privé pour récupérer le contexte complet (Antenne + Association)
   */
  private async getAdminContext(adminId: string) {
    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId: adminId, isActive: true },
      include: { antenna: true }
    });
    if (!assignment || !assignment.antenna) {
      throw new ForbiddenException("Vous n'avez aucune antenne active assignée.");
    }
    return {
      antennaId: assignment.antennaId,
      associationId: assignment.antenna.associationId
    };
  }

  // --- GESTION DES MEMBRES (APPROBATIONS) ---

  async listPendingApprovals(adminId: string, page: number, pageSize: number) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = { 
      status: UserStatus.PENDING_APPROVAL, 
      role: UserRole.MEMBER, 
      memberships: { some: { antennaId } } 
    };

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
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, associationId, memberships: { some: { antennaId } } } 
    });
    if (!user) throw new NotFoundException("Membre introuvable dans votre antenne.");

    const updated = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.ACTIVE, approvedByUserId: adminId, approvedAt: new Date() } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.id,
      message: `Félicitations ! Votre compte a été approuvé par l'administrateur de l'antenne.`,
      type: NotificationType.ACCOUNT_APPROVED,
      title: 'Compte activé',
    });

    return updated;
  }

  async rejectMember(userId: string, adminId: string, reason: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, associationId, memberships: { some: { antennaId } } } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    const updated = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.REJECTED, rejectedByUserId: adminId, rejectedAt: new Date(), rejectionReason: reason } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.id,
      message: `Votre demande d'adhésion a été rejetée. Motif : ${reason}`,
      type: NotificationType.ACCOUNT_REJECTED,
      title: 'Demande refusée',
    });

    return updated;
  }

  async listMembers(adminId: string, page: number, pageSize: number, q?: string, status?: string) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.UserWhereInput = { 
      memberships: { some: { antennaId } },
      role: UserRole.MEMBER,
      ...(status ? { status: status as UserStatus } : { NOT: { status: UserStatus.DELETED } }) 
    };

    if (q) { 
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } }, 
        { lastName: { contains: q, mode: 'insensitive' } }, 
        { email: { contains: q, mode: 'insensitive' } }
      ]; 
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { lastName: 'asc' },
        include: { virtualCard: true }
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: items.map(u => memberMapper.userSummary(u)), total, page, pageSize };
  }

  async exportMembers(adminId: string): Promise<string> {
    const { antennaId } = await this.getAdminContext(adminId);
    const members = await this.prisma.user.findMany({ 
      where: { memberships: { some: { antennaId } }, role: UserRole.MEMBER }, 
      orderBy: { lastName: 'asc' } 
    });

    const header = "Nom;Prenom;Email;Statut;Date d'inscription\n";
    const rows = members.map(m => `${m.lastName};${m.firstName};${m.email};${m.status};${m.createdAt.toISOString()}`).join('\n');
    return header + rows;
  }

  async listLateMembers(adminId: string, page: number, pageSize: number) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    
    const users = await this.prisma.user.findMany({ 
      where: { 
        memberships: { some: { antennaId } }, 
        associationId,
        status: UserStatus.ACTIVE, 
        role: UserRole.MEMBER 
      },
      orderBy: { lastName: 'asc' },
      include: {
        contributions: {
          where: { status: ContributionStatus.VALIDATED },
          orderBy: { validatedAt: 'desc' },
          take: 1
        }
      }
    });

    const lateMembers = [];
    const now = new Date();

    for (const u of users) {
      const lastContrib = u.contributions[0];
      const referenceDate = lastContrib?.validatedAt || u.approvedAt || u.createdAt;
      const diffTime = now.getTime() - referenceDate.getTime();
      const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));

      if (diffMonths >= 3) {
        lateMembers.push({
          ...memberMapper.userSummary(u),
          lateMonths: diffMonths,
          lastValidatedContributionAt: lastContrib ? lastContrib.validatedAt : null
        });
      }
    }

    const skip = (page - 1) * pageSize;
    const paginatedItems = lateMembers.slice(skip, skip + pageSize);

    return { 
      items: paginatedItems, 
      total: lateMembers.length, 
      page, 
      pageSize,
      totalPages: Math.ceil(lateMembers.length / pageSize)
    };
  }

  // 🔥 CRÉATION DE MEMBRE SANS "originVillage" PUISQU'IL N'EST PAS DANS LE SCHEMA
  async createMember(adminId: string, data: CreateMemberDto) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    
    // Vérifier si l'email existe déjà
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException("Cet email est déjà utilisé.");
    }

    // Mot de passe temporaire
    const defaultPassword = "lcd" + Math.floor(10000 + Math.random() * 90000).toString();
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        city: data.city,
        country: data.country,
        originSubPrefecture: data.originSubPrefecture,
        // originVillage retiré car inexistant dans ton schema.prisma
        professionalStatus: data.professionalStatus,
        function: data.function,
        role: UserRole.MEMBER,
        status: UserStatus.ACTIVE, // 🔥 ACTIF IMMÉDIATEMENT
        associationId,
        createdByUserId: adminId,
        approvedByUserId: adminId,
        approvedAt: new Date(),
        emailVerifiedAt: new Date(), // Simule un email vérifié
        memberships: {
          create: {
            antennaId,
            associationId,
            status: 'APPROVED',
            isPrimary: true,
            joinedAt: new Date(),
            approvedByUserId: adminId,
            approvedAt: new Date(),
          }
        }
      }
    });

    return { 
      message: "Membre créé avec succès.",
      user: memberMapper.userSummary(newUser),
      temporaryPassword: defaultPassword
    };
  }

  async suspendUser(userId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, associationId, memberships: { some: { antennaId } } } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    const updated = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.SUSPENDED, suspendedByUserId: adminId, suspendedAt: new Date() } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.id,
      message: `Votre compte membre a été suspendu par l'administration de l'antenne.`,
      type: NotificationType.ACCOUNT_SUSPENDED,
      title: 'Compte suspendu',
    });

    return updated;
  }

  async activateUser(userId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, associationId, memberships: { some: { antennaId } } } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    const updated = await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.ACTIVE, suspendedByUserId: null, suspendedAt: null } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.id,
      message: `Votre compte membre a été réactivé. Vous pouvez à nouveau accéder à tous les services.`,
      type: NotificationType.ACCOUNT_APPROVED,
    });

    return updated;
  }

  async deleteUser(userId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, associationId, memberships: { some: { antennaId } } } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.DELETED, deletedByUserId: adminId, deletedAt: new Date() } 
    });
  }

  // 🔥 MISE À JOUR SANS "originVillage" PUISQU'IL N'EST PAS DANS LE SCHEMA
  async updateAntennaMember(userId: string, adminId: string, data: any) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, associationId, memberships: { some: { antennaId } } } 
    });

    if (!user) throw new NotFoundException("Membre introuvable dans votre antenne.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { 
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
        ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 } : {}),
        ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 } : {}),
        ...(data.originSubPrefecture !== undefined ? { originSubPrefecture: data.originSubPrefecture } : {}),
      } 
    });
  }

  // --- GESTION DES COTISATIONS ---

  async listContributions(adminId: string, page: number, pageSize: number, status?: string, q?: string) {
    const { antennaId } = await this.getAdminContext(adminId);
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
      this.prisma.contribution.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' }, 
        include: { 
          member: true,
          submitter: { select: { firstName: true, lastName: true } }
        } 
      }),
      this.prisma.contribution.count({ where }),
    ]);

    return {
      items: items.map(c => ({ 
        ...memberMapper.contribution(c),
        member: c.member ? {
          id: c.member.id,
          firstName: c.member.firstName,
          lastName: c.member.lastName,
          email: c.member.email,
          phone: c.member.phone
        } : null,
        memberName: c.member ? `${c.member.firstName} ${c.member.lastName}` : 'Inconnu' 
      })),
      total, page, pageSize
    };
  }

  async validateContribution(contributionId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { id: contributionId, antennaId, associationId },
      include: { member: true } 
    });

    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    const updated = await this.prisma.contribution.update({ 
      where: { id: contributionId }, 
      data: { status: ContributionStatus.VALIDATED, validatedAt: new Date(), validatedByUserId: adminId } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: contribution.memberUserId,
      message: `Votre versement de ${contribution.amount} ${contribution.currency} a été validé.`,
      type: NotificationType.CONTRIBUTION_VALIDATED,
    });

    if (contribution.purpose === 'MEMBERSHIP_CARD') {
      const now = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(now.getFullYear() + 1);

      await this.prisma.virtualCard.upsert({
        where: { userId: contribution.memberUserId },
        create: {
          userId: contribution.memberUserId,
          cardNumber: `LCD-${now.getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
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

      await this.notifications.createForUser({
        associationId,
        userId: contribution.memberUserId,
        message: `Votre carte membre virtuelle a été générée et activée !`,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Carte membre active',
      });
    }

    return updated;
  }

  async rejectContribution(contributionId: string, adminId: string, reason: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const contribution = await this.prisma.contribution.findFirst({ where: { id: contributionId, antennaId, associationId } });
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    const updated = await this.prisma.contribution.update({ 
      where: { id: contributionId }, 
      data: { status: ContributionStatus.REJECTED, rejectionReason: reason, validatedAt: new Date(), validatedByUserId: adminId } 
    });

    await this.notifications.createForUser({
      associationId,
      userId: updated.memberUserId,
      message: `Votre versement de ${updated.amount} ${updated.currency} a été refusé. Motif : ${reason}`,
      type: NotificationType.CONTRIBUTION_REJECTED,
    });

    return updated;
  }

  async updateContribution(contributionId: string, adminId: string, amount: number) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const contribution = await this.prisma.contribution.findFirst({ where: { id: contributionId, antennaId, associationId } });
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    return this.prisma.contribution.update({ 
      where: { id: contributionId }, 
      data: { amount: new Prisma.Decimal(amount) } 
    });
  }

  async deleteContribution(contributionId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const contribution = await this.prisma.contribution.findFirst({ where: { id: contributionId, antennaId, associationId } });
    if (!contribution) throw new NotFoundException("Cotisation introuvable.");
    return this.prisma.contribution.delete({ where: { id: contributionId } });
  }

  // --- GESTION DES PROJETS ET PROPOSITIONS ---

  async listProjects(adminId: string, page: number, pageSize: number, status?: string, q?: string) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProjectWhereInput = { antennaId, ...(status ? { status: status as ProjectStatus } : {}) };
    if (q) { 
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } }, 
        { description: { contains: q, mode: 'insensitive' } }
      ]; 
    }
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' },
        include: { attachments: { include: { file: true } } }
      }),
      this.prisma.project.count({ where }),
    ]);

    return { 
      items: items.map(p => {
        const mappedProject = memberMapper.project(p);
        return {
          ...mappedProject,
          attachments: p.attachments?.map(a => ({
            id: a.file.id,
            url: a.file.url
          })) || []
        };
      }), 
      total, 
      page, 
      pageSize, 
      totalPages: Math.ceil(total / pageSize) 
    };
  }

  async exportProjectPdf(projectId: string, adminId: string): Promise<Buffer> {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, antennaId, associationId },
      include: { attachments: { include: { file: true } } }
    });

    if (!project) throw new NotFoundException("Projet introuvable.");

    const PDFDocument = require('pdfkit');

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const addSection = (title: string, content: string | null | undefined) => {
          if (!content) return;
          doc.moveDown();
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#1D4ED8').text(title);
          doc.moveDown(0.5);
          doc.fontSize(11).font('Helvetica').fillColor('#374151').text(content, { align: 'justify' });
        };

        const safeStringify = (val: any) => typeof val === 'string' ? val : JSON.stringify(val, null, 2);

        doc.fontSize(24).font('Helvetica-Bold').fillColor('#0F172A').text(project.title, { align: 'center' });
        doc.moveDown();

        doc.fontSize(12).font('Helvetica').fillColor('#6B7280');
        if (project.promoterName) doc.text(`Promoteur: ${project.promoterName}`, { align: 'center' });
        if (project.locationText) doc.text(`Localisation: ${project.locationText}`, { align: 'center' });
        doc.text(`Statut: ${project.status}`, { align: 'center' });
        doc.moveDown(2);

        addSection('Résumé', project.summary);
        addSection('Description Complète', project.description);
        addSection('Bénéficiaires Cibles', project.targetBeneficiaries);
        addSection('Impact sur la Population', project.populationImpact);
        addSection('Impact Environnemental', project.environmentalImpact);

        if (project.specificObjectives) addSection('Objectifs Spécifiques', safeStringify(project.specificObjectives));
        if (project.expectedResults) addSection('Résultats Attendus', safeStringify(project.expectedResults));
        if (project.successIndicators) addSection('Indicateurs de Succès', safeStringify(project.successIndicators));

        addSection('Méthode d\'Implémentation', project.implementationMethod);
        addSection('Risques et Mitigations', project.risksAndMitigation);

        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1D4ED8').text('Budget & Exécution');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#374151');
        doc.text(`Budget Prévu: ${project.budgetAmount ? project.budgetAmount.toString() : 'Non défini'}`);
        doc.text(`Budget Dépensé: ${project.amountSpent ? project.amountSpent.toString() : '0'}`);
        if (project.startDate) doc.text(`Date de début: ${project.startDate.toLocaleDateString('fr-FR')}`);
        if (project.endDate) doc.text(`Date de fin: ${project.endDate.toLocaleDateString('fr-FR')}`);

        if (project.attachments && project.attachments.length > 0) {
          doc.addPage();
          doc.fontSize(18).font('Helvetica-Bold').fillColor('#1D4ED8').text('Galerie Photos', { align: 'center' });
          doc.moveDown();

          for (const att of project.attachments) {
            if (att.file && att.file.url) {
              try {
                const response = await fetch(att.file.url);
                if (response.ok) {
                  const arrayBuffer = await response.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  doc.moveDown();
                  doc.image(buffer, { fit: [450, 350], align: 'center' });
                  doc.moveDown(2);
                }
              } catch (e) {
                console.error('Erreur image PDF:', e);
              }
            }
          }
        }
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async listProjectProposals(adminId: string, page: number, pageSize: number, status?: string) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProjectProposalWhereInput = { 
      antennaId, 
      ...(status ? { status: status as ProposalStatus } : {}) 
    };

    const [items, total] = await Promise.all([
      this.prisma.projectProposal.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { author: true } }),
      this.prisma.projectProposal.count({ where }),
    ]);

    return { 
      items: items.map(p => ({
        ...memberMapper.projectProposal(p),
        authorName: p.author ? `${p.author.firstName} ${p.author.lastName}` : 'Inconnu',
        estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null
      })), 
      total, page, pageSize, totalPages: Math.ceil(total / pageSize) 
    };
  }

  async createProject(adminId: string, data: any) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);

    const project = await this.prisma.project.create({
      data: { 
        associationId,
        antennaId,
        title: data.title,
        summary: data.summary,
        description: data.description,
        locationText: data.locationText,
        promoterName: data.promoterName,
        targetBeneficiaries: data.targetBeneficiaries,
        populationImpact: data.populationImpact,
        environmentalImpact: data.environmentalImpact,
        implementationMethod: data.implementationMethod,
        risksAndMitigation: data.risksAndMitigation,
        specificObjectives: data.specificObjectives,
        expectedResults: data.expectedResults,
        successIndicators: data.successIndicators,
        startDate: data.startsAt ? new Date(data.startsAt) : null,
        endDate: data.endsAt ? new Date(data.endsAt) : null,
        status: data.status || ProjectStatus.APPROVED,
        createdByUserId: adminId,
        budgetAmount: data.budgetPlanned ? new Prisma.Decimal(data.budgetPlanned) : null, 
        amountSpent: data.budgetSpent ? new Prisma.Decimal(data.budgetSpent) : 0,
        attachments: {
          create: (data.photoIds || []).map((fileId: string) => ({ fileId }))
        }
      }
    });

    await this.notifications.notifySuperAdmins(
      associationId,
      `Un nouveau projet "${project.title}" a été lancé.`,
      NotificationType.PROJECT_CREATED
    );

    return project;
  }

  async updateProject(projectId: string, adminId: string, data: any) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, antennaId, associationId } });
    if (!project) throw new NotFoundException("Projet introuvable.");

    return this.prisma.project.update({ 
      where: { id: projectId }, 
      data: { 
        title: data.title,
        summary: data.summary,
        description: data.description,
        locationText: data.locationText,
        promoterName: data.promoterName,
        targetBeneficiaries: data.targetBeneficiaries,
        populationImpact: data.populationImpact,
        environmentalImpact: data.environmentalImpact,
        implementationMethod: data.implementationMethod,
        risksAndMitigation: data.risksAndMitigation,
        specificObjectives: data.specificObjectives,
        expectedResults: data.expectedResults,
        successIndicators: data.successIndicators,
        status: data.status,
        startDate: data.startsAt ? new Date(data.startsAt) : undefined,
        endDate: data.endsAt ? new Date(data.endsAt) : undefined,
        budgetAmount: data.budgetPlanned ? new Prisma.Decimal(data.budgetPlanned) : undefined,
        amountSpent: data.budgetSpent ? new Prisma.Decimal(data.budgetSpent) : undefined,
      } 
    });
  }

  async deleteProject(projectId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, antennaId, associationId } });
    if (!project) throw new NotFoundException("Projet introuvable.");
    return this.prisma.project.delete({ where: { id: projectId } });
  }

  // --- GESTION DES DOCUMENTS ---

  async listDocuments(adminId: string, page: number, pageSize: number, q?: string) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.DocumentWhereInput = { antennaId };

    if (q) {
      where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { file: true } }),
      this.prisma.document.count({ where }),
    ]);

    return { items: items.map(d => memberMapper.documentItem(d)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createDocument(adminId: string, data: any) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);

    const doc = await this.prisma.document.create({
      data: {
        title: data.title,
        description: data.description,
        fileId: data.fileId,
        antennaId,
        associationId,
        uploadedByUserId: adminId, 
        publishedAt: new Date(),
        visibility: 'ALL'
      },
    });

    await this.notifications.notifySuperAdmins(associationId, `Nouveau document antenne : "${doc.title}".`, NotificationType.DOCUMENT_PUBLISHED);
    return doc;
  }

  async deleteDocument(documentId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, antennaId, associationId } });
    if (!doc) throw new NotFoundException("Document introuvable.");
    return this.prisma.document.delete({ where: { id: documentId } });
  }

  // --- GESTION DES CONTENUS ---

  async listContents(adminId: string, page: number, pageSize: number, q?: string, status?: string) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.NewsPostWhereInput = { antennaId, ...(status ? { status: status as PostStatus } : {}) };

    if (q) {
      where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.newsPost.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' }, include: { coverImageFile: true } }),
      this.prisma.newsPost.count({ where }),
    ]);

    return {
      items: items.map(c => ({
        ...memberMapper.contentPost({ ...c, body: c.content }),
        coverImageFile: c.coverImageFile ? { url: c.coverImageFile.url } : null
      })),
      total, page, pageSize, totalPages: Math.ceil(total / pageSize)
    };
  }

  async createContent(adminId: string, data: any) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);

    const post = await this.prisma.newsPost.create({
      data: {
        title: data.title,
        content: data.content || data.body || '',
        status: data.status || PostStatus.DRAFT,
        coverImageFileId: data.coverImageFileId,
        antennaId,
        associationId,
        createdByUserId: adminId,
        scope: 'ANTENNA',
        ...(data.status === PostStatus.PUBLISHED ? { publishedAt: new Date(), publishedByUserId: adminId } : {})
      },
    });

    if (post.status === PostStatus.PUBLISHED) {
      await this.notifications.notifySuperAdmins(associationId, `Nouveau contenu publié par une antenne : "${post.title}".`, NotificationType.NEWS_PUBLISHED);
    }

    return post;
  }

  async updateContent(contentId: string, adminId: string, data: any) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const post = await this.prisma.newsPost.findFirst({ where: { id: contentId, antennaId, associationId } });
    if (!post) throw new NotFoundException("Contenu introuvable.");

    return this.prisma.newsPost.update({
      where: { id: contentId },
      data: {
        title: data.title,
        content: data.content ?? data.body,
        status: data.status,
        coverImageFileId: data.coverImageFileId,
      },
    });
  }

  async deleteContent(contentId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    const post = await this.prisma.newsPost.findFirst({ where: { id: contentId, antennaId, associationId } });
    if (!post) throw new NotFoundException("Contenu introuvable.");
    return this.prisma.newsPost.delete({ where: { id: contentId } });
  }

  // --- NOTIFICATIONS ---
  async listNotifications(adminId: string, page: number, pageSize: number) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = { antennaId };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);

    return { 
      items: items.map(n => memberMapper.notification(n)), 
      total, page, pageSize, totalPages: Math.ceil(total / pageSize)
    };
  }
}