// web/types/antenna.ts
//web/types/antenna.ts
export interface Antenna {
  id: string;
  associationId: string;
  code: string;
  name: string;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  defaultCurrency?: string | null; 
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}