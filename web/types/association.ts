// web/types/association.ts
export interface Association {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  
  // Champs optionnels ajoutés pour correspondre au backend
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

  // NOUVEAU : Seuil de validation des dépenses
  expenseValidationThreshold?: number | null;

  createdAt: string;
  updatedAt: string;
}