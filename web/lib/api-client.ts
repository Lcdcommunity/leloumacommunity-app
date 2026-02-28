//web/lib/api-client.ts
import { http } from './http';
import type { ApiListResponse } from '../types/api';
import type { Antenna } from '../types/antenna';
import type { UserSummary } from '../types/user';
import type { Contribution } from '../types/contribution';
import type { Project } from '../types/project';
import type { DocumentItem } from '../types/document';
import type { NotificationItem } from '../types/notification';
import type { AuditItem } from '../types/audit';
import type { Association } from '../types/association';
import type { ContentPost } from '../types/content';
import type { AntennaDashboardStats, ProjectionResult } from '../types/stats';

export const api = {
  // Dashboard / profile
  me: () => http<UserSummary & { permissions?: string[] }>('/auth/me'),
  dashboardSuperAdmin: () =>
    http<{
      stats: {
        associations: number;
        antennas: number;
        members: number;
        pendingAccounts: number;
        pendingContributions: number;
        activeProjects: number;
        totalValidatedContributionsAmount: number;
      };
      recentPendingAccounts: UserSummary[];
      recentContributions: Contribution[];
      recentProjects: Project[];
    }>('/dashboard/super-admin'),

  // Phase 2 - dashboard antenne
  dashboardAntennaAdmin: () =>
    http<{
      stats: AntennaDashboardStats;
      recentPendingAccounts: UserSummary[];
      recentPendingContributions: Contribution[];
      recentProjects: Project[];
      lateMembers: Array<UserSummary & { lastValidatedContributionAt?: string | null; lateMonths?: number }>;
    }>('/dashboard/antenna-admin'),

  // Association / settings
  getAssociation: () => http<Association>('/associations/current'),
  updateAssociation: (body: Partial<Association>) =>
    http<Association, Partial<Association>>('/associations/current', {
      method: 'PATCH',
      body,
    }),

  // Antennas (Super Admin)
  listAntennas: (params?: { page?: number; pageSize?: number; q?: string; isActive?: boolean }) =>
    http<ApiListResponse<Antenna>>(
      `/super-admin/antennas?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${
        typeof params?.isActive === 'boolean' ? `&isActive=${String(params.isActive)}` : ''
      }`,
    ),

  createAntenna: (body: {
    code: string;
    name: string;
    city?: string;
    country?: string;
    isActive?: boolean;
  }) => http<Antenna, typeof body>('/super-admin/antennas', { method: 'POST', body }),

  updateAntenna: (id: string, body: Partial<Antenna>) =>
    http<Antenna, Partial<Antenna>>(`/super-admin/antennas/${id}`, { method: 'PATCH', body }),

  // Super Admin -> admins d’antenne
  listAntennaAdmins: (params?: { page?: number; pageSize?: number; antennaId?: string; q?: string }) =>
    http<ApiListResponse<UserSummary>>(
      `/super-admin/admins?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.antennaId ? `&antennaId=${params.antennaId}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`,
    ),

  createAntennaAdmin: (body: {
    antennaId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    sendInvite?: boolean;
  }) => http<UserSummary, typeof body>('/super-admin/admins', { method: 'POST', body }),

  // User lifecycle (shared actions)
  suspendUser: (id: string) => http(`/users/${id}/suspend`, { method: 'PATCH' }),
  activateUser: (id: string) => http(`/users/${id}/activate`, { method: 'PATCH' }),
  deleteUser: (id: string) => http(`/users/${id}`, { method: 'DELETE' }),

  // Super Admin members
  listMembers: (params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    antennaId?: string;
  }) =>
    http<ApiListResponse<UserSummary>>(
      `/super-admin/members?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${params?.status ? `&status=${encodeURIComponent(params.status)}` : ''}${
        params?.antennaId ? `&antennaId=${params.antennaId}` : ''
      }`,
    ),

  approveMemberAccount: (userId: string) =>
    http(`/member-approvals/${userId}/approve`, { method: 'PATCH' }),

  rejectMemberAccount: (userId: string, reason?: string) =>
    http(`/member-approvals/${userId}/reject`, {
      method: 'PATCH',
      body: { reason },
    }),

  // Phase 2 - Admin antenne members (scope antenne)
  listAntennaMembers: (params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
  }) =>
    http<ApiListResponse<UserSummary>>(
      `/admin/members?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${params?.status ? `&status=${encodeURIComponent(params.status)}` : ''}`,
    ),

  listPendingMemberApprovalsAntenna: (params?: { page?: number; pageSize?: number }) =>
    http<ApiListResponse<UserSummary>>(
      `/admin/member-approvals?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}`,
    ),

  approveMemberAccountAntenna: (userId: string) =>
    http(`/admin/member-approvals/${userId}/approve`, { method: 'PATCH' }),

  rejectMemberAccountAntenna: (userId: string, reason?: string) =>
    http(`/admin/member-approvals/${userId}/reject`, { method: 'PATCH', body: { reason } }),

  // Contributions
  listContributions: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    antennaId?: string;
    memberId?: string;
  }) =>
    http<ApiListResponse<Contribution>>(
      `/super-admin/contributions?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${params.status}` : ''
      }${params?.antennaId ? `&antennaId=${params.antennaId}` : ''}${
        params?.memberId ? `&memberId=${params.memberId}` : ''
      }`,
    ),

  // Phase 2 - contributions antenne
  listAntennaContributions: (params?: { page?: number; pageSize?: number; status?: string; q?: string }) =>
    http<ApiListResponse<Contribution>>(
      `/admin/contributions?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`,
    ),

  validateContributionAntenna: (id: string, payload?: { note?: string }) =>
    http(`/admin/contributions/${id}/validate`, { method: 'PATCH', body: payload ?? {} }),

  rejectContributionAntenna: (id: string, payload?: { reason?: string }) =>
    http(`/admin/contributions/${id}/reject`, { method: 'PATCH', body: payload ?? {} }),

  // Projects (super-admin global)
  listProjects: (params?: { page?: number; pageSize?: number; status?: string; q?: string }) =>
    http<ApiListResponse<Project>>(
      `/super-admin/projects?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${params.status}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`,
    ),

  // Phase 2 - projects antenne
  listAntennaProjects: (params?: { page?: number; pageSize?: number; status?: string; q?: string }) =>
    http<ApiListResponse<Project>>(
      `/admin/projects?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`,
    ),

  createAntennaProject: (body: {
    title: string;
    description?: string;
    status?: string;
    budgetPlanned?: number;
    budgetSpent?: number;
    startsAt?: string | null;
    endsAt?: string | null;
  }) => http<Project, typeof body>('/admin/projects', { method: 'POST', body }),

  updateAntennaProject: (id: string, body: Partial<Project>) =>
    http<Project, Partial<Project>>(`/admin/projects/${id}`, { method: 'PATCH', body }),

  deleteAntennaProject: (id: string) =>
    http(`/admin/projects/${id}`, { method: 'DELETE' }),

  // Documents
  listDocuments: (params?: { page?: number; pageSize?: number; q?: string }) =>
    http<ApiListResponse<DocumentItem>>(
      `/super-admin/documents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`,
    ),

  listAntennaDocuments: (params?: { page?: number; pageSize?: number; q?: string }) =>
    http<ApiListResponse<DocumentItem>>(
      `/admin/documents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`,
    ),

  createAntennaDocument: (body: {
    title: string;
    description?: string;
    fileAssetId?: string | null;
  }) => http<DocumentItem, typeof body>('/admin/documents', { method: 'POST', body }),

  updateAntennaDocument: (id: string, body: Partial<DocumentItem>) =>
    http<DocumentItem, Partial<DocumentItem>>(`/admin/documents/${id}`, { method: 'PATCH', body }),

  deleteAntennaDocument: (id: string) => http(`/admin/documents/${id}`, { method: 'DELETE' }),

  uploadFile: async (file: File, body?: { category?: string; folder?: string; description?: string }) => {
    const form = new FormData();
    form.append('file', file);
    if (body?.category) form.append('category', body.category);
    if (body?.folder) form.append('folder', body.folder);
    if (body?.description) form.append('description', body.description);

    return http<{ id: string; url: string; fileName: string }>('/uploads/single', {
      method: 'POST',
      body: form,
    });
  },

  // Phase 2 - contenus / infos
  listAntennaContents: (params?: { page?: number; pageSize?: number; q?: string; status?: string }) =>
    http<ApiListResponse<ContentPost>>(
      `/admin/contents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${params?.status ? `&status=${encodeURIComponent(params.status)}` : ''}`,
    ),

  createAntennaContent: (body: {
    title: string;
    body?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    coverFileAssetId?: string | null;
  }) => http<ContentPost, typeof body>('/admin/contents', { method: 'POST', body }),

  updateAntennaContent: (id: string, body: Partial<ContentPost>) =>
    http<ContentPost, Partial<ContentPost>>(`/admin/contents/${id}`, { method: 'PATCH', body }),

  deleteAntennaContent: (id: string) =>
    http(`/admin/contents/${id}`, { method: 'DELETE' }),

  // Phase 2 - retardataires / projections
  listLateMembersOver3Months: (params?: { page?: number; pageSize?: number }) =>
    http<ApiListResponse<UserSummary & { lateMonths?: number; lastValidatedContributionAt?: string | null }>>(
      `/admin/late-members?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}`,
    ),

  runContributionProjection: (body: {
    expectedMembersPaying: number;
    averageContribution: number;
    currency?: string;
    periodLabel?: string;
  }) =>
    http<ProjectionResult, typeof body>('/admin/projections/contributions', {
      method: 'POST',
      body,
    }),

  // Notifications / Audit (scope user / scope antenna backend-side)
  listNotifications: () => http<ApiListResponse<NotificationItem>>('/notifications?page=1&pageSize=50'),

  listAudit: (params?: { page?: number; pageSize?: number; action?: string }) =>
    http<ApiListResponse<AuditItem>>(
      `/audit?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.action ? `&action=${encodeURIComponent(params.action)}` : ''
      }`,
    ),

  // Profile (phase 2 settings)
  updateMyProfile: (body: Partial<UserSummary>) =>
    http<UserSummary, Partial<UserSummary>>('/users/me', { method: 'PATCH', body }),
};