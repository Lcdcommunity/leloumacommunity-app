import type { NextConfig } from 'next';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Proxifie /static/* → backend NestJS qui sert les uploads via express.static
  // Sans ce rewrite, le navigateur cherche /static/... sur localhost:3000 (Next)
  // au lieu de localhost:3001 (NestJS) → 404 sur toutes les images de projets/avatars.
  async rewrites() {
    return [
      {
        source: '/static/:path*',
        destination: `${BACKEND_URL}/static/:path*`,
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