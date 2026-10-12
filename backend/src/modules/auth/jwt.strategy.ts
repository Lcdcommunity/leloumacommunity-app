//src/modules/auth/jwt.strategy.ts
//
// v1.1 — 🔥 CORRIGÉ (sécurité) : validate() faisait entièrement confiance au
//   contenu du token (rôle, association, statut) jusqu'à son expiration. Un
//   compte suspendu/supprimé/rejeté, ou un admin rétrogradé, gardait donc tous
//   ses droits tant que son access token (15 min par défaut) restait valide.
//   validate() relit maintenant l'utilisateur en base (clé primaire) et :
//     • refuse (401) si le compte n'existe plus, n'est plus ACTIVE ou est
//       supprimé — le front tente alors un refresh, refusé pour les mêmes
//       raisons, puis déconnecte ;
//     • renvoie le rôle / l'association / le statut ACTUELS de la base (une
//       rétrogradation est immédiate) au lieu de ceux figés dans le token.
//   Un cache mémoire de 15 s par utilisateur limite le coût à ~1 lecture par
//   utilisateur et par 15 s : un blocage prend donc effet en 15 s au plus.
//   Coupe-circuit : JWT_VERIFY_USER=false rétablit l'ancien comportement.
//
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  associationId: string;
  role: string;
  status: string;
  email: string;
};

type CachedUser = {
  id: string;
  associationId: string;
  role: string;
  status: string;
  email: string;
} | null;

const USER_CACHE_TTL_MS = 15_000;
const USER_CACHE_MAX_ENTRIES = 5_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly userCache = new Map<string, { value: CachedUser; expiresAt: number }>();
  private readonly verifyUser: boolean;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET'),
    });
    this.verifyUser = (config.get<string>('JWT_VERIFY_USER') ?? 'true') !== 'false';
  }

  private async loadUser(userId: string): Promise<CachedUser> {
    const now = Date.now();
    const hit = this.userCache.get(userId);
    if (hit && hit.expiresAt > now) return hit.value;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, associationId: true, role: true, status: true, email: true, deletedAt: true },
    });

    const value: CachedUser =
      user && !user.deletedAt
        ? {
            id: user.id,
            associationId: user.associationId as string,
            role: user.role,
            status: user.status,
            email: user.email,
          }
        : null;

    if (this.userCache.size >= USER_CACHE_MAX_ENTRIES) {
      // Purge simple : d'abord les entrées expirées, sinon on repart de zéro.
      for (const [key, entry] of this.userCache) {
        if (entry.expiresAt <= now) this.userCache.delete(key);
      }
      if (this.userCache.size >= USER_CACHE_MAX_ENTRIES) this.userCache.clear();
    }
    this.userCache.set(userId, { value, expiresAt: now + USER_CACHE_TTL_MS });
    return value;
  }

  async validate(payload: JwtPayload) {
    if (!this.verifyUser) {
      return {
        id: payload.sub,
        associationId: payload.associationId,
        role: payload.role,
        status: payload.status,
        email: payload.email,
      };
    }

    const user = await this.loadUser(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Session invalide ou compte désactivé.');
    }

    return {
      id: user.id,
      associationId: user.associationId,
      role: user.role,
      status: user.status,
      email: user.email,
    };
  }
}
