// web/types/election.ts

export type ElectionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'ARCHIVED';

export interface ElectionCandidate {
  id: string;
  positionId: string;
  userId: string;
  bio?: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    professionalStatus?: string | null;
    city?: string | null;
    country?: string | null;
    profilePhotoUrl?: string | null;
  };
}

export interface ElectionPosition {
  id: string;
  electionId: string;
  title: string;
  order: number;
  candidates: ElectionCandidate[];
}

export interface Election {
  id: string;
  title: string;
  description?: string | null;
  status: ElectionStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  positions: ElectionPosition[];
}

export interface PositionResult {
  id: string;
  title: string;
  totalVotes: number;
  results: {
    candidateId: string;
    name: string;
    // ⚡ AJOUT CHIRURGICAL : TypeScript connaît maintenant ces propriétés
    email?: string | null;
    originSubPrefecture?: string | null;
    votes: number;
    percentage: number;
  }[];
}