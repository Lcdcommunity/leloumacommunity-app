// backend/src/modules/public/public.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

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
  constructor(private readonly prisma: PrismaService) {}

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
        status: 'PENDING_APPROVAL', 
        associationId: antenna.associationId, 
        
        // 👇 CORRECTION CHIRURGICALE ICI 👇
        // Remplacement de "userAntennas" par "memberships" pour respecter le schema
        // Ajout de "associationId" requis par le modèle Membership
        memberships: {
          create: {
            antennaId: antenna.id,
            associationId: antenna.associationId,
          },
        },
      },
    });

    return {
      id: user.id,
      message: 'Inscription réussie. Vérifiez votre email.',
    };
  }
}