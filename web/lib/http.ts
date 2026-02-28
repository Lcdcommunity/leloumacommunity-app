//web/lib/http.ts
import { env } from './env';
import { getAccessToken, getRefreshToken, setTokens, clearAuthState } from './auth-store';
import type { ApiErrorPayload } from '../types/api';
import type { RefreshResponse } from '../types/auth';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  auth?: boolean;
  retryOn401?: boolean;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function refreshTokenRequest(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearAuthState();
    return false;
  }

  const data = (await res.json()) as RefreshResponse;
  setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,
  });

  return true;
}

export async function http<TResponse, TBody = unknown>(
  path: string,
  options?: RequestOptions<TBody>,
): Promise<TResponse> {
  const method = options?.method ?? 'GET';
  const useAuth = options?.auth ?? true;
  const retryOn401 = options?.retryOn401 ?? true;

  const headers: Record<string, string> = {
    ...(options?.headers ?? {}),
  };

  let body: BodyInit | undefined;

  if (options?.body instanceof FormData) {
    body = options.body;
  } else if (options?.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  if (useAuth) {
    const accessToken = getAccessToken();
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers,
    body,
  });

  if (res.status === 401 && useAuth && retryOn401) {
    const refreshed = await refreshTokenRequest();
    if (refreshed) {
      return http<TResponse, TBody>(path, { ...options, retryOn401: false });
    }
  }

  if (!res.ok) {
    const payload = (await parseJsonSafe(res)) as ApiErrorPayload | string | null;
    const message =
      typeof payload === 'string'
        ? payload
        : Array.isArray(payload?.message)
        ? payload?.message.join(', ')
        : payload?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }

  if (res.status === 204) return undefined as TResponse;
  return (await res.json()) as TResponse;
}