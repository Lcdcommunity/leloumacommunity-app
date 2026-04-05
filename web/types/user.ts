// web/types/user.ts
export type UserRole = 'SYSTEM_ADMIN' | 'SUPER_ADMIN' | 'ANTENNA_ADMIN' | 'MEMBER';

export type UserStatus =
  | 'EMAIL_UNVERIFIED'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'DELETED';

export interface UserSummary {
  id: string;
  associationId?: string | null;
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

  // Ajout de l'objet association pour le dynamisme SaaS
  association?: {
    id: string;
    name: string;
    logoUrl?: string | null;
  } | null;

  // Infos de localisation / profil supplémentaires
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  
  // Origines & Géographie détaillées
  placeOfBirth?: string | null;
  countryOfBirth?: string | null;
  originSubPrefecture?: string | null;
  originVillage?: string | null;
  originDistrict?: string | null;
  originQuarter?: string | null;
  originSector?: string | null;

  // Profession
  professionalStatus?: string | null;
  function?: string | null; // <-- AJOUT IMPORTANT ICI

  // Numéro de carte
  cardNumber?: string | null;

  // Date de naissance
  birthDate?: string | null;

  // Photo de profil
  avatarUrl?: string | null;
}

export interface CurrentUser extends UserSummary {
  permissions: string[];
}