//web/types/contribution.ts
// On ajoute 'PENDING_VALIDATION' pour correspondre exactement à ce que renvoie le backend/Prisma
export type ContributionStatus = 'PENDING' | 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED' | 'CANCELLED';

export interface Contribution {
  id: string;
  associationId: string;
  antennaId?: string | null;
  memberId: string;
  amount: number;
  currency: string;
  method?: string | null;
  purpose?: string | null; // Ajouté pour gérer les motifs (ex: MEMBERSHIP_CARD, REGULAR_QUOTA)
  status: ContributionStatus;
  depositedAt?: string | null;
  validatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  note?: string | null;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  antenna?: {
    id: string;
    code: string;
    name: string;
  };
}