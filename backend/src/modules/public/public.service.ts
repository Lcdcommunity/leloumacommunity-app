// backend/src/modules/public/public.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { UserStatus, NotificationType, UserRole, TokenType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

export interface SignupDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  antennaId: string;
  city?: string;
  country?: string;
  addressLine1?: string;
  addressLine2?: string;
  originSubPrefecture?: string; 
  placeOfBirth?: string;
  // Ajouts pour synchroniser avec le FormData du frontend
  birthDate?: string;
  birthCountry?: string;
  postalCode?: string;
  function?: string;
  professionalStatus?: string;
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailer: AuthMailerService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Inscription d'un nouveau membre via le formulaire public
   */
  async signup(dto: SignupDto, avatar?: Express.Multer.File) {
    // Sécurité anti-crash au cas où le payload est mal formaté
    if (!dto.email) {
      throw new BadRequestException('L\'adresse email est obligatoire.');
    }

    const emailLower = dto.email.toLowerCase().trim();

    // 1. Vérifier si l'email existe déjà (toutes associations confondues)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      throw new BadRequestException('Un compte existe déjà avec cette adresse email.');
    }

    // 2. Vérifier que l'antenne existe
    const antenna = await this.prisma.antenna.findUnique({
      where: { id: dto.antennaId },
      include: { association: { include: { logoFile: true } } }
    });

    if (!antenna) {
      throw new BadRequestException('L\'antenne sélectionnée est introuvable.');
    }

    // 3. Hasher le mot de passe
    if (!dto.password) {
      throw new BadRequestException('Le mot de passe est obligatoire.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // TODO: Si tu disposes d'un FileService (S3/Cloudinary), uploader 'avatar' ici
    // et récupérer l'ID du fichier pour l'affecter à 'profilePhotoFileId' ci-dessous.
    // let profilePhotoFileId = null;
    // if (avatar) {
    //   profilePhotoFileId = await this.fileService.upload(avatar);
    // }

    // 4. Création atomique (Utilisateur + Membership + Notification)
    const user = await this.prisma.user.create({
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
        // profilePhotoFileId: profilePhotoFileId,
        
        // Conversion de la date (qui arrive en YYYY-MM-DD depuis le front)
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,

        role: UserRole.MEMBER,
        status: UserStatus.EMAIL_UNVERIFIED, 
        associationId: antenna.associationId, 
        memberships: {
          create: {
            antennaId: antenna.id,
            associationId: antenna.associationId,
            isPrimary: true,
          },
        },
      },
    });

    // Notification système pour le Super Admin (suivi des inscriptions)
    await this.notifications.notifySuperAdmins(
      antenna.associationId,
      `Nouvelle inscription (email non vérifié) : ${user.firstName} ${user.lastName}.`,
      NotificationType.SYSTEM_ALERT,
    );

    // 5. Gestion du Token de vérification
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Valable 24h

    await this.prisma.authToken.create({
      data: {
        associationId: antenna.associationId,
        userId: user.id,
        email: user.email,
        type: TokenType.EMAIL_VERIFICATION,
        tokenHash,
        expiresAt,
      },
    });

    // 6. Envoi de l'email via le service mailer (Marque blanche)
    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontUrl.replace(/\/$/, '')}/verify-email?token=${rawToken}`;

    await this.authMailer.sendVerificationEmail({
      to: user.email,
      verifyUrl,
      appName: antenna.association.name,
      logoUrl: antenna.association.logoFile?.url
    });

    return {
      id: user.id,
      message: 'Inscription enregistrée. Veuillez vérifier votre boîte mail pour confirmer votre adresse.',
    };
  }

  /**
   * Vérification du jeton d'email (Tolérant aux doubles-appels)
   */
  async verifyEmailToken(rawToken: string) {
    if (!rawToken) throw new BadRequestException('Token manquant.');

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    // 1. On cherche le token SANS filtrer sur "consumedAt: null" pour pouvoir analyser la situation
    const authToken = await this.prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: TokenType.EMAIL_VERIFICATION,
      },
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

    // 2. GESTION DU DOUBLE-APPEL (La magie opère ici ✨)
    if (authToken.consumedAt) {
      // Si le token est déjà consommé, on vérifie le statut de l'utilisateur.
      // S'il n'est plus "EMAIL_UNVERIFIED", c'est que le premier appel a réussi juste avant !
      if (user.status !== UserStatus.EMAIL_UNVERIFIED) {
        return { emailVerified: true, alreadyVerified: true }; // On renvoie un succès silencieux
      }
      throw new BadRequestException('Ce lien a déjà été utilisé.');
    }

    // 3. Traitement normal (Le tout premier appel)
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

    // Notification aux Admins d'antenne pour validation finale du compte
    if (primaryAntennaId) {
      await this.notifications.notifyAntennaAdmins(
        primaryAntennaId,
        user.associationId,
        `Nouveau membre à valider : ${user.firstName} ${user.lastName} a vérifié son email.`,
        NotificationType.SYSTEM_ALERT,
      );
    }

    return { emailVerified: true };
  }
}