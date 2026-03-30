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
  async signup(dto: SignupDto) {
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
        originSubPrefecture: dto.originSubPrefecture,
        placeOfBirth: dto.placeOfBirth,
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
   * Vérification du jeton d'email
   */
  async verifyEmailToken(rawToken: string) {
    if (!rawToken) throw new BadRequestException('Token manquant.');

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const authToken = await this.prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: TokenType.EMAIL_VERIFICATION,
        consumedAt: null,
        expiresAt: { gt: new Date() },
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
      throw new BadRequestException('Le lien de vérification est invalide ou a expiré.');
    }

    const user = authToken.user;
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