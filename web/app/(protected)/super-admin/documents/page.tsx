// web/app/(protected)/super-admin/documents/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { DocumentItem } from '../../../../types/document';
import { formatDate, formatDateTime } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ FILE TYPE BADGE */
function FileTypeBadge({ mimeType }: { mimeType?: string | null }) {
  const mime = mimeType ?? '';
  let ext = 'FILE'; let color = '#6B7280'; let bg = '#F3F4F6'; let border = '#E5E7EB';
  if (mime.includes('pdf'))                                    { ext = 'PDF';  color = '#DC2626'; bg = '#FEF2F2'; border = '#FECACA'; }
  else if (mime.includes('word') || mime.includes('document')) { ext = 'DOC';  color = '#2563EB'; bg = '#EFF6FF'; border = '#BFDBFE'; }
  else if (mime.includes('sheet') || mime.includes('excel'))   { ext = 'XLS';  color = '#059669'; bg = '#ECFDF5'; border = '#A7F3D0'; }
  else if (mime.includes('image'))                             { ext = 'IMG';  color = '#7C3AED'; bg = '#F5F3FF'; border = '#DDD6FE'; }
  else if (mime.includes('zip') || mime.includes('compress'))  { ext = 'ZIP';  color = '#D97706'; bg = '#FFFBEB'; border = '#FDE68A'; }
  return (
    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.65rem', fontWeight: 700, color, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '.15rem .45rem', whiteSpace: 'nowrap', display: 'inline-block' }}>
      {ext}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ VISIBILITY BADGE */
function VisibilityBadge({ visibility }: { visibility?: string | null }) {
  if (!visibility || visibility === 'ALL') {
    return <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#6B7280', background: '#F3F4F6', padding: '.15rem .5rem', borderRadius: '99px', display: 'inline-block' }}>Public</span>;
  }
  if (visibility === 'ADMIN') {
    return <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', padding: '.15rem .5rem', borderRadius: '99px', border: '1px solid #FECACA', display: 'inline-block' }}>Admins</span>;
  }
  if (visibility === 'MEMBER') {
    return <span style={{ fontSize: '.68rem', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '.15rem .5rem', borderRadius: '99px', border: '1px solid #BFDBFE', display: 'inline-block' }}>Membres</span>;
  }
  return null;
}

/* ══════════════════════════════════════════════════════ FORMAT BYTES */
function formatSize(bytes?: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} o`;
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
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 201, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(440px,calc(100vw - 2rem))', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(220,38,38,.12)' }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.4rem' }}>Supprimer ce document&nbsp;?</h2>
        <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600, lineHeight: 1.55 }}>
          <strong style={{ color: '#111827' }}>{doc.title}</strong> sera supprim&eacute; d&eacute;finitivement.
        </p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center' }}>
          <button onClick={onCancel} disabled={busy} style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid rgba(220,38,38,.18)', background: 'rgba(249,250,251,.95)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirm} disabled={busy} style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.35)', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            {busy && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'sdspin .7s linear infinite' }} />}
            Supprimer
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ UPLOAD MODAL */
function UploadModal({
  onUpload, onCancel, busy
}: { 
  onUpload: (data: { file: File; title: string; visibility: string; description: string }) => void; 
  onCancel: () => void; 
  busy: boolean 
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState('ALL');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    onUpload({ file, title: title || file.name, visibility, description });
  };

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={() => !busy && onCancel()} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'rgba(253,253,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(500px,calc(100vw - 2rem))', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(220,38,38,.12)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#991B1B,#DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(220,38,38,.3)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', lineHeight: 1 }}>Ajouter un document</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              Fichier <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input 
              type="file" 
              required 
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              style={{ width: '100%', padding: '.5rem', border: '1.5px dashed rgba(220,38,38,.3)', borderRadius: 11, background: '#FEF2F2', color: '#111827', fontSize: '.85rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              Titre du document
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              disabled={busy}
              placeholder="Ex: Règlement intérieur 2026"
              style={{ width: '100%', height: 42, borderRadius: 11, border: '1.5px solid rgba(220,38,38,.18)', background: 'white', padding: '0 .95rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.86rem', fontWeight: 600, color: '#111827', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              Visibilité (Type d&apos;accès) <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <select 
              value={visibility} 
              onChange={(e) => setVisibility(e.target.value)} 
              disabled={busy}
              style={{ width: '100%', height: 42, borderRadius: 11, border: '1.5px solid rgba(220,38,38,.18)', background: 'white', padding: '0 .95rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.86rem', fontWeight: 600, color: '#111827', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">Tous (Admins & Membres)</option>
              <option value="ADMIN">Admins d&apos;antenne uniquement</option>
              <option value="MEMBER">Membres uniquement</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              Corps / Description du document
            </label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              disabled={busy}
              placeholder="Ajoutez une description, le contexte ou un résumé du document..."
              style={{ width: '100%', height: 80, borderRadius: 11, border: '1.5px solid rgba(220,38,38,.18)', background: 'white', padding: '.75rem .95rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.86rem', fontWeight: 500, color: '#111827', outline: 'none', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end', marginTop: '.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(220,38,38,.08)' }}>
            <button type="button" onClick={onCancel} disabled={busy} style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid rgba(220,38,38,.18)', background: 'rgba(249,250,251,.95)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={busy || !file} style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.35)', opacity: (busy || !file) ? .6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              {busy && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'sdspin .7s linear infinite' }} />}
              Uploader
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ DETAILS MODAL */
function DocumentDetailsModal({
  doc, onClose, onDelete
}: { doc: DocumentItem; onClose: () => void; onDelete: () => void; }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'rgba(253,253,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(550px,calc(100vw - 2rem))', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(220,38,38,.12)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        {/* Header Modale */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.2rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 700, color: '#111827', lineHeight: 1.1, marginBottom: '.5rem' }}>
              {doc.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
              <VisibilityBadge visibility={doc.visibility} />
              <FileTypeBadge mimeType={doc.fileAsset?.mimeType} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B7280', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Corps / Description */}
        <div style={{ background: 'rgba(249,250,251,.8)', border: '1px solid #E5E7EB', borderRadius: 14, padding: '1rem', marginBottom: '1.2rem' }}>
          <h4 style={{ fontSize: '.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9CA3AF', marginBottom: '.4rem' }}>Description du document</h4>
          <p style={{ fontSize: '.86rem', color: '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0, fontWeight: 500 }}>
            {doc.description || <span style={{ fontStyle: 'italic', color: '#9CA3AF' }}>Aucune description fournie.</span>}
          </p>
        </div>

        {/* Infos / Métadonnées */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '0 .5rem' }}>
          <div>
            <div style={{ fontSize: '.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', color: '#9CA3AF', marginBottom: '.2rem' }}>Fichier original</div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.8rem', fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>
              {doc.fileAsset?.fileName ?? '—'}
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

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.2rem', borderTop: '1px solid rgba(220,38,38,.08)', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Bouton de suppression déplacé ici */}
          <button onClick={onDelete} style={{ background: 'rgba(254,242,242,.8)', border: '1px solid rgba(220,38,38,.2)', padding: '0 1rem', height: 38, borderRadius: 10, color: '#DC2626', fontSize: '.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem', transition: 'all .15s' }} className="sd-btn-del-modal">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Supprimer le document
          </button>

          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button onClick={onClose} style={{ height: 38, padding: '0 1rem', borderRadius: 10, border: '1px solid #D1D5DB', background: 'transparent', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Fermer</button>
            {doc.fileAsset?.url && (
              <a href={doc.fileAsset.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '.4rem', height: 38, padding: '0 1.2rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 4px 12px rgba(37,99,235,.25)' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Télécharger
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminDocumentsPage() {
  const [items,        setItems]        = useState<DocumentItem[]>([]);
  const [q,            setQ]            = useState('');
  const [error,        setError]        = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [busyId,       setBusyId]       = useState<string | null>(null);
  
  // États des modales
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [viewingDoc,   setViewingDoc]   = useState<DocumentItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMsg,    setUploadMsg]    = useState<string | null>(null);

  const load = useCallback(async (searchQuery?: string) => {
    setError(null); setLoading(true);
    try {
      // On utilise searchQuery s'il est fourni, sinon on évite de dépendre de 'q'
      const res = await api.listDocuments({ q: searchQuery || undefined, page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement documents');
    } finally {
      setLoading(false);
    }
  }, []); // <-- La dépendance à 'q' est retirée, la fonction est stable

  useEffect(() => {
    void load('');
  }, [load]); // <-- ESLint est content

  async function handleModalUpload(data: { file: File; title: string; visibility: string; description: string }) {
    setUploading(true); setError(null); setUploadMsg(null);
    try {
      const uploaded = await api.uploadFile(data.file, {
        category: 'ASSOCIATION_DOCUMENT',
        folder: 'association-docs',
        description: data.description || 'Upload super admin',
      });

      await api.createSuperAdminDocument({
        title: data.title,
        description: data.description,
        visibility: data.visibility,
        fileAssetId: uploaded.id,
      });

      setUploadMsg(`\u00ab\u00a0${data.title}\u00a0\u00bb upload\u00e9 avec succ\u00e8s.`);
      setIsUploadModalOpen(false);
      await load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: DocumentItem) {
    setBusyId(doc.id); setDeleteTarget(null); setViewingDoc(null);
    try {
      await api.deleteDocument(doc.id);
      await load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setBusyId(null);
    }
  }

  const thStyle: React.CSSProperties = { padding: '.75rem 1.2rem', fontSize: '.63rem', fontWeight: 900, letterSpacing: '.11em', textTransform: 'uppercase', color: '#374151', background: 'rgba(254,242,242,.35)', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '.9rem 1.2rem', fontSize: '.82rem', color: '#111827', verticalAlign: 'middle' };

  return (
    <AppShell title="Documents / médias">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .sd-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1200px;margin:0 auto}

        /* Header */
        .sd-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:sdin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .sd-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sd-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:sdpulse 2s ease-in-out infinite}
        @keyframes sdpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sd-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sd-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* Stats */
        .sd-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:sdin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:540px){.sd-stats{grid-template-columns:1fr 1fr}}
        .sd-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem 1rem}
        .sd-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.65rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .sd-stat-lbl{font-size:.64rem;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.07em}

        /* Panel */
        .sd-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:sdin .5s .14s cubic-bezier(.22,1,.36,1) forwards}
        .sd-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .sd-panel-titlerow{display:flex;align-items:center;gap:.55rem}
        .sd-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .sd-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .sd-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}

        /* Upload btn */
        .sd-btn-upload{height:38px;padding:0 1rem;border-radius:10px;background:rgba(254,242,242,.6);border:1.5px solid rgba(220,38,38,.2);color:#B91C1C;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.45rem;transition:all .18s;white-space:nowrap}
        .sd-btn-upload:hover{background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}
        .sd-btn-upload:disabled{opacity:.6;cursor:not-allowed}

        /* Toolbar */
        .sd-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07)}
        .sd-sw{position:relative;flex:1;min-width:200px}
        .sd-si{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .sd-input{width:100%;height:40px;border-radius:11px;border:1px solid rgba(220,38,38,.15);background:rgba(255,255,255,.88);padding:0 .9rem 0 2.5rem;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:600;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .sd-input:focus{border-color:rgba(220,38,38,.4);box-shadow:0 0 0 3px rgba(220,38,38,.08);background:white}
        .sd-input::placeholder{color:rgba(107,114,128,.45);font-weight:400}
        .sd-search-btn{height:40px;padding:0 1.1rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800;display:flex;align-items:center;gap:.4rem;box-shadow:0 3px 10px rgba(220,38,38,.3);transition:all .18s;white-space:nowrap}
        .sd-search-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(220,38,38,.4)}

        /* Upload success toast */
        .sd-upload-success{display:flex;align-items:center;gap:.55rem;padding:.75rem 1.4rem;background:rgba(236,253,245,.8);border-bottom:1px solid rgba(5,150,105,.15);font-size:.8rem;font-weight:700;color:#059669}

        /* Table */
        .sd-tw{overflow-x:auto}
        .sd-table{width:100%;border-collapse:collapse;min-width:700px}
        .sd-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .sd-table tbody tr{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s;animation:sdin .4s cubic-bezier(.22,1,.36,1) both}
        .sd-table tbody tr:last-child{border-bottom:none}
        
        /* Lignes cliquables */
        .sd-row-clickable { cursor: pointer; }
        .sd-row-clickable:hover { background: rgba(220,38,38,.03) !important; }

        /* Cell helpers */
        .sd-doc-title{font-weight:800;font-size:.88rem;color:#0F172A;margin-bottom:4px}
        .sd-doc-desc{font-size:.74rem;font-weight:500;color:#6B7280;margin-top:4px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.4}
        .sd-filename{font-family:'DM Mono',monospace;font-size:.75rem;font-weight:600;color:#2563EB;text-decoration:none;display:inline-flex;align-items:center;gap:.3rem;transition:color .15s; padding: .2rem .4rem; border-radius: 6px; margin-left: -.4rem;}
        .sd-filename:hover{color:#1D4ED8; background: rgba(37,99,235,.08);}
        .sd-dash{color:#D1D5DB;font-weight:700}

        /* Mobile cards */
        .sd-mob{display:none;flex-direction:column}
        @media(max-width:768px){.sd-tw{display:none}.sd-mob{display:flex}}
        .sd-mc{padding:1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:sdin .4s cubic-bezier(.22,1,.36,1) both; cursor: pointer; transition: background .15s;}
        .sd-mc:last-child{border-bottom:none}
        .sd-mc:hover{background: rgba(220,38,38,.02);}
        .sd-mc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;margin-bottom:.5rem}
        .sd-mc-meta{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem}

        /* Delete button (in modal only now) */
        .sd-btn-del-modal:hover { background: #FEE2E2 !important; border-color: rgba(220,38,38,.4) !important; transform: translateY(-1px); }

        /* States */
        .sd-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .sd-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:sdspin .8s linear infinite}
        .sd-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}
        .sd-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .sd-empty-title{font-size:.9rem;font-weight:800;color:#374151}
        .sd-empty-sub{font-size:.78rem;font-weight:600}

        @keyframes sdin{to{opacity:1;transform:translateY(0)}}
        @keyframes sdspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="sd-wrap">

        {/* Header */}
        <div className="sd-header">
          <div className="sd-eyebrow"><div className="sd-dot" />Super Admin</div>
          <h1 className="sd-title">Documents <span>&amp; m&eacute;dias</span></h1>
        </div>

        {/* Stats */}
        <div className="sd-stats">
          {([
            { label: 'Documents',    value: items.length,                                      color: '#DC2626' },
            { label: 'Avec fichier', value: items.filter(d => d.fileAsset?.url).length,        color: '#2563EB' },
            { label: 'Sans fichier', value: items.filter(d => !d.fileAsset?.url).length,       color: '#9CA3AF' },
          ] as const).map(s => (
            <div key={s.label} className="sd-stat" style={{ borderTopColor: s.color }}>
              <div className="sd-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="sd-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Panel */}
        <div className="sd-panel">
          <div className="sd-panel-head">
            <div className="sd-panel-titlerow">
              <div className="sd-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="sd-panel-title">Documents t&eacute;l&eacute;chargeables</span>
              {items.length > 0 && <span className="sd-count-chip">{items.length}</span>}
            </div>

            <button 
              className="sd-btn-upload" 
              onClick={() => setIsUploadModalOpen(true)}
              disabled={uploading}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M12 4v16m8-8H4"/></svg>
              Ajouter un document
            </button>
          </div>
          
          {/* Upload success */}
          {uploadMsg && (
            <div className="sd-upload-success">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {uploadMsg}
              <button onClick={() => setUploadMsg(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#059669', fontSize: '.85rem', lineHeight: 1, padding: 0 }}>✕</button>
            </div>
          )}

          {/* Toolbar */}
          <div className="sd-toolbar">
            <div className="sd-sw">
              <span className="sd-si">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
              </span>
              <input
                className="sd-input"
                type="text"
                placeholder="Mots-cl&eacute;s, titre&#8230;"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void load(q)}
              />
            </div>
            <button className="sd-search-btn" onClick={() => void load(q)}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
              Rechercher
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="sd-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
              {error}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="sd-loader"><div className="sd-ring" />Chargement&#8230;</div>
          ) : !error && items.length === 0 ? (
            <div className="sd-empty">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="sd-empty-title">Aucun document trouv&eacute;</div>
              <div className="sd-empty-sub">Uploadez votre premier fichier ci-dessus.</div>
            </div>
          ) : !error ? (
            <>
              {/* ── Desktop table ── */}
              <div className="sd-tw">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th style={thStyle}>Document</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Fichier</th>
                      <th style={thStyle}>Visibilité</th>
                      <th style={thStyle}>Cr&eacute;&eacute; le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((d, i) => (
                      <tr 
                        key={d.id} 
                        className="sd-row-clickable" 
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => setViewingDoc(d)}
                      >
                        <td style={tdStyle}>
                          <div className="sd-doc-title">{d.title}</div>
                          {d.description && <div className="sd-doc-desc">{d.description}</div>}
                        </td>
                        <td style={tdStyle}><FileTypeBadge mimeType={d.fileAsset?.mimeType} /></td>
                        <td style={tdStyle}>
                          {d.fileAsset?.url
                            ? (
                              <a 
                                className="sd-filename" 
                                href={d.fileAsset.url} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()} // Évite d'ouvrir la modale si on clique juste sur le lien
                              >
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Télécharger
                              </a>
                            )
                            : <span className="sd-dash">—</span>
                          }
                        </td>
                        <td style={tdStyle}><VisibilityBadge visibility={d.visibility} /></td>
                        <td style={tdStyle}><span className="sd-date">{formatDate(d.createdAt)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="sd-mob">
                {items.map((d, i) => (
                  <div 
                    key={d.id} 
                    className="sd-mc" 
                    style={{ animationDelay: `${i * 0.04}s` }}
                    onClick={() => setViewingDoc(d)}
                  >
                    <div className="sd-mc-top">
                      <div>
                        <div className="sd-doc-title">{d.title}</div>
                        <div style={{ marginBottom: '.35rem' }}><VisibilityBadge visibility={d.visibility} /></div>
                        {d.description && <div className="sd-doc-desc">{d.description}</div>}
                      </div>
                      <FileTypeBadge mimeType={d.fileAsset?.mimeType} />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.8rem' }}>
                      {d.fileAsset?.url && (
                        <a 
                          className="sd-filename" 
                          href={d.fileAsset.url} 
                          target="_blank" 
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          T&eacute;l&eacute;charger
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {isUploadModalOpen && (
        <UploadModal 
          busy={uploading}
          onCancel={() => setIsUploadModalOpen(false)}
          onUpload={handleModalUpload}
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