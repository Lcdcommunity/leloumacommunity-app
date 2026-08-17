// web/components/StructuredData.tsx

import { headers } from 'next/headers';
import { env } from '../lib/env';

/**
 * ============================================================
 * CORRESPONDANCE PAYS → ISO 3166-1 ALPHA-2
 * ============================================================
 *
 * Les associations peuvent enregistrer le nom complet du pays
 * en base de données.
 *
 * Schema.org / Google acceptent de préférence le code ISO.
 */
const COUNTRY_ISO_MAP: Record<string, string> = {
  Guinée: 'GN',
  France: 'FR',
  Sénégal: 'SN',
  "Côte d'Ivoire": 'CI',
  Mali: 'ML',
  Maroc: 'MA',
  Canada: 'CA',
  'États-Unis': 'US',
  Belgique: 'BE',
  Suisse: 'CH',
  Allemagne: 'DE',
  'Royaume-Uni': 'GB',
  Espagne: 'ES',
  Italie: 'IT',
  'Sierra Leone': 'SL',
  Libéria: 'LR',
  'Guinée-Bissau': 'GW',
  Gambie: 'GM',
  Angola: 'AO',
  Cameroun: 'CM',
  Niger: 'NE',
  'Afrique du Sud': 'ZA',
  Mozambique: 'MZ',
  Portugal: 'PT',
};

/**
 * Convertit un nom de pays en code ISO.
 */
function toIsoCountry(country: string): string {
  return COUNTRY_ISO_MAP[country] ?? country;
}

/**
 * ============================================================
 * RÉCUPÉRATION DES DONNÉES PUBLIQUES DE L'ASSOCIATION
 * ============================================================
 */
async function getOrgData(domain: string) {
  try {
    const res = await fetch(
      `${env.apiUrl}/public/theme?domain=${encodeURIComponent(domain)}`,
      {
        next: {
          revalidate: 3600,
        },
      },
    );

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    return null;
  }
}

/**
 * ============================================================
 * STRUCTURED DATA — SCHEMA.ORG
 * ============================================================
 *
 * Cette donnée permet aux moteurs de recherche de mieux
 * comprendre l'identité de l'organisation correspondant
 * au domaine actuellement consulté.
 *
 * IMPORTANT :
 * L'application étant multi-tenant, les informations sont
 * dynamiques selon le domaine.
 *
 * Pour Lélouma Communauté pour le Développement, nous
 * renforçons explicitement l'identité de l'organisation.
 */
export default async function StructuredData() {
  const headersList = await headers();

  /**
   * Selon l'environnement (Vercel, Render, proxy, etc.),
   * plusieurs headers peuvent être disponibles.
   *
   * On privilégie x-forwarded-host lorsqu'il existe.
   */
  const rawHost =
    headersList.get('x-forwarded-host') ||
    headersList.get('host') ||
    '';

  /**
   * Nettoyage :
   * - suppression de www.
   * - suppression éventuelle du port
   */
  const host = rawHost
    .split(',')[0]
    .trim()
    .replace(/^www\./i, '')
    .split(':')[0]
    .toLowerCase();

  if (!host) {
    return null;
  }

  /**
   * Récupération des informations de l'association
   * correspondant au domaine.
   */
  const org = await getOrgData(host);

  if (!org?.name) {
    return null;
  }

  /**
   * ==========================================================
   * IDENTIFICATION SPÉCIALE DE LCD
   * ==========================================================
   *
   * On ne fait ceci QUE pour le domaine officiel de LCD.
   *
   * Cela évite de modifier l'identité des autres associations
   * utilisant la même plateforme.
   */
  const isLeloumaCommunity =
    host === 'leloumacommunity.com' ||
    host === 'www.leloumacommunity.com';

  /**
   * Nom principal.
   *
   * Pour LCD :
   * "Lélouma Communauté pour le Développement"
   *
   * Pour les autres associations :
   * nom provenant de la base de données.
   */
  const organizationName = isLeloumaCommunity
    ? 'Lélouma Communauté pour le Développement'
    : org.name;

  /**
   * Nom légal.
   *
   * Si le nom légal est disponible en base, on l'utilise.
   * Pour LCD, on garantit le nom officiel souhaité.
   */
  const legalName = isLeloumaCommunity
    ? 'Lélouma Communauté pour le Développement'
    : org.legalName || org.name;

  /**
   * URL canonique de l'organisation.
   */
  const organizationUrl = `https://${host}`;

  /**
   * ==========================================================
   * OBJET SCHEMA.ORG
   * ==========================================================
   */
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',

    /**
     * NGO est particulièrement adapté à une organisation
     * non gouvernementale / associative.
     */
    '@type': 'NGO',

    /**
     * Identifiant unique de l'entité.
     *
     * Cela aide les moteurs à comprendre que cette organisation
     * correspond à cette URL.
     */
    '@id': `${organizationUrl}/#organization`,

    /**
     * Nom officiel.
     */
    name: organizationName,

    /**
     * Nom légal.
     */
    legalName,

    /**
     * URL officielle.
     */
    url: organizationUrl,

    /**
     * Langue principale du site.
     */
    inLanguage: 'fr',
  };

  /**
   * ==========================================================
   * NOMS ALTERNATIFS
   * ==========================================================
   *
   * Important pour les recherches :
   *
   * - Lélouma Communauté pour le Développement
   * - LCD
   * - Lelouma Community
   */
  if (isLeloumaCommunity) {
    data.alternateName = [
      'LCD',
      'Lelouma Community',
      'Lélouma Communauté',
    ];
  }

  /**
   * ==========================================================
   * LOGO / IMAGE
   * ==========================================================
   */
  if (org.logoUrl) {
    data.logo = {
      '@type': 'ImageObject',
      url: org.logoUrl,
    };

    data.image = org.logoUrl;
  }

  /**
   * ==========================================================
   * CONTACT
   * ==========================================================
   */
  if (org.email) {
    data.email = org.email;
  }

  if (org.phone) {
    data.telephone = org.phone;
  }

  /**
   * ==========================================================
   * IDENTIFIANT OFFICIEL
   * ==========================================================
   */
  if (org.registrationNumber) {
    data.identifier = {
      '@type': 'PropertyValue',
      propertyID: 'registrationNumber',
      value: org.registrationNumber,
    };
  }

  /**
   * ==========================================================
   * ADRESSE
   * ==========================================================
   */
  if (
    org.addressLine1 ||
    org.city ||
    org.postalCode ||
    org.country
  ) {
    data.address = {
      '@type': 'PostalAddress',

      ...(org.addressLine1
        ? {
            streetAddress: org.addressLine1,
          }
        : {}),

      ...(org.city
        ? {
            addressLocality: org.city,
          }
        : {}),

      ...(org.postalCode
        ? {
            postalCode: org.postalCode,
          }
        : {}),

      ...(org.country
        ? {
            addressCountry: toIsoCountry(org.country),
          }
        : {}),
    };
  }

  /**
   * ==========================================================
   * INFORMATIONS GÉOGRAPHIQUES POUR LCD
   * ==========================================================
   *
   * Ces informations sont volontairement limitées à LCD.
   *
   * Elles permettent de renforcer l'association entre :
   *
   * Lélouma
   * + Guinée
   * + développement communautaire
   * + organisation
   */
  if (isLeloumaCommunity) {
    data.areaServed = {
      '@type': 'Place',
      name: 'Lélouma, Guinée',
    };

    data.description =
      'Lélouma Communauté pour le Développement (LCD) est une organisation engagée pour le développement communautaire, social et environnemental de Lélouma en Guinée.';
  } else if (org.description) {
    /**
     * Pour les autres associations, on utilise leur description
     * provenant de la base de données si elle existe.
     */
    data.description = org.description;
  }

  /**
   * ==========================================================
   * RETOUR DU JSON-LD
   * ==========================================================
   */
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}