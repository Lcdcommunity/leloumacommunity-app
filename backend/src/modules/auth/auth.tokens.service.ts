//src/modules/auth/auth.tokens.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
// CORRECTION DU CHEMIN D'IMPORT ICI :
import { PermissionsService } from '../permissions/permissions.service'; // Attention: vérifier s'il s'appelle servive ou service
import { UserRole } from '@prisma/client';

type TokenUser = {
  id: string;
  associationId: string;
  role: UserRole;
  email: string;
};

@Injectable()
export class AuthTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private parseDurationMs(value: string): number {
    const m = /^(\d+)([smhd])$/.exec(value.trim());
    if (!m) throw new Error(`Invalid duration format: ${value}`);
    const n = Number(m[1]);
    const unit = m[2];
    const mult =
      unit === 's' ? 1000 :
      unit === 'm' ? 60_000 :
      unit === 'h' ? 3_600_000 :
      86_400_000;
    return n * mult;
  }

  async signAccessToken(user: TokenUser): Promise<string> {
    const permissions = this.permissionsService.getDefaultPermissionsForRole(user.role);

    return this.jwt.signAsync(
      {
        sub: user.id,
        associationId: user.associationId,
        role: user.role,
        email: user.email,
        permissions,
        typ: 'access',
      },
      {
        secret: this.config.get<string>('auth.accessSecret'),
        expiresIn: this.config.get<string>('auth.accessExpiresIn'),
      },
    );
  }

  async createRefreshSession(
    user: TokenUser,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ refreshToken: string; expiresAt: Date }> {
    const raw = randomBytes(48).toString('hex');
    const tokenHash = this.sha256(raw);

    const ttl = this.parseDurationMs(this.config.get<string>('auth.refreshExpiresIn') || '30d');
    const expiresAt = new Date(Date.now() + ttl);

    await this.prisma.refreshTokenSession.create({
      data: {
        associationId: user.associationId,
        userId: user.id,
        tokenHash,
        userAgent: meta?.userAgent,
        ipAddress: meta?.ipAddress,
        expiresAt,
      },
    });

    return { refreshToken: raw, expiresAt };
  }

  async rotateRefreshToken(
    rawToken: string,
    meta?: { userAgent?: string; ipAddress?: string },
  ): Promise<{
    user: TokenUser;
    newRefreshToken: string;
    refreshExpiresAt: Date;
  }> {
    const tokenHash = this.sha256(rawToken);

    const session = await this.prisma.refreshTokenSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    const user = session.user;
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Utilisateur inactif');
    }

    const newRaw = randomBytes(48).toString('hex');
    const newHash = this.sha256(newRaw);

    const ttl = this.parseDurationMs(this.config.get<string>('auth.refreshExpiresIn') || '30d');
    const newExpiresAt = new Date(Date.now() + ttl);

    const newSession = await this.prisma.refreshTokenSession.create({
      data: {
        associationId: session.associationId,
        userId: session.userId,
        tokenHash: newHash,
        userAgent: meta?.userAgent ?? session.userAgent ?? undefined,
        ipAddress: meta?.ipAddress ?? session.ipAddress ?? undefined,
        expiresAt: newExpiresAt,
      },
    });

    await this.prisma.refreshTokenSession.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        replacedById: newSession.id,
      },
    });

    return {
      user: {
        id: user.id,
        associationId: user.associationId,
        role: user.role,
        email: user.email,
      },
      newRefreshToken: newRaw,
      refreshExpiresAt: newExpiresAt,
    };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = this.sha256(rawToken);

    const session = await this.prisma.refreshTokenSession.findUnique({
      where: { tokenHash },
    });

    if (!session || session.revokedAt) return;

    await this.prisma.refreshTokenSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.prisma.refreshTokenSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async issueLoginTokens(
    user: TokenUser,
    meta?: { userAgent?: string; ipAddress?: string },
  ) {
    const accessToken = await this.signAccessToken(user);
    const refresh = await this.createRefreshSession(user, meta);

    return {
      accessToken,
      refreshToken: refresh.refreshToken,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }
}