//web/app/robots.ts
import type { MetadataRoute } from 'next'

// Même correction que sitemap.ts : URL fixe plutôt que dérivée du Host reçu.
const BASE_URL = 'https://www.leloumacommunity.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/super-admin', '/system-admin', '/api'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}