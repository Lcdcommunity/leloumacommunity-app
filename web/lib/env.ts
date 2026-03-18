// web/lib/env.ts
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
const NEXT_PUBLIC_WEB_URL = process.env.NEXT_PUBLIC_WEB_URL?.trim();
const NEXT_PUBLIC_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim();

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function requireEnv(name: string, value?: string): string {
  if (!value || value.length === 0) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }

  return normalizeUrl(value);
}

function getApiUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return normalizeUrl(NEXT_PUBLIC_API_URL || 'http://localhost:3001/api');
  }

  return requireEnv('NEXT_PUBLIC_API_URL', NEXT_PUBLIC_API_URL);
}

function getWebUrl(): string {
  if (process.env.NODE_ENV === 'development') {
    return normalizeUrl(NEXT_PUBLIC_WEB_URL || 'http://localhost:3000');
  }

  return requireEnv('NEXT_PUBLIC_WEB_URL', NEXT_PUBLIC_WEB_URL);
}

export const env = {
  apiUrl: getApiUrl(),
  webUrl: getWebUrl(),
  appName:
    NEXT_PUBLIC_APP_NAME && NEXT_PUBLIC_APP_NAME.length > 0
      ? NEXT_PUBLIC_APP_NAME
      : 'Lelouma Community',
};

if (typeof window !== 'undefined') {
  console.log('🌐 NEXT_PUBLIC_API_URL =', env.apiUrl);
  console.log('🖥️ NEXT_PUBLIC_WEB_URL =', env.webUrl);
}