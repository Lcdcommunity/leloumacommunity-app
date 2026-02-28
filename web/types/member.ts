//web/types/member.ts
export interface MemberDashboardStats {
  myContributionsTotal: number;
  myContributionsValidatedTotal: number;
  myPendingContributionsCount: number;
  myLastContributionAt?: string | null;
  associationTotalBalance?: number | null;
  currency?: string;
  lateMonths?: number;
}