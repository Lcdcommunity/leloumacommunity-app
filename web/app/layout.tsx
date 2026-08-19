// web/app/layout.tsx

import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '../components/theme-provider';
import { I18nProvider } from '../components/i18n-provider';
import StructuredData from '../components/StructuredData';
import { cookies } from 'next/headers';

/**
 * ============================================================
 * MÉTADONNÉES SEO — Lélouma Communauté pour le Développement
 * ============================================================
 *
 * Objectif :
 * - Faire comprendre à Google que ce domaine représente
 *   officiellement Lélouma Communauté pour le Développement.
 * - Conserver "Grand Chef" comme nom de la plateforme.
 * - Optimiser l'affichage dans Google, Facebook, WhatsApp,
 *   LinkedIn et autres moteurs/plateformes.
 *
 * IMPORTANT (fix indexation) :
 * Le `alternates.canonical` qui était ici (fixé sur la racine
 * "https://www.leloumacommunity.com/") a été retiré : posé au niveau
 * du layout racine, il s'appliquait par défaut à TOUTES les pages
 * (login, signup, etc.), leur faisant déclarer la page d'accueil
 * comme leur propre URL canonique. Le canonical doit être posé
 * page par page (voir generateMetadata dans app/page.tsx pour la
 * page d'accueil ; à ajouter de la même façon dans login/page.tsx,
 * signup/page.tsx, etc.).
 */

export const metadata: Metadata = {
  metadataBase: new URL('https://www.leloumacommunity.com'),

  title: {
    default: 'Lélouma Communauté pour le Développement (LCD) | Site officiel',
    template: '%s | Lélouma Communauté pour le Développement',
  },

  description:
    'Lélouma Communauté pour le Développement (LCD) est une organisation engagée pour le développement communautaire, social et environnemental de Lélouma en Guinée.',

  applicationName: 'Lélouma Communauté pour le Développement',

  authors: [
    {
      name: 'Lélouma Communauté pour le Développement',
      url: 'https://www.leloumacommunity.com',
    },
    {
      name: 'Thierno Doniko',
    },
  ],

  creator: 'Lélouma Communauté pour le Développement',
  publisher: 'Lélouma Communauté pour le Développement',

  keywords: [
    'Lélouma Communauté pour le Développement',
    'Lélouma Communauté',
    'LCD Lélouma',
    'LCD Guinée',
    'Lélouma',
    'développement communautaire',
    'développement local',
    'association Lélouma',
    'ONG Lélouma',
    'ONG Guinée',
    'association guinéenne',
    'développement Guinée',
    'communauté Lélouma',
    'Guinée',
  ],

  category: 'organization',

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-video-preview': -1,
      'max-snippet': -1,
    },
  },

  /**
   * ==========================================================
   * OPEN GRAPH
   * ==========================================================
   *
   * Utilisé notamment lorsque le site est partagé sur :
   * Facebook, WhatsApp, LinkedIn, Messenger, etc.
   */
  openGraph: {
    type: 'website',

    url: 'https://www.leloumacommunity.com/',

    siteName: 'Lélouma Communauté pour le Développement',

    title:
      'Lélouma Communauté pour le Développement (LCD) | Site officiel',

    description:
      'Lélouma Communauté pour le Développement (LCD) œuvre pour le développement communautaire, social et environnemental de Lélouma en Guinée.',

    locale: 'fr_FR',

    images: [
      {
        url: 'https://res.cloudinary.com/dz8ymtvjz/image/upload/v1776521259/lelouma_community/jovsruxyobwb1aqz9zae.jpg',
        width: 1200,
        height: 630,
        alt: 'Lélouma Communauté pour le Développement (LCD)',
      },
    ],
  },

  /**
   * ==========================================================
   * TWITTER / X
   * ==========================================================
   */
  twitter: {
    card: 'summary_large_image',

    title:
      'Lélouma Communauté pour le Développement (LCD) | Site officiel',

    description:
      'Organisation engagée pour le développement communautaire, social et environnemental de Lélouma en Guinée.',

    images: [
      'https://res.cloudinary.com/dz8ymtvjz/image/upload/v1776521259/lelouma_community/jovsruxyobwb1aqz9zae.jpg',
    ],
  },

  /**
   * ==========================================================
   * ICÔNES
   * ==========================================================
   */
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        type: 'image/x-icon',
      },
    ],
  },

  /**
   * ==========================================================
   * APPLE WEB APP
   * ==========================================================
   */
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LCD',
  },
};

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
      <head>
        {/* =====================================================
            INFORMATIONS POUR LES MOTEURS DE RECHERCHE
            ===================================================== */}

        <meta
          name="organization"
          content="Lélouma Communauté pour le Développement"
        />

        <meta name="organization-alternate-name" content="LCD" />

        <meta name="geo.region" content="GN" />
        <meta name="geo.placename" content="Lélouma" />

        {/* =====================================================
            IDENTITÉ DE LA PLATEFORME
            ===================================================== */}

        <meta name="application-name" content="Grand Chef" />

        <meta
          name="apple-mobile-web-app-title"
          content="LCD"
        />
      </head>

      <body
        suppressHydrationWarning={true}
        className="antialiased"
      >
        {/* Données structurées Schema.org */}
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