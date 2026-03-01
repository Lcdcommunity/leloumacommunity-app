// web/lib/env.ts
export const env = {
  // On s'assure que l'URL est toujours définie, même si le .env n'est pas lu
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Lelouma Community',
};