// web/app/(protected)/super-admin/audit/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { AuditItem } from '../../../../types/audit';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ ACTION PILL */
type ActionTone = 'delete' | 'create' | 'update' | 'default';

function actionTone(action: string): ActionTone {
  const a = action.toUpperCase();
  if (a.includes('DELETE') || a.includes('REMOVE')) return 'delete';
  if (a.includes('CREATE') || a.includes('ADD')    || a.includes('UPLOAD')) return 'create';
  if (a.includes('UPDATE') || a.includes('EDIT')   || a.includes('PATCH'))  return 'update';
  return 'default';
}

const ACTION_TONE: Record<ActionTone, { color: string; bg: string; border: string }> = {
  delete:  { color: '#DC2626', bg: 'rgba(254,242,242,.8)',  border: 'rgba(220,38,38,.25)'  },
  create:  { color: '#059669', bg: 'rgba(236,253,245,.8)',  border: 'rgba(5,150,105,.22)'  },
  update:  { color: '#D97706', bg: 'rgba(255,251,235,.8)',  border: 'rgba(217,119,6,.22)'  },
  default: { color: '#2563EB', bg: 'rgba(239,246,255,.8)',  border: 'rgba(37,99,235,.2)'   },
};

function ActionPill({ action }: { action: string }) {
  const t = ACTION_TONE[actionTone(action)];
  return (
    <span style={{
      display: 'inline-block', padding: '.2rem .55rem', borderRadius: 7,
      fontFamily: "'DM Mono',monospace", fontSize: '.72rem', fontWeight: 700,
      background: t.bg, border: `1px solid ${t.border}`, color: t.color,
      whiteSpace: 'nowrap',
    }}>
      {action}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ SKELETON ROW */
function SkeletonRow() {
  const skel = (w: number) => (
    <div style={{
      height: 13, width: w, borderRadius: 6,
      background: 'linear-gradient(90deg,#F0F4F8 25%,#FAFBFC 50%,#F0F4F8 75%)',
      backgroundSize: '200% 100%', animation: 'sashimmer 1.4s infinite',
    }} />
  );
  return (
    <tr>
      <td style={{ padding: '.9rem 1.2rem' }}>{skel(96)}</td>
      <td style={{ padding: '.9rem 1.2rem' }}>{skel(130)}</td>
      <td style={{ padding: '.9rem 1.2rem' }}>{skel(220)}</td>
      <td style={{ padding: '.9rem 1.2rem' }}>{skel(100)}</td>
    </tr>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminAuditPage() {
  const [items,   setItems]   = useState<AuditItem[]>([]);
  const [action,  setAction]  = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (filter?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await api.listAudit({
        action: (filter ?? action) || undefined,
        page: 1, pageSize: 100,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => { void load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleClear() { setAction(''); void load(''); }

  /* stats */
  const uniqueActions = new Set(items.map(i => i.action)).size;
  const today         = new Date().toDateString();
  const todayCount    = items.filter(i => new Date(i.createdAt).toDateString() === today).length;
  const deleteCount   = items.filter(i => actionTone(i.action) === 'delete').length;

  const thStyle: React.CSSProperties = {
    padding: '.75rem 1.2rem', fontSize: '.63rem', fontWeight: 900,
    letterSpacing: '.11em', textTransform: 'uppercase', color: '#374151',
    background: 'rgba(254,242,242,.35)', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '.9rem 1.2rem', fontSize: '.82rem', color: '#111827', verticalAlign: 'middle',
  };

  return (
    <AppShell title="Journal d'audit">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .sau-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1200px;margin:0 auto}

        /* Header */
        .sau-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:sauin .5s .04s cubic-bezier(.22,1,.36,1) forwards;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem}
        .sau-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sau-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:saupulse 2s ease-in-out infinite}
        @keyframes saupulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sau-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sau-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .sau-sub{font-size:.8rem;font-weight:600;color:#6B7280;margin-top:.25rem}
        .sau-live{display:inline-flex;align-items:center;gap:.45rem;background:rgba(220,38,38,.07);border:1px solid rgba(220,38,38,.18);border-radius:99px;padding:.4rem .9rem;font-size:.72rem;font-weight:800;color:#B91C1C;white-space:nowrap;align-self:flex-start}
        .sau-live-dot{width:7px;height:7px;border-radius:50%;background:#DC2626;box-shadow:0 0 8px rgba(220,38,38,.6);animation:saupulse 2s infinite}

        /* Stats */
        .sau-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:sauin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:700px){.sau-stats{grid-template-columns:repeat(2,1fr)}}
        .sau-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem 1rem}
        .sau-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .sau-stat-lbl{font-size:.64rem;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.07em}

        /* Toolbar */
        .sau-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07)}
        .sau-sw{position:relative;flex:1;min-width:220px}
        .sau-si{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .sau-input{width:100%;height:40px;border-radius:11px;border:1px solid rgba(220,38,38,.15);background:rgba(255,255,255,.88);padding:0 .9rem 0 2.5rem;font-family:'DM Mono',monospace;font-size:.8rem;font-weight:600;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .sau-input:focus{border-color:rgba(220,38,38,.4);box-shadow:0 0 0 3px rgba(220,38,38,.08);background:white}
        .sau-input::placeholder{color:rgba(107,114,128,.45);font-family:'DM Sans',sans-serif;font-weight:400}
        .sau-filter-btn{height:40px;padding:0 1.1rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800;display:flex;align-items:center;gap:.4rem;box-shadow:0 3px 10px rgba(220,38,38,.3);transition:all .18s;white-space:nowrap}
        .sau-filter-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(220,38,38,.4)}
        .sau-clear-btn{height:40px;padding:0 .9rem;border-radius:11px;border:1.5px solid rgba(220,38,38,.18);background:rgba(254,242,242,.5);color:#B91C1C;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.35rem;transition:all .18s;white-space:nowrap}
        .sau-clear-btn:hover{background:#FEE2E2;border-color:rgba(220,38,38,.35)}

        /* Panel */
        .sau-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:sauin .5s .14s cubic-bezier(.22,1,.36,1) forwards}
        .sau-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .sau-panel-titlerow{display:flex;align-items:center;gap:.55rem}
        .sau-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .sau-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .sau-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}
        .sau-reload-btn{height:34px;padding:0 .9rem;border-radius:9px;background:rgba(254,242,242,.7);border:1.5px solid rgba(220,38,38,.18);color:#B91C1C;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.35rem;transition:all .18s;white-space:nowrap}
        .sau-reload-btn:hover{background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}

        /* Table */
        .sau-tw{overflow-x:auto}
        .sau-table{width:100%;border-collapse:collapse;min-width:580px}
        .sau-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .sau-table tbody tr{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s;animation:sauin .4s cubic-bezier(.22,1,.36,1) both}
        .sau-table tbody tr:last-child{border-bottom:none}
        .sau-table tbody tr:hover{background:rgba(220,38,38,.02)}
        .sau-target{font-family:'DM Mono',monospace;font-size:.73rem;font-weight:700;color:#6B7280}
        .sau-summary{font-size:.82rem;font-weight:700;color:#111827;max-width:320px}
        .sau-date{font-family:'DM Mono',monospace;font-size:.73rem;font-weight:600;color:#9CA3AF;white-space:nowrap}
        .sau-dash{color:#D1D5DB}

        /* Mobile cards */
        .sau-mob{display:none;flex-direction:column}
        @media(max-width:640px){.sau-tw{display:none}.sau-mob{display:flex}}
        .sau-mc{padding:1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:sauin .4s cubic-bezier(.22,1,.36,1) both}
        .sau-mc:last-child{border-bottom:none}
        .sau-mc-row1{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.5rem}
        .sau-mc-meta{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}

        /* States */
        .sau-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .sau-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:sauspin .8s linear infinite}
        .sau-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}
        .sau-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .sau-empty-title{font-size:.9rem;font-weight:800;color:#374151}
        .sau-empty-sub{font-size:.78rem;font-weight:600}

        @keyframes sauin{to{opacity:1;transform:translateY(0)}}
        @keyframes sauspin{to{transform:rotate(360deg)}}
        @keyframes sashimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      `}</style>

      <div className="sau-wrap">

        {/* Header */}
        <div className="sau-header">
          <div>
            <div className="sau-eyebrow"><div className="sau-dot" />Super Admin &middot; Syst&egrave;me</div>
            <h1 className="sau-title">Journal d&apos;<span>audit</span></h1>
            <p className="sau-sub">Historique complet des actions syst&egrave;me</p>
          </div>
          <div className="sau-live">
            <div className="sau-live-dot" />
            Temps r&eacute;el
          </div>
        </div>

        {/* Stats */}
        <div className="sau-stats">
          {([
            { label: '\u00c9v\u00e9nements',     value: loading ? '—' : items.length,        color: '#DC2626' },
            { label: 'Actions uniques',          value: loading ? '—' : uniqueActions,        color: '#2563EB' },
            { label: 'Aujourd\u2019hui',         value: loading ? '—' : todayCount,           color: '#059669' },
            { label: 'Suppressions',             value: loading ? '—' : deleteCount,          color: '#D97706' },
          ] as const).map(s => (
            <div key={s.label} className="sau-stat" style={{ borderTopColor: s.color }}>
              <div className="sau-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="sau-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Panel */}
        <div className="sau-panel">
          <div className="sau-panel-head">
            <div className="sau-panel-titlerow">
              <div className="sau-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="sau-panel-title">Historique des actions</span>
              {!loading && items.length > 0 && <span className="sau-count-chip">{items.length}</span>}
            </div>
            <button className="sau-reload-btn" onClick={() => void load(action)}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualiser
            </button>
          </div>

          {/* Toolbar */}
          <div className="sau-toolbar">
            <div className="sau-sw">
              <span className="sau-si">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </span>
              <input
                className="sau-input"
                placeholder="Filtrer par action (ex&nbsp;: UPLOAD_FILE)&#8230;"
                value={action}
                onChange={e => setAction(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void load(action)}
              />
            </div>
            <button className="sau-filter-btn" onClick={() => void load(action)}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              Filtrer
            </button>
            {action && (
              <button className="sau-clear-btn" onClick={handleClear}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                R&eacute;initialiser
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="sau-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="sau-loader"><div className="sau-ring" />Chargement&#8230;</div>
          ) : items.length === 0 && !error ? (
            <div className="sau-empty">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
                <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="sau-empty-title">Aucune entr&eacute;e trouv&eacute;e</div>
              <div className="sau-empty-sub">Essayez de r&eacute;initialiser le filtre.</div>
            </div>
          ) : (
            <>
              {/* ── Desktop ── */}
              <div className="sau-tw">
                <table className="sau-table">
                  <thead>
                    <tr>
                      <th style={thStyle}>Action</th>
                      <th style={thStyle}>Cible</th>
                      <th style={thStyle}>R&eacute;sum&eacute;</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a, idx) => (
                      <tr key={a.id} style={{ animationDelay: `${idx * 30}ms` }}>
                        <td style={tdStyle}><ActionPill action={a.action} /></td>
                        <td style={tdStyle}>
                          <span className="sau-target">
                            {[a.targetModel, a.targetId].filter(Boolean).join(' / ') || <span className="sau-dash">—</span>}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span className="sau-summary">{a.summary || <span className="sau-dash">—</span>}</span>
                        </td>
                        <td style={tdStyle}>
                          <span className="sau-date">{formatDate(a.createdAt)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="sau-mob">
                {items.map((a, idx) => (
                  <div key={a.id} className="sau-mc" style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className="sau-mc-row1">
                      <ActionPill action={a.action} />
                      <span className="sau-date">{formatDate(a.createdAt)}</span>
                    </div>
                    <div className="sau-mc-meta">
                      {[a.targetModel, a.targetId].filter(Boolean).length > 0 && (
                        <span className="sau-target">{[a.targetModel, a.targetId].filter(Boolean).join(' / ')}</span>
                      )}
                    </div>
                    {a.summary && <div className="sau-summary" style={{ marginTop: '.4rem', fontSize: '.8rem' }}>{a.summary}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* shared th style defined outside JSX to avoid recreation */
const thStyle: React.CSSProperties = {
  padding: '.75rem 1.2rem', fontSize: '.63rem', fontWeight: 900,
  letterSpacing: '.11em', textTransform: 'uppercase', color: '#374151',
  background: 'rgba(254,242,242,.35)', textAlign: 'left', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '.9rem 1.2rem', fontSize: '.82rem', color: '#111827', verticalAlign: 'middle',
};