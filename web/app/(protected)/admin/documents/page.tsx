//web/app/(protected)/admin/documents/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { DocumentForm } from '../../../../components/admin/DocumentForm';
import { api } from '../../../../lib/api-client';
import type { DocumentItem } from '../../../../types/document';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ FILE TYPE BADGE */
function FileTypeBadge({ mimeType, fileName }: { mimeType?: string | null; fileName?: string }) {
  const ext = fileName?.split('.').pop()?.toUpperCase() ?? '—';
  const mime = mimeType ?? '';

  let color = '#6B7280', bg = '#F3F4F6', border = '#E5E7EB';
  if (mime.includes('pdf'))   { color = '#DC2626'; bg = '#FEF2F2'; border = '#FECACA'; }
  else if (mime.includes('image')) { color = '#7C3AED'; bg = '#F5F3FF'; border = '#DDD6FE'; }
  else if (mime.includes('word') || mime.includes('document')) { color = '#2563EB'; bg = '#EFF6FF'; border = '#BFDBFE'; }
  else if (mime.includes('sheet') || mime.includes('excel'))   { color = '#059669'; bg = '#ECFDF5'; border = '#A7F3D0'; }

  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.22rem', fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.05em', color, background:bg, border:`1px solid ${border}`, borderRadius:6, padding:'0.15rem 0.45rem' }}>
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

/* ══════════════════════════════════════════════════════ DELETE MODAL */
function DeleteModal({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', zIndex:100 }} onClick={onCancel} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:101, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(18px)', borderRadius:20, padding:'clamp(1.5rem,4vw,2rem)', width:'min(420px,calc(100vw - 2rem))', border:'1px solid rgba(37,99,235,0.1)', boxShadow:'0 24px 60px rgba(37,99,235,0.14)' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
            <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </div>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:600, color:'#111827', textAlign:'center', marginBottom:'0.4rem' }}>Supprimer ce document&nbsp;?</h2>
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

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminDocumentsPage() {
  const [items,        setItems]        = useState<DocumentItem[]>([]);
  const [q,            setQ]            = useState('');
  const [busyId,       setBusyId]       = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);

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
    try {
      await api.deleteAntennaDocument(d.id);
      await load();
    } finally { setBusyId(null); }
  }

  const Spinner = () => <div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'adspin .7s linear infinite' }} />;

  return (
    <AppShell title="Documents &amp; m&eacute;dias">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .ad-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1280px;margin:0 auto}

        /* Header */
        .ad-header{margin-bottom:1.75rem;opacity:0;transform:translateY(10px);animation:adin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .ad-eyebrow{font-size:.67rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ad-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:adpulse 2s ease-in-out infinite}
        @keyframes adpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ad-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.85rem);font-weight:600;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ad-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* Layout */
        .ad-layout{display:grid;grid-template-columns:360px 1fr;gap:1.5rem;align-items:start}
        @media(max-width:1024px){.ad-layout{grid-template-columns:1fr}}

        /* Panel */
        .ad-panel{background:rgba(253,253,255,.93);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 14px rgba(37,99,235,.05),0 0 0 1px rgba(255,255,255,.85) inset;overflow:hidden}
        .ad-panel-left{opacity:0;transform:translateY(10px);animation:adin .5s .10s cubic-bezier(.22,1,.36,1) forwards}
        .ad-panel-right{opacity:0;transform:translateY(10px);animation:adin .5s .16s cubic-bezier(.22,1,.36,1) forwards}
        .ad-panel-head{padding:1rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem}
        .ad-panel-title{font-size:.73rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1F2937;display:flex;align-items:center;gap:.5rem}
        .ad-panel-ico{width:26px;height:26px;border-radius:7px;background:#EFF6FF;color:#2563EB;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ad-count-chip{font-size:.68rem;font-weight:800;padding:.18rem .55rem;border-radius:99px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}
        .ad-form-body{padding:1.25rem 1.3rem}

        /* Toolbar */
        .ad-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;padding:1rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07)}
        .ad-sw{position:relative;flex:1;min-width:160px}
        .ad-si{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .ad-search{width:100%;height:38px;border-radius:10px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.85);padding:0 .85rem 0 2.3rem;font-family:'DM Sans',sans-serif;font-size:.82rem;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .ad-search:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08);background:white}
        .ad-search::placeholder{color:rgba(107,114,128,.45)}
        .ad-search-btn{height:38px;padding:0 1rem;border-radius:10px;background:linear-gradient(135deg,#1D4ED8,#2563EB);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:700;display:flex;align-items:center;gap:.35rem;box-shadow:0 3px 10px rgba(37,99,235,.28);transition:all .18s;white-space:nowrap}
        .ad-search-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(37,99,235,.38)}

        /* Table */
        .ad-tw{overflow-x:auto}
        .ad-table{width:100%;border-collapse:collapse;min-width:500px}
        .ad-table thead tr{border-bottom:1px solid rgba(37,99,235,.09)}
        .ad-table thead th{padding:.75rem 1.2rem;font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#374151;text-align:left;background:rgba(248,250,252,.6);white-space:nowrap}
        .ad-table tbody tr{border-bottom:1px solid rgba(37,99,235,.055);transition:background .15s;animation:adin .4s cubic-bezier(.22,1,.36,1) both}
        .ad-table tbody tr:last-child{border-bottom:none}
        .ad-table tbody tr:hover{background:rgba(37,99,235,.025)}
        .ad-table td{padding:.85rem 1.2rem;vertical-align:middle}

        .ad-doc-title{font-size:.86rem;font-weight:800;color:#0F172A;margin-bottom:2px}
        .ad-doc-desc{font-size:.71rem;color:#6B7280;font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .ad-date{font-size:.72rem;color:#6B7280;font-weight:600;white-space:nowrap}
        .ad-size{font-family:'DM Mono',monospace;font-size:.69rem;color:#9CA3AF;font-weight:500}

        /* Download link */
        .ad-dl{display:inline-flex;align-items:center;gap:.3rem;font-size:.75rem;font-weight:700;color:#2563EB;text-decoration:none;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:7px;padding:.22rem .6rem;transition:all .15s;white-space:nowrap}
        .ad-dl:hover{background:#DBEAFE;border-color:#93C5FD}

        /* Delete btn */
        .ad-del-btn{height:32px;padding:0 .75rem;border-radius:8px;border:1.5px solid rgba(220,38,38,.2);background:rgba(254,242,242,.6);color:#DC2626;font-family:'DM Sans',sans-serif;font-size:.71rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.3rem;transition:all .18s;white-space:nowrap}
        .ad-del-btn:hover:not(:disabled){background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}
        .ad-del-btn:disabled{opacity:.5;cursor:not-allowed}

        /* Mobile cards */
        .ad-mob{display:none}
        @media(max-width:600px){.ad-tw{display:none}.ad-mob{display:flex;flex-direction:column}}
        .ad-mc{padding:.9rem 1.2rem;border-bottom:1px solid rgba(37,99,235,.07);animation:adin .4s cubic-bezier(.22,1,.36,1) both}
        .ad-mc:last-child{border-bottom:none}
        .ad-mc-row{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.5rem}
        .ad-mc-meta{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap;margin-bottom:.6rem}
        .ad-mc-actions{display:flex;gap:.4rem;flex-wrap:wrap}

        /* Loader / empty / error */
        .ad-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.82rem;font-weight:600}
        .ad-ring{width:24px;height:24px;border:2.5px solid rgba(37,99,235,.1);border-top-color:#2563EB;border-radius:50%;animation:adspin .8s linear infinite}
        .ad-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 1rem;gap:.65rem;color:#9CA3AF}
        .ad-empty p{font-size:.82rem;font-weight:700}
        .ad-error{display:flex;align-items:center;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.8rem;font-weight:700;margin:.75rem 1.2rem}

        @keyframes adin{to{opacity:1;transform:translateY(0)}}
        @keyframes adspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ad-wrap">

        {/* Header */}
        <div className="ad-header">
          <div className="ad-eyebrow"><div className="ad-dot" />Admin antenne</div>
          <h1 className="ad-title">Documents <span>&amp; m&eacute;dias</span></h1>
        </div>

        <div className="ad-layout">

          {/* LEFT — Upload form */}
          <div className="ad-panel ad-panel-left">
            <div className="ad-panel-head">
              <div className="ad-panel-title">
                <div className="ad-panel-ico">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                </div>
                Ajouter un fichier
              </div>
            </div>
            <div className="ad-form-body">
              <DocumentForm onCreated={() => void load()} />
            </div>
          </div>

          {/* RIGHT — Library */}
          <div className="ad-panel ad-panel-right">
            <div className="ad-panel-head">
              <div className="ad-panel-title">
                <div className="ad-panel-ico" style={{ background:'#F5F3FF', color:'#7C3AED' }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                </div>
                Biblioth&egrave;que
              </div>
              <span className="ad-count-chip">{items.length}</span>
            </div>

            {/* Toolbar */}
            <div className="ad-toolbar">
              <div className="ad-sw">
                <span className="ad-si"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg></span>
                <input
                  className="ad-search" type="text"
                  placeholder="Rechercher un titre&#8230;"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void load(q)}
                />
              </div>
              <button className="ad-search-btn" onClick={() => void load(q)}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
                Rechercher
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="ad-error">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                {error}
              </div>
            )}

            {/* Content */}
            {loading ? (
              <div className="ad-loader"><div className="ad-ring" />Chargement&#8230;</div>
            ) : items.length === 0 ? (
              <div className="ad-empty">
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                <p>Aucun document pour le moment</p>
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="ad-tw">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Type</th>
                        <th>Taille</th>
                        <th>Date</th>
                        <th>Fichier</th>
                        <th style={{ textAlign:'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((d, i) => (
                        <tr key={d.id} style={{ animationDelay:`${i * 0.03}s` }}>
                          <td>
                            <div className="ad-doc-title">{d.title}</div>
                            {d.description && <div className="ad-doc-desc">{d.description}</div>}
                          </td>
                          <td>
                            <FileTypeBadge mimeType={d.fileAsset?.mimeType} fileName={d.fileAsset?.fileName} />
                          </td>
                          <td><span className="ad-size">{formatSize(d.fileAsset?.sizeBytes)}</span></td>
                          <td><span className="ad-date">{formatDate(d.createdAt)}</span></td>
                          <td>
                            {d.fileAsset?.url
                              ? <a href={d.fileAsset.url} target="_blank" rel="noreferrer" className="ad-dl">
                                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                  {d.fileAsset.fileName ?? 'T\u00e9l\u00e9charger'}
                                </a>
                              : <span style={{ color:'#D1D5DB', fontSize:'.75rem' }}>—</span>
                            }
                          </td>
                          <td>
                            <div style={{ display:'flex', justifyContent:'flex-end' }}>
                              <button
                                className="ad-del-btn"
                                disabled={busyId === d.id}
                                onClick={() => setDeleteTarget(d)}
                              >
                                {busyId === d.id
                                  ? <Spinner />
                                  : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                }
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="ad-mob">
                  {items.map((d, i) => (
                    <div key={d.id} className="ad-mc" style={{ animationDelay:`${i * 0.03}s` }}>
                      <div className="ad-mc-row">
                        <div>
                          <div className="ad-doc-title">{d.title}</div>
                          {d.description && <div className="ad-doc-desc">{d.description}</div>}
                        </div>
                        <FileTypeBadge mimeType={d.fileAsset?.mimeType} fileName={d.fileAsset?.fileName} />
                      </div>
                      <div className="ad-mc-meta">
                        <span className="ad-size">{formatSize(d.fileAsset?.sizeBytes)}</span>
                        <span className="ad-date">{formatDate(d.createdAt)}</span>
                      </div>
                      <div className="ad-mc-actions">
                        {d.fileAsset?.url && (
                          <a href={d.fileAsset.url} target="_blank" rel="noreferrer" className="ad-dl" style={{ flex:1, justifyContent:'center' }}>
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                            T&eacute;l&eacute;charger
                          </a>
                        )}
                        <button
                          className="ad-del-btn"
                          style={{ flex:1, justifyContent:'center' }}
                          disabled={busyId === d.id}
                          onClick={() => setDeleteTarget(d)}
                        >
                          {busyId === d.id ? <Spinner /> : <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>}
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete modal */}
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