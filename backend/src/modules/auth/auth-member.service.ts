//backend/src/modules/auth/auth-member.service.ts
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

@Injectable()
export class AuthMemberService {
  constructor(private readonly prisma: PrismaService) {}

  async memberSignup(dto: MemberSignupDto): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }

    const antenna = await this.prisma.antenna.findUnique({
      where: { id: dto.antennaId },
      select: { id: true, associationId: true, isActive: true },
    });

    if (!antenna || !antenna.isActive) {
      throw new BadRequestException('Antenne invalide ou inactive.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = randomUUID() + randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await this.prisma.$transaction(async (prisma) => {
      const newUser = await prisma.user.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email: dto.email.toLowerCase().trim(),
          phone: dto.phone?.trim() || null,
          passwordHash,
          role: UserRole.MEMBER,
          status: UserStatus.EMAIL_UNVERIFIED,
          associationId: antenna.associationId,
          city: dto.city?.trim() || null,
          country: dto.country?.trim() || null,
          addressLine1: dto.addressLine1?.trim() || null,
          addressLine2: dto.addressLine2?.trim() || null,
        },
      });

      await prisma.membership.create({
        data: {
          associationId: antenna.associationId,
          userId: newUser.id,
          antennaId: antenna.id,
          isPrimary: true,
        },
      });

      await prisma.authToken.create({
        data: {
          associationId: antenna.associationId,
          userId: newUser.id,
          email: newUser.email,
          type: TokenType.EMAIL_VERIFICATION,
          tokenHash: verificationToken,
          expiresAt: tokenExpiresAt,
        },
      });
    });

    return {
      message:
        'Inscription enregistrée. Vérifiez votre email pour activer votre compte, puis attendez la validation de l’administrateur.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string; emailVerified: boolean }> {
    const tokenRecord = await this.prisma.authToken.findUnique({
      where: {
        tokenHash: dto.token,
      },
      include: {
        user: {
          select: { id: true, emailVerifiedAt: true }
        }
      }
    });

    if (!tokenRecord || tokenRecord.type !== TokenType.EMAIL_VERIFICATION) {
      throw new BadRequestException('Token de vérification invalide.');
    }

    if (!tokenRecord.user) {
       throw new BadRequestException('Utilisateur introuvable pour ce token.');
    }

    if (tokenRecord.user.emailVerifiedAt) {
      return {
        message: 'Email déjà vérifié.',
        emailVerified: true,
      };
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Lien de vérification expiré.');
    }

    if (tokenRecord.consumedAt) {
        throw new BadRequestException('Ce lien de vérification a déjà été utilisé.');
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.user.update({
        where: { id: tokenRecord.user!.id },
        data: {
          emailVerifiedAt: new Date(),
          status: UserStatus.PENDING_APPROVAL,
        },
      });

      await prisma.authToken.update({
        where: { id: tokenRecord.id },
        data: {
          consumedAt: new Date(),
        },
      });
    });

    return {
      message: 'Email vérifié avec succès. En attente de validation par un administrateur.',
      emailVerified: true,
    };
  }
}