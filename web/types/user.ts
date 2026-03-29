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
  associationId?: string | null; // Optionnel car le SYSTEM_ADMIN n'en a pas forcément
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

  // Numéro de carte (pour affichage admin au lieu de l'ID technique)
  cardNumber?: string | null;

  // Date de naissance pour la carte/profil
  birthDate?: string | null;

  // Photo de profil — URL retournée par le backend après upload
  avatarUrl?: string | null;
}

export interface CurrentUser extends UserSummary {
  permissions: string[];
}