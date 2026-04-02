// web/app/(protected)/admin/contents/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { ContentForm } from '../../../../components/admin/ContentForm';
import { api } from '../../../../lib/api-client';
import type { ContentPost, ContentStatus } from '../../../../types/content';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ STATUS BADGE */
const STATUS_MAP: Record<ContentStatus, { label: string; color: string; bg: string; border: string }> = {
  PUBLISHED: { label: 'Publi\u00e9',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  DRAFT:     { label: 'Brouillon',       color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  ARCHIVED:  { label: 'Archiv\u00e9',   color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

function StatusBadge({ status }: { status: ContentStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.25rem', fontSize:'0.7rem', fontWeight:800, color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:99, padding:'0.2rem 0.6rem', whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color }} />{s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ STATUS CYCLE */
function nextStatus(s: ContentStatus): ContentStatus {
  if (s === 'DRAFT')     return 'PUBLISHED';
  if (s === 'PUBLISHED') return 'ARCHIVED';
  return 'DRAFT';
}
const NEXT_LABEL: Record<ContentStatus, string> = {
  DRAFT:     'Publier',
  PUBLISHED: 'Archiver',
  ARCHIVED:  'Remettre en brouillon',
};

/* ══════════════════════════════════════════════════════ MODALS */
function DeleteModal({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', zIndex:400 }} onClick={onCancel} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:401, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(18px)', borderRadius:20, padding:'clamp(1.5rem,4vw,2rem)', width:'min(420px,calc(100vw - 2rem))', border:'1px solid rgba(37,99,235,0.1)', boxShadow:'0 24px 60px rgba(37,99,235,0.14)' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:600, color:'#111827', textAlign:'center', marginBottom:'0.4rem' }}>Supprimer ce contenu&nbsp;?</h2>
        <p style={{ fontSize:'0.82rem', color:'#6B7280', textAlign:'center', marginBottom:'1.5rem', fontWeight:500 }}>
          <strong style={{ color:'#111827' }}>&laquo;&nbsp;{title}&nbsp;&raquo;</strong> sera supprim&eacute; d&eacute;finitivement.
        </p>
        <div style={{ display:'flex', gap:'0.6rem', justifyContent:'center' }}>
          <button onClick={onCancel} style={{ height:40, padding:'0 1.2rem', borderRadius:10, border:'1px solid rgba(37,99,235,0.15)', background:'rgba(249,250,251,0.9)', fontFamily:"'DM Sans',sans-serif", fontSize:'0.8rem', fontWeight:600, color:'#374151', cursor:'pointer' }}>Annuler</button>
          <button onClick={onConfirm} style={{ height:40, padding:'0 1.2rem', borderRadius:10, border:'none', background:'linear-gradient(135deg,#B91C1C,#DC2626)', fontFamily:"'DM Sans',sans-serif", fontSize:'0.8rem', fontWeight:700, color:'white', cursor:'pointer', boxShadow:'0 4px 12px rgba(220,38,38,0.3)' }}>Supprimer</button>
        </div>
      </div>
    </>
  );
}

function DetailModal({ 
  content, 
  onClose, 
  onCycleStatus, 
  onDelete,
  busy 
}: { 
  content: ContentPost; 
  onClose: () => void;
  onCycleStatus: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const hasImage = !!content.coverFileAssetId;
  const imageUrl = (content as unknown as { coverImageFile?: { url: string } }).coverImageFile?.url;

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.5)', backdropFilter:'blur(5px)', zIndex:300 }} onClick={onClose} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:301, background:'rgba(253,253,255,0.98)', borderRadius:22, width:'100%', maxWidth:680, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 25px 50px rgba(15,23,42,0.2)', animation:'modalPop .3s cubic-bezier(.22,1,.36,1)' }}>

        {/* Header Modale */}
        <div style={{ padding:'1.5rem', borderBottom:'1px solid rgba(37,99,235,0.09)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem', background:'#F8FAFC', borderRadius:'22px 22px 0 0' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.6rem' }}>
              <StatusBadge status={content.status} />
              <span style={{ fontSize:'.75rem', fontWeight:600, color:'#64748B', fontFamily:"'DM Mono',monospace" }}>
                Créé le {formatDate(content.createdAt)}
              </span>
            </div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.65rem', fontWeight:700, color:'#0F172A', margin:0, lineHeight:1.15 }}>
              {content.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%', background:'white', border:'1px solid #E2E8F0', color:'#64748B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Corps Scrollable */}
        <div style={{ overflowY:'auto', padding:'1.5rem', flex:1 }}>
          {hasImage && (
            <div style={{ width:'100%', borderRadius:14, overflow:'hidden', marginBottom:'1.5rem', background:'linear-gradient(135deg, #F1F5F9, #E2E8F0)', border:'1px solid rgba(0,0,0,0.05)' }}>
              {imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={imageUrl} alt={content.title} style={{ width:'100%', maxHeight:350, objectFit:'contain', display:'block' }} />
              ) : (
                <div style={{ padding:'3rem 1rem', textAlign:'center', color:'#64748B', fontSize:'.85rem', fontWeight:600 }}>
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ margin:'0 auto .5rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Image de couverture attachée
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize:'.95rem', color:'#374151', lineHeight:1.7, fontWeight:500, whiteSpace:'pre-wrap' }}>
            {content.body || <span style={{ color:'#9CA3AF', fontStyle:'italic' }}>Aucun texte pour ce contenu.</span>}
          </div>
        </div>

        {/* Footer Actions Modale */}
        <div style={{ padding:'1rem 1.5rem', borderTop:'1px solid rgba(37,99,235,0.09)', background:'white', borderRadius:'0 0 22px 22px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
          <button 
            disabled={busy} 
            onClick={onDelete} 
            style={{ height:36, padding:'0 1rem', borderRadius:8, border:'1.5px solid rgba(220,38,38,.2)', background:'rgba(254,242,242,.6)', color:'#DC2626', fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'.4rem', transition:'all .18s' }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Supprimer
          </button>

          <div style={{ display:'flex', gap:'0.6rem', flexWrap:'wrap' }}>
            {imageUrl && (
              <a 
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                download
                style={{ height:36, padding:'0 1rem', borderRadius:8, border:'1px solid rgba(37,99,235,0.18)', background:'rgba(239,246,255,0.7)', color:'#1D4ED8', fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'.4rem', textDecoration:'none', transition:'all .18s' }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4"/></svg>
                Télécharger
              </a>
            )}

            <button 
              disabled={busy} 
              onClick={onCycleStatus} 
              style={{ height:36, padding:'0 1rem', borderRadius:8, border:'none', background:'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'white', fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'.4rem', boxShadow:'0 4px 12px rgba(37,99,235,.25)', transition:'all .18s' }}
            >
              {busy ? (
                <div style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'acspin .7s linear infinite' }} />
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              )}
              {NEXT_LABEL[content.status]}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminContentsPage() {
  const [items,        setItems]        = useState<ContentPost[]>([]);
  const [q,            setQ]            = useState('');
  const [status,       setStatus]       = useState('');
  const [formOpen,     setFormOpen]     = useState(false);
  const [busyId,       setBusyId]       = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [detailContent, setDetailContent] = useState<ContentPost | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentPost | null>(null);

  const load = useCallback(async (qVal?: string, sVal?: string) => {
    setError(null); setLoading(true);
    try {
      const res = await api.listAntennaContents({
        page: 1, pageSize: 100,
        q:      (qVal  ?? q)      || undefined,
        status: (sVal  ?? status) || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally { setLoading(false); }
  }, [q, status]);

  useEffect(() => { void load(); }, [load]);

  async function handleStatusCycle(c: ContentPost) {
    setBusyId(c.id);
    try {
      await api.updateAntennaContent(c.id, { status: nextStatus(c.status) });
      await load();
      if (detailContent?.id === c.id) {
        setDetailContent(prev => prev ? { ...prev, status: nextStatus(c.status) } : null);
      }
    } finally { setBusyId(null); }
  }

  async function handleDelete(c: ContentPost) {
    setBusyId(c.id);
    setDeleteTarget(null);
    if (detailContent?.id === c.id) setDetailContent(null);
    try {
      await api.deleteAntennaContent(c.id);
      await load();
    } finally { setBusyId(null); }
  }

  const filtered = items.filter(c => {
    const matchQ = !q      || c.title.toLowerCase().includes(q.toLowerCase());
    const matchS = !status || c.status === status;
    return matchQ && matchS;
  });

  return (
    <AppShell title="Informations / contenus">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .ac-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1280px;margin:0 auto}
        .ac-header{margin-bottom:1.75rem;opacity:0;transform:translateY(10px);animation:acin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .ac-eyebrow{font-size:.67rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ac-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:acpulse 2s ease-in-out infinite}
        @keyframes acpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ac-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.85rem);font-weight:600;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ac-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        
        .ac-layout{display:grid; gap:1.5rem; align-items:start; transition: grid-template-columns 0.3s ease;}
        @media(min-width:1025px){
          .ac-layout.form-open { grid-template-columns: 380px 1fr; }
          .ac-layout.form-closed { grid-template-columns: 1fr; }
        }
        @media(max-width:1024px){.ac-layout{grid-template-columns:1fr}}

        .ac-panel{background:rgba(253,253,255,.93);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 14px rgba(37,99,235,.05),0 0 0 1px rgba(255,255,255,.85) inset;overflow:hidden}
        .ac-panel-left{opacity:0;transform:translateY(10px);animation:acin .5s .10s cubic-bezier(.22,1,.36,1) forwards}
        .ac-panel-right{opacity:0;transform:translateY(10px);animation:acin .5s .16s cubic-bezier(.22,1,.36,1) forwards}
        .ac-panel-head{padding:1rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem}
        .ac-panel-title{font-size:.73rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1F2937;display:flex;align-items:center;gap:.5rem}
        .ac-panel-ico{width:26px;height:26px;border-radius:7px;background:#EFF6FF;color:#2563EB;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ac-count-chip{font-size:.68rem;font-weight:800;padding:.18rem .55rem;border-radius:99px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}
        
        .ac-form-wrapper { max-height: 0; opacity: 0; overflow: hidden; transition: max-height 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease; }
        .ac-form-wrapper.open { max-height: 1500px; opacity: 1; overflow: visible; }
        .ac-form-body{padding:1.25rem 1.3rem}
        
        /* ── TOOLBAR AJUSTÉE POUR MOBILE ── */
        .ac-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:nowrap;padding:1rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);width:100%;box-sizing:border-box}
        .ac-sw{position:relative;flex:1 1 auto;min-width:0}
        .ac-si{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .ac-search{width:100%;height:38px;border-radius:10px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.85);padding:0 .85rem 0 2.3rem;font-family:'DM Sans',sans-serif;font-size:.82rem;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s;box-sizing:border-box}
        .ac-search:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08);background:white}
        .ac-search::placeholder{color:rgba(107,114,128,.45)}
        .ac-select{flex:0 1 auto;min-width:0;height:38px;border-radius:10px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.85);padding:0 2rem 0 .85rem;font-family:'DM Sans',sans-serif;font-size:.82rem;color:#111827;font-weight:600;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .65rem center;transition:border-color .2s,box-shadow .2s}
        .ac-select:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08)}
        .ac-reload-btn{flex:0 0 auto;height:38px;padding:0 .85rem;border-radius:10px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.85);display:flex;align-items:center;gap:.35rem;cursor:pointer;color:#374151;font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:600;transition:all .18s;white-space:nowrap}
        .ac-reload-btn:hover{background:#EFF6FF;border-color:rgba(37,99,235,.3);color:#1D4ED8}
        
        @media(max-width:500px){
          .ac-toolbar { padding: 0.8rem 0.5rem; gap: 0.4rem; }
          .ac-search { font-size: 0.75rem; padding: 0 0.5rem 0 1.8rem; height: 36px; }
          .ac-si { left: 0.5rem; }
          .ac-select { font-size: 0.75rem; padding: 0 1.4rem 0 0.5rem; height: 36px; background-position: right 0.4rem center; }
          .ac-reload-btn { padding: 0 0.6rem; height: 36px; font-size: 0.75rem; }
          .btn-text { display: none; } /* Cache le mot "Actualiser" pour que tout tienne sur une ligne ! */
        }
        
        .ac-tw{overflow-x:auto}
        .ac-table{width:100%;border-collapse:collapse;min-width:480px}
        .ac-table thead tr{border-bottom:1px solid rgba(37,99,235,.09)}
        .ac-table thead th{padding:.75rem 1.2rem;font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#374151;text-align:left;background:rgba(248,250,252,.6);white-space:nowrap}
        .ac-table tbody tr{border-bottom:1px solid rgba(37,99,235,.055);transition:background .15s;animation:acin .4s cubic-bezier(.22,1,.36,1) both;cursor:pointer}
        .ac-table tbody tr:last-child{border-bottom:none}
        .ac-table tbody tr:hover{background:rgba(239,246,255,.6)}
        .ac-table tbody tr:hover .ac-row-title{color:#1D4ED8}
        .ac-table td{padding:.85rem 1.2rem;vertical-align:middle}
        
        .ac-row-title{font-size:.86rem;font-weight:800;color:#0F172A;margin-bottom:2px;transition:color .15s}
        .ac-row-excerpt{font-size:.72rem;color:#6B7280;font-weight:500;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ac-row-date{font-size:.7rem;color:#6B7280;font-weight:500}
        
        .ac-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.82rem;font-weight:600}
        .ac-ring{width:24px;height:24px;border:2.5px solid rgba(37,99,235,.1);border-top-color:#2563EB;border-radius:50%;animation:acspin .8s linear infinite}
        .ac-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;gap:.65rem;color:#9CA3AF}
        .ac-empty p{font-size:.82rem;font-weight:700}
        .ac-error{display:flex;align-items:center;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.8rem;font-weight:700;margin:.75rem 1.2rem}
        .ac-mob{display:none}
        @media(max-width:560px){.ac-tw{display:none}.ac-mob{display:flex;flex-direction:column}}
        .ac-mc{padding:.9rem 1.2rem;border-bottom:1px solid rgba(37,99,235,.07);animation:acin .4s cubic-bezier(.22,1,.36,1) both;cursor:pointer;transition:background .15s}
        .ac-mc:last-child{border-bottom:none}
        .ac-mc:hover{background:rgba(239,246,255,.6)}
        .ac-mc-row{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.5rem}
        
        @keyframes acin{to{opacity:1;transform:translateY(0)}}
        @keyframes acspin{to{transform:rotate(360deg)}}
        @keyframes modalPop { from { opacity: 0; transform: scale(0.95) translate(-50%, -50%); } to { opacity: 1; transform: scale(1) translate(-50%, -50%); } }
      `}</style>

      <div className="ac-wrap">
        <div className="ac-header">
          <div className="ac-eyebrow"><div className="ac-dot" />Admin antenne</div>
          <h1 className="ac-title">Informations <span>&amp; contenus</span></h1>
        </div>

        <div className={`ac-layout ${formOpen ? 'form-open' : 'form-closed'}`}>

          {/* LEFT — Form Toggleable */}
          <div className="ac-panel ac-panel-left">
            <div 
              className="ac-panel-head" 
              onClick={() => setFormOpen(!formOpen)} 
              style={{ cursor: 'pointer', background: formOpen ? 'rgba(239,246,255,0.4)' : 'transparent' }}
            >
              <div className="ac-panel-title">
                <div className="ac-panel-ico">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    {formOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    )}
                  </svg>
                </div>
                {formOpen ? 'Fermer le formulaire' : 'Publier un contenu'}
              </div>
              {!formOpen && (
                <button style={{ background:'none', border:'none', color:'#2563EB', fontWeight:800, fontSize:'.7rem', cursor:'pointer' }}>
                  Ouvrir
                </button>
              )}
            </div>
            <div className={`ac-form-wrapper ${formOpen ? 'open' : ''}`}>
              <div className="ac-form-body">
                <ContentForm onCreated={() => { void load(); setFormOpen(false); }} />
              </div>
            </div>
          </div>

          {/* RIGHT — List */}
          <div className="ac-panel ac-panel-right">
            <div className="ac-panel-head">
              <div className="ac-panel-title">
                <div className="ac-panel-ico" style={{ background:'#ECFDF5', color:'#059669' }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
                </div>
                Contenus de l&apos;antenne
              </div>
              <span className="ac-count-chip">{filtered.length}</span>
            </div>

            <div className="ac-toolbar">
              <div className="ac-sw">
                <span className="ac-si"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg></span>
                <input className="ac-search" type="text" placeholder="Rechercher un titre&#8230;" value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void load(q, status)}
                />
              </div>
              <select className="ac-select" value={status} onChange={e => { setStatus(e.target.value); void load(q, e.target.value); }}>
                <option value="">Tous statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="PUBLISHED">Publi&eacute;</option>
                <option value="ARCHIVED">Archiv&eacute;</option>
              </select>
              <button className="ac-reload-btn" onClick={() => void load(q, status)}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span className="btn-text">Actualiser</span>
              </button>
            </div>

            {error && (
              <div className="ac-error">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                {error}
              </div>
            )}

            {loading ? (
              <div className="ac-loader"><div className="ac-ring" />Chargement&#8230;</div>
            ) : filtered.length === 0 ? (
              <div className="ac-empty">
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
                <p>Aucun contenu pour le moment</p>
              </div>
            ) : (
              <>
                {/* Desktop */}
                <div className="ac-tw">
                  <table className="ac-table">
                    <thead><tr><th>Titre</th><th>Statut</th><th>Date</th></tr></thead>
                    <tbody>
                      {filtered.map((c, i) => (
                        <tr key={c.id} style={{ animationDelay:`${i * 0.035}s` }} onClick={() => setDetailContent(c)}>
                          <td>
                            <div className="ac-row-title">{c.title}</div>
                            {c.body && <div className="ac-row-excerpt">{c.body}</div>}
                          </td>
                          <td><StatusBadge status={c.status} /></td>
                          <td><span className="ac-row-date">{formatDate(c.createdAt)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile */}
                <div className="ac-mob">
                  {filtered.map((c, i) => (
                    <div key={c.id} className="ac-mc" style={{ animationDelay:`${i * 0.035}s` }} onClick={() => setDetailContent(c)}>
                      <div className="ac-mc-row">
                        <div>
                          <div className="ac-row-title">{c.title}</div>
                          <div className="ac-row-date" style={{ marginTop:2 }}>{formatDate(c.createdAt)}</div>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      {c.body && <div className="ac-row-excerpt">{c.body}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {detailContent && (
        <DetailModal 
          content={detailContent} 
          onClose={() => setDetailContent(null)} 
          onCycleStatus={() => void handleStatusCycle(detailContent)}
          onDelete={() => setDeleteTarget(detailContent)}
          busy={busyId === detailContent.id}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          title={deleteTarget.title}
          onConfirm={() => void handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  );
}