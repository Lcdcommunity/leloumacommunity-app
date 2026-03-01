//web/types/antenna.ts
export interface Antenna {
  id: string;
  associationId: string;
  code: string;
  name: string;
  city?: string | null;
  country?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}