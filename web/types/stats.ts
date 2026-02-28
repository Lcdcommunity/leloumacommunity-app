//web/types/stats.ts
export interface AntennaDashboardStats {
  antennaId: string;
  antennaName: string;
  membersTotal: number;
  membersActive: number;
  pendingAccounts: number;
  pendingContributions: number;
  validatedContributionsAmountMonth: number;
  validatedContributionsAmountAllTime: number;
  lateMembersOver3Months: number;
  activeProjects: number;
}

export interface ProjectionResult {
  periodLabel: string;
  expectedMembersPaying: number;
  averageContribution: number;
  projectedTotal: number;
  currency: string;
}