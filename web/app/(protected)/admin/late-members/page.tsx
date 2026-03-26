// web/app/(protected)/admin/late-members/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { fullName, formatDate } from '../../../../lib/format';

type LateMember = UserSummary & {
  lateMonths?: number;
  lastValidatedContributionAt?: string | null;
};

/* ══════════════════════════════════════════════════════ LATE BADGE */
function LateBadge({ months }: { months?: number }) {
  if (!months) return <span style={{ color:'#D1D5DB', fontSize:'.75rem' }}>—</span>;
  const color  = months >= 12 ? '#DC2626' : months >= 6 ? '#D97706' : '#F59E0B';
  const bg     = months >= 12 ? '#FEF2F2' : months >= 6 ? '#FFFBEB' : '#FFFBEB';
  const border = months >= 12 ? '#FECACA' : '#FDE68A';
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem', fontSize:'.72rem', fontWeight:800, color, background:bg, border:`1px solid ${border}`, borderRadius:99, padding:'.2rem .65rem', whiteSpace:'nowrap' }}>
      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
      {months} mois
    </span>
  );
}

/* ══════════════════════════════════════════════════════ INITIALS */
function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,#DC2626,#EF4444)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontFamily:"'Cormorant Garamond',serif", fontSize:'.88rem', fontWeight:600, boxShadow:'0 2px 8px rgba(220,38,38,0.25)' }}>
      {txt}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminLateMembersPage() {
  const [items,   setItems]   = useState<LateMember[]>([]);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.listLateMembersOver3Months({ page:1, pageSize:100 });
        
        // Amélioration chirurgicale : Tri décroissant pour avoir les retards les plus graves en haut
        const sortedItems = (res.items as LateMember[]).sort((a, b) => (b.lateMonths ?? 0) - (a.lateMonths ?? 0));
        
        setItems(sortedItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* Stats */
  const maxMonths  = items.reduce((m, i) => Math.max(m, i.lateMonths ?? 0), 0);
  const critical   = items.filter(i => (i.lateMonths ?? 0) >= 12).length;
  const serious    = items.filter(i => (i.lateMonths ?? 0) >= 6 && (i.lateMonths ?? 0) < 12).length;

  return (
    <AppShell title="Retardataires">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .alm-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1000px;margin:0 auto}

        .alm-header{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:almin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .alm-eyebrow{font-size:.67rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .alm-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:almpulse 2s ease-in-out infinite}
        @keyframes almpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .alm-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.85rem);font-weight:600;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .alm-title span{background:linear-gradient(135deg,#B91C1C,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* Stats */
        .alm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:almin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:540px){.alm-stats{grid-template-columns:repeat(3,1fr)}}
        .alm-stat{background:rgba(253,253,255,.92);backdrop-filter:blur(10px);border-radius:14px;border:1px solid;box-shadow:0 2px 10px rgba(0,0,0,.04);padding:.9rem 1rem;border-top:3px solid}
        .alm-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.65rem;font-weight:600;line-height:1;margin-bottom:.25rem}
        .alm-stat-lbl{font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6B7280}

        /* Panel */
        .alm-panel{background:rgba(253,253,255,.93);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(220,38,38,.1);box-shadow:0 2px 14px rgba(220,38,38,.05),0 0 0 1px rgba(255,255,255,.85) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:almin .5s .14s cubic-bezier(.22,1,.36,1) forwards}
        .alm-panel-head{padding:1rem 1.3rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;background:rgba(254,242,242,.3)}
        .alm-panel-title{font-size:.73rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#991B1B;display:flex;align-items:center;gap:.5rem}
        .alm-panel-ico{width:26px;height:26px;border-radius:7px;background:#FEE2E2;color:#DC2626;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .alm-count-chip{font-size:.68rem;font-weight:800;padding:.18rem .55rem;border-radius:99px;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA}

        /* Table */
        .alm-tw{overflow-x:auto}
        .alm-table{width:100%;border-collapse:collapse;min-width:560px}
        .alm-table thead tr{border-bottom:1px solid rgba(220,38,38,.09)}
        .alm-table thead th{padding:.8rem 1.2rem;font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#374151;text-align:left;background:rgba(254,242,242,.2);white-space:nowrap}
        .alm-table tbody tr{border-bottom:1px solid rgba(220,38,38,.055);transition:background .15s;animation:almin .4s cubic-bezier(.22,1,.36,1) both}
        .alm-table tbody tr:last-child{border-bottom:none}
        .alm-table tbody tr:hover{background:rgba(220,38,38,.025)}
        .alm-table td{padding:.9rem 1.2rem;vertical-align:middle}
        .alm-member{display:flex;align-items:center;gap:.7rem}
        .alm-name{font-size:.87rem;font-weight:800;color:#0F172A}
        .alm-email{font-size:.7rem;color:#6B7280;font-weight:500;margin-top:1px}
        .alm-status{font-size:.69rem;font-weight:700;color:#6B7280;font-family:'DM Mono',monospace}
        .alm-date{font-size:.75rem;color:#374151;font-weight:600;white-space:nowrap}
        .alm-date-none{font-size:.72rem;color:#D1D5DB}

        /* Mobile */
        .alm-mob{display:none}
        @media(max-width:620px){.alm-tw{display:none}.alm-mob{display:flex;flex-direction:column}}
        .alm-mc{padding:1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:almin .4s cubic-bezier(.22,1,.36,1) both}
        .alm-mc:last-child{border-bottom:none}
        .alm-mc-top{display:flex;align-items:center;gap:.7rem;margin-bottom:.6rem}
        .alm-mc-meta{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;font-size:.71rem;color:#6B7280;font-weight:500}

        /* States */
        .alm-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.82rem;font-weight:600}
        .alm-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.1);border-top-color:#DC2626;border-radius:50%;animation:almspin .8s linear infinite}
        .alm-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;gap:.65rem;color:#9CA3AF}
        .alm-empty-ico{width:52px;height:52px;border-radius:50%;background:#ECFDF5;border:1px solid #A7F3D0;display:flex;align-items:center;justify-content:center}
        .alm-empty p{font-size:.82rem;font-weight:700}
        .alm-error{display:flex;align-items:center;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.8rem;font-weight:700;margin:.75rem 1.2rem}

        @keyframes almin{to{opacity:1;transform:translateY(0)}}
        @keyframes almspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="alm-wrap">

        {/* Header */}
        <div className="alm-header">
          <div>
            <div className="alm-eyebrow"><div className="alm-dot" />Admin antenne</div>
            <h1 className="alm-title">Membres <span>retardataires</span></h1>
          </div>
        </div>

        {/* Stats */}
        <div className="alm-stats">
          {[
            { label:'Total retardataires', value:items.length,  color:'#D97706', border:'rgba(245,158,11,.2)',  top:'#D97706' },
            { label:'Critique (≥ 12 mois)', value:critical,     color:'#DC2626', border:'rgba(220,38,38,.15)', top:'#DC2626' },
            { label:'Maximum (mois)',       value:maxMonths||'—', color:'#7C3AED', border:'rgba(124,58,237,.15)', top:'#7C3AED' },
          ].map(s => (
            <div key={s.label} className="alm-stat" style={{ borderColor:s.border, borderTopColor:s.top }}>
              <div className="alm-stat-val" style={{ color:s.color }}>{s.value}</div>
              <div className="alm-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Panel */}
        <div className="alm-panel">
          <div className="alm-panel-head">
            <div className="alm-panel-title">
              <div className="alm-panel-ico">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              </div>
              Retard sup&eacute;rieur &agrave; 3 mois
            </div>
            <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
              {serious > 0 && <span style={{ fontSize:'.68rem', fontWeight:700, padding:'.18rem .55rem', borderRadius:99, background:'#FFFBEB', color:'#D97706', border:'1px solid #FDE68A' }}>{serious} sérieux</span>}
              <span className="alm-count-chip">{items.length}</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="alm-error">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="alm-loader"><div className="alm-ring" />Chargement&#8230;</div>
          ) : items.length === 0 ? (
            <div className="alm-empty">
              <div className="alm-empty-ico">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="1.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <p>Aucun retardataire &mdash; tous les membres sont &agrave; jour&nbsp;!</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="alm-tw">
                <table className="alm-table">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Statut</th>
                      <th>Retard</th>
                      <th>Derni&egrave;re cotisation valid&eacute;e</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m, i) => (
                      <tr key={m.id} style={{ animationDelay:`${i * 0.035}s` }}>
                        <td>
                          <div className="alm-member">
                            <Initials name={fullName(m)} />
                            <div>
                              <div className="alm-name">{fullName(m)}</div>
                              <div className="alm-email">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="alm-status">{m.status}</span></td>
                        <td><LateBadge months={m.lateMonths} /></td>
                        <td>
                          {m.lastValidatedContributionAt
                            ? <span className="alm-date">{formatDate(m.lastValidatedContributionAt)}</span>
                            : <span className="alm-date-none">Aucune cotisation valid&eacute;e</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="alm-mob">
                {items.map((m, i) => (
                  <div key={m.id} className="alm-mc" style={{ animationDelay:`${i * 0.035}s` }}>
                    <div className="alm-mc-top">
                      <Initials name={fullName(m)} />
                      <div>
                        <div className="alm-name">{fullName(m)}</div>
                        <div className="alm-email">{m.email}</div>
                      </div>
                    </div>
                    <div className="alm-mc-meta">
                      <LateBadge months={m.lateMonths} />
                      <span className="alm-status">{m.status}</span>
                      {m.lastValidatedContributionAt
                        ? <span className="alm-date">{formatDate(m.lastValidatedContributionAt)}</span>
                        : <span className="alm-date-none">Aucune cotisation</span>
                      }
                    </div>
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