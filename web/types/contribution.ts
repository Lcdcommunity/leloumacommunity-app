// web/types/contribution.ts
export type ContributionStatus = 
  | 'PENDING' 
  | 'PENDING_VALIDATION' 
  | 'VALIDATED' 
  | 'REJECTED' 
  | 'CANCELLED';

export interface Contribution {
  id: string;
  associationId: string;
  antennaId?: string | null;
  memberUserId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  purpose: string;
  status: ContributionStatus;
  
  // Notes et retours
  memberComment?: string | null;
  adminComment?: string | null;
  rejectionReason?: string | null;
  
  // Dates
  createdAt: string;
  updatedAt: string;
  contributionDate?: string | null;
  validatedAt?: string | null;

  // Détails du membre (Enrichis pour la fiche détail)
  member?: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    professionalStatus?: string | null;
    function?: string | null;
  };

  // Détails de l'antenne
  antenna?: {
    id: string;
    code: string;
    name: string;
  };
}