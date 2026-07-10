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
import { NotificationsService } from '../notifications/notifications.service'; 
import { NotificationType } from '@prisma/client'; 

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly tokens: AuthTokensService,
    private readonly authMailer: AuthMailerService,
    private readonly notifications: NotificationsService, 
  ) {}

  /**
   * Hachage SHA256 pour les tokens de sécurité
   */
  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  /**
   * Nettoyeur de domaine "Intelligent"
   * Supprime le protocole, les "www." et les slashes pour une comparaison fiable
   */
  private normalizeUrl(url: string): string {
    if (!url) return '';
    return url
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '') // Supprime http:// ou https://
      .replace(/^www\./, '')       // Supprime www.
      .replace(/\/+$/, '');        // Supprime le slash final
  }

  /**
   * Récupère l'URL de base du frontend avec fallback sécurisé
   */
  private getFrontendBaseUrl(): string {
    const raw =
      this.config.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      this.config.get<string>('APP_URL') ||
      process.env.APP_URL;

    if (raw && raw.trim().length > 0) {
      return raw.trim().replace(/\/+$/, '');
    }

    if (process.env.NODE_ENV !== 'production') {
      return 'http://localhost:3000';
    }

    throw new BadRequestException(
      'Configuration manquante : FRONTEND_URL ou APP_URL est requis en production.',
    );
  }

  /**
   * Récupère le profil complet de l'utilisateur actuel
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        association: {
          include: { logoFile: true }
        },
        memberships: {
          where: { isPrimary: true },
          include: { antenna: true },
        },
        adminAssignments: {
          where: { isActive: true },
          include: { antenna: true },
        },
        profilePhoto: true,
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const photoUrl = user.profilePhoto?.url ?? null;
    const primaryAntenna = user.memberships?.[0]?.antenna ?? user.adminAssignments?.[0]?.antenna ?? null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      associationId: user.associationId,
      associationName: user.association?.name,
      associationLogo: user.association?.logoFile?.url ?? null,
      avatarUrl: photoUrl,
      profilePhotoUrl: photoUrl,
      antenna: primaryAntenna,
    };
  }

  /**
   * Connexion sécurisée avec barrière anti-spoofing intelligente
   */
  async login(
    dto: LoginDto,
    meta?: { userAgent?: string; ipAddress?: string; tenantDomain?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // 1. Vérification existence utilisateur
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // 2. Vérification mot de passe
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    // 3. Vérification statut du compte
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        "Votre compte n'est pas actif ou en attente de validation.",
      );
    }

    // 4. 🔒 PILIER 3 : VÉRIFICATION DE DOMAINE (MULTI-TENANT)
    if (user.role !== 'SYSTEM_ADMIN' && meta?.tenantDomain && user.associationId) {
      // Normalisation du domaine reçu (ex: "www.leloumacommunity.com:3000" -> "leloumacommunity.com")
      const requestDomain = this.normalizeUrl(meta.tenantDomain.split(':')[0]);

      const userAssociation = await this.prisma.association.findUnique({
        where: { id: user.associationId },
        select: { domainName: true }
      });

      if (userAssociation?.domainName) {
        const dbDomain = this.normalizeUrl(userAssociation.domainName);

        // Autorisation si on est en local ou si les domaines normalisés correspondent
        const isLocal = requestDomain === 'localhost' || requestDomain === '127.0.0.1';

        if (!isLocal && dbDomain !== requestDomain) {
          // Log de sécurité utile dans la console de Render
          console.warn(`[Auth-Blocked] Tentative de connexion hors domaine. Attendu: ${dbDomain}, Reçu: ${requestDomain}`);
          throw new UnauthorizedException('Identifiants invalides pour cet espace.'); 
        }
      }
    }

    // 5. Génération des tokens
    const tokens = await this.tokens.issueLoginTokens(
      {
        id: user.id,
        associationId: user.associationId,
        role: user.role,
        status: user.status,
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

    // rotateRefreshToken() relit l'utilisateur en base à CHAQUE appel (via
    // `include: { user: true }` sur la session, requête live sans cache) et
    // rejette déjà les comptes non ACTIVE. rotated.user.role / .status sont
    // donc toujours à jour — une démotion ou une suspension est reflétée dès
    // le prochain refresh, pas besoin de relire l'utilisateur une 2e fois ici.
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
      include: { association: { include: { logoFile: true } } }
    });

    const generic = {
      success: true,
      message: 'Si un compte existe avec cet email, un lien a été envoyé.',
    };

    if (!user || user.status === 'REJECTED' || user.status === 'DELETED') {
      return generic;
    }

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

    const front = this.getFrontendBaseUrl();
    const resetUrl = `${front}/reset-password?token=${encodeURIComponent(rawToken)}`;

    await this.authMailer.sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      appName: user.association?.name || 'Lélouma Community',
      logoUrl: user.association?.logoFile?.url,
    });

    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.sha256(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
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

    await this.notifications.createForUser({
      associationId: record.associationId,
      userId: record.userId,
      message: 'Votre mot de passe a été modifié avec succès.',
      type: NotificationType.SYSTEM_ALERT,
      title: 'Sécurité : Mot de passe modifié',
    });

    return { success: true };
  }
}