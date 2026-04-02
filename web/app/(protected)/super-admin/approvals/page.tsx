//web/app/(protected)/super-admin/approvals/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { PendingAccountsTable } from '../../../../components/super-admin/PendingAccountsTable';

/* ══════════════════════════════════════════════════════ REJECT MODAL */
function RejectModal({
  user,
  onConfirm,
  onCancel,
  busy,
}: {
  user: UserSummary;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }}
        onClick={onCancel}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 101, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(18px)',
        borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)',
        width: 'min(460px,calc(100vw - 2rem))',
        border: '1px solid rgba(220,38,38,.15)',
        boxShadow: '0 24px 60px rgba(220,38,38,.12)',
      }}>
        {/* Icon */}
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          background: '#FEF2F2', border: '1px solid #FECACA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.35rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.3rem' }}>
          Rejeter ce compte&nbsp;?
        </h2>
        <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.25rem', fontWeight: 600, lineHeight: 1.55 }}>
          <strong style={{ color: '#111827' }}>{user.firstName} {user.lastName}</strong>
          <br />
          <span style={{ fontSize: '.75rem' }}>{user.email}</span>
        </p>

        {/* Reason textarea */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 800, color: '#374151', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
            Motif du rejet <span style={{ fontSize: '.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex&nbsp;: Dossier incomplet, informations non v&eacute;rifiables&#8230;"
            rows={3}
            style={{
              width: '100%', borderRadius: 11, border: '1px solid rgba(220,38,38,.2)',
              background: 'rgba(255,255,255,.9)', padding: '.75rem .9rem',
              fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 500,
              color: '#111827', outline: 'none', resize: 'vertical',
              transition: 'border-color .2s, box-shadow .2s', boxSizing: 'border-box',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,.45)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(220,38,38,.08)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(220,38,38,.2)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel} disabled={busy}
            style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid rgba(220,38,38,.18)', background: 'rgba(249,250,251,.95)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason.trim())} disabled={busy}
            style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.35)', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}
          >
            {busy && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spspin .7s linear infinite' }} />}
            Confirmer le rejet
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminApprovalsPage() {
  const [items,        setItems]        = useState<UserSummary[]>([]);
  const [loadingId,    setLoadingId]    = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<UserSummary | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.listMembers({ status: 'PENDING_APPROVAL', page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function approve(userId: string) {
    setLoadingId(userId);
    try {
      await api.approveMemberAccount(userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur approbation');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRejectConfirm(userId: string, reason: string) {
    setRejectTarget(null);
    setLoadingId(userId);
    try {
      await api.rejectMemberAccount(userId, reason || undefined);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur rejet');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <AppShell title="Validation des comptes membres">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .sp-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1100px;margin:0 auto;box-sizing:border-box}

        /* Header */
        .sp-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:spin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .sp-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sp-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:sppulse 2s ease-in-out infinite}
        @keyframes sppulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sp-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15;margin:0}
        .sp-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* Stats - MAINTEANT SUR UNE LIGNE FIXE */
        .sp-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:spin .5s .08s cubic-bezier(.22,1,.36,1) forwards;width:100%}
        .sp-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem 1rem;display:flex;flex-direction:column;justify-content:center}
        .sp-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .sp-stat-lbl{font-size:.65rem;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

        /* Urgency banner */
        .sp-urgent{display:flex;align-items:center;gap:.7rem;padding:.85rem 1.1rem;background:linear-gradient(135deg,rgba(220,38,38,.07),rgba(239,68,68,.04));border:1px solid rgba(220,38,38,.2);border-radius:13px;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:spin .5s .1s cubic-bezier(.22,1,.36,1) forwards}
        .sp-urgent-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 8px rgba(220,38,38,.3)}
        .sp-urgent-text strong{font-size:.85rem;font-weight:800;color:#111827;display:block;margin-bottom:.1rem}
        .sp-urgent-text span{font-size:.75rem;font-weight:600;color:#6B7280}

        /* Panel */
        .sp-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:spin .5s .14s cubic-bezier(.22,1,.36,1) forwards}
        
        /* Panel Head - FORCÉ SUR UNE LIGNE */
        .sp-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;flex-wrap:nowrap;gap:.5rem}
        .sp-panel-titlerow{display:flex;align-items:center;gap:.55rem;min-width:0;flex:1}
        .sp-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .sp-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sp-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA;flex-shrink:0}

        /* Reload btn */
        .sp-reload-btn{flex-shrink:0;height:34px;padding:0 .9rem;border-radius:9px;background:rgba(254,242,242,.7);border:1.5px solid rgba(220,38,38,.18);color:#B91C1C;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.35rem;transition:all .18s;white-space:nowrap}
        .sp-reload-btn:hover{background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}

        /* Error */
        .sp-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}

        /* Empty */
        .sp-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .sp-empty-title{font-size:.9rem;font-weight:800;color:#374151}
        .sp-empty-sub{font-size:.78rem;font-weight:600;color:#9CA3AF}

        /* Responsive Mobile Ajustements Chirurgicaux */
        @media(max-width:540px){
          .sp-stats{gap:0.4rem; margin-bottom:1rem;}
          .sp-stat{padding:0.7rem 0.4rem;}
          .sp-stat-val{font-size:1.3rem;}
          .sp-stat-lbl{font-size:0.5rem;}
          
          .sp-panel-head{padding:0.8rem 0.6rem; gap:0.4rem;}
          .sp-panel-title{font-size:0.65rem;}
          .sp-reload-btn{padding:0 0.6rem; height:32px; font-size:0.7rem;}
          .btn-text{display:none;} /* Cache le mot 'Actualiser' */
        }

        @keyframes spin{to{opacity:1;transform:translateY(0)}}
        @keyframes spspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="sp-wrap">

        {/* Header */}
        <div className="sp-header">
          <div className="sp-eyebrow"><div className="sp-dot" />Super Admin</div>
          <h1 className="sp-title">Validation des <span>comptes</span></h1>
        </div>

        {/* Stats */}
        <div className="sp-stats">
          {([
            { label: 'En attente',   value: items.length,  color: '#DC2626' },
            { label: 'À approuver',  value: items.length,  color: '#D97706' },
            { label: 'Traités',      value: 0,             color: '#059669' }, // "Aujourd'hui" retiré pour faire plus propre
          ] as const).map(s => (
            <div key={s.label} className="sp-stat" style={{ borderTopColor: s.color }}>
              <div className="sp-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="sp-stat-lbl" title={s.label}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Urgency banner — only when there are pending items */}
        {items.length > 0 && (
          <div className="sp-urgent">
            <div className="sp-urgent-ico">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div className="sp-urgent-text">
              <strong>{items.length} compte{items.length > 1 ? 's' : ''} en attente d&apos;approbation</strong>
              <span>Ces membres ne peuvent pas acc&eacute;der &agrave; la plateforme tant que leur compte n&apos;est pas valid&eacute;.</span>
            </div>
          </div>
        )}

        {/* Panel */}
        <div className="sp-panel">
          <div className="sp-panel-head">
            <div className="sp-panel-titlerow">
              <div className="sp-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="sp-panel-title">Comptes en attente d&apos;approbation</span>
              {items.length > 0 && <span className="sp-count-chip">{items.length}</span>}
            </div>
            <button className="sp-reload-btn" onClick={() => void load()}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="btn-text">Actualiser</span>
            </button>
          </div>

          {error && (
            <div className="sp-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {!error && items.length === 0 ? (
            <div className="sp-empty">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#D1FAE5" strokeWidth="1.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="sp-empty-title">Tout est &agrave; jour !</div>
              <div className="sp-empty-sub">Aucun compte en attente d&apos;approbation.</div>
            </div>
          ) : (
            <PendingAccountsTable
              items={items}
              onApprove={async (userId: string) => { await approve(userId); }}
              onReject={async (userId: string) => {
                const target = items.find(u => u.id === userId);
                if (target) setRejectTarget(target);
              }}
              loadingId={loadingId}
            />
          )}
        </div>
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          user={rejectTarget}
          busy={loadingId === rejectTarget.id}
          onConfirm={(reason) => void handleRejectConfirm(rejectTarget.id, reason)}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </AppShell>
  );
}