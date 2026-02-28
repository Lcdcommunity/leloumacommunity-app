//web/lib/env.ts
export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Association Community',
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
};