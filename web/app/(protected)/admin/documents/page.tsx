// web/app/(protected)/admin/documents/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { DocumentForm } from '../../../../components/admin/DocumentForm';
import { api } from '../../../../lib/api-client';
import type { DocumentItem } from '../../../../types/document';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ FIX ENCODING */
function fixEncoding(str?: string | null): string {
  if (!str) return '';
  try {
    if (str.includes('Ã')) {
      return decodeURIComponent(escape(str));
    }
    return str;
  } catch { // <-- CORRECTION ICI : suppression du 'e'
    return str.replace(/RÃ©union/g, 'Réunion')
              .replace(/NÂ°/g, 'N°')
              .replace(/Ã©/g, 'é')
              .replace(/Ã¨/g, 'è')
              .replace(/Ã /g, 'à')
              .replace(/Ã¢/g, 'â')
              .replace(/Ãª/g, 'ê')
              .replace(/Ã®/g, 'î')
              .replace(/Ã´/g, 'ô')
              .replace(/Ã»/g, 'û')
              .replace(/Ã§/g, 'ç')
              .replace(/Â/g, '');
  }
}

/* ══════════════════════════════════════════════════════ FILE TYPE BADGE */
function FileTypeBadge({ mimeType, fileName }: { mimeType?: string | null; fileName?: string }) {
  const ext = fileName?.split('.').pop()?.toUpperCase() ?? '—';
  const mime = mimeType?.toLowerCase() ?? '';

  let color = '#6B7280', bg = '#F3F4F6', border = '#E5E7EB';
  if (mime.includes('pdf') || ext === 'PDF')   { color = '#DC2626'; bg = '#FEF2F2'; border = '#FECACA'; }
  else if (mime.includes('image') || ['PNG', 'JPG', 'JPEG', 'SVG'].includes(ext)) { color = '#7C3AED'; bg = '#F5F3FF'; border = '#DDD6FE'; }
  else if (mime.includes('word') || mime.includes('document') || ext === 'DOCX' || ext === 'DOC') { color = '#2563EB'; bg = '#EFF6FF'; border = '#BFDBFE'; }
  else if (mime.includes('sheet') || mime.includes('excel') || ext === 'XLSX' || ext === 'CSV')   { color = '#059669'; bg = '#ECFDF5'; border = '#A7F3D0'; }

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.22rem', fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.05em', color, background:bg, border:`1px solid ${border}`, borderRadius:6, padding:'0.2rem 0.5rem' }}>
      {ext}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ FILE SIZE */
function formatSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ══════════════════════════════════════════════════════ MODALS */
function DeleteModal({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', zIndex:400 }} onClick={onCancel} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:401, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(18px)', borderRadius:20, padding:'clamp(1.5rem,4vw,2rem)', width:'min(420px,calc(100vw - 2rem))', border:'1px solid rgba(37,99,235,0.1)', boxShadow:'0 24px 60px rgba(37,99,235,0.14)' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
            <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:600, color:'#111827', textAlign:'center', margin:'0 0 0.4rem 0' }}>Supprimer ce document ?</h2>
        <p style={{ fontSize:'0.85rem', color:'#6B7280', textAlign:'center', marginBottom:'1.5rem', fontWeight:500, lineHeight:1.5 }}>
          <strong style={{ color:'#111827' }}>&laquo; {fixEncoding(title)} &raquo;</strong> sera supprimé définitivement.
        </p>
        <div style={{ display:'flex', gap:'0.6rem', justifyContent:'center' }}>
          <button onClick={onCancel} style={{ flex:1, height:42, borderRadius:12, border:'1px solid #E5E7EB', background:'#FFFFFF', fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem', fontWeight:600, color:'#374151', cursor:'pointer', transition:'all 0.2s' }}>Annuler</button>
          <button onClick={onConfirm} style={{ flex:1, height:42, borderRadius:12, border:'none', background:'linear-gradient(135deg,#B91C1C,#DC2626)', fontFamily:"'DM Sans',sans-serif", fontSize:'0.85rem', fontWeight:700, color:'white', cursor:'pointer', boxShadow:'0 4px 12px rgba(220,38,38,0.3)', transition:'all 0.2s' }}>Supprimer</button>
        </div>
      </div>
    </>
  );
}

function DetailModal({ 
  document, 
  onClose, 
  onDelete,
  busy 
}: { 
  document: DocumentItem; 
  onClose: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const mime = document.fileAsset?.mimeType?.toLowerCase() || '';
  const ext = document.fileAsset?.fileName?.toLowerCase() || '';
  
  const isImage = (mime.includes('image') || ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp')) 
                  && !mime.includes('pdf') 
                  && !ext.endsWith('.pdf');

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', backdropFilter:'blur(5px)', zIndex:300 }} onClick={onClose} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:301, background:'#FFFFFF', borderRadius:24, width:'calc(100vw - 2rem)', maxWidth:580, maxHeight:'calc(100vh - 2rem)', display:'flex', flexDirection:'column', boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)', animation:'modalPop .3s cubic-bezier(.22,1,.36,1)' }}>

        <div style={{ padding:'clamp(1.2rem, 4vw, 1.5rem)', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'1rem', background:'#F8FAFC', borderRadius:'24px 24px 0 0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:'.6rem', marginBottom:'.8rem' }}>
              <FileTypeBadge mimeType={document.fileAsset?.mimeType} fileName={document.fileAsset?.fileName} />
              <span style={{ fontSize:'.75rem', fontWeight:600, color:'#64748B', fontFamily:"'DM Mono',monospace" }}>
                {formatSize(document.fileAsset?.sizeBytes)} • Modifié le {formatDate(document.createdAt)}
              </span>
            </div>
            <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'clamp(1.4rem, 4vw, 1.7rem)', fontWeight:700, color:'#0F172A', margin:0, lineHeight:1.2 }}>
              {fixEncoding(document.title)}
            </h2>
          </div>
          <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', background:'white', border:'1px solid #E2E8F0', color:'#64748B', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.2s', boxShadow:'0 2px 4px rgba(0,0,0,0.02)' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ overflowY:'auto', padding:'clamp(1.2rem, 4vw, 1.5rem)', flex:1 }}>
          {document.fileAsset?.url ? (
            isImage ? (
              <div style={{ width:'100%', borderRadius:16, overflow:'hidden', marginBottom:'1.5rem', background:'linear-gradient(135deg, #F8FAFC, #F1F5F9)', border:'1px solid #E2E8F0', display:'flex', justifyContent:'center', alignItems:'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={document.fileAsset.url} alt={document.title} style={{ width:'100%', maxHeight:350, objectFit:'contain', display:'block' }} />
              </div>
            ) : (
              <div style={{ width:'100%', padding:'2.5rem 1rem', borderRadius:16, marginBottom:'1.5rem', background:'#F8FAFC', border:'1px dashed #CBD5E1', display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', color:'#3B82F6' }}>
                  <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <span style={{ fontSize:'0.9rem', color:'#64748B', fontWeight:500, textAlign:'center' }}>Aperçu non disponible pour ce type de fichier.</span>
              </div>
            )
          ) : null}

          <div style={{ padding:'1.2rem', background:'#F9FAFB', borderRadius:12, border:'1px solid #F3F4F6' }}>
            <h4 style={{ fontSize:'0.75rem', textTransform:'uppercase', letterSpacing:'0.05em', color:'#9CA3AF', fontWeight:700, margin:'0 0 0.5rem 0' }}>Description</h4>
            <div style={{ fontSize:'0.95rem', color:'#374151', lineHeight:1.6, fontWeight:500, whiteSpace:'pre-wrap' }}>
              {document.description ? fixEncoding(document.description) : <span style={{ color:'#9CA3AF', fontStyle:'italic' }}>Aucune description fournie pour ce document.</span>}
            </div>
          </div>
        </div>

        <div style={{ padding:'clamp(1rem, 4vw, 1.5rem)', borderTop:'1px solid #F3F4F6', background:'#FFFFFF', borderRadius:'0 0 24px 24px', display:'flex', gap:'1rem', justifyContent:'space-between', alignItems:'center' }}>
          
          <button 
            disabled={busy} 
            onClick={onDelete} 
            title="Supprimer le document"
            style={{ flex: 1, display:'flex', justifyContent:'center', alignItems:'center', height:52, borderRadius:14, border:'1px solid rgba(220,38,38,.2)', background:'rgba(254,242,242,.6)', color:'#DC2626', cursor:'pointer', transition:'all .2s' }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>

          {document.fileAsset?.url ? (
            <a 
              href={document.fileAsset.url} 
              target="_blank" 
              rel="noreferrer"
              title="Télécharger le fichier"
              style={{ flex: 1, display:'flex', justifyContent:'center', alignItems:'center', height:52, borderRadius:14, border:'none', background:'linear-gradient(135deg,#1D4ED8,#2563EB)', color:'white', cursor:'pointer', boxShadow:'0 4px 15px rgba(37,99,235,.25)', textDecoration:'none', transition:'all .2s' }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4"/></svg>
            </a>
          ) : (
            <div 
              title="Fichier indisponible"
              style={{ flex: 1, display:'flex', justifyContent:'center', alignItems:'center', height:52, borderRadius:14, background:'#F3F4F6', color:'#9CA3AF' }}
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

function UploadModalWrapper({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', zIndex:100 }} onClick={onClose} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:101, background:'rgba(253,253,255,0.98)', backdropFilter:'blur(18px)', borderRadius:22, padding:'clamp(1.5rem,4vw,2rem)', width:'min(500px,calc(100vw - 2rem))', border:'1px solid rgba(37,99,235,0.15)', boxShadow:'0 24px 60px rgba(37,99,235,0.12)', maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', lineHeight: 1, margin:0 }}>Ajouter un document</h2>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#6B7280', display:'flex', alignItems:'center', justifyContent:'center' }}>
             <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <DocumentForm onCreated={onCreated} />
      </div>
    </>
  )
}

export default function AdminDocumentsPage() {
  const [items,            setItems]            = useState<DocumentItem[]>([]);
  const [q,                setQ]                = useState('');
  const [isUploadModalOpen,setIsUploadModalOpen]= useState(false);
  const [busyId,           setBusyId]           = useState<string | null>(null);
  const [error,            setError]            = useState<string | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [detailDoc,        setDetailDoc]        = useState<DocumentItem | null>(null);
  const [deleteTarget,     setDeleteTarget]     = useState<DocumentItem | null>(null);

  const load = useCallback(async (query?: string) => {
    setError(null); setLoading(true);
    try {
      const res = await api.listAntennaDocuments({ page:1, pageSize:100, q: (query ?? q) || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally { setLoading(false); }
  }, [q]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(d: DocumentItem) {
    setBusyId(d.id);
    setDeleteTarget(null);
    if (detailDoc?.id === d.id) setDetailDoc(null);
    try {
      await api.deleteAntennaDocument(d.id);
      await load();
    } finally { setBusyId(null); }
  }

  return (
    <AppShell title="Documents &amp; m&eacute;dias">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
        .ad-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1rem,3vw,2rem);max-width:1200px;margin:0 auto}

        .ad-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:adin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .ad-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ad-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:adpulse 2s ease-in-out infinite}
        @keyframes adpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ad-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15;margin:0;}
        .ad-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .ad-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:2rem;opacity:0;transform:translateY(10px);animation:adin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        .ad-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(37,99,235,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(37,99,235,.04);padding:.7rem .5rem;text-align:center}
        .ad-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .ad-stat-lbl{font-size:.58rem;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}

        .ad-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; animation: adin .5s .10s both; }
        .ad-section-title { font-size: 1rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #111827; margin:0;}
        .ad-btn-add { height: 38px; padding: 0 1rem; border-radius: 12px; background: #2563eb; border: none; color: white; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.45rem; transition: all 0.18s; white-space: nowrap; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25); }
        .ad-btn-add:hover { background: #1d4ed8; transform: translateY(-1px); }

        .ad-search-bar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; position: relative; animation: adin .5s .12s both; }
        .ad-search-input { flex: 1; height: 46px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); background: white; padding: 0 1rem 0 2.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; color: #111827; outline: none; box-shadow: 0 2px 10px rgba(0,0,0,0.02); transition: all 0.2s; width: 100%; }
        .ad-search-input:focus { border-color: rgba(37, 99, 235, 0.3); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08); }
        .ad-search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .ad-search-btn-new { height: 46px; width: 46px; border-radius: 14px; background: #2563eb; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25); flex-shrink: 0; transition: all 0.2s; }
        .ad-search-btn-new:hover { background: #1d4ed8; }

        .ad-cards-grid { display: flex; flex-direction: column; gap: 1rem; animation: adin .5s .14s both; }
        
        .ad-card { background: #F8FAFC; border-radius: 1.25rem; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03); cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; }
        .ad-card:hover { transform: translateY(-3px); box-shadow: 0 12px 20px -5px rgba(0,0,0,0.08); background: #F1F5F9; border-color: #CBD5E1; }
        
        .ad-card-top { padding: 1.25rem 1.25rem 0.5rem; display: flex; gap: 1rem; align-items: flex-start; }
        .ad-card-icon { width: 3rem; height: 3rem; border-radius: 1rem; background: #DBEAFE; border: 1px solid #BFDBFE; display: flex; align-items: center; justify-content: center; color: #2563EB; flex-shrink: 0; box-shadow: 0 2px 4px rgba(37,99,235,0.1); }
        .ad-card-content { flex: 1; padding-top: 0.1rem; width: 100%; overflow: hidden; }
        .ad-card-title-row { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; margin-bottom: 0.5rem; }
        .ad-card-title { font-family: 'Cormorant Garamond', serif; font-size: 1.25rem; font-weight: 700; color: #0F172A; line-height: 1.1; word-break: break-word; }
        .ad-card-desc { font-size: 0.85rem; color: #475569; font-weight: 500; margin-top: 0.5rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .ad-card-date { font-size: 0.85rem; color: #64748B; margin: 0.75rem 0; font-weight: 500; }
        .ad-card-filename { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: #475569; background: #FFFFFF; padding: 0.5rem 0.6rem; border-radius: 0.5rem; border: 1px solid #E2E8F0; word-break: break-all; display: inline-block; width: 100%; box-sizing: border-box; }
        
        .ad-card-bottom { background: transparent; padding: 0.875rem 1.25rem; border-top: 1px solid #E2E8F0; display: flex; align-items: center; margin-top: auto; }
        .ad-card-action { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: #334155; transition: color 0.2s; }
        .ad-card:hover .ad-card-action { color: #2563EB; }

        .ad-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin-bottom:1rem}
        
        .ad-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .ad-ring{width:24px;height:24px;border:2.5px solid rgba(37,99,235,.12);border-top-color:#2563EB;border-radius:50%;animation:adspin .8s linear infinite}
        
        .ad-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF; text-align: center; background: #F8FAFC; border-radius: 1.5rem; border: 1px dashed #E2E8F0;}
        .ad-empty-title{font-size:.95rem;font-weight:800;color:#374151}
        .ad-empty-sub{font-size:.8rem;font-weight:500; color: #64748B;}

        @keyframes adin{to{opacity:1;transform:translateY(0)}}
        @keyframes adspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ad-wrap">

        <div className="ad-header">
          <div className="ad-eyebrow"><div className="ad-dot" />Admin antenne</div>
          <h1 className="ad-title">Documents <span>&amp; m&eacute;dias</span></h1>
        </div>

        <div className="ad-stats">
          {([
            { label: 'Documents',    value: items.length,                                      color: '#2563EB' },
            { label: 'Avec fichier', value: items.filter(d => d.fileAsset?.url).length,        color: '#059669' },
            { label: 'Sans fichier', value: items.filter(d => !d.fileAsset?.url).length,       color: '#9CA3AF' },
          ] as const).map(s => (
            <div key={s.label} className="ad-stat" style={{ borderTopColor: s.color }}>
              <div className="ad-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="ad-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="ad-section-header">
          <h3 className="ad-section-title">DOCUMENTS</h3>
          <button 
            className="ad-btn-add" 
            onClick={() => setIsUploadModalOpen(true)}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M12 4v16m8-8H4"/></svg>
            Ajouter
          </button>
        </div>

        <div className="ad-search-bar">
          <div className="ad-search-icon">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
          </div>
          <input
            className="ad-search-input"
            type="text"
            placeholder="Mots-clés, titre..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void load(q)}
          />
          <button className="ad-search-btn-new" onClick={() => void load(q)}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
          </button>
        </div>

        {error && (
          <div className="ad-error">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="ad-loader"><div className="ad-ring" />Chargement&#8230;</div>
        ) : !error && items.length === 0 ? (
          <div className="ad-empty">
            <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#CBD5E1" strokeWidth="1.3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="ad-empty-title">Aucun document trouvé</div>
            <div className="ad-empty-sub">Ajoutez votre premier fichier ci-dessus.</div>
          </div>
        ) : !error ? (
          <div className="ad-cards-grid">
            {items.map((d, i) => (
              <div 
                key={d.id} 
                className="ad-card"
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => setDetailDoc(d)}
              >
                <div className="ad-card-top">
                  <div className="ad-card-icon">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ad-card-content">
                    <div className="ad-card-title-row">
                      <div className="ad-card-title">{fixEncoding(d.title)}</div>
                    </div>
                    {d.description && <div className="ad-card-desc">{fixEncoding(d.description)}</div>}
                    <div className="ad-card-date">{formatDate(d.createdAt)}</div>
                    {d.fileAsset?.fileName && (
                      <div className="ad-card-filename">{fixEncoding(d.fileAsset.fileName)}</div>
                    )}
                  </div>
                </div>
                <div className="ad-card-bottom">
                  <div className="ad-card-action">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Détails &amp; Téléchargement
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {isUploadModalOpen && (
        <UploadModalWrapper 
          onClose={() => setIsUploadModalOpen(false)}
          onCreated={() => {
            void load();
            setIsUploadModalOpen(false);
          }}
        />
      )}

      {detailDoc && (
        <DetailModal
          document={detailDoc}
          onClose={() => setDetailDoc(null)}
          onDelete={() => {
            setDeleteTarget(detailDoc);
            setDetailDoc(null);
          }}
          busy={busyId === detailDoc.id}
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