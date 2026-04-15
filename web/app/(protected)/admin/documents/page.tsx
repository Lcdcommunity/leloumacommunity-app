// web/app/(protected)/admin/documents/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { DocumentForm } from '../../../../components/admin/DocumentForm';
import { api } from '../../../../lib/api-client';
import type { DocumentItem } from '../../../../types/document';
import { formatDate, formatDateTime } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ FIX ENCODING */
function fixEncoding(str?: string | null): string {
  if (!str) return '';
  try {
    if (str.includes('Ã')) return decodeURIComponent(escape(str));
    return str;
  } catch {
    return str
      .replace(/RÃ©union/g, 'Réunion')
      .replace(/NÂ°/g, 'N°')
      .replace(/Ã©/g, 'é')
      .replace(/Ã¨/g, 'è')
      .replace(/Ã /g, 'à')
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
function FileTypeBadge({ mimeType }: { mimeType?: string | null }) {
  const mime = mimeType ?? '';
  let ext = 'FILE'; let color = '#6B7280'; let bg = '#F3F4F6'; let border = '#E5E7EB';
  if (mime.includes('pdf'))                                     { ext = 'PDF'; color = '#DC2626'; bg = '#FEF2F2'; border = '#FECACA'; }
  else if (mime.includes('word') || mime.includes('document')) { ext = 'DOC'; color = '#2563EB'; bg = '#EFF6FF'; border = '#BFDBFE'; }
  else if (mime.includes('sheet') || mime.includes('excel'))   { ext = 'XLS'; color = '#059669'; bg = '#ECFDF5'; border = '#A7F3D0'; }
  else if (mime.includes('image'))                             { ext = 'IMG'; color = '#7C3AED'; bg = '#F5F3FF'; border = '#DDD6FE'; }
  else if (mime.includes('zip') || mime.includes('compress'))  { ext = 'ZIP'; color = '#D97706'; bg = '#FFFBEB'; border = '#FDE68A'; }
  return (
    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '.62rem', fontWeight: 800, color, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '.15rem .45rem', whiteSpace: 'nowrap', display: 'inline-block' }}>
      {ext}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ VISIBILITY BADGE */
function VisibilityBadge({ visibility }: { visibility?: string | null }) {
  if (!visibility || visibility === 'ALL') {
    return <span style={{ fontSize: '.65rem', fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '.15rem .5rem', borderRadius: '99px', display: 'inline-block' }}>Public</span>;
  }
  if (visibility === 'ADMIN') {
    return <span style={{ fontSize: '.65rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '.15rem .5rem', borderRadius: '99px', border: '1px solid #FECACA', display: 'inline-block' }}>Admins</span>;
  }
  if (visibility === 'MEMBER') {
    return <span style={{ fontSize: '.65rem', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '.15rem .5rem', borderRadius: '99px', border: '1px solid #BFDBFE', display: 'inline-block' }}>Membres</span>;
  }
  return null;
}

/* ══════════════════════════════════════════════════════ FORMAT BYTES */
function formatSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024)         return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ══════════════════════════════════════════════════════ DELETE MODAL */
function DeleteModal({
  doc, onConfirm, onCancel, busy,
}: { doc: DocumentItem; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 200 }} onClick={onCancel} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(440px,calc(100vw - 2rem))', border: '1px solid rgba(37,99,235,.15)', boxShadow: '0 24px 60px rgba(37,99,235,.12)' }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.4rem' }}>Supprimer ce document&nbsp;?</h2>
        <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600, lineHeight: 1.55 }}>
          <strong style={{ color: '#111827' }}>{fixEncoding(doc.title)}</strong> sera supprim&eacute; d&eacute;finitivement.
        </p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center' }}>
          <button onClick={onCancel} disabled={busy} style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid rgba(37,99,235,.18)', background: 'rgba(249,250,251,.95)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirm} disabled={busy} style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#B91C1C,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.35)', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            {busy && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'adspin .7s linear infinite' }} />}
            Supprimer
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ UPLOAD MODAL WRAPPER (Rôle Admin) */
function UploadModalWrapper({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'rgba(253,253,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(500px,calc(100vw - 2rem))', border: '1px solid rgba(37,99,235,.15)', boxShadow: '0 24px 60px rgba(37,99,235,.12)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.25rem', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', lineHeight: 1, margin:0 }}>Ajouter un document</h2>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <DocumentForm onCreated={onCreated} />
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ DETAILS MODAL */
function DocumentDetailsModal({
  doc, onClose, onDelete,
}: { doc: DocumentItem; onClose: () => void; onDelete: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'rgba(253,253,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(550px,calc(100vw - 2rem))', border: '1px solid rgba(37,99,235,.15)', boxShadow: '0 24px 60px rgba(37,99,235,.12)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.2rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 700, color: '#111827', lineHeight: 1.1, marginBottom: '.5rem' }}>
              {fixEncoding(doc.title)}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
              <VisibilityBadge visibility={doc.visibility} />
              <FileTypeBadge mimeType={doc.fileAsset?.mimeType} />
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#F3F4F6', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', flexShrink: 0 }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Description */}
        <div style={{ background: 'rgba(249,250,251,.8)', border: '1px solid #E5E7EB', borderRadius: 14, padding: '1rem', marginBottom: '1.2rem' }}>
          <h4 style={{ fontSize: '.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9CA3AF', marginBottom: '.4rem' }}>Description du document</h4>
          <p style={{ fontSize: '.86rem', color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0, fontWeight: 500 }}>
            {doc.description
              ? fixEncoding(doc.description)
              : <span style={{ fontStyle: 'italic', color: '#9CA3AF' }}>Aucune description fournie.</span>}
          </p>
        </div>
        {/* Meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '0 .5rem' }}>
          <div>
            <div style={{ fontSize: '.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9CA3AF', marginBottom: '.2rem' }}>Fichier original</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.8rem', fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>
              {doc.fileAsset?.fileName ? fixEncoding(doc.fileAsset.fileName) : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9CA3AF', marginBottom: '.2rem' }}>Taille</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.8rem', fontWeight: 600, color: '#111827' }}>
              {formatSize(doc.fileAsset?.sizeBytes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9CA3AF', marginBottom: '.2rem' }}>Ajouté le</div>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#111827' }}>
              {formatDateTime(doc.createdAt)}
            </div>
          </div>
        </div>

        {/* ── FOOTER : icônes uniquement ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '1.2rem', borderTop: '1px solid rgba(37,99,235,.08)', gap: '.65rem' }}>

          {/* Supprimer — icône poubelle (Reste rouge car Danger) */}
          <button
            onClick={onDelete}
            title="Supprimer ce document"
            aria-label="Supprimer"
            style={{
              width: 42, height: 42, borderRadius: 12,
              background: '#FEF2F2', border: '1.5px solid #FECACA',
              color: '#DC2626', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .17s', flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2';
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 10px rgba(220,38,38,.18)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2';
              (e.currentTarget as HTMLButtonElement).style.transform = 'none';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Télécharger — icône flèche bas */}
          {doc.fileAsset?.url && (
            <a
              href={doc.fileAsset.url}
              target="_blank"
              rel="noreferrer"
              title="Télécharger le fichier"
              aria-label="Télécharger"
              style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg,#1D4ED8,#2563EB)',
                border: 'none', color: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(37,99,235,.28)',
                transition: 'all .17s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 18px rgba(37,99,235,.38)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'none';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 12px rgba(37,99,235,.28)';
              }}
            >
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminDocumentsPage() {
  const [items,   setItems]   = useState<DocumentItem[]>([]);
  const [q,       setQ]       = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId,  setBusyId]  = useState<string | null>(null);

  const [deleteTarget,      setDeleteTarget]      = useState<DocumentItem | null>(null);
  const [viewingDoc,        setViewingDoc]        = useState<DocumentItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const load = useCallback(async (searchQuery?: string) => {
    setError(null); setLoading(true);
    try {
      const res = await api.listAntennaDocuments({ q: searchQuery ?? undefined, page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(''); }, [load]);

  async function handleDelete(doc: DocumentItem) {
    setBusyId(doc.id); setDeleteTarget(null); setViewingDoc(null);
    try {
      await api.deleteAntennaDocument(doc.id);
      await load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Documents / médias">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .ad-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1rem,3vw,2rem);max-width:1200px;margin:0 auto}

        .ad-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:adin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .ad-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ad-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:adpulse 2s ease-in-out infinite}
        @keyframes adpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ad-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ad-title span{background:linear-gradient(135deg,#1D4ED8,#2563EB);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .ad-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:2rem;opacity:0;transform:translateY(10px);animation:adin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        .ad-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(37,99,235,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(37,99,235,.04);padding:.7rem .5rem;text-align:center}
        .ad-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.45rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .ad-stat-lbl{font-size:.58rem;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}

        .ad-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;animation:adin .5s .10s both}
        .ad-section-title{font-size:1rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#111827}
        .ad-btn-add{height:38px;padding:0 1rem;border-radius:12px;background:#2563EB;border:none;color:white;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.45rem;transition:all .18s;white-space:nowrap;box-shadow:0 4px 10px rgba(37,99,235,.25)}
        .ad-btn-add:hover{background:#1D4ED8;transform:translateY(-1px)}
        .ad-btn-add:disabled{opacity:.6;cursor:not-allowed;transform:none}

        .ad-search-bar{display:flex;align-items:center;gap:.5rem;margin-bottom:1.5rem;position:relative;animation:adin .5s .12s both}
        .ad-search-input{flex:1;height:46px;border-radius:16px;border:1px solid rgba(0,0,0,.05);background:white;padding:0 1rem 0 2.8rem;font-family:'DM Sans',sans-serif;font-size:.88rem;font-weight:500;color:#111827;outline:none;box-shadow:0 2px 10px rgba(0,0,0,.02);transition:all .2s;width:100%}
        .ad-search-input:focus{border-color:rgba(37,99,235,.3);box-shadow:0 0 0 3px rgba(37,99,235,.08)}
        .ad-search-icon{position:absolute;left:1rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .ad-search-btn-new{height:46px;width:46px;border-radius:14px;background:#2563EB;border:none;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(37,99,235,.25);flex-shrink:0;transition:all .2s}
        .ad-search-btn-new:hover{background:#1D4ED8}

        .ad-cards-grid{display:flex;flex-direction:column;gap:1rem;animation:adin .5s .14s both}
        .ad-card{background:white;border-radius:1.5rem;border:1px solid #f3f4f6;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.02);cursor:pointer;transition:all .2s}
        .ad-card:hover{transform:translateY(-2px);box-shadow:0 8px 16px rgba(0,0,0,.04)}
        .ad-card-top{background:#EFF6FF;padding:1.25rem;display:flex;gap:1rem;align-items:flex-start}
        .ad-card-icon{width:3rem;height:3rem;border-radius:1rem;background:#DBEAFE;border:1px solid #BFDBFE;display:flex;align-items:center;justify-content:center;color:#2563EB;flex-shrink:0;box-shadow:0 2px 4px rgba(37,99,235,.1)}
        .ad-card-content{flex:1;padding-top:.1rem;width:100%;overflow:hidden}
        .ad-card-title-row{display:flex;flex-direction:column;align-items:flex-start;gap:.35rem;margin-bottom:.5rem}
        .ad-card-title{font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:700;color:#111827;line-height:1.1;word-break:break-word}
        .ad-card-desc{font-size:.85rem;color:#374151;font-weight:500;margin-top:.5rem;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .ad-card-date{font-size:.85rem;color:#6B7280;margin:.75rem 0}
        .ad-card-filename{font-family:'DM Mono',monospace;font-size:.75rem;color:#4B5563;background:rgba(255,255,255,.6);padding:.5rem;border-radius:.5rem;border:1px solid #EFF6FF;word-break:break-all}
        .ad-card-bottom{background:white;padding:.875rem 1.25rem;border-top:1px solid rgba(243,244,246,.8);display:flex;align-items:center}
        .ad-card-action{display:flex;align-items:center;gap:.5rem;font-size:.85rem;font-weight:600;color:#374151}

        .ad-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin-bottom:1rem}

        .ad-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .ad-ring{width:24px;height:24px;border:2.5px solid rgba(37,99,235,.12);border-top-color:#2563EB;border-radius:50%;animation:adspin .8s linear infinite}

        .ad-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF;text-align:center}
        .ad-empty-title{font-size:.9rem;font-weight:800;color:#374151}
        .ad-empty-sub{font-size:.78rem;font-weight:600}

        @keyframes adin{to{opacity:1;transform:translateY(0)}}
        @keyframes adspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ad-wrap">

        {/* Header */}
        <div className="ad-header">
          <div className="ad-eyebrow"><div className="ad-dot" />Admin antenne</div>
          <h1 className="ad-title">Documents <span>&amp; m&eacute;dias</span></h1>
        </div>

        {/* Stats */}
        <div className="ad-stats">
          {([
            { label: 'Documents',    value: items.length,                                color: '#2563EB' },
            { label: 'Avec fichier', value: items.filter(d => d.fileAsset?.url).length,  color: '#059669' },
            { label: 'Sans fichier', value: items.filter(d => !d.fileAsset?.url).length, color: '#9CA3AF' },
          ] as const).map(s => (
            <div key={s.label} className="ad-stat" style={{ borderTopColor: s.color }}>
              <div className="ad-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="ad-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div className="ad-section-header">
          <h3 className="ad-section-title">DOCUMENTS</h3>
          <button className="ad-btn-add" onClick={() => setIsUploadModalOpen(true)}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M12 4v16m8-8H4" /></svg>
            Ajouter
          </button>
        </div>

        {/* Search */}
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

        {/* Content */}
        {loading ? (
          <div className="ad-loader"><div className="ad-ring" />Chargement&#8230;</div>
        ) : !error && items.length === 0 ? (
          <div className="ad-empty">
            <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="ad-empty-title">Aucun document trouv&eacute;</div>
            <div className="ad-empty-sub">Uploadez votre premier fichier ci-dessus.</div>
          </div>
        ) : !error ? (
          <div className="ad-cards-grid">
            {items.map((d, i) => (
              <div
                key={d.id}
                className="ad-card"
                style={{ animationDelay: `${i * 0.04}s` }}
                onClick={() => setViewingDoc(d)}
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
                      <VisibilityBadge visibility={d.visibility} />
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
                    Détails / Téléchargement
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
            void load(q);
            setIsUploadModalOpen(false);
          }}
        />
      )}

      {viewingDoc && (
        <DocumentDetailsModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onDelete={() => {
            setDeleteTarget(viewingDoc);
            setViewingDoc(null);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          busy={busyId !== null}
          onConfirm={() => void handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  );
}