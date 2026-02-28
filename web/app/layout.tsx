//web/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { env } from '../lib/env';

export const metadata: Metadata = {
  title: env.appName,
  description: 'Gestion d’association communautaire',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}