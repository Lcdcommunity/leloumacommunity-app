// web/components/HomeShowcase.tsx
// Page d'accueil affichée aux visiteurs qui ont déjà vu l'onboarding (au lieu
// d'une redirection automatique vers /login). Contenu de la section "Projets"
// INVENTÉ à la demande de Doniko en attendant de vraies données — structuré
// pour qu'une vraie photo (Cloudinary) puisse remplacer l'icône dès qu'elle
// existe (champ photoUrl, actuellement toujours absent).
'use client';

import Link from 'next/link';
import Image from 'next/image';

interface HomeShowcaseProps {
  theme: {
    name: string;
    logoUrl: string | null;
    primary: string;
    secondary: string;
  };
}

interface Project {
  id: string;
  title: string;
  category: string;
  status: 'En cours' | 'À venir' | 'Terminé';
  description: string;
  photoUrl?: string | null;
  icon: 'book' | 'water' | 'tree' | 'health';
}

// ⚠️ Contenu d'exemple — à remplacer par les projets réels de l'association.
const PROJECTS: Project[] = [
  {
    id: 'ecole-kenery',
    title: "Réhabilitation de l'école de Kénéry",
    category: 'Éducation',
    status: 'En cours',
    description: "Rénovation des salles de classe et équipement en mobilier scolaire pour améliorer les conditions d'apprentissage des enfants de Kénéry.",
    icon: 'book',
  },
  {
    id: 'eau-petel',
    title: 'Point d\'eau potable — Pétel',
    category: 'Infrastructure',
    status: 'En cours',
    description: "Forage et installation d'un point d'eau potable pour réduire les distances de collecte et améliorer l'accès à l'eau dans la sous-préfecture.",
    icon: 'water',
  },
  {
    id: 'reboisement',
    title: 'Campagne de reboisement du Fouta Djallon',
    category: 'Environnement',
    status: 'À venir',
    description: "Plantation d'arbres et sensibilisation contre les feux de brousse pour préserver la biodiversité de la préfecture de Lélouma.",
    icon: 'tree',
  },
  {
    id: 'centre-sante',
    title: 'Appui au centre de santé communautaire',
    category: 'Santé',
    status: 'À venir',
    description: "Dotation en matériel médical de première nécessité pour améliorer la prise en charge des soins de base dans les sous-préfectures.",
    icon: 'health',
  },
];

function ProjectIcon({ type }: { type: Project['icon'] }) {
  const common = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'book') return (
    <svg {...common}><path d="M4 4.5A2.5 2.5 0 016.5 2H20v17H6.5A2.5 2.5 0 004 21.5v-17z" /><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /></svg>
  );
  if (type === 'water') return (
    <svg {...common}><path d="M12 2s7 8.5 7 13a7 7 0 01-14 0c0-4.5 7-13 7-13z" /></svg>
  );
  if (type === 'tree') return (
    <svg {...common}><path d="M12 22v-7" /><path d="M12 15c-3.5 0-6-2.5-6-5.5S8.5 3 12 3s6 2.5 6 5.5S15.5 15 12 15z" /></svg>
  );
  return (
    <svg {...common}><path d="M4 12h3l2-5 4 10 2-5h5" /></svg>
  );
}

const STATUS_COLORS: Record<Project['status'], { bg: string; text: string }> = {
  'En cours': { bg: '#DCFCE7', text: '#166534' },
  'À venir': { bg: '#FEF3C7', text: '#92400E' },
  'Terminé': { bg: '#E0E7FF', text: '#3730A3' },
};

export default function HomeShowcase({ theme }: HomeShowcaseProps) {
  return (
    <div className="hs-root">
      <style>{`
        .hs-root { font-family: 'DM Sans', sans-serif; min-height: 100vh; background: #FAF7F2; color: #334155; }

        /* ── Nav ─────────────────────────────────────────────────────────── */
        .hs-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.1rem 1.5rem; background: #06103A;
        }
        .hs-nav-brand { display: flex; align-items: center; gap: 0.6rem; }
        .hs-nav-logo { width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: #fff; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.25); }
        .hs-nav-name { color: #fff; font-weight: 800; font-size: 0.8rem; letter-spacing: 0.02em; max-width: 40vw; }
        .hs-nav-actions { display: flex; align-items: center; gap: 0.6rem; }
        .hs-nav-login { color: rgba(255,255,255,0.85); font-size: 0.82rem; font-weight: 700; text-decoration: none; padding: 0.5rem 0.9rem; }
        .hs-nav-login:hover { color: #fff; }
        .hs-nav-signup {
          background: #fff; color: #06103A; font-size: 0.82rem; font-weight: 800;
          padding: 0.5rem 1.1rem; border-radius: 99px; text-decoration: none;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .hs-nav-signup:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.25); }

        /* ── Hero ────────────────────────────────────────────────────────── */
        .hs-hero { position: relative; background: #06103A; overflow: hidden; padding: 3rem 1.5rem 6rem; }
        .hs-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
        .hs-orb-1 { width: 460px; height: 460px; background: radial-gradient(circle, ${withAlpha(theme.primary, 0.35)} 0%, transparent 70%); top: -160px; right: -100px; animation: hsDrift1 20s ease-in-out infinite alternate; }
        .hs-orb-2 { width: 360px; height: 360px; background: radial-gradient(circle, ${withAlpha(theme.secondary, 0.25)} 0%, transparent 70%); bottom: -140px; left: -80px; animation: hsDrift2 24s ease-in-out infinite alternate; }
        @keyframes hsDrift1 { from { transform: translate(0,0); } to { transform: translate(-30px, 30px); } }
        @keyframes hsDrift2 { from { transform: translate(0,0); } to { transform: translate(25px, -20px); } }
        @media (prefers-reduced-motion: reduce) { .hs-orb-1, .hs-orb-2 { animation: none; } .hs-reveal { animation: none !important; opacity: 1 !important; transform: none !important; } }

        .hs-hero-inner { position: relative; z-index: 2; max-width: 720px; margin: 0 auto; text-align: center; }
        .hs-hero-tag {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          border-radius: 99px; padding: 0.35rem 0.9rem; font-size: 0.7rem; font-weight: 800;
          letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.85);
          margin-bottom: 1.25rem;
        }
        .hs-hero-title {
          font-family: 'Cormorant Garamond', serif; font-weight: 700; color: #fff;
          font-size: clamp(2.2rem, 6vw, 3.4rem); line-height: 1.08; margin-bottom: 1rem;
          text-shadow: 0 4px 30px rgba(0,0,0,0.4);
        }
        .hs-hero-desc { color: rgba(255,255,255,0.72); font-size: 1rem; line-height: 1.7; max-width: 540px; margin: 0 auto 2rem; }
        .hs-hero-cta { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; }
        .hs-btn-primary {
          background: #fff; color: #06103A; font-weight: 800; font-size: 0.9rem;
          padding: 0.85rem 1.6rem; border-radius: 14px; text-decoration: none;
          box-shadow: 0 8px 26px rgba(0,0,0,0.3); transition: transform 0.15s, box-shadow 0.15s;
        }
        .hs-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.35); }
        .hs-btn-ghost {
          background: rgba(255,255,255,0.1); color: #fff; font-weight: 700; font-size: 0.9rem;
          padding: 0.85rem 1.6rem; border-radius: 14px; text-decoration: none;
          border: 1.5px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px);
          transition: background 0.15s;
        }
        .hs-btn-ghost:hover { background: rgba(255,255,255,0.18); }

        .hs-wave { position: absolute; left: 0; right: 0; bottom: -1px; z-index: 1; line-height: 0; }
        .hs-wave svg { display: block; width: 100%; height: auto; }

        /* ── Section Projets ─────────────────────────────────────────────── */
        .hs-projects { max-width: 1080px; margin: -3rem auto 0; padding: 0 1.5rem 4rem; position: relative; z-index: 3; }
        .hs-projects-head { text-align: center; margin-bottom: 2rem; }
        .hs-projects-kicker { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #1D4ED8; margin-bottom: 0.5rem; }
        .hs-projects-title { font-family: 'Cormorant Garamond', serif; font-weight: 700; font-size: clamp(1.7rem, 4vw, 2.3rem); color: #0F172A; }

        .hs-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        @media (min-width: 900px) { .hs-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 600px) { .hs-grid { grid-template-columns: 1fr; } }

        .hs-card {
          background: #fff; border-radius: 20px; padding: 1.4rem 1.3rem;
          box-shadow: 0 8px 28px rgba(15,23,42,0.07); border: 1px solid #EEF1F5;
          transition: transform 0.25s cubic-bezier(.22,1,.36,1), box-shadow 0.25s;
        }
        .hs-card:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(15,23,42,0.12); }

        .hs-card-icon {
          width: 46px; height: 46px; border-radius: 13px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, ${theme.primary}, ${theme.secondary}); color: #fff;
          margin-bottom: 0.9rem;
        }
        .hs-card-status {
          display: inline-block; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.04em;
          text-transform: uppercase; padding: 0.22rem 0.6rem; border-radius: 99px; margin-bottom: 0.6rem;
        }
        .hs-card-title { font-size: 0.95rem; font-weight: 800; color: #0F172A; line-height: 1.35; margin-bottom: 0.4rem; }
        .hs-card-category { font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 0.6rem; }
        .hs-card-desc { font-size: 0.82rem; line-height: 1.6; color: #64748B; }

        /* ── Footer ──────────────────────────────────────────────────────── */
        .hs-footer { text-align: center; padding: 2rem 1.5rem 3rem; font-size: 0.8rem; color: #94A3B8; }
        .hs-footer a { color: #1D4ED8; font-weight: 700; text-decoration: none; }
        .hs-footer a:hover { text-decoration: underline; }

        .hs-reveal { opacity: 0; animation: hsFadeUp 0.65s cubic-bezier(.22,1,.36,1) forwards; }
        .hs-reveal.hd-1 { animation-delay: 0.05s; }
        .hs-reveal.hd-2 { animation-delay: 0.15s; }
        .hs-reveal.hd-3 { animation-delay: 0.25s; }
        @keyframes hsFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <nav className="hs-nav">
        <div className="hs-nav-brand">
          <div className="hs-nav-logo">
            {theme.logoUrl && (
              <Image src={theme.logoUrl} alt={`Logo ${theme.name}`} width={36} height={36} style={{ objectFit: 'cover' }} unoptimized />
            )}
          </div>
          <span className="hs-nav-name">{theme.name}</span>
        </div>
        <div className="hs-nav-actions">
          <Link href="/login" className="hs-nav-login">Connexion</Link>
          <Link href="/signup" className="hs-nav-signup">Créer un compte</Link>
        </div>
      </nav>

      <div className="hs-hero">
        <div className="hs-orb hs-orb-1" aria-hidden="true" />
        <div className="hs-orb hs-orb-2" aria-hidden="true" />
        <div className="hs-hero-inner">
          <div className="hs-hero-tag hs-reveal">🌍 Bienvenue</div>
          <h1 className="hs-hero-title hs-reveal hd-1">Votre communauté, en action</h1>
          <p className="hs-hero-desc hs-reveal hd-2">
            Suivez les projets menés par {theme.name} pour la préfecture de Lélouma, rejoignez la communauté et participez à son développement.
          </p>
          <div className="hs-hero-cta hs-reveal hd-3">
            <Link href="/signup" className="hs-btn-primary">Devenir membre</Link>
            <Link href="/login" className="hs-btn-ghost">Se connecter</Link>
          </div>
        </div>
        <div className="hs-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path d="M0,40 C240,80 480,0 720,20 C960,40 1200,80 1440,40 L1440,80 L0,80 Z" fill="#FAF7F2" />
          </svg>
        </div>
      </div>

      <div className="hs-projects">
        <div className="hs-projects-head">
          <div className="hs-projects-kicker">Nos actions</div>
          <div className="hs-projects-title">Projets en cours</div>
        </div>
        <div className="hs-grid">
          {PROJECTS.map((p, i) => {
            const statusColor = STATUS_COLORS[p.status];
            return (
              <div key={p.id} className="hs-card hs-reveal" style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                <div className="hs-card-icon"><ProjectIcon type={p.icon} /></div>
                <span className="hs-card-status" style={{ background: statusColor.bg, color: statusColor.text }}>{p.status}</span>
                <div className="hs-card-category">{p.category}</div>
                <div className="hs-card-title">{p.title}</div>
                <div className="hs-card-desc">{p.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="hs-footer">
        © {new Date().getFullYear()} {theme.name} · <Link href="/mentions-legales">Mentions légales</Link>
      </footer>
    </div>
  );
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}