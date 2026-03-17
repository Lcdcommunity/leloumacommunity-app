//web/types/antenna.ts
export interface Antenna {
  id: string;
  associationId: string;
  code: string;
  name: string;
  city?: string | null;
  country?: string | null;
  isActive: boolean;
  defaultCurrency?: string | null; // <-- Ajout chirurgical de la devise
  createdAt: string;
  updatedAt: string;
}