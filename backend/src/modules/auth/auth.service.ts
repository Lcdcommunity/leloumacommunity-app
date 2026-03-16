//src/modules/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthTokensService } from './auth.tokens.service';
import { AuthMailerService } from './auth.mailer.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tokens: AuthTokensService,
    private readonly authMailer: AuthMailerService,
  ) {}

  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  // 👇 FONCTION GET ME CORRIGÉE 👇
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        associationId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    return user;
  }

  // 👇 FONCTION DE LOGIN EXISTANTE 👇
  async login(dto: LoginDto, meta?: { userAgent?: string; ipAddress?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Votre compte n\'est pas actif ou en attente de validation.');
    }

    const tokens = await this.tokens.issueLoginTokens(
      { id: user.id, associationId: user.associationId, role: user.role, email: user.email },
      meta
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    };
  }

  async refresh(dto: RefreshTokenDto, meta?: { userAgent?: string; ipAddress?: string }) {
    if (!dto.refreshToken) throw new UnauthorizedException('Refresh token requis');

    const rotated = await this.tokens.rotateRefreshToken(dto.refreshToken, meta);
    const accessToken = await this.tokens.signAccessToken(rotated.user);

    return {
      accessToken,
      refreshToken: rotated.newRefreshToken,
      refreshTokenExpiresAt: rotated.refreshExpiresAt,
    };
  }

  async logout(currentUserId: string, dto: LogoutDto) {
    if (dto.logoutAll) {
      const count = await this.tokens.revokeAllUserSessions(currentUserId);
      return { revokedSessions: count, mode: 'all' as const };
    }

    if (dto.refreshToken) {
      await this.tokens.revokeRefreshToken(dto.refreshToken);
      return { revokedSessions: 1, mode: 'single' as const };
    }

    const count = await this.tokens.revokeAllUserSessions(currentUserId);
    return { revokedSessions: count, mode: 'all-fallback' as const };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    const generic = {
      success: true,
      message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };

    if (!user || user.status === 'REJECTED') return generic;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.sha256(rawToken);
    const ttlMinutes = Number(this.config.get('auth.passwordResetTokenTtlMinutes') ?? 30);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        associationId: user.associationId,
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // --- FIX CHIRURGICAL ICI ---
    // On force la lecture de FRONTEND_URL configurée sur Render
    const front = this.config.get<string>('FRONTEND_URL') || process.env.FRONTEND_URL || 'https://lcd-comminity.vercel.app';
    const resetUrl = `${front.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    // ---------------------------

    await this.authMailer.sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      appName: process.env.APP_NAME || 'Association',
    });

    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.sha256(dto.token);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt <= new Date()) {
      throw new BadRequestException('Token de réinitialisation invalide ou expiré');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.refreshTokenSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { success: true };
  }
}