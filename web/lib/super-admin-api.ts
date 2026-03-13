//web/lib/super-admin-api.ts
import type { ApiListResponse } from '../types/api';
import type { Antenna } from '../types/antenna';
import type { UserSummary } from '../types/user';
import { http } from './http';

export type SuperAdminAdminPayload = {
  antennaId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  associationTitle?: string;
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

  listAntennaAdmins: (params?: { page?: number; pageSize?: number; q?: string; status?: string }) =>
    http<ApiListResponse<UserSummary>>(
      `/super-admin/admins?page=${params?.page ?? 1}&pageSize=${params?.pageSize ?? 20}${
        params?.q ? `&q=${encodeURIComponent(params.q)}` : ''
      }${params?.status ? `&status=${encodeURIComponent(params.status)}` : ''}`,
    ),

  createAntennaAdmin: (body: SuperAdminAdminPayload) =>
    http<UserSummary, SuperAdminAdminPayload>('/super-admin/admins', {
      method: 'POST',
      body,
    }),

  suspendAntennaAdmin: (id: string) =>
    http(`/super-admin/admins/${id}/suspend`, { method: 'PATCH' }),

  activateAntennaAdmin: (id: string) =>
    http(`/super-admin/admins/${id}/activate`, { method: 'PATCH' }),

  deleteAntennaAdmin: (id: string) =>
    http(`/super-admin/admins/${id}`, { method: 'DELETE' }),
};