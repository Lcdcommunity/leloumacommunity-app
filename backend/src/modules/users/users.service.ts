// backend/src/modules/users/users.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcryptjs'; // 👈 CORRECTION ICI : bcryptjs au lieu de bcrypt

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

const meUserInclude = Prisma.validator<Prisma.UserInclude>()({
  memberships: {
    include: { antenna: true },
    orderBy: { createdAt: 'asc' },
  },
  adminAssignments: {
    include: { antenna: true },
  },
  virtualCard: true,
  profilePhoto: true,
});

type MeUserPayload = Prisma.UserGetPayload<{
  include: typeof meUserInclude;
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly notifications: NotificationsService,
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: meUserInclude,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.toMeResponse(user);
  }

  async updateMe(userId: string, associationId: string, dto: UpdateMeDto, meta?: RequestMeta) {
    const existingUser = await this.prisma.user.findFirst({
      where: { id: userId, associationId },
      include: meUserInclude,
    });
    if (!existingUser) throw new NotFoundException('Utilisateur introuvable');

    const data: Prisma.UserUpdateInput = {};

    if (dto.firstName?.trim()) data.firstName = dto.firstName.trim();
    if (dto.lastName?.trim())  data.lastName  = dto.lastName.trim();
    if (dto.phone               !== undefined) data.phone               = this.normalize(dto.phone);
    if (dto.birthDate           !== undefined) data.birthDate           = dto.birthDate ? new Date(dto.birthDate) : null;
    if (dto.placeOfBirth        !== undefined) data.placeOfBirth        = this.normalize(dto.placeOfBirth);
    if (dto.countryOfBirth      !== undefined) data.countryOfBirth      = this.normalize(dto.countryOfBirth);
    if (dto.originSubPrefecture !== undefined) data.originSubPrefecture = this.normalize(dto.originSubPrefecture);
    if (dto.addressLine1        !== undefined) data.addressLine1        = this.normalize(dto.addressLine1);
    if (dto.addressLine2        !== undefined) data.addressLine2        = this.normalize(dto.addressLine2);
    if (dto.postalCode          !== undefined) data.postalCode          = this.normalize(dto.postalCode);
    if (dto.city                !== undefined) data.city                = this.normalize(dto.city);
    if (dto.country             !== undefined) data.country             = this.normalize(dto.country);

    if (dto.function            !== undefined) data.function            = this.normalize(dto.function);
    if (dto.professionalStatus  !== undefined) data.professionalStatus  = this.normalize(dto.professionalStatus);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: meUserInclude,
    });

    // 🔥 AJOUT CHIRURGICAL : Upgrade en createForUserWithPush
    if (updatedUser.associationId) {
      await this.notifications.createForUserWithPush({
        associationId: updatedUser.associationId,
        userId: updatedUser.id,
        message: 'Vos informations de profil ont été mises à jour avec succès.',
        type: NotificationType.SYSTEM_ALERT,
        title: 'Profil mis à jour',
        pushTitle: '📝 Profil mis à jour',
        pushBody: 'Vos informations personnelles ont bien été enregistrées.',
      });
    }

    await this.auditService.create({
      associationId: updatedUser.associationId,
      actorUserId: updatedUser.id,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: updatedUser.id,
      targetUserId: updatedUser.id,
      details: { updatedFields: Object.keys(dto) },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.toMeResponse(updatedUser);
  }

  // ⚡ MÉTHODE POUR CHANGER LE MOT DE PASSE
  async updatePassword(userId: string, newPasswordRaw: string) {
    // 1. Récupérer l'utilisateur pour avoir son associationId (requis pour la notification)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPasswordRaw, saltRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // 🔥 AJOUT CHIRURGICAL : Alerte de sécurité (In-App + Push)
    if (user.associationId) {
      await this.notifications.createForUserWithPush({
        associationId: user.associationId,
        userId: user.id,
        type: NotificationType.SYSTEM_ALERT,
        title: 'Sécurité du compte',
        message: 'Votre mot de passe a été modifié avec succès. Si vous n\'êtes pas à l\'origine de cette action, contactez un administrateur immédiatement.',
        pushTitle: '🔒 Mot de passe modifié',
        pushBody: 'Le mot de passe de votre compte vient d\'être changé.',
      });
    }

    return { message: 'Mot de passe mis à jour avec succès' };
  }

  async uploadProfilePhoto(
    userId: string,
    associationId: string,
    file: Express.Multer.File,
    meta?: RequestMeta,
  ) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, associationId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Fichier vide ou invalide');
    }

    try {
      const cloudinaryRes = await this.cloudinaryService.uploadFile(file);

      const result = await this.prisma.$transaction(async (tx) => {
        const createdFileAsset = await tx.fileAsset.create({
          data: {
            associationId,
            uploadedByUserId: user.id,
            storageProvider: 'cloudinary',
            storageKey: cloudinaryRes.public_id,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: BigInt(file.size),
            checksumSha256: 'cloudinary-managed',
            category: 'PROFILE_PHOTO',
            visibility: 'PUBLIC',
            url: cloudinaryRes.secure_url,
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { profilePhotoFileId: createdFileAsset.id },
          include: meUserInclude,
        });

        return { createdFileAsset, updatedUser };
      });

      return {
        message: 'Photo de profil mise à jour avec succès',
        avatarUrl: result.updatedUser.profilePhoto?.url ?? null,
        user: this.toMeResponse(result.updatedUser),
      };
    } catch (error) {
      throw new BadRequestException("Échec de l'upload vers Cloudinary.");
    }
  }

  private normalize(value: string | undefined): string | null | undefined {
    if (value === undefined) return undefined;
    const t = value.trim();
    return t.length > 0 ? t : null;
  }

  private toMeResponse(user: MeUserPayload) {
    const primaryMembership =
      user.memberships.find((m) => m.isPrimary) ?? user.memberships[0] ?? null;

    const adminAntenna = (user as any).adminAssignments?.[0]?.antenna ?? null;
    const memberAntenna = primaryMembership?.antenna ?? null;
    const antenna = memberAntenna ?? adminAntenna;

    const photoUrl = user.profilePhoto?.url ?? null;

    return {
      id: user.id,
      associationId: user.associationId,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
      placeOfBirth: user.placeOfBirth,
      countryOfBirth: user.countryOfBirth,
      originSubPrefecture: user.originSubPrefecture,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      postalCode: user.postalCode,
      city: user.city,
      country: user.country,

      function: user.function, 
      professionalStatus: user.professionalStatus,

      avatarUrl: photoUrl,
      profilePhotoUrl: photoUrl,

      antenna: antenna
        ? {
            id: antenna.id,
            name: antenna.name,
            code: antenna.code,
            membershipStatus: primaryMembership?.status ?? 'ACTIVE',
            city: antenna.city ?? null,
            country: antenna.country ?? null,
            defaultCurrency: antenna.defaultCurrency ?? null,
          }
        : null,

      virtualCard: user.virtualCard
        ? {
            id: user.virtualCard.id,
            cardNumber: user.virtualCard.cardNumber,
            isLocked: user.virtualCard.isLocked,
            expiresAt: user.virtualCard.expiresAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}