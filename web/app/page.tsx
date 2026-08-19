// web/app/page.tsx
// v3.0.0 — Scindé en deux fichiers pour permettre des métadonnées SEO
//          dynamiques par association (impossible depuis un composant
//          'use client'). Toute la logique d'UI (slides, swipe, thème
//          visuel, CTA) est désormais dans components/OnboardingClient.tsx,
//          strictement inchangée. Ce fichier ne fait que : résoudre
//          l'association via le host, générer un title/description/Open
//          Graph propres à chaque domaine, puis rendre le composant client.
//
// v3.1.0 — Ajout d'un `alternates.canonical` propre à CETTE page (déplacé
//          depuis app/layout.tsx, où il était à tort appliqué par défaut à
//          toutes les pages du site, y compris /login et /signup).
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { env } from '../lib/env';
import OnboardingClient from '../components/OnboardingClient';

async function getOrgData(domain: string) {
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
  const host = (headersList.get('host') || '').replace(/^www\./, '');
  const org = await getOrgData(host);

  // Canonical fixe sur le domaine officiel de LCD, pour cette page précisément.
  const canonical = 'https://www.leloumacommunity.com/';

  if (!org?.name) {
    return {
      title: 'AssoGlobal — Plateforme de gestion d’association communautaire',
      description: "Rejoignez votre communauté, suivez les projets, réglez vos cotisations et restez informé — le tout au même endroit.",
      alternates: { canonical },
    };
  }

  const title = `${org.name} — Espace membre`;
  const description =
    org.legalName && org.legalName !== org.name
      ? `${org.legalName} (${org.name}) : rejoignez la communauté, suivez les projets, réglez vos cotisations et restez informé.`
      : `${org.name} : rejoignez la communauté, suivez les projets, réglez vos cotisations et restez informé.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      images: org.logoUrl ? [org.logoUrl] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: org.logoUrl ? [org.logoUrl] : undefined,
    },
  };
}

export default function Page() {
  return <OnboardingClient />;
}