// web/lib/env.ts

function getRequiredPublicEnv(name: 'NEXT_PUBLIC_API_URL' | 'NEXT_PUBLIC_WEB_URL'): string {
  const value = process.env[name]?.trim();

  if (!value) {
    if (process.env.NODE_ENV === 'development') {
      if (name === 'NEXT_PUBLIC_API_URL') {
        return 'http://localhost:3001/api';
      }

      return 'http://localhost:3000';
    }

    throw new Error(`Variable d'environnement manquante: ${name}`);
  }

  return value;
}

export const env = {
  apiUrl: getRequiredPublicEnv('NEXT_PUBLIC_API_URL'),
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Lelouma Community',
  webUrl: getRequiredPublicEnv('NEXT_PUBLIC_WEB_URL'),
};

if (process.env.NODE_ENV === 'development') {
  console.log('🌐 API URL:', env.apiUrl);
  console.log('🖥️ WEB URL:', env.webUrl);
}