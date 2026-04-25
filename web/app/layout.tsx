// web/app/layout.tsx
import './globals.css';
import '../lib/i18n'; 
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '../components/theme-provider';
import { cookies } from 'next/headers';

// Configuration des métadonnées de l'application
export const metadata: Metadata = {
  title: 'Lelouma Community',
  description: 'Plateforme de gestion d’association communautaire - Multi-tenant',
  manifest: '/manifest.json',
  // La référence manuelle à 'apple: /icon-192x192.png' a été retirée pour éviter l'erreur 404.
  // Next.js génère automatiquement les métadonnées grâce à web/app/icon.jpg
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lelouma Community',
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}