// src/common/types/auth-user.type.ts
import { UserRole, UserStatus } from '@prisma/client';

export type AuthUser = {
  id: string;
  associationId: string;
  role: UserRole;
  status: UserStatus;
  email: string;
  // 👇 Ajouts chirurgicaux pour résoudre l'erreur TypeScript
  firstName?: string;
  lastName?: string;
  antennaId?: string; // Toujours utile d'avoir l'antenne sous la main
};