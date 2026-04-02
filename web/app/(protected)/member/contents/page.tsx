// web/app/(protected)/member/contents/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { ContentPost } from '../../../../types/content';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ HELPERS */
function getTypeCfg(type?: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    ANNOUNCEMENT: {
      label: 'Annonce',
      color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
      icon: <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>,
    },
    NEWS: {
      label: 'Actualité',
      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
      icon: <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>,
    },
    EVENT: {
      label: 'Événement',
      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
      icon: <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
  };
  return map[type ?? ''] ?? {
    label: type ?? 'Information',
    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB',
    icon: <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>,
  };
}

/* ══════════════════════════════════════════════════════ MODAL DETAILS */
function ContentDetailModal({ content, onClose }: { content: ContentPost; onClose: () => void }) {
  const typeCfg = getTypeCfg((content as ContentPost & { type?: string }).type);
  const imageUrl = (content as unknown as { coverImageFile?: { url: string } }).coverImageFile?.url;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', animation: 'mbin2 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 580, background: '#fff', borderRadius: 24, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 72px rgba(0,0,0,0.18)', animation: 'mbscale2 0.28s cubic-bezier(.22,1,.36,1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 4, background: typeCfg.color, borderRadius: '24px 24px 0 0' }} />

        <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.7rem' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 700, color: typeCfg.color, background: typeCfg.bg, border: `1px solid ${typeCfg.border}`, borderRadius: 99, padding: '0.2rem 0.6rem', marginBottom: '0.5rem' }}>
              {typeCfg.icon} {typeCfg.label}
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.25 }}>{content.title}</h2>
            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 500, marginTop: '0.4rem' }}>Publié le {formatDate(content.createdAt)}</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0, transition: 'all 0.15s' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {imageUrl && (
            <div style={{ marginBottom: '1.5rem', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={content.title} style={{ width: '100%', maxHeight: 350, objectFit: 'contain', display: 'block' }} />
            </div>
          )}
          {content.body ? (
            <div style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>{content.body}</div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.85rem' }}>Aucun texte additionnel.</div>
          )}
        </div>

        {/* Bouton de téléchargement */}
        {imageUrl && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #F3F4F6', background: '#F8FAFC', borderRadius: '0 0 24px 24px', display: 'flex', justifyContent: 'flex-end' }}>
            <a 
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              download
              style={{ height: 40, padding: '0 1.25rem', borderRadius: 10, border: '1px solid rgba(37,99,235,0.15)', background: 'rgba(239,246,255,0.8)', color: '#1D4ED8', fontFamily: "'DM Sans',sans-serif", fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', transition: 'all .2s', boxShadow: '0 2px 4px rgba(37,99,235,0.05)' }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4"/></svg>
              Télécharger le document
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function MemberContentsPage() {
  const [items, setItems] = useState<ContentPost[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<ContentPost | null>(null);

  const loadData = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listContentsForMembers({ page: 1, pageSize: 100, q: query || undefined });
      setItems(res.items as ContentPost[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement contenus');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const res = await api.listContentsForMembers({ page: 1, pageSize: 100 });
        if (isMounted) { setItems(res.items as ContentPost[]); setLoading(false); }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur chargement contenus');
          setLoading(false);
        }
      }
    }
    void init();
    return () => { isMounted = false; };
  }, []);

  // Client-side filter
  const filtered = q
    ? items.filter(c =>
        c.title?.toLowerCase().includes(q.toLowerCase()) ||
        c.body?.toLowerCase().includes(q.toLowerCase())
      )
    : items;

  return (
    <AppShell title="Informations &amp; annonces">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .mc-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 900px; margin: 0 auto;
          box-sizing: border-box;
          width: 100%;
        }

        /* ── Header ── */
        .mc-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: mcin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mc-eyebrow {
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563EB;
          margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;
        }
        .mc-eyebrow-dot {
          width: 6px; height: 6px; background: #3B82F6; border-radius: 50%;
          animation: mcpulse 2s ease-in-out infinite;
        }
        @keyframes mcpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .mc-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500;
          color: #111827; letter-spacing: -0.02em; line-height: 1.15;
        }
        .mc-title span {
          background: linear-gradient(135deg,#1D4ED8,#3B82F6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        /* ── Toolbar REVISITÉE POUR MOBILE ── */
        .mc-toolbar {
          display: flex; flex-direction: column; gap: 0.65rem;
          margin-bottom: 1.25rem;
          opacity: 0; transform: translateY(10px);
          animation: mcin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
          width: 100%; box-sizing: border-box;
        }
        
        .mc-search-row {
          display: flex; align-items: center; gap: 0.65rem;
          flex-wrap: nowrap; width: 100%;
        }
        
        .mc-search-wrap { position: relative; flex: 1 1 auto; min-width: 0; }
        .mc-search-ico { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .mc-search-input {
          width: 100%; height: 42px; padding: 0 0.9rem 0 2.5rem;
          border-radius: 11px; border: 1px solid rgba(37,99,235,0.14);
          background: rgba(255,255,255,0.88); font-family: 'DM Sans', sans-serif;
          font-size: 0.83rem; color: #111827; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .mc-search-input:focus {
          border-color: rgba(37,99,235,0.45);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.09);
          background: white;
        }
        .mc-search-input::placeholder { color: rgba(107,114,128,0.45); }

        .mc-search-btn {
          flex: 0 0 auto; height: 42px; padding: 0 1.1rem;
          background: linear-gradient(135deg,#1D4ED8,#2563EB);
          color: white; border: none; border-radius: 11px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          box-shadow: 0 4px 12px rgba(37,99,235,0.28);
          transition: transform 0.15s, box-shadow 0.2s; white-space: nowrap;
        }
        .mc-search-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37,99,235,0.38); }

        .mc-count-row {
          display: flex; justify-content: flex-end; width: 100%;
        }

        .mc-count-chip {
          font-size: 0.72rem; font-weight: 700;
          padding: 0.28rem 0.7rem; border-radius: 99px;
          background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;
          white-space: nowrap;
        }
        
        @media (max-width: 500px) {
          .mc-search-row { gap: 0.4rem; }
          .mc-search-input { height: 38px; font-size: 0.75rem; padding-left: 2rem; }
          .mc-search-ico { left: 0.6rem; width: 14px; height: 14px; }
          .mc-search-btn { height: 38px; padding: 0 0.8rem; font-size: 0.75rem; }
          .btn-text { display: none; } /* Cache "Rechercher" pour gagner de la place */
          .mc-count-chip { font-size: 0.65rem; padding: 0.2rem 0.5rem; }
        }

        /* ── Error ── */
        .mc-error {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 1rem; color: #B91C1C; font-size: 0.8rem;
          background: #FEF2F2; border-radius: 12px; border: 1px solid #FECACA;
          margin-bottom: 1rem;
        }

        /* ── Loader ── */
        .mc-loader {
          display: flex; align-items: center; justify-content: center;
          padding: 3.5rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem;
        }
        .mc-ring {
          width: 24px; height: 24px;
          border: 2.5px solid rgba(37,99,235,0.1);
          border-top-color: #2563EB; border-radius: 50%;
          animation: mcspin 0.8s linear infinite;
        }
        @keyframes mcspin { to { transform: rotate(360deg); } }
        
        @keyframes mbin2 { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mbscale2 {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Empty ── */
        .mc-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 3.5rem 1rem; gap: 0.8rem;
          color: #9CA3AF; text-align: center;
        }
        .mc-empty-ico {
          width: 54px; height: 54px; border-radius: 50%;
          background: #F9FAFB; border: 1px solid #E5E7EB;
          display: flex; align-items: center; justify-content: center;
        }
        .mc-empty p { font-size: 0.82rem; font-weight: 500; }

        /* ── Feed ── */
        .mc-feed {
          display: flex; flex-direction: column; gap: 0.85rem;
          opacity: 0; animation: mcin 0.5s 0.16s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mc-article {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 10px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .mc-article:hover {
          transform: translateY(-2px);
          background: #ffffff;
          box-shadow: 0 8px 22px rgba(37,99,235,0.1), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }

        /* Left accent bar */
        .mc-article-inner {
          display: flex; align-items: stretch;
        }
        .mc-accent-bar {
          width: 4px; flex-shrink: 0; border-radius: 4px 0 0 4px;
        }

        .mc-article-body {
          padding: clamp(1rem, 3%, 1.25rem);
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 0.6rem;
        }

        /* Top row */
        .mc-art-top {
          display: flex; justify-content: space-between;
          align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;
        }
        .mc-art-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1rem, 2.5vw, 1.2rem); font-weight: 600;
          color: #111827; line-height: 1.3;
          flex: 1; min-width: 0; margin: 0;
        }

        .mc-type-badge {
          display: inline-flex; align-items: center; gap: 0.3rem;
          font-size: 0.62rem; font-weight: 700; border-radius: 99px;
          padding: 0.2rem 0.6rem; border: 1px solid; flex-shrink: 0;
          white-space: nowrap;
        }

        /* Meta row */
        .mc-art-meta {
          display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;
        }
        .mc-art-date {
          font-size: 0.7rem; color: #9CA3AF;
          display: flex; align-items: center; gap: 0.3rem;
        }

        /* Body preview */
        .mc-art-preview {
          font-size: 0.82rem; color: #374151; line-height: 1.65;
          margin: 0; display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden;
        }

        .mc-click-hint {
          display: inline-flex; align-items: center; gap: 0.3rem;
          font-size: 0.72rem; font-weight: 700; color: #2563EB;
          margin-top: 0.4rem; opacity: 0.8; transition: opacity 0.2s;
        }
        .mc-article:hover .mc-click-hint { opacity: 1; }

        @keyframes mcin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="mc-wrap">

        {/* Header */}
        <div className="mc-header">
          <div className="mc-eyebrow"><div className="mc-eyebrow-dot" />Espace membre</div>
          <h1 className="mc-title">Informations <span>&amp; annonces</span></h1>
        </div>

        {/* Toolbar */}
        <div className="mc-toolbar">
          
          <div className="mc-search-row">
            <div className="mc-search-wrap">
              <span className="mc-search-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
                </svg>
              </span>
              <input
                className="mc-search-input"
                placeholder="Rechercher une annonce&#8230;"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void loadData(q)}
              />
            </div>

            <button className="mc-search-btn" onClick={() => void loadData(q)}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <span className="btn-text">Rechercher</span>
            </button>
          </div>

          <div className="mc-count-row">
            {!loading && (
              <span className="mc-count-chip">
                {filtered.length} publication{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
        </div>

        {/* Error */}
        {error && (
          <div className="mc-error">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* States */}
        {loading ? (
          <div className="mc-loader"><div className="mc-ring" />Chargement&#8230;</div>
        ) : filtered.length === 0 ? (
          <div className="mc-empty">
            <div className="mc-empty-ico">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                <path strokeLinecap="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
              </svg>
            </div>
            <p>Aucun contenu pour le moment</p>
          </div>
        ) : (

          /* ── FEED ── */
          <div className="mc-feed">
            {filtered.map((c, i) => {
              const typeCfg = getTypeCfg((c as ContentPost & { type?: string }).type);
              const imageUrl = (c as unknown as { coverImageFile?: { url: string } }).coverImageFile?.url;

              return (
                <article
                  key={c.id}
                  className="mc-article"
                  style={{ animationDelay: `${0.04 * i}s` }}
                  onClick={() => setSelectedContent(c)}
                >
                  <div className="mc-article-inner">
                    {/* Left colored accent bar */}
                    <div className="mc-accent-bar" style={{ background: typeCfg.color }} />

                    <div className="mc-article-body">
                      {/* Top: title + badge */}
                      <div className="mc-art-top">
                        <h2 className="mc-art-title">{c.title}</h2>
                        <div
                          className="mc-type-badge"
                          style={{ color: typeCfg.color, background: typeCfg.bg, borderColor: typeCfg.border }}
                        >
                          {typeCfg.icon}
                          {typeCfg.label}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="mc-art-meta">
                        <span className="mc-art-date">
                          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
                          </svg>
                          {formatDate(c.updatedAt)}
                        </span>
                        {imageUrl && (
                          <span style={{ fontSize: '0.68rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                            Image jointe
                          </span>
                        )}
                      </div>

                      {/* Body preview (truncated to 2 lines max) */}
                      {c.body && (
                        <p className="mc-art-preview">
                          {c.body}
                        </p>
                      )}

                      <div className="mc-click-hint">
                        Voir les détails
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selectedContent && (
        <ContentDetailModal 
          content={selectedContent} 
          onClose={() => setSelectedContent(null)} 
        />
      )}
    </AppShell>
  );
}