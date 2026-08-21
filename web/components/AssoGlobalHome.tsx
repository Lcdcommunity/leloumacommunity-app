// web/components/AssoGlobalHome.tsx
// Page d'accueil STATIQUE dédiée à AssoGlobal (Grand Chef) — la plateforme
// elle-même, pas une association qui l'utilise.
//
// v2 — Identité visuelle alignée sur la Console Grand Chef existante
//      (system-admin) : violet #8B5CF6 / magenta #C026D3, Inter + Plus
//      Jakarta Sans, fond clair, cartes bordées façon gc-stat/gc-asso-card —
//      au lieu du bleu marine/Cormorant Garamond utilisé sur les sites
//      d'association (LCD), pour que le public et l'admin forment un seul
//      produit cohérent.

import Link from 'next/link';
import Image from 'next/image';

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: 'users' | 'wallet' | 'flag' | 'calendar' | 'vote' | 'globe';
}

const FEATURES: Feature[] = [
  {
    id: 'membres',
    title: 'Gestion des membres',
    description: "Inscription en ligne, validation par antenne, et carte de membre dématérialisée à QR code pour chaque adhérent.",
    icon: 'users',
  },
  {
    id: 'cotisations',
    title: 'Cotisations & finances',
    description: "Suivi transparent des cotisations, historique des paiements et rapports financiers consolidés en temps réel.",
    icon: 'wallet',
  },
  {
    id: 'projets',
    title: 'Projets & transparence',
    description: "Chaque association présente ses projets en cours, leur avancement et leur impact auprès de sa communauté.",
    icon: 'flag',
  },
  {
    id: 'evenements',
    title: 'Événements',
    description: "Assemblées générales, réunions d'antenne et événements communautaires, avec inscriptions gérées en ligne.",
    icon: 'calendar',
  },
  {
    id: 'gouvernance',
    title: 'Gouvernance & élections',
    description: "Votes sécurisés, calcul automatique du quorum et élection des représentants directement sur la plateforme.",
    icon: 'vote',
  },
  {
    id: 'multi-antennes',
    title: 'Multi-antennes & international',
    description: "Une seule plateforme pour piloter plusieurs antennes, en France comme à l'international, avec des rôles dédiés.",
    icon: 'globe',
  },
];

function FeatureIcon({ type }: { type: Feature['icon'] }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'users') return (
    <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M2 21v-1a6 6 0 0112 0v1" /><circle cx="17" cy="9" r="2.5" /><path d="M22 21v-1a5 5 0 00-4-4.9" /></svg>
  );
  if (type === 'wallet') return (
    <svg {...common}><rect x="2" y="6" width="20" height="14" rx="2.5" /><path d="M2 10h20" /><circle cx="17" cy="15" r="1.4" /></svg>
  );
  if (type === 'flag') return (
    <svg {...common}><path d="M5 21V4" /><path d="M5 4h13l-3 4 3 4H5" /></svg>
  );
  if (type === 'calendar') return (
    <svg {...common}><rect x="3" y="4.5" width="18" height="16.5" rx="2.5" /><path d="M16 2.5v4M8 2.5v4M3 10h18" /></svg>
  );
  if (type === 'vote') return (
    <svg {...common}><path d="M4 9h16v11a1 1 0 01-1 1H5a1 1 0 01-1-1V9z" /><path d="M4 9l2.5-5h11L20 9" /><path d="M9 13.5l2 2 4-4.5" /></svg>
  );
  return (
    <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2c2.5 2.7 4 6.4 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.4-4-10s1.5-7.3 4-10z" /></svg>
  );
}

// Logo réel de l'association, hébergé sur Cloudinary. La transformation
// c_crop,g_north,w_700,h_700 isole automatiquement l'icône (cercle réseau
// M/W) en haut de l'image, sans le texte "AssoGlobal / Plateforme..." en
// dessous — évite un second upload pour la version courte du header.
const ASSOGLOBAL_LOGO_ICON_URL =
  'https://res.cloudinary.com/gltn9eo4/image/upload/c_crop,g_north,w_700,h_700/v1787347750/logo.png';
// Image complète (avec texte), pour l'aperçu de partage (Open Graph).
export const ASSOGLOBAL_LOGO_FULL_URL =
  'https://res.cloudinary.com/gltn9eo4/image/upload/v1787347750/logo.png';

export default function AssoGlobalHome() {
  return (
    <div className="ag-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');

        :root {
          --ag-bg: #F8FAFC;
          --ag-surface: #FFFFFF;
          --ag-surface-2: #F1F5F9;
          --ag-border: rgba(15, 23, 42, 0.08);
          --ag-border-hover: rgba(139, 92, 246, 0.4);
          --ag-accent: #8B5CF6;
          --ag-accent-glow: rgba(139, 92, 246, 0.15);
          --ag-accent-2: #C026D3;
          --ag-text-1: #0F172A;
          --ag-text-2: #334155;
          --ag-text-3: #64748B;
          --ag-shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
          --ag-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
          --ag-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03);
        }

        .ag-root { font-family: 'Inter', sans-serif; min-height: 100vh; background: var(--ag-bg); color: var(--ag-text-2); }

        .ag-nav { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 1.5rem; background: var(--ag-surface); border-bottom: 1px solid var(--ag-border); }
        .ag-nav-brand { display: flex; align-items: center; gap: 0.65rem; }
        .ag-nav-logo { width: 34px; height: 34px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
        .ag-nav-name { font-family: 'Plus Jakarta Sans', sans-serif; color: var(--ag-text-1); font-weight: 800; font-size: 0.95rem; letter-spacing: -0.01em; }
        .ag-nav-login {
          color: var(--ag-accent); font-size: 0.85rem; font-weight: 700; text-decoration: none;
          padding: 0.55rem 1.1rem; border-radius: 12px; border: 1.5px solid var(--ag-border-hover);
          transition: background 0.15s, color 0.15s;
        }
        .ag-nav-login:hover { background: var(--ag-accent); color: #fff; }

        .ag-hero { position: relative; text-align: center; padding: clamp(3rem, 7vw, 5rem) 1.5rem 2.5rem; overflow: hidden; }
        .ag-hero::before {
          content: ''; position: absolute; top: -60px; left: 50%; transform: translateX(-50%);
          width: 700px; height: 360px;
          background: radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 60%);
          pointer-events: none;
        }
        .ag-hero-inner { position: relative; z-index: 2; max-width: 720px; margin: 0 auto; }

        .ag-eyebrow {
          display: inline-flex; align-items: center; gap: 0.5rem;
          font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--ag-accent); background: var(--ag-surface);
          border: 1px solid var(--ag-border-hover);
          padding: 0.4rem 1rem; border-radius: 100px;
          margin-bottom: 1.25rem; box-shadow: var(--ag-shadow-sm);
        }
        .ag-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ag-accent); animation: agPulse 2s infinite; }

        .ag-hero-title {
          font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; color: var(--ag-text-1);
          font-size: clamp(2rem, 7vw, 3.2rem); line-height: 1.15; letter-spacing: -0.02em;
          margin-bottom: 1rem;
        }
        .ag-title-accent { background: linear-gradient(135deg, var(--ag-accent), var(--ag-accent-2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        .ag-hero-desc { color: var(--ag-text-2); font-size: 1rem; line-height: 1.7; max-width: 540px; margin: 0 auto 2rem; }
        .ag-hero-cta { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .ag-btn-primary {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: linear-gradient(135deg, var(--ag-accent), var(--ag-accent-2));
          color: white; font-weight: 700; font-size: 0.9rem;
          padding: 0.9rem 1.7rem; border-radius: 14px; text-decoration: none;
          box-shadow: 0 4px 14px var(--ag-accent-glow); transition: transform 0.15s, box-shadow 0.15s;
        }
        .ag-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(139,92,246,0.32); }
        .ag-btn-ghost {
          background: var(--ag-surface-2); color: var(--ag-text-2); font-weight: 700; font-size: 0.9rem;
          padding: 0.9rem 1.7rem; border-radius: 14px; text-decoration: none;
          border: 1px solid var(--ag-border); transition: background 0.15s, border-color 0.15s;
        }
        .ag-btn-ghost:hover { background: var(--ag-surface); border-color: var(--ag-border-hover); }

        .ag-features { max-width: 1080px; margin: 1.5rem auto 0; padding: 0 1.5rem 4rem; }
        .ag-features-head { text-align: center; margin-bottom: 2rem; }
        .ag-features-kicker { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ag-text-3); margin-bottom: 0.5rem; }
        .ag-features-title { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 800; font-size: clamp(1.6rem, 4vw, 2.1rem); color: var(--ag-text-1); letter-spacing: -0.01em; }

        .ag-grid { display: grid; grid-template-columns: 1fr; gap: 1.1rem; }
        @media (min-width: 620px) { .ag-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 960px) { .ag-grid { grid-template-columns: repeat(3, 1fr); gap: 1.3rem; } }

        .ag-card {
          background: var(--ag-surface); border-radius: 18px; padding: 1.4rem 1.3rem;
          border: 1px solid var(--ag-border); box-shadow: var(--ag-shadow-sm);
          transition: all 0.2s ease;
        }
        .ag-card:hover { border-color: var(--ag-border-hover); transform: translateY(-4px); box-shadow: var(--ag-shadow-lg); }
        .ag-card-icon {
          width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--ag-accent), var(--ag-accent-2)); color: #fff;
          margin-bottom: 0.9rem;
        }
        .ag-card-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 0.95rem; font-weight: 700; color: var(--ag-text-1); line-height: 1.35; margin-bottom: 0.5rem; }
        .ag-card-desc { font-size: 0.83rem; line-height: 1.6; color: var(--ag-text-3); }

        .ag-footer { text-align: center; padding: 2rem 1.5rem 3rem; font-size: 0.8rem; color: var(--ag-text-3); border-top: 1px solid var(--ag-border); }

        .ag-reveal { opacity: 0; animation: agFadeUp 0.55s cubic-bezier(.22,1,.36,1) forwards; }
        .ag-reveal.gd-1 { animation-delay: 0.05s; }
        .ag-reveal.gd-2 { animation-delay: 0.13s; }
        .ag-reveal.gd-3 { animation-delay: 0.21s; }
        @keyframes agFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes agPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (prefers-reduced-motion: reduce) {
          .ag-reveal { animation: none !important; opacity: 1 !important; transform: none !important; }
          .ag-eyebrow-dot { animation: none; }
        }
      `}</style>

      <nav className="ag-nav">
        <div className="ag-nav-brand">
          <div className="ag-nav-logo">
            <Image src={ASSOGLOBAL_LOGO_ICON_URL} alt="AssoGlobal" width={34} height={34} style={{ objectFit: 'cover' }} unoptimized />
          </div>
          <span className="ag-nav-name">AssoGlobal</span>
        </div>
        <Link href="/login" className="ag-nav-login">Connexion</Link>
      </nav>

      <div className="ag-hero">
        <div className="ag-hero-inner">
          <div className="ag-eyebrow ag-reveal">
            <span className="ag-eyebrow-dot" />
            Plateforme multi-tenant
          </div>
          <h1 className="ag-hero-title ag-reveal gd-1">
            Votre association, <span className="ag-title-accent">enfin structurée</span>
          </h1>
          <p className="ag-hero-desc ag-reveal gd-2">
            AssoGlobal permet à chaque association de créer sa propre plateforme numérique : membres, cotisations, projets, événements et gouvernance — le tout centralisé, sécurisé et accessible à sa communauté.
          </p>
          <div className="ag-hero-cta ag-reveal gd-3">
            <Link href="/login" className="ag-btn-primary">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
              Se connecter
            </Link>
            <a href="#fonctionnalites" className="ag-btn-ghost">Découvrir la plateforme</a>
          </div>
        </div>
      </div>

      <div className="ag-features" id="fonctionnalites">
        <div className="ag-features-head">
          <div className="ag-features-kicker">Fonctionnalités</div>
          <div className="ag-features-title">Tout ce dont votre association a besoin</div>
        </div>
        <div className="ag-grid">
          {FEATURES.map((f, i) => (
            <div key={f.id} className="ag-card ag-reveal" style={{ animationDelay: `${0.08 + i * 0.06}s` }}>
              <div className="ag-card-icon"><FeatureIcon type={f.icon} /></div>
              <div className="ag-card-title">{f.title}</div>
              <div className="ag-card-desc">{f.description}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="ag-footer">
        © {new Date().getFullYear()} AssoGlobal — Plateforme multi-tenant pour associations
      </footer>
    </div>
  );
}