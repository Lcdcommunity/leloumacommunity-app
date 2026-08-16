// web/app/layout.tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '../components/theme-provider';
import { I18nProvider } from '../components/i18n-provider';
import StructuredData from '../components/StructuredData';
import { cookies } from 'next/headers';

// Configuration des métadonnées de l'application
export const metadata: Metadata = {
  title: 'Grand Chef',
  description: 'Plateforme de gestion d’association communautaire - Multi-tenant',
  authors: [{ name: 'Thierno Doniko' }],
  creator: 'Thierno Doniko',
  publisher: 'Thierno Doniko',
  // 🔥 RETIRÉ : manifest: '/manifest.json' — écrasait le lien <link
  // rel="manifest"> auto-généré par Next.js à partir de app/manifest.ts
  // (dynamique par association) en le repointant vers l'ancien fichier
  // statique public/manifest.json.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
  title: 'AssoGlobal',
  },
};

// Configuration du viewport
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' },
    { media: '(prefers-color-scheme: dark)', color: '#064E3B' },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🌍 Récupération de la langue depuis les cookies côté serveur
  const cookieStore = await cookies();
  const lang = cookieStore.get('i18next')?.value || 'fr';

  return (
    <html lang={lang} suppressHydrationWarning>
      <body suppressHydrationWarning={true} className="antialiased">
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