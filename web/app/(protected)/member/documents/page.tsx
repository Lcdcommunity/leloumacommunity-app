// web/app/(protected)/member/documents/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
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
  } catch (e) {
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

/* ══════════════════════════════════════════════════════ PAGE */
export default function MemberDocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listDocumentsForMembers({ page: 1, pageSize: 100, q: query || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await api.listDocumentsForMembers({ page: 1, pageSize: 100 });
        if (isMounted) { setItems(res.items); setLoading(false); }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur chargement documents');
          setLoading(false);
        }
      }
    }
    void init();
    return () => { isMounted = false; };
  }, []);

  // Filtrage local additionnel pour plus de réactivité si besoin
  const filtered = q
    ? items.filter(d =>
        d.title?.toLowerCase().includes(q.toLowerCase()) ||
        d.description?.toLowerCase().includes(q.toLowerCase()) ||
        d.fileAsset?.fileName?.toLowerCase().includes(q.toLowerCase())
      )
    : items;

  return (
    <AppShell title="Documents &amp; photos">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
        
        .md-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1rem, 3vw, 2rem);
          max-width: 1200px; 
          margin: 0 auto;
        }

        /* ── Header ── */
        .md-header { margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: mdin .5s .04s cubic-bezier(.22,1,.36,1) forwards; }
        .md-eyebrow { font-size: .67rem; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; color: #16A34A; margin-bottom: .35rem; display: flex; align-items: center; gap: .4rem; }
        .md-dot { width: 6px; height: 6px; background: #22C55E; border-radius: 50%; animation: mdpulse 2s ease-in-out infinite; }
        @keyframes mdpulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .md-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.9rem); font-weight: 700; color: #111827; letter-spacing: -.02em; line-height: 1.15; }
        .md-title span { background: linear-gradient(135deg, #16A34A, #22C55E); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* ── Search Bar ── */
        .md-search-bar { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; position: relative; animation: mdin .5s .12s both; }
        .md-search-input { flex: 1; height: 46px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); background: white; padding: 0 1rem 0 2.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; color: #111827; outline: none; box-shadow: 0 2px 10px rgba(0,0,0,0.02); transition: all 0.2s; width: 100%; }
        .md-search-input:focus { border-color: rgba(22, 163, 74, 0.3); box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.08); }
        .md-search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .md-search-btn-new { height: 46px; width: 46px; border-radius: 14px; background: #16A34A; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(22, 163, 74, 0.25); flex-shrink: 0; transition: all 0.2s; }
        .md-search-btn-new:hover { background: #15803D; }

        /* ── Cards Grid (Fond Vert Transparent) ── */
        .md-cards-grid { display: flex; flex-direction: column; gap: 1rem; animation: mdin .5s .14s both; }
        .md-card { background: white; border-radius: 1.5rem; border: 1px solid #f3f4f6; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.02); cursor: pointer; transition: all 0.2s; }
        .md-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.04); }
        
        .md-card-top { background: #F0FDF4; padding: 1.25rem; display: flex; gap: 1rem; align-items: flex-start; }
        .md-card-icon { width: 3rem; height: 3rem; border-radius: 1rem; background: #DCFCE7; border: 1px solid #BBF7D0; display: flex; align-items: center; justify-content: center; color: #16A34A; flex-shrink: 0; box-shadow: 0 2px 4px rgba(22,163,74,0.1); }
        
        .md-card-content { flex: 1; padding-top: 0.1rem; width: 100%; overflow: hidden; }
        .md-card-title-row { display: flex; flex-direction: column; align-items: flex-start; gap: 0.35rem; margin-bottom: 0.5rem; }
        .md-card-title { font-family: 'Cormorant Garamond', serif; font-size: 1.25rem; font-weight: 700; color: #111827; line-height: 1.1; word-break: break-word; }
        .md-card-desc { font-size: 0.85rem; color: #374151; font-weight: 500; margin-top: 0.5rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .md-card-date { font-size: 0.85rem; color: #6B7280; margin: 0.75rem 0; }
        .md-card-filename { font-family: 'DM Mono', monospace; font-size: 0.75rem; color: #4B5563; background: rgba(255,255,255,0.7); padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #dcfce7; word-break: break-all; }
        
        .md-card-bottom { background: white; padding: 0.875rem 1.25rem; border-top: 1px solid rgba(243,244,246,0.8); display: flex; align-items: center; justify-content: space-between; }
        .md-card-action { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; color: #374151; text-decoration: none; }
        .md-card-action:hover { color: #16A34A; }

        /* ── States ── */
        .md-error { display: flex; align-items: center; gap: .65rem; padding: .9rem 1.2rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: .82rem; font-weight: 800; margin-bottom: 1rem; }
        .md-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: .75rem; color: #6B7280; font-size: .84rem; font-weight: 700; }
        .md-ring { width: 24px; height: 24px; border: 2.5px solid rgba(22, 163, 74, 0.12); border-top-color: #16A34A; border-radius: 50%; animation: mdspin .8s linear infinite; }
        .md-empty { display: flex; flex-direction: column; align-items: center; padding: 3.5rem 1rem; gap: .75rem; color: #9CA3AF; text-align: center; }
        .md-empty-title { font-size: .9rem; font-weight: 800; color: #374151; }
        .md-empty-sub { font-size: .78rem; font-weight: 600; }

        @keyframes mdin { to { opacity: 1; transform: translateY(0) } }
        @keyframes mdspin { to { transform: rotate(360deg) } }
      `}</style>

      <div className="md-wrap">

        {/* Header */}
        <div className="md-header">
          <div className="md-eyebrow"><div className="md-dot" />Espace membre</div>
          <h1 className="md-title">Documents <span>&amp; photos</span></h1>
        </div>

        {/* Barre de recherche */}
        <div className="md-search-bar">
          <div className="md-search-icon">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            className="md-search-input"
            type="text"
            placeholder="Rechercher un document, un titre..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void loadData(q)}
          />
          <button className="md-search-btn-new" onClick={() => void loadData(q)}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="md-error">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}

        {/* Contenu */}
        {loading ? (
          <div className="md-loader"><div className="md-ring" />Chargement&#8230;</div>
        ) : !error && filtered.length === 0 ? (
          <div className="md-empty">
            <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="md-empty-title">Aucun document trouv&eacute;</div>
            <div className="md-empty-sub">Il n'y a pas de document disponible pour le moment.</div>
          </div>
        ) : !error ? (
          <div className="md-cards-grid">
            {filtered.map((d, i) => (
              <div 
                key={d.id} 
                className="md-card"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="md-card-top">
                  <div className="md-card-icon">
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="md-card-content">
                    <div className="md-card-title-row">
                      <div className="md-card-title">{fixEncoding(d.title)}</div>
                      <FileTypeBadge mimeType={d.fileAsset?.mimeType} fileName={d.fileAsset?.fileName} />
                    </div>
                    {d.description && <div className="md-card-desc">{fixEncoding(d.description)}</div>}
                    <div className="md-card-date">{formatDate(d.createdAt)}</div>
                    {d.fileAsset?.fileName && (
                      <div className="md-card-filename">{fixEncoding(d.fileAsset.fileName)}</div>
                    )}
                  </div>
                </div>
                <div className="md-card-bottom">
                  {d.fileAsset?.url ? (
                    <a href={d.fileAsset.url} target="_blank" rel="noreferrer" className="md-card-action w-full">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4" />
                      </svg>
                      Détails / Téléchargement
                    </a>
                  ) : (
                    <span className="md-card-action" style={{ color: '#9CA3AF' }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Fichier indisponible
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}