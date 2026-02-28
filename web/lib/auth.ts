//web/lib/auth.ts
'use client';

import { http } from './http';
import { clearAuthState, setTokens } from './auth-store';
import type { LoginResponse } from '../types/auth';
import type { CurrentUser } from '../types/user';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const data = await http<LoginResponse, { email: string; password: string }>(
    '/auth/login',
    {
      method: 'POST',
      auth: false,
      body: { email, password },
    },
  );

  setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,
  });

  return data;
}

export async function logout(logoutAll = false): Promise<void> {
  try {
    await http('/auth/logout', {
      method: 'POST',
      body: { logoutAll },
    });
  } finally {
    clearAuthState();
  }
}

// Optionnel si ton backend expose /auth/me
export async function getCurrentUser(): Promise<CurrentUser> {
  return http<CurrentUser>('/auth/me', { method: 'GET' });
}