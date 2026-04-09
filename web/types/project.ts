// web/types/project.ts

// Correction chirurgicale : Alignement strict avec l'Enum Prisma
export type ProjectStatus = 
  | 'PROPOSED' 
  | 'UNDER_REVIEW' 
  | 'MEMBER_APPROVAL_PENDING' 
  | 'APPROVED' 
  | 'IN_PROGRESS' 
  | 'ON_HOLD' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'ARCHIVED';

// Type strict pour remplacer "any" sur les champs JSON
export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export interface Project {
  id: string;
  associationId: string;
  antennaId?: string | null;
  
  title: string;
  slug?: string | null;
  summary?: string | null;
  description?: string | null;
  status: ProjectStatus;
  
  // Nouveaux champs métiers
  promoterName?: string | null;
  specificObjectives?: JsonValue;
  targetBeneficiaries?: string | null;
  populationImpact?: string | null;
  environmentalImpact?: string | null;
  expectedResults?: JsonValue;
  successIndicators?: JsonValue;
  risksAndMitigation?: string | null;
  implementationMethod?: string | null;
  
  locationText?: string | null;
  coverImageFileId?: string | null;

  budgetPlanned?: number | null; // mappé depuis budgetAmount
  budgetSpent?: number | null;   // mappé depuis amountSpent
  
  startsAt?: string | null;      // mappé depuis startDate
  endsAt?: string | null;        // mappé depuis endDate
  targetDate?: string | null;    // mappé depuis targetDate

  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  
  attachments?: Array<{ 
    id: string; 
    url: string; 
    fileName?: string; 
    sizeBytes?: number | null; 
    mimeType?: string | null 
  }>; 
}