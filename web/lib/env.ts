// web/lib/env.ts
const NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
const NEXT_PUBLIC_WEB_URL = process.env.NEXT_PUBLIC_WEB_URL?.trim();
const NEXT_PUBLIC_APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim();

function getApiUrl(): string {
  if (NEXT_PUBLIC_API_URL && NEXT_PUBLIC_API_URL.length > 0) {
    return NEXT_PUBLIC_API_URL;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001/api';
  }

  console.error('NEXT_PUBLIC_API_URL est manquante en production.');
  return '';
}

function getWebUrl(): string {
  if (NEXT_PUBLIC_WEB_URL && NEXT_PUBLIC_WEB_URL.length > 0) {
    return NEXT_PUBLIC_WEB_URL;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  console.error('NEXT_PUBLIC_WEB_URL est manquante en production.');
  return '';
}

export const env = {
  apiUrl: getApiUrl(),
  appName:
    NEXT_PUBLIC_APP_NAME && NEXT_PUBLIC_APP_NAME.length > 0
      ? NEXT_PUBLIC_APP_NAME
      : 'Lelouma Community',
  webUrl: getWebUrl(),
};

if (typeof window !== 'undefined') {
  console.log('🌐 NEXT_PUBLIC_API_URL =', env.apiUrl);
  console.log('🖥️ NEXT_PUBLIC_WEB_URL =', env.webUrl);
}