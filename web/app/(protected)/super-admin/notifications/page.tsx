//web/app/(protected)/super-admin/notifications/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { NotificationItem } from '../../../../types/notification';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminNotificationsPage() {
  const [items,   setItems]   = useState<NotificationItem[]>([]);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null); setLoading(true);
    try {
      const res = await api.listNotifications();
      setItems(res?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const unreadCount = items.filter(n => !n.isRead).length;
  const readCount   = items.filter(n =>  n.isRead).length;

  return (
    <AppShell title="Notifications">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .sn-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1rem,3vw,2rem);max-width:1100px;margin:0 auto}

        /* ── Header ── */
        .sn-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:snin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .sn-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sn-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:snpulse 2s ease-in-out infinite}
        @keyframes snpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sn-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sn-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* ── Stats ── */
        .sn-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:snin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        .sn-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem .5rem;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .sn-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .sn-stat-lbl{font-size:.6rem;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}

        /* ── Unread banner ── */
        .sn-banner{display:flex;align-items:center;gap:.7rem;padding:.85rem 1.1rem;background:linear-gradient(135deg,rgba(217,119,6,.07),rgba(245,158,11,.04));border:1px solid rgba(217,119,6,.2);border-radius:13px;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:snin .5s .10s cubic-bezier(.22,1,.36,1) forwards}
        .sn-banner-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#92400E,#D97706);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 8px rgba(217,119,6,.3)}
        .sn-banner-text strong{font-size:.86rem;font-weight:900;color:#111827;display:block;margin-bottom:.12rem}
        .sn-banner-text span{font-size:.76rem;font-weight:600;color:#6B7280}

        /* ── Panel ── */
        .sn-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:snin .5s .14s cubic-bezier(.22,1,.36,1) forwards}
        .sn-panel-head{padding:.9rem 1.1rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:nowrap}
        .sn-panel-titlerow{display:flex;align-items:center;gap:.5rem;min-width:0;flex:1}
        .sn-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .sn-panel-title{font-size:.7rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#1F2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sn-count-chip{font-size:.65rem;font-weight:900;padding:.15rem .5rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;flex-shrink:0}

        /* ── Reload btn ── */
        .sn-reload-btn{height:34px;padding:0 .8rem;border-radius:9px;background:rgba(254,242,242,.7);border:1.5px solid rgba(220,38,38,.18);color:#B91C1C;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.35rem;transition:all .18s;white-space:nowrap;flex-shrink:0}
        .sn-reload-btn:hover{background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}

        /* ── Message cell ── */
        .sn-tw{overflow-x:auto}
        .sn-table{width:100%;border-collapse:collapse;min-width:480px}
        .sn-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .sn-table th{padding:.75rem 1.1rem;font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.11em;color:#374151;background:rgba(254,242,242,.35);text-align:left;white-space:nowrap}
        .sn-table tbody tr{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s;animation:snin .35s cubic-bezier(.22,1,.36,1) both}
        .sn-table tbody tr.unread{background:rgba(255,251,235,.45)}
        .sn-table td{padding:1rem 1.1rem;font-size:.84rem;vertical-align:middle}

        .sn-msg-wrap{display:flex;align-items:center;gap:.65rem}
        .sn-unread-bar{width:3.5px;height:30px;border-radius:99px;background:linear-gradient(180deg,#D97706,#F59E0B);flex-shrink:0}
        .sn-msg-text{color:#0F172A;font-weight:800;font-size:.86rem;line-height:1.5}
        .sn-msg-text.read{color:#6B7280;font-weight:600;font-size:.84rem}

        .sn-badge{display:inline-flex;align-items:center;gap:.28rem;padding:.22rem .65rem;border-radius:99px;font-size:.7rem;font-weight:900;white-space:nowrap;border:1px solid}
        .sn-badge-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}

        .sn-date{font-family:'DM Mono',monospace;font-size:.74rem;font-weight:600;color:#9CA3AF;white-space:nowrap}

        /* ── Mobile cards ── */
        .sn-mob{display:none;flex-direction:column}
        @media(max-width:600px){.sn-tw{display:none}.sn-mob{display:flex}}
        .sn-mc{padding:1rem;border-bottom:1px solid rgba(220,38,38,.07);animation:snin .35s cubic-bezier(.22,1,.36,1) both}
        .sn-mc.unread{background:rgba(255,251,235,.45)}
        .sn-mc-top{display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.55rem}
        .sn-mc-footer{display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap}

        /* ── CORRECTION CHIRURGICALE : EMPTY STATE ── */
        .sn-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5rem 1.5rem;text-align:center}
        .sn-empty-ico-wrap{width:72px;height:72px;border-radius:50%;background:#FEF2F2;display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;color:#FCA5A5;box-shadow:0 4px 12px rgba(220,38,38,0.05)}
        .sn-empty-title{font-size:1.05rem;font-weight:800;color:#1E293B;margin-bottom:0.35rem;letter-spacing:-0.01em}
        .sn-empty-sub{font-size:0.82rem;font-weight:600;color:#94A3B8;max-width:240px;line-height:1.45}

        @keyframes snin{to{opacity:1;transform:translateY(0)}}
        @keyframes snspin{to{transform:rotate(360deg)}}

        @media (max-width: 400px) {
          .sn-stat-val { font-size: 1.3rem; }
          .sn-stat-lbl { font-size: 0.55rem; }
          .sn-reload-btn span { display: none; }
          .sn-reload-btn { width: 38px; justify-content: center; padding: 0; }
          .sn-reload-btn svg { margin: 0; }
        }
      `}</style>

      <div className="sn-wrap">

        {/* Header */}
        <div className="sn-header">
          <div className="sn-eyebrow"><div className="sn-dot" />Super Admin</div>
          <h1 className="sn-title">Centre de <span>notifications</span></h1>
        </div>

        {/* Stats */}
        <div className="sn-stats">
          {([
            { label: 'Total',    value: items.length, color: '#DC2626' },
            { label: 'Non lues', value: unreadCount,  color: '#D97706' },
            { label: 'Lues',     value: readCount,    color: '#059669' },
          ] as const).map(s => (
            <div key={s.label} className="sn-stat" style={{ borderTopColor: s.color }}>
              <div className="sn-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="sn-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Unread banner */}
        {unreadCount > 0 && (
          <div className="sn-banner">
            <div className="sn-banner-ico">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div className="sn-banner-text">
              <strong>
                {unreadCount}&nbsp;notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
              </strong>
              <span>Nouveaux messages &agrave; consulter.</span>
            </div>
          </div>
        )}

        {/* Panel */}
        <div className="sn-panel">
          <div className="sn-panel-head">
            <div className="sn-panel-titlerow">
              <div className="sn-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <span className="sn-panel-title">Toutes les notifications</span>
              {items.length > 0 && <span className="sn-count-chip">{items.length}</span>}
            </div>
            <button className="sn-reload-btn" onClick={() => void load()}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Actualiser</span>
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5rem', gap: '.75rem', color: '#6B7280', fontSize: '.85rem', fontWeight: 700 }}>
              <div style={{ width: 22, height: 22, border: '2.5px solid rgba(220,38,38,.12)', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'snspin .8s linear infinite' }} />
              Chargement...
            </div>
          ) : !error && items.length === 0 ? (
            /* ── BLOC REVU ET CENTRÉ ── */
            <div className="sn-empty">
              <div className="sn-empty-ico-wrap">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="sn-empty-title">Aucune notification</div>
              <div className="sn-empty-sub">Vous &ecirc;tes &agrave; jour, rien &agrave; afficher pour le moment.</div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="sn-tw">
                <table className="sn-table">
                  <thead>
                    <tr>
                      <th>Message</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((n, idx) => (
                      <tr key={n.id} className={n.isRead ? 'read' : 'unread'} style={{ animationDelay: `${idx * 30}ms` }}>
                        <td>
                          <div className="sn-msg-wrap">
                            {!n.isRead && <div className="sn-unread-bar" />}
                            <span className={`sn-msg-text${n.isRead ? ' read' : ''}`}>{n.message}</span>
                          </div>
                        </td>
                        <td>
                          <span className="sn-badge" style={{ 
                            color: n.isRead ? '#6B7280' : '#D97706', 
                            background: n.isRead ? '#F9FAFB' : '#FFFBEB', 
                            borderColor: n.isRead ? '#E5E7EB' : '#FDE68A' 
                          }}>
                            <span className="sn-badge-dot" style={{ background: n.isRead ? '#9CA3AF' : '#D97706' }} />
                            {n.isRead ? 'Lue' : 'Non lue'}
                          </span>
                        </td>
                        <td><span className="sn-date">{formatDate(n.createdAt)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sn-mob">
                {items.map((n, idx) => (
                  <div key={n.id} className={`sn-mc${n.isRead ? '' : ' unread'}`} style={{ animationDelay: `${idx * 30}ms` }}>
                    <div className="sn-mc-top">
                      {!n.isRead && <div className="sn-unread-bar" style={{ height: 36 }} />}
                      <span className={`sn-msg-text${n.isRead ? ' read' : ''}`} style={{ flex: 1 }}>{n.message}</span>
                    </div>
                    <div className="sn-mc-footer">
                      <span className="sn-badge" style={{ 
                        color: n.isRead ? '#6B7280' : '#D97706', 
                        background: n.isRead ? '#F9FAFB' : '#FFFBEB', 
                        borderColor: n.isRead ? '#E5E7EB' : '#FDE68A' 
                      }}>
                        <span className="sn-badge-dot" style={{ background: n.isRead ? '#9CA3AF' : '#D97706' }} />
                        {n.isRead ? 'Lue' : 'Non lue'}
                      </span>
                      <span className="sn-date">{formatDate(n.createdAt)}</span>
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