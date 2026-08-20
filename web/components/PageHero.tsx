// web/components/PageHero.tsx
// Bandeau visuel réutilisable pour les pages publiques. Reprend l'identité déjà en
// place sur le site (fond marine #06103A, orbes de dégradé, Cormorant Garamond).
//
// v2 — Couleurs (orbes + sceau) et couleur de la vague de transition rendues
//      dynamiques via props, pour pouvoir être réutilisé sur les pages qui
//      chargent un thème par association (login, signup) sans casser les pages
//      fixes (mentions légales, bio) qui continuent d'utiliser les valeurs par
//      défaut de LCD.
// v3 — Le sceau (logo ou motif couronne/étoiles) est extrait en composant
//      exporté séparément (HeroSeal), pour être réutilisé seul en overlay sur
//      des pages qui ont déjà leur propre hero (ex. l'onboarding), sans dupliquer
//      le SVG ni importer tout le bandeau.
import React from 'react';
import Link from 'next/link';

export interface HeroCrumb {
  label: string;
  href?: string;
}

interface PageHeroProps {
  crumbs: HeroCrumb[];
  title: string;
  description?: string;
  /** Couleur primaire du thème (association). Défaut : vert LCD. */
  primaryColor?: string;
  /** Couleur secondaire du thème (association). Défaut : bleu LCD. */
  secondaryColor?: string;
  /** Couleur de la vague de transition en bas du bandeau — à faire correspondre
   *  au fond de la section qui suit le bandeau. Défaut : parchemin des pages légales. */
  waveColor?: string;
  /** Si fourni, affiche le logo de l'association dans le sceau plutôt que le
   *  motif couronne/étoiles par défaut (utile en contexte multi-tenant). */
  logoUrl?: string | null;
}

export interface HeroSealProps {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string | null;
  size?: number;
  /** Opacité globale du sceau — utile pour un usage en filigrane discret. */
  opacity?: number;
}

/**
 * Sceau décoratif : logo de l'association si fourni, sinon motif couronne +
 * étoiles en écho au logo officiel de LCD. Utilisé par PageHero, et réutilisable
 * seul (ex. en overlay discret sur une page qui a déjà son propre hero).
 */
export function HeroSeal({
  primaryColor = '#059669',
  secondaryColor = '#1A56DB',
  logoUrl = null,
  size = 52,
  opacity = 1,
}: HeroSealProps) {
  return (
    <div style={{ width: size, height: size, opacity }} aria-hidden="true">
      {logoUrl ? (
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
          background: '#fff', border: '2px solid rgba(255,255,255,0.28)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
          <path d="M8 34 C 8 20, 16 10, 26 10" stroke={primaryColor} strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
          <path d="M44 34 C 44 20, 36 10, 26 10" stroke={primaryColor} strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
          <path d="M11 30 C 11 19, 18 11, 26 11" stroke={secondaryColor} strokeWidth="1" strokeLinecap="round" opacity="0.55" />
          <circle cx="26" cy="8" r="1.7" fill="#F87171" />
          <circle cx="16.5" cy="12.5" r="1.3" fill="#F87171" />
          <circle cx="35.5" cy="12.5" r="1.3" fill="#F87171" />
        </svg>
      )}
    </div>
  );
}

export default function PageHero({
  crumbs,
  title,
  description,
  primaryColor = '#059669',
  secondaryColor = '#1A56DB',
  waveColor = '#FAF7F2',
  logoUrl = null,
}: PageHeroProps) {
  return (
    <div className="ph-hero">
      <style>{`
        .ph-hero {
          position: relative;
          background: #06103A;
          overflow: hidden;
          padding: 3.25rem 1.5rem 5.5rem;
        }
        .ph-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
        .ph-orb-1 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, ${withAlpha(primaryColor, 0.35)} 0%, transparent 70%);
          top: -140px; right: -80px;
          animation: phDrift1 18s ease-in-out infinite alternate;
        }
        .ph-orb-2 {
          width: 340px; height: 340px;
          background: radial-gradient(circle, ${withAlpha(secondaryColor, 0.28)} 0%, transparent 70%);
          bottom: -120px; left: -60px;
          animation: phDrift2 22s ease-in-out infinite alternate;
        }
        @keyframes phDrift1 { from { transform: translate(0,0); } to { transform: translate(-30px, 30px); } }
        @keyframes phDrift2 { from { transform: translate(0,0); } to { transform: translate(20px, -20px); } }
        @media (prefers-reduced-motion: reduce) {
          .ph-orb-1, .ph-orb-2 { animation: none; }
        }

        .ph-inner { position: relative; z-index: 2; max-width: 800px; margin: 0 auto; }

        .ph-crumbs {
          display: flex; align-items: center; flex-wrap: wrap; gap: 0.4rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem; font-weight: 700; letter-spacing: 0.03em;
          color: rgba(255,255,255,0.5); margin-bottom: 1.75rem;
        }
        .ph-crumb-link { color: rgba(255,255,255,0.78); text-decoration: none; }
        .ph-crumb-link:hover { color: #fff; }
        .ph-crumb-sep { color: rgba(255,255,255,0.3); }
        .ph-crumb-current { color: #fff; }

        .ph-seal { margin-bottom: 1.1rem; }

        .ph-title {
          font-family: 'Cormorant Garamond', serif; font-weight: 700;
          font-size: clamp(2.1rem, 6vw, 3.2rem); color: #fff; line-height: 1.05;
          letter-spacing: -0.01em; text-shadow: 0 4px 30px rgba(0,0,0,0.4);
          margin-bottom: 0.6rem;
        }
        .ph-desc {
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem;
          color: rgba(255,255,255,0.68); max-width: 520px; line-height: 1.65;
        }

        .ph-wave { position: absolute; left: 0; right: 0; bottom: -1px; z-index: 1; line-height: 0; }
        .ph-wave svg { display: block; width: 100%; height: auto; }
      `}</style>

      <div className="ph-orb ph-orb-1" aria-hidden="true" />
      <div className="ph-orb ph-orb-2" aria-hidden="true" />

      <div className="ph-inner">
        <nav className="ph-crumbs" aria-label="Fil d'Ariane">
          {crumbs.map((c, i) => (
            <React.Fragment key={`${c.label}-${i}`}>
              {i > 0 && <span className="ph-crumb-sep">/</span>}
              {c.href ? (
                <Link href={c.href} className="ph-crumb-link">{c.label}</Link>
              ) : (
                <span className="ph-crumb-current">{c.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="ph-seal">
          <HeroSeal primaryColor={primaryColor} secondaryColor={secondaryColor} logoUrl={logoUrl} size={52} />
        </div>

        <h1 className="ph-title">{title}</h1>
        {description && <p className="ph-desc">{description}</p>}
      </div>

      <div className="ph-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,40 C240,80 480,0 720,20 C960,40 1200,80 1440,40 L1440,80 L0,80 Z" fill={waveColor} />
        </svg>
      </div>
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