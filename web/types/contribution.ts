//web/types/contribution.ts
export type ContributionStatus = 'PENDING' | 'VALIDATED' | 'REJECTED' | 'CANCELLED';

export interface Contribution {
  id: string;
  associationId: string;
  antennaId?: string | null;
  memberId: string;
  amount: number;
  currency: string;
  method?: string | null;
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