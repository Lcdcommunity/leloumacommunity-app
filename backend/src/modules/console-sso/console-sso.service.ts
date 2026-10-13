// backend/src/modules/console-sso/console-sso.service.ts
//
// v1.0 — Connexion unique vers Direct Transf'air depuis la console du Grand Chef.
//   Signe une assertion JWT (HS256) de 60 secondes, à usage unique (jti aléatoire), que le back-office
//   Direct Transf'air vérifie avec le MÊME secret partagé (PLATFORM_SSO_SECRET, 32 caractères minimum,
//   identique des deux côtés). Sans secret, la fonction est fermée (503) : rien n'est signé.
//   L'assertion ne contient que l'e-mail du Grand Chef authentifié ; aucun mot de passe ni jeton LCD.
//
import { Injectable, ServiceUnavailableException, ForbiddenException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export const SSO_ISSUER = 'dkmoney-console';
export const SSO_AUDIENCE = 'direct-transfair';
export const SSO_TTL_SECONDS = 60;
const MIN_SECRET_LENGTH = 32;

export function ssoSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const s = (env.PLATFORM_SSO_SECRET ?? '').trim();
  return s.length >= MIN_SECRET_LENGTH ? s : null;
}

/** Chemin sous lequel le back-office Direct Transf'air est servi (réglable). */
export function transferBasePath(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.TRANSFER_CONSOLE_PATH ?? '/transfert').trim();
  const clean = '/' + raw.replace(/^\/+|\/+$/g, '');
  return /^\/[A-Za-z0-9_-]+$/.test(clean) ? clean : '/transfert';
}

@Injectable()
export class ConsoleSsoService {
  private readonly jwt = new JwtService({});

  constructor(private readonly prisma: PrismaService) {}

  status() {
    return { configured: ssoSecret() !== null, basePath: transferBasePath() };
  }

  async createTransferAssertion(actorUserId: string, meta: { ip?: string; userAgent?: string } = {}) {
    const secret = ssoSecret();
    if (!secret) {
      throw new ServiceUnavailableException(
        "La connexion unique n'est pas configurée (PLATFORM_SSO_SECRET manquant ou trop court).",
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user || user.role !== 'SYSTEM_ADMIN' || user.status !== 'ACTIVE') {
      throw new ForbiddenException('Accès refusé.');
    }

    const assertion = this.jwt.sign(
      { email: user.email, jti: randomUUID() + randomUUID().slice(0, 8) },
      { secret, algorithm: 'HS256', issuer: SSO_ISSUER, audience: SSO_AUDIENCE, subject: `lcd:${user.id}`, expiresIn: SSO_TTL_SECONDS },
    );

    await this.prisma.auditLog
      .create({
        data: {
          action: AuditAction.LOGIN_SUCCESS,
          entity: 'ConsoleSso',
          entityId: user.id,
          details: { target: 'direct-transfair', ttlSeconds: SSO_TTL_SECONDS },
          actorUserId: user.id,
          ipAddress: meta.ip,
          userAgent: meta.userAgent?.slice(0, 300),
        },
      })
      .catch(() => undefined); // la traçabilité ne doit jamais empêcher la connexion

    return { assertion, expiresIn: SSO_TTL_SECONDS, landingPath: `${transferBasePath()}/sso` };
  }
}
