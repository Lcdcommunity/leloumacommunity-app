/**
 * Configuration des variables d'environnement.
 * Note: NEXT_PUBLIC_ est obligatoire pour que les variables soient accessibles côté client.
 */

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Fallback pour le développement local
  return 'http://localhost:3001/api';
};

export const env = {
  // On utilise une fonction ou un accès direct pour forcer Next.js à faire le remplacement
  apiUrl: getApiUrl(),
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Lelouma Community',
  webUrl: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
};

// Petit log de sécurité pour t'aider à débugger dans la console du navigateur
if (process.env.NODE_ENV === 'development') {
  console.log('🌐 API URL:', env.apiUrl);
}