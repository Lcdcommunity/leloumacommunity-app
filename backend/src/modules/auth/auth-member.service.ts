// backend/src/modules/auth/auth-member.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MemberSignupDto } from './dto/member-signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { UserRole, UserStatus, TokenType } from '@prisma/client';
import { AuthMailerService } from './auth.mailer.service';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from '../uploads/cloudinary.service'; // ⚡ AJOUT CHIRURGICAL

@Injectable()
export class AuthMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailer: AuthMailerService,
    private readonly config: ConfigService,
    private readonly cloudinaryService: CloudinaryService, // ⚡ AJOUT CHIRURGICAL
  ) {}

  private getFrontendBaseUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  async memberSignup(dto: MemberSignupDto, file?: Express.Multer.File): Promise<{ message: string }> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const antenna = await this.prisma.antenna.findUnique({
      where: { id: dto.antennaId },
      include: { 
        association: { include: { logoFile: true } } 
      },
    });

    if (!antenna || !antenna.isActive) {
      throw new BadRequestException('Antenne invalide ou inactive.');
    }

    // ⚡ TRAITEMENT DE L'IMAGE SI ELLE EXISTE
    let fileAssetData: any = null;
    if (file) {
      const cloudinaryRes = await this.cloudinaryService.uploadFile(file);
      fileAssetData = {
        storageProvider: 'cloudinary',
        storageKey: cloudinaryRes.public_id,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        category: 'PROFILE_PHOTO',
        visibility: 'PUBLIC',
        url: cloudinaryRes.secure_url,
      };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = randomUUID() + randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    await this.prisma.$transaction(async (tx) => {
      let profilePhotoFileId: string | null = null;

      // Création du FileAsset avant l'utilisateur s'il y a une photo
      if (fileAssetData) {
        const createdFileAsset = await tx.fileAsset.create({
          data: {
            associationId: antenna.associationId,
            ...fileAssetData,
          },
        });
        profilePhotoFileId = createdFileAsset.id;
      }

      const newUser = await tx.user.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          phone: dto.phone?.trim() || null,
          passwordHash,
          role: UserRole.MEMBER,
          status: UserStatus.EMAIL_UNVERIFIED,
          associationId: antenna.associationId,
          city: dto.city?.trim() || null,
          country: dto.country?.trim() || null,
          addressLine1: dto.addressLine1?.trim() || null,
          addressLine2: dto.addressLine2?.trim() || null,
          termsAcceptedAt: new Date(), 

          // ⚡ NOUVEAUX CHAMPS SYNCHRONISÉS
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
          function: dto.function?.trim() || null,
          professionalStatus: dto.professionalStatus?.trim() || null,
          originSubPrefecture: dto.originSubPrefecture?.trim() || null,
          placeOfBirth: dto.placeOfBirth?.trim() || null,
          countryOfBirth: dto.birthCountry?.trim() || null,
          postalCode: dto.postalCode?.trim() || null,
          profilePhotoFileId,
        },
      });

      // Lier l'uploader au FileAsset après la création du User
      if (profilePhotoFileId) {
        await tx.fileAsset.update({
          where: { id: profilePhotoFileId },
          data: { uploadedByUserId: newUser.id },
        });
      }

      await tx.membership.create({
        data: {
          associationId: antenna.associationId,
          userId: newUser.id,
          antennaId: antenna.id,
          isPrimary: true,
        },
      });

      await tx.authToken.create({
        data: {
          associationId: antenna.associationId,
          userId: newUser.id,
          email,
          type: TokenType.EMAIL_VERIFICATION,
          tokenHash: verificationToken,
          expiresAt: tokenExpiresAt,
        },
      });
    });

    // 🚀 ENVOI DU MAIL DE VÉRIFICATION
    const front = this.getFrontendBaseUrl();
    const verifyUrl = `${front}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    await this.authMailer.sendVerificationEmail({
      to: email,
      verifyUrl,
      appName: antenna.association.name,
      logoUrl: antenna.association.logoFile?.url,
    });

    return {
      message: 'Inscription enregistrée. Veuillez vérifier votre adresse email pour continuer.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string; emailVerified: boolean }> {
    const tokenRecord = await this.prisma.authToken.findUnique({
      where: { tokenHash: dto.token },
      include: {
        user: { select: { id: true, emailVerifiedAt: true } }
      }
    });

    if (!tokenRecord || tokenRecord.type !== TokenType.EMAIL_VERIFICATION) {
      throw new BadRequestException('Lien de vérification invalide.');
    }

    if (!tokenRecord.user) {
       throw new BadRequestException('Utilisateur introuvable.');
    }

    if (tokenRecord.user.emailVerifiedAt) {
      return { message: 'Email déjà vérifié.', emailVerified: true };
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Lien de vérification expiré.');
    }

    if (tokenRecord.consumedAt) {
        throw new BadRequestException('Ce lien a déjà été utilisé.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: UserStatus.PENDING_APPROVAL,
        },
      });

      await tx.authToken.update({
        where: { id: tokenRecord.id },
        data: { consumedAt: new Date() },
      });
    });

    return {
      message: 'Email vérifié avec succès. Votre compte est en attente de validation par un administrateur.',
      emailVerified: true,
    };
  }
}