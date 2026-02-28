//web/types/api-client.ts
import type { MemberDashboardStats } from '../types/member';
import type { ProjectProposal } from '../types/project-proposal';
import type { ContentPost } from '../types/content';
import type { Contribution } from '../types/contribution';
import type { Project } from '../types/project';
import type { DocumentItem } from '../types/document';
import type { NotificationItem } from '../types/notification';
import type { UserSummary } from '../types/user';
import type { ApiListResponse } from '../types/api';

// ... garde les imports / api existants

export const api = {
  // ... méthodes existantes Phase 1 + Phase 2

  // -------------------------------
  // AUTH / ENRÔLEMENT MEMBRE (Phase 3)
  // -------------------------------
  memberSignup: (body: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    antennaId: string;
    city?: string;
    country?: string;
    addressLine1?: string;
    addressLine2?: string;
  }) =>
    http<{ message: string } , typeof body>('/auth/member-signup', {
      method: 'POST',
      body,
    }),

  verifyEmailToken: (body: { token: string }) =>
    http<{ message: string; emailVerified: boolean }, { token: string }>('/auth/verify-email', {
      method: 'POST',
      body,
    }),

  listPublicAntennasForSignup: () =>
    http<Array<{ id: string; code: string; name: string; city?: string; country?: string }>>('/public/antennas'),

  // -------------------------------
  // DASHBOARD MEMBRE
  // -------------------------------
  dashboardMember: () =>
    http<{
      stats: MemberDashboardStats;
      me: UserSummary;
      recentContributions: Contribution[];
      projectsInProgress: Project[];
      latestContents: ContentPost[];
      lateMembersPreview: Array<{ id: string; firstName: string; lastName: string; lateMonths?: number }>;
    }>('/dashboard/member'),

  // -------------------------------
  // PROFIL MEMBRE
  // -------------------------------
  updateMemberProfile: (body: Partial<UserSummary>) =>
    http<UserSummary, Partial<UserSummary>>('/member/profile', { method: 'PATCH', body }),

  // -------------------------------
  // COTISATIONS MEMBRE
  // -------------------------------
  createContributionMember: (body: {
    amount: number;
    currency?: string;
    method?: string;
    reference?: string;
    depositedAt?: string;
    note?: string;
    receiptFileAssetId?: string | null;
  }) =>
    http<Contribution, typeof body>('/member/contributions', { method: 'POST', body }),

  listMyContributions: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }) =>
    http<ApiListResponse<Contribution>>(
      `/member/contributions?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }`,
    ),

  // -------------------------------
  // VISIBILITÉ ASSOCIATION (LECTURE)
  // -------------------------------
  getAssociationBalanceSummary: () =>
    http<{
      associationId: string;
      associationName: string;
      totalValidatedContributionsAmount: number;
      currency: string;
      lastUpdatedAt?: string | null;
    }>('/member/association-balance'),

  listLateMembersVisible: (params?: { page?: number; pageSize?: number }) =>
    http<ApiListResponse<{
      id: string;
      firstName: string;
      lastName: string;
      antennaName?: string | null;
      lateMonths?: number;
    }>>(`/member/late-members?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}`),

  // -------------------------------
  // PROJETS (LECTURE MEMBRE)
  // -------------------------------
  listProjectsForMembers: (params?: { page?: number; pageSize?: number; status?: string; q?: string }) =>
    http<ApiListResponse<Project>>(
      `/member/projects?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`,
    ),

  // -------------------------------
  // PROPOSITIONS DE PROJET (MEMBRE)
  // -------------------------------
  createProjectProposalMember: (body: {
    title: string;
    description: string;
    expectedBudget?: number;
    attachmentFileAssetId?: string | null;
  }) =>
    http<ProjectProposal, typeof body>('/member/project-proposals', {
      method: 'POST',
      body,
    }),

  listMyProjectProposals: (params?: { page?: number; pageSize?: number; status?: string }) =>
    http<ApiListResponse<ProjectProposal>>(
      `/member/project-proposals?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }`,
    ),

  // -------------------------------
  // DOCUMENTS / CONTENUS MEMBRE (LECTURE)
  // -------------------------------
  listDocumentsForMembers: (params?: { page?: number; pageSize?: number; q?: string }) =>
    http<ApiListResponse<DocumentItem>>(
      `/member/documents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`,
    ),

  listContentsForMembers: (params?: { page?: number; pageSize?: number; q?: string }) =>
    http<ApiListResponse<ContentPost>>(
      `/member/contents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`,
    ),

  // -------------------------------
  // NOTIFICATIONS / PARAMÈTRES MEMBRE
  // -------------------------------
  listMyNotifications: () =>
    http<ApiListResponse<NotificationItem>>('/member/notifications?page=1&pageSize=100'),

  markNotificationRead: (id: string) =>
    http(`/member/notifications/${id}/read`, { method: 'PATCH' }),

  updateMemberPreferences: (body: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
    language?: string;
    theme?: 'light' | 'dark' | 'system';
  }) =>
    http<{ ok: true }, typeof body>('/member/preferences', { method: 'PATCH', body }),
};