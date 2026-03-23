// backend/src/modules/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
import { NotificationsService } from '../notifications/notifications.service'; // Ajouté
import { NotificationType } from '@prisma/client'; // Ajouté

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tokens: AuthTokensService,
    private readonly authMailer: AuthMailerService,
    private readonly notifications: NotificationsService, // Injecté chirurgicalement
  ) {}

  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  private getFrontendBaseUrl(): string {
    const raw =
      this.config.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      this.config.get<string>('APP_URL') ||
      process.env.APP_URL;

    if (raw && raw.trim().length > 0) {
      return this.normalizeUrl(raw.trim());
    }

    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:3000';
    }

    throw new BadRequestException(
      'Configuration manquante : FRONTEND_URL ou APP_URL est requis en production.',
    );
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { antenna: true },
          orderBy: { createdAt: 'asc' },
        },
        adminAssignments: {
          include: { antenna: true },
        },
        profilePhoto: true,
        virtualCard: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const photoUrl = (user as any).profilePhoto?.url ?? null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      associationId: user.associationId,
      permissions: [],
      avatarUrl: photoUrl,
      profilePhotoUrl: photoUrl,
      antenna:
        (user as any).memberships?.[0]?.antenna ??
        (user as any).adminAssignments?.[0]?.antenna ??
        null,
    };
  }

  async login(
    dto: LoginDto,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        "Votre compte n'est pas actif ou en attente de validation.",
      );
    }

    const tokens = await this.tokens.issueLoginTokens(
      {
        id: user.id,
        associationId: user.associationId,
        role: user.role,
        email: user.email,
      },
      meta,
    );

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async refresh(
    dto: RefreshTokenDto,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token requis');
    }

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
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };

    if (!user || user.status === 'REJECTED') {
      return generic;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.sha256(rawToken);
    const ttlMinutes = Number(
      this.config.get('auth.passwordResetTokenTtlMinutes') ?? 30,
    );
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

    const front = this.getFrontendBaseUrl();
    const resetUrl = `${front}/reset-password?token=${encodeURIComponent(rawToken)}`;

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
      throw new BadRequestException(
        'Token de réinitialisation invalide ou expiré',
      );
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

    // ✅ NOTIFICATION : Alerter l'utilisateur de la modification de ses accès
    await this.notifications.createForUser({
      associationId: record.associationId,
      userId: record.userId,
      message: 'Votre mot de passe a été modifié avec succès. Si vous n\'êtes pas à l\'origine de cette action, contactez immédiatement l\'administration.',
      type: NotificationType.SYSTEM_ALERT,
      title: 'Sécurité : Mot de passe modifié',
    });

    return { success: true };
  }
}