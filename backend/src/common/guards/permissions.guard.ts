//src/common/guards/permissions.guard.ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { PermissionCode } from '../constants/permissions';

type RequestUser = {
  id: string;
  role: string;
  associationId: string;
  permissions?: string[];
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = req.user;

    if (!user) throw new ForbiddenException('Utilisateur non authentifié');

    // SUPER_ADMIN bypass
    if (user.role === 'SUPER_ADMIN') return true;

    const granted = new Set(user.permissions ?? []);
    const missing = required.filter((p) => !granted.has(p));

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Permissions insuffisantes: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}