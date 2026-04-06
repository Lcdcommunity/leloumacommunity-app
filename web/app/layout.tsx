// web/app/layout.tsx
import './globals.css';
import '../lib/i18n';
import type { Metadata } from 'next';
import { ThemeProvider } from '../components/theme-provider';

export const metadata: Metadata = {
  title: 'Lelouma Community', 
  description: 'Gestion d’association communautaire',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}