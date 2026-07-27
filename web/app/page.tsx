// web/app/page.tsx
// v2.0.0 — Page dynamisée par association (multi-tenant) : texte, logo et couleurs
//          ne sont plus figés sur l'identité Lélouma
//
// CHANGELOG v2.0.0 (vs v1.0.4) :
// - [DYNAMIQUE] Nom et logo chargés via api.getPublicTheme(domain, code), même
//        convention que login/signup/verify-email/logout. Hors association
//        résolue (Grand Chef, ou domaine sans thème configuré) : nom 'Grand Chef',
//        logo absent (cercle vide dans l'en-tête, comme sur les autres pages).
// - [CONTENU] Texte de la 1ʳᵉ slide généralisé : ne mentionne plus "Lélouma
//        Communauté pour le Développement" ni "Léloumiens" (démonyme spécifique
//        à Lélouma) — le nom de l'association est déjà affiché dynamiquement dans
//        l'en-tête juste au-dessus, pas besoin de le répéter dans le texte.
// - [VISUEL] Les 6 photos Peulh/Fulani du Fouta Djallon (choisies intentionnellement
//        pour Lélouma en v1.0.3, sur indication explicite à l'époque) sont retirées.
//        Remplacées par un fond dégradé utilisant les couleurs de thème de
//        l'association (primary/secondary) + une icône ligne décorative par slide.
//        Aucune photo de personnes : plus aucune représentation ethnique implicite
//        pour les associations qui ne sont pas Lélouma. Le fond se recolore donc
//        automatiquement selon l'identité de chaque association, sans dépendre
//        d'un jeu de photos à sélectionner à la main pour chacune.
// - [NETTOYAGE] Clé localStorage renommée lcd_onboarding_v1 → onboarding_seen_v1
//        (nom générique ; aucun impact fonctionnel, le localStorage est déjà
//        cloisonné par domaine par le navigateur, donc aucune collision possible
//        entre associations).
// - [INTACT] Navigation swipe/clavier, points de progression, bouton "Passer",
//        CTA finale (Se connecter / Créer un compte), timing d'animation : tous
//        strictement inchangés.
//
// v1.0.4 — Fix recadrage photos (trop zoomées) + ajout flèche retour
// v1.0.3 — Photos de couverture remplacées par de l'imagerie Peulh/Fulani authentique
// v1.0.2 — Correction libellé + photos de couverture (toutes vérifiées individuellement)
// v1.0.1 — Fix lint : setState synchrone dans un effect (react-hooks/set-state-in-effect)
// v1.0.0 — Onboarding / Présentation slides (public, aucune authentification requise)
//
// FONCTIONNEMENT :
//   • Premier accès → affiche les 6 slides puis propose « Se connecter » / « Créer un compte »
//   • Visites suivantes → redirige directement vers /login (mémorisé via localStorage)
//   • Swipe gauche/droite sur mobile pour naviguer entre les slides
//   • Bouton « Passer » (top-right) pour sauter directement vers /login

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api-client';

// ─── Clé localStorage ────────────────────────────────────────────────────────
const SEEN_KEY = 'onboarding_seen_v1';

// ─── Icônes décoratives (une par slide, aucune photo — neutre pour toute association) ──
function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2c2.5 2.7 4 6.4 4 10s-1.5 7.3-4 10c-2.5-2.7-4-6.4-4-10s1.5-7.3 4-10z" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" />
      <path d="M5 21V8l7-5 7 5v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
      <path d="M6 15h5" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
      <path d="M16 2.5v4M8 2.5v4M3 10.5h18" />
      <path d="M8 15l2 2 4-4" />
    </svg>
  );
}
function IconMegaphone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10v4a1 1 0 001 1h2l5 4V5L6 9H4a1 1 0 00-1 1z" />
      <path d="M15 8a4 4 0 010 8" />
      <path d="M18 5a8 8 0 010 14" />
    </svg>
  );
}
function IconVote() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h16v11a1 1 0 01-1 1H5a1 1 0 01-1-1V9z" />
      <path d="M4 9l2.5-5h11L20 9" />
      <path d="M9 13.5l2 2 4-4.5" />
    </svg>
  );
}

// ─── Position du dégradé par slide (variété visuelle, mêmes 2 couleurs de thème) ──
const GRADIENT_POSITIONS: Array<[string, string]> = [
  ['30% 20%', '80% 80%'],
  ['70% 15%', '20% 85%'],
  ['20% 70%', '85% 25%'],
  ['80% 30%', '15% 75%'],
  ['50% 10%', '50% 90%'],
  ['25% 25%', '75% 75%'],
];

// ─── Slides ──────────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 0,
    Icon: IconGlobe,
    tag: '🌍 Bienvenue',
    title: 'Votre communauté,\npartout dans le monde',
    desc: 'Cette communauté réunit tous ses membres de la diaspora et du pays en un espace numérique unique et sécurisé.',
  },
  {
    id: 1,
    Icon: IconBuilding,
    tag: '🏗️ Projets',
    title: 'Construisons\nl\'avenir ensemble',
    desc: 'Suivez et soutenez les projets de développement pour votre région : écoles, centres de santé, infrastructures rurales, eau potable...',
  },
  {
    id: 2,
    Icon: IconCard,
    tag: '💳 Cotisations',
    title: 'Cotisez facilement,\nen toute transparence',
    desc: 'Réglez vos cotisations annuelles en ligne, consultez votre historique de paiements et obtenez votre carte de membre active.',
  },
  {
    id: 3,
    Icon: IconCalendar,
    tag: '🎉 Événements',
    title: 'Ne manquez\naucun rendez-vous',
    desc: 'Assemblées générales, réunions d\'antenne, fêtes communautaires : retrouvez tous les événements au même endroit.',
  },
  {
    id: 4,
    Icon: IconMegaphone,
    tag: '📰 Actualités',
    title: 'Toujours informé\ndes nouvelles',
    desc: 'Annonces importantes, résultats de projets, nouvelles de la communauté : l\'information circule librement pour tous les membres.',
  },
  {
    id: 5,
    Icon: IconVote,
    tag: '🗳️ Élections',
    title: 'Votre voix\ncompte vraiment',
    desc: 'Participez aux votes et aux élections de vos représentants. La démocratie participative est au cœur de notre association.',
  },
];

// ─── Composant ───────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [mounted, setMounted]   = useState(false);
  const [slide, setSlide]       = useState(0);
  const touchStartX             = useRef<number | null>(null);

  const [theme, setTheme] = useState<{
    name: string;
    logoUrl: string | null;
    primary: string;
    secondary: string;
  }>({
    name: 'Grand Chef',
    logoUrl: null,
    primary: '#2563EB',
    secondary: '#059669',
  });

  // ── Vérification : onboarding déjà vu ? ──────────────────────────────────
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(SEEN_KEY) === 'true') {
        router.replace('/login');
        return;
      }
    } catch { /* SSR / incognito */ }
    queueMicrotask(() => setMounted(true));
  }, [router]);

  // ── Charge l'identité (nom + logo + couleurs) de l'association résolue par
  //    le domaine/code courant — même convention que login/signup/logout. ──
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code') || undefined;
        const domainParam = urlParams.get('domain') || undefined;
        const currentDomain = !codeParam && !domainParam ? window.location.hostname : undefined;

        if (currentDomain === 'localhost' || currentDomain === 'votre-domaine-principal.com') {
          return;
        }

        const data = await api.getPublicTheme(domainParam || currentDomain, codeParam);
        if (data) {
          setTheme({
            name: data.name,
            logoUrl: data.logoUrl || null,
            primary: data.themeColors?.primary || '#2563EB',
            secondary: data.themeColors?.secondary || '#059669',
          });
        }
      } catch (err) {
        console.warn('Thème personnalisé non trouvé.', err);
      }
    };
    fetchTheme();
  }, []);

  // ── Mémorise l'onboarding comme vu ───────────────────────────────────────
  const markSeen = useCallback(() => {
    try { localStorage.setItem(SEEN_KEY, 'true'); } catch { /* ignore */ }
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo   = useCallback((i: number) => { if (i !== slide) setSlide(i); }, [slide]);
  const goNext = useCallback(() => { if (slide < SLIDES.length - 1) setSlide(s => s + 1); }, [slide]);
  const goPrev = useCallback(() => { if (slide > 0)                 setSlide(s => s - 1); }, [slide]);

  const skipToLogin = useCallback(() => { markSeen(); router.push('/login'); }, [markSeen, router]);

  // ── Swipe mobile ──────────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) goNext();
    else        goPrev();
  }, [goNext, goPrev]);

  // ── Touches clavier ───────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft')  goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  if (!mounted) return null;

  const isLast  = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        /* ══ Racine ══════════════════════════════════════════════════════════ */
        .ob-root {
          font-family: 'DM Sans', sans-serif;
          position: fixed; inset: 0;
          background: #06103A;
          overflow: hidden;
          touch-action: pan-y;
        }

        /* ══ Calque de fond (dégradé de couleurs de thème + icône, crossfade) ══ */
        .ob-imgs {
          position: absolute; inset: 0; z-index: 0;
          background: #06103A;
        }
        .ob-slide-layer {
          position: absolute; inset: 0;
          overflow: hidden;
          transition: opacity 0.75s cubic-bezier(.4,0,.2,1);
        }
        .ob-slide-bg {
          position: absolute; inset: 0;
        }
        .ob-slide-icon-wrap {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          padding-bottom: 16vh;
        }
        .ob-slide-icon {
          width: min(58vw, 260px);
          height: min(58vw, 260px);
          color: rgba(255,255,255,0.16);
          filter: drop-shadow(0 20px 50px rgba(0,0,0,0.35));
        }
        /* Dégradé en deux parties :
           - haut : léger pour laisser respirer le fond
           - bas  : fort pour contraster avec le texte blanc */
        .ob-overlay {
          position: absolute; inset: 0; z-index: 1;
          background:
            linear-gradient(
              to bottom,
              rgba(0,0,0,0.05) 0%,
              rgba(0,0,0,0.00) 22%,
              rgba(0,0,0,0.30) 45%,
              rgba(0,0,0,0.82) 70%,
              rgba(0,0,0,0.96) 100%
            );
        }

        /* ══ Interface ════════════════════════════════════════════════════════ */
        .ob-ui {
          position: absolute; inset: 0; z-index: 2;
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding-top: max(env(safe-area-inset-top, 0px), 3rem);
          padding-bottom: max(env(safe-area-inset-bottom, 0px), 2rem);
        }

        /* ── Header ───────────────────────────────────────────────────────── */
        .ob-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 1.5rem;
        }
        .ob-logo-row {
          display: flex; align-items: center; gap: 0.55rem;
        }
        .ob-back-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          transition: background .15s, transform .15s;
          animation: ob-back-pop 0.25s cubic-bezier(.22,1,.36,1) both;
        }
        .ob-back-btn:hover { background: rgba(255,255,255,0.22); }
        .ob-back-btn:active { transform: scale(0.92); }
        @keyframes ob-back-pop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1);   }
        }
        .ob-logo-wrap {
          width: 38px; height: 38px; border-radius: 50%;
          overflow: hidden; background: #fff; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.28);
          box-shadow: 0 2px 10px rgba(0,0,0,0.25);
        }
        .ob-brand {
          font-size: 0.7rem; font-weight: 800; line-height: 1.25;
          letter-spacing: 0.06em; text-transform: uppercase;
          color: rgba(255,255,255,0.88);
          max-width: 46vw;
        }
        .ob-skip-btn {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
          border-radius: 99px; padding: 0.4rem 1rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.73rem; font-weight: 700;
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          transition: background .2s;
        }
        .ob-skip-btn:hover { background: rgba(255,255,255,0.22); }
        .ob-skip-btn:active { transform: scale(0.97); }

        /* ── Corps / Texte (ré-animé à chaque changement de slide via key) ── */
        .ob-body {
          padding: 0 1.75rem;
          animation: ob-slide-up 0.42s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes ob-slide-up {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        .ob-tag {
          display: inline-block;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.24);
          border-radius: 99px; padding: 0.28rem 0.82rem;
          font-size: 0.69rem; font-weight: 800;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: rgba(255,255,255,0.9); margin-bottom: 0.8rem;
          backdrop-filter: blur(6px);
        }

        .ob-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(2rem, 9.5vw, 2.75rem);
          font-weight: 700; line-height: 1.08;
          letter-spacing: -0.015em; white-space: pre-line;
          color: #fff; margin-bottom: 0.75rem;
          text-shadow: 0 3px 28px rgba(0,0,0,0.55);
        }

        .ob-desc {
          font-size: 0.86rem; font-weight: 500;
          color: rgba(255,255,255,0.76); line-height: 1.65;
          max-width: 360px; margin-bottom: 1.75rem;
        }

        /* ── Points de progression ─────────────────────────────────────────── */
        .ob-dots {
          display: flex; align-items: center; gap: 5px;
          margin-bottom: 1.25rem;
        }
        .ob-dot {
          height: 4px; border-radius: 99px; cursor: pointer;
          transition: width .38s cubic-bezier(.22,1,.36,1), background .38s;
        }
        .ob-dot-on  { width: 28px; background: #fff; }
        .ob-dot-off { width: 8px;  background: rgba(255,255,255,0.28); }
        .ob-dot-off:hover { background: rgba(255,255,255,0.5); }

        /* ── Bouton « Suivant » ─────────────────────────────────────────────── */
        .ob-btn-next {
          width: 100%; height: 54px;
          background: #fff; color: #0A1E5A;
          border: none; border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.97rem; font-weight: 800;
          cursor: pointer; letter-spacing: 0.01em;
          display: flex; align-items: center; justify-content: center; gap: 0.55rem;
          box-shadow: 0 8px 28px rgba(0,0,0,0.35);
          transition: transform .16s, box-shadow .16s;
        }
        .ob-btn-next:hover { box-shadow: 0 12px 36px rgba(0,0,0,0.42); }
        .ob-btn-next:active { transform: scale(0.985); }

        /* ── CTA finale (2 boutons) ─────────────────────────────────────────── */
        .ob-cta { display: flex; flex-direction: column; gap: 0.7rem; }

        .ob-btn-login {
          width: 100%; height: 54px;
          background: #1A56DB; color: #fff;
          border: none; border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.97rem; font-weight: 800;
          cursor: pointer; letter-spacing: 0.01em;
          display: flex; align-items: center; justify-content: center; gap: 0.55rem;
          box-shadow: 0 8px 24px rgba(26,86,219,0.52);
          transition: transform .16s, box-shadow .16s;
          text-decoration: none;
        }
        .ob-btn-login:hover { box-shadow: 0 12px 32px rgba(26,86,219,0.62); transform: translateY(-1px); }
        .ob-btn-login:active { transform: scale(0.985); }

        .ob-btn-signup {
          width: 100%; height: 54px;
          background: rgba(255,255,255,0.1);
          color: #fff;
          border: 1.5px solid rgba(255,255,255,0.3);
          border-radius: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 700;
          cursor: pointer; letter-spacing: 0.01em;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          transition: background .15s, transform .16s;
          text-decoration: none;
        }
        .ob-btn-signup:hover  { background: rgba(255,255,255,0.18); }
        .ob-btn-signup:active { transform: scale(0.985); }

        /* ── Compteur discret ────────────────────────────────────────────────── */
        .ob-counter {
          text-align: center; margin-top: 0.85rem;
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.05em;
          color: rgba(255,255,255,0.3);
        }

        /* ── Responsive petits écrans ──────────────────────────────────────── */
        @media (max-height: 680px) {
          .ob-title { font-size: 1.85rem; }
          .ob-desc  { font-size: 0.8rem; margin-bottom: 1.1rem; }
          .ob-btn-next, .ob-btn-login, .ob-btn-signup { height: 48px; }
        }

        @media (min-width: 480px) {
          .ob-header { padding: 0 2.25rem; }
          .ob-body   { padding: 0 2.25rem; }
        }
      `}</style>

      <div
        className="ob-root"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* ══ Fonds (dégradé de thème + icône, crossfade via opacity) ══════════ */}
        <div className="ob-imgs">
          {SLIDES.map((s, i) => {
            const [posA, posB] = GRADIENT_POSITIONS[i % GRADIENT_POSITIONS.length];
            const SlideIcon = s.Icon;
            return (
              <div
                key={s.id}
                className="ob-slide-layer"
                style={{ opacity: i === slide ? 1 : 0 }}
                aria-hidden="true"
              >
                <div
                  className="ob-slide-bg"
                  style={{
                    background: `radial-gradient(circle at ${posA}, ${theme.primary}66 0%, transparent 55%), radial-gradient(circle at ${posB}, ${theme.secondary}55 0%, transparent 60%), #06103A`,
                  }}
                />
                <div className="ob-slide-icon-wrap">
                  <div className="ob-slide-icon">
                    <SlideIcon />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="ob-overlay" />
        </div>

        {/* ══ Interface ═══════════════════════════════════════════════════════ */}
        <div className="ob-ui">

          {/* ── Header : retour + logo + bouton « Passer » ── */}
          <div className="ob-header">
            <div className="ob-logo-row">
              {/* Flèche retour : visible uniquement après la 1ʳᵉ slide */}
              {slide > 0 && (
                <button
                  className="ob-back-btn"
                  onClick={goPrev}
                  aria-label="Slide précédente"
                  type="button"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="ob-logo-wrap">
                {theme.logoUrl && (
                  <Image
                    src={theme.logoUrl}
                    alt={`Logo ${theme.name}`}
                    width={38}
                    height={38}
                    style={{ objectFit: 'cover', borderRadius: '50%' }}
                    unoptimized
                  />
                )}
              </div>
              <span className="ob-brand">{theme.name}</span>
            </div>

            {/* Le bouton « Passer » disparaît sur la dernière slide */}
            {!isLast && (
              <button className="ob-skip-btn" onClick={skipToLogin} type="button">
                Passer
              </button>
            )}
          </div>

          {/* ── Texte + navigation (re-mounté à chaque slide → animation) ── */}
          <div className="ob-body" key={`ob-body-${slide}`}>

            <div className="ob-tag">{current.tag}</div>

            <h1 className="ob-title">{current.title}</h1>

            <p className="ob-desc">{current.desc}</p>

            {/* Points de progression */}
            <div className="ob-dots" role="tablist" aria-label="Progression des slides">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  role="tab"
                  aria-selected={i === slide}
                  aria-label={`Slide ${i + 1}`}
                  className={`ob-dot ${i === slide ? 'ob-dot-on' : 'ob-dot-off'}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>

            {/* ── Boutons ── */}
            {isLast ? (

              /* Dernière slide : Se connecter + Créer un compte */
              <div className="ob-cta">
                <Link
                  href="/login"
                  className="ob-btn-login"
                  onClick={markSeen}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Se connecter
                </Link>

                <Link
                  href="/signup"
                  className="ob-btn-signup"
                  onClick={markSeen}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Créer votre compte — Devenir membre
                </Link>
              </div>

            ) : (

              /* Slides 1–5 : Bouton « Suivant » */
              <button className="ob-btn-next" onClick={goNext} type="button">
                Suivant
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

            )}

            {/* Compteur discret */}
            <div className="ob-counter" aria-live="polite">
              {slide + 1} / {SLIDES.length}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}