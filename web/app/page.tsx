// web/app/page.tsx
// v3.0.0 — Scindé en deux fichiers pour permettre des métadonnées SEO
//          dynamiques par association (impossible depuis un composant
//          'use client'). Toute la logique d'UI (slides, swipe, thème
//          visuel, CTA) est désormais dans components/OnboardingClient.tsx,
//          strictement inchangée. Ce fichier ne fait que : résoudre
//          l'association via le host, générer un title/description/Open
//          Graph propres à chaque domaine, puis rendre le composant client.
//
// v3.2.0 — CORRECTIF SEO CRITIQUE : le `alternates.canonical` était codé en
//          dur sur "https://www.leloumacommunity.com/", copié par erreur
//          depuis le dépôt mono-tenant du client lors du fast-forward. Dans
//          CE dépôt (multi-tenant : dkmoney.store, ajvk.site, et toute
//          future association), ce canonical fixe indiquait à Google que
//          TOUTES les instances étaient des doublons du site de Lélouma —
//          risque réel de désindexation des autres domaines. Le canonical
//          est désormais calculé dynamiquement à partir du domaine réel :
//          - association résolue → son propre domaine (org.domainName si
//            disponible, sinon le host de la requête) ;
//          - aucune association (Grand Chef lui-même) → le domaine
//            officiel de la plateforme (www.dkmoney.store, confirmé
//            Production dans Vercel → Domains).
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { env } from '../lib/env';
import OnboardingClient from '../components/OnboardingClient';

// Domaine officiel de la plateforme Grand Chef elle-même (hors association).
const PLATFORM_CANONICAL_HOST = 'www.dkmoney.store';

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
  const rawHost = (headersList.get('host') || '').replace(/^www\./, '');
  const org = await getOrgData(rawHost);

  if (!org?.name) {
    // Aucune association résolue pour ce domaine : c'est Grand Chef lui-même.
    return {
      title: 'AssoGlobal — Plateforme de gestion d’association communautaire',
      description: "Rejoignez votre communauté, suivez les projets, réglez vos cotisations et restez informé — le tout au même endroit.",
      alternates: { canonical: `https://${PLATFORM_CANONICAL_HOST}/` },
      openGraph: {
        title: 'AssoGlobal — Plateforme multi-tenant pour associations',
        description: "Chaque association crée sa propre plateforme numérique : membres, cotisations, projets, événements et gouvernance.",
        images: ['https://res.cloudinary.com/gltn9eo4/image/upload/v1787347750/logo.png'],
        type: 'website',
      },
    };
  }

  // Canonical propre à CETTE association : son domaine personnalisé si elle
  // en a un, sinon le domaine réellement visité pour cette requête.
  const canonicalHost = org.domainName || rawHost;
  const canonical = `https://${canonicalHost}/`;

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