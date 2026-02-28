//web/types/user.ts
export type UserRole = 'SUPER_ADMIN' | 'ANTENNA_ADMIN' | 'MEMBER';

export type UserStatus =
  | 'PENDING_EMAIL_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED';

export interface UserSummary {
  id: string;
  associationId: string;
  antennaId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUser extends UserSummary {
  permissions: string[];
}