// web/components/StructuredData.tsx
import { headers } from 'next/headers'
import { env } from '../lib/env'

// Correspondance nom de pays (tel que stocké en base, ex: "Guinée") → code
// ISO 3166-1 alpha-2 attendu par schema.org pour addressCountry. Reprend les
// noms de la liste COUNTRIES utilisée sur l'écran d'inscription, pour rester
// cohérent avec les valeurs réellement enregistrées par les associations.
const COUNTRY_ISO_MAP: Record<string, string> = {
  'Guinée': 'GN', 'France': 'FR', 'Sénégal': 'SN', "Côte d'Ivoire": 'CI',
  'Mali': 'ML', 'Maroc': 'MA', 'Canada': 'CA', 'États-Unis': 'US',
  'Belgique': 'BE', 'Suisse': 'CH', 'Allemagne': 'DE', 'Royaume-Uni': 'GB',
  'Espagne': 'ES', 'Italie': 'IT', 'Sierra Leone': 'SL', 'Libéria': 'LR',
  'Guinée-Bissau': 'GW', 'Gambie': 'GM', 'Angola': 'AO', 'Cameroun': 'CM',
  'Niger': 'NE', 'Afrique du Sud': 'ZA', 'Mozambique': 'MZ', 'Portugal': 'PT',
};

function toIsoCountry(country: string): string {
  return COUNTRY_ISO_MAP[country] ?? country;
}

async function getOrgData(domain: string) {
  try {
    const res = await fetch(`${env.apiUrl}/public/theme?domain=${encodeURIComponent(domain)}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function StructuredData() {
  const headersList = await headers()
  const host = (headersList.get('host') || '').replace(/^www\./, '')
  const org = await getOrgData(host)

  if (!org?.name) return null

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    name: org.name,
    url: `https://${host}`,
  }

  if (org.legalName) data.legalName = org.legalName
  if (org.logoUrl) {
    data.logo = org.logoUrl
    // 🔥 AJOUT : "image" en plus de "logo" — Google le signale comme
    // recommandé (facultatif) pour ce type de résultat enrichi. Même
    // fichier que le logo, pas de champ dédié côté association.
    data.image = org.logoUrl
  }
  if (org.email) data.email = org.email
  if (org.phone) data.telephone = org.phone
  if (org.registrationNumber) data.identifier = org.registrationNumber

  if (org.addressLine1 || org.city || org.postalCode || org.country) {
    data.address = {
      '@type': 'PostalAddress',
      ...(org.addressLine1 ? { streetAddress: org.addressLine1 } : {}),
      ...(org.city ? { addressLocality: org.city } : {}),
      ...(org.postalCode ? { postalCode: org.postalCode } : {}),
      // 🔥 CORRIGÉ : Google attend un code ISO ("GN"), pas le nom complet
      // ("Guinée") tel que stocké en base — conversion via COUNTRY_ISO_MAP.
      ...(org.country ? { addressCountry: toIsoCountry(org.country) } : {}),
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}