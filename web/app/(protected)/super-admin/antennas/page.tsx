// web/app/(protected)/super-admin/antennas/page.tsx
// web/app/(protected)/super-admin/antennas/page.tsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Antenna } from '../../../../types/antenna';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ STATUS BADGE */
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.28rem',
      fontSize: '.68rem', fontWeight: 900,
      color:    active ? '#059669' : '#DC2626',
      background: active ? '#ECFDF5' : '#FEF2F2',
      border: `1px solid ${active ? '#A7F3D0' : '#FECACA'}`,
      borderRadius: 99, padding: '.2rem .6rem', whiteSpace: 'nowrap',
      letterSpacing: '.04em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? '#059669' : '#DC2626', flexShrink: 0 }} />
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ ANTENNA ICON */
function AntennaIcon({ code }: { code: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      background: 'linear-gradient(135deg,#991B1B,#DC2626)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: "'Cormorant Garamond',serif",
      fontSize: '.85rem', fontWeight: 700,
      boxShadow: '0 3px 8px rgba(220,38,38,.28)',
    }}>
      {code.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminAntennasPage() {
  const router = useRouter();
  const [items,   setItems]   = useState<Antenna[]>([]);
  const [q,       setQ]       = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (qVal?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await api.listAntennas({ q: qVal ?? q, page: 1, pageSize: 50 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement antennes');
    } finally { setLoading(false); }
  }, [q]);

  useEffect(() => { void load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount   = items.filter(a => a.isActive).length;
  const inactiveCount = items.length - activeCount;

  return (
    <AppShell title="Super-Admin — Antennes">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        .sa-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1200px;margin:0 auto}

        /* ── Header ── */
        .sa-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:sain .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .sa-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sa-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:sapulse 2s ease-in-out infinite}
        @keyframes sapulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sa-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.5rem,3vw,2rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sa-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* ── Stats ── */
        .sa-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:sain .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:540px){.sa-stats{grid-template-columns:1fr 1fr}}
        .sa-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem 1rem}
        .sa-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .sa-stat-lbl{font-size:.65rem;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.07em}

        /* ── Panel ── */
        .sa-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:sain .5s .13s cubic-bezier(.22,1,.36,1) forwards}
        .sa-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .sa-panel-titlerow{display:flex;align-items:center;gap:.55rem}
        .sa-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .sa-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .sa-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}

        /* ── New antenna button ── */
        .sa-new-btn{height:38px;padding:0 1.1rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;display:flex;align-items:center;gap:.4rem;box-shadow:0 4px 14px rgba(220,38,38,.32);transition:all .18s;text-decoration:none;white-space:nowrap}
        .sa-new-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(220,38,38,.42)}

        /* ── Toolbar ── */
        .sa-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07)}
        .sa-sw{position:relative;flex:1;min-width:200px}
        .sa-si{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .sa-search{width:100%;height:40px;border-radius:11px;border:1px solid rgba(220,38,38,.15);background:rgba(255,255,255,.9);padding:0 .9rem 0 2.4rem;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:500;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .sa-search:focus{border-color:rgba(220,38,38,.4);box-shadow:0 0 0 3px rgba(220,38,38,.08);background:white}
        .sa-search::placeholder{color:rgba(107,114,128,.45);font-weight:400}
        .sa-search-btn{height:40px;padding:0 1.1rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800;display:flex;align-items:center;gap:.4rem;box-shadow:0 3px 10px rgba(220,38,38,.3);transition:all .18s;white-space:nowrap}
        .sa-search-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 16px rgba(220,38,38,.4)}
        .sa-search-btn:disabled{opacity:.6;cursor:not-allowed}

        /* ── Table ── */
        .sa-tw{overflow-x:auto}
        .sa-table{width:100%;border-collapse:collapse;min-width:520px}
        .sa-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .sa-table th{padding:.8rem 1.2rem;font-size:.65rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:#374151;background:rgba(254,242,242,.35);text-align:left;white-space:nowrap}
        .sa-table tbody tr{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s,transform .12s;animation:sain .4s cubic-bezier(.22,1,.36,1) both;cursor:pointer}
        .sa-table tbody tr:last-child{border-bottom:none}
        .sa-table tbody tr:hover{background:rgba(220,38,38,.04)}
        .sa-table tbody tr:hover .sa-row-arrow{opacity:1;transform:translateX(0)}
        .sa-table td{padding:.9rem 1.2rem;font-size:.82rem;color:#111827;vertical-align:middle}

        /* ── Row arrow hint ── */
        .sa-row-arrow{opacity:0;transform:translateX(-4px);transition:opacity .18s,transform .18s;color:#DC2626}

        /* ── Cell types ── */
        .sa-code{font-family:'DM Mono',monospace;font-size:.82rem;font-weight:700;color:#111827;background:rgba(254,242,242,.6);border:1px solid rgba(220,38,38,.12);border-radius:6px;padding:.18rem .5rem;white-space:nowrap}
        .sa-name{font-weight:800;font-size:.88rem;color:#0F172A}
        .sa-sub{font-size:.72rem;color:#6B7280;font-weight:600;margin-top:2px}
        .sa-geo{font-weight:700;font-size:.82rem;color:#374151}
        .sa-geo-country{font-size:.7rem;color:#9CA3AF;font-weight:600;margin-top:1px}
        .sa-date{font-size:.75rem;font-weight:700;color:#6B7280}

        /* ── Mobile cards ── */
        .sa-mob{display:none;flex-direction:column}
        @media(max-width:680px){.sa-tw{display:none}.sa-mob{display:flex}}
        .sa-mc{padding:1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:sain .4s cubic-bezier(.22,1,.36,1) both;cursor:pointer;transition:background .15s}
        .sa-mc:last-child{border-bottom:none}
        .sa-mc:hover{background:rgba(220,38,38,.04)}
        .sa-mc-top{display:flex;align-items:flex-start;gap:.65rem;margin-bottom:.5rem}
        .sa-mc-info{flex:1;min-width:0}
        .sa-mc-row2{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem}
        .sa-mc-hint{font-size:.72rem;color:#DC2626;font-weight:700;display:flex;align-items:center;gap:.25rem;margin-top:.3rem}

        /* ── States ── */
        .sa-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .sa-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:saspin .8s linear infinite}
        .sa-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}
        .sa-empty{display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;gap:.7rem;color:#9CA3AF}
        .sa-empty p{font-size:.84rem;font-weight:700}

        @keyframes sain{to{opacity:1;transform:translateY(0)}}
        @keyframes saspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="sa-wrap">

        {/* Header */}
        <div className="sa-header">
          <div className="sa-eyebrow"><div className="sa-dot" />Super Admin</div>
          <h1 className="sa-title">Gestion des <span>antennes</span></h1>
        </div>

        {/* Stats */}
        <div className="sa-stats">
          {([
            { label: 'Total antennes', value: items.length,  color: '#DC2626' },
            { label: 'Actives',        value: activeCount,   color: '#059669' },
            { label: 'Inactives',      value: inactiveCount, color: '#9CA3AF' },
          ] as const).map(s => (
            <div key={s.label} className="sa-stat" style={{ borderTopColor: s.color }}>
              <div className="sa-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="sa-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Panel */}
        <div className="sa-panel">
          <div className="sa-panel-head">
            <div className="sa-panel-titlerow">
              <div className="sa-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <span className="sa-panel-title">Antennes enregistr&eacute;es</span>
              {items.length > 0 && <span className="sa-count-chip">{items.length}</span>}
            </div>
            <Link href="/super-admin/antennas/new" className="sa-new-btn">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8">
                <path strokeLinecap="round" d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle antenne
            </Link>
          </div>

          {/* Toolbar */}
          <div className="sa-toolbar">
            <div className="sa-sw">
              <span className="sa-si">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
              </span>
              <input
                className="sa-search"
                type="text"
                placeholder="Nom, code, ville&#8230;"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void load(q)}
              />
            </div>
            <button className="sa-search-btn" disabled={loading} onClick={() => void load(q)}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              Rechercher
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="sa-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="sa-loader"><div className="sa-ring" />Chargement&#8230;</div>
          ) : !error && items.length === 0 ? (
            <div className="sa-empty">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              <p>Aucune antenne trouv&eacute;e</p>
            </div>
          ) : !error ? (
            <>
              {/* ── Desktop table ── */}
              <div className="sa-tw">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Antenne</th>
                      <th>Code</th>
                      <th>Localisation</th>
                      <th>Devise</th>
                      <th>Statut</th>
                      <th>Cr&eacute;&eacute; le</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a, i) => (
                      <tr
                        key={a.id}
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => router.push(`/super-admin/antennas/${a.id}`)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                            <AntennaIcon code={a.code} />
                            <div>
                              <div className="sa-name">{a.name}</div>
                              <div className="sa-sub">ID : {a.id.slice(0, 8)}&hellip;</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="sa-code">{a.code}</span></td>
                        <td>
                          {a.city
                            ? <><div className="sa-geo">{a.city}</div><div className="sa-geo-country">{a.country ?? '—'}</div></>
                            : <span style={{ color: '#D1D5DB', fontWeight: 700 }}>—</span>
                          }
                        </td>
                        <td>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.78rem', fontWeight: 700, color: '#374151' }}>
                            {a.defaultCurrency ?? 'EUR'}
                          </span>
                        </td>
                        <td><StatusBadge active={a.isActive} /></td>
                        <td><span className="sa-date">{formatDate(a.createdAt)}</span></td>
                        <td>
                          <div className="sa-row-arrow">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="sa-mob">
                {items.map((a, i) => (
                  <div
                    key={a.id}
                    className="sa-mc"
                    style={{ animationDelay: `${i * 0.04}s` }}
                    onClick={() => router.push(`/super-admin/antennas/${a.id}`)}
                  >
                    <div className="sa-mc-top">
                      <AntennaIcon code={a.code} />
                      <div className="sa-mc-info">
                        <div className="sa-name">{a.name}</div>
                        <div className="sa-sub">{a.city ?? ''}{a.city && a.country ? ' · ' : ''}{a.country ?? ''}</div>
                      </div>
                      <StatusBadge active={a.isActive} />
                    </div>
                    <div className="sa-mc-row2">
                      <span className="sa-code">{a.code}</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.75rem', fontWeight: 700, color: '#6B7280' }}>{a.defaultCurrency ?? 'EUR'}</span>
                      <span className="sa-date">{formatDate(a.createdAt)}</span>
                    </div>
                    <div className="sa-mc-hint">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      Voir les détails
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}