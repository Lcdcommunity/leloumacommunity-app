// web/lib/http.ts
import { env } from './env';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearAuthState,
} from './auth-store';
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

function getBaseUrl(): string {
  const url = env.apiUrl?.trim();

  if (!url) {
    throw new Error("Configuration manquante : NEXT_PUBLIC_API_URL");
  }

  return url.replace(/\/+$/, '');
}

// Sur une URL Vercel par défaut ou en local, il n'y a pas de "vrai" domaine
// de tenant à vérifier — on laisse le backend ignorer la vérification (via
// Origin, prioritaire côté serveur) plutôt que de prétendre qu'il s'agit
// d'une association précise.
function getTenantDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  if (host.endsWith('.vercel.app') || host === 'localhost' || host === '127.0.0.1') {
    return undefined;
  }
  return host.replace(/^www\./, '');
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    console.error('Réponse non JSON:', text);
    return text;
  }
}

async function refreshTokenRequest(): Promise<boolean> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) return false;

  const baseUrl = getBaseUrl();
  const tenantDomain = getTenantDomain();

  const res = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tenantDomain ? { 'x-tenant-domain': tenantDomain } : {}),
    },
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
  const baseUrl = getBaseUrl();
  const tenantDomain = getTenantDomain();

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const headers: Record<string, string> = {
    ...(tenantDomain ? { 'x-tenant-domain': tenantDomain } : {}),
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
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
  }

  const res = await fetch(`${baseUrl}${normalizedPath}`, {
    method,
    headers,
    body,
  });

  if (res.status === 401 && useAuth && retryOn401) {
    const refreshed = await refreshTokenRequest();

    if (refreshed) {
      return http<TResponse, TBody>(normalizedPath, {
        ...options,
        retryOn401: false,
      });
    }
  }

  if (!res.ok) {
    const payload = (await parseJsonSafe(res)) as ApiErrorPayload | string | null;

    const message =
      typeof payload === 'string'
        ? payload
        : Array.isArray(payload?.message)
        ? payload.message.join(', ')
        : payload?.message || `Erreur HTTP ${res.status}`;

    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as TResponse;
  }

  const data = await parseJsonSafe(res);

  return data as TResponse;
}