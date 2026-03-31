// web/types/association.ts
export interface Association {
  id: string;
  code: string;
  name: string;
  isActive: boolean;

  legalName?: string | null;
  registrationNumber?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;

  websiteUrl?: string | null;

  country?: string | null;
  city?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;

  defaultCurrency?: string | null;

  logoFileId?: string | null;
  logoUrl?: string | null;

  expenseValidationThreshold?: number | null;

  // AJOUT IMPORTANT
  foundedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}