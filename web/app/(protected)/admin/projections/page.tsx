//web/app/(protected)/admin/projections/page.tsx
//web/app/(protected)/admin/projections/page.tsx
'use client';

import { AppShell } from '../../../../components/layout/AppShell';
import { ProjectionForm } from '../../../../components/admin/ProjectionForm';

export default function AdminProjectionsPage() {
  return (
    <AppShell title="Projections (antenne)">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600;700&display=swap');

        .pj-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.1rem, 3vw, 2rem);
          max-width: 1100px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .pj-header {
          margin-bottom: 1.4rem;
          opacity: 0; transform: translateY(10px);
          animation: pjin .5s .04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pj-eyebrow {
          font-size: .64rem; font-weight: 900; letter-spacing: .14em;
          text-transform: uppercase; color: #0F766E;
          margin-bottom: .35rem; display: flex; align-items: center; gap: .4rem;
        }
        .pj-dot {
          width: 6px; height: 6px; background: #14B8A6;
          border-radius: 50%; animation: pjpulse 2s ease-in-out infinite;
        }
        @keyframes pjpulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .pj-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.45rem, 3vw, 1.9rem); font-weight: 700;
          color: #111827; letter-spacing: -.02em; line-height: 1.15;
        }
        .pj-title span {
          background: linear-gradient(135deg, #0F766E, #14B8A6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .pj-subtitle {
          font-size: .82rem; font-weight: 600; color: #64748B;
          margin-top: .3rem; line-height: 1.5;
        }

        /* ── Info banner ── */
        .pj-banner {
          display: flex; align-items: flex-start; gap: .8rem;
          padding: .9rem 1.1rem;
          background: linear-gradient(135deg, rgba(15,118,110,.06), rgba(20,184,166,.03));
          border: 1px solid rgba(15,118,110,.18);
          border-radius: 14px;
          margin-bottom: 1.4rem;
          opacity: 0; transform: translateY(8px);
          animation: pjin .5s .1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pj-banner-ico {
          width: 32px; height: 32px; border-radius: 9px;
          background: linear-gradient(135deg, #0F766E, #14B8A6);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 3px 8px rgba(15,118,110,.28); color: white;
        }
        .pj-banner-body strong {
          font-size: .82rem; font-weight: 900; color: #134E4A;
          display: block; margin-bottom: .18rem;
        }
        .pj-banner-body p {
          margin: 0; font-size: .76rem; font-weight: 600; color: #64748B; line-height: 1.5;
        }

        /* ── Panel wrapper ── */
        .pj-panel {
          background: rgba(248,250,252,.95);
          backdrop-filter: blur(12px);
          border-radius: 22px;
          border: 1px solid rgba(15,118,110,.09);
          box-shadow: 0 2px 18px rgba(15,118,110,.07), 0 0 0 1px rgba(255,255,255,.9) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: pjin .5s .16s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pj-panel-head {
          padding: .9rem 1.3rem;
          border-bottom: 1px solid rgba(15,118,110,.08);
          display: flex; align-items: center; gap: .55rem;
          background: linear-gradient(135deg, rgba(15,118,110,.04), transparent);
        }
        .pj-panel-ico {
          width: 27px; height: 27px; border-radius: 8px;
          background: linear-gradient(135deg, #0F766E, #14B8A6);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 2px 8px rgba(15,118,110,.28); color: white;
        }
        .pj-panel-title {
          font-size: .72rem; font-weight: 900; letter-spacing: .09em;
          text-transform: uppercase; color: #1F2937;
        }
        .pj-panel-body { padding: clamp(1rem, 2.5vw, 1.6rem); }

        @keyframes pjin { to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div className="pj-wrap">

        {/* Header */}
        <div className="pj-header">
          <div className="pj-eyebrow">
            <div className="pj-dot" />
            Admin antenne
          </div>
          <h1 className="pj-title">Simulation <span>stratégique</span></h1>
          <p className="pj-subtitle">Testez vos scénarios de collecte avant de vous engager sur des projets.</p>
        </div>

        {/* Banner */}
        <div className="pj-banner">
          <div className="pj-banner-ico">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="pj-banner-body">
            <strong>Aide à la décision</strong>
            <p>
              Ajustez les curseurs pour explorer différents scénarios de collecte.
              Les résultats se mettent à jour en temps réel. Les données sont des estimations.
            </p>
          </div>
        </div>

        {/* Main panel */}
        <div className="pj-panel">
          <div className="pj-panel-head">
            <div className="pj-panel-ico">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
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