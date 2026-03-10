// backend/src/modules/public/public.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';

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
}

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authMailer: AuthMailerService, // 👈 Injection du service mail
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
        role: 'MEMBER',
        // Statut défini sur EMAIL_UNVERIFIED comme prévu dans le schema.prisma
        status: 'EMAIL_UNVERIFIED', 
        associationId: antenna.associationId, 
        
        memberships: {
          create: {
            antennaId: antenna.id,
            associationId: antenna.associationId,
          },
        },
      },
    });

    // 5. Générer un token sécurisé pour la vérification
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Le lien expire dans 24 heures

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
}