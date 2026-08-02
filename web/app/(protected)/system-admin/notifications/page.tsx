// web/app/(protected)/system-admin/notifications/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
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
    default:                          return { emoji: '🔔', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' };
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

export default function SystemAdminNotificationsPage() {
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

  useEffect(() => {
    const timerId = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timerId);
  }, [load]);

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
      await api.deleteNotification(id);
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
      await Promise.all(ids.map(id => api.deleteNotification(id)));
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
      await Promise.all(items.map(n => api.deleteNotification(n.id)));
      setItems([]); setSelected(new Set()); setSelectMode(false);
      showToast('Toutes les notifications supprimées');
    } catch { showToast('Erreur suppression', false); }
    finally { setBulkBusy(false); }
  };

  const toggleSel = (id: string) => setSelected(p => {
  const s = new Set(p);
  if (s.has(id)) { s.delete(id); } else { s.add(id); }
  return s;
});

  const displayed   = items.filter(n => filter === 'unread' ? !n.isRead : filter === 'read' ? n.isRead : true);
  const unreadCount = items.filter(n => !n.isRead).length;
  const allSel      = !!displayed.length && selected.size === displayed.length;

  const ICO_DEL = <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>;
  const ICO_CHK = <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
  const ICO_SEL = <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="4" height="4" rx="1" strokeLinecap="round"/><rect x="10" y="3" width="4" height="4" rx="1" strokeLinecap="round"/><rect x="3" y="10" width="4" height="4" rx="1" strokeLinecap="round"/><rect x="10" y="10" width="4" height="4" rx="1" strokeLinecap="round"/></svg>;
  const ICO_RELOAD = <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>;
  const SPIN = (c: string) => <div style={{width:10,height:10,border:`2px solid ${c}33`,borderTopColor:c,borderRadius:'50%',animation:'snfspin .7s linear infinite'}}/>;

  return (
    <AppShell title="Notifications">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;500;600;700;800;900&family=DM+Mono:wght@500&display=swap');

        @keyframes snfin  {from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes snfspin{to{transform:rotate(360deg)}}
        @keyframes snfpop {from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
        @keyframes snfpulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes snftoast{0%{opacity:0;transform:translateX(-50%) translateY(10px)} 12%,82%{opacity:1;transform:translateX(-50%) translateY(0)} 100%{opacity:0;transform:translateX(-50%) translateY(-6px)}}

        .snf-wrap{font-family:'DM Sans',sans-serif;padding:clamp(.85rem,3vw,1.5rem);max-width:700px;margin:0 auto;padding-bottom:6rem}

        .snf-header{margin-bottom:1.1rem;opacity:0;animation:snfin .4s .03s cubic-bezier(.22,1,.36,1) forwards}
        .snf-eyebrow{font-size:.59rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#7C3AED;margin-bottom:.2rem;display:flex;align-items:center;gap:.32rem}
        .snf-eyedot{width:5px;height:5px;background:#8B5CF6;border-radius:50%;animation:snfpulse 2s ease-in-out infinite}
        .snf-titlerow{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap}
        .snf-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,4vw,1.8rem);font-weight:700;color:#0F172A;letter-spacing:-.02em;margin:0;line-height:1.1}
        .snf-title span{background:linear-gradient(135deg,#7C3AED,#C026D3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .snf-pill{display:inline-flex;align-items:center;justify-content:center;min-width:21px;height:21px;padding:0 .42rem;background:#7C3AED;color:white;border-radius:99px;font-size:.65rem;font-weight:900;animation:snfpop .3s cubic-bezier(.22,1,.36,1)}

        .snf-stats{display:flex;gap:.4rem;margin-bottom:1rem;flex-wrap:wrap;opacity:0;animation:snfin .4s .055s cubic-bezier(.22,1,.36,1) forwards}
        .snf-stat{background:white;border:1px solid #E2E8F0;border-radius:9px;padding:.35rem .65rem;display:flex;align-items:center;gap:.35rem;box-shadow:0 1px 2px rgba(0,0,0,.03)}
        .snf-sn{font-family:'DM Mono',monospace;font-size:.95rem;font-weight:700;line-height:1}
        .snf-sl{font-size:.56rem;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.05em}

        .snf-bar{display:flex;gap:.35rem;align-items:center;flex-wrap:wrap;margin-bottom:.8rem;opacity:0;animation:snfin .4s .08s cubic-bezier(.22,1,.36,1) forwards}
        .snf-tabs{display:flex;gap:.18rem;background:#F1F5F9;padding:.18rem;border-radius:9px}
        .snf-tab{border:none;background:transparent;padding:.25rem .58rem;border-radius:7px;font-size:.68rem;font-weight:700;color:#64748B;cursor:pointer;transition:all .12s;white-space:nowrap}
        .snf-tab.on{background:white;color:#7C3AED;box-shadow:0 1px 3px rgba(0,0,0,.08)}

        .sb{height:30px;padding:0 .68rem;border-radius:8px;border:1px solid;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.28rem;transition:all .12s;white-space:nowrap}
        .sb:disabled{opacity:.42;cursor:not-allowed}
        .sb-red{background:#FEF2F2;color:#DC2626;border-color:#FECACA}.sb-red:hover:not(:disabled){background:#FEE2E2;border-color:#DC2626}
        .sb-s{background:#F8FAFC;color:#475569;border-color:#CBD5E1}.sb-s:hover:not(:disabled){background:#F1F5F9;border-color:#94A3B8}
        .sb-a{background:#FFFBEB;color:#D97706;border-color:#FDE68A}.sb-a:hover:not(:disabled){background:#FEF3C7;border-color:#D97706}
        .sb-g{background:#ECFDF5;color:#059669;border-color:#A7F3D0}.sb-g:hover:not(:disabled){background:#D1FAE5;border-color:#059669}
        .snf-sc{font-size:.68rem;font-weight:700;color:#7C3AED;background:#F5F3FF;border:1px solid #DDD6FE;border-radius:99px;padding:.16rem .55rem;white-space:nowrap}

        .snf-panel{background:white;border-radius:16px;border:1px solid #E2E8F0;box-shadow:0 2px 8px rgba(0,0,0,.04);overflow:hidden;opacity:0;animation:snfin .4s .11s cubic-bezier(.22,1,.36,1) forwards}

        .snf-selbar{display:flex;align-items:center;gap:.6rem;padding:.55rem 1rem;background:#F8FAFC;border-bottom:1px solid #E2E8F0}
        .snf-chk{width:15px;height:15px;accent-color:#7C3AED;cursor:pointer}

        .snf-item{display:flex;align-items:center;gap:.7rem;padding:.75rem 1rem;border-bottom:1px solid #F1F5F9;transition:background .1s;position:relative}
        .snf-item:last-child{border-bottom:none}
        .snf-item.unread{background:#FFFBEB}
        .snf-item.unread:hover{background:#FEF3C7}
        .snf-item.read:hover{background:#F8FAFC}
        .snf-item.sel{background:#F5F3FF!important}
        .snf-item.sm{cursor:pointer}

        .snf-leftbar{position:absolute;left:0;top:18%;bottom:18%;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,#D97706,#F59E0B)}

        .snf-ico{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;border:1px solid}

        .snf-ct{flex:1;min-width:0}
        .snf-msg{font-size:.82rem;color:#1E293B;line-height:1.35;font-weight:500;margin:0 0 .22rem;word-break:break-word}
        .snf-item.read .snf-msg{color:#64748B;font-weight:400}
        .snf-meta{display:flex;align-items:center;gap:.38rem;flex-wrap:wrap}
        .snf-tag{font-size:.57rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:.1rem .38rem;border-radius:99px;border:1px solid}
        .snf-date{font-size:.61rem;color:#94A3B8;font-weight:500}

        .snf-acts{display:flex;gap:.22rem;align-items:center;flex-shrink:0;opacity:0;transition:opacity .12s}
        .snf-item:hover .snf-acts{opacity:1}
        @media(max-width:600px){.snf-acts{opacity:1}}
        .sib{width:27px;height:27px;border-radius:7px;border:1px solid;background:white;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .12s}
        .sib:disabled{opacity:.35;cursor:not-allowed}
        .sib.rd{color:#059669;border-color:#A7F3D0}.sib.rd:hover{background:#ECFDF5}
        .sib.dl{color:#DC2626;border-color:#FECACA}.sib.dl:hover{background:#FEF2F2}

        .snf-load{display:flex;align-items:center;justify-content:center;padding:2.5rem;gap:.5rem;color:#64748B;font-size:.8rem}
        .snf-ring{width:19px;height:19px;border:2px solid #E2E8F0;border-top-color:#7C3AED;border-radius:50%;animation:snfspin .8s linear infinite}
        .snf-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1.5rem;gap:.5rem}
        .snf-empty-e{font-size:1.9rem}
        .snf-empty-t{font-size:.85rem;font-weight:700;color:#374151;margin:0}
        .snf-empty-s{font-size:.72rem;color:#94A3B8;margin:0;text-align:center}
        .snf-err{background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:.7rem .9rem;color:#B91C1C;font-size:.76rem;font-weight:600;display:flex;align-items:center;gap:.42rem;margin-bottom:.8rem}

        .snf-toast{position:fixed;bottom:5.5rem;left:50%;transform:translateX(-50%);border-radius:99px;padding:.52rem 1.1rem;font-size:.74rem;font-weight:700;white-space:nowrap;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,.2);animation:snftoast 2.6s ease forwards;pointer-events:none;color:white}

        @media(max-width:480px){
          .snf-sl{display:none}
          .snf-title{font-size:1.35rem}
        }
      `}</style>

      <div className="snf-wrap">

        {/* ── Header ── */}
        <div className="snf-header">
          <div className="snf-eyebrow"><div className="snf-eyedot"/>Grand Chef</div>
          <div className="snf-titlerow">
            <h1 className="snf-title">Centre de <span>notifications</span></h1>
            {unreadCount > 0 && <span className="snf-pill">{unreadCount}</span>}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="snf-stats">
          {[
            {n: items.length,                     l: 'Total',    c: '#0F172A'},
            {n: unreadCount,                      l: 'Non lues', c: '#7C3AED'},
            {n: items.filter(x=>x.isRead).length, l: 'Lues',     c: '#059669'},
          ].map(s=>(
            <div key={s.l} className="snf-stat">
              <span className="snf-sn" style={{color:s.c}}>{s.n}</span>
              <span className="snf-sl">{s.l}</span>
            </div>
          ))}
        </div>

        {/* ── Barre d'outils ── */}
        <div className="snf-bar">
          <div className="snf-tabs">
            {(['all','unread','read'] as Filter[]).map(f=>(
              <button key={f} className={`snf-tab${filter===f?' on':''}`} onClick={()=>setFilter(f)}>
                {f==='all'?'Toutes':f==='unread'?'Non lues':'Lues'}
              </button>
            ))}
          </div>

          <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginLeft:'auto'}}>
            {selectMode && selected.size>0 && (
              <>
                <span className="snf-sc">{selected.size} sél.</span>
                <button className="sb sb-red" disabled={bulkBusy} onClick={()=>{ void deleteSelected(); }}>{ICO_DEL} Supprimer</button>
              </>
            )}
            {unreadCount>0 && (
              <button className="sb sb-g" disabled={bulkBusy} onClick={()=>{ void markAllRead(); }}>{ICO_CHK} Tout lire</button>
            )}
            <button className="sb sb-s" onClick={()=>{ void load(); }}>{ICO_RELOAD} Actualiser</button>
            <button className={`sb ${selectMode?'sb-a':'sb-s'}`} onClick={()=>{setSelectMode(v=>!v);setSelected(new Set())}}>
              {ICO_SEL} {selectMode?'Annuler':'Sélectionner'}
            </button>
            {items.length>0 && (
              <button className="sb sb-red" disabled={bulkBusy} onClick={()=>{ void deleteAll(); }}>{ICO_DEL} Tout supprimer</button>
            )}
          </div>
        </div>

        {error && (
          <div className="snf-err">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
            {error}
          </div>
        )}

        {/* ── Panel ── */}
        <div className="snf-panel">

          {selectMode && displayed.length>0 && (
            <div className="snf-selbar">
              <input type="checkbox" className="snf-chk" checked={allSel}
                onChange={()=>allSel?setSelected(new Set()):setSelected(new Set(displayed.map(n=>n.id)))}/>
              <span style={{fontSize:'.67rem',fontWeight:700,color:'#475569'}}>
                {allSel?'Tout désélectionner':`Tout sélectionner (${displayed.length})`}
              </span>
            </div>
          )}

          {loading ? (
            <div className="snf-load"><div className="snf-ring"/>Chargement…</div>
          ) : displayed.length===0 ? (
            <div className="snf-empty">
              <span className="snf-empty-e">🔕</span>
              <p className="snf-empty-t">
                {filter==='unread'?'Aucune notification non lue':filter==='read'?'Aucune notification lue':'Aucune notification'}
              </p>
              <p className="snf-empty-s">Vous êtes à jour.</p>
            </div>
          ) : displayed.map((n,i) => {
            const ts   = getTypeStyle(n.type);
            const isSel= selected.has(n.id);
            const busy = busyIds.has(n.id);
            return (
              <div
                key={n.id}
                className={`snf-item${n.isRead?' read':' unread'}${isSel?' sel':''}${selectMode?' sm':''}`}
                style={{animationDelay:`${i*.022}s`}}
                onClick={selectMode?()=>toggleSel(n.id):undefined}
              >
                {!n.isRead && <div className="snf-leftbar"/>}

                {selectMode && (
                  <input type="checkbox" className="snf-chk" checked={isSel}
                    onChange={()=>toggleSel(n.id)}
                    onClick={e=>e.stopPropagation()}/>
                )}

                <div className="snf-ico" style={{background:ts.bg,borderColor:ts.border}}>
                  {ts.emoji}
                </div>

                <div className="snf-ct">
                  <p className="snf-msg">{n.message}</p>
                  <div className="snf-meta">
                    <span className="snf-tag" style={{color:ts.color,background:ts.bg,borderColor:ts.border}}>
                      {typeLabel(n.type)}
                    </span>
                    <span className="snf-date">{formatDate(n.createdAt)}</span>
                  </div>
                </div>

                {!selectMode && (
                  <div className="snf-acts">
                    {!n.isRead && (
                      <button className="sib rd" disabled={busy}
                        onClick={e=>{ e.stopPropagation(); void markRead(n.id); }}
                        title="Marquer comme lue">
                        {busy ? SPIN('#059669') : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>}
                      </button>
                    )}
                    <button className="sib dl" disabled={busy}
                      onClick={e=>{ e.stopPropagation(); void deleteOne(n.id); }}
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
        <div className="snf-toast" style={{background: toast.ok ? '#0F172A' : '#7F1D1D'}}>
          {toast.ok ? '✓ ' : '✕ '}{toast.msg}
        </div>
      )}
    </AppShell>
  );
}