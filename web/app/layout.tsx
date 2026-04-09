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
  icons: {
    // La ligne "icon" a été retirée car Next.js va détecter automatiquement le fichier icon.jpg dans le dossier app/
    apple: '/icon-192x192.png',
  },
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

// ✅ AJOUT DE 'async' ICI
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🌍 Récupération de la langue depuis les cookies côté serveur
  // ✅ AJOUT DE 'await' ICI car cookies() est asynchrone en Next.js 15
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