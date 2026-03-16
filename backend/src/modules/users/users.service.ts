//////// backend/src/modules/users/users.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { CloudinaryService } from '../uploads/cloudinary.service';

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

// Configuration de l'inclusion pour les réponses utilisateur
const meUserInclude = Prisma.validator<Prisma.UserInclude>()({
  memberships: {
    include: {
      antenna: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
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
    private readonly cloudinaryService: CloudinaryService, // Injecté pour le stockage permanent
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: meUserInclude,
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return this.toMeResponse(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto, meta?: RequestMeta) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: meUserInclude,
    });

    if (!existingUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.firstName !== undefined && dto.firstName.trim().length > 0) {
      data.firstName = dto.firstName.trim();
    }
    if (dto.lastName !== undefined && dto.lastName.trim().length > 0) {
      data.lastName = dto.lastName.trim();
    }

    if (dto.phone !== undefined) {
      data.phone = this.normalizeNullableString(dto.phone);
    }

    if (dto.originSubPrefecture !== undefined) {
      data.originSubPrefecture = this.normalizeNullableString(dto.originSubPrefecture);
    }

    if (dto.birthDate !== undefined) {
      data.birthDate = dto.birthDate
        ? new Date(`${dto.birthDate}T00:00:00.000Z`)
        : null;
    }

    if (dto.placeOfBirth !== undefined) {
      data.placeOfBirth = this.normalizeNullableString(dto.placeOfBirth);
    }

    if (dto.countryOfBirth !== undefined) {
      data.countryOfBirth = this.normalizeNullableString(dto.countryOfBirth);
    }

    if (dto.addressLine1 !== undefined) {
      data.addressLine1 = this.normalizeNullableString(dto.addressLine1);
    }

    if (dto.addressLine2 !== undefined) {
      data.addressLine2 = this.normalizeNullableString(dto.addressLine2);
    }

    if (dto.postalCode !== undefined) {
      data.postalCode = this.normalizeNullableString(dto.postalCode);
    }

    if (dto.city !== undefined) {
      data.city = this.normalizeNullableString(dto.city);
    }

    if (dto.country !== undefined) {
      data.country = this.normalizeNullableString(dto.country);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: meUserInclude,
    });

    await this.auditService.create({
      associationId: updatedUser.associationId,
      actorUserId: updatedUser.id,
      action: AuditAction.UPDATE,
      targetModel: 'User',
      targetId: updatedUser.id,
      targetUserId: updatedUser.id,
      summary: 'Mise à jour du profil utilisateur',
      metadata: {
        updatedFields: Object.keys(dto),
      },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.toMeResponse(updatedUser);
  }

  /**
   * Upload de la photo de profil vers Cloudinary (Stockage permanent)
   */
  async uploadProfilePhoto(
    userId: string,
    file: Express.Multer.File,
    meta?: RequestMeta,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Fichier vide ou invalide');
    }

    try {
      // 1. Appel au service Cloudinary pour stockage permanent
      const cloudinaryRes = await this.cloudinaryService.uploadFile(file);

      // 2. Mise à jour en base de données (Neon)
      const result = await this.prisma.$transaction(async (tx) => {
        const createdFileAsset = await tx.fileAsset.create({
          data: {
            associationId: user.associationId,
            uploadedByUserId: user.id,
            storageProvider: 'cloudinary',
            storageKey: cloudinaryRes.public_id,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            sizeBytes: BigInt(file.size),
            checksumSha256: 'cloudinary-managed',
            category: 'PROFILE_PHOTO',
            visibility: 'PUBLIC',
            url: cloudinaryRes.secure_url, // URL permanente HTTPS
            metadata: {
              purpose: 'member-profile-photo',
              cloudinary_version: cloudinaryRes.version,
            },
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            profilePhotoFileId: createdFileAsset.id,
          },
          include: meUserInclude,
        });

        return { createdFileAsset, updatedUser };
      });

      // 3. Audit log
      await this.auditService.create({
        associationId: user.associationId,
        actorUserId: user.id,
        action: AuditAction.UPDATE,
        targetModel: 'User',
        targetId: user.id,
        targetUserId: user.id,
        summary: 'Mise à jour de la photo de profil (Cloudinary)',
        metadata: {
          fileId: result.createdFileAsset.id,
          url: result.createdFileAsset.url,
        },
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
      });

      return {
        message: 'Photo de profil mise à jour avec succès',
        profilePhotoUrl: result.updatedUser.profilePhoto?.url,
        user: this.toMeResponse(result.updatedUser),
      };

    } catch (error) {
      throw new BadRequestException("Échec de l'upload vers Cloudinary.");
    }
  }

  private normalizeNullableString(
    value: string | undefined,
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private toMeResponse(user: MeUserPayload) {
    const primaryMembership =
      user.memberships.find((membership) => membership.isPrimary) ??
      user.memberships[0] ??
      null;

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
      originVillage: user.originSubPrefecture,
      countryOfBirth: user.countryOfBirth,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      postalCode: user.postalCode,
      city: user.city,
      country: user.country,
      profilePhotoUrl: user.profilePhoto?.url ?? null,
      antenna: primaryMembership
        ? {
            id: primaryMembership.antenna.id,
            name: primaryMembership.antenna.name,
            code: primaryMembership.antenna.code,
            membershipStatus: primaryMembership.status,
          }
        : null,
      virtualCard: user.virtualCard
        ? {
            id: user.virtualCard.id,
            cardNumber: user.virtualCard.cardNumber,
            isLocked: user.virtualCard.isLocked,
            expiresAt: user.virtualCard.expiresAt
              ? user.virtualCard.expiresAt.toISOString()
              : null,
            qrToken: user.virtualCard.qrToken,
          }
        : null,
    };
  }
}