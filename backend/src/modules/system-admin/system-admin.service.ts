// backend/src/modules/system-admin/system-admin.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/services/mail.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';

export interface CreateAssociationPayload {
  associationName: string;
  code: string;
  domain?: string;
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

  /**
   * Création d'une nouvelle instance (Association) et de son premier Super Admin.
   */
  async createAssociationWithSuperAdmin(data: CreateAssociationPayload) {
    const existingAsso = await this.prisma.association.findUnique({ where: { code: data.code } });
    if (existingAsso) throw new ConflictException("Ce code d'association est déjà pris.");

    const existingUser = await this.prisma.user.findUnique({ where: { email: data.adminEmail } });
    if (existingUser) throw new ConflictException("Cet email est déjà utilisé.");

    const temporaryPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const association = await tx.association.create({
        data: {
          name: data.associationName,
          code: data.code,
          domainName: data.domain,
          country: data.country,
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

    await this.mailService.sendSuperAdminWelcome({
      to: result.superAdmin.email,
      firstName: result.superAdmin.firstName,
      lastName: result.superAdmin.lastName,
      associationName: result.association.name,
      temporaryPassword,
    });

    return { 
      message: "Association et Super Admin créés avec succès.",
      associationId: result.association.id 
    };
  }

  /**
   * Statistiques globales pour le Dashboard du Grand Chef.
   */
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

  /**
   * Récupération des détails d'une association spécifique.
   */
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

  /**
   * Activation ou Suspension d'une instance.
   */
  async updateAssociationStatus(id: string, isActive: boolean) {
    await this.prisma.association.update({
      where: { id },
      data: { isActive }
    });
    return { message: `Instance ${isActive ? 'activée' : 'suspendue'} avec succès.` };
  }

  /**
   * Journal d'audit global (Plateforme + Instances).
   */
  async getAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        actorUser: { 
          select: { firstName: true, lastName: true } 
        },
        association: { 
          select: { name: true } 
        }
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

  /**
   * 🔥 DESTRUCTION MASSIVE : Suppression définitive d'une instance.
   */
  async deleteAssociation(id: string) {
    const association = await this.prisma.association.findUnique({ where: { id } });
    if (!association) throw new NotFoundException("Association introuvable.");

    // La suppression en cascade détruira tous les enregistrements liés 
    // (si schema.prisma est correctement configuré avec onDelete: Cascade)
    await this.prisma.association.delete({
      where: { id }
    });

    return { message: `L'association ${association.name} a été détruite définitivement.` };
  }
}