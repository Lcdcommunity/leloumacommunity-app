// backend/src/common/types/auth-user.type.ts
import { UserRole, UserStatus } from '@prisma/client';

export type AuthUser = {
  id: string;
  associationId: string;
  role: UserRole;
  status: UserStatus;
  email: string;
  firstName?: string;
  lastName?: string;
  antennaId?: string | null; // 👈 Harmonisation avec Prisma (null autorisé)
};