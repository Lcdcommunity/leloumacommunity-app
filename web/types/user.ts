// web/types/user.ts
export type UserRole = 'SUPER_ADMIN' | 'ANTENNA_ADMIN' | 'MEMBER';

export type UserStatus =
  | 'PENDING_EMAIL_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'DELETED';

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
  
  // 👇 On rajoute officiellement les champs de localisation ici
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  originSubPrefecture?: string | null;
  originVillage?: string | null;
}

export interface CurrentUser extends UserSummary {
  permissions: string[];
}