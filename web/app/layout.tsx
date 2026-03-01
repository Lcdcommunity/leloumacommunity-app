// web/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

// On remplace temporairement l'appel à env.appName par du texte brut
export const metadata: Metadata = {
  title: 'Lelouma Community', 
  description: 'Gestion d’association communautaire',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}