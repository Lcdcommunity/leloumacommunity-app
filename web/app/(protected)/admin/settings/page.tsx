// web/app/(protected)/admin/settings/page.tsx
'use client';

import { AppShell } from '../../../../components/layout/AppShell';

const RULES = [
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
      </svg>
    ),
    title: 'Admins & Antennes',
    desc: 'La création d\'antennes et l\'ajout de nouveaux administrateurs sont strictement réservés au Super Admin.',
    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
  },
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    title: 'Validation des membres',
    desc: 'Vous ne pouvez valider que les membres rattachés spécifiquement à votre antenne.',
    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
  },
  {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    title: 'Cotisations',
    desc: 'Ne validez les cotisations qu\'après confirmation d\'une réception réelle sur les comptes.',
    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
  }
];

export default function AdminSettingsPage() {
  return (
    <AppShell title="Paramètres admin">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ast-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 800px; margin: 0 auto;
        }

        /* Header */
        .ast-header { margin-bottom: 1.75rem; opacity: 0; transform: translateY(10px); animation: astin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .ast-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .ast-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: astpulse 2s ease-in-out infinite; }
        @keyframes astpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .ast-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .ast-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Panel */
        .ast-panel {
          background: rgba(253,253,255,0.93); backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px); animation: astin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }

        .ast-panel-head { padding: 1.2rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.07); display: flex; align-items: center; gap: 0.6rem; }
        .ast-panel-ico { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ast-panel-title { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }

        /* Status steps */
        .ast-steps { display: flex; flex-direction: column; }
        .ast-step { display: flex; gap: 1rem; padding: 1.4rem 1.5rem; border-bottom: 1px solid rgba(37,99,235,0.05); transition: background 0.15s; }
        .ast-step:last-child { border-bottom: none; }
        .ast-step:hover { background: rgba(37,99,235,0.02); }
        .ast-step-ico { width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid; }
        .ast-step-title { font-size: 0.9rem; font-weight: 800; color: #111827; margin-bottom: 4px; }
        .ast-step-desc { font-size: 0.8rem; color: #6B7280; line-height: 1.55; }

        @keyframes astin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="ast-wrap">
        {/* Header */}
        <div className="ast-header">
          <div className="ast-eyebrow"><div className="ast-eyebrow-dot" />Admin antenne</div>
          <h1 className="ast-title">Paramètres &amp; <span>Règles</span></h1>
        </div>

        <div className="ast-panel">
          <div className="ast-panel-head">
            <div className="ast-panel-ico" style={{ background: '#FFFBEB', color: '#D97706' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <span className="ast-panel-title">Règles de gestion</span>
          </div>
          
          <div className="ast-steps">
            {RULES.map((s, i) => (
              <div key={i} className="ast-step">
                <div className="ast-step-ico" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                  {s.icon}
                </div>
                <div>
                  <div className="ast-step-title">{s.title}</div>
                  <div className="ast-step-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AppShell>
  );
}