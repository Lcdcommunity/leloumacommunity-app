//web/app/(protected)/admin/approvals/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { formatDate } from '../../../../lib/format';

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\u2019instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

function Initials({ firstName, lastName }: { firstName: string; lastName: string }) {
  const txt = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: "'Cormorant Garamond', serif",
      fontSize: '0.95rem', fontWeight: 600,
      boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
    }}>
      {txt}
    </div>
  );
}

function RejectModal({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(4px)', zIndex: 100,
        animation: 'aafadein 0.2s ease',
      }} onClick={onCancel} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', zIndex: 101,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(18px)',
        borderRadius: 20, padding: 'clamp(1.5rem,4vw,2rem)',
        width: 'min(440px, calc(100vw - 2rem))',
        border: '1px solid rgba(37,99,235,0.1)',
        boxShadow: '0 24px 60px rgba(37,99,235,0.14)',
        animation: 'aapopin 0.3s cubic-bezier(.22,1,.36,1)',
      }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.35rem', fontWeight:600, color:'#111827', marginBottom:'0.35rem' }}>
          Rejeter ce compte
        </h2>
        <p style={{ fontSize:'0.82rem', color:'#6B7280', marginBottom:'1.25rem', fontWeight:500 }}>
          Compte de <strong style={{ color:'#111827' }}>{name}</strong> — précisez un motif optionnel.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motif du rejet (optionnel)&#8230;"
          rows={3}
          style={{
            width: '100%', borderRadius: 12, padding: '0.75rem 1rem',
            border: '1px solid rgba(220,38,38,0.25)',
            background: 'rgba(254,242,242,0.5)',
            fontFamily: "'DM Sans',sans-serif", fontSize: '0.84rem',
            color: '#111827', outline: 'none', resize: 'vertical',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor='rgba(220,38,38,0.5)'; e.target.style.boxShadow='0 0 0 3px rgba(220,38,38,0.09)'; }}
          onBlur={e  => { e.target.style.borderColor='rgba(220,38,38,0.25)'; e.target.style.boxShadow='none'; }}
        />
        <div style={{ display:'flex', gap:'0.6rem', marginTop:'1.1rem', justifyContent:'flex-end' }}>
          <button onClick={onCancel} style={{
            height:40, padding:'0 1.1rem', borderRadius:10,
            border:'1px solid rgba(37,99,235,0.15)', background:'rgba(249,250,251,0.9)',
            fontFamily:"'DM Sans',sans-serif", fontSize:'0.8rem', fontWeight:600, color:'#374151',
            cursor:'pointer',
          }}>
            Annuler
          </button>
          <button onClick={() => onConfirm(reason.trim())} style={{
            height:40, padding:'0 1.25rem', borderRadius:10,
            border:'none', background:'linear-gradient(135deg,#B91C1C,#DC2626)',
            fontFamily:"'DM Sans',sans-serif", fontSize:'0.8rem', fontWeight:700,
            color:'white', cursor:'pointer',
            boxShadow:'0 4px 12px rgba(220,38,38,0.3)',
          }}>
            Confirmer le rejet
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminApprovalsPage() {
  const [items,     setItems]     = useState<UserSummary[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [rejectTarget, setRejectTarget] = useState<UserSummary | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listPendingMemberApprovalsAntenna({ page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleApprove(userId: string) {
    setLoadingId(userId);
    try {
      await api.approveMemberAccountAntenna(userId);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(userId: string, reason?: string) {
    setLoadingId(userId);
    setRejectTarget(null);
    try {
      await api.rejectMemberAccountAntenna(userId, reason);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  const filtered = items.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Validations comptes">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .aa-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 980px; margin: 0 auto;
        }

        /* Header */
        .aa-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          flex-wrap: wrap; gap: 1rem; margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: aain 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .aa-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .aa-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: aapulse 2s ease-in-out infinite; }
        @keyframes aapulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .aa-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .aa-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        /* Stats chips */
        .aa-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .aa-chip {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.4rem 0.85rem; border-radius: 99px;
          font-size: 0.72rem; font-weight: 700; border: 1px solid;
        }

        /* Toolbar */
        .aa-toolbar {
          display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;
          margin-bottom: 1.1rem;
          opacity: 0; transform: translateY(10px);
          animation: aain 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .aa-search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 340px; }
        .aa-search-ico { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .aa-search {
          width: 100%; height: 42px; border-radius: 11px;
          border: 1px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.85);
          padding: 0 1rem 0 2.4rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.84rem; color: #111827;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .aa-search:focus { border-color: rgba(37,99,235,0.45); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: white; }
        .aa-search::placeholder { color: rgba(107,114,128,0.5); }

        .aa-reload-btn {
          height: 42px; padding: 0 1rem; border-radius: 11px;
          border: 1px solid rgba(37,99,235,0.15); background: rgba(255,255,255,0.85);
          display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: #374151;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 600;
          transition: all 0.18s; white-space: nowrap;
        }
        .aa-reload-btn:hover { background: #EFF6FF; border-color: rgba(37,99,235,0.3); color: #1D4ED8; }

        /* Panel */
        .aa-panel {
          background: rgba(253,253,255,0.93);
          backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px);
          animation: aain 0.5s 0.15s cubic-bezier(.22,1,.36,1) forwards;
        }

        /* Table */
        .aa-table { width: 100%; border-collapse: collapse; }
        .aa-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.09); }
        .aa-table thead th {
          padding: 0.85rem 1.25rem;
          font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: #374151; text-align: left;
          background: rgba(248,250,252,0.6);
        }
        .aa-table tbody tr {
          border-bottom: 1px solid rgba(37,99,235,0.055);
          transition: background 0.15s;
          animation: aain 0.4s cubic-bezier(.22,1,.36,1) both;
        }
        .aa-table tbody tr:last-child { border-bottom: none; }
        .aa-table tbody tr:hover { background: rgba(37,99,235,0.025); }
        .aa-table td { padding: 0.9rem 1.25rem; vertical-align: middle; }

        /* Member info */
        .aa-member { display: flex; align-items: center; gap: 0.75rem; }
        .aa-member-name { font-size: 0.88rem; font-weight: 700; color: #0F172A; }
        .aa-member-email { font-size: 0.72rem; color: #6B7280; font-weight: 500; margin-top: 1px; }
        .aa-member-date { font-size: 0.7rem; color: #9CA3AF; font-weight: 500; margin-top: 2px; }

        /* Date column */
        .aa-date { font-size: 0.78rem; color: #4B5563; font-weight: 600; }
        .aa-date-ago { font-size: 0.68rem; color: #9CA3AF; font-weight: 500; margin-top: 2px; }

        /* Actions */
        .aa-actions { display: flex; gap: 0.45rem; }
        .aa-approve-btn {
          height: 34px; padding: 0 0.9rem; border-radius: 9px;
          border: none; background: linear-gradient(135deg,#059669,#10B981);
          color: white; font-family: 'DM Sans',sans-serif;
          font-size: 0.74rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 0.35rem;
          box-shadow: 0 2px 8px rgba(5,150,105,0.3);
          transition: all 0.18s; white-space: nowrap;
        }
        .aa-approve-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(5,150,105,0.4); }
        .aa-approve-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .aa-reject-btn {
          height: 34px; padding: 0 0.9rem; border-radius: 9px;
          border: 1.5px solid rgba(220,38,38,0.25);
          background: rgba(254,242,242,0.7);
          color: #DC2626; font-family: 'DM Sans',sans-serif;
          font-size: 0.74rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 0.35rem;
          transition: all 0.18s; white-space: nowrap;
        }
        .aa-reject-btn:hover:not(:disabled) { background: #FEE2E2; border-color: rgba(220,38,38,0.45); transform: translateY(-1px); }
        .aa-reject-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Spinner */
        .aa-btn-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: aaspin 0.7s linear infinite; }
        @keyframes aaspin { to { transform: rotate(360deg); } }

        /* Empty / loader */
        .aa-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3.5rem 1rem; gap: 0.75rem; color: #9CA3AF; }
        .aa-empty-ico { width: 52px; height: 52px; border-radius: 50%; background: #F3F4F6; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; }
        .aa-empty p { font-size: 0.82rem; font-weight: 600; }

        .aa-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; font-weight: 600; }
        .aa-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: aaspin 0.8s linear infinite; }

        /* Error */
        .aa-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }

        /* Mobile card layout */
        .aa-mobile-cards { display: none; }
        @media (max-width: 700px) {
          .aa-table-wrap { display: none; }
          .aa-mobile-cards { display: flex; flex-direction: column; }
        }
        .aa-mcard {
          padding: 1rem 1.25rem; border-bottom: 1px solid rgba(37,99,235,0.07);
          animation: aain 0.4s cubic-bezier(.22,1,.36,1) both;
        }
        .aa-mcard:last-child { border-bottom: none; }
        .aa-mcard-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
        .aa-mcard-meta { font-size: 0.72rem; color: #6B7280; font-weight: 500; margin-bottom: 0.75rem; display: flex; gap: 1rem; flex-wrap: wrap; }
        .aa-mcard-actions { display: flex; gap: 0.5rem; }

        @keyframes aain { to { opacity: 1; transform: translateY(0); } }
        @keyframes aafadein { from{opacity:0;} to{opacity:1;} }
        @keyframes aapopin { from{opacity:0;transform:translate(-50%,-50%) scale(0.92);} to{opacity:1;transform:translate(-50%,-50%) scale(1);} }
      `}</style>

      <div className="aa-wrap">

        {/* Header */}
        <div className="aa-header">
          <div>
            <div className="aa-eyebrow"><div className="aa-eyebrow-dot" />Admin antenne</div>
            <h1 className="aa-title">Comptes <span>en attente</span></h1>
          </div>
          <div className="aa-chips">
            <span className="aa-chip" style={{ background:'#FFFBEB', color:'#D97706', borderColor:'#FDE68A' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#D97706' }} />
              {items.length} en attente
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="aa-error">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="aa-toolbar">
          <div className="aa-search-wrap">
            <span className="aa-search-ico">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            </span>
            <input
              className="aa-search"
              type="text"
              placeholder="Rechercher un membre&#8230;"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="aa-reload-btn" onClick={() => void load()}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualiser
          </button>
        </div>

        {/* Panel */}
        <div className="aa-panel">
          {loading ? (
            <div className="aa-loader"><div className="aa-ring" />Chargement&#8230;</div>
          ) : filtered.length === 0 ? (
            <div className="aa-empty">
              <div className="aa-empty-ico">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p>{search ? 'Aucun r\u00e9sultat pour cette recherche' : 'Aucun compte en attente \u2014 tout est \u00e0 jour\u00a0!'}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="aa-table-wrap">
                <table className="aa-table">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Inscription</th>
                      <th style={{ textAlign:'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr key={u.id} style={{ animationDelay:`${i * 0.04}s` }}>
                        <td>
                          <div className="aa-member">
                            <Initials firstName={u.firstName} lastName={u.lastName} />
                            <div>
                              <div className="aa-member-name">{u.firstName} {u.lastName}</div>
                              <div className="aa-member-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="aa-date">{formatDate(u.createdAt)}</div>
                          <div className="aa-date-ago">{timeAgo(u.createdAt)}</div>
                        </td>
                        <td>
                          <div className="aa-actions" style={{ justifyContent:'flex-end' }}>
                            <button
                              className="aa-approve-btn"
                              disabled={loadingId === u.id}
                              onClick={() => void handleApprove(u.id)}
                            >
                              {loadingId === u.id
                                ? <div className="aa-btn-spinner" />
                                : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                              }
                              Approuver
                            </button>
                            <button
                              className="aa-reject-btn"
                              disabled={loadingId === u.id}
                              onClick={() => setRejectTarget(u)}
                            >
                              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                              Rejeter
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="aa-mobile-cards">
                {filtered.map((u, i) => (
                  <div key={u.id} className="aa-mcard" style={{ animationDelay:`${i * 0.04}s` }}>
                    <div className="aa-mcard-top">
                      <Initials firstName={u.firstName} lastName={u.lastName} />
                      <div>
                        <div className="aa-member-name">{u.firstName} {u.lastName}</div>
                        <div className="aa-member-email">{u.email}</div>
                      </div>
                    </div>
                    <div className="aa-mcard-meta">
                      <span>Inscrit le {formatDate(u.createdAt)}</span>
                      <span>{timeAgo(u.createdAt)}</span>
                    </div>
                    <div className="aa-mcard-actions">
                      <button
                        className="aa-approve-btn"
                        disabled={loadingId === u.id}
                        onClick={() => void handleApprove(u.id)}
                        style={{ flex:1, justifyContent:'center' }}
                      >
                        {loadingId === u.id
                          ? <div className="aa-btn-spinner" />
                          : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        }
                        Approuver
                      </button>
                      <button
                        className="aa-reject-btn"
                        disabled={loadingId === u.id}
                        onClick={() => setRejectTarget(u)}
                        style={{ flex:1, justifyContent:'center' }}
                      >
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        Rejeter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          name={`${rejectTarget.firstName} ${rejectTarget.lastName}`}
          onConfirm={reason => void handleReject(rejectTarget.id, reason || undefined)}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </AppShell>
  );
}