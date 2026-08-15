// web/app/(protected)/member/late-members/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';

type LateMemberVisible = {
  id: string;
  firstName: string;
  lastName: string;
  antennaName?: string | null;
  lateMonths?: number;
};

function getSeverity(months?: number) {
  if (!months) return { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', bar: '#D1D5DB' };
  if (months >= 12) return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', bar: '#EF4444' };
  if (months >= 6)  return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', bar: '#F59E0B' };
  return { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', bar: '#3B82F6' };
}

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export default function MemberLateMembersPage() {
  const [items, setItems] = useState<LateMemberVisible[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  // Fonction pour recharger les données avec la recherche
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listLateMembersVisible({ page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données au montage, pattern volontaire (fetch), pas de risque de cascade de renders ici
    void loadData();
  }, []);

  const filtered = q
    ? items.filter(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q.toLowerCase()) ||
        (m.antennaName ?? '').toLowerCase().includes(q.toLowerCase())
      )
    : items;

  const maxMonths = Math.max(...items.map(m => m.lateMonths ?? 0), 1);
  const critical = items.filter(m => (m.lateMonths ?? 0) >= 12).length;
  const moderate = items.filter(m => (m.lateMonths ?? 0) >= 6 && (m.lateMonths ?? 0) < 12).length;
  const slight = items.length - moderate - critical;

  return (
    <AppShell title="Retardataires">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;700&display=swap');

        .lm-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 900px; margin: 0 auto;
          box-sizing: border-box; width: 100%;
        }

        /* Header */
        .lm-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: lmin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .lm-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #DC2626; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .lm-eyebrow-dot { width: 6px; height: 6px; background: #EF4444; border-radius: 50%; animation: lmpulse 2s ease-in-out infinite; }
        @keyframes lmpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .lm-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 700; color: #111827; letter-spacing: -0.02em; line-height: 1.15; margin: 0; }
        .lm-title span { background: linear-gradient(135deg,#DC2626,#F97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Notice */
        .lm-notice {
          display: flex; gap: 0.65rem; align-items: flex-start;
          background: rgba(255,251,235,0.9); border: 1px solid #FDE68A;
          border-radius: 14px; padding: 0.9rem 1.1rem;
          margin-bottom: 1.5rem;
          opacity: 0; transform: translateY(10px);
          animation: lmin 0.5s 0.08s cubic-bezier(.22,1,.36,1) forwards;
        }
        .lm-notice p { font-size: 0.78rem; color: #78350F; line-height: 1.6; margin: 0; }

        /* ── NOUVELLES CARTES STATISTIQUES ── */
        .lm-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
          opacity: 0; transform: translateY(10px);
          animation: lmin 0.5s 0.12s cubic-bezier(.22,1,.36,1) forwards;
        }
        .lm-stat-card {
          background: white; border-radius: 16px; border: 1px solid #E2E8F0;
          padding: 1.2rem 1rem; display: flex; flex-direction: column; 
          align-items: center; justify-content: center; text-align: center; 
          border-bottom: 4px solid; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .lm-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 700; line-height: 1; margin-bottom: 0.3rem; }
        .lm-stat-lbl { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; }

        /* Toolbar REVISITÉE */
        .lm-toolbar {
          display: flex; flex-direction: column; gap: 0.65rem;
          margin-bottom: 1.5rem;
          opacity: 0; transform: translateY(10px);
          animation: lmin 0.5s 0.15s cubic-bezier(.22,1,.36,1) forwards;
          width: 100%; box-sizing: border-box;
        }
        
        .lm-search-row {
          display: flex; align-items: center; gap: 0.65rem;
          flex-wrap: nowrap; width: 100%;
        }

        .lm-search-wrap { position: relative; flex: 1 1 auto; min-width: 0; }
        .lm-search-ico { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .lm-search-input {
          width: 100%; height: 42px; padding: 0 0.9rem 0 2.5rem;
          border-radius: 11px; border: 1px solid rgba(220,38,38,0.14);
          background: rgba(255,255,255,0.88); font-family: 'DM Sans', sans-serif;
          font-size: 0.83rem; color: #111827; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;
        }
        .lm-search-input:focus { border-color: rgba(220,38,38,0.4); box-shadow: 0 0 0 3px rgba(220,38,38,0.08); background: white; }
        .lm-search-input::placeholder { color: rgba(107,114,128,0.45); }

        .lm-search-btn {
          flex: 0 0 auto; height: 42px; padding: 0 1.1rem;
          background: linear-gradient(135deg,#DC2626,#F97316);
          color: white; border: none; border-radius: 11px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          box-shadow: 0 4px 12px rgba(220,38,38,0.28);
          transition: transform 0.15s, box-shadow 0.2s; white-space: nowrap;
        }
        .lm-search-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(220,38,38,0.38); }

        .lm-count-row {
          display: flex; justify-content: flex-end; width: 100%;
        }
        .lm-count-chip { font-size: 0.72rem; font-weight: 700; padding: 0.28rem 0.7rem; border-radius: 99px; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; white-space: nowrap; }

        /* Panel */
        .lm-panel {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(220,38,38,0.08);
          box-shadow: 0 2px 12px rgba(220,38,38,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: lmin 0.5s 0.18s cubic-bezier(.22,1,.36,1) forwards;
        }

        /* List header */
        .lm-list-head {
          display: grid; grid-template-columns: auto 1fr 120px 120px;
          padding: 0.65rem 1.2rem; gap: 0.75rem;
          border-bottom: 1px solid rgba(220,38,38,0.07);
        }
        .lm-list-head span { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #9CA3AF; }

        /* Row */
        .lm-row {
          display: grid; grid-template-columns: auto 1fr 120px 120px;
          padding: 0.85rem 1.2rem; gap: 0.75rem;
          border-bottom: 1px solid rgba(220,38,38,0.05);
          align-items: center; transition: background 0.15s;
        }
        .lm-row:last-child { border-bottom: none; }
        .lm-row:hover { background: rgba(220,38,38,0.02); }

        /* Avatar */
        .lm-avatar {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.68rem; font-weight: 800; letter-spacing: 0.03em;
          border: 2px solid;
        }

        /* Name + antenna */
        .lm-name { font-size: 0.85rem; font-weight: 700; color: #111827; }
        .lm-antenna { font-size: 0.7rem; color: #9CA3AF; margin-top: 1px; }

        /* Antenna col */
        .lm-antenna-col { font-size: 0.78rem; color: #374151; }

        /* Late months col */
        .lm-months-col { display: flex; flex-direction: column; gap: 4px; }
        .lm-months-num {
          font-family: 'DM Mono', monospace;
          font-size: 0.82rem; font-weight: 600;
          display: flex; align-items: center; gap: 0.3rem;
        }
        .lm-months-label { font-size: 0.65rem; color: #9CA3AF; }
        .lm-bar-track { height: 4px; border-radius: 99px; background: #F1F5F9; overflow: hidden; }
        .lm-bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s cubic-bezier(.22,1,.36,1); }

        /* States */
        .lm-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; }
        .lm-ring { width: 24px; height: 24px; border: 2.5px solid rgba(220,38,38,0.1); border-top-color: #DC2626; border-radius: 50%; animation: lmspin 0.8s linear infinite; }
        @keyframes lmspin { to { transform: rotate(360deg); } }
        .lm-error { display: flex; align-items: center; gap: 0.6rem; padding: 1rem; color: #B91C1C; font-size: 0.8rem; background: #FEF2F2; border-radius: 12px; border: 1px solid #FECACA; margin-bottom: 1rem; }
        .lm-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; gap: 0.8rem; color: #9CA3AF; }
        .lm-empty-ico { width: 52px; height: 52px; border-radius: 50%; background: #F9FAFB; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; }
        .lm-empty p { font-size: 0.82rem; font-weight: 500; margin: 0; }

        /* ── RESPONSIVE MOBILE ── */
        @media (max-width: 640px) {
          .lm-header { align-items: center; margin-bottom: 1.25rem; }
          .lm-title { font-size: 1.5rem !important; }
          
          /* Grille de stats : 2 par ligne */
          .lm-stats { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1.5rem; }
          .lm-stat-card { padding: 0.85rem 0.5rem; border-radius: 12px; }
          .lm-stat-val { font-size: 1.5rem; }
          .lm-stat-lbl { font-size: 0.55rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

          .lm-list-head { grid-template-columns: auto 1fr 80px; }
          .lm-list-head span:nth-child(3) { display: none; }
          
          .lm-row { grid-template-columns: auto 1fr 80px; }
          .lm-row > *:nth-child(3) { display: none; }
        }

        @media (max-width: 500px) {
          /* Force la ligne unique pour recherche & bouton */
          .lm-search-row { gap: 0.4rem; }
          .lm-search-input { height: 38px; font-size: 0.75rem; padding-left: 2rem; }
          .lm-search-ico { left: 0.6rem; width: 14px; height: 14px; }
          .lm-search-btn { height: 38px; padding: 0 0.8rem; font-size: 0.75rem; }
          .btn-text { display: none; } /* Cache "Rechercher" pour gagner de la place */
          .lm-count-chip { font-size: 0.65rem; padding: 0.2rem 0.5rem; }
        }

        @keyframes lmin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="lm-wrap">

        {/* Header */}
        <div className="lm-header">
          <div className="lm-eyebrow"><div className="lm-eyebrow-dot" />Espace membre</div>
          <h1 className="lm-title">Retardataires <span>+3 mois</span></h1>
        </div>

        {/* Notice */}
        <div className="lm-notice">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p>Affichage informatif pour la <strong>transparence communautaire</strong>. Cette liste est en lecture seule et visible uniquement par les membres actifs.</p>
        </div>

        {/* NOUVELLES CARTES STATISTIQUES */}
        {!loading && (
          <div className="lm-stats">
            <div className="lm-stat-card" style={{ borderBottomColor: '#6B7280' }}>
              <span className="lm-stat-val" style={{ color: '#374151' }}>{items.length}</span>
              <span className="lm-stat-lbl">Total</span>
            </div>
            <div className="lm-stat-card" style={{ borderBottomColor: '#2563EB' }}>
              <span className="lm-stat-val" style={{ color: '#1D4ED8' }}>{slight}</span>
              <span className="lm-stat-lbl">3-5 mois</span>
            </div>
            <div className="lm-stat-card" style={{ borderBottomColor: '#D97706' }}>
              <span className="lm-stat-val" style={{ color: '#B45309' }}>{moderate}</span>
              <span className="lm-stat-lbl">6-11 mois</span>
            </div>
            <div className="lm-stat-card" style={{ borderBottomColor: '#DC2626' }}>
              <span className="lm-stat-val" style={{ color: '#B91C1C' }}>{critical}</span>
              <span className="lm-stat-lbl">12+ mois</span>
            </div>
          </div>
        )}

        {/* TOOLBAR REVISITÉE */}
        <div className="lm-toolbar">
          
          <div className="lm-search-row">
            <div className="lm-search-wrap">
              <span className="lm-search-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
                </svg>
              </span>
              <input
                className="lm-search-input"
                placeholder="Rechercher un membre&#8230;"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void loadData()}
              />
            </div>

            <button className="lm-search-btn" onClick={() => void loadData()}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <span className="btn-text">Rechercher</span>
            </button>
          </div>

          <div className="lm-count-row">
            {!loading && (
              <span className="lm-count-chip">
                {filtered.length} membre{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
        </div>

        {/* Error */}
        {error && (
          <div className="lm-error">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Panel */}
        <div className="lm-panel">
          {loading ? (
            <div className="lm-loader"><div className="lm-ring" />Chargement&#8230;</div>
          ) : filtered.length === 0 ? (
            <div className="lm-empty">
              <div className="lm-empty-ico">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <p>{q ? 'Aucun r\u00e9sultat pour cette recherche' : 'Aucun retardataire'}</p>
            </div>
          ) : (
            <>
              <div className="lm-list-head">
                <span />
                <span>Membre</span>
                <span>Antenne</span>
                <span>Retard</span>
              </div>
              {filtered.map((m, i) => {
                const sev = getSeverity(m.lateMonths);
                const pct = Math.min(((m.lateMonths ?? 0) / maxMonths) * 100, 100);
                return (
                  <div key={m.id} className="lm-row" style={{ animationDelay: `${0.03 * i}s` }}>
                    {/* Avatar */}
                    <div
                      className="lm-avatar"
                      style={{ background: sev.bg, borderColor: sev.border, color: sev.color }}
                    >
                      {getInitials(m.firstName, m.lastName)}
                    </div>

                    {/* Name */}
                    <div>
                      <div className="lm-name">{m.firstName} {m.lastName}</div>
                      <div className="lm-antenna">{m.antennaName ?? '—'}</div>
                    </div>                    
                    
                    {/* Antenna (hidden on mobile) */}
                    <div className="lm-antenna-col">{m.antennaName ?? '—'}</div>

                    {/* Late months */}
                    <div className="lm-months-col">
                      <div className="lm-months-num" style={{ color: sev.color }}>
                        {m.lateMonths ?? '—'}
                        <span className="lm-months-label" style={{ color: sev.color, opacity: 0.7 }}>
                          mois
                        </span>
                      </div>
                      <div className="lm-bar-track">
                        <div className="lm-bar-fill" style={{ width: `${pct}%`, background: sev.bar }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

      </div>
    </AppShell>
  );
}