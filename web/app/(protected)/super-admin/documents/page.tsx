// web/app/(protected)/super-admin/documents/page.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { DocumentItem } from '../../../../types/document';
import { formatDate } from '../../../../lib/format';

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
    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.65rem', fontWeight: 700, color, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '.15rem .45rem', whiteSpace: 'nowrap' }}>
      {ext}
    </span>
  );
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
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={onCancel} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(440px,calc(100vw - 2rem))', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(220,38,38,.12)' }}>
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

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminDocumentsPage() {
  const [items,        setItems]        = useState<DocumentItem[]>([]);
  const [q,            setQ]            = useState('');
  const [error,        setError]        = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [busyId,       setBusyId]       = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [uploadMsg,    setUploadMsg]    = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (qVal?: string) => {
    setError(null); setLoading(true);
    try {
      const res = await api.listDocuments({ q: (qVal ?? q) || undefined, page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement documents');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { void load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setUploading(true); setError(null); setUploadMsg(null);
    try {
      await api.uploadFile(file, {
        category: 'DOCUMENT',
        folder: 'association-docs',
        description: 'Upload super admin',
      });
      setUploadMsg(`\u00ab\u00a0${file.name}\u00a0\u00bb upload\u00e9 avec succ\u00e8s.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: DocumentItem) {
    setBusyId(doc.id); setDeleteTarget(null);
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
        .sd-upload-label{display:flex;align-items:center;gap:.45rem;height:38px;padding:0 1rem;border-radius:10px;background:rgba(254,242,242,.6);border:1.5px solid rgba(220,38,38,.2);color:#B91C1C;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;cursor:pointer;transition:all .18s;white-space:nowrap}
        .sd-upload-label:hover{background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}
        .sd-upload-label[data-busy="true"]{opacity:.6;cursor:not-allowed;pointer-events:none}

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
        .sd-table{width:100%;border-collapse:collapse;min-width:580px}
        .sd-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .sd-table tbody tr{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s;animation:sdin .4s cubic-bezier(.22,1,.36,1) both}
        .sd-table tbody tr:last-child{border-bottom:none}
        .sd-table tbody tr:hover{background:rgba(220,38,38,.02)}

        /* Cell helpers */
        .sd-doc-title{font-weight:800;font-size:.88rem;color:#0F172A}
        .sd-doc-desc{font-size:.74rem;font-weight:600;color:#6B7280;margin-top:2px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .sd-filename{font-family:'DM Mono',monospace;font-size:.75rem;font-weight:600;color:#2563EB;text-decoration:none;display:inline-flex;align-items:center;gap:.3rem;transition:color .15s}
        .sd-filename:hover{color:#1D4ED8;text-decoration:underline}
        .sd-size{font-family:'DM Mono',monospace;font-size:.73rem;font-weight:600;color:#9CA3AF}
        .sd-date{font-size:.75rem;font-weight:700;color:#6B7280}
        .sd-dash{color:#D1D5DB;font-weight:700}

        /* Action buttons */
        .sd-btn-del{height:30px;padding:0 .7rem;border-radius:7px;border:1.5px solid rgba(220,38,38,.2);background:rgba(254,242,242,.6);color:#DC2626;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.25rem;transition:all .15s;white-space:nowrap}
        .sd-btn-del:hover:not(:disabled){background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}
        .sd-btn-del:disabled{opacity:.45;cursor:not-allowed}

        /* Mobile cards */
        .sd-mob{display:none;flex-direction:column}
        @media(max-width:660px){.sd-tw{display:none}.sd-mob{display:flex}}
        .sd-mc{padding:1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:sdin .4s cubic-bezier(.22,1,.36,1) both}
        .sd-mc:last-child{border-bottom:none}
        .sd-mc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;margin-bottom:.5rem}
        .sd-mc-meta{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem}

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
            { label: 'Documents',    value: items.length,                                             color: '#DC2626' },
            { label: 'Avec fichier', value: items.filter(d => d.fileAsset?.url).length,               color: '#2563EB' },
            { label: 'Sans fichier', value: items.filter(d => !d.fileAsset?.url).length,              color: '#9CA3AF' },
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

            {/* Upload btn */}
            <label className="sd-upload-label" data-busy={uploading ? 'true' : 'false'}>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                disabled={uploading}
                onChange={e => void onUploadFile(e.target.files?.[0] ?? null)}
              />
              {uploading
                ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(185,28,28,.3)', borderTopColor: '#B91C1C', borderRadius: '50%', animation: 'sdspin .7s linear infinite' }} />Upload en cours&#8230;</>
                : <><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>Uploader un fichier</>
              }
            </label>
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
                      <th style={thStyle}>Taille</th>
                      <th style={thStyle}>Cr&eacute;&eacute; le</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((d, i) => (
                      <tr key={d.id} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td style={tdStyle}>
                          <div className="sd-doc-title">{d.title}</div>
                          {d.description && <div className="sd-doc-desc">{d.description}</div>}
                        </td>
                        <td style={tdStyle}><FileTypeBadge mimeType={d.fileAsset?.mimeType} /></td>
                        <td style={tdStyle}>
                          {d.fileAsset?.url
                            ? (
                              <a className="sd-filename" href={d.fileAsset.url} target="_blank" rel="noreferrer">
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                {d.fileAsset.fileName ?? 'T\u00e9l\u00e9charger'}
                              </a>
                            )
                            : <span className="sd-dash">—</span>
                          }
                        </td>
                        <td style={tdStyle}><span className="sd-size">{formatSize(d.fileAsset?.sizeBytes)}</span></td>
                        <td style={tdStyle}><span className="sd-date">{formatDate(d.createdAt)}</span></td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button
                            className="sd-btn-del"
                            disabled={busyId === d.id}
                            onClick={() => setDeleteTarget(d)}
                          >
                            {busyId === d.id
                              ? <div style={{ width: 11, height: 11, border: '2px solid rgba(220,38,38,.3)', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'sdspin .7s linear infinite' }} />
                              : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            }
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards ── */}
              <div className="sd-mob">
                {items.map((d, i) => (
                  <div key={d.id} className="sd-mc" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="sd-mc-top">
                      <div>
                        <div className="sd-doc-title">{d.title}</div>
                        {d.description && <div className="sd-doc-desc">{d.description}</div>}
                      </div>
                      <FileTypeBadge mimeType={d.fileAsset?.mimeType} />
                    </div>
                    <div className="sd-mc-meta">
                      <span className="sd-size">{formatSize(d.fileAsset?.sizeBytes)}</span>
                      <span className="sd-date">{formatDate(d.createdAt)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {d.fileAsset?.url && (
                        <a className="sd-filename" href={d.fileAsset.url} target="_blank" rel="noreferrer">
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          T&eacute;l&eacute;charger
                        </a>
                      )}
                      <button className="sd-btn-del" disabled={busyId === d.id} onClick={() => setDeleteTarget(d)}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

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