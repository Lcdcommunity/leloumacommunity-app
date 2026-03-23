// backend/src/modules/public/public.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { UserStatus, NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service'; // Ajouté

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
    private readonly notifications: NotificationsService, // Injecté chirurgicalement
  ) {}

  async signup(dto: SignupDto) {
    const emailLower = dto.email.toLowerCase().trim();

    // 1. Vérifier si l'email existe déjà
    const existingUser = await this.prisma.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      throw new BadRequestException('Un compte existe déjà avec cet email.');
    }

    // 2. Vérifier que l'antenne existe et récupérer son associationId
    const antenna = await this.prisma.antenna.findUnique({
      where: { id: dto.antennaId },
    });

    if (!antenna) {
      throw new BadRequestException('L\'antenne sélectionnée est introuvable.');
    }

    // 3. Hasher le mot de passe s'il est fourni
    let passwordHash = '';
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    // 4. Créer l'utilisateur en base de données
    const user = await this.prisma.user.create({
      data: {
        email: emailLower,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        city: dto.city,
        country: dto.country,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        originSubPrefecture: dto.originSubPrefecture,
        placeOfBirth: dto.placeOfBirth,
        role: 'MEMBER',
        status: 'EMAIL_UNVERIFIED', 
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

    // ✅ NOTIFICATION : Informer le Super Admin d'une nouvelle inscription (pour suivi)
    await this.notifications.notifySuperAdmins(
      antenna.associationId,
      `Nouvelle inscription en attente de vérification email : ${user.firstName} ${user.lastName} (${emailLower}).`,
      NotificationType.SYSTEM_ALERT,
    );

    // 5. Générer un token sécurisé pour la vérification
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    // 6. Sauvegarder le token dans la table AuthToken
    await this.prisma.authToken.create({
      data: {
        associationId: antenna.associationId,
        userId: user.id,
        email: user.email,
        type: 'EMAIL_VERIFICATION',
        tokenHash,
        expiresAt,
      },
    });

    // 7. Construire le lien et envoyer l'email de vérification
    const frontUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontUrl.replace(/\/$/, '')}/verify-email?token=${rawToken}`;

    await this.authMailer.sendVerificationEmail({
      to: user.email,
      verifyUrl,
    });

    return {
      id: user.id,
      message: 'Inscription réussie. Vérifiez votre email.',
    };
  }

  async verifyEmailToken(rawToken: string) {
    if (!rawToken) {
      throw new BadRequestException('Token manquant.');
    }

    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const authToken = await this.prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: 'EMAIL_VERIFICATION',
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
    const primaryAntenna = user.memberships[0]?.antenna;

    // On invalide le token et on passe le membre en attente de validation admin
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

    // ✅ NOTIFICATION : Notifier les admins de l'antenne qu'un membre a validé son email et attend son approbation
    if (primaryAntenna) {
      await this.notifications.notifyAntennaAdmins(
        primaryAntenna.id,
        user.associationId,
        `Nouveau membre en attente d'approbation : ${user.firstName} ${user.lastName} a vérifié son adresse email.`,
        NotificationType.SYSTEM_ALERT,
      );
    }

    return { emailVerified: true };
  }
}