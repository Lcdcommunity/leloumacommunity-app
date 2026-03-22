// backend/src/modules/users/users.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { CloudinaryService } from '../uploads/cloudinary.service';

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
  ) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: meUserInclude,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.toMeResponse(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto, meta?: RequestMeta) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: meUserInclude,
    });
    if (!existingUser) throw new NotFoundException('Utilisateur introuvable');

    const data: Prisma.UserUpdateInput = {};

    if (dto.firstName?.trim()) data.firstName = dto.firstName.trim();
    if (dto.lastName?.trim())  data.lastName  = dto.lastName.trim();
    if (dto.phone              !== undefined) data.phone              = this.normalize(dto.phone);
    if (dto.originSubPrefecture !== undefined) data.originSubPrefecture = this.normalize(dto.originSubPrefecture);
    if (dto.birthDate          !== undefined) data.birthDate          = dto.birthDate ? new Date(`${dto.birthDate}T00:00:00.000Z`) : null;
    if (dto.placeOfBirth       !== undefined) data.placeOfBirth       = this.normalize(dto.placeOfBirth);
    if (dto.countryOfBirth     !== undefined) data.countryOfBirth     = this.normalize(dto.countryOfBirth);
    if (dto.addressLine1       !== undefined) data.addressLine1       = this.normalize(dto.addressLine1);
    if (dto.addressLine2       !== undefined) data.addressLine2       = this.normalize(dto.addressLine2);
    if (dto.postalCode         !== undefined) data.postalCode         = this.normalize(dto.postalCode);
    if (dto.city               !== undefined) data.city               = this.normalize(dto.city);
    if (dto.country            !== undefined) data.country            = this.normalize(dto.country);

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
      metadata: { updatedFields: Object.keys(dto) },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return this.toMeResponse(updatedUser);
  }

  /**
   * Upload de la photo de profil vers Cloudinary.
   * Appelé par POST /users/me/avatar  (champ "avatar")
   *         et POST /users/me/profile-photo (champ "file")
   */
  async uploadProfilePhoto(
    userId: string,
    file: Express.Multer.File,
    meta?: RequestMeta,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Fichier vide ou invalide');
    }

    try {
      // 1. Upload Cloudinary
      const cloudinaryRes = await this.cloudinaryService.uploadFile(file);

      // 2. Transaction : FileAsset + mise à jour user
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
            url: cloudinaryRes.secure_url,
            metadata: {
              purpose: 'member-profile-photo',
              cloudinary_version: cloudinaryRes.version,
            },
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: { profilePhotoFileId: createdFileAsset.id },
          include: meUserInclude,
        });

        return { createdFileAsset, updatedUser };
      });

      // 3. Audit
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

      const profile = this.toMeResponse(result.updatedUser);

      return {
        message: 'Photo de profil mise à jour avec succès',
        profilePhotoUrl: result.updatedUser.profilePhoto?.url ?? null,
        // ← avatarUrl retourné pour que la Topbar et la page profil l'affichent
        avatarUrl: result.updatedUser.profilePhoto?.url ?? null,
        user: profile,
      };
    } catch (error) {
      console.error('🚨 ERREUR RÉELLE UPLOAD :', error);
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

    // L'antenne peut venir de l'adhésion (MEMBER) ou de l'assignment (ANTENNA_ADMIN)
    const adminAntenna = (user as any).adminAssignments?.[0]?.antenna ?? null;
    const memberAntenna = primaryMembership?.antenna ?? null;
    const antenna = memberAntenna ?? adminAntenna;

    // URL de la photo — champ unifié avatarUrl + alias profilePhotoUrl
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
      originVillage: user.originSubPrefecture,
      originSubPrefecture: user.originSubPrefecture,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      postalCode: user.postalCode,
      city: user.city,
      country: user.country,

      // ── Photo ──
      /** URL principale retournée après upload et dans getMe() */
      avatarUrl: photoUrl,
      /** Alias conservé pour rétrocompatibilité */
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

      adminAssignments:
        (user as any).adminAssignments?.map((a: any) => ({
          antenna: a.antenna
            ? {
                name: a.antenna.name,
                code: a.antenna.code,
                city: a.antenna.city ?? null,
                country: a.antenna.country ?? null,
                defaultCurrency: a.antenna.defaultCurrency ?? null,
              }
            : null,
        })) ?? null,

      virtualCard: user.virtualCard
        ? {
            id: user.virtualCard.id,
            cardNumber: user.virtualCard.cardNumber,
            isLocked: user.virtualCard.isLocked,
            expiresAt: user.virtualCard.expiresAt?.toISOString() ?? null,
            qrToken: user.virtualCard.qrToken,
          }
        : null,
    };
  }
}