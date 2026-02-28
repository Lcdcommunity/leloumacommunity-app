//web/types/project-proposal.ts
export type ProjectProposalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONVERTED_TO_PROJECT';

export interface ProjectProposal {
  id: string;
  associationId: string;
  antennaId?: string | null;
  memberId: string;
  title: string;
  description: string;
  expectedBudget?: number | null;
  status: ProjectProposalStatus;
  attachmentFileAssetId?: string | null;
  createdAt: string;
  updatedAt: string;
}