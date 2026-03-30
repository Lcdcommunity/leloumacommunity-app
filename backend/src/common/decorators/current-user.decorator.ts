// backend/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client'; // 👈 AJOUTÉ pour le typage strict

export interface AuthUser {
  id: string;
  role: UserRole; // 👈 Changé de string à UserRole
  associationId: string; // 👈 Rendu obligatoire (crucial pour le Multi-tenant)
  antennaId?: string | null;
  email?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return req.user;
  },
);