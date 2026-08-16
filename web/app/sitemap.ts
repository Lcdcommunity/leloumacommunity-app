//web/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host') || 'leloumacommunity.com'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const base = `${protocol}://${host}`

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    { url: `${base}/confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}