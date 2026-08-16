//web/app/robots.ts
import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host') || 'leloumacommunity.com'
  const protocol = host.includes('localhost') ? 'http' : 'https'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/super-admin', '/system-admin', '/api'],
    },
    sitemap: `${protocol}://${host}/sitemap.xml`,
  }
}