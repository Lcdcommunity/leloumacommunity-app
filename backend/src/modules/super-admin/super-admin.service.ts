//backend/src/modules/super-admin/super-admin.service.ts
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
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../../common/services/mail.service';
import { CreateAntennaDto } from './dto/create-antenna.dto';
import { CreateAntennaAdminDto } from './dto/create-antenna-admin.dto';
import { memberMapper } from '../member/member.mapper';

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

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /* ── GESTION DES PRIX (PRICING CONFIG) ── */

  async getPricingConfig(associationId: string) {
    const setting = await this.prisma.associationSetting.findUnique({
      where: {
        associationId_key: {
          associationId,
          key: 'PRICING_CONFIG',
        },
      },
    });

    return setting?.value ?? {}; 
  }

  async updatePricingConfig(
    associationId: string, 
    pricingData: Record<string, { monthlyQuota: number; membershipCard: number }>, 
    actorId: string
  ) {
    return this.prisma.associationSetting.upsert({
      where: {
        associationId_key: {
          associationId,
          key: 'PRICING_CONFIG',
        },
      },
      update: {
        value: pricingData as any,
        updatedByUserId: actorId,
      },
      create: {
        associationId,
        key: 'PRICING_CONFIG',
        value: pricingData as any,
        description: 'Tarifs globaux par devise',
        updatedByUserId: actorId,
      },
    });
  }

  /* ─────────────────────────────────────────────────────────────────── */

  async listAntennas(page: number, pageSize: number, q?: string, isActive?: boolean) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.AntennaWhereInput = {};

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

  async getAntennaById(id: string) {
    const antenna = await this.prisma.antenna.findUnique({
      where: { id },
    });
    if (!antenna) {
      throw new NotFoundException('Antenne introuvable.');
    }
    return antenna;
  }

  async listUsersByRole(role: UserRole, page: number, pageSize: number, q?: string, status?: string) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {
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
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async approveUser(userId: string, adminId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        approvedByUserId: adminId,
        approvedAt: new Date(),
      },
    });
  }

  async rejectUser(userId: string, adminId: string, reason: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.REJECTED,
        rejectedByUserId: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });
  }

  async updateUser(userId: string, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
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
      },
    });
  }

  async suspendUser(userId: string, actorId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
        suspendedByUserId: actorId,
        suspendedAt: new Date(),
      },
    });
  }

  async activateUser(userId: string, actorId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        approvedByUserId: actorId,
        approvedAt: new Date(),
        suspendedAt: null,
        suspendedByUserId: null,
      },
    });
  }

  async deleteUser(userId: string, actorId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date(),
        deletedByUserId: actorId,
      },
    });
  }

  async updateAntennaAdmin(userId: string, data: any, actorId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: UserRole.ANTENNA_ADMIN,
        NOT: { status: UserStatus.DELETED },
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur introuvable.');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName  !== undefined) updateData.lastName  = data.lastName;
    if (data.phone     !== undefined) updateData.phone     = data.phone;
    if (data.city      !== undefined) updateData.city      = data.city;
    if (data.country   !== undefined) updateData.country   = data.country;
    if (data.postalCode          !== undefined) updateData.postalCode          = data.postalCode;
    if (data.originSubPrefecture !== undefined) updateData.originSubPrefecture = data.originSubPrefecture;
    if (data.addressLine1        !== undefined) updateData.addressLine1        = data.addressLine1;
    if (data.addressLine2        !== undefined) updateData.addressLine2        = data.addressLine2;

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  async createAntenna(data: CreateAntennaDto, actorId: string) {
    const association = await this.prisma.association.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!association) {
      throw new NotFoundException('Association manquante.');
    }

    const code = await this.buildUniqueAntennaCode(
      association.id,
      data.code,
      data.name,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const antenna = await tx.antenna.create({
        data: {
          associationId: association.id,
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

      let createdAdmin:
        | {
            email: string;
            firstName: string;
            lastName: string;
            temporaryPassword: string;
            antennaName: string;
            associationTitle?: string;
            sendInvite?: boolean;
          }
        | null = null;

      if (data.admin?.email) {
        const result = await this.createAntennaAdminRecord(tx, {
          associationId: association.id,
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
        }, actorId);        
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

  async updateAntenna(id: string, data: Partial<CreateAntennaDto>) {
    return this.prisma.antenna.update({
      where: { id },
      data: {
        ...(data.code            !== undefined ? { code:            data.code            } : {}),
        ...(data.name            !== undefined ? { name:            data.name            } : {}),
        ...(data.addressLine1    !== undefined ? { addressLine1:    data.addressLine1    } : {}),
        ...(data.addressLine2    !== undefined ? { addressLine2:    data.addressLine2    } : {}),
        ...(data.postalCode      !== undefined ? { postalCode:      data.postalCode      } : {}),
        ...(data.city            !== undefined ? { city:            data.city            } : {}),
        ...(data.country         !== undefined ? { country:         data.country         } : {}),
        ...(data.phone           !== undefined ? { phone:           data.phone           } : {}),
        ...(data.email           !== undefined ? { email:           data.email           } : {}),
        ...(data.isActive        !== undefined ? { isActive:        data.isActive        } : {}),
        ...(data.defaultCurrency !== undefined ? { defaultCurrency: data.defaultCurrency } : {}),
      },
    });
  }

  async deleteAntenna(id: string) {
    return this.prisma.antenna.delete({ where: { id } });
  }

  async createAntennaAdmin(data: CreateAntennaAdminDto, actorId: string) {
    const antenna = await this.prisma.antenna.findUnique({
      where: { id: data.antennaId },
      select: { id: true, name: true, associationId: true },
    });

    if (!antenna) {
      throw new NotFoundException('Antenne introuvable.');
    }

    const result = await this.createAntennaAdminRecord(this.prisma, {
      associationId: antenna.associationId,
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
    }, actorId);

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
      include: {
        adminAssignments: { include: { antenna: true } },
      },
    });
  }

  async suspendAntennaAdmin(userId: string, actorId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: UserRole.ANTENNA_ADMIN,
        NOT: { status: UserStatus.DELETED },
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur introuvable.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
        suspendedByUserId: actorId,
        suspendedAt: new Date(),
      },
    });
  }

  async activateAntennaAdmin(userId: string, actorId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: UserRole.ANTENNA_ADMIN,
        NOT: { status: UserStatus.DELETED },
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur introuvable.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        approvedByUserId: actorId,
        approvedAt: new Date(),
        suspendedAt: null,
        suspendedByUserId: null,
      },
    });
  }

  async deleteAntennaAdmin(userId: string, actorId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: UserRole.ANTENNA_ADMIN,
        NOT: { status: UserStatus.DELETED },
      },
    });

    if (!admin) {
      throw new NotFoundException('Administrateur introuvable.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.antennaAdminAssignment.updateMany({
        where: {
          adminUserId: userId,
          isActive: true,
        },
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

  // 👇 AJOUT CHIRURGICAL : Inclusion des `attachments` pour le dashboard Super Admin
  async listProjects(page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.ProjectWhereInput = q
      ? { title: { contains: q, mode: 'insensitive' } }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { 
          antenna: true,
          attachments: { include: { file: true } } 
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: items.map(p => {
        const mappedProject = memberMapper.project(p as any);
        return {
          ...mappedProject,
          attachments: (p as any).attachments?.map((a: any) => ({
            id: a.file.id,
            url: a.file.url
          })) || []
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteProject(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projet introuvable.');
    return this.prisma.project.delete({ where: { id } });
  }

  async createDocument(data: { title: string; description?: string; fileAssetId: string }, actorId: string, associationId: string) {
    if (!data.fileAssetId) {
      throw new BadRequestException('Un fichier est requis.');
    }

    return this.prisma.document.create({
      data: {
        associationId,
        title: data.title,
        description: data.description,
        fileId: data.fileAssetId,
        uploadedByUserId: actorId,
        scope: 'GLOBAL', 
        isDownloadable: true,
      },
      include: { file: true },
    });
  }

  async listDocuments(page: number, pageSize: number, q?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.DocumentWhereInput = q
      ? { title: { contains: q, mode: 'insensitive' } }
      : {};

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
      items: items.map(d => memberMapper.documentItem(d as any)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async deleteDocument(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document introuvable.');
    
    return this.prisma.$transaction(async (tx) => {
      await tx.document.delete({ where: { id } });
      if (doc.fileId) {
        await tx.fileAsset.delete({ where: { id: doc.fileId } });
      }
      return { success: true };
    });
  }

  async listAllContributions(page: number, pageSize: number, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: Prisma.ContributionWhereInput = status ? { status: status as any } : {};

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

  private async createAntennaAdminRecord(
    prisma: PrismaLike,
    payload: InternalAdminPayload,
    actorId: string,
  ) {
    const existing = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existing) {
      throw new ConflictException('Un utilisateur existe déjà avec cette adresse email.');
    }

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
        phone: payload.phone,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        postalCode: payload.postalCode,
        city: payload.city,
        country: payload.country,
        originSubPrefecture: payload.originSubPrefecture,
        createdByUserId: actorId,
        approvedByUserId: actorId,
        approvedAt: now,
      },
    });

    await prisma.userSecuritySetting.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        forcePasswordReset: true,
        passwordChangedAt: now,
      },
      update: {
        forcePasswordReset: true,
      },
    });

    await prisma.antennaAdminAssignment.create({
      data: {
        associationId: payload.associationId,
        antennaId: payload.antennaId,
        adminUserId: user.id,
        assignedByUserId: actorId,
        isPrimaryManager: true,
        canValidateMembers: true,
        canValidateContributions: true,
        canManageProjects: true,
        canManageContent: true,
        isActive: true,
      },
    });

    return { user, temporaryPassword };
  }

  private generateTemporaryPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let out = '';
    for (let i = 0; i < 12; i += 1) {
      out += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return out;
  }

  private async buildUniqueAntennaCode(
    associationId: string,
    preferredCode?: string,
    fallbackName?: string,
  ) {
    const base = this.normalizeCode(preferredCode || fallbackName || 'ANT');
    let candidate = base;
    let counter = 1;

    while (true) {
      const exists = await this.prisma.antenna.findFirst({
        where: { associationId, code: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      counter += 1;
      candidate = `${base}${counter}`;
    }
  }

  private normalizeCode(input: string) {
    const normalized = input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();

    if (normalized.length >= 4) return normalized.slice(0, 8);
    return `${normalized || 'ANT'}01`;
  }
}