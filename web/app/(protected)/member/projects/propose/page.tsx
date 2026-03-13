// web/app/(protected)/member/projects/propose/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import type { ProjectProposal } from '../../../../../types/project-proposal';
import { ProjectProposalForm } from '../../../../../components/member/ProjectProposalForm';
import { ProjectProposalHistoryTable } from '../../../../../components/member/ProjectProposalHistoryTable';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'SUBMITTED', label: 'Soumise' },
  { value: 'UNDER_REVIEW', label: 'En revue' },
  { value: 'APPROVED', label: 'Approuvée' },
  { value: 'REJECTED', label: 'Rejetée' },
  { value: 'CONVERTED_TO_PROJECT', label: 'Convertie en projet' },
];

export default function MemberProjectProposalsPage() {
  const [items, setItems] = useState<ProjectProposal[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Utilisation de listMyProjectProposals pour l'espace membre
      const res = await api.listMyProjectProposals({
        page: 1, pageSize: 100,
        status: status || undefined,
      });
      setItems((res?.items as unknown as ProjectProposal[]) || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement propositions');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitted   = items.filter(i => i.status === 'SUBMITTED').length;
  const underReview = items.filter(i => i.status === 'UNDER_REVIEW').length;
  const approved    = items.filter(i => i.status === 'APPROVED').length;

  return (
    <AppShell title="Proposer un projet">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .pp-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1rem, 3vw, 2rem);
          max-width: 1100px; margin: 0 auto;
        }

        /* Header */
        .pp-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: ppin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pp-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .pp-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: pppulse 2s ease-in-out infinite; }
        @keyframes pppulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .pp-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 4vw, 1.9rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .pp-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Layout 2 cols */
        .pp-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 1.25rem;
          align-items: start;
        }
        /* Amélioration Responsive Mobile */
        @media (max-width: 950px) { 
          .pp-layout { grid-template-columns: 1fr; gap: 1.5rem; } 
          .pp-panel-left { order: 1; }
          .pp-panel-right { order: 2; }
        }

        /* Panel */
        .pp-panel {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
        }
        .pp-panel-left {
          opacity: 0; transform: translateY(10px);
          animation: ppin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pp-panel-right {
          opacity: 0; transform: translateY(10px);
          animation: ppin 0.5s 0.17s cubic-bezier(.22,1,.36,1) forwards;
        }

        .pp-panel-head {
          padding: 1rem 1.3rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
          display: flex; align-items: center; gap: 0.55rem;
        }
        .pp-panel-ico {
          width: 28px; height: 28px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .pp-panel-title { font-size: 0.73rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }
        
        .pp-panel-body { padding: 1.3rem; }
        @media (max-width: 640px) {
           .pp-panel-body { padding: 1rem; }
        }

        /* Summary chips */
        .pp-chips {
          display: flex; gap: 0.6rem; flex-wrap: wrap;
          padding: 0.85rem 1.3rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
        }
        .pp-chip { display: flex; align-items: center; gap: 0.38rem; padding: 0.35rem 0.75rem; border-radius: 9px; font-size: 0.72rem; font-weight: 600; border: 1px solid; }
        .pp-chip-dot { width: 5px; height: 5px; border-radius: 50%; }
        .pp-chip-count { font-family: 'Cormorant Garamond', serif; font-size: 0.95rem; font-weight: 600; }

        /* Filter toolbar inside panel */
        .pp-filter-row {
          padding: 0.85rem 1.3rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
          display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;
        }
        .pp-filter-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280; white-space: nowrap; }
        .pp-filter-pills { display: flex; gap: 0.38rem; flex-wrap: wrap; }
        .pp-pill {
          height: 30px; padding: 0 0.7rem; border-radius: 99px;
          border: 1.5px solid rgba(37,99,235,0.13);
          background: rgba(255,255,255,0.8); cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem; font-weight: 600; color: #374151;
          transition: all 0.2s; white-space: nowrap;
        }
        .pp-pill:hover { border-color: rgba(37,99,235,0.38); background: #EFF6FF; color: #1D4ED8; }
        .pp-pill.active { background: #EFF6FF; border-color: #2563EB; color: #1D4ED8; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

        .pp-reload-btn {
          height: 30px; padding: 0 0.8rem;
          background: none; border: 1.5px solid rgba(37,99,235,0.18);
          border-radius: 99px; cursor: pointer; color: #2563EB;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem; font-weight: 600;
          display: flex; align-items: center; gap: 0.3rem;
          transition: all 0.2s; white-space: nowrap;
          margin-left: auto; /* Pousse le bouton à droite sur Desktop */
        }
        .pp-reload-btn:hover { background: #EFF6FF; border-color: #2563EB; }
        
        @media (max-width: 640px) {
           .pp-reload-btn { margin-left: 0; width: 100%; justify-content: center; margin-top: 0.5rem; }
        }

        /* Loader / error inside table zone */
        .pp-loader { display: flex; align-items: center; justify-content: center; padding: 2rem; gap: 0.65rem; color: #6B7280; font-size: 0.8rem; }
        .pp-ring { width: 20px; height: 20px; border: 2px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: ppspin 0.8s linear infinite; }
        @keyframes ppspin { to { transform: rotate(360deg); } }
        .pp-error { display: flex; align-items: center; gap: 0.5rem; padding: 1rem 1.3rem; color: #B91C1C; font-size: 0.78rem; }

        /* Info tip below form panel */
        .pp-tip {
          margin-top: 0.85rem;
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(10px);
          border-radius: 14px;
          border: 1px solid rgba(37,99,235,0.09);
          padding: 0.9rem 1.1rem;
          display: flex; gap: 0.6rem; align-items: flex-start;
        }
        .pp-tip p { font-size: 0.76rem; color: #374151; line-height: 1.6; }
        .pp-tip strong { color: #111827; }

        @keyframes ppin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pp-wrap">

        {/* Header */}
        <div className="pp-header">
          <div className="pp-eyebrow"><div className="pp-eyebrow-dot" />Espace membre</div>
          <h1 className="pp-title">Proposer un <span>projet</span></h1>
        </div>

        <div className="pp-layout">

          {/* LEFT — Formulaire */}
          <div className="pp-panel-left">
            <div className="pp-panel">
              <div className="pp-panel-head">
                <div className="pp-panel-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </div>
                <span className="pp-panel-title">Nouvelle proposition</span>
              </div>
              <div className="pp-panel-body">
                <ProjectProposalForm onCreated={load} />
              </div>
            </div>

            {/* Tip */}
            <div className="pp-tip">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {/* 👇 CORRECTION DE L'APOSTROPHE ICI 👇 */}
              <p>Votre proposition sera examinée par l&apos;administrateur de votre antenne. Vous serez notifié dès qu&apos;une décision sera prise. Une proposition <strong>approuvée</strong> peut être convertie en projet officiel.</p>
            </div>
          </div>

          {/* RIGHT — Historique */}
          <div className="pp-panel-right">
            <div className="pp-panel">
              <div className="pp-panel-head">
                <div className="pp-panel-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <span className="pp-panel-title">Mes propositions</span>
              </div>

              {/* Summary chips */}
              <div className="pp-chips">
                {[
                  { label: 'Total',    count: items.length, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
                  { label: 'Soumises', count: submitted,    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                  { label: 'En revue', count: underReview,  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
                  { label: 'Approuvées',count: approved,    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                ].map(c => (
                  <div key={c.label} className="pp-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }}>
                    <span className="pp-chip-dot" style={{ background: c.color }} />
                    <span className="pp-chip-count">{c.count}</span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Filter */}
              <div className="pp-filter-row">
                <span className="pp-filter-label">Filtrer :</span>
                <div className="pp-filter-pills">
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`pp-pill${status === opt.value ? ' active' : ''}`}
                      onClick={() => setStatus(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button className="pp-reload-btn" onClick={() => void load()}>
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Actualiser
                </button>
              </div>

              {/* Table */}
              {loading ? (
                <div className="pp-loader"><div className="pp-ring" />Chargement…</div>
              ) : error ? (
                <div className="pp-error">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                  </svg>
                  {error}
                </div>
              ) : (
                <ProjectProposalHistoryTable items={items} />
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}