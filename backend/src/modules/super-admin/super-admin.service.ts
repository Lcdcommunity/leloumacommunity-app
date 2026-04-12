// backend/src/modules/super-admin/super-admin.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  UserRole,
  UserStatus,
  NotificationType,
  ProjectStatus,
  CurrencyCode, // 🔥 AJOUT DE L'IMPORT ICI POUR LE PRICING
  PostStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../../common/services/mail.service';
import { CreateAntennaDto } from './dto/create-antenna.dto';
import { CreateAntennaAdminDto } from './dto/create-antenna-admin.dto';
import { memberMapper } from '../member/member.mapper';
import { NotificationsService } from '../notifications/notifications.service';

type PrismaLike = PrismaService | Prisma.TransactionClient;

type InternalAdminPayload = {
  associationId: string;
  antennaId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  associationTitle?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  originSubPrefecture?: string;
  sendInvite?: boolean;
};

type ListUsersQuery = {
  role?: UserRole;
  status?: UserStatus;
  q?: string;
};

type CreateDocumentInput = {
  title: string;
  description?: string;
  visibility?: string;
  fileAssetId: string;
};

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ── GESTION DES PRIX (RÉÉCRITE POUR UTILISER LA VRAIE TABLE PRICING) ── */

  async getPricingConfig(associationId: string) {
    // On va chercher dans la VRAIE table Pricing
    const pricings = await this.prisma.pricing.findMany({
      where: { associationId }
    });

    const result: Record<string, any> = {};
    for (const p of pricings) {
      result[p.currency] = {
        monthlyQuota: Number(p.monthlyQuota),
        membershipCard: Number(p.membershipCard),
        expenseValidationThreshold: p.expenseValidationThreshold ? Number(p.expenseValidationThreshold) : null,
      };
    }
    return result;
  }

  async updatePricingConfig(
    associationId: string,
    pricingData: Record<string, { monthlyQuota: number; membershipCard: number; expenseValidationThreshold: number | null }>, // 🔥 ON ACCEPTE ENFIN LE SEUIL ICI
    actorId: string,
  ) {
    // On boucle sur chaque devise envoyée par le front et on fait un Upsert dans la vraie table Pricing
    const updatePromises = Object.entries(pricingData).map(([currencyStr, data]) => {
      const currency = currencyStr as CurrencyCode;
      
      return this.prisma.pricing.upsert({
        where: {
          associationId_currency: {
            associationId,
            currency,
          }
        },
        update: {
          monthlyQuota: data.monthlyQuota,
          membershipCard: data.membershipCard,
          expenseValidationThreshold: data.expenseValidationThreshold !== undefined ? data.expenseValidationThreshold : null,
        },
        create: {
          associationId,
          currency,
          monthlyQuota: data.monthlyQuota,
          membershipCard: data.membershipCard,
          expenseValidationThreshold: data.expenseValidationThreshold !== undefined ? data.expenseValidationThreshold : null,
        }
      });
    });

    await Promise.all(updatePromises);
    
    return { success: true, message: 'Tarifs mis à jour avec succès.' };
  }

  /* ── ANTENNAS ── */

  async listAntennas(associationId: string, page: number, pageSize: number, q?: string, isActive?: boolean) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.AntennaWhereInput = { associationId }; // 🔥 FILTRÉ

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.antenna.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.antenna.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async listAntennasByAssociation(associationId: string) {
    return this.prisma.antenna.findMany({
      where: { associationId }, // 🔥 FILTRÉ
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAntennaById(id: string, associationId: string) {
    const antenna = await this.prisma.antenna.findFirst({
      where: { id, associationId }, // 🔥 FILTRÉ
    });

    if (!antenna) throw new NotFoundException('Antenne introuvable.');
    return antenna;
  }

  async createAntenna(data: CreateAntennaDto, actorId: string, associationId: string) {
    const code = await this.buildUniqueAntennaCode(
      associationId,
      data.code,
      data.name,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const antenna = await tx.antenna.create({
        data: {
          associationId,
          code,
          name: data.name,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          postalCode: data.postalCode,
          city: data.city,
          country: data.country,
          phone: data.phone,
          email: data.email,
          isActive: data.isActive ?? true,
          defaultCurrency: data.defaultCurrency,
          createdByUserId: actorId,
        },
      });

      let createdAdmin = null;

      if (data.admin?.email) {
        const result = await this.createAntennaAdminRecord(
          tx,
          {
            associationId,
            antennaId: antenna.id,
            firstName: data.admin.firstName,
            lastName: data.admin.lastName,
            email: data.admin.email,
            phone: data.admin.phone,
            associationTitle: data.admin.associationTitle,
            addressLine1: data.admin.addressLine1,
            addressLine2: data.admin.addressLine2,
            postalCode: data.admin.postalCode,
            city: data.admin.city,
            country: data.admin.country,
            originSubPrefecture: data.admin.originSubPrefecture,
            sendInvite: data.admin.sendInvite,
          },
          actorId,
        );

        createdAdmin = {
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          temporaryPassword: result.temporaryPassword,
          antennaName: antenna.name,
          associationTitle: data.admin.associationTitle,
          sendInvite: data.admin.sendInvite,
        };
      }

      return { antenna, createdAdmin };
    });

    await this.notifications.notifySuperAdmins(
      associationId,
      `Une nouvelle antenne "${created.antenna.name}" a été créée.`,
      NotificationType.SYSTEM_ALERT,
    );

    if (created.createdAdmin?.sendInvite !== false) {
      await this.mailService.sendAntennaAdminInvitation({
        to: created.createdAdmin.email,
        firstName: created.createdAdmin.firstName,
        lastName: created.createdAdmin.lastName,
        antennaName: created.createdAdmin.antennaName,
        temporaryPassword: created.createdAdmin.temporaryPassword,
        associationTitle: created.createdAdmin.associationTitle,
      });
    }

    return created.antenna;
  }

  async updateAntenna(id: string, data: Partial<CreateAntennaDto>, associationId: string) {
    return this.prisma.antenna.update({
      where: { id, associationId }, // 🔥 FILTRÉ
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 } : {}),
        ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.defaultCurrency !== undefined ? { defaultCurrency: data.defaultCurrency } : {}),
      },
    });
  }

  async deleteAntenna(id: string, associationId: string) {
    return this.prisma.antenna.delete({ where: { id, associationId } }); // 🔥 FILTRÉ
  }

  /* ── USERS ── */

  async listUsersByRole(associationId: string, role: UserRole, page: number, pageSize: number, q?: string, status?: string) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {
      associationId, // 🔥 FILTRÉ
      role,
      ...(status
        ? { status: status as UserStatus }
        : { NOT: { status: UserStatus.DELETED } }),
    };

    if (q) {
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          memberships: { include: { antenna: true } },
          adminAssignments: { include: { antenna: true } },
          virtualCard: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
  async approveUser(userId: string, adminId: string, associationId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId, associationId }, // 🔥 FILTRÉ
      data: {
        status: UserStatus.ACTIVE,
        approvedByUserId: adminId,
        approvedAt: new Date(),
      },
    });

    await this.notifications.createForUser({
      associationId,
      userId: user.id,
      message: `Votre compte a été approuvé.`,
      type: NotificationType.ACCOUNT_APPROVED,
      title: 'Compte activé',
    });

    return user;
  }

  async rejectUser(userId: string, adminId: string, reason: string, associationId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId, associationId }, // 🔥 FILTRÉ
      data: {
        status: UserStatus.REJECTED,
        rejectedByUserId: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.notifications.createForUser({
      associationId,
      userId: user.id,
      message: `Votre demande d'adhésion a été refusée. Motif : ${reason}`,
      type: NotificationType.ACCOUNT_REJECTED,
      title: 'Demande refusée',
    });

    return user;
  }

  async updateUser(userId: string, data: any, associationId: string) {
    return this.prisma.user.update({
      where: { id: userId, associationId }, // 🔥 FILTRÉ
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        originSubPrefecture: data.originSubPrefecture,
        city: data.city,
        country: data.country,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        // 🔥 AJOUTS CHIRURGICAUX DES NOUVEAUX CHAMPS
        postalCode: data.postalCode,
        function: data.function,
        professionalStatus: data.professionalStatus,
        placeOfBirth: data.placeOfBirth,
        countryOfBirth: data.countryOfBirth,
      },
    });
  }

  async suspendUser(userId: string, actorId: string, associationId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId, associationId }, // 🔥 FILTRÉ
      data: {
        status: UserStatus.SUSPENDED,
        suspendedByUserId: actorId,
        suspendedAt: new Date(),
      },
    });

    await this.notifications.createForUser({
      associationId,
      userId: user.id,
      message: `Votre compte a été suspendu par un administrateur.`,
      type: NotificationType.ACCOUNT_SUSPENDED,
      title: 'Compte suspendu',
    });

    return user;
  }

  async activateUser(userId: string, actorId: string, associationId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId, associationId }, // 🔥 FILTRÉ
      data: {
        status: UserStatus.ACTIVE,
        approvedByUserId: actorId,
        approvedAt: new Date(),
        suspendedAt: null,
        suspendedByUserId: null,
      },
    });

    await this.notifications.createForUser({
      associationId,
      userId: user.id,
      message: `Votre compte a été réactivé avec succès.`,
      type: NotificationType.ACCOUNT_APPROVED,
    });

    return user;
  }

  async deleteUser(userId: string, actorId: string, associationId: string) {
    return this.prisma.user.update({
      where: { id: userId, associationId }, // 🔥 FILTRÉ
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date(),
        deletedByUserId: actorId,
      },
    });
  }

  async createAntennaAdmin(data: CreateAntennaAdminDto, actorId: string, associationId: string) {
    const antenna = await this.prisma.antenna.findFirst({
      where: { id: data.antennaId, associationId }, // 🔥 FILTRÉ
    });

    if (!antenna) throw new NotFoundException('Antenne introuvable.');

    const result = await this.createAntennaAdminRecord(
      this.prisma,
      {
        associationId,
        antennaId: antenna.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        associationTitle: data.associationTitle,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country,
        originSubPrefecture: data.originSubPrefecture,
        sendInvite: data.sendInvite,
      },
      actorId,
    );

    await this.notifications.createForUser({
      associationId,
      userId: result.user.id,
      message: `Bienvenue ! Vous avez été nommé administrateur pour l'antenne "${antenna.name}".`,
      type: NotificationType.SYSTEM_ALERT,
      title: 'Promotion Admin',
    });

    if (data.sendInvite !== false) {
      await this.mailService.sendAntennaAdminInvitation({
        to: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        antennaName: antenna.name,
        temporaryPassword: result.temporaryPassword,
        associationTitle: data.associationTitle,
      });
    }

    return this.prisma.user.findUnique({
      where: { id: result.user.id },
      include: { adminAssignments: { include: { antenna: true } } },
    });
  }

  async updateAntennaAdmin(userId: string, data: any, actorId: string, associationId: string) {
    return this.prisma.user.update({
      where: { id: userId, associationId, role: UserRole.ANTENNA_ADMIN }, // 🔥 FILTRÉ
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
        originSubPrefecture: data.originSubPrefecture,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        // 🔥 AJOUT CHIRURGICAL : On enregistre enfin le poste occupé !
        function: data.function || data.associationTitle,
      },
    });
  }

  async suspendAntennaAdmin(userId: string, actorId: string, associationId: string) {
    return this.prisma.user.update({
      where: { id: userId, associationId, role: UserRole.ANTENNA_ADMIN },
      data: {
        status: UserStatus.SUSPENDED,
        suspendedByUserId: actorId,
        suspendedAt: new Date(),
      },
    });
  }

  async activateAntennaAdmin(userId: string, actorId: string, associationId: string) {
    return this.prisma.user.update({
      where: { id: userId, associationId, role: UserRole.ANTENNA_ADMIN },
      data: {
        status: UserStatus.ACTIVE,
        approvedByUserId: actorId,
        approvedAt: new Date(),
        suspendedAt: null,
        suspendedByUserId: null,
      },
    });
  }

  async deleteAntennaAdmin(userId: string, actorId: string, associationId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { id: userId, associationId, role: UserRole.ANTENNA_ADMIN },
    });

    if (!admin) throw new NotFoundException('Administrateur introuvable.');

    return this.prisma.$transaction(async (tx) => {
      await tx.antennaAdminAssignment.updateMany({
        where: { adminUserId: userId, associationId, isActive: true },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedByUserId: actorId,
          revokeReason: 'Suppression logique par super-admin',
        },
      });

      return tx.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.DELETED,
          deletedAt: new Date(),
          deletedByUserId: actorId,
        },
      });
    });
  }

  /* ── PROJECTS ── */

  async listProjects(associationId: string, page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProjectWhereInput = { 
      associationId, // 🔥 FILTRÉ
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          antenna: true,
          attachments: { include: { file: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: items.map((p) => memberMapper.project(p as any)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateProject(id: string, data: any, associationId: string) {
    // 🔥 CORRECTION CHIRURGICALE : Sécurisation blindée du statut entrant (Blind-Proof)
    let safeStatus = data.status;
    if (safeStatus === 'DRAFT') safeStatus = ProjectStatus.PROPOSED;
    if (safeStatus === 'PENDING_APPROVAL') safeStatus = ProjectStatus.UNDER_REVIEW;
    if (safeStatus === 'SUSPENDED') safeStatus = ProjectStatus.ON_HOLD;

    return this.prisma.project.update({
      where: { id, associationId }, // 🔥 FILTRÉ
      data: {
        title: data.title,
        summary: data.summary,
        description: data.description,
        status: safeStatus, // 🔥 Utilisation de la version sécurisée
        budgetAmount: data.budgetAmount,
        amountSpent: data.amountSpent,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }  async deleteProject(id: string, associationId: string) {
    return this.prisma.project.delete({ where: { id, associationId } }); // 🔥 FILTRÉ
  }

  /* ── DOCUMENTS ── */  async createDocument(data: CreateDocumentInput, actorId: string, associationId: string) {
    if (!data.fileAssetId) throw new BadRequestException('Un fichier est requis.');

    return this.prisma.document.create({
      data: {
        associationId,
        title: data.title,
        description: data.description,
        visibility: data.visibility || 'ALL',
        fileId: data.fileAssetId,
        uploadedByUserId: actorId,
        scope: 'GLOBAL',
        publishedAt: new Date(),
      },
      include: { file: true },
    });
  }

  async listDocuments(associationId: string, page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.DocumentWhereInput = {
      associationId, // 🔥 FILTRÉ
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {})
    };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { antenna: true, file: true },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map((d) => memberMapper.documentItem(d as any)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteDocument(id: string, associationId: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, associationId } });
    if (!doc) throw new NotFoundException('Document introuvable.');

    return this.prisma.$transaction(async (tx) => {
      await tx.document.delete({ where: { id } });
      if (doc.fileId) await tx.fileAsset.delete({ where: { id: doc.fileId } });
      return { success: true };
    });
  }

  /* ── GESTION DES ANNONCES (AJOUT CHIRURGICAL) ── */
  async listContents(associationId: string, page: number, pageSize: number, q?: string, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.NewsPostWhereInput = {
      associationId,
      ...(status ? { status: status as PostStatus } : {})
    };

    if (q) {
      where.OR = [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.newsPost.findMany({ 
        where, 
        skip, 
        take: pageSize, 
        orderBy: { createdAt: 'desc' }, 
        include: { coverImageFile: true, attachments: { include: { file: true } } } 
      }),
      this.prisma.newsPost.count({ where }),
    ]);

    return {
      items: items.map(c => ({
        ...memberMapper.contentPost({ ...c, body: c.content }),
        coverFileAssetId: c.coverImageFileId,
        coverImageFile: c.coverImageFile ? { url: c.coverImageFile.url } : null,
        attachments: c.attachments?.map(att => ({ id: att.file.id, url: att.file.url })) || []
      })),
      total, page, pageSize, totalPages: Math.ceil(total / pageSize)
    };
  }

  async createContent(adminId: string, associationId: string, data: any) {
    return this.prisma.newsPost.create({
      data: {
        title: data.title,
        content: data.content || data.body || '',
        status: data.status || PostStatus.DRAFT,
        coverImageFileId: data.coverImageFileId || data.coverFileAssetId || null,
        associationId,
        createdByUserId: adminId,
        scope: 'GLOBAL', // SuperAdmin publie pour tout le monde par défaut
        ...(data.status === PostStatus.PUBLISHED ? { publishedAt: new Date(), publishedByUserId: adminId } : {}),
        attachments: data.imageIds?.length > 0 ? {
          create: data.imageIds.slice(0, 3).map((fileId: string) => ({ fileId }))
        } : undefined
      },
    });
  }

  async updateContent(contentId: string, associationId: string, data: any) {
    const post = await this.prisma.newsPost.findFirst({ where: { id: contentId, associationId } });
    if (!post) throw new NotFoundException("Contenu introuvable.");

    const imageId = data.coverImageFileId !== undefined ? data.coverImageFileId : data.coverFileAssetId;

    if (data.imageIds !== undefined) {
      await this.prisma.newsPostAttachment.deleteMany({ where: { newsPostId: contentId }});
    }

    return this.prisma.newsPost.update({
      where: { id: contentId },
      data: {
        title: data.title,
        content: data.content ?? data.body,
        status: data.status,
        ...(imageId !== undefined ? { coverImageFileId: imageId } : {}),
        ...(data.imageIds?.length > 0 ? {
          attachments: {
            create: data.imageIds.slice(0, 3).map((fileId: string) => ({ fileId }))
          }
        } : {})
      },
    });
  }

  async deleteContent(contentId: string, associationId: string) {
    return this.prisma.newsPost.delete({ where: { id: contentId, associationId } });
  }

  /* ── CONTRIBUTIONS ── */

  async listAllContributions(associationId: string, page: number, pageSize: number, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.ContributionWhereInput = {
      associationId, // 🔥 FILTRÉ
      ...(status ? { status: status as any } : {})
    };
    const [items, total] = await Promise.all([
      this.prisma.contribution.findMany({
        where,
        skip,
        take: pageSize,
        include: { member: true, antenna: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contribution.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /* ── HELPERS PRIVÉS ── */

  private async createAntennaAdminRecord(prisma: PrismaLike, payload: InternalAdminPayload, actorId: string) {
    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) throw new ConflictException('Email déjà utilisé.');

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const now = new Date();

    const user = await prisma.user.create({
      data: {
        associationId: payload.associationId,
        email: payload.email,
        passwordHash,
        role: UserRole.ANTENNA_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: now,
        firstName: payload.firstName,
        lastName: payload.lastName,
        // 🔥 AJOUTS CHIRURGICAUX : On s'assure que les données ne sont plus perdues à la création
        phone: payload.phone,
        city: payload.city,
        country: payload.country,
        postalCode: payload.postalCode,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        originSubPrefecture: payload.originSubPrefecture,
        function: payload.associationTitle, 
        createdByUserId: actorId,
        approvedByUserId: actorId,
        approvedAt: now,
      },
    });

    await prisma.antennaAdminAssignment.create({
      data: {
        associationId: payload.associationId,
        antennaId: payload.antennaId,
        adminUserId: user.id,
        assignedByUserId: actorId,
        isPrimaryManager: true,
        isActive: true,
      },
    });

    return { user, temporaryPassword };
  }

  private generateTemporaryPassword() {
    return Math.random().toString(36).slice(-10) + '!A1';
  }

  private async buildUniqueAntennaCode(associationId: string, preferredCode?: string, fallbackName?: string) {
    const base = (preferredCode || fallbackName || 'ANT').slice(0, 4).toUpperCase();
    let candidate = base;
    let counter = 1;
    while (true) {
      const exists = await this.prisma.antenna.findFirst({ where: { associationId, code: candidate } });
      if (!exists) return candidate;
      counter += 1;
      candidate = `${base}${counter}`;
    }
  }
}