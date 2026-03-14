//web/app/(protected)/admin/projections/page.tsx
'use client';

import { AppShell } from '../../../../components/layout/AppShell';
import { ProjectionForm } from '../../../../components/admin/ProjectionForm';

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminProjectionsPage() {
  return (
    <AppShell title="Projections (antenne)">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .pj-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1100px;margin:0 auto}

        /* ── Header ── */
        .pj-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:pjin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .pj-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .pj-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:pjpulse 2s ease-in-out infinite}
        @keyframes pjpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .pj-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .pj-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pj-subtitle{font-size:.85rem;font-weight:600;color:#6B7280;margin-top:.3rem;line-height:1.5}

        /* ── Info banner ── */
        .pj-banner{display:flex;align-items:flex-start;gap:.75rem;padding:.95rem 1.2rem;background:linear-gradient(135deg,rgba(37,99,235,.06),rgba(59,130,246,.03));border:1px solid rgba(37,99,235,.18);border-radius:14px;margin-bottom:1.5rem;opacity:0;transform:translateY(8px);animation:pjin .5s .1s cubic-bezier(.22,1,.36,1) forwards}
        .pj-banner-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#1D4ED8,#2563EB);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 8px rgba(37,99,235,.3)}
        .pj-banner-body strong{font-size:.85rem;font-weight:900;color:#111827;display:block;margin-bottom:.22rem}
        .pj-banner-body p{margin:0;font-size:.78rem;font-weight:600;color:#6B7280;line-height:1.55}

        /* ── Panel ── */
        .pj-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 18px rgba(37,99,235,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:pjin .5s .15s cubic-bezier(.22,1,.36,1) forwards}
        .pj-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(37,99,235,.07);display:flex;align-items:center;gap:.55rem}
        .pj-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#1D4ED8,#2563EB);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(37,99,235,.3)}
        .pj-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .pj-panel-body{padding:clamp(1.25rem,3vw,2rem)}

        /* ── Preserve ProjectionForm inner styles ── */
        .pj-panel-body .sim-container{display:grid;grid-template-columns:1fr 1fr;gap:2.5rem;align-items:stretch}
        @media(max-width:850px){.pj-panel-body .sim-container{grid-template-columns:1fr;gap:2rem}}
        .pj-panel-body .sim-section-title{font-size:.78rem;font-weight:900;text-transform:uppercase;letter-spacing:.09em;color:#374151;margin-bottom:1.4rem}
        .pj-panel-body .sim-controls{display:flex;flex-direction:column;gap:1.5rem}
        .pj-panel-body .sim-control-group{display:flex;flex-direction:column;gap:.5rem}
        .pj-panel-body .sim-label-row{display:flex;justify-content:space-between;align-items:center;font-size:.83rem;font-weight:700;color:#374151}
        .pj-panel-body .sim-value-badge{background:#EFF6FF;padding:.2rem .6rem;border-radius:7px;color:#1D4ED8;font-weight:900;font-size:.82rem;border:1px solid #BFDBFE;font-family:'DM Mono',monospace}
        .pj-panel-body .sim-slider{-webkit-appearance:none;width:100%;height:6px;border-radius:5px;background:linear-gradient(to right,#2563EB var(--val,50%),#E5E7EB var(--val,50%));outline:none;margin:.5rem 0;cursor:pointer}
        .pj-panel-body .sim-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#1D4ED8,#2563EB);cursor:pointer;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,.35);transition:transform .15s}
        .pj-panel-body .sim-slider::-webkit-slider-thumb:hover{transform:scale(1.2)}
        .pj-panel-body .sim-slider::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#1D4ED8,#2563EB);cursor:pointer;border:3px solid white;box-shadow:0 2px 8px rgba(37,99,235,.35)}
        .pj-panel-body .sim-slider-marks{display:flex;justify-content:space-between;font-size:.63rem;color:#9CA3AF;font-weight:600;letter-spacing:.02em}
        .pj-panel-body .sim-results{background:linear-gradient(150deg,#1E3A8A 0%,#1D4ED8 55%,#2563EB 100%);border-radius:18px;padding:1.75rem;color:white;display:flex;flex-direction:column;box-shadow:0 12px 30px rgba(37,99,235,.25)}
        .pj-panel-body .sim-card-main{margin-bottom:1.5rem}
        .pj-panel-body .sim-card-label{display:block;font-size:.75rem;opacity:.75;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.25rem}
        .pj-panel-body .sim-card-value{display:block;font-family:'DM Mono',monospace;font-size:clamp(2.2rem,4vw,3.2rem);font-weight:700;line-height:1.15;margin-bottom:.4rem}
        .pj-panel-body .sim-card-sub{display:inline-flex;align-items:center;font-size:.78rem;opacity:.9;font-weight:700;background:rgba(255,255,255,.14);padding:.28rem .8rem;border-radius:99px;border:1px solid rgba(255,255,255,.12)}
        .pj-panel-body .sim-progress-zone{margin-bottom:1.5rem}
        .pj-panel-body .sim-progress-track{width:100%;height:9px;background:rgba(255,255,255,.18);border-radius:99px;overflow:hidden}
        .pj-panel-body .sim-progress-fill{height:100%;border-radius:99px;transition:width .6s cubic-bezier(.22,1,.36,1),background-color .3s}
        .pj-panel-body .sim-grid-results{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-top:auto}
        .pj-panel-body .sim-stat-box{background:rgba(255,255,255,.1);border-radius:13px;padding:.95rem 1rem;border:1px solid rgba(255,255,255,.1)}
        .pj-panel-body .sim-stat-box.positive{background:rgba(16,185,129,.18);border-color:rgba(16,185,129,.28)}
        .pj-panel-body .sim-stat-box.negative{background:rgba(239,68,68,.18);border-color:rgba(239,68,68,.28)}
        .pj-panel-body .sim-stat-label{display:block;font-size:.68rem;opacity:.8;font-weight:800;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.3rem}
        .pj-panel-body .sim-stat-val{display:block;font-family:'DM Mono',monospace;font-size:1.35rem;font-weight:700}

        /* ── Horizon selector (if ProjectionForm uses it) ── */
        .pj-panel-body select.sim-horizon-select,
        .pj-panel-body .sim-horizon-select{height:36px;border-radius:9px;border:1px solid rgba(37,99,235,.18);background:rgba(255,255,255,.88);padding:0 1.8rem 0 .75rem;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:700;color:#111827;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .5rem center;transition:border-color .2s}
        .pj-panel-body select.sim-horizon-select:focus,
        .pj-panel-body .sim-horizon-select:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08);outline:none}

        /* ── Horizon pill buttons (alternate pattern) ── */
        .pj-panel-body .sim-horizon-pills{display:flex;gap:.45rem;flex-wrap:wrap;margin-bottom:1.5rem}
        .pj-panel-body .sim-horizon-pill{height:32px;padding:0 .9rem;border-radius:99px;border:1.5px solid rgba(37,99,235,.18);background:rgba(239,246,255,.6);font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:800;color:#1D4ED8;cursor:pointer;transition:all .18s}
        .pj-panel-body .sim-horizon-pill:hover,.pj-panel-body .sim-horizon-pill.active{background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;border-color:transparent;box-shadow:0 3px 10px rgba(37,99,235,.3)}

        /* ── ProjectCard override ── */
        .pj-panel-body .proj-card{background:rgba(248,250,255,.8);border:1px solid rgba(37,99,235,.1);border-radius:16px;padding:1.1rem 1.25rem;margin-bottom:.85rem;transition:box-shadow .2s}
        .pj-panel-body .proj-card:hover{box-shadow:0 4px 18px rgba(37,99,235,.1)}
        .pj-panel-body .proj-card-title{font-weight:900;font-size:.9rem;color:#0F172A;margin-bottom:.3rem}
        .pj-panel-body .proj-card-bar-track{height:7px;border-radius:99px;background:#E5E7EB;overflow:hidden;margin:.5rem 0}
        .pj-panel-body .proj-card-bar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#2563EB,#60A5FA);transition:width .6s cubic-bezier(.22,1,.36,1)}

        @keyframes pjin{to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="pj-wrap">

        {/* ── Header ── */}
        <div className="pj-header">
          <div className="pj-eyebrow"><div className="pj-dot" />Admin antenne</div>
          <h1 className="pj-title">Simulation <span>strat&eacute;gique</span></h1>
          <p className="pj-subtitle">Testez vos sc&eacute;narios de collecte avant de vous engager sur des projets.</p>
        </div>

        {/* ── Info banner ── */}
        <div className="pj-banner">
          <div className="pj-banner-ico">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="pj-banner-body">
            <strong>Aide &agrave; la d&eacute;cision</strong>
            <p>
              Cet outil interactif vous permet de tester diff&eacute;rents sc&eacute;narios de collecte pour v&eacute;rifier si vos objectifs de financement de projets sont atteignables. Les donn&eacute;es affich&eacute;es sont des estimations.
            </p>
          </div>
        </div>

        {/* ── Main panel ── */}
        <div className="pj-panel">
          <div className="pj-panel-head">
            <div className="pj-panel-ico">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="pj-panel-title">Simulateur de projections financières</span>
          </div>

          <div className="pj-panel-body">
            <ProjectionForm />
          </div>
        </div>

      </div>
    </AppShell>
  );
}