// web/app/(protected)/admin/notifications/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { NotificationItem } from '../../../../types/notification';
import { formatDate } from '../../../../lib/format';

type Filter = 'all' | 'unread' | 'read';

function getTypeStyle(type?: string | null) {
  switch (type) {
    case 'CONTRIBUTION_VALIDATED':    return { emoji: '✅', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    case 'CONTRIBUTION_SUBMITTED':    return { emoji: '💰', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
    case 'CONTRIBUTION_REJECTED':     return { emoji: '❌', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    case 'ACCOUNT_APPROVED':
    case 'ACCOUNT_ACTIVATED':         return { emoji: '🎉', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    case 'ACCOUNT_SUSPENDED':         return { emoji: '🚫', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    case 'ACCOUNT_REJECTED':          return { emoji: '⛔', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    case 'PROJECT_PROPOSAL_APPROVED': return { emoji: '🎯', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' };
    case 'PROJECT_PROPOSAL_REJECTED': return { emoji: '🚫', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    case 'PROJECT_PROPOSAL_SUBMITTED':return { emoji: '💡', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
    case 'NEWS_PUBLISHED':            return { emoji: '📢', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    case 'DOCUMENT_PUBLISHED':        return { emoji: '📄', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
    case 'PROJECT_CREATED':
    case 'PROJECT_UPDATED':           return { emoji: '🏗️', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' };
    case 'SYSTEM_ALERT':              return { emoji: '⚠️', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
    default:                          return { emoji: '🔔', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
  }
}

function typeLabel(type?: string | null): string {
  const MAP: Record<string, string> = {
    CONTRIBUTION_VALIDATED:    'Cotisation validée',
    CONTRIBUTION_SUBMITTED:    'Cotisation soumise',
    CONTRIBUTION_REJECTED:     'Cotisation rejetée',
    ACCOUNT_APPROVED:          'Compte approuvé',
    ACCOUNT_ACTIVATED:         'Compte activé',
    ACCOUNT_SUSPENDED:         'Compte suspendu',
    ACCOUNT_REJECTED:          'Compte rejeté',
    PROJECT_PROPOSAL_APPROVED: 'Proposition approuvée',
    PROJECT_PROPOSAL_REJECTED: 'Proposition rejetée',
    PROJECT_PROPOSAL_SUBMITTED:'Proposition soumise',
    NEWS_PUBLISHED:            'Actualité publiée',
    DOCUMENT_PUBLISHED:        'Document publié',
    PROJECT_CREATED:           'Projet créé',
    PROJECT_UPDATED:           'Projet mis à jour',
    SYSTEM_ALERT:              'Alerte système',
  };
  if (!type) return 'Notification';
  return MAP[type] ?? type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

const callDelete = (id: string) =>
  (api as unknown as { deleteNotification?: (id: string) => Promise<void> })
    .deleteNotification?.(id) ?? fetch(`/api/notifications/${id}`, { method: 'DELETE' });

export default function AdminNotificationsPage() {
  const [items,      setItems]      = useState<NotificationItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [filter,     setFilter]     = useState<Filter>('all');
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [busyIds,    setBusyIds]    = useState<Set<string>>(new Set());
  const [bulkBusy,   setBulkBusy]   = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2600);
  };

  const addBusy    = (id: string) => setBusyIds(p => new Set(p).add(id));
  const removeBusy = (id: string) => setBusyIds(p => { const s = new Set(p); s.delete(id); return s; });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.listNotifications();
      const data = Array.isArray(res) ? res : (res?.items ?? []);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: string) => {
    addBusy(id);
    try {
      await api.markNotificationRead(id);
      setItems(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
    } finally { removeBusy(id); }
  };

  const deleteOne = async (id: string) => {
    addBusy(id);
    try {
      await callDelete(id);
      setItems(p => p.filter(n => n.id !== id));
      setSelected(p => { const s = new Set(p); s.delete(id); return s; });
      showToast('Notification supprimée');
    } catch { showToast('Erreur suppression', false); }
    finally { removeBusy(id); }
  };

  const markAllRead = async () => {
    setBulkBusy(true);
    const unread = items.filter(n => !n.isRead);
    try {
      await Promise.all(unread.map(n => api.markNotificationRead(n.id)));
      setItems(p => p.map(n => ({ ...n, isRead: true })));
      showToast(`${unread.length} notification${unread.length > 1 ? 's' : ''} marquée${unread.length > 1 ? 's' : ''} lues`);
    } finally { setBulkBusy(false); }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map(callDelete));
      const c = ids.length;
      setItems(p => p.filter(n => !selected.has(n.id)));
      setSelected(new Set()); setSelectMode(false);
      showToast(`${c} notification${c > 1 ? 's' : ''} supprimée${c > 1 ? 's' : ''}`);
    } catch { showToast('Erreur suppression', false); }
    finally { setBulkBusy(false); }
  };

  const deleteAll = async () => {
    if (!window.confirm('Supprimer toutes les notifications ?')) return;
    setBulkBusy(true);
    try {
      await Promise.all(items.map(n => callDelete(n.id)));
      setItems([]); setSelected(new Set()); setSelectMode(false);
      showToast('Toutes les notifications supprimées');
    } catch { showToast('Erreur suppression', false); }
    finally { setBulkBusy(false); }
  };

  const toggleSel = (id: string) => setSelected(p => {
    const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  const displayed   = items.filter(n => filter === 'unread' ? !n.isRead : filter === 'read' ? n.isRead : true);
  const unreadCount = items.filter(n => !n.isRead).length;
  const allSel      = !!displayed.length && selected.size === displayed.length;

  const ICO_DEL = <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
  const ICO_CHK = <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
  const ICO_SEL = <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="4" height="4" rx="1" strokeLinecap="round"/><rect x="10" y="3" width="4" height="4" rx="1" strokeLinecap="round"/><rect x="3" y="10" width="4" height="4" rx="1" strokeLinecap="round"/><rect x="10" y="10" width="4" height="4" rx="1" strokeLinecap="round"/></svg>;
  const SPIN = (c: string) => <div style={{width:10,height:10,border:`2px solid ${c}33`,borderTopColor:c,borderRadius:'50%',animation:'anfspin .7s linear infinite'}}/>;

  return (
    <AppShell title="Notifications">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;500;600;700;800;900&family=DM+Mono:wght@500&display=swap');

        @keyframes anfin  {from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes anfspin{to{transform:rotate(360deg)}}
        @keyframes anfpop {from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
        @keyframes anfpulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes anftoast{0%{opacity:0;transform:translateX(-50%) translateY(10px)} 12%,82%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-6px)}}

        .anf-wrap{font-family:'DM Sans',sans-serif;padding:clamp(.85rem,3vw,1.5rem);max-width:700px;margin:0 auto;padding-bottom:6rem}

        .anf-header{margin-bottom:1.1rem;opacity:0;animation:anfin .4s .03s cubic-bezier(.22,1,.36,1) forwards}
        .anf-eyebrow{font-size:.59rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.2rem;display:flex;align-items:center;gap:.32rem}
        .anf-eyedot{width:5px;height:5px;background:#3B82F6;border-radius:50%;animation:anfpulse 2s ease-in-out infinite}
        .anf-titlerow{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap}
        .anf-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,4vw,1.8rem);font-weight:700;color:#0F172A;letter-spacing:-.02em;margin:0;line-height:1.1}
        .anf-title span{color:#2563EB}
        .anf-pill{display:inline-flex;align-items:center;justify-content:center;min-width:21px;height:21px;padding:0 .42rem;background:#DC2626;color:white;border-radius:99px;font-size:.65rem;font-weight:900;animation:anfpop .3s cubic-bezier(.22,1,.36,1)}

        .anf-stats{display:flex;gap:.4rem;margin-bottom:1rem;flex-wrap:wrap;opacity:0;animation:anfin .4s .055s cubic-bezier(.22,1,.36,1) forwards}
        .anf-stat{background:white;border:1px solid #E2E8F0;border-radius:9px;padding:.35rem .65rem;display:flex;align-items:center;gap:.35rem;box-shadow:0 1px 2px rgba(0,0,0,.03)}
        .anf-sn{font-family:'DM Mono',monospace;font-size:.95rem;font-weight:700;line-height:1}
        .anf-sl{font-size:.56rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.05em}

        .anf-bar{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem;opacity:0;animation:anfin .4s .08s cubic-bezier(.22,1,.36,1) forwards}
        .anf-tabs{display:flex;gap:.18rem;background:#F1F5F9;padding:.18rem;border-radius:9px}
        .anf-tab{border:none;background:transparent;padding:.25rem .58rem;border-radius:7px;font-size:.68rem;font-weight:700;color:#64748B;cursor:pointer;transition:all .12s;white-space:nowrap}
        .anf-tab.on{background:white;color:#2563EB;box-shadow:0 1px 3px rgba(0,0,0,.08)}

        .ab{height:30px;padding:0 .68rem;border-radius:8px;border:1px solid;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.28rem;transition:all .12s;white-space:nowrap}
        .ab:disabled{opacity:.42;cursor:not-allowed}
        .ab-b{background:#EFF6FF;color:#2563EB;border-color:#BFDBFE}.ab-b:hover:not(:disabled){background:#DBEAFE;border-color:#2563EB}
        .ab-r{background:#FEF2F2;color:#DC2626;border-color:#FECACA}.ab-r:hover:not(:disabled){background:#FEE2E2;border-color:#DC2626}
        .ab-s{background:#F8FAFC;color:#475569;border-color:#CBD5E1}.ab-s:hover:not(:disabled){background:#F1F5F9;border-color:#94A3B8}
        .ab-a{background:#FFFBEB;color:#D97706;border-color:#FDE68A}.ab-a:hover:not(:disabled){background:#FEF3C7;border-color:#D97706}
        .anf-sc{font-size:.68rem;font-weight:700;color:#7C3AED;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:99px;padding:.16rem .55rem;white-space:nowrap}

        .anf-panel{background:white;border-radius:16px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,.04);overflow:hidden;opacity:0;animation:anfin .4s .11s cubic-bezier(.22,1,.36,1) forwards}

        .anf-selbar{display:flex;align-items:center;gap:.6rem;padding:.55rem 1rem;background:#F8FAFC;border-bottom:1px solid #E2E8F0}
        .anf-chk{width:15px;height:15px;accent-color:#2563EB;cursor:pointer}

        .anf-item{display:flex;align-items:center;gap:.7rem;padding:.75rem 1rem;border-bottom:1px solid #F1F5F9;transition:background .1s;position:relative}
        .anf-item:last-child{border-bottom:none}
        .anf-item.unread{background:#EFF6FF}
        .anf-item.unread:hover{background:#DBEAFE}
        .anf-item.read:hover{background:#F8FAFC}
        .anf-item.sel{background:#F5F3FF!important}
        .anf-item.sm{cursor:pointer}

        .anf-leftbar{position:absolute;left:0;top:18%;bottom:18%;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,#3B82F6,#2563EB)}

        .anf-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;border:1px solid}

        /* Texte resserré */
        .anf-ct{flex:1;min-width:0}
        .anf-msg{font-size:.82rem;color:#1E293B;line-height:1.35;font-weight:500;margin:0 0 .22rem;word-break:break-word}
        .anf-item.read .anf-msg{color:#64748B;font-weight:400}
        .anf-meta{display:flex;align-items:center;gap:.38rem;flex-wrap:wrap}
        .anf-tag{font-size:.57rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:.1rem .38rem;border-radius:99px;border:1px solid}
        .anf-date{font-size:.61rem;color:#94A3B8;font-weight:500}

        .anf-acts{display:flex;gap:.22rem;align-items:center;flex-shrink:0;opacity:0;transition:opacity .12s}
        .anf-item:hover .anf-acts{opacity:1}
        @media(max-width:600px){.anf-acts{opacity:1}}
        .aib{width:27px;height:27px;border-radius:7px;border:1px solid;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
        .aib:disabled{opacity:.35;cursor:not-allowed}
        .aib.rd{color:#2563EB;border-color:#BFDBFE}.aib.rd:hover{background:#EFF6FF}
        .aib.dl{color:#DC2626;border-color:#FECACA}.aib.dl:hover{background:#FEF2F2}

        .anf-load{display:flex;align-items:center;justify-content:center;padding:2.5rem;gap:.5rem;color:#64748B;font-size:.8rem}
        .anf-ring{width:19px;height:19px;border:2px solid #E2E8F0;border-top-color:#2563EB;border-radius:50%;animation:anfspin .8s linear infinite}
        .anf-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1.5rem;gap:.5rem}
        .anf-empty-e{font-size:1.9rem}
        .anf-empty-t{font-size:.85rem;font-weight:700;color:#374151;margin:0}
        .anf-empty-s{font-size:.72rem;color:#94A3B8;margin:0;text-align:center}
        .anf-err{background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:.7rem .9rem;color:#B91C1C;font-size:.76rem;font-weight:600;display:flex;align-items:center;gap:.42rem;margin-bottom:.8rem}

        .anf-toast{position:fixed;bottom:5.5rem;left:50%;transform:translateX(-50%);border-radius:99px;padding:.52rem 1.1rem;font-size:.74rem;font-weight:700;white-space:nowrap;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.2);animation:anftoast 2.6s ease forwards;pointer-events:none;color:white}

        @media(max-width:480px){
          .anf-sl{display:none}
          .anf-title{font-size:1.35rem}
        }
      `}</style>

      <div className="anf-wrap">

        {/* ── Header ── */}
        <div className="anf-header">
          <div className="anf-eyebrow"><div className="anf-eyedot"/>Admin antenne</div>
          <div className="anf-titlerow">
            <h1 className="anf-title">Mes <span>notifications</span></h1>
            {unreadCount > 0 && <span className="anf-pill">{unreadCount}</span>}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="anf-stats">
          {[
            {n: items.length,                     l: 'Total',    c: '#0F172A'},
            {n: unreadCount,                      l: 'Non lues', c: '#DC2626'},
            {n: items.filter(x=>x.isRead).length, l: 'Lues',     c: '#059669'},
          ].map(s=>(
            <div key={s.l} className="anf-stat">
              <span className="anf-sn" style={{color:s.c}}>{s.n}</span>
              <span className="anf-sl">{s.l}</span>
            </div>
          ))}
        </div>

        {/* ── Barre d'outils ── */}
        <div className="anf-bar">
          <div className="anf-tabs">
            {(['all','unread','read'] as Filter[]).map(f=>(
              <button key={f} className={`anf-tab${filter===f?' on':''}`} onClick={()=>setFilter(f)}>
                {f==='all'?'Toutes':f==='unread'?'Non lues':'Lues'}
              </button>
            ))}
          </div>

          <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginLeft:'auto'}}>
            {selectMode && selected.size>0 && (
              <>
                <span className="anf-sc">{selected.size} sél.</span>
                <button className="ab ab-r" disabled={bulkBusy} onClick={()=>void deleteSelected()}>{ICO_DEL} Supprimer</button>
              </>
            )}
            {unreadCount>0 && (
              <button className="ab ab-b" disabled={bulkBusy} onClick={()=>void markAllRead()}>{ICO_CHK} Tout lire</button>
            )}
            <button className={`ab ${selectMode?'ab-a':'ab-s'}`} onClick={()=>{setSelectMode(v=>!v);setSelected(new Set())}}>
              {ICO_SEL} {selectMode?'Annuler':'Sélectionner'}
            </button>
            {items.length>0 && (
              <button className="ab ab-r" disabled={bulkBusy} onClick={()=>void deleteAll()}>{ICO_DEL} Tout supprimer</button>
            )}
          </div>
        </div>

        {error && (
          <div className="anf-err">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
            {error}
          </div>
        )}

        {/* ── Panel ── */}
        <div className="anf-panel">

          {selectMode && displayed.length>0 && (
            <div className="anf-selbar">
              <input type="checkbox" className="anf-chk" checked={allSel}
                onChange={()=>allSel?setSelected(new Set()):setSelected(new Set(displayed.map(n=>n.id)))}/>
              <span style={{fontSize:'.67rem',fontWeight:700,color:'#475569'}}>
                {allSel?'Tout désélectionner':`Tout sélectionner (${displayed.length})`}
              </span>
            </div>
          )}

          {loading ? (
            <div className="anf-load"><div className="anf-ring"/>Chargement…</div>
          ) : displayed.length===0 ? (
            <div className="anf-empty">
              <span className="anf-empty-e">🔕</span>
              <p className="anf-empty-t">
                {filter==='unread'?'Aucune notification non lue':filter==='read'?'Aucune notification lue':'Aucune notification'}
              </p>
              <p className="anf-empty-s">Vous êtes à jour.</p>
            </div>
          ) : displayed.map((n,i) => {
            const ts   = getTypeStyle(n.type);
            const isSel= selected.has(n.id);
            const busy = busyIds.has(n.id);
            return (
              <div
                key={n.id}
                className={`anf-item${n.isRead?' read':' unread'}${isSel?' sel':''}${selectMode?' sm':''}`}
                style={{animationDelay:`${i*.022}s`}}
                onClick={selectMode?()=>toggleSel(n.id):undefined}
              >
                {!n.isRead && <div className="anf-leftbar"/>}

                {selectMode && (
                  <input type="checkbox" className="anf-chk" checked={isSel}
                    onChange={()=>toggleSel(n.id)}
                    onClick={e=>e.stopPropagation()}/>
                )}

                <div className="anf-ico" style={{background:ts.bg,borderColor:ts.border}}>
                  {ts.emoji}
                </div>

                <div className="anf-ct">
                  <p className="anf-msg">{n.message}</p>
                  <div className="anf-meta">
                    <span className="anf-tag" style={{color:ts.color,background:ts.bg,borderColor:ts.border}}>
                      {typeLabel(n.type)}
                    </span>
                    <span className="anf-date">{formatDate(n.createdAt)}</span>
                  </div>
                </div>

                {!selectMode && (
                  <div className="anf-acts">
                    {!n.isRead && (
                      <button className="aib rd" disabled={busy}
                        onClick={e=>{e.stopPropagation();void markRead(n.id)}}
                        title="Marquer comme lue">
                        {busy ? SPIN('#2563EB') : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>}
                      </button>
                    )}
                    <button className="aib dl" disabled={busy}
                      onClick={e=>{e.stopPropagation();void deleteOne(n.id)}}
                      title="Supprimer">
                      {busy ? SPIN('#DC2626') : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div className="anf-toast" style={{background: toast.ok ? '#0F172A' : '#7F1D1D'}}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}
    </AppShell>
  );
}