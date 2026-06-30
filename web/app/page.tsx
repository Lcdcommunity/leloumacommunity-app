// web/app/page.tsx
// v1.0.4 — Fix recadrage photos (trop zoomées) + ajout flèche retour
//
// CHANGELOG v1.0.4 (vs v1.0.3) :
// - [FIX] Les photos de couverture paraissaient "trop zoomées" sur mobile : avec
//        object-fit: cover sur un écran très haut et étroit (390×844), une photo
//        au format paysage/standard était étirée pour remplir tout l'écran, donc
//        on ne voyait plus qu'une fine tranche du centre de l'image (ex. juste la
//        tête de la vache, ou le bébé disparu du cadre "mère et enfant"). Remplacé
//        par un système à deux calques par slide : un calque flouté en fond
//        (object-fit: cover + blur) qui comble tout l'écran sans jamais paraître
//        "zoomé" puisqu'il est flou, et la vraie photo par-dessus en
//        object-fit: contain, qui n'est donc JAMAIS recadrée — on voit toujours
//        la photo entière, quel que soit son ratio d'origine.
// - [AJOUT] Flèche de retour (chevron) dans le coin supérieur gauche, à côté du
//        logo, visible uniquement à partir de la 2ᵉ slide (rien à voir derrière sur
//        la 1ʳᵉ). Réutilise la fonction goPrev() déjà existante (swipe/clavier).
//
// v1.0.3 — Photos de couverture remplacées par de l'imagerie Peulh/Fulani authentique
//
// CHANGELOG v1.0.3 (vs v1.0.2) :
// - [CONTENU] Les 6 photos (déjà "Noir(e)s souriant(e)s" en v1.0.2 mais génériques,
//        type stock afro-américain) remplacées par 6 photos montrant spécifiquement
//        des Peulh/Fulani — l'ethnie de la région du Fouta Djallon en Guinée, dont
//        Lélouma fait partie — sur indication explicite de l'utilisateur (capture
//        d'écran de référence : "femmes peulhs du Fouta Djallon aux champs").
//        Sources : Pexels + Unsplash, licences gratuites, contenu vérifié au cas par
//        cas via les tags de la page source (ex. "Fulani", "Fulani Woman", "smiling",
//        localisation) avant intégration — aucune photo choisie à l'aveugle.
//        Localisation des clichés : Nigeria (pas Guinée) — c'est la même ethnie peulh,
//        mais ce n'est pas littéralement le Fouta Djallon guinéen ; à remplacer par de
//        vraies photos de la communauté dès que possible (voir note IMAGES ci-dessous).
//
// v1.0.2 — Correction libellé + photos de couverture (toutes vérifiées individuellement)
//
// CHANGELOG v1.0.2 (vs v1.0.1) :
// - [FIX CRITIQUE] Les 6 photos de couverture étaient des choix faits de mémoire, non
//        vérifiés, et montraient par erreur des personnes blanches au lieu de femmes et
//        hommes noirs comme demandé initialement. Remplacées par 6 photos Unsplash dont
//        le contenu a été vérifié individuellement (tags exacts de la page source :
//        "black", "black woman", "african american", "black man smiling", etc., et
//        identité du photographe quand pertinent) avant intégration — plus aucune photo
//        choisie à l'aveugle dans ce fichier.
// - [FIX] En-tête (.ob-brand) : ajout de la 3ᵉ ligne « pour le Développement » sous
//        « Lélouma / Communauté », même traitement visuel que VirtualCardWidget.tsx
//        (texte de liaison en minuscules/poids réduit, le reste hérite de l'uppercase).
//
// v1.0.1 — Fix lint : setState synchrone dans un effect (react-hooks/set-state-in-effect)
//
// CHANGELOG v1.0.1 (vs v1.0.0) :
// - [FIX] setMounted(true) déplacé dans un queueMicrotask() pour respecter la règle
//        ESLint react-hooks/set-state-in-effect (pas de setState appelé de façon
//        synchrone dans le corps d'un useEffect). Comportement strictement identique,
//        juste différé d'un micro-tick — même pattern que web/app/login/page.tsx.
//
// v1.0.0 — Onboarding / Présentation slides (public, aucune authentification requise)
//
// ⚠️  IMAGES : remplacez les URLs Pexels/Unsplash par vos propres photos de la communauté.
//     Dossier suggéré : web/public/assets/onboarding/slide-{1-6}.jpg
//     Taille recommandée : 900 × 1600 px (portrait), format WEBP ou JPG < 200 Ko.
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

// ─── Clé localStorage ────────────────────────────────────────────────────────
const SEEN_KEY = 'lcd_onboarding_v1';

// ─── Slides ──────────────────────────────────────────────────────────────────
// Remplacez `image` par vos propres photos (ex : '/assets/onboarding/slide-1.jpg')
const SLIDES = [
  {
    id: 0,
    image: 'https://images.pexels.com/photos/36845409/pexels-photo-36845409.jpeg?auto=compress&cs=tinysrgb&w=800',
    tag: '🌍 Bienvenue',
    title: 'Votre communauté,\npartout dans le monde',
    desc: 'Lélouma Communauté pour le Développement réunit tous les Léloumiens de la diaspora et du pays en un espace numérique unique et sécurisé.',
  },
  {
    id: 1,
    image: 'https://images.pexels.com/photos/38235231/pexels-photo-38235231.jpeg?auto=compress&cs=tinysrgb&w=800',
    tag: '🏗️ Projets',
    title: 'Construisons\nl\'avenir ensemble',
    desc: 'Suivez et soutenez les projets de développement pour votre région : écoles, centres de santé, infrastructures rurales, eau potable...',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1570406794469-630903944dc1?w=800&q=85&fit=crop&crop=faces,top',
    tag: '💳 Cotisations',
    title: 'Cotisez facilement,\nen toute transparence',
    desc: 'Réglez vos cotisations annuelles en ligne, consultez votre historique de paiements et obtenez votre carte de membre active.',
  },
  {
    id: 3,
    image: 'https://images.pexels.com/photos/34735501/pexels-photo-34735501.jpeg?auto=compress&cs=tinysrgb&w=800',
    tag: '🎉 Événements',
    title: 'Ne manquez\naucun rendez-vous',
    desc: 'Assemblées générales, réunions d\'antenne, fêtes communautaires : retrouvez tous les événements au même endroit.',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1645862722306-e9da81aae38c?w=800&q=85&fit=crop&crop=faces,top',
    tag: '📰 Actualités',
    title: 'Toujours informé\ndes nouvelles',
    desc: 'Annonces importantes, résultats de projets, nouvelles de la communauté : l\'information circule librement pour tous les membres.',
  },
  {
    id: 5,
    image: 'https://images.pexels.com/photos/30483241/pexels-photo-30483241.jpeg?auto=compress&cs=tinysrgb&w=800',
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

        /* ══ Calque images (crossfade) ═══════════════════════════════════════ */
        .ob-imgs {
          position: absolute; inset: 0; z-index: 0;
          background: #06103A;
        }
        .ob-img-layer {
          position: absolute; inset: 0;
          overflow: hidden;
          transition: opacity 0.75s cubic-bezier(.4,0,.2,1);
        }
        /* Calque 1 : copie de la photo en fond, floutée + assombrie, qui remplit
           tout l'écran sans jamais paraître "zoomée" puisqu'elle est censée
           être floue — elle sert uniquement à combler les bandes vides. */
        .ob-img-blur {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover;
          filter: blur(60px) brightness(0.6) saturate(1.3);
          transform: scale(1.3); /* évite de voir le bord net du flou */
        }
        /* Calque 2 : la vraie photo, jamais recadrée — object-fit: contain
           garantit qu'on voit l'image en entier, quel que soit son ratio. */
        .ob-img-fg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: contain;
          object-position: center 40%;
        }
        /* Dégradé en deux parties :
           - haut : léger pour laisser respirer la photo
           - bas  : fort pour contraster avec le texte blanc */
        .ob-overlay {
          position: absolute; inset: 0; z-index: 1;
          background:
            linear-gradient(
              to bottom,
              rgba(0,0,0,0.08) 0%,
              rgba(0,0,0,0.00) 22%,
              rgba(0,0,0,0.28) 45%,
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
          font-size: 0.66rem; font-weight: 800; line-height: 1.1;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: rgba(255,255,255,0.88);
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

        {/* ══ Images de fond (toutes montées, crossfade via opacity) ══════════ */}
        <div className="ob-imgs">
          {SLIDES.map((s, i) => (
            <div
              key={s.id}
              className="ob-img-layer"
              style={{ opacity: i === slide ? 1 : 0 }}
              aria-hidden="true"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt=""
                className="ob-img-blur"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt=""
                className="ob-img-fg"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </div>
          ))}
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
                <Image
                  src="/assets/images/logolcd.jpg"
                  alt="Logo Lélouma Communauté"
                  width={38}
                  height={38}
                  style={{ objectFit: 'cover', borderRadius: '50%' }}
                  unoptimized
                />
              </div>
              <span className="ob-brand">
                Lélouma<br />Communauté<br />
                <span style={{ textTransform: 'none', fontWeight: 600, fontSize: '0.84em' }}>pour le </span>Développement
              </span>
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