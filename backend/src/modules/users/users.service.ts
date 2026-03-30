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

type RequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

// ── Include étendu : memberships + adminAssignments + virtualCard + profilePhoto
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

    // ⚡ Alignement strict avec ton DTO et ton Schéma Prisma
    if (dto.firstName?.trim()) data.firstName = dto.firstName.trim();
    if (dto.lastName?.trim())  data.lastName  = dto.lastName.trim();
    if (dto.phone               !== undefined) data.phone               = this.normalize(dto.phone);
    if (dto.birthDate           !== undefined) data.birthDate           = dto.birthDate ? new Date(`${dto.birthDate}T00:00:00.000Z`) : null;
    if (dto.placeOfBirth         !== undefined) data.placeOfBirth        = this.normalize(dto.placeOfBirth);
    if (dto.countryOfBirth       !== undefined) data.countryOfBirth      = this.normalize(dto.countryOfBirth);
    if (dto.originSubPrefecture !== undefined) data.originSubPrefecture = this.normalize(dto.originSubPrefecture);
    if (dto.addressLine1         !== undefined) data.addressLine1        = this.normalize(dto.addressLine1);
    if (dto.addressLine2         !== undefined) data.addressLine2        = this.normalize(dto.addressLine2);
    if (dto.postalCode           !== undefined) data.postalCode          = this.normalize(dto.postalCode);
    if (dto.city                 !== undefined) data.city                = this.normalize(dto.city);
    if (dto.country              !== undefined) data.country             = this.normalize(dto.country);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: meUserInclude,
    });

    // ✅ NOTIFICATION
    await this.notifications.createForUser({
      associationId: updatedUser.associationId,
      userId: updatedUser.id,
      message: 'Vos informations de profil ont été mises à jour avec succès.',
      type: NotificationType.SYSTEM_ALERT,
      title: 'Profil mis à jour',
    });

    // ✅ AUDIT
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

  /**
   * Upload de la photo de profil.
   */
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

  // ── Helpers ────────────────────────────────────────────────
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
      originSubPrefecture: user.originSubPrefecture, // 👈 Seul champ d'origine conservé
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      postalCode: user.postalCode,
      city: user.city,
      country: user.country,

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