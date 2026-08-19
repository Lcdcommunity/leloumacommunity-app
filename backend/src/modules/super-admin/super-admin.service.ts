// backend/src/modules/super-admin/super-admin.service.ts
//
// 🔥 AJOUT : getMemberCard() — permet à un super admin de consulter la
// carte de n'importe quel membre de l'association (icône "œil" sur
// super-admin/members/page.tsx). Pas de scope antennaIds ici (contrairement
// à admin.service.ts) : un SUPER_ADMIN voit tous les membres de son
// association, seul associationId sert de garde-fou.
//
// 🔥 CORRIGÉ (updateProject) : deux bugs distincts.
//   1) photoIds n'était pas du tout géré ici (contrairement à
//      admin.service.ts::updateProject) — aucune photo ajoutée ou
//      supprimée depuis l'édition Super Admin n'était jamais persistée.
//   2) La méthode lisait data.budgetAmount / data.amountSpent /
//      data.startDate / data.endDate, alors que le formulaire d'édition
//      (super-admin/projects/page.tsx) envoie budgetPlanned / budgetSpent /
//      startsAt / endsAt — ces champs restaient donc toujours undefined et
//      n'étaient jamais enregistrés. Il manquait aussi entièrement
//      locationText, promoterName, targetBeneficiaries, populationImpact,
//      environmentalImpact, implementationMethod, risksAndMitigation,
//      specificObjectives, expectedResults, successIndicators — tous
//      silencieusement ignorés à chaque modification. Corrigé pour
//      correspondre exactement à ce qu'envoie le formulaire, comme le fait
//      déjà admin.service.ts::updateProject.
//
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
  CurrencyCode,
  PostStatus,
} from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { AuthMailerService } from '../auth/auth.mailer.service';
import { CreateAntennaDto } from './dto/create-antenna.dto';
import { CreateAntennaAdminDto } from './dto/create-antenna-admin.dto';
import { memberMapper } from '../member/member.mapper';
import { NotificationsService } from '../notifications/notifications.service';

const WELCOME_SET_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type PrismaLike = PrismaService | Prisma.TransactionClient;

type InternalAdminPayload = {
  associationId: string;
  antennaIds: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  associationTitle?: string;
  professionalStatus?: string;
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
    private readonly authMailer: AuthMailerService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ── GESTION DES PRIX (RÉÉCRITE POUR UTILISER LA VRAIE TABLE PRICING) ── */

  async getPricingConfig(associationId: string) {
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
    pricingData: Record<string, { monthlyQuota: number; membershipCard: number; expenseValidationThreshold: number | null }>,
    actorId: string,
  ) {
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
    const where: Prisma.AntennaWhereInput = { associationId };

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
      where: { associationId },
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
      where: { id, associationId },
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

    const antenna = await this.prisma.antenna.create({
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

    await this.notifications.notifySuperAdminsWithPush(
      associationId,
      `Une nouvelle antenne "${antenna.name}" a été créée.`,
      NotificationType.SYSTEM_ALERT,
      '🏢 Nouvelle antenne',
    );

    return antenna;
  }

  async updateAntenna(id: string, data: Partial<CreateAntennaDto>, associationId: string) {
    return this.prisma.antenna.update({
      where: { id, associationId },
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
    return this.prisma.antenna.delete({ where: { id, associationId } });
  }

  /* ── USERS ── */

  async listUsersByRole(associationId: string, role: UserRole, page: number, pageSize: number, q?: string, status?: string) {
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {
      associationId,
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
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 🔥 NOUVEAU : consultation de la carte de membre par le super admin
  // (icône "œil" sur super-admin/members/page.tsx). Pas de restriction
  // d'antenne — un SUPER_ADMIN voit tous les membres de son association ;
  // seul associationId protège contre une fuite cross-association.
  async getMemberCard(memberId: string, associationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: memberId, associationId, role: UserRole.MEMBER },
    });
    if (!user) throw new NotFoundException('Membre introuvable.');

    const virtualCard = await this.prisma.virtualCard.findUnique({
      where: { userId: memberId },
      include: {
        user: {
          include: {
            memberships: { include: { antenna: true } },
            profilePhoto: true,
          },
        },
      },
    });

    if (!virtualCard || virtualCard.user.associationId !== associationId) {
      throw new NotFoundException("Ce membre n'a pas encore de carte membre.");
    }

    return {
      cardNumber: virtualCard.cardNumber,
      isLocked: virtualCard.isLocked,
      expiresAt: virtualCard.expiresAt ? virtualCard.expiresAt.toISOString() : null,
      qrToken: virtualCard.qrToken,
      antennaName: virtualCard.user.memberships[0]?.antenna?.name || 'Inconnue',
      user: {
        firstName: virtualCard.user.firstName,
        lastName: virtualCard.user.lastName,
        birthDate: virtualCard.user.birthDate ? virtualCard.user.birthDate.toISOString() : null,
        placeOfBirth: virtualCard.user.placeOfBirth,
        originVillage: virtualCard.user.originSubPrefecture,
        country: virtualCard.user.country,
        city: virtualCard.user.city,
        profilePhotoUrl: virtualCard.user.profilePhoto?.url || null,
        function: virtualCard.user.function,
        professionalStatus: virtualCard.user.professionalStatus,
      },
    };
  }

  /* ── ANTENNA ADMIN — DÉTAIL PAR ID ── */

  async getAntennaAdminById(userId: string, associationId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { id: userId, associationId, role: UserRole.ANTENNA_ADMIN },
      include: {
        adminAssignments: {
          where: { isActive: true },
          include: { antenna: true },
        },
      },
    });

    if (!admin) throw new NotFoundException('Administrateur introuvable.');
    return admin;
  }

  async approveUser(userId: string, adminId: string, associationId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId, associationId },
      data: {
        status: UserStatus.ACTIVE,
        approvedByUserId: adminId,
        approvedAt: new Date(),
      },
    });

    await this.notifications.createForUserWithPush({
      associationId,
      userId: user.id,
      message: `Votre compte a été approuvé. Vous pouvez désormais accéder à toutes les fonctionnalités.`,
      type: NotificationType.ACCOUNT_APPROVED,
      title: 'Compte activé',
      pushTitle: '🎉 Compte activé',
      pushBody: 'Votre compte a été approuvé avec succès.',
    });

    return user;
  }

  async rejectUser(userId: string, adminId: string, reason: string, associationId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId, associationId },
      data: {
        status: UserStatus.REJECTED,
        rejectedByUserId: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.notifications.createForUserWithPush({
      associationId,
      userId: user.id,
      message: `Votre demande d'adhésion a été refusée. Motif : ${reason}`,
      type: NotificationType.ACCOUNT_REJECTED,
      title: 'Demande refusée',
      pushTitle: '❌ Demande refusée',
      pushBody: `Motif : ${reason}`,
    });

    return user;
  }

  async updateUser(userId: string, data: any, associationId: string) {
    return this.prisma.user.update({
      where: { id: userId, associationId },
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
      where: { id: userId, associationId },
      data: {
        status: UserStatus.SUSPENDED,
        suspendedByUserId: actorId,
        suspendedAt: new Date(),
      },
    });

    await this.notifications.createForUserWithPush({
      associationId,
      userId: user.id,
      message: `Votre compte a été suspendu par un administrateur. Veuillez nous contacter pour plus d'informations.`,
      type: NotificationType.ACCOUNT_SUSPENDED,
      title: 'Compte suspendu',
      pushTitle: '⚠️ Compte suspendu',
      pushBody: 'Votre compte a été temporairement suspendu.',
    });

    return user;
  }

  async activateUser(userId: string, actorId: string, associationId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId, associationId },
      data: {
        status: UserStatus.ACTIVE,
        approvedByUserId: actorId,
        approvedAt: new Date(),
        suspendedAt: null,
        suspendedByUserId: null,
      },
    });

    await this.notifications.createForUserWithPush({
      associationId,
      userId: user.id,
      message: `Votre compte a été réactivé avec succès. Bon retour parmi nous !`,
      type: NotificationType.ACCOUNT_APPROVED,
      title: 'Compte réactivé',
      pushTitle: '✅ Compte réactivé',
      pushBody: 'Votre compte est de nouveau actif.',
    });

    return user;
  }

  async deleteUser(userId: string, actorId: string, associationId: string) {
    return this.prisma.user.update({
      where: { id: userId, associationId },
      data: {
        status: UserStatus.DELETED,
        deletedAt: new Date(),
        deletedByUserId: actorId,
      },
    });
  }

  /* ── ANTENNA ADMIN (CRÉATION AVEC VÉRIFICATION DE DEVISE) ── */

  async createAntennaAdmin(data: CreateAntennaAdminDto, actorId: string, associationId: string) {
    const antennas = await this.prisma.antenna.findMany({
      where: { id: { in: data.antennaIds }, associationId },
    });

    if (antennas.length === 0 || antennas.length !== data.antennaIds.length) {
      throw new NotFoundException('Une ou plusieurs antennes sélectionnées sont introuvables.');
    }

    const currencies = new Set(antennas.map(a => a.defaultCurrency));
    if (currencies.size > 1) {
      throw new BadRequestException("Impossible d'assigner des antennes utilisant des devises différentes à un même administrateur.");
    }

    const result = await this.createAntennaAdminRecord(
      this.prisma,
      {
        associationId,
        antennaIds: data.antennaIds,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        associationTitle: data.associationTitle || data.function,
        professionalStatus: data.professionalStatus,
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

    const antennaNames = antennas.map(a => a.name).join(', ');

    await this.notifications.createForUserWithPush({
      associationId,
      userId: result.user.id,
      message: `Bienvenue ! Vous avez été nommé administrateur pour : ${antennaNames}.`,
      type: NotificationType.SYSTEM_ALERT,
      title: 'Promotion Admin',
      pushTitle: '👑 Promotion Admin',
      pushBody: `Vous êtes maintenant administrateur.`,
    });

    if (data.sendInvite !== false) {
      const association = await this.prisma.association.findUnique({
        where: { id: associationId },
        select: { name: true, domainName: true },
      });

      const base = association?.domainName
        ? `https://${association.domainName.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
        : (process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const setPasswordUrl = `${base}/reset-password?token=${encodeURIComponent(result.rawToken)}&welcome=1`;

      await this.authMailer.sendWelcomeSetPasswordEmail({
        to: result.user.email,
        firstName: result.user.firstName,
        associationName: association?.name ?? antennaNames,
        setPasswordUrl,
        antennaName: antennaNames,
        associationTitle: data.associationTitle || data.function,
      });
    }

    return this.prisma.user.findUnique({
      where: { id: result.user.id },
      include: { adminAssignments: { include: { antenna: true } } },
    });
  }

  async updateAntennaAdmin(userId: string, data: Partial<CreateAntennaAdminDto>, actorId: string, associationId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { id: userId, associationId, role: UserRole.ANTENNA_ADMIN },
    });

    if (!admin) throw new NotFoundException('Administrateur introuvable.');

    if (data.antennaIds && data.antennaIds.length > 0) {
      const antennas = await this.prisma.antenna.findMany({
        where: { id: { in: data.antennaIds }, associationId },
      });

      if (antennas.length !== data.antennaIds.length) {
        throw new NotFoundException('Une ou plusieurs antennes sélectionnées sont introuvables.');
      }

      const currencies = new Set(antennas.map(a => a.defaultCurrency));
      if (currencies.size > 1) {
        throw new BadRequestException("Impossible d'assigner des antennes utilisant des devises différentes à un même administrateur.");
      }

      const newAntennaIds = data.antennaIds;

      await this.prisma.$transaction(async (tx) => {
        const existingAssignments = await tx.antennaAdminAssignment.findMany({
          where: { adminUserId: userId, associationId },
        });
        const existingByAntenna = new Map(existingAssignments.map(a => [a.antennaId, a]));

        const toDeactivate = existingAssignments
          .filter(a => a.isActive && !newAntennaIds.includes(a.antennaId))
          .map(a => a.id);

        if (toDeactivate.length > 0) {
          await tx.antennaAdminAssignment.updateMany({
            where: { id: { in: toDeactivate } },
            data: { isActive: false, revokedAt: new Date(), revokedByUserId: actorId },
          });
        }

        for (const antennaId of newAntennaIds) {
          const existing = existingByAntenna.get(antennaId);
          if (existing) {
            if (!existing.isActive) {
              await tx.antennaAdminAssignment.update({
                where: { id: existing.id },
                data: {
                  isActive: true,
                  revokedAt: null,
                  revokedByUserId: null,
                  assignedByUserId: actorId,
                  isPrimaryManager: true,
                },
              });
            }
          } else {
            await tx.antennaAdminAssignment.create({
              data: {
                associationId,
                antennaId,
                adminUserId: userId,
                assignedByUserId: actorId,
                isPrimaryManager: true,
                isActive: true,
              },
            });
          }
        }
      });
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
        ...(data.originSubPrefecture !== undefined ? { originSubPrefecture: data.originSubPrefecture } : {}),
        ...(data.addressLine1 !== undefined ? { addressLine1: data.addressLine1 } : {}),
        ...(data.addressLine2 !== undefined ? { addressLine2: data.addressLine2 } : {}),
        ...(data.function !== undefined || data.associationTitle !== undefined ? { function: data.function || data.associationTitle } : {}),
        ...(data.professionalStatus !== undefined ? { professionalStatus: data.professionalStatus } : {}),
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
      associationId,
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

  // 🔥 AJOUT : export PDF d'un projet — route manquante côté Super Admin.
  // Le frontend (super-admin/projects/page.tsx) appelait déjà
  // GET /super-admin/projects/:id/export, mais ni le controller ni le
  // service n'exposaient cette méthode : la requête tombait sur une route
  // inexistante (404), d'où "Impossible de télécharger le PDF. Vérifiez
  // votre connexion." alors que l'équivalent Admin fonctionnait. Même
  // génération que admin.service.ts::exportProjectPdf, adaptée au scope
  // Super Admin (associationId seul, pas de restriction antennaIds — un
  // SUPER_ADMIN peut exporter n'importe quel projet de son association).
  async exportProjectPdf(projectId: string, associationId: string): Promise<Buffer> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, associationId },
      include: { attachments: { include: { file: true } } },
    });

    if (!project) throw new NotFoundException('Projet introuvable.');

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

        addSection("Méthode d'Implémentation", project.implementationMethod);
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

  // 🔥 CORRIGÉ : deux bugs distincts (cf. commentaire en tête de fichier).
  // 1) noms de champs alignés sur ce qu'envoie réellement le formulaire
  //    d'édition (budgetPlanned/budgetSpent/startsAt/endsAt, pas
  //    budgetAmount/amountSpent/startDate/endDate) + tous les champs texte
  //    manquants (locationText, promoterName, targetBeneficiaries, etc.).
  // 2) photoIds désormais géré : deleteMany s'exécute dès que photoIds est
  //    fourni, même vide (toutes les photos retirées) — même correctif que
  //    admin.service.ts::updateProject.
  async updateProject(id: string, data: any, associationId: string) {
    let safeStatus = data.status;
    if (safeStatus === 'DRAFT')            safeStatus = ProjectStatus.PROPOSED;
    if (safeStatus === 'PENDING_APPROVAL') safeStatus = ProjectStatus.UNDER_REVIEW;
    if (safeStatus === 'SUSPENDED')        safeStatus = ProjectStatus.ON_HOLD;

    const updated = await this.prisma.project.update({
      where: { id, associationId },
      data: {
        title:                data.title,
        summary:              data.summary,
        description:          data.description,
        locationText:         data.locationText,
        promoterName:         data.promoterName,
        targetBeneficiaries:  data.targetBeneficiaries,
        populationImpact:     data.populationImpact,
        environmentalImpact:  data.environmentalImpact,
        implementationMethod: data.implementationMethod,
        risksAndMitigation:   data.risksAndMitigation,
        specificObjectives:   data.specificObjectives,
        expectedResults:      data.expectedResults,
        successIndicators:    data.successIndicators,
        status: safeStatus,
        startDate: data.startsAt !== undefined ? (data.startsAt ? new Date(data.startsAt) : null) : undefined,
        endDate:   data.endsAt   !== undefined ? (data.endsAt   ? new Date(data.endsAt)   : null) : undefined,
        budgetAmount: data.budgetPlanned !== undefined ? (data.budgetPlanned ? new Prisma.Decimal(data.budgetPlanned) : null) : undefined,
        amountSpent:  data.budgetSpent   !== undefined ? (data.budgetSpent   ? new Prisma.Decimal(data.budgetSpent)   : null) : undefined,
      },
    });

    if (Array.isArray(data.photoIds)) {
      await this.prisma.projectAttachment.deleteMany({ where: { projectId: id } });
      if (data.photoIds.length > 0) {
        await this.prisma.projectAttachment.createMany({
          data: data.photoIds.map((fileId: string) => ({ projectId: id, fileId })),
        });
      }
    }

    return updated;
  }

  async deleteProject(id: string, associationId: string) {
    return this.prisma.project.delete({ where: { id, associationId } });
  }

  /* ── DOCUMENTS ── */

  async createDocument(data: CreateDocumentInput, actorId: string, associationId: string) {
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
      associationId,
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

  /* ── GESTION DES ANNONCES ── */

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
        scope: 'GLOBAL',
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
      await this.prisma.newsPostAttachment.deleteMany({ where: { newsPostId: contentId } });
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
      associationId,
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

    const randomPlaceholderPassword = randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(randomPlaceholderPassword, 10);
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
        city: payload.city,
        country: payload.country,
        postalCode: payload.postalCode,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        originSubPrefecture: payload.originSubPrefecture,
        function: payload.associationTitle,
        professionalStatus: payload.professionalStatus,
        createdByUserId: actorId,
        approvedByUserId: actorId,
        approvedAt: now,
      },
    });

    const assignments = payload.antennaIds.map(id => ({
      associationId: payload.associationId,
      antennaId: id,
      adminUserId: user.id,
      assignedByUserId: actorId,
      isPrimaryManager: true,
      isActive: true,
    }));

    await prisma.antennaAdminAssignment.createMany({ data: assignments });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        associationId: payload.associationId,
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + WELCOME_SET_PASSWORD_TTL_MS),
      },
    });

    return { user, rawToken };
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