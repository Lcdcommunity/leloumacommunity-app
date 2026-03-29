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
// TYPES & INTERFACES
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

// --- TYPES LOCAUX POUR LES NOUVEAUX MODULES ---
export interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  title: string;
  description?: string | null;
  expenseDate: string;
  paymentMethod: string;
  status: string;
  rejectionReason?: string | null;
  proofFileId?: string | null;
  engagedByUserId: string;
  validatedByUserId?: string | null;
  createdAt: string;
  engagedByUser?: { firstName: string; lastName: string; email: string };
  proofFile?: { url: string; originalFilename: string } | null;
  antenna?: { name: string }; 
}

export interface EventItem {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  startsAt: string;
  endsAt?: string | null;
  locationText?: string | null;
  isOnline: boolean;
  meetingLink?: string | null;
  createdAt: string;
}

export interface Sponsor {
  id: string;
  name: string;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  isActive: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// API CLIENT
// ─────────────────────────────────────────────────────────────────────────────
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
    currency?: string; 
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
  // TARIFICATION & SAAS 
  // ==========================================
  getPricingSuperAdmin: () =>
    http<Record<string, { monthlyQuota: number; membershipCard: number; expenseValidationThreshold?: number | null }>>('/super-admin/settings/pricing'),

  updatePricingSuperAdmin: (body: Record<string, { monthlyQuota: number; membershipCard: number; expenseValidationThreshold?: number | null }>) =>
    http('/super-admin/settings/pricing', { method: 'PUT', body }),

  getAssociationPricing: () =>
    http<Record<string, { monthlyQuota: number; membershipCard: number }>>('/member/pricing'),

  getSaaSPlanInfo: () => 
    http<{ subscriptionPlan: string; stripeCustomerId?: string; subscriptionExpiresAt?: string }>('/super-admin/billing/info'),

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
      antennaBalances?: Array<{ id: string; name: string; balance: number; currency: string }>;
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
  // DÉPENSES (EXPENSES)
  // ==========================================
  listAntennaExpenses: (params?: { page?: number; pageSize?: number; status?: string; category?: string; q?: string }) =>
    http<ApiListResponse<Expense>>(
      `/admin/expenses?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.category ? `&category=${encodeURIComponent(params.category)}` : ''}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }`
    ),

  createAntennaExpense: (body: {
    amount: number;
    currency?: string;
    category: string;
    title: string;
    description?: string;
    expenseDate: string;
    paymentMethod?: string;
    proofFileId?: string | null;
  }) =>
    http<Expense, typeof body>('/admin/expenses', { method: 'POST', body }),

  updateAntennaExpense: (id: string, body: Partial<{
    amount: number;
    category: string;
    title: string;
    description: string;
    expenseDate: string;
    paymentMethod: string;
    proofFileId: string | null;
  }>) =>
    http<Expense, typeof body>(`/admin/expenses/${id}`, { method: 'PATCH', body }),

  deleteAntennaExpense: (id: string) =>
    http(`/admin/expenses/${id}`, { method: 'DELETE' }),

  listSuperAdminExpenses: (params?: { page?: number; pageSize?: number; status?: string; antennaId?: string }) =>
    http<ApiListResponse<Expense>>(
      `/super-admin/expenses?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.antennaId ? `&antennaId=${encodeURIComponent(params.antennaId)}` : ''}`
    ),

  validateExpenseSuperAdmin: (id: string) =>
    http<{ message: string; expense: Expense }>(`/super-admin/expenses/${id}/validate`, { method: 'PATCH' }),

  rejectExpenseSuperAdmin: (id: string, body?: { rejectionReason?: string }) =>
    http<{ message: string; expense: Expense }, typeof body>(`/super-admin/expenses/${id}/reject`, { method: 'PATCH', body: body ?? {} }),

  listMemberExpenses: (params?: { page?: number; pageSize?: number; category?: string }) =>
    http<ApiListResponse<Expense>>(
      `/member/expenses?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.category ? `&category=${encodeURIComponent(params.category)}` : ''
      }`
    ),

  // ==========================================
  // PROJETS & PROPOSITIONS
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

  updateProject: (id: string, body: Partial<Project> & {
    photoIds?: string[];
    budgetAmount?: number;
    amountSpent?: number;
    startDate?: string;
    endDate?: string;
  }) =>
    http<Project, typeof body>(`/super-admin/projects/${id}`, { method: 'PATCH', body }),

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

  createProjectProposalMember: (body: {
    title: string;
    description: string;
    expectedBudget?: number;
    attachmentFileAssetId?: string | null;
  }) =>
    http<ProjectProposal, typeof body>('/member/project-proposals', { method: 'POST', body }),

  listMyProjectProposals: (params?: { page?: number; pageSize?: number; status?: string }) =>
    http<ApiListResponse<ProjectProposal>>(
      `/member/project-proposals?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 50}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }`
    ),

  listProjectProposals: (params?: { page?: number; pageSize?: number; status?: string }) =>
    http<ApiListResponse<ProjectProposal>>(
      `/admin/project-proposals?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }`
    ),

  approveProjectProposal: (id: string, body?: { reviewComment?: string }) =>
    http<ProjectProposal, { reviewComment?: string }>(`/admin/project-proposals/${id}/approve`, {
      method: 'PATCH',
      body: body ?? {},
    }),

  rejectProjectProposal: (id: string, body?: { reviewComment?: string }) =>
    http<ProjectProposal, { reviewComment?: string }>(`/admin/project-proposals/${id}/reject`, {
      method: 'PATCH',
      body: body ?? {},
    }),

  // ==========================================
  // ÉVÉNEMENTS 
  // ==========================================
  listEvents: (params?: { page?: number; pageSize?: number; status?: string; type?: string }) =>
    http<ApiListResponse<EventItem>>(
      `/admin/events?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.status ? `&status=${encodeURIComponent(params.status)}` : ''
      }${params?.type ? `&type=${encodeURIComponent(params.type)}` : ''}`
    ),

  createEvent: (body: Partial<EventItem>) =>
    http<EventItem, typeof body>('/admin/events', { method: 'POST', body }),

  updateEvent: (id: string, body: Partial<EventItem>) =>
    http<EventItem, typeof body>(`/admin/events/${id}`, { method: 'PATCH', body }),

  deleteEvent: (id: string) =>
    http(`/admin/events/${id}`, { method: 'DELETE' }),

  registerEventAttendance: (id: string, body: { status: string }) =>
    http<{ message: string }, typeof body>(`/member/events/${id}/attendance`, { method: 'POST', body }),

  // ==========================================
  // PARTENAIRES & SPONSORS 
  // ==========================================
  listSponsors: () =>
    http<ApiListResponse<Sponsor>>('/super-admin/sponsors'),

  createSponsor: (body: Omit<Sponsor, 'id'>) =>
    http<Sponsor, typeof body>('/super-admin/sponsors', { method: 'POST', body }),

  updateSponsor: (id: string, body: Partial<Sponsor>) =>
    http<Sponsor, typeof body>(`/super-admin/sponsors/${id}`, { method: 'PATCH', body }),

  deleteSponsor: (id: string) =>
    http(`/super-admin/sponsors/${id}`, { method: 'DELETE' }),

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
// ==========================================
  // SYSTEM ADMIN (GRAND CHEF)
  // ==========================================
  
  // 1. Créer une nouvelle association
  createAssociationSystemAdmin: (body: {
    associationName: string;
    code: string;
    domain?: string;
    themeColors?: Record<string, string>;
    fontFamily?: string;
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminPhone: string;
    country?: string;
    city?: string;
  }) =>
    http<{ message: string; associationId: string }, typeof body>('/system-admin/associations', {
      method: 'POST',
      body,
    }),

  // 2. Récupérer les stats du tableau de bord global
  getSystemDashboard: () =>
    http<{
      stats: { totalAssociations: number; totalUsers: number };
      associations: Array<{
        id: string;
        name: string;
        code: string;
        domainName: string | null;
        createdAt: string;
        _count: { users: number; antennas: number };
      }>;
    }>('/system-admin/dashboard'),

  // 3. Récupérer les logs d'audit système
  getSystemAuditLogs: () =>
    http<Array<{ 
      id: string; 
      action: string; 
      userName: string; 
      associationName: string; 
      createdAt: string; 
      entity: string;
      ipAddress?: string;
    }>>('/system-admin/audit-logs'),
    // 4. Récupérer une association par son ID
  // 4. Récupérer une association par son ID avec ses compteurs
  getAssociationByIdSystemAdmin: (id: string) =>
    http<{
      id: string;
      name: string;
      code: string;
      isActive: boolean;
      domainName?: string | null;
      defaultCurrency: string;
      country?: string | null;
      createdAt: string;
      updatedAt: string;
      _count: {
        users: number;
        antennas: number;
      };
    }>(`/system-admin/associations/${id}`),

  // 5. Changer le statut (Activer/Suspendre)
  // 5. Changer le statut (Activer/Suspendre)
  updateAssociationStatusSystemAdmin: (id: string, isActive: boolean) =>
    http<{ message: string }>(`/system-admin/associations/${id}/status`, {
      method: 'PATCH',
      body: { isActive },
    }),
}; // <-- Fin de l'objet "api"