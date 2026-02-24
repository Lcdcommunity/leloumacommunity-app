//src/modules/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthTokensService } from './auth.tokens.service';
import { AuthMailerService } from './auth.mailer.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';

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

  // À appeler depuis ton login existant après validation password/email/status/etc.
  async issueTokensForUser(
    user: { id: string; associationId: string; role: any; email: string },
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    return this.tokens.issueLoginTokens(user, meta);
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

    // fallback safe: revoke all if no token provided
    const count = await this.tokens.revokeAllUserSessions(currentUserId);
    return { revokedSessions: count, mode: 'all-fallback' as const };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Réponse neutre (anti-enumération)
    const generic = {
      success: true,
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };

    if (!user) return generic;
    if (user.status === 'REJECTED') return generic;

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.sha256(rawToken);
    const ttlMinutes = Number(this.config.get('auth.passwordResetTokenTtlMinutes') ?? 30);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    // Invalidation des anciens non utilisés (option stable)
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

    const front = process.env.FRONTEND_URL || process.env.APP_BASE_URL || 'http://localhost:3000';
    const resetUrl = `${front.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

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
        data: {
          passwordHash,
          // optionnel: forcer "ACTIVE" si déjà vérifié et approuvé
        },
      });

      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      // sécurité: invalider toutes les sessions refresh
      await tx.refreshTokenSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { success: true };
  }
}