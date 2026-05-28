// web/lib/super-admin-api.ts
import type { ApiListResponse } from '../types/api';
import type { Antenna } from '../types/antenna';
import type { UserSummary } from '../types/user';
import { http } from './http';

/**
 * Type détaillé pour un utilisateur (Admin d'antenne)
 * Étend UserSummary pour inclure les champs de profil complets
 */
export interface UserDetail extends UserSummary {
  phone?: string;
  city?: string;
  country?: string;
  originSubPrefecture?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  associationTitle?: string;
  function?: string;
  adminAssignments?: Array<{
    id: string;
    isActive: boolean;
    antenna: {
      id: string;
      name: string;
      code: string;
      defaultCurrency?: string | null;
      city?: string | null;
      country?: string | null;
    };
  }>;
}

export type SuperAdminAdminPayload = {
  antennaId?: string;
  antennaIds?: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  associationTitle?: string;
  function?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  originSubPrefecture?: string;
  sendInvite?: boolean;
};

export type CreateAntennaPayload = {
  code?: string;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  admin?: Omit<SuperAdminAdminPayload, 'antennaId'>;
};

export const superAdminApi = {
  // --- Gestion des Antennes ---
  listAntennas: (params?: { page?: number; pageSize?: number; q?: string; isActive?: boolean }) =>
    http<ApiListResponse<Antenna>>(
      `/super-admin/antennas?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${typeof params?.isActive === 'boolean' ? `&isActive=${String(params.isActive)}` : ''}`,
    ),

  createAntenna: (body: CreateAntennaPayload) =>
    http<Antenna, CreateAntennaPayload>('/super-admin/antennas', {
      method: 'POST',
      body,
    }),

  updateAntenna: (id: string, body: Partial<CreateAntennaPayload>) =>
    http<Antenna, Partial<CreateAntennaPayload>>(`/super-admin/antennas/${id}`, {
      method: 'PATCH',
      body,
    }),

  deleteAntenna: (id: string) =>
    http(`/super-admin/antennas/${id}`, { method: 'DELETE' }),

  // --- Gestion des Administrateurs d'Antenne ---
  listAntennaAdmins: (params?: { page?: number; pageSize?: number; q?: string; status?: string }) =>
    http<ApiListResponse<UserSummary>>(
      `/super-admin/admins?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${params?.status ? `&status=${encodeURIComponent(params.status)}` : ''}`,
    ),

  getAntennaAdmin: (id: string) =>
    http<UserDetail>(`/super-admin/admins/${id}`),

  createAntennaAdmin: (body: SuperAdminAdminPayload) =>
    http<UserSummary, SuperAdminAdminPayload>('/super-admin/admins', {
      method: 'POST',
      body,
    }),

  updateAntennaAdmin: (id: string, body: Partial<SuperAdminAdminPayload>) =>
    http<UserSummary, Partial<SuperAdminAdminPayload>>(`/super-admin/admins/${id}`, {
      method: 'PATCH',
      body,
    }),

  suspendAntennaAdmin: (id: string) =>
    http(`/super-admin/admins/${id}/suspend`, { method: 'PATCH' }),

  activateAntennaAdmin: (id: string) =>
    http(`/super-admin/admins/${id}/activate`, { method: 'PATCH' }),

  deleteAntennaAdmin: (id: string) =>
    http(`/super-admin/admins/${id}`, { method: 'DELETE' }),
};