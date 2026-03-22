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
      this.prisma.user.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { lastName: 'asc' },
        include: { virtualCard: true } // <-- INCLUSION CARTE POUR L'ADMIN
      }),
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

  async suspendUser(userId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, role: UserRole.MEMBER as any, memberships: { some: { antennaId } } } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.SUSPENDED, suspendedByUserId: adminId, suspendedAt: new Date() } 
    });
  }

  async activateUser(userId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, role: UserRole.MEMBER as any, memberships: { some: { antennaId } } } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.ACTIVE, suspendedByUserId: null, suspendedAt: null } 
    });
  }

  async deleteUser(userId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const user = await this.prisma.user.findFirst({ 
      where: { id: userId, role: UserRole.MEMBER as any, memberships: { some: { antennaId } } } 
    });
    if (!user) throw new NotFoundException("Membre introuvable.");

    return this.prisma.user.update({ 
      where: { id: userId }, 
      data: { status: UserStatus.DELETED, deletedByUserId: adminId, deletedAt: new Date() } 
    });
  }

  // 👇 AJOUT CHIRURGICAL : MISE A JOUR PROFIL MEMBRE PAR L'ADMIN 👇
  async updateAntennaMember(userId: string, adminId: string, data: any) {
    const antennaId = await this.getAdminAntennaId(adminId);
    
    // Vérifier que le membre appartient bien à l'antenne gérée par l'admin
    const user = await this.prisma.user.findFirst({ 
      where: { 
        id: userId, 
        role: UserRole.MEMBER as any, 
        memberships: { some: { antennaId } } 
      } 
    });

    if (!user) throw new NotFoundException("Membre introuvable dans votre antenne.");

    // Mettre à jour uniquement les champs autorisés
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
        ...(data.originVillage !== undefined ? { originVillage: data.originVillage } : {}),
      } 
    });
  }
  // 👆 FIN DE L'AJOUT 👆

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

  async validateContribution(contributionId: string, adminId: string) {
    const antennaId = await this.getAdminAntennaId(adminId);
    const contribution = await this.prisma.contribution.findFirst({ 
      where: { id: contributionId, antennaId },
      include: { member: true } 
    });

    if (!contribution) throw new NotFoundException("Cotisation introuvable.");

    const updated = await this.prisma.contribution.update({ 
      where: { id: contributionId }, 
      data: { status: ContributionStatus.VALIDATED, validatedAt: new Date(), validatedByUserId: adminId } 
    });

    if (contribution.purpose === 'MEMBERSHIP_CARD') {
      const now = new Date();
      const nextYear = new Date();
      nextYear.setFullYear(now.getFullYear() + 1);

      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const cardNumber = `LCD-${now.getFullYear()}-${randomSuffix}`;

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
      this.prisma.project.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' },
        include: {
          attachments: {
            include: { file: true }
          }
        }
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

  // 👇 AJOUT CHIRURGICAL : GÉNÉRATION DU PDF PROJET 👇
  async exportProjectPdf(projectId: string, adminId: string): Promise<Buffer> {
    const antennaId = await this.getAdminAntennaId(adminId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, antennaId },
      include: { attachments: { include: { file: true } } }
    });

    if (!project) throw new NotFoundException("Projet introuvable.");

    // Importation conditionnelle pour éviter de crasher NestJS si pdfkit n'est pas encore installé
    // Assure-toi de lancer `npm install pdfkit`
    const PDFDocument = require('pdfkit');

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Helper pour le style
        const addSection = (title: string, content: string | null | undefined) => {
          if (!content) return;
          doc.moveDown();
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#1D4ED8').text(title);
          doc.moveDown(0.5);
          doc.fontSize(11).font('Helvetica').fillColor('#374151').text(content, { align: 'justify' });
        };

        const safeStringify = (val: any) => typeof val === 'string' ? val : JSON.stringify(val, null, 2);

        // 1. EN-TÊTE
        doc.fontSize(24).font('Helvetica-Bold').fillColor('#0F172A').text(project.title, { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12).font('Helvetica').fillColor('#6B7280');
        if (project.promoterName) doc.text(`Promoteur: ${project.promoterName}`, { align: 'center' });
        if (project.locationText) doc.text(`Localisation: ${project.locationText}`, { align: 'center' });
        doc.text(`Statut: ${project.status}`, { align: 'center' });
        doc.moveDown(2);

        // 2. CONTENU TEXTUEL
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

        // 3. BUDGET & DATES
        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1D4ED8').text('Budget & Exécution');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica').fillColor('#374151');
        doc.text(`Budget Prévu: ${project.budgetAmount ? project.budgetAmount.toString() : 'Non défini'}`);
        doc.text(`Budget Dépensé: ${project.amountSpent ? project.amountSpent.toString() : '0'}`);
        if (project.startDate) doc.text(`Date de début: ${project.startDate.toLocaleDateString('fr-FR')}`);
        if (project.endDate) doc.text(`Date de fin: ${project.endDate.toLocaleDateString('fr-FR')}`);

        // 4. GALERIE PHOTOS
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
                  
                  // On vérifie que ce n'est pas trop grand pour la page
                  doc.moveDown();
                  doc.image(buffer, { fit: [450, 350], align: 'center' });
                  doc.moveDown(2);
                }
              } catch (e) {
                console.error('Erreur lors du téléchargement de l\'image pour le PDF:', e);
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
  // 👆 FIN DE L'AJOUT 👆

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
        ...(data.summary !== undefined ? { summary: data.summary } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.locationText !== undefined ? { locationText: data.locationText } : {}),
        ...(data.promoterName !== undefined ? { promoterName: data.promoterName } : {}),
        ...(data.targetBeneficiaries !== undefined ? { targetBeneficiaries: data.targetBeneficiaries } : {}),
        ...(data.populationImpact !== undefined ? { populationImpact: data.populationImpact } : {}),
        ...(data.environmentalImpact !== undefined ? { environmentalImpact: data.environmentalImpact } : {}),
        ...(data.implementationMethod !== undefined ? { implementationMethod: data.implementationMethod } : {}),
        ...(data.risksAndMitigation !== undefined ? { risksAndMitigation: data.risksAndMitigation } : {}),
        ...(data.specificObjectives !== undefined ? { specificObjectives: data.specificObjectives } : {}),
        ...(data.expectedResults !== undefined ? { expectedResults: data.expectedResults } : {}),
        ...(data.successIndicators !== undefined ? { successIndicators: data.successIndicators } : {}),
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