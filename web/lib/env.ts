// web/lib/env.ts
function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function getApiUrl(): string {
  const value = readEnv('NEXT_PUBLIC_API_URL');

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001/api';
  }

  throw new Error("Variable d'environnement manquante: NEXT_PUBLIC_API_URL");
}

function getWebUrl(): string {
  const value = readEnv('NEXT_PUBLIC_WEB_URL');

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  return 'http://localhost:3000';
}

export const env = {
  apiUrl: getApiUrl(),
  appName: readEnv('NEXT_PUBLIC_APP_NAME') || 'Lelouma Community',
  webUrl: getWebUrl(),
};

if (process.env.NODE_ENV === 'development') {
  console.log('🌐 API URL:', env.apiUrl);
  console.log('🖥️ WEB URL:', env.webUrl);
}