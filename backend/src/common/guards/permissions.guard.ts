// backend/src/common/guards/permissions.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../decorators/current-user.decorator';
import type { PermissionCode } from '../constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si aucune permission n'est requise, on laisse passer
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser & { permissions?: string[] } }>();
    const user = req.user;

    if (!user) throw new ForbiddenException('Utilisateur non authentifié');

    // 🔥 CORRECTION CHIRURGICALE : Bypass pour SYSTEM_ADMIN et SUPER_ADMIN
    // Ces rôles n'ont pas besoin de vérification granulaire car ils possèdent tout par défaut.
    if (user.role === UserRole.SYSTEM_ADMIN || user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const granted = new Set(user.permissions ?? []);
    const missing = required.filter((p) => !granted.has(p));

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Accès refusé. Permissions manquantes : ${missing.join(', ')}`,
      );
    }

    return true;
  }
}