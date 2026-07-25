// backend/src/modules/public/public.service.ts
import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';
import { MemberSignupDto } from '../auth/dto/member-signup.dto';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { Prisma, UserStatus, NotificationType, UserRole, TokenType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { CloudinaryService } from '../uploads/cloudinary.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailer: AuthMailerService,
    private readonly notifications: NotificationsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Inscription d'un nouveau membre via le formulaire public
   */
  async signup(dto: MemberSignupDto, avatar?: Express.Multer.File) {
    const emailLower = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({ where: { email: emailLower } });
    if (existingUser) {
      throw new BadRequestException('Un compte existe déjà avec cette adresse email.');
    }

    const antenna = await this.prisma.antenna.findUnique({
      where: { id: dto.antennaId },
      include: { association: { include: { logoFile: true } } }
    });

    if (!antenna || !antenna.isActive) {
      throw new BadRequestException("L'antenne sélectionnée est introuvable ou inactive.");
    }

    if (!antenna.association.isActive) {
      throw new BadRequestException("Cette association n'accepte plus de nouvelles inscriptions pour le moment.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    let avatarAsset: {
      storageProvider: string; storageKey: string; originalFilename: string;
      mimeType: string; sizeBytes: bigint; category: 'PROFILE_PHOTO'; visibility: 'PUBLIC'; url: string;
    } | null = null;

    if (avatar) {
      const cloudinaryRes = await this.cloudinaryService.uploadFile(avatar);
      avatarAsset = {
        storageProvider: 'cloudinary',
        storageKey: cloudinaryRes.public_id,
        originalFilename: avatar.originalname,
        mimeType: avatar.mimetype,
        sizeBytes: BigInt(avatar.size),
        category: 'PROFILE_PHOTO',
        visibility: 'PUBLIC',
        url: cloudinaryRes.secure_url,
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    let user: { id: string; email: string; firstName: string; lastName: string };
    try {
      user = await this.prisma.$transaction(async (tx) => {
        let profilePhotoFileId: string | null = null;

        if (avatarAsset) {
          const createdFileAsset = await tx.fileAsset.create({
            data: { associationId: antenna.associationId, ...avatarAsset },
          });
          profilePhotoFileId = createdFileAsset.id;
        }

        const newUser = await tx.user.create({
          data: {
            email: emailLower,
            passwordHash,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            phone: dto.phone,
            city: dto.city,
            country: dto.country,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            postalCode: dto.postalCode,
            originSubPrefecture: dto.originSubPrefecture,
            placeOfBirth: dto.placeOfBirth,
            countryOfBirth: dto.birthCountry,
            function: dto.function,
            professionalStatus: dto.professionalStatus,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
            role: UserRole.MEMBER,
            status: UserStatus.EMAIL_UNVERIFIED,
            associationId: antenna.associationId,
            profilePhotoFileId,
            memberships: {
              create: {
                antennaId: antenna.id,
                associationId: antenna.associationId,
                isPrimary: true,
              },
            },
          },
        });

        if (profilePhotoFileId) {
          await tx.fileAsset.update({
            where: { id: profilePhotoFileId },
            data: { uploadedByUserId: newUser.id },
          });
        }

        await tx.authToken.create({
          data: {
            associationId: antenna.associationId,
            userId: newUser.id,
            email: newUser.email,
            type: TokenType.EMAIL_VERIFICATION,
            tokenHash,
            expiresAt,
          },
        });

        return newUser;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Un compte existe déjà avec cette adresse email.');
      }
      throw err;
    }

    // Non-bloquant à partir d'ici : le compte et le token de vérification existent déjà.
    try {
      await this.notifications.notifySuperAdmins(
        antenna.associationId,
        `Nouvelle inscription (email non vérifié) : ${user.firstName} ${user.lastName}.`,
        NotificationType.SYSTEM_ALERT,
      );
    } catch (notifErr) {
      console.error('Échec de la notification de nouvelle inscription', notifErr);
    }

    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontUrl.replace(/\/$/, '')}/verify-email?token=${rawToken}`;

    try {
      await this.authMailer.sendVerificationEmail({
        to: user.email,
        verifyUrl,
        appName: antenna.association.name,
        logoUrl: antenna.association.logoFile?.url,
      });
    } catch (mailErr) {
      // Le compte existe mais le lien n'est pas parti : sans endpoint de renvoi,
      // la personne reste coincée. À surveiller sérieusement (alerte/log), pas
      // juste à avaler — voir note plus bas.
      console.error(`Échec critique : email de vérification non envoyé à ${user.email}`, mailErr);
    }

    return {
      id: user.id,
      message: 'Inscription enregistrée. Veuillez vérifier votre boîte mail pour confirmer votre adresse.',
    };
  }

  /**
   * Vérification du jeton d'email (tolérant aux doubles-appels)
   */
  async verifyEmailToken(rawToken: string) {
    if (!rawToken) throw new BadRequestException('Token manquant.');

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const authToken = await this.prisma.authToken.findFirst({
      where: { tokenHash, type: TokenType.EMAIL_VERIFICATION },
      include: {
        user: {
          include: {
            memberships: { where: { isPrimary: true }, include: { antenna: true } }
          }
        }
      }
    });

    if (!authToken || !authToken.user) {
      throw new BadRequestException('Le lien de vérification est invalide.');
    }

    if (authToken.expiresAt < new Date()) {
      throw new BadRequestException('Le lien de vérification a expiré.');
    }

    const user = authToken.user;

    if (authToken.consumedAt) {
      if (user.status !== UserStatus.EMAIL_UNVERIFIED) {
        return { emailVerified: true, alreadyVerified: true };
      }
      throw new BadRequestException('Ce lien a déjà été utilisé.');
    }

    const primaryAntennaId = user.memberships[0]?.antennaId;

    await this.prisma.$transaction([
      this.prisma.authToken.update({
        where: { id: authToken.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          status: UserStatus.PENDING_APPROVAL,
        },
      })
    ]);

    if (primaryAntennaId) {
      try {
        await this.notifications.notifyAntennaAdmins(
          primaryAntennaId,
          user.associationId,
          `Nouveau membre à valider : ${user.firstName} ${user.lastName} a vérifié son email.`,
          NotificationType.SYSTEM_ALERT,
        );
      } catch (notifErr) {
        console.error('Échec de la notification de vérification email', notifErr);
      }
    }

    return { emailVerified: true };
  }
}