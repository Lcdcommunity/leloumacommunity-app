// backend/src/modules/system-admin/system-admin.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/services/mail.service';
import { normalizeDomain } from '../../common/utils/domain.util';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';

export interface CreateAssociationPayload {
  associationName: string;
  code: string;
  domain?: string;
  registrationNumber?: string;
  addressLine1?: string;
  postalCode?: string;
  logoFileId?: string | null;
  themeColors?: Record<string, string>;
  fontFamily?: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone: string;
  country?: string;
  city?: string;
}

@Injectable()
export class SystemAdminService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  async createAssociationWithSuperAdmin(data: CreateAssociationPayload) {
    const existingAsso = await this.prisma.association.findUnique({ where: { code: data.code } });
    if (existingAsso) throw new ConflictException("Ce code d'association est déjà pris.");

    const existingUser = await this.prisma.user.findUnique({ where: { email: data.adminEmail } });
    if (existingUser) throw new ConflictException("Cet email est déjà utilisé.");

    const domainName = normalizeDomain(data.domain);
    if (domainName) {
      const existingDomain = await this.prisma.association.findUnique({ where: { domainName } });
      if (existingDomain) throw new ConflictException('Ce domaine est déjà utilisé par une autre instance.');
    }

    const temporaryPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const association = await tx.association.create({
        data: {
          name: data.associationName,
          code: data.code,
          domainName,
          country: data.country,
          city: data.city,
          addressLine1: data.addressLine1,
          postalCode: data.postalCode,
          registrationNumber: data.registrationNumber,
          logoFileId: data.logoFileId ?? undefined,
          themeColors: data.themeColors ? (data.themeColors as any) : undefined,
          fontFamily: data.fontFamily,
        }
      });

      const superAdmin = await tx.user.create({
        data: {
          associationId: association.id,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          email: data.adminEmail,
          phone: data.adminPhone,
          passwordHash,
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          country: data.country,
          city: data.city,
        }
      });

      return { association, superAdmin };
    });

    // Non-bloquant : l'association et le compte existent déjà à ce stade.
    // Un échec d'envoi ne doit pas ressembler à un échec de création.
    try {
      await this.mailService.sendSuperAdminWelcome({
        to: result.superAdmin.email,
        firstName: result.superAdmin.firstName,
        lastName: result.superAdmin.lastName,
        associationName: result.association.name,
        temporaryPassword,
      });
    } catch (mailErr) {
      console.error(`Échec de l'envoi de l'email de bienvenue à ${result.superAdmin.email}`, mailErr);
    }

    return {
      message: 'Association et Super Admin créés avec succès.',
      associationId: result.association.id
    };
  }

  async getSystemDashboard() {
    const [totalAssociations, totalUsers, associations] = await Promise.all([
      this.prisma.association.count(),
      this.prisma.user.count(),
      this.prisma.association.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          domainName: true,
          createdAt: true,
          _count: {
            select: { users: true, antennas: true }
          }
        }
      })
    ]);

    return {
      stats: { totalAssociations, totalUsers },
      associations
    };
  }

  async getAssociationById(id: string) {
    return this.prisma.association.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, antennas: true }
        }
      }
    });
  }

  async updateAssociationDetails(id: string, data: { name?: string; code?: string; domainName?: string }) {
    const assoc = await this.prisma.association.findUnique({ where: { id } });
    if (!assoc) throw new NotFoundException('Association introuvable.');

    // Normalisation AVANT le contrôle de doublon (et réutilisée pour l'écriture) :
    // sinon un code qui ne diffère que par la casse/les espaces passe le test
    // puis plante sur la contrainte @unique une fois normalisé.
    let normalizedCode: string | undefined;
    if (data.code) {
      normalizedCode = data.code.toUpperCase().replace(/\s/g, '');
      if (normalizedCode !== assoc.code) {
        const existing = await this.prisma.association.findUnique({ where: { code: normalizedCode } });
        if (existing) throw new ConflictException("Ce code d'association est déjà utilisé par une autre instance.");
      }
    }

    let domainName: string | null | undefined;
    if (data.domainName !== undefined) {
      domainName = normalizeDomain(data.domainName);
      if (domainName) {
        const existingDomain = await this.prisma.association.findFirst({
          where: { domainName, id: { not: id } },
        });
        if (existingDomain) throw new ConflictException('Ce domaine est déjà utilisé par une autre instance.');
      }
    }

    return this.prisma.association.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(normalizedCode ? { code: normalizedCode } : {}),
        ...(domainName !== undefined ? { domainName } : {}),
      }
    });
  }

  async updateAssociationStatus(id: string, isActive: boolean) {
    await this.prisma.association.update({
      where: { id },
      data: { isActive }
    });
    return { message: `Instance ${isActive ? 'activée' : 'suspendue'} avec succès.` };
  }

  async getAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: { select: { firstName: true, lastName: true } },
        association: { select: { name: true } }
      }
    });

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      userId: log.actorUserId,
      userName: log.actorUser ? `${log.actorUser.firstName} ${log.actorUser.lastName}` : 'Système',
      associationName: log.association?.name || 'Plateforme',
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async deleteAssociation(id: string) {
    const association = await this.prisma.association.findUnique({ where: { id } });
    if (!association) throw new NotFoundException('Association introuvable.');

    await this.prisma.association.delete({ where: { id } });

    return { message: `L'association ${association.name} a été détruite définitivement.` };
  }
}