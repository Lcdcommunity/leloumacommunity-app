import type { NextConfig } from 'next';

// Extraction dynamique de l'URL du backend pour le proxy
const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.includes('onrender') 
  ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') 
  : 'https://lcd-community.onrender.com';

const BACKEND_URL = (process.env.BACKEND_URL ?? backendBaseUrl).replace(/\/+$/, '');

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: `${BACKEND_URL}/static/:path*`,
      },
      // 🔥 Proxy API : le serveur Vercel fait le relais vers Render pour contourner les CORS du navigateur
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
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