// web/app/layout.tsx
// v2.1.0 — Restauration de Thierno Doniko comme second `author` (développeur
//          de la plateforme) dans les DEUX branches de generateMetadata —
//          Grand Chef (dkmoney.store) et chaque association cliente. Il avait
//          été retiré par erreur en v2.0.0 en supposant que le crédit
//          personnel du développeur n'avait pas sa place sur le site d'un
//          client marque-blanche ; ce n'est pas le cas : il doit apparaître
//          comme développeur sur toutes les instances, y compris celles des
//          clients (ex. leloumacommunity.com), pas seulement sur la
//          plateforme elle-même.
//
// v2.0.0 — CORRECTIF FUITE SEO MULTI-TENANT : le `metadata` statique était
//          câblé en dur sur "Lélouma Communauté pour le Développement"
//          (title, description, applicationName, authors, creator, publisher,
//          keywords, metadataBase, openGraph, twitter). Comme page.tsx (page
//          d'accueil) ne redéfinit que title/description/canonical/openGraph,
//          Next.js héritait du reste tel quel depuis ce layout — et les pages
//          sans generateMetadata propre (login, signup, etc.) héritaient de
//          TOUT. Résultat concret vérifié en prod : dkmoney.store (la
//          plateforme AssoGlobal elle-même, sans association) affichait un
//          twitter:title, des keywords et un meta-organization "Lélouma
//          Communauté pour le Développement" — et n'importe quel autre client
//          de la plateforme aurait le même problème.
//
//          `metadata` devient donc `generateMetadata()`, résolu par domaine
//          (même logique que app/page.tsx : host → getOrgData). Deux
//          branches : aucune association résolue → identité générique
//          AssoGlobal (couvre dkmoney.store et tout domaine non configuré) ;
//          association résolue → ses propres name/logo/legalName/code,
//          sans aucune référence à Lélouma en dur.
//
//          Les <meta> bruts posés à la main dans le <head> (organization,
//          organization-alternate-name, geo.region, geo.placename,
//          application-name="Grand Chef", apple-mobile-web-app-title) sont
//          retirés : ils dupliquaient/contredisaient les champs équivalents
//          de la Metadata API ci-dessous, et l'identité géographique/
//          organisationnelle par association est déjà couverte dynamiquement
//          par components/StructuredData.tsx (JSON-LD Schema.org).

import './globals.css';
import type { Metadata, Viewport } from 'next';
import { headers, cookies } from 'next/headers';
import { ThemeProvider } from '../components/theme-provider';
import { I18nProvider } from '../components/i18n-provider';
import StructuredData from '../components/StructuredData';
import { env } from '../lib/env';
import { ASSOGLOBAL_LOGO_FULL_URL } from '../components/AssoGlobalHome';

// Domaine officiel de la plateforme Grand Chef elle-même (hors association) —
// même valeur que PLATFORM_CANONICAL_HOST dans app/page.tsx.
const PLATFORM_HOST = 'www.dkmoney.store';

// Développeur de la plateforme — crédité comme auteur secondaire sur TOUTE
// instance (Grand Chef et chaque association cliente), quel que soit le
// domaine résolu.
const DEVELOPER_AUTHOR = { name: 'Thierno Doniko' };

type OrgTheme = {
  name: string;
  legalName?: string | null;
  code?: string | null;
  logoUrl?: string | null;
  domainName?: string | null;
  city?: string | null;
  country?: string | null;
};

async function getOrgData(domain: string): Promise<OrgTheme | null> {
  try {
    const res = await fetch(`${env.apiUrl}/public/theme?domain=${encodeURIComponent(domain)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const rawHost = (headersList.get('host') || '').replace(/^www\./, '');
  const org = await getOrgData(rawHost);

  const metadataBaseHost = org?.domainName || rawHost || PLATFORM_HOST;
  const metadataBase = new URL(`https://${metadataBaseHost}`);

  const sharedRobots = {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large' as const,
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  };

  if (!org?.name) {
    // Aucune association résolue pour ce domaine : Grand Chef / AssoGlobal
    // lui-même (dkmoney.store), ou un domaine sans thème configuré.
    return {
      metadataBase,
      title: {
        default: 'AssoGlobal — Plateforme de gestion d’association communautaire',
        template: '%s | AssoGlobal',
      },
      description:
        'Rejoignez votre communauté, suivez les projets, réglez vos cotisations et restez informé — le tout au même endroit.',
      applicationName: 'AssoGlobal',
      authors: [{ name: 'AssoGlobal', url: metadataBase.toString() }, DEVELOPER_AUTHOR],
      creator: 'AssoGlobal',
      publisher: 'AssoGlobal',
      keywords: [
        'AssoGlobal',
        'gestion association',
        'plateforme association',
        'cotisations en ligne',
        'gestion de communauté',
      ],
      category: 'technology',
      robots: sharedRobots,
      openGraph: {
        type: 'website',
        siteName: 'AssoGlobal',
        title: 'AssoGlobal — Plateforme multi-tenant pour associations',
        description:
          'Chaque association crée sa propre plateforme numérique : membres, cotisations, projets, événements et gouvernance.',
        locale: 'fr_FR',
        images: [{ url: ASSOGLOBAL_LOGO_FULL_URL, width: 1200, height: 630, alt: 'AssoGlobal' }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'AssoGlobal — Plateforme multi-tenant pour associations',
        description:
          'Chaque association crée sa propre plateforme numérique pour ses membres, cotisations, projets et événements.',
        images: [ASSOGLOBAL_LOGO_FULL_URL],
      },
      icons: { icon: [{ url: '/favicon.ico', type: 'image/x-icon' }] },
      appleWebApp: { capable: true, statusBarStyle: 'default', title: 'AssoGlobal' },
    };
  }

  // Association résolue : métadonnées propres à CETTE association, aucune
  // référence à Lélouma en dur — mais Thierno Doniko reste crédité comme
  // développeur, y compris sur le site du client.
  const displayTitle =
    org.legalName && org.legalName !== org.name ? `${org.name} (${org.legalName})` : org.name;
  const shortDescription = `${org.name} : rejoignez la communauté, suivez les projets, réglez vos cotisations et restez informé.`;
  const image = org.logoUrl || undefined;

  return {
    metadataBase,
    title: {
      default: `${org.name} | Espace membre`,
      template: `%s | ${org.name}`,
    },
    description: shortDescription,
    applicationName: org.name,
    authors: [{ name: org.name, url: metadataBase.toString() }, DEVELOPER_AUTHOR],
    creator: org.name,
    publisher: org.name,
    keywords: [org.name, org.legalName, org.code, org.city, org.country, 'association', 'communauté', 'cotisations en ligne'].filter(
      (v): v is string => Boolean(v)
    ),
    category: 'organization',
    robots: sharedRobots,
    openGraph: {
      type: 'website',
      siteName: org.name,
      title: displayTitle,
      description: shortDescription,
      locale: 'fr_FR',
      images: image ? [{ url: image, width: 1200, height: 630, alt: org.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: displayTitle,
      description: shortDescription,
      images: image ? [image] : undefined,
    },
    icons: { icon: [{ url: '/favicon.ico', type: 'image/x-icon' }] },
    appleWebApp: { capable: true, statusBarStyle: 'default', title: org.code || org.name },
  };
}

/**
 * ============================================================
 * VIEWPORT
 * ============================================================
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,

  themeColor: [
    {
      media: '(prefers-color-scheme: light)',
      color: '#059669',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: '#064E3B',
    },
  ],
};

/**
 * ============================================================
 * ROOT LAYOUT
 * ============================================================
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * 🌍 Récupération de la langue depuis les cookies côté serveur.
   *
   * Cela permet de conserver le comportement multilingue
   * existant de l'application.
   */
  const cookieStore = await cookies();

  const lang = cookieStore.get('i18next')?.value || 'fr';

  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        suppressHydrationWarning={true}
        className="antialiased"
      >
        {/* Données structurées Schema.org — déjà dynamiques par domaine */}
        <StructuredData />

        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}