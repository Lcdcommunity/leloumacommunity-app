// web/lib/auth.ts
'use client';

import { http } from './http';
import { clearAuthState, setTokens } from './auth-store';
import type { LoginResponse } from '../types/auth';
import type { CurrentUser } from '../types/user';

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  // 🔥 IMPORTANT : récupération du domaine courant
  const tenantDomain =
    typeof window !== 'undefined'
      ? window.location.hostname
      : undefined;

  const data = await http<
    LoginResponse,
    { email: string; password: string }
  >('/auth/login', {
    method: 'POST',
    auth: false,
    body: { email, password },

    // ✅ AJOUT CRITIQUE (sans casser le reste)
    headers: tenantDomain
      ? {
          'x-tenant-domain': tenantDomain,
        }
      : undefined,
  });

  setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,
  });

  return data;
}

export async function logout(logoutAll = false): Promise<void> {
  try {
    await http<void, { logoutAll: boolean }>('/auth/logout', {
      method: 'POST',
      body: { logoutAll },
    });
  } finally {
    clearAuthState();
  }
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return http<CurrentUser>('/auth/me', {
    method: 'GET',
  });
}