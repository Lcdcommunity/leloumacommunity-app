// web/next.config.ts
//
// v1.1 — 🆕 AJOUT (console unique) : si TRANSFER_PORTAL_URL est défini, le back-office Direct Transf'air
//   (web-admin construit avec VITE_BASE_PATH=/transfert) est servi sous <domaine>/transfert via une
//   réécriture qui retire le préfixe. Sans cette variable, rien ne change (aucune réécriture ajoutée).
//   Le chemin se règle avec TRANSFER_CONSOLE_PATH (défaut /transfert) — il doit rester identique à celui
//   du backend LCD et au VITE_BASE_PATH du portail.
//
import type { NextConfig } from 'next';

const BACKEND_URL = (process.env.BACKEND_URL ?? 'https://lcd-community.onrender.com').replace(/\/+$/, '');

const TRANSFER_PORTAL_URL = (process.env.TRANSFER_PORTAL_URL ?? '').trim().replace(/\/+$/, '');
const rawConsolePath = (process.env.TRANSFER_CONSOLE_PATH ?? '/transfert').trim().replace(/\/+$/, '');
const TRANSFER_CONSOLE_PATH = /^\/[A-Za-z0-9_-]+$/.test(rawConsolePath) ? rawConsolePath : '/transfert';

const nextConfig: NextConfig = {
  async rewrites() {
    const rules = [
      {
        source: '/static/:path*',
        destination: `${BACKEND_URL}/static/:path*`,
      },
    ];

    if (TRANSFER_PORTAL_URL) {
      rules.push(
        { source: TRANSFER_CONSOLE_PATH, destination: `${TRANSFER_PORTAL_URL}/` },
        { source: `${TRANSFER_CONSOLE_PATH}/:path*`, destination: `${TRANSFER_PORTAL_URL}/:path*` },
      );
    }

    return rules;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/static/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;