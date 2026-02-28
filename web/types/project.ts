//web/types/project.ts
export type ProjectStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';

export interface Project {
  id: string;
  associationId: string;
  antennaId?: string | null;
  title: string;
  description?: string | null;
  status: ProjectStatus;
  budgetPlanned?: number | null;
  budgetSpent?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}