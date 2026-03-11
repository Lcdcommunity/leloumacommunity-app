//web/app/(protected)/admin/projections/page.tsx
'use client';

import { AppShell } from '../../../../components/layout/AppShell';
import { ProjectionForm } from '../../../../components/admin/ProjectionForm';

export default function AdminProjectionsPage() {
  return (
    <AppShell title="Projections (antenne)">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .pj-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 900px; margin: 0 auto;
        }

        .pj-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: pjin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pj-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .pj-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: pjpulse 2s ease-in-out infinite; }
        @keyframes pjpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .pj-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }

        .pj-panel {
          background: rgba(253,253,255,0.93);
          backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          padding: 2rem;
          opacity: 0; transform: translateY(10px);
          animation: pjin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }

        .pj-notice {
          display: flex; gap: 0.75rem; align-items: flex-start;
          padding: 1rem 1.25rem; background: #EFF6FF; border: 1px solid #BFDBFE;
          border-radius: 12px; margin-bottom: 2rem; color: #1D4ED8; font-size: 0.82rem;
        }

        @keyframes pjin { to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="pj-wrap">
        <div className="pj-header">
          <div className="pj-eyebrow"><div className="pj-eyebrow-dot" />Admin antenne</div>
          <h1 className="pj-title">Simulation des recettes</h1>
        </div>

        <div className="pj-panel">
          <div className="pj-notice">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              <strong>Aide à la décision :</strong> Cette projection est une estimation basée sur vos hypothèses. 
              Elle ne remplace en aucun cas les montants réellement encaissés et validés dans la trésorerie.
            </p>
          </div>
          
          <ProjectionForm />
        </div>
      </div>
    </AppShell>
  );
}