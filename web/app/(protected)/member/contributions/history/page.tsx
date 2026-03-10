// web/app/(protected)/member/contributions/history/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import type { Contribution } from '../../../../../types/contribution';
import { ContributionHistoryTable } from '../../../../../components/member/ContributionHistoryTable';
import Link from 'next/link';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'PENDING_VALIDATION', label: 'En attente' },
  { value: 'VALIDATED', label: 'Validées' },
  { value: 'REJECTED', label: 'Rejetées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

export default function MemberContributionsHistoryPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listMyContributions({
        page: 1, pageSize: 200,
        // @ts-expect-error - status may not be in type
        status: status || undefined,
      });
      setItems(res?.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement historique');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  // 👇 CORRECTION CHIRURGICALE ICI 👇
  // On force TypeScript à lire le statut comme une simple chaîne de caractères (string)
  // Cela fait disparaître l'erreur ts(2367) de chevauchement de types instantanément.
  const validated = items.filter(i => (i.status as string) === 'VALIDATED').length;
  const pending = items.filter(i => 
    (i.status as string) === 'PENDING_VALIDATION' || 
    (i.status as string) === 'PENDING' || 
    (i.status as string) === 'SUBMITTED'
  ).length;
  const rejected = items.filter(i => (i.status as string) === 'REJECTED').length;

  return (
    <AppShell title="Mes cotisations">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .ch-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1100px; margin: 0 auto;
        }

        .ch-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          flex-wrap: wrap; gap: 1rem;
          margin-bottom: 1.75rem; padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(37,99,235,0.10);
          opacity: 0; transform: translateY(10px);
          animation: chin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .ch-eyebrow {
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .ch-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: chpulse 2s ease-in-out infinite; }
        @keyframes chpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .ch-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.45rem, 3vw, 1.9rem); font-weight: 500; color: #111827;
          letter-spacing: -0.02em; line-height: 1.15;
        }
        .ch-title span {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .ch-new-btn {
          display: inline-flex; align-items: center; gap: 0.45rem;
          height: 42px; padding: 0 1.1rem;
          background: linear-gradient(135deg, #1D4ED8, #2563EB);
          color: white; border-radius: 11px; text-decoration: none;
          font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em;
          box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          transition: transform 0.15s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .ch-new-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(37,99,235,0.38); }

        /* Summary chips */
        .ch-summary {
          display: flex; gap: 0.65rem; flex-wrap: wrap;
          margin-bottom: 1.25rem;
          opacity: 0; animation: chin 0.5s 0.12s cubic-bezier(.22,1,.36,1) forwards;
        }
        .ch-chip {
          display: flex; align-items: center; gap: 0.45rem;
          padding: 0.45rem 0.85rem; border-radius: 10px;
          font-size: 0.74rem; font-weight: 600; border: 1px solid;
        }
        .ch-chip-dot { width: 6px; height: 6px; border-radius: 50%; }
        .ch-chip-count { font-family: 'Cormorant Garamond', serif; font-size: 1rem; font-weight: 600; }

        /* Filter toolbar */
        .ch-toolbar {
          display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;
          margin-bottom: 1rem;
          opacity: 0; animation: chin 0.5s 0.18s cubic-bezier(.22,1,.36,1) forwards;
        }
        .ch-filter-label {
          font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; color: #6B7280;
          white-space: nowrap;
        }
        .ch-filter-pills { display: flex; gap: 0.45rem; flex-wrap: wrap; }
        .ch-filter-pill {
          height: 34px; padding: 0 0.85rem;
          border-radius: 99px; border: 1.5px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.8); cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.74rem; font-weight: 600; color: #374151;
          transition: all 0.2s; white-space: nowrap;
        }
        .ch-filter-pill:hover { border-color: rgba(37,99,235,0.4); background: #EFF6FF; color: #1D4ED8; }
        .ch-filter-pill.active {
          background: #EFF6FF; border-color: #2563EB; color: #1D4ED8;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .ch-reload-btn {
          height: 34px; padding: 0 0.9rem;
          background: none; border: 1.5px solid rgba(37,99,235,0.18);
          border-radius: 99px; cursor: pointer; color: #2563EB;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.74rem; font-weight: 600;
          display: flex; align-items: center; gap: 0.35rem;
          transition: all 0.2s; white-space: nowrap;
        }
        .ch-reload-btn:hover { background: #EFF6FF; border-color: #2563EB; }

        /* Panel */
        .ch-panel {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden;
          opacity: 0; animation: chin 0.5s 0.22s cubic-bezier(.22,1,.36,1) forwards;
        }
        .ch-panel-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,0.07);
          flex-wrap: wrap; gap: 0.5rem;
        }
        .ch-panel-title {
          font-size: 0.73rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; color: #374151;
          display: flex; align-items: center; gap: 0.45rem;
        }
        .ch-panel-ico {
          width: 26px; height: 26px; background: #EFF6FF;
          border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #2563EB;
        }
        .ch-count-chip {
          font-size: 0.66rem; font-weight: 700;
          padding: 0.18rem 0.55rem; border-radius: 99px;
          background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;
        }

        /* Loader */
        .ch-loader {
          display: flex; align-items: center; justify-content: center;
          padding: 2.5rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem;
        }
        .ch-ring {
          width: 24px; height: 24px;
          border: 2.5px solid rgba(37,99,235,0.1);
          border-top-color: #2563EB; border-radius: 50%;
          animation: chspin 0.8s linear infinite; flex-shrink: 0;
        }
        @keyframes chspin { to { transform: rotate(360deg); } }

        .ch-error {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 1rem 1.3rem; color: #B91C1C;
          font-size: 0.8rem;
        }

        @keyframes chin { to{opacity:1;transform:translateY(0);} }
      `}</style>

      <div className="ch-wrap">

        {/* Header */}
        <div className="ch-header">
          <div>
            <div className="ch-eyebrow"><div className="ch-eyebrow-dot" />Espace membre</div>
            <h1 className="ch-title">Mes <span>cotisations</span></h1>
          </div>
          <Link href="/member/contributions/new" className="ch-new-btn">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Nouveau dépôt
          </Link>
        </div>

        {/* Summary chips */}
        <div className="ch-summary">
          {[
            { label: 'Total', count: items.length, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Validées', count: validated, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
            { label: 'En attente', count: pending, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
            { label: 'Rejetées', count: rejected, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
          ].map(c => (
            <div key={c.label} className="ch-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }}>
              <span className="ch-chip-dot" style={{ background: c.color }} />
              <span className="ch-chip-count">{c.count}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="ch-toolbar">
          <span className="ch-filter-label">Filtrer :</span>
          <div className="ch-filter-pills">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`ch-filter-pill${status === opt.value ? ' active' : ''}`}
                onClick={() => setStatus(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button className="ch-reload-btn" onClick={() => void load()}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualiser
          </button>
        </div>

        {/* Table panel */}
        <div className="ch-panel">
          <div className="ch-panel-head">
            <div className="ch-panel-title">
              <div className="ch-panel-ico">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4m6 8l4-4-4-4"/>
                </svg>
              </div>
              Historique des dépôts
            </div>
            {items.length > 0 && <span className="ch-count-chip">{items.length} entrée{items.length > 1 ? 's' : ''}</span>}
          </div>

          {loading ? (
            <div className="ch-loader">
              <div className="ch-ring" />
              Chargement…
            </div>
          ) : error ? (
            <div className="ch-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
              </svg>
              {error}
            </div>
          ) : (
            <ContributionHistoryTable items={items} />
          )}
        </div>

      </div>
    </AppShell>
  );
}