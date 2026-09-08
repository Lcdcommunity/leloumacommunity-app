'use client';

/**
 * PendingActionsAlertBar.tsx
 *
 * v2.0 — DESIGN IMMERSIF / STACKED CARDS
 *
 * Nouveau design :
 * ─────────────────────────────────────────────────────────────
 * • L'image devient un arrière-plan immersif.
 * • Les cartes occupent toute la largeur disponible.
 * • Les cartes se superposent verticalement comme une pile.
 * • Chaque carte possède son propre glow animé.
 * • Effet sonar / respiration autour des cartes.
 * • Profondeur, blur, transparence et ombres modernes.
 * • Animation d'apparition progressive.
 * • Responsive desktop / tablette / mobile.
 * • Navigation clavier.
 * • Support de prefers-reduced-motion.
 *
 * Utilisation :
 *
 * <PendingActionsAlertBar
 *   items={items}
 *   backgroundImage="/images/pending-actions-map.jpg"
 * />
 *
 * Si backgroundImage n'est pas fourni, le composant utilise :
 * /images/pending-actions-map.jpg
 */

import React from 'react';

export interface PendingActionItem {
  id: string;
  label: string;
  count: number;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export interface PendingActionsAlertBarProps {
  items: PendingActionItem[];

  /**
   * Image utilisée comme arrière-plan du bloc.
   *
   * Exemple :
   * "/images/pending-actions-map.jpg"
   */
  backgroundImage?: string;

  /**
   * Titre affiché au-dessus des cartes.
   */
  title?: string;

  /**
   * Petit texte affiché sous le titre.
   */
  subtitle?: string;

  /**
   * Permet de désactiver temporairement les animations.
   */
  disableAnimation?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Transforme une couleur hexadécimale en rgba.
 *
 * Cela évite de concaténer directement "73" ou "00" à une couleur,
 * ce qui pourrait casser si item.color n'est pas exactement au format
 * #RRGGBB.
 */
function colorToRgba(
  color: string,
  alpha: number
): string {
  const fallback = `rgba(124, 58, 237, ${alpha})`;

  if (!color) return fallback;

  const value = color.trim();

  // #RGB
  const shortHex = value.match(/^#([0-9a-fA-F]{3})$/);

  if (shortHex) {
    const hex = shortHex[1];

    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // #RRGGBB
  const fullHex = value.match(/^#([0-9a-fA-F]{6})$/);

  if (fullHex) {
    const hex = fullHex[1];

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // rgb(...)
  const rgb = value.match(
    /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i
  );

  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${alpha})`;
  }

  // rgba(...) → on remplace l'opacité
  const rgba = value.match(
    /^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*[\d.]+\s*\)$/i
  );

  if (rgba) {
    return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${alpha})`;
  }

  return fallback;
}

/**
 * Limite une valeur entre min et max.
 */
function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(Math.max(value, min), max);
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export function PendingActionsAlertBar({
  items,
  backgroundImage = '/images/pending-actions-map.jpg',
  title = 'Actions requises',
  subtitle = 'Des opérations nécessitent votre validation',
  disableAnimation = false,
}: PendingActionsAlertBarProps) {
  const visible = items.filter((item) => item.count > 0);

  if (visible.length === 0) {
    return null;
  }

  return (
    <>
      <style>{`
        /* ================================================================== */
        /* ROOT                                                                */
        /* ================================================================== */

        .pending-alert {
          --pa-radius: 22px;
          --pa-stack-offset: 74px;
          --pa-padding-x: clamp(1rem, 3vw, 2rem);
          --pa-max-width: 100%;
          
          position: relative;
          width: 100%;
          max-width: var(--pa-max-width);
          margin: 0 0 2rem;
          isolation: isolate;
        }

        /* ================================================================== */
        /* BACKGROUND                                                           */
        /* ================================================================== */

        .pending-alert-bg {
          position: absolute;
          inset: 0;
          z-index: -3;
          overflow: hidden;
          border-radius: 28px;
          background:
            linear-gradient(
              135deg,
              rgba(248, 250, 252, 0.96) 0%,
              rgba(241, 245, 249, 0.90) 38%,
              rgba(236, 241, 247, 0.86) 100%
            ),
            url("${backgroundImage}") center center / cover no-repeat;
        }

        .pending-alert-bg::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle at 15% 20%,
              rgba(124,58,237,0.08),
              transparent 28%
            ),
            radial-gradient(
              circle at 85% 80%,
              rgba(124,58,237,0.06),
              transparent 30%
            );
          pointer-events: none;
        }

        .pending-alert-bg::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              rgba(15,23,42,0.05),
              transparent 30%,
              transparent 70%,
              rgba(15,23,42,0.05)
            );
          pointer-events: none;
        }

        /* ================================================================== */
        /* HEADER                                                               */
        /* ================================================================== */

        .pending-alert-header {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;

          padding:
            clamp(1.25rem, 3vw, 2rem)
            var(--pa-padding-x)
            clamp(1rem, 2vw, 1.5rem);
        }

        .pending-alert-heading {
          min-width: 0;
        }

        .pending-alert-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;

          margin-bottom: 0.4rem;

          color: rgba(71,85,105,0.85);
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          line-height: 1;
          text-transform: uppercase;
        }

        .pending-alert-kicker-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #7c3aed;
          box-shadow:
            0 0 0 4px rgba(124,58,237,0.14),
            0 0 18px rgba(124,58,237,0.45);

          animation: pendingHeaderPulse 1.8s ease-in-out infinite;
        }

        .pending-alert-title {
          margin: 0;
          color: #0f172a;

          font-size: clamp(1.15rem, 2.2vw, 1.65rem);
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.1;
        }

        .pending-alert-subtitle {
          margin: 0.4rem 0 0;

          color: rgba(71,85,105,0.75);
          font-size: clamp(0.72rem, 1.4vw, 0.82rem);
          font-weight: 500;
          line-height: 1.45;
        }

        .pending-alert-total {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          min-width: 70px;
          height: 70px;
          padding: 0.5rem;

          flex-shrink: 0;

          border: 1px solid rgba(15,23,42,0.08);
          border-radius: 18px;

          background: rgba(255,255,255,0.65);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.9),
            0 12px 35px rgba(15,23,42,0.08);

          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .pending-alert-total-number {
          color: #0f172a;
          font-size: 1.35rem;
          font-weight: 900;
          line-height: 1;
        }

        .pending-alert-total-label {
          margin-top: 0.3rem;
          color: rgba(71,85,105,0.65);
          font-size: 0.55rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        /* ================================================================== */
        /* STACK                                                                */
        /* ================================================================== */

        .pending-alert-stack {
          position: relative;
          z-index: 5;

          width: 100%;
          padding:
            0
            var(--pa-padding-x)
            clamp(1.4rem, 4vw, 2.5rem);

          /*
           * Important :
           * La hauteur est calculée par le contenu des cartes.
           * Chaque carte suivante remonte pour créer l'effet de pile.
           */
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }

        /* ================================================================== */
        /* CARD                                                                 */
        /* ================================================================== */

        .pending-alert-card {
          --card-color: #7c3aed;
          --card-glow: rgba(124,58,237,0.42);
          --card-glow-soft: rgba(124,58,237,0.18);

          position: relative;
          width: 100%;
          min-height: 92px;

          display: flex;
          align-items: center;
          gap: 1rem;

          padding:
            0.95rem
            clamp(1rem, 2vw, 1.35rem);

          margin-top: calc(var(--pa-stack-offset) * -1);

          border:
            1px solid
            rgba(255,255,255,0.20);

          border-radius: var(--pa-radius);

          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.96),
              rgba(248,250,252,0.91)
            );

          box-shadow:
            0 20px 45px rgba(0,0,0,0.18),
            0 5px 15px rgba(0,0,0,0.08),
            inset 0 1px 0 rgba(255,255,255,0.95);

          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);

          cursor: pointer;
          overflow: visible;

          transform:
            translateY(0)
            scale(1);

          transition:
            transform 280ms cubic-bezier(.22,1,.36,1),
            box-shadow 280ms ease,
            border-color 280ms ease;

          -webkit-tap-highlight-color: transparent;

          /*
           * Le z-index garantit que la carte du dessus est toujours
           * au premier plan.
           */
          z-index: calc(100 - var(--card-index));
        }

        /*
         * Première carte : elle ne remonte pas.
         */
        .pending-alert-card:first-child {
          margin-top: 0;
        }

        /*
         * Barre colorée verticale.
         */
        .pending-alert-card::after {
          content: "";

          position: absolute;
          left: 0.45rem;
          top: 16%;
          bottom: 16%;

          width: 3px;

          border-radius: 999px;

          background: var(--card-color);

          box-shadow:
            0 0 10px var(--card-glow),
            0 0 22px var(--card-glow-soft);

          opacity: 0.95;

          pointer-events: none;
        }

        /*
         * Anneau sonar.
         */
        .pending-alert-card::before {
          content: "";

          position: absolute;
          inset: -1px;

          border-radius: inherit;

          border: 1px solid transparent;

          box-shadow:
            0 0 0 0 var(--card-glow);

          opacity: 0;

          pointer-events: none;

          animation:
            pendingCardSonar
            2.6s
            cubic-bezier(.25,.6,.4,1)
            infinite;
        }

        /*
         * Hover desktop.
         */
        @media (hover: hover) and (pointer: fine) {
          .pending-alert-card:hover {
            transform:
              translateY(-5px)
              scale(1.008);

            border-color:
              var(--card-glow);

            box-shadow:
              0 28px 60px rgba(0,0,0,0.23),
              0 8px 25px var(--card-glow-soft),
              inset 0 1px 0 rgba(255,255,255,1);
          }

          .pending-alert-card:hover
          .pending-alert-arrow {
            transform: translateX(5px);
            opacity: 1;
          }

          .pending-alert-card:hover
          .pending-alert-icon {
            transform:
              translateY(-1px)
              rotate(-2deg)
              scale(1.04);
          }
        }

        /*
         * Active / clic.
         */
        .pending-alert-card:active {
          transform: scale(0.992);
        }

        /* ================================================================== */
        /* ICON                                                                 */
        /* ================================================================== */

        .pending-alert-icon {
          position: relative;
          z-index: 2;

          width: clamp(46px, 6vw, 54px);
          height: clamp(46px, 6vw, 54px);

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 16px;

          background:
            var(--card-bg);

          color: var(--card-color);

          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.75),
            0 8px 18px var(--card-glow-soft);

          transition:
            transform 280ms cubic-bezier(.22,1,.36,1);

          overflow: hidden;
        }

        .pending-alert-icon::after {
          content: "";

          position: absolute;
          inset: 0;

          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.35),
              transparent 50%
            );

          pointer-events: none;
        }

        .pending-alert-icon svg {
          position: relative;
          z-index: 2;
        }

        /* ================================================================== */
        /* BODY                                                                 */
        /* ================================================================== */

        .pending-alert-card-body {
          position: relative;
          z-index: 2;

          flex: 1;
          min-width: 0;

          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .pending-alert-card-top {
          display: flex;
          align-items: baseline;
          gap: 0.65rem;
        }

        .pending-alert-count {
          margin: 0;

          color: var(--card-color);

          font-family:
            'Cormorant Garamond',
            Georgia,
            serif;

          font-size: clamp(1.65rem, 3vw, 2.1rem);
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: -0.025em;
        }

        .pending-alert-new {
          display: inline-flex;
          align-items: center;

          padding: 0.22rem 0.45rem;

          border-radius: 999px;

          background: var(--card-bg);
          color: var(--card-color);

          font-size: 0.5rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;

          white-space: nowrap;
        }

        .pending-alert-card-label {
          margin-top: 0.25rem;

          color: #1f2937;

          font-size: clamp(0.75rem, 1.6vw, 0.86rem);
          font-weight: 750;
          line-height: 1.25;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pending-alert-card-description {
          margin-top: 0.25rem;

          color: #9ca3af;

          font-size: 0.62rem;
          font-weight: 600;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ================================================================== */
        /* PROGRESS                                                             */
        /* ================================================================== */

        .pending-alert-progress {
          position: relative;

          width: min(130px, 30vw);
          height: 3px;

          margin-top: 0.55rem;

          overflow: hidden;

          border-radius: 999px;

          background: rgba(0,0,0,0.07);
        }

        .pending-alert-progress::after {
          content: "";

          position: absolute;
          inset: 0;

          width: 42%;

          border-radius: inherit;

          background: var(--card-color);

          box-shadow:
            0 0 8px var(--card-glow);

          animation:
            pendingProgress
            2.2s
            ease-in-out
            infinite;
        }

        /* ================================================================== */
        /* ARROW                                                                */
        /* ================================================================== */

        .pending-alert-arrow {
          position: relative;
          z-index: 2;

          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 12px;

          background: var(--card-bg);

          color: var(--card-color);

          opacity: 0.65;

          transition:
            transform 240ms cubic-bezier(.22,1,.36,1),
            opacity 240ms ease,
            background 240ms ease;
        }

        .pending-alert-arrow svg {
          width: 17px;
          height: 17px;
        }

        /* ================================================================== */
        /* FOOTER                                                               */
        /* ================================================================== */

        .pending-alert-footer {
          position: relative;
          z-index: 5;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 0.5rem;

          padding:
            0
            var(--pa-padding-x)
            1.2rem;

          color: rgba(71,85,105,0.6);

          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-align: center;
        }

        .pending-alert-footer-line {
          width: 28px;
          height: 1px;

          background: rgba(15,23,42,0.12);
        }

        /* ================================================================== */
        /* ANIMATIONS                                                           */
        /* ================================================================== */

        @keyframes pendingHeaderPulse {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(0.85);
            box-shadow:
              0 0 0 4px rgba(124,58,237,0.10),
              0 0 10px rgba(124,58,237,0.20);
          }

          50% {
            opacity: 1;
            transform: scale(1);
            box-shadow:
              0 0 0 6px rgba(124,58,237,0.16),
              0 0 22px rgba(124,58,237,0.45);
          }
        }

        @keyframes pendingCardSonar {
          0% {
            opacity: 0.65;
            transform: scale(1);
            box-shadow:
              0 0 0 0 var(--card-glow);
          }

          62% {
            opacity: 0;
            transform: scale(1.025);
            box-shadow:
              0 0 0 12px transparent;
          }

          100% {
            opacity: 0;
            transform: scale(1.025);
            box-shadow:
              0 0 0 12px transparent;
          }
        }

        @keyframes pendingProgress {
          0% {
            transform: translateX(-130%);
            opacity: 0.4;
          }

          40% {
            opacity: 1;
          }

          70% {
            opacity: 1;
          }

          100% {
            transform: translateX(320%);
            opacity: 0.25;
          }
        }

        /*
         * Animation d'entrée.
         */
        .pending-alert.is-animated
        .pending-alert-card {
          opacity: 0;

          transform:
            translateY(22px)
            scale(0.985);

          animation:
            pendingCardEntrance
            600ms
            cubic-bezier(.22,1,.36,1)
            forwards;

          animation-delay:
            calc(var(--card-index) * 90ms + 120ms);
        }

        @keyframes pendingCardEntrance {
          0% {
            opacity: 0;

            transform:
              translateY(22px)
              scale(0.985);
          }

          65% {
            opacity: 1;
          }

          100% {
            opacity: 1;

            transform:
              translateY(0)
              scale(1);
          }
        }

        /* ================================================================== */
        /* TABLET                                                               */
        /* ================================================================== */

        @media (max-width: 768px) {
          .pending-alert {
            --pa-stack-offset: 66px;
          }

          .pending-alert-bg {
            border-radius: 22px;
          }

          .pending-alert-header {
            align-items: center;
          }

          .pending-alert-total {
            width: 58px;
            min-width: 58px;
            height: 58px;
            border-radius: 15px;
          }

          .pending-alert-total-number {
            font-size: 1.1rem;
          }

          .pending-alert-total-label {
            font-size: 0.48rem;
          }

          .pending-alert-card {
            min-height: 82px;
            border-radius: 18px;
          }

          .pending-alert-icon {
            border-radius: 13px;
          }

          .pending-alert-card-description {
            display: none;
          }
        }

        /* ================================================================== */
        /* MOBILE                                                               */
        /* ================================================================== */

        @media (max-width: 520px) {
          .pending-alert {
            --pa-stack-offset: 60px;
            margin-bottom: 1.25rem;
          }

          .pending-alert-header {
            padding-top: 1.15rem;
            padding-bottom: 0.9rem;
          }

          .pending-alert-title {
            font-size: 1.05rem;
          }

          .pending-alert-subtitle {
            max-width: 230px;
            font-size: 0.66rem;
          }

          .pending-alert-total {
            display: none;
          }

          .pending-alert-card {
            min-height: 76px;

            gap: 0.75rem;

            padding:
              0.75rem
              0.8rem;

            border-radius: 16px;
          }

          .pending-alert-card::after {
            left: 0.3rem;
            width: 2px;
          }

          .pending-alert-icon {
            width: 42px;
            height: 42px;
            border-radius: 12px;
          }

          .pending-alert-count {
            font-size: 1.45rem;
          }

          .pending-alert-card-label {
            font-size: 0.68rem;
          }

          .pending-alert-new {
            display: none;
          }

          .pending-alert-arrow {
            width: 32px;
            height: 32px;
            border-radius: 10px;
          }

          .pending-alert-arrow svg {
            width: 14px;
            height: 14px;
          }

          .pending-alert-progress {
            width: 85px;
            margin-top: 0.35rem;
          }

          .pending-alert-footer {
            padding-bottom: 0.9rem;
            font-size: 0.52rem;
          }
        }

        /* ================================================================== */
        /* VERY SMALL SCREENS                                                   */
        /* ================================================================== */

        @media (max-width: 360px) {
          .pending-alert-card-label {
            max-width: 150px;
          }

          .pending-alert-icon {
            width: 38px;
            height: 38px;
          }

          .pending-alert-card {
            padding-right: 0.65rem;
          }

          .pending-alert-arrow {
            display: none;
          }
        }

        /* ================================================================== */
        /* ACCESSIBILITY                                                        */
        /* ================================================================== */

        .pending-alert-card:focus-visible {
          outline: 3px solid
            var(--card-glow);

          outline-offset: 3px;
        }

        /*
         * Réduction des animations pour les utilisateurs qui ont demandé
         * moins de mouvement dans leur système.
         */
        @media (prefers-reduced-motion: reduce) {
          .pending-alert *,
          .pending-alert *::before,
          .pending-alert *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }

          .pending-alert-card {
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <section
        className={`pending-alert ${
          disableAnimation ? '' : 'is-animated'
        }`}
        aria-label={title}
      >
        {/* ================================================================ */}
        {/* IMAGE DE FOND                                                     */}
        {/* ================================================================ */}

        <div
          className="pending-alert-bg"
          aria-hidden="true"
        />

        {/* ================================================================ */}
        {/* HEADER                                                             */}
        {/* ================================================================ */}

        <header className="pending-alert-header">
          <div className="pending-alert-heading">
            <div className="pending-alert-kicker">
              <span
                className="pending-alert-kicker-dot"
                aria-hidden="true"
              />

              <span>
                Administration
              </span>
            </div>

            <h2 className="pending-alert-title">
              {title}
            </h2>

            {subtitle && (
              <p className="pending-alert-subtitle">
                {subtitle}
              </p>
            )}
          </div>

          <div
            className="pending-alert-total"
            aria-label={`${visible.length} catégories d'actions en attente`}
          >
            <span className="pending-alert-total-number">
              {visible.length}
            </span>

            <span className="pending-alert-total-label">
              en attente
            </span>
          </div>
        </header>

        {/* ================================================================ */}
        {/* STACK DES CARTES                                                  */}
        {/* ================================================================ */}

        <div className="pending-alert-stack">
          {visible.map((item, index) => {
            /*
             * On limite légèrement l'intensité du glow pour éviter que
             * les cartes très nombreuses deviennent trop lumineuses.
             */
            const glowIntensity = clamp(
              0.42 - index * 0.025,
              0.20,
              0.42
            );

            const softGlowIntensity = clamp(
              0.18 - index * 0.012,
              0.08,
              0.18
            );

            const cardGlow = colorToRgba(
              item.color,
              glowIntensity
            );

            const cardGlowSoft = colorToRgba(
              item.color,
              softGlowIntensity
            );

            const cardBackground = colorToRgba(
              item.color,
              0.09
            );

            const style = {
              '--card-index': index,
              '--card-color': item.color,
              '--card-glow': cardGlow,
              '--card-glow-soft': cardGlowSoft,
              '--card-bg': cardBackground,
            } as React.CSSProperties;

            const handleKeyDown = (
              event: React.KeyboardEvent<HTMLDivElement>
            ) => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
                event.preventDefault();
                item.onClick();
              }
            };

            return (
              <div
                key={item.id}
                className="pending-alert-card"
                style={style}
                onClick={item.onClick}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-label={`${item.label} : ${item.count} en attente`}
              >
                {/* -------------------------------------------------------- */}
                {/* ICON                                                       */}
                {/* -------------------------------------------------------- */}

                <div
                  className="pending-alert-icon"
                  style={{
                    background: item.bg,
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>

                {/* -------------------------------------------------------- */}
                {/* BODY                                                       */}
                {/* -------------------------------------------------------- */}

                <div className="pending-alert-card-body">
                  <div className="pending-alert-card-top">
                    <div
                      className="pending-alert-count"
                      style={{
                        color: item.color,
                      }}
                    >
                      {item.count}
                    </div>

                    {item.count > 0 && (
                      <span className="pending-alert-new">
                        À traiter
                      </span>
                    )}
                  </div>

                  <div className="pending-alert-card-label">
                    {item.label}
                  </div>

                  <div
                    className="pending-alert-progress"
                    aria-hidden="true"
                  />
                </div>

                {/* -------------------------------------------------------- */}
                {/* ARROW                                                      */}
                {/* -------------------------------------------------------- */}

                <div
                  className="pending-alert-arrow"
                  style={{
                    color: item.color,
                    background: item.bg,
                  }}
                  aria-hidden="true"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M13 6l6 6-6 6" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* FOOTER                                                            */}
        {/* ================================================================ */}

        <div className="pending-alert-footer">
          <span
            className="pending-alert-footer-line"
            aria-hidden="true"
          />

          <span>
            Cliquez sur une action pour accéder directement à sa validation
          </span>

          <span
            className="pending-alert-footer-line"
            aria-hidden="true"
          />
        </div>
      </section>
    </>
  );
}

export default PendingActionsAlertBar;