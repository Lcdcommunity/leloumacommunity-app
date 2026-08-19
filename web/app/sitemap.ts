//web/app/sitemap.ts
import type { MetadataRoute } from 'next'

// URL fixe, volontairement indépendante du header Host de la requête entrante :
// avant, un crawl via www.leloumacommunity.com générait un sitemap avec des URLs
// en www, et un crawl via leloumacommunity.com générait des URLs sans www — deux
// jeux d'URLs "officiels" différents pour Google, à l'origine des doublons.
const BASE_URL = 'https://www.leloumacommunity.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.5 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.8 },
    { url: `${BASE_URL}/confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}