'use client';
// web/components/admin/PendingActionsAlertBar.tsx
//
// v1.1 — 🔥 CORRIGÉ : l'animation "respirante" existait déjà mais était
// quasi invisible en pratique — opacité plafonnée à 0.35, anneau limité à
// 6px, currentColor peu contrasté sur fond blanc. Remplacée par un effet
// "sonar" classique (anneau collé au bord, opaque, qui s'étale en
// s'estompant) — même principe que Tailwind's animate-ping, nettement plus
// perceptible. La couleur du glow est dérivée de item.color via deux
// variables CSS par carte (start = couleur à ~45% d'opacité, end =
// transparent), pour rester spécifique à chaque type d'action sans dupliquer
// le keyframes.
//
// v1.0 — NOUVEAU : bandeau "actions requises" affiché en haut du dashboard
// admin/super-admin — regroupe en un coup d'œil tout ce qui attend une
// décision. Fichier isolé et purement présentationnel : aucun appel réseau
// ici, les données arrivent en props déjà chargées par la page qui l'utilise.

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

export function PendingActionsAlertBar({ items }: { items: PendingActionItem[] }) {
  const visible = items.filter((i) => i.count > 0);
  if (visible.length === 0) return null;

  return (
    <>
      <style>{`
        .apb-wrap {
          margin-bottom: 1.5rem;
          opacity: 0; transform: translateY(10px);
          animation: apbin 0.5s 0.06s cubic-bezier(.22,1,.36,1) forwards;
        }
        .apb-label {
          font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: #9CA3AF;
          margin: 0 0 0.65rem; display: flex; align-items: center; gap: 0.5rem;
        }
        .apb-label::after { content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.06); }
        .apb-row {
          display: flex; flex-wrap: wrap; gap: 0.75rem;
        }
        .apb-card {
          flex: 1 1 220px; min-width: 200px;
          display: flex; align-items: center; gap: 0.85rem;
          padding: 1rem 1.1rem; border-radius: 16px;
          border: 1.5px solid; cursor: pointer;
          background: white;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative; overflow: visible;
          -webkit-tap-highlight-color: transparent;
        }
        .apb-card:hover { transform: translateY(-2px); }
        .apb-card-icon {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          position: relative; z-index: 1;
        }
        .apb-card-body { min-width: 0; flex: 1; position: relative; z-index: 1; }
        .apb-card-count {
          font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700;
          line-height: 1; margin-bottom: 0.15rem;
        }
        .apb-card-label {
          font-size: 0.72rem; font-weight: 700; color: #374151;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .apb-card-arrow {
          flex-shrink: 0; opacity: 0.5; transition: transform 0.2s, opacity 0.2s;
          position: relative; z-index: 1;
        }
        .apb-card:hover .apb-card-arrow { opacity: 1; transform: translateX(3px); }

        /* ── Respiration : effet "sonar" — anneau qui part collé au bord,
           opaque, puis s'étale en s'estompant. Beaucoup plus visible que
           l'ancienne version (opacité plafonnée à 0.35, 6px max). ── */
        .apb-card::before {
          content: ''; position: absolute; inset: 0; border-radius: 16px;
          box-shadow: 0 0 0 0 var(--apb-glow-start);
          animation: apbBreathe 1.9s cubic-bezier(0.25, 0.6, 0.4, 1) infinite;
          pointer-events: none;
          z-index: 0;
        }
        @keyframes apbBreathe {
          0%   { box-shadow: 0 0 0 0 var(--apb-glow-start); }
          70%  { box-shadow: 0 0 0 12px var(--apb-glow-end); }
          100% { box-shadow: 0 0 0 12px var(--apb-glow-end); }
        }
        @keyframes apbin { to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 640px) {
          .apb-card { flex: 1 1 100%; }
        }
      `}</style>

      <div className="apb-wrap">
        <div className="apb-label">Actions requises</div>
        <div className="apb-row">
          {visible.map((item) => (
            <div
              key={item.id}
              className="apb-card"
              style={{
                borderColor: item.border,
                color: item.color,
                // 🔥 Variables CSS consommées par .apb-card::before —
                // suppose item.color en hex 6 chiffres (ex. "#7C3AED"),
                // convention déjà utilisée partout ailleurs pour ces items.
                ['--apb-glow-start' as string]: `${item.color}73`, // ~45% opacité
                ['--apb-glow-end' as string]: `${item.color}00`,   // transparent
              } as React.CSSProperties}
              onClick={item.onClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') item.onClick(); }}
            >
              <div className="apb-card-icon" style={{ background: item.bg, color: item.color }}>
                {item.icon}
              </div>
              <div className="apb-card-body">
                <div className="apb-card-count" style={{ color: item.color }}>{item.count}</div>
                <div className="apb-card-label">{item.label}</div>
              </div>
              <svg className="apb-card-arrow" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={item.color} strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}