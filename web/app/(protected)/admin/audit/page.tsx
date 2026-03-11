//web/app/(protected)/admin/audit/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { AuditItem } from '../../../../types/audit';
import { formatDate } from '../../../../lib/format';

/* ── Action badge ───────────────────────────────────────────────────── */
function ActionBadge({ action }: { action: string }) {
  const upper = action.toUpperCase();
  let color = '#2563EB', bg = '#EFF6FF', border = '#BFDBFE';

  if (upper.includes('DELETE') || upper.includes('REJECT') || upper.includes('SUSPEND')) {
    color = '#DC2626'; bg = '#FEF2F2'; border = '#FECACA';
  } else if (upper.includes('CREATE') || upper.includes('APPROVE') || upper.includes('VALIDATE')) {
    color = '#059669'; bg = '#ECFDF5'; border = '#A7F3D0';
  } else if (upper.includes('UPDATE') || upper.includes('EDIT')) {
    color = '#D97706'; bg = '#FFFBEB'; border = '#FDE68A';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em',
      color, background: bg, border: `1px solid ${border}`,
      borderRadius: 99, padding: '0.22rem 0.6rem',
      whiteSpace: 'nowrap', fontFamily: "'DM Mono', monospace",
    }}>
      {action}
    </span>
  );
}

export default function AdminAuditPage() {
  const [items,   setItems]   = useState<AuditItem[]>([]);
  const [action,  setAction]  = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* ── useCallback évite la boucle infinie dans useEffect ── */
  const load = useCallback(async (filterAction?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.listAudit({
        page: 1, pageSize: 100,
        action: filterAction || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []); // pas de dépendances — load est stable

  useEffect(() => { void load(); }, [load]);

  function handleFilter() {
    void load(action.trim() || undefined);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleFilter();
  }

  return (
    <AppShell title="Journal d&#8217;audit">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        .au-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1100px; margin: 0 auto;
        }

        /* Header */
        .au-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          flex-wrap: wrap; gap: 1rem; margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: auin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .au-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .au-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: aupulse 2s ease-in-out infinite; }
        @keyframes aupulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .au-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .au-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .au-count-chip {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.38rem 0.85rem; border-radius: 99px;
          background: #EFF6FF; border: 1px solid #BFDBFE;
          font-size: 0.72rem; font-weight: 700; color: #1D4ED8;
        }

        /* Toolbar */
        .au-toolbar {
          display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;
          margin-bottom: 1.1rem;
          opacity: 0; transform: translateY(10px);
          animation: auin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .au-input-wrap { position: relative; flex: 1; min-width: 220px; }
        .au-input-ico { position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .au-input {
          width: 100%; height: 44px; border-radius: 12px;
          border: 1px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.88);
          padding: 0 1rem 0 2.6rem;
          font-family: 'DM Mono', monospace; font-size: 0.8rem; color: #111827;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          letter-spacing: 0.03em;
        }
        .au-input:focus { border-color: rgba(37,99,235,0.45); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: white; }
        .au-input::placeholder { color: rgba(107,114,128,0.45); font-family: 'DM Sans', sans-serif; letter-spacing: 0; }

        .au-filter-btn {
          height: 44px; padding: 0 1.25rem; border-radius: 12px;
          background: linear-gradient(135deg,#1D4ED8,#2563EB);
          border: none; color: white; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700;
          display: flex; align-items: center; gap: 0.4rem;
          box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          transition: all 0.18s; white-space: nowrap;
        }
        .au-filter-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.38); }

        .au-clear-btn {
          height: 44px; padding: 0 0.9rem; border-radius: 12px;
          border: 1px solid rgba(37,99,235,0.15); background: rgba(255,255,255,0.85);
          display: flex; align-items: center; gap: 0.35rem; cursor: pointer; color: #6B7280;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 600;
          transition: all 0.18s; white-space: nowrap;
        }
        .au-clear-btn:hover { background: #FEF2F2; border-color: rgba(220,38,38,0.25); color: #DC2626; }

        /* Panel */
        .au-panel {
          background: rgba(253,253,255,0.93);
          backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: auin 0.5s 0.15s cubic-bezier(.22,1,.36,1) forwards;
        }

        /* Table */
        .au-table-wrap { overflow-x: auto; }
        .au-table { width: 100%; border-collapse: collapse; min-width: 640px; }
        .au-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.09); }
        .au-table thead th {
          padding: 0.8rem 1.2rem;
          font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: #374151; text-align: left;
          background: rgba(248,250,252,0.7); white-space: nowrap;
        }
        .au-table tbody tr {
          border-bottom: 1px solid rgba(37,99,235,0.055);
          transition: background 0.15s;
          animation: auin 0.4s cubic-bezier(.22,1,.36,1) both;
        }
        .au-table tbody tr:last-child { border-bottom: none; }
        .au-table tbody tr:hover { background: rgba(37,99,235,0.025); }
        .au-table td { padding: 0.85rem 1.2rem; vertical-align: middle; }

        .au-target {
          font-family: 'DM Mono', monospace;
          font-size: 0.74rem; color: #4B5563; font-weight: 500;
          background: #F3F4F6; border-radius: 6px;
          padding: 0.18rem 0.45rem;
          display: inline-block;
        }
        .au-summary { font-size: 0.82rem; color: #111827; font-weight: 600; max-width: 280px; }
        .au-summary-empty { font-size: 0.78rem; color: #9CA3AF; }
        .au-date { font-size: 0.78rem; color: #374151; font-weight: 600; white-space: nowrap; }
        .au-date-sub { font-size: 0.67rem; color: #9CA3AF; margin-top: 2px; }

        /* Loader / empty */
        .au-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; font-weight: 600; }
        .au-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: auspin 0.8s linear infinite; }
        @keyframes auspin { to { transform: rotate(360deg); } }

        .au-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3.5rem 1rem; gap: 0.75rem; color: #9CA3AF; }
        .au-empty-ico { width: 52px; height: 52px; border-radius: 50%; background: #F3F4F6; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; }
        .au-empty p { font-size: 0.82rem; font-weight: 600; }

        /* Error */
        .au-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }

        /* Active filter badge */
        .au-active-filter {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.3rem 0.7rem; border-radius: 99px;
          background: #FFF7ED; border: 1px solid #FED7AA; color: #C2410C;
          font-size: 0.7rem; font-weight: 700; font-family: 'DM Mono', monospace;
        }

        @keyframes auin { to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="au-wrap">

        {/* Header */}
        <div className="au-header">
          <div>
            <div className="au-eyebrow"><div className="au-eyebrow-dot" />Admin antenne</div>
            <h1 className="au-title">Journal <span>d&apos;audit</span></h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
            {action && (
              <span className="au-active-filter">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
                </svg>
                {action}
              </span>
            )}
            <span className="au-count-chip">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              {items.length} entr&eacute;{items.length > 1 ? 'es' : 'e'}
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="au-error">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="au-toolbar">
          <div className="au-input-wrap">
            <span className="au-input-ico">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
              </svg>
            </span>
            <input
              className="au-input"
              type="text"
              placeholder="VALIDATE_CONTRIBUTION, APPROVE_MEMBER&#8230;"
              value={action}
              onChange={e => setAction(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button className="au-filter-btn" onClick={handleFilter}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            Filtrer
          </button>

          {action && (
            <button className="au-clear-btn" onClick={() => { setAction(''); void load(); }}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Effacer
            </button>
          )}
        </div>

        {/* Panel */}
        <div className="au-panel">
          {loading ? (
            <div className="au-loader"><div className="au-ring" />Chargement du journal&#8230;</div>
          ) : items.length === 0 ? (
            <div className="au-empty">
              <div className="au-empty-ico">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
              </div>
              <p>{action ? 'Aucune entr\u00e9e pour ce filtre' : 'Aucune action enregistr\u00e9e'}</p>
            </div>
          ) : (
            <div className="au-table-wrap">
              <table className="au-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Cible</th>
                    <th>R&eacute;sum&eacute;</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a, i) => {
                    const target = [a.targetModel, a.targetId].filter(Boolean).join(' / ');
                    return (
                      <tr key={a.id} style={{ animationDelay:`${i * 0.03}s` }}>
                        <td><ActionBadge action={a.action} /></td>
                        <td>
                          {target
                            ? <span className="au-target">{target}</span>
                            : <span className="au-summary-empty">&mdash;</span>
                          }
                        </td>
                        <td>
                          {a.summary
                            ? <span className="au-summary">{a.summary}</span>
                            : <span className="au-summary-empty">&mdash;</span>
                          }
                        </td>
                        <td>
                          <div className="au-date">{formatDate(a.createdAt)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}