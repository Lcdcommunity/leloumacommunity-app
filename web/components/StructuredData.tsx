// web/components/StructuredData.tsx
import { headers } from 'next/headers'
import { env } from '../lib/env'

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
  if (org.logoUrl) data.logo = org.logoUrl
  if (org.email) data.email = org.email
  if (org.phone) data.telephone = org.phone
  if (org.registrationNumber) data.identifier = org.registrationNumber

  if (org.addressLine1 || org.city || org.postalCode || org.country) {
    data.address = {
      '@type': 'PostalAddress',
      ...(org.addressLine1 ? { streetAddress: org.addressLine1 } : {}),
      ...(org.city ? { addressLocality: org.city } : {}),
      ...(org.postalCode ? { postalCode: org.postalCode } : {}),
      ...(org.country ? { addressCountry: org.country } : {}),
    }
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}