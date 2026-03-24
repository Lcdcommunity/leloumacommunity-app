// web/lib/api-client.ts
import type { MemberDashboardStats } from '../types/member';
import type { ProjectProposal } from '../types/project-proposal';
import type { ContentPost } from '../types/content';
import type { Contribution } from '../types/contribution';
import type { Project } from '../types/project';
import type { DocumentItem } from '../types/document';
import type { NotificationItem } from '../types/notification';
import type { UserSummary } from '../types/user';
import type { ApiListResponse } from '../types/api';
import type { Antenna } from '../types/antenna';
import type { AuditItem } from '../types/audit';
import type { Association } from '../types/association';
import type { AntennaDashboardStats, ProjectionResult } from '../types/stats';

import { http } from './http';
import { getAccessToken, getRefreshToken, setTokens, clearAuthState } from './auth-store';
import { env } from './env';

// ─────────────────────────────────────────────────────────────────────────────
// VirtualCardData
// ─────────────────────────────────────────────────────────────────────────────
export interface VirtualCardData {
  cardNumber: string;
  isLocked: boolean;
  expiresAt: string | null;
  qrToken: string;
  antennaName: string;
  user: {
    firstName: string;
    lastName: string;
    function?: string | null;
    birthDate?: string | null;
    placeOfBirth?: string | null;
    birthCountry?: string | null;
    originSubPrefecture?: string | null;
    originCommune?: string | null;
    originVillage?: string | null;
    country?: string | null;
    city?: string | null;
    postalCode?: string | null;
    profilePhotoUrl?: string | null;
  };
}

export interface FullUserProfile extends UserSummary {
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  birthDate?: string | null;
  placeOfBirth?: string | null;
  birthCountry?: string | null;
  countryOfBirth?: string | null;
  profilePhotoUrl?: string | null;
  avatarUrl?: string | null;
  originVillage?: string | null;
  originSubPrefecture?: string | null;
  function?: string | null;
  cardNumber?: string | null;
  isCardLocked?: boolean;
  cardExpiresAt?: string | null;
  qrToken?: string | null;
  antennaName?: string | null;
  associationTitle?: string | null;
  virtualCard?: {
    id: string;
    cardNumber: string;
    isLocked: boolean;
    expiresAt: string | null;
    qrToken: string;
  } | null;
  antenna?: {
    id: string;
    name: string;
    code: string;
    membershipStatus: string;
    city?: string | null;
    country?: string | null;
    defaultCurrency?: string | null;
  } | null;
  adminAssignments?: Array<{
    antenna?: {
      name?: string | null;
      code?: string | null;
      city?: string | null;
      country?: string | null;
      defaultCurrency?: string | null;
    } | null;
  }> | null;
}

export const api = {
  // ==========================================
  // AUTH / ENRÔLEMENT MEMBRE
  // ==========================================
  memberSignup: (body: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    antennaId: string;
    phone?: string;
    originSubPrefecture?: string;
    originVillage?: string;
    birthDate?: string;
    placeOfBirth?: string;
    birthCountry?: string;
    city?: string;
    country?: string;
    postalCode?: string;
    addressLine1?: string;
    addressLine2?: string;
    function?: string;
  }) =>
    http<{ id: string; message: string }, typeof body>('/public/signup', {
      method: 'POST',
      body,
    }),

  verifyEmailToken: (body: { token: string }) =>
    http<{ emailVerified: boolean }, typeof body>('/public/verify-email-token', {
      method: 'POST',
      body,
    }),

  listPublicAntennasForSignup: () =>
    http<Array<{ id: string; code: string; name: string; city?: string; country?: string }>>('/public/antennas'),

  verifyPublicCard: (token: string) =>
    http<VirtualCardData>(`/public/cards/${token}`),

  // ==========================================
  // ME / PROFIL GÉNÉRAL
  // ==========================================
  me: () => http<UserSummary & { permissions?: string[] }>('/auth/me'),

  getMyProfile: () => http<FullUserProfile>('/users/me'),

  updateMyProfile: (body: Partial<UserSummary>) =>
    http<FullUserProfile, Partial<UserSummary>>('/users/me', { method: 'PATCH', body }),

  updateMemberProfile: (body: Partial<UserSummary>) =>
    http<UserSummary, Partial<UserSummary>>('/member/profile', { method: 'PATCH', body }),

  uploadAvatar: async (formData: FormData): Promise<{
    message: string;
    avatarUrl: string | null;
    profilePhotoUrl: string | null;
    user: FullUserProfile;
  }> => {
    const baseUrl = (env.apiUrl?.trim() ?? '').replace(/\/+$/, '');
    const accessToken = getAccessToken();

    const headers: Record<string, string> = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const res = await fetch(`${baseUrl}/users/me/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (res.status === 401) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json() as { accessToken: string; refreshToken: string; refreshTokenExpiresAt: string };
          setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken, refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? '' });
          const retryRes = await fetch(`${baseUrl}/users/me/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${data.accessToken}` },
            body: formData,
          });
          if (!retryRes.ok) {
            const err = await retryRes.json().catch(() => ({})) as { message?: string };
            throw new Error(err.message ?? 'Erreur lors du téléchargement de la photo.');
          }
          return retryRes.json();
        } else {
          clearAuthState();
        }
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      throw new Error(err.message ?? 'Erreur lors du téléchargement de la photo.');
    }
    return res.json();
  },

  uploadProfilePhoto: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http<{ message?: string; profilePhotoUrl?: string | null; user?: FullUserProfile }>('/users/me/profile-photo', {
      method: 'POST',
      body: form,
    });
  },

  updateMemberPreferences: (body: {
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
    language?: string;
    theme?: 'light' | 'dark' | 'system' | string;
  }) =>
    http<{ ok: boolean }, typeof body>('/member/preferences', { method: 'PATCH', body }),

  // ==========================================
  // TARIFICATION
  // ==========================================
  getPricingSuperAdmin: () =>
    http<Record<string, { monthlyQuota: number; membershipCard: number }>>('/super-admin/settings/pricing'),

  updatePricingSuperAdmin: (body: Record<string, { monthlyQuota: number; membershipCard: number }>) =>
    http('/super-admin/settings/pricing', { method: 'PUT', body }),

  getAssociationPricing: () =>
    http<Record<string, { monthlyQuota: number; membershipCard: number }>>('/member/pricing'),

  // ==========================================
  // DASHBOARDS
  // ==========================================
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

  dashboardAntennaAdmin: () =>
    http<{
      stats: AntennaDashboardStats;
      recentPendingAccounts: UserSummary[];
      recentPendingContributions: Contribution[];
      recentProjects: Project[];
      lateMembers: Array<UserSummary & { lastValidatedContributionAt?: string | null; lateMonths?: number }>;
    }>('/dashboard/antenna-admin'),

  dashboardMember: () =>
    http<{
      stats: MemberDashboardStats & {
        myTotalContributions?: number;
        activeProjects?: number;
        myContributionsTotal?: number;
        myContributionsValidatedTotal?: number;
        myPendingContributionsCount?: number;
        associationTotalBalance?: number;
        lateMonths?: number;
        myLastContributionAt?: string | null;
        currency?: string;
      };
      me: UserSummary;
      virtualCard?: VirtualCardData | null;
      recentContributions: Contribution[];
      projectsInProgress: Project[];
      latestContents: ContentPost[];
      lateMembersPreview: Array<{ id: string; firstName: string; lastName: string; lateMonths?: number }>;
    }>('/member/dashboard'),

  getAssociationBalanceSummary: () =>
    http<{
      associationId: string;
      associationName: string;
      totalValidatedContributionsAmount: number;
      currency: string;
      lastUpdatedAt?: string | null;
    }>('/member/association-balance'),

  // ==========================================
  // ASSOCIATION & ANTENNES
  // ==========================================
  getAssociation: () => http<Association>('/associations/current'),

  updateAssociation: (body: Partial<Association>) =>
    http<Association, Partial<Association>>('/associations/current', { method: 'PATCH', body }),

  listAntennas: (params?: { page?: number; pageSize?: number; q?: string; isActive?: boolean }) =>
    http<ApiListResponse<Antenna>>(
      `/super-admin/antennas?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${typeof params?.isActive === 'boolean' ? `&isActive=${String(params.isActive)}` : ''}`
    ),

  getAntenna: (id: string) => http<Antenna>(`/super-admin/antennas/${id}`),

  createAntenna: (body: {
    code: string;
    name: string;
    city?: string;
    country?: string;
    isActive?: boolean;
    defaultCurrency?: string | null;
  }) =>
    http<Antenna, typeof body>('/super-admin/antennas', { method: 'POST', body }),

  updateAntenna: (id: string, body: Partial<Antenna> & { defaultCurrency?: string | null }) =>
    http<Antenna, typeof body>(`/super-admin/antennas/${id}`, { method: 'PATCH', body }),

  deleteAntenna: (id: string) => http(`/super-admin/antennas/${id}`, { method: 'DELETE' }),

  listAntennaAdmins: (params?: { page?: number; pageSize?: number; antennaId?: string; q?: string }) =>
    http<ApiListResponse<UserSummary>>(
      `/super-admin/admins?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.antennaId ? `&antennaId=${params.antennaId}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`
    ),

  createAntennaAdmin: (body: {
    antennaId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    sendInvite?: boolean;
  }) =>
    http<UserSummary, typeof body>('/super-admin/admins', { method: 'POST', body }),

  // ==========================================
  // GESTION UTILISATEURS
  // ==========================================
  updateUserSuperAdmin: (id: string, body: Partial<FullUserProfile>) =>
    http(`/super-admin/users/${id}`, { method: 'PATCH', body }),

  suspendUserSuperAdmin: (id: string) =>
    http(`/super-admin/users/${id}/suspend`, { method: 'PATCH' }),

  activateUserSuperAdmin: (id: string) =>
    http(`/super-admin/users/${id}/activate`, { method: 'PATCH' }),

  deleteUserSuperAdmin: (id: string) =>
    http(`/super-admin/users/${id}`, { method: 'DELETE' }),

  // ==========================================
  // MEMBRES
  // ==========================================
  listMembers: (params?: { page?: number; pageSize?: number; q?: string; status?: string; antennaId?: string }) =>
    http<ApiListResponse<UserSummary>>(
      `/super-admin/members?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${params?.status ? `&status=${encodeURIComponent(params.status)}` : ''}${
        params?.antennaId ? `&antennaId=${params.antennaId}` : ''
      }`
    ),

  approveMemberAccount: (userId: string) =>
    http(`/super-admin/users/${userId}/approve`, { method: 'PATCH' }),

  rejectMemberAccount: (userId: string, reason?: string) =>
    http(`/super-admin/users/${userId}/reject`, { method: 'PATCH', body: { reason } }),

  listAntennaMembers: (params?: { page?: number; pageSize?: number; q?: string; status?: string }) =>
    http<ApiListResponse<UserSummary>>(
      `/admin/members?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${params?.status ? `&status=${encodeURIComponent(params.status)}` : ''}`
    ),

  listPendingMemberApprovalsAntenna: (params?: { page?: number; pageSize?: number }) =>
    http<ApiListResponse<UserSummary>>(
      `/admin/member-approvals?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}`
    ),

  approveMemberAccountAntenna: (userId: string) =>
    http(`/admin/member-approvals/${userId}/approve`, { method: 'PATCH' }),

  rejectMemberAccountAntenna: (userId: string, reason?: string) =>
    http(`/admin/member-approvals/${userId}/reject`, { method: 'PATCH', body: { reason } }),

  suspendUser: (id: string) =>
    http(`/admin/members/${id}/suspend`, { method: 'PATCH' }),

  activateUser: (id: string) =>
    http(`/admin/members/${id}/activate`, { method: 'PATCH' }),

  deleteUser: (id: string) =>
    http(`/admin/members/${id}`, { method: 'DELETE' }),

  listLateMembersOver3Months: (params?: { page?: number; pageSize?: number }) =>
    http<ApiListResponse<UserSummary & { lateMonths?: number; lastValidatedContributionAt?: string | null }>>(
      `/admin/late-members?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}`
    ),

  listLateMembersVisible: (params?: { page?: number; pageSize?: number }) =>
    http<ApiListResponse<{
      id: string;
      firstName: string;
      lastName: string;
      antennaName?: string | null;
      lateMonths?: number;
    }>>(`/member/late-members?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}`),

  // ==========================================
  // COTISATIONS
  // ==========================================
  listContributions: (params?: { page?: number; pageSize?: number; status?: string; antennaId?: string; memberId?: string }) =>
    http<ApiListResponse<Contribution>>(
      `/super-admin/contributions?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${params.status}` : ''
      }${params?.antennaId ? `&antennaId=${params.antennaId}` : ''}${
        params?.memberId ? `&memberId=${params.memberId}` : ''
      }`
    ),

  listAntennaContributions: (params?: { page?: number; pageSize?: number; status?: string; q?: string }) =>
    http<ApiListResponse<Contribution>>(
      `/admin/contributions?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`
    ),

  validateContributionAntenna: (id: string, payload?: { note?: string }) =>
    http(`/admin/contributions/${id}/validate`, { method: 'PATCH', body: payload ?? {} }),

  rejectContributionAntenna: (id: string, payload?: { reason?: string }) =>
    http(`/admin/contributions/${id}/reject`, { method: 'PATCH', body: payload ?? {} }),

  updateContributionAntenna: (id: string, payload: { amount: number }) =>
    http(`/admin/contributions/${id}`, { method: 'PATCH', body: payload }),

  deleteContributionAntenna: (id: string) =>
    http(`/admin/contributions/${id}`, { method: 'DELETE' }),

  createContributionMember: (body: {
    amount: number;
    currency?: string;
    method?: string;
    reference?: string;
    depositedAt?: string;
    note?: string;
    purpose?: string;
    receiptFileAssetId?: string | null;
  }) =>
    http<Contribution, typeof body>('/member/contributions', { method: 'POST', body }),

  listMyContributions: (params?: { page?: number; pageSize?: number; status?: string }) =>
    http<ApiListResponse<Contribution>>(
      `/member/contributions?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }`
    ),

  runContributionProjection: (body: {
    expectedMembersPaying: number;
    averageContribution: number;
    currency?: string;
    periodLabel?: string;
  }) =>
    http<ProjectionResult, typeof body>('/admin/projections/contributions', { method: 'POST', body }),

  // ==========================================
  // PROJETS
  // ==========================================
  listProjects: (params?: { page?: number; pageSize?: number; status?: string; q?: string }) =>
    http<ApiListResponse<Project>>(
      `/super-admin/projects?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${params.status}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`
    ),

  createProject: (body: {
    title: string;
    summary?: string;
    description?: string;
    locationText?: string;
    promoterName?: string;
    status?: string;
    budgetPlanned?: number;
    budgetSpent?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    targetBeneficiaries?: string;
    populationImpact?: string;
    environmentalImpact?: string;
    risksAndMitigation?: string;
    implementationMethod?: string;
    specificObjectives?: string;
    expectedResults?: string;
    successIndicators?: string;
    photoIds?: string[];
  }) =>
    http<Project, typeof body>('/super-admin/projects', { method: 'POST', body }),

  // CORRECTION ICI : Si l'erreur persiste, essayez d'enlever le premier "/" si votre base URL le gère déjà
  // ... (reste du fichier identique au précédent)

  // ... (reste du fichier identique au précédent)

  updateProject: (id: string, body: Partial<Project> & {
    photoIds?: string[];
    budgetAmount?: number;
    amountSpent?: number;
    startDate?: string;
    endDate?: string;
  }) =>
    // Note : Si PATCH échoue toujours, essayez de changer 'PATCH' par 'PUT' ci-dessous
    http<Project, typeof body>(`/super-admin/projects/${id}`, { method: 'PATCH', body }),

// ... (reste du fichier identique)

// ... (reste du fichier identique)

  listAntennaProjects: (params?: { page?: number; pageSize?: number; status?: string; q?: string }) =>
    http<ApiListResponse<Project>>(
      `/admin/projects?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`
    ),

  createAntennaProject: (body: {
    title: string;
    description?: string;
    status?: string;
    budgetPlanned?: number;
    budgetSpent?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    photoIds?: string[];
  }) =>
    http<Project, typeof body>('/admin/projects', { method: 'POST', body }),

  updateAntennaProject: (id: string, body: Partial<Project> & { photoIds?: string[] }) =>
    http<Project, typeof body>(`/admin/projects/${id}`, { method: 'PATCH', body }),

  deleteAntennaProject: (id: string) =>
    http(`/admin/projects/${id}`, { method: 'DELETE' }),

  deleteProject: (id: string) =>
    http(`/super-admin/projects/${id}`, { method: 'DELETE' }),

  listProjectsForMembers: (params?: { page?: number; pageSize?: number; status?: string; q?: string }) =>
    http<ApiListResponse<Project>>(
      `/member/projects?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.q ? `&q=${encodeURIComponent(params.q)}` : ''}`
    ),

  // ==========================================
  // DOCUMENTS & CONTENUS
  // ==========================================
  listDocuments: (params?: { page?: number; pageSize?: number; q?: string }) =>
    http<ApiListResponse<DocumentItem>>(
      `/super-admin/documents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`
    ),

  createSuperAdminDocument: (body: { title: string; description?: string; visibility?: string; fileAssetId: string }) =>
    http<DocumentItem, typeof body>('/super-admin/documents', { method: 'POST', body }),

  deleteDocument: (id: string) =>
    http(`/super-admin/documents/${id}`, { method: 'DELETE' }),

  listAntennaDocuments: (params?: { page?: number; pageSize?: number; q?: string }) =>
    http<ApiListResponse<DocumentItem>>(
      `/admin/documents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`
    ),

  createAntennaDocument: (body: { title: string; description?: string; fileAssetId?: string | null }) =>
    http<DocumentItem, typeof body>('/admin/documents', { method: 'POST', body }),

  updateAntennaDocument: (id: string, body: Partial<DocumentItem>) =>
    http<DocumentItem, Partial<DocumentItem>>(`/admin/documents/${id}`, { method: 'PATCH', body }),

  deleteAntennaDocument: (id: string) =>
    http(`/admin/documents/${id}`, { method: 'DELETE' }),

  listDocumentsForMembers: (params?: { page?: number; pageSize?: number; q?: string }) =>
    http<ApiListResponse<DocumentItem>>(
      `/member/documents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`
    ),

  listAntennaContents: (params?: { page?: number; pageSize?: number; q?: string; status?: string }) =>
    http<ApiListResponse<ContentPost>>(
      `/admin/contents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${params?.status ? `&status=${encodeURIComponent(params.status)}` : ''}`
    ),

  createAntennaContent: (body: {
    title: string;
    body?: string;
    content?: string;
    status?: string;
    coverImageFileId?: string | null;
  }) =>
    http<ContentPost, typeof body>('/admin/contents', { method: 'POST', body }),

  updateAntennaContent: (id: string, body: Partial<ContentPost>) =>
    http<ContentPost, Partial<ContentPost>>(`/admin/contents/${id}`, { method: 'PATCH', body }),

  deleteAntennaContent: (id: string) =>
    http(`/admin/contents/${id}`, { method: 'DELETE' }),

  listContentsForMembers: (params?: { page?: number; pageSize?: number; q?: string }) =>
    http<ApiListResponse<ContentPost>>(
      `/member/contents?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`
    ),

  // ==========================================
  // SYSTEME
  // ==========================================
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

  listNotifications: (params?: { page?: number; pageSize?: number }) =>
    http<ApiListResponse<NotificationItem>>(
      `/notifications?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}`
    ),

  listMyNotifications: (params?: { page?: number; pageSize?: number }) =>
    http<ApiListResponse<NotificationItem>>(
      `/notifications?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 100}`
    ),

  markNotificationRead: (id: string) =>
    http<{ ok: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  listAudit: (params?: { page?: number; pageSize?: number; action?: string }) =>
    http<ApiListResponse<AuditItem>>(
      `/audit?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.action ? `&action=${encodeURIComponent(params.action)}` : ''
      }`
    ),
};