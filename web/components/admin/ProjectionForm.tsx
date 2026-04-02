//web/components/admin/ProjectionForm.tsx
'use client';

import { useState } from 'react';
import { formatCurrency } from '../../lib/format';

/* ══════════════════════════════════════════════════ CALCULS */
function compute(
  totalMembers: number,
  participationRate: number,
  averageContribution: number,
  targetBudget: number
) {
  const paying = Math.round(totalMembers * (participationRate / 100));
  const total = paying * averageContribution;
  const coverage = targetBudget > 0 ? Math.min(200, (total / targetBudget) * 100) : 100;
  const balance = total - targetBudget;
  return { paying, total, coverage, balance };
}

/* ══════════════════════════════════════════════════ SLIDER */
function Slider({
  value, min, max, step = 1, onChange,
}: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="pf-slider"
      style={{ '--pct': `${pct}%` } as React.CSSProperties}
    />
  );
}

/* ══════════════════════════════════════════════════ COVERAGE GAUGE */
function CoverageGauge({ pct }: { pct: number }) {
  const capped = Math.min(pct, 100);
  const r = 44;
  const halfArc = Math.PI * r;
  const filled = (capped / 100) * halfArc;
  const color = pct >= 100 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#F87171';

  return (
    <div className="pf-gauge-wrapper">
      <div style={{ position: 'relative', width: 110, height: 58, overflow: 'hidden', flexShrink: 0 }}>
        <svg width="110" height="110" viewBox="0 0 110 110" style={{ position: 'absolute', top: 0 }}>
          <path d="M 11 55 A 44 44 0 0 1 99 55" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="9" strokeLinecap="round" />
          <path d="M 11 55 A 44 44 0 0 1 99 55" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${filled} ${halfArc}`}
            style={{ transition: 'stroke-dasharray .65s cubic-bezier(.22,1,.36,1), stroke .3s' }}
          />
        </svg>
        <div style={{ position: 'absolute', bottom: 2, width: '100%', textAlign: 'center' }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '1.35rem', fontWeight: 700, color, lineHeight: 1 }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <span style={{ fontSize: '.6rem', fontWeight: 800, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '.2rem' }}>
        Couverture
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════ MAIN */
export function ProjectionForm() {
  const [totalMembers,       setTotalMembers]       = useState(150);
  const [participationRate,  setParticipationRate]  = useState(65);
  const [averageContribution,setAverageContribution]= useState(25);
  const [targetBudget,       setTargetBudget]       = useState(3000);
  const currency = 'EUR';

  const { paying, total, coverage, balance } = compute(
    totalMembers, participationRate, averageContribution, targetBudget
  );

  const isOk       = balance >= 0;
  const barColor   = coverage >= 100 ? '#10B981' : coverage >= 70 ? '#F59E0B' : '#F87171';
  const barWidth   = `${Math.min(coverage, 100)}%`;

  /* Preset shortcuts */
  const PRESETS = [
    { label: 'Pessimiste', rate: 30, contrib: 15 },
    { label: 'Réaliste',   rate: 65, contrib: 25 },
    { label: 'Optimiste',  rate: 90, contrib: 40 },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600;700&display=swap');

        @keyframes pfIn   { to { opacity: 1; transform: translateY(0)   } }
        @keyframes pfPop  { to { opacity: 1; transform: scale(1)         } }

        /* ── Layout ── */
        .pf-root {
          font-family: 'DM Sans', sans-serif;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 720px) {
          .pf-root { grid-template-columns: 1fr; gap: 1rem; }
        }

        /* ── Left card (inputs) ── */
        .pf-card {
          background: white;
          border-radius: 20px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 2px 12px rgba(15,118,110,.05);
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          animation: pfIn .5s .05s cubic-bezier(.22,1,.36,1) forwards;
          width: 100%;
          box-sizing: border-box;
        }
        .pf-card-head {
          padding: .9rem 1.3rem;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          gap: .55rem;
          background: linear-gradient(135deg, rgba(15,118,110,.04), rgba(20,184,166,.02));
        }
        .pf-card-ico {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg,#0F766E,#14B8A6);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 8px rgba(15,118,110,.25); color: white; flex-shrink: 0;
        }
        .pf-card-title {
          font-size: .65rem; font-weight: 900; letter-spacing: .1em;
          text-transform: uppercase; color: #334155;
        }
        .pf-card-body { 
          padding: 1.3rem; 
          display: flex; 
          flex-direction: column; 
          gap: 1.2rem; 
          width: 100%;
          box-sizing: border-box;
        }

        /* ── Field ── */
        .pf-field { display: flex; flex-direction: column; gap: .35rem; width: 100%; }
        .pf-label {
          font-size: .67rem; font-weight: 800; color: #475569;
          text-transform: uppercase; letter-spacing: .07em;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 0.4rem;
        }
        .pf-badge {
          font-family: 'DM Mono', monospace; font-size: .72rem; font-weight: 700;
          color: #0F766E; background: #F0FDF9; border: 1px solid #A7F3D0;
          padding: .15rem .5rem; border-radius: 7px;
        }

        /* ── Number input ── */
        .pf-num-wrap {
          display: flex; align-items: center; gap: .4rem;
          height: 44px; background: #FAFAFA; border: 1.5px solid #E2E8F0;
          border-radius: 11px; padding: 0 .85rem;
          transition: border-color .18s, box-shadow .18s;
          width: 100%; box-sizing: border-box;
        }
        .pf-num-wrap:focus-within {
          border-color: #14B8A6;
          box-shadow: 0 0 0 3px rgba(20,184,166,.12);
          background: white;
        }
        .pf-num-prefix { font-size: .78rem; font-weight: 700; color: #94A3B8; flex-shrink: 0; }
        .pf-num {
          flex: 1; border: none; outline: none; background: transparent;
          font-family: 'DM Mono', monospace; font-size: .92rem; font-weight: 700;
          color: #0F172A; min-width: 0; width: 100%;
        }
        .pf-num::-webkit-outer-spin-button,
        .pf-num::-webkit-inner-spin-button { -webkit-appearance: none; }
        .pf-num[type=number] { -moz-appearance: textfield; }

        /* ── Slider ── */
        .pf-slider {
          -webkit-appearance: none; appearance: none; width: 100%;
          height: 6px; border-radius: 5px; outline: none; cursor: pointer;
          background: linear-gradient(to right, #0F766E var(--pct,65%), #E2E8F0 var(--pct,65%));
          display: block; margin: 0.5rem 0; /* Ajout d'une marge pour aérer */
        }
        .pf-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg,#0F766E,#14B8A6);
          border: 3px solid white; box-shadow: 0 2px 8px rgba(15,118,110,.35);
          cursor: pointer; transition: transform .15s;
        }
        .pf-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .pf-slider::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg,#0F766E,#14B8A6);
          border: 3px solid white; box-shadow: 0 2px 8px rgba(15,118,110,.35);
          cursor: pointer;
        }
        
        /* 👇 Correction pour empêcher l'écrasement des textes sous les sliders */
        .pf-marks {
          display: flex; justify-content: space-between; margin-top: .25rem;
          flex-wrap: wrap; /* Autoriser le retour à la ligne sur de très petits écrans */
          gap: 0.2rem;
        }
        .pf-mark {
          font-size: .59rem; font-weight: 700; color: #94A3B8; cursor: pointer;
          transition: color .15s; background: none; border: none; padding: 0;
          font-family: 'DM Sans', sans-serif; white-space: nowrap; /* Empêcher la coupure des mots */
        }
        .pf-mark:hover { color: #0F766E; }
        .pf-mark.active { color: #0F766E; font-weight: 900; }

        /* ── Preset pills ── */
        /* 👇 Correction pour les boutons de scénarios */
        .pf-presets { 
          display: flex; 
          gap: .5rem; 
          flex-wrap: wrap; /* Essentiel pour mobile ! */
          width: 100%;
        }
        .pf-preset {
          flex: 1 1 auto; /* Permet aux boutons de s'adapter ou rétrécir */
          min-width: 0; /* Permet un meilleur écrasement si nécessaire */
          height: 32px; border-radius: 8px;
          border: 1.5px solid #E2E8F0; background: white;
          font-family: 'DM Sans', sans-serif; font-size: .7rem; font-weight: 800;
          color: #64748B; cursor: pointer; transition: all .17s;
          padding: 0 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pf-preset:hover { background: #F0FDF9; border-color: #A7F3D0; color: #0F766E; }
        .pf-preset.active {
          background: linear-gradient(135deg,#0F766E,#14B8A6);
          color: white; border-color: transparent;
          box-shadow: 0 3px 10px rgba(15,118,110,.28);
        }

        /* ── Divider ── */
        .pf-divider {
          height: 1px; background: linear-gradient(90deg, transparent, #E2E8F0 30%, #E2E8F0 70%, transparent);
          margin: .2rem 0;
        }

        /* ── Results card ── */
        .pf-results {
          background: linear-gradient(155deg, #134E4A 0%, #0F766E 55%, #0D9488 100%);
          border-radius: 20px;
          padding: 1.4rem;
          color: white;
          box-shadow: 0 16px 40px rgba(15,118,110,.28), 0 0 0 1px rgba(255,255,255,.06) inset;
          opacity: 0;
          transform: translateY(12px);
          animation: pfIn .5s .12s cubic-bezier(.22,1,.36,1) forwards;
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          width: 100%;
          box-sizing: border-box;
        }

        /* Top row inside results */
        .pf-res-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: .75rem;
          flex-wrap: wrap;
        }
        .pf-res-label {
          font-size: .62rem; font-weight: 800; opacity: .7;
          text-transform: uppercase; letter-spacing: .09em; display: block; margin-bottom: .25rem;
        }
        .pf-res-big {
          font-family: 'DM Mono', monospace;
          font-size: clamp(1.5rem, 5vw, 2.5rem);
          font-weight: 700; line-height: 1.1; display: block;
          word-break: break-word; /* Protège contre les chiffres trop longs */
        }
        .pf-res-pill {
          display: inline-flex; align-items: center; gap: .3rem;
          font-size: .72rem; font-weight: 700;
          background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.15);
          padding: .22rem .7rem; border-radius: 99px; margin-top: .4rem;
          flex-wrap: wrap;
        }

        /* Progress */
        .pf-progress-head {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: .45rem; flex-wrap: wrap; gap: 0.2rem;
        }
        .pf-progress-lbl { font-size: .65rem; font-weight: 800; opacity: .75; }
        .pf-progress-pct {
          font-family: 'DM Mono', monospace; font-size: .72rem; font-weight: 700;
          background: rgba(255,255,255,.14); padding: .12rem .5rem; border-radius: 99px;
        }
        .pf-bar-track {
          height: 8px; border-radius: 99px;
          background: rgba(255,255,255,.18); overflow: hidden;
        }
        .pf-bar-fill {
          height: 100%; border-radius: 99px;
          transition: width .65s cubic-bezier(.22,1,.36,1), background .3s;
        }

        /* Stat grid */
        .pf-stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
        .pf-stat {
          background: rgba(255,255,255,.1);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 13px; padding: .85rem .95rem;
          display: flex; flex-direction: column; justify-content: center;
          min-width: 0; /* Crucial pour le grid sur mobile */
        }
        .pf-stat.ok  { background: rgba(16,185,129,.2); border-color: rgba(16,185,129,.3); }
        .pf-stat.bad { background: rgba(248,113,113,.15); border-color: rgba(248,113,113,.25); }
        .pf-stat-lbl { font-size: .6rem; font-weight: 800; opacity: .75; text-transform: uppercase; letter-spacing: .07em; display: block; margin-bottom: .28rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .pf-stat-val { font-family: 'DM Mono',monospace; font-size: 1.1rem; font-weight: 700; display: block; word-break: break-word; }
        .pf-stat-val.ok  { color: #6EE7B7; }
        .pf-stat-val.bad { color: #FCA5A5; }
        
        /* Verdict */
        .pf-verdict {
          display: flex; align-items: flex-start; gap: .6rem;
          padding: .7rem .9rem; border-radius: 11px; font-size: .75rem; font-weight: 700; line-height: 1.45;
        }
        .pf-verdict.ok  { background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.25); }
        .pf-verdict.bad { background: rgba(248,113,113,.12); border: 1px solid rgba(248,113,113,.22); }
        
        .pf-gauge-wrapper { display: flex; flex-direction: column; align-items: center; }

        /* 👇 Media query spécifique pour les très petits écrans (mobile) */
        @media (max-width: 480px) {
          .pf-card-body { padding: 1rem; gap: 1rem; }
          .pf-results { padding: 1rem; gap: 0.9rem; }
          .pf-res-big { font-size: 1.6rem; }
          .pf-stat { padding: 0.6rem; }
          .pf-stat-val { font-size: 0.95rem; }
          
          /* Réduire légèrement la jauge si elle manque de place */
          .pf-gauge-wrapper { transform: scale(0.85); transform-origin: top right; }
          
          /* Les inputs numériques prennent moins de hauteur */
          .pf-num-wrap { height: 40px; }
          
          /* Les pilules du bas dans les résultats s'adaptent mieux */
          .pf-mini-recap-item { flex: 1 1 45% !important; padding: 0.4rem !important; }
        }
      `}</style>

      <div className="pf-root">

        {/* ════════ LEFT — Inputs ════════ */}
        <div>
          {/* Card 1 : Hypothèses */}
          <div className="pf-card">
            <div className="pf-card-head">
              <div className="pf-card-ico">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="pf-card-title">Hypothèses de collecte</span>
            </div>

            <div className="pf-card-body">
              {/* Presets */}
              <div className="pf-field">
                <label className="pf-label">Scénario rapide</label>
                <div className="pf-presets">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label} type="button"
                      className={`pf-preset ${participationRate === p.rate && averageContribution === p.contrib ? 'active' : ''}`}
                      onClick={() => { setParticipationRate(p.rate); setAverageContribution(p.contrib); }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nb membres */}
              <div className="pf-field">
                <label className="pf-label">
                  Membres dans l&apos;antenne
                  <span className="pf-badge">{totalMembers}</span>
                </label>
                <div className="pf-num-wrap">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <input type="number" min="1" max="9999" className="pf-num"
                    value={totalMembers} onChange={(e) => setTotalMembers(Number(e.target.value) || 0)} />
                  <span className="pf-num-prefix">membres</span>
                </div>
                <Slider value={totalMembers} min={10} max={500} step={5} onChange={setTotalMembers} />
              </div>

              {/* Taux participation */}
              <div className="pf-field">
                <label className="pf-label">
                  Taux de participation
                  <span className="pf-badge">{participationRate}%</span>
                </label>
                <Slider value={participationRate} min={0} max={100} onChange={setParticipationRate} />
                <div className="pf-marks">
                  {[{ val: 30, label: 'Pessimiste 30%' }, { val: 65, label: 'Réaliste 65%' }, { val: 90, label: 'Optimiste 90%' }].map((m) => (
                    <button key={m.val} type="button"
                      className={`pf-mark ${participationRate === m.val ? 'active' : ''}`}
                      onClick={() => setParticipationRate(m.val)}
                    >{m.label}</button>
                  ))}
                </div>
              </div>

              {/* Cotisation moyenne */}
              <div className="pf-field">
                <label className="pf-label">
                  Cotisation mensuelle moyenne
                  <span className="pf-badge">{averageContribution} {currency === 'EUR' ? '€' : currency}</span>
                </label>
                <div className="pf-num-wrap">
                  <input type="number" min="1" max="500" step="5" className="pf-num"
                    value={averageContribution} onChange={(e) => setAverageContribution(Number(e.target.value) || 0)} />
                  <span className="pf-num-prefix">{currency === 'EUR' ? '€' : currency} / membre</span>
                </div>
                <Slider value={averageContribution} min={5} max={150} step={5} onChange={setAverageContribution} />
                <div className="pf-marks">
                  {[5, 25, 50, 100, 150].map((v) => (
                    <button key={v} type="button" className={`pf-mark ${averageContribution === v ? 'active' : ''}`}
                      onClick={() => setAverageContribution(v)}>{v}€</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 : Objectif projets */}
          <div className="pf-card" style={{ marginTop: '1rem', animationDelay: '.08s' }}>
            <div className="pf-card-head">
              <div className="pf-card-ico">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="pf-card-title">Objectif projets</span>
            </div>

            <div className="pf-card-body">
              <div className="pf-field">
                <label className="pf-label">
                  Budget nécessaire
                  <span className="pf-badge">{formatCurrency(targetBudget, currency)}</span>
                </label>
                <div className="pf-num-wrap">
                  <input type="number" min="0" step="100" className="pf-num"
                    value={targetBudget} onChange={(e) => setTargetBudget(Number(e.target.value) || 0)} />
                  <span className="pf-num-prefix">{currency === 'EUR' ? '€' : currency}</span>
                </div>
                <Slider value={targetBudget} min={0} max={50000} step={500} onChange={setTargetBudget} />
                <div className="pf-marks">
                  {[0, 1000, 5000, 10000, 50000].map((v) => (
                    <button key={v} type="button" className={`pf-mark ${targetBudget === v ? 'active' : ''}`}
                      onClick={() => setTargetBudget(v)}>{v >= 1000 ? `${v / 1000}k` : v === 0 ? 'Libre' : v}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════════ RIGHT — Results ════════ */}
        <div className="pf-results">
          {/* Title row */}
          <div className="pf-res-top" style={{ paddingBottom: '.9rem', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
            <div>
              <span style={{ fontSize: '.6rem', fontWeight: 900, opacity: .65, textTransform: 'uppercase', letterSpacing: '.1em', display: 'block', marginBottom: '.2rem' }}>
                Résultats projetés
              </span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.25rem', fontWeight: 700, lineHeight: 1 }}>
                Simulation financière
              </span>
            </div>
            <CoverageGauge pct={Math.round(coverage)} />
          </div>

          {/* Big number */}
          <div>
            <span className="pf-res-label">Recettes totales estimées</span>
            <span className="pf-res-big">{formatCurrency(total, currency)}</span>
            <span className="pf-res-pill">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {paying} membres payeurs
            </span>
          </div>

          {/* Progress bar */}
          {targetBudget > 0 && (
            <div>
              <div className="pf-progress-head">
                <span className="pf-progress-lbl">Couverture budget projets</span>
                <span className="pf-progress-pct">{Math.round(coverage)}%</span>
              </div>
              <div className="pf-bar-track">
                <div className="pf-bar-fill" style={{ width: barWidth, background: barColor }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.3rem', fontSize: '.6rem', opacity: .6, fontWeight: 600 }}>
                <span>0 €</span>
                <span>{formatCurrency(targetBudget, currency)}</span>
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="pf-stat-grid">
            <div className="pf-stat">
              <span className="pf-stat-lbl">Objectif projets</span>
              <span className="pf-stat-val">
                {targetBudget > 0 ? formatCurrency(targetBudget, currency) : '—'}
              </span>
            </div>
            <div className={`pf-stat ${isOk ? 'ok' : 'bad'}`}>
              <span className="pf-stat-lbl">{isOk ? 'Excédent' : 'Déficit'}</span>
              <span className={`pf-stat-val ${isOk ? 'ok' : 'bad'}`}>
                {balance > 0 ? '+' : ''}{formatCurrency(balance, currency)}
              </span>
            </div>
            <div className="pf-stat">
              <span className="pf-stat-lbl">Membres payeurs</span>
              <span className="pf-stat-val" style={{ fontFamily: "'DM Mono',monospace" }}>{paying}</span>
            </div>
            <div className="pf-stat">
              <span className="pf-stat-lbl">Recette / mois</span>
              <span className="pf-stat-val">{formatCurrency(paying * averageContribution, currency)}</span>
            </div>
          </div>

          {/* Verdict */}
          {targetBudget > 0 && (
            <div className={`pf-verdict ${isOk ? 'ok' : 'bad'}`}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{isOk ? '✅' : '⚠️'}</span>
              <span>
                {isOk
                  ? `Objectif atteignable — couverture à ${Math.round(coverage)}%. Excédent de ${formatCurrency(balance, currency)}.`
                  : `Il manque ${formatCurrency(Math.abs(balance), currency)} pour atteindre l'objectif. Augmentez le taux ou la cotisation.`}
              </span>
            </div>
          )}

          {/* Mini recap */}
          <div style={{ paddingTop: '.75rem', borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Taux', value: `${participationRate}%` },
              { label: 'Cotis.', value: `${averageContribution}€` },
              { label: 'Base', value: `${totalMembers} mbr` },
            ].map((s) => (
              <div key={s.label} className="pf-mini-recap-item" style={{ flex: '1 1 60px', background: 'rgba(255,255,255,.08)', borderRadius: 9, padding: '.5rem .65rem', border: '1px solid rgba(255,255,255,.08)' }}>
                <span style={{ fontSize: '.58rem', fontWeight: 800, opacity: .65, textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: '.18rem' }}>{s.label}</span>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.88rem', fontWeight: 700 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}