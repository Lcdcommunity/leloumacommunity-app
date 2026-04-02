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
  const [q, setQ] = useState(''); // État pour la recherche
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listMyContributions({
        page: 1,
        pageSize: 200,
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

  useEffect(() => {
    void load();
  }, [load]);

  // Filtrage local pour la barre de recherche (motif, méthode, référence)
  const filteredItems = items.filter(c => {
    if (!q) return true;
    const query = q.toLowerCase();
    return (
      c.purpose?.toLowerCase().includes(query) ||
      c.paymentMethod?.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query)
    );
  });

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
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ch-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1rem, 3vw, 2rem);
          max-width: 1100px; margin: 0 auto;
          box-sizing: border-box;
          width: 100%;
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
          font-size: 0.65rem; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem;
          display: flex; align-items: center; gap: 0.4rem;
        }

        .ch-eyebrow-dot {
          width: 6px; height: 6px; background: #3B82F6; border-radius: 50%;
          animation: chpulse 2s ease-in-out infinite;
        }

        @keyframes chpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }

        .ch-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.45rem, 4vw, 2rem);
          font-weight: 700; color: #111827;
          letter-spacing: -0.02em; line-height: 1.15; margin: 0;
        }

        .ch-title span {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ch-new-btn {
          display: inline-flex; align-items: center; gap: 0.45rem;
          height: 42px; padding: 0 1.1rem;
          background: linear-gradient(135deg, #1D4ED8, #2563EB);
          color: white; border-radius: 11px; text-decoration: none;
          font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em;
          box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          white-space: nowrap; transition: transform 0.2s, box-shadow 0.2s;
        }
        .ch-new-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37,99,235,0.35); }

        /* ── NOUVELLES CARTES STATISTIQUES ── */
        .ch-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
          opacity: 0; transform: translateY(10px);
          animation: chin 0.5s 0.08s cubic-bezier(.22,1,.36,1) forwards;
        }
        .ch-stat-card {
          background: white; border-radius: 16px; border: 1px solid #E2E8F0;
          padding: 1.2rem 1rem; display: flex; flex-direction: column; 
          align-items: center; justify-content: center; text-align: center; 
          border-bottom: 4px solid; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .ch-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 700; line-height: 1; margin-bottom: 0.3rem; }
        .ch-stat-lbl { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; }

        /* ── TOOLBAR RECHERCHE & FILTRES (LIGNE UNIQUE) ── */
        .ch-toolbar {
          display: flex; flex-wrap: nowrap; gap: 0.6rem; align-items: center;
          width: 100%; box-sizing: border-box; margin-bottom: 1.5rem;
          opacity: 0; transform: translateY(10px);
          animation: chin 0.5s 0.12s cubic-bezier(.22,1,.36,1) forwards;
        }
        .ch-search-wrap { position: relative; flex: 1 1 auto; min-width: 0; }
        .ch-search-icon { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .ch-search {
          width: 100%; height: 42px; border-radius: 10px; border: 1px solid #CBD5E1;
          padding: 0 0.8rem 0 2.2rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
          outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ch-search:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        
        .ch-select {
          flex: 0 1 auto; min-width: 0; height: 42px; border-radius: 10px; border: 1px solid #CBD5E1;
          padding: 0 2rem 0 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600;
          appearance: none; background-color: white; color: #111827;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 0.7rem center;
          cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ch-select:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); outline: none; }
        
        .ch-reload-btn {
          flex: 0 0 auto; height: 42px; padding: 0 1rem; border-radius: 10px;
          background: white; border: 1px solid #CBD5E1; color: #374151;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
          transition: background 0.2s; white-space: nowrap;
        }
        .ch-reload-btn:hover { background: #F8FAFC; color: #1D4ED8; border-color: #93C5FD; }

        .ch-panel {
          background: rgba(253,253,255,0.9);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: chin 0.5s 0.16s cubic-bezier(.22,1,.36,1) forwards;
        }

        .ch-loader { display: flex; align-items: center; justify-content: center; padding: 2.5rem; gap: 0.75rem; color: #64748B; font-weight: 600; font-size: 0.9rem; }
        .ch-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: chspin 0.8s linear infinite; }

        /* ── RESPONSIVE MOBILE ── */
        @media (max-width: 640px) {
          .ch-header { align-items: center; margin-bottom: 1.25rem; padding-bottom: 1.25rem; }
          .ch-title { font-size: 1.5rem !important; }
          .ch-new-btn { height: 38px; padding: 0 0.85rem; font-size: 0.75rem; }
          
          /* Grille de stats : 2 par ligne, bien centrées */
          .ch-stats { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1.5rem; }
          .ch-stat-card { padding: 0.85rem 0.5rem; border-radius: 12px; }
          .ch-stat-val { font-size: 1.5rem; }
          .ch-stat-lbl { font-size: 0.55rem; }
        }

        @media (max-width: 500px) {
          /* Force la ligne unique avec réduction de polices pour les très petits écrans */
          .ch-toolbar { gap: 0.4rem; }
          .ch-search, .ch-select, .ch-reload-btn { height: 38px; font-size: 0.75rem; }
          .ch-search { padding-left: 1.8rem; }
          .ch-search-icon { left: 0.5rem; width: 14px; height: 14px; }
          .ch-select { padding: 0 1.5rem 0 0.5rem; background-position: right 0.4rem center; }
          .ch-reload-btn { padding: 0 0.6rem; }
          .btn-text { display: none; } /* Efface le texte "Actualiser" pour gagner de la place */
        }

        @keyframes chin { to { opacity: 1; transform: translateY(0); } }
        @keyframes chspin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ch-wrap">

        <div className="ch-header">
          <div>
            <div className="ch-eyebrow">
              <div className="ch-eyebrow-dot" />
              Espace membre
            </div>
            <h1 className="ch-title">
              Historique des <span>cotisations</span>
            </h1>
          </div>

          <Link href="/member/contributions/new" className="ch-new-btn">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouveau dépôt
          </Link>
        </div>

        {/* CARTES STATISTIQUES */}
        <div className="ch-stats">
          <div className="ch-stat-card" style={{ borderBottomColor: '#2563EB' }}>
            <span className="ch-stat-val" style={{ color: '#1D4ED8' }}>{items.length}</span>
            <span className="ch-stat-lbl">Total</span>
          </div>
          <div className="ch-stat-card" style={{ borderBottomColor: '#059669' }}>
            <span className="ch-stat-val" style={{ color: '#047857' }}>{validated}</span>
            <span className="ch-stat-lbl">Validées</span>
          </div>
          <div className="ch-stat-card" style={{ borderBottomColor: '#D97706' }}>
            <span className="ch-stat-val" style={{ color: '#B45309' }}>{pending}</span>
            <span className="ch-stat-lbl">En attente</span>
          </div>
          <div className="ch-stat-card" style={{ borderBottomColor: '#DC2626' }}>
            <span className="ch-stat-val" style={{ color: '#B91C1C' }}>{rejected}</span>
            <span className="ch-stat-lbl">Rejetées</span>
          </div>
        </div>

        {/* TOOLBAR RECHERCHE & FILTRES */}
        <div className="ch-toolbar">
          <div className="ch-search-wrap">
            <svg className="ch-search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
            <input 
              type="text" 
              className="ch-search" 
              placeholder="Rechercher motif ou méthode..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
            />
          </div>
          
          <select className="ch-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <button className="ch-reload-btn" onClick={() => void load()}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="btn-text">Actualiser</span>
          </button>
        </div>

        <div className="ch-panel">
          {loading ? (
            <div className="ch-loader">
              <div className="ch-ring" />
              Chargement…
            </div>
          ) : error ? (
            <div style={{ padding: '1rem 1.5rem', color: '#DC2626', fontWeight: 600 }}>{error}</div>
          ) : (
            <ContributionHistoryTable items={filteredItems} />
          )}
        </div>

      </div>
    </AppShell>
  );
}