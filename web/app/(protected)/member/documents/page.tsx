// web/app/(protected)/member/documents/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { DocumentItem } from '../../../../types/document';
import { formatDate } from '../../../../lib/format';

function getFileIcon(fileName?: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return { icon: 'PDF', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  if (['jpg','jpeg','png','gif','webp'].includes(ext ?? '')) return { icon: 'IMG', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
  if (['doc','docx'].includes(ext ?? '')) return { icon: 'DOC', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
  if (['xls','xlsx'].includes(ext ?? '')) return { icon: 'XLS', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
  return { icon: 'FILE', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
}

export default function MemberDocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const loadData = async (query?: string) => {
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
  };

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

  const filtered = q
    ? items.filter(d =>
        d.title?.toLowerCase().includes(q.toLowerCase()) ||
        d.description?.toLowerCase().includes(q.toLowerCase())
      )
    : items;

  return (
    <AppShell title="Documents &amp; photos">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .md-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1200px; margin: 0 auto;
        }

        /* ── Header ── */
        .md-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: mdin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .md-eyebrow {
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563EB;
          margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;
        }
        .md-eyebrow-dot {
          width: 6px; height: 6px; background: #3B82F6;
          border-radius: 50%; animation: mdpulse 2s ease-in-out infinite;
        }
        @keyframes mdpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .md-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500;
          color: #111827; letter-spacing: -0.02em; line-height: 1.15;
        }
        .md-title span {
          background: linear-gradient(135deg,#1D4ED8,#3B82F6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        /* ── Toolbar ── */
        .md-toolbar {
          display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;
          margin-bottom: 1.25rem;
          opacity: 0; transform: translateY(10px);
          animation: mdin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .md-search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 380px; }
        .md-search-ico { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .md-search-input {
          width: 100%; height: 42px; padding: 0 0.9rem 0 2.5rem;
          border-radius: 11px; border: 1px solid rgba(37,99,235,0.14);
          background: rgba(255,255,255,0.88); font-family: 'DM Sans', sans-serif;
          font-size: 0.83rem; color: #111827; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .md-search-input:focus {
          border-color: rgba(37,99,235,0.45);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.09);
          background: white;
        }
        .md-search-input::placeholder { color: rgba(107,114,128,0.45); }

        .md-search-btn {
          height: 42px; padding: 0 1.1rem;
          background: linear-gradient(135deg,#1D4ED8,#2563EB);
          color: white; border: none; border-radius: 11px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em;
          cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
          box-shadow: 0 4px 12px rgba(37,99,235,0.28);
          transition: transform 0.15s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .md-search-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(37,99,235,0.38); }

        .md-count-chip {
          font-size: 0.72rem; font-weight: 700;
          padding: 0.28rem 0.7rem; border-radius: 99px;
          background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;
        }

        .md-view-toggle { display: flex; gap: 0.3rem; margin-left: auto; }
        .md-view-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1.5px solid rgba(37,99,235,0.13);
          background: rgba(255,255,255,0.8); cursor: pointer;
          display: flex; align-items: center; justify-content: center; color: #94A3B8;
          transition: all 0.2s;
        }
        .md-view-btn.active { background: #EFF6FF; border-color: #2563EB; color: #2563EB; }
        .md-view-btn:hover:not(.active) { background: #F8FAFC; color: #374151; }

        /* ── Grid View ── */
        .md-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1rem;
          opacity: 0; animation: mdin 0.5s 0.16s cubic-bezier(.22,1,.36,1) forwards;
        }
        @media (max-width: 560px) { .md-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 380px) { .md-grid { grid-template-columns: 1fr; } }

        .md-card {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 10px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          padding: 1.1rem;
          display: flex; flex-direction: column; gap: 0.7rem;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .md-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(37,99,235,0.1), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }

        .md-card-top { display: flex; gap: 0.7rem; align-items: flex-start; }
        .md-file-badge {
          width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.55rem; font-weight: 800; letter-spacing: 0.05em;
          border: 1px solid;
        }
        .md-card-info { flex: 1; min-width: 0; }
        .md-card-title {
          font-size: 0.85rem; font-weight: 700; color: #111827;
          line-height: 1.35; word-break: break-word;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .md-card-date { font-size: 0.68rem; color: #9CA3AF; margin-top: 2px; }

        .md-card-desc {
          font-size: 0.76rem; color: #6B7280; line-height: 1.55;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }

        .md-dl-btn {
          display: inline-flex; align-items: center; gap: 0.35rem;
          height: 34px; padding: 0 0.85rem;
          border-radius: 9px; border: 1.5px solid rgba(37,99,235,0.18);
          background: #EFF6FF; color: #1D4ED8; text-decoration: none;
          font-size: 0.73rem; font-weight: 700;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
          width: 100%; justify-content: center;
        }
        .md-dl-btn:hover { background: #DBEAFE; border-color: #2563EB; transform: translateY(-1px); }
        .md-no-file {
          display: inline-flex; align-items: center; justify-content: center;
          height: 34px; width: 100%;
          font-size: 0.72rem; color: #CBD5E1;
        }

        /* ── List View ── */
        .md-list {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; animation: mdin 0.5s 0.16s cubic-bezier(.22,1,.36,1) forwards;
        }
        .md-list-head {
          display: grid; grid-template-columns: 2fr 2fr 1fr 110px;
          padding: 0.65rem 1.2rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
        }
        .md-list-head span {
          font-size: 0.62rem; font-weight: 700; letter-spacing: 0.09em;
          text-transform: uppercase; color: #9CA3AF;
        }
        .md-list-row {
          display: grid; grid-template-columns: 2fr 2fr 1fr 110px;
          padding: 0.85rem 1.2rem;
          border-bottom: 1px solid rgba(37,99,235,0.05);
          align-items: center; transition: background 0.15s;
          gap: 0.5rem;
        }
        .md-list-row:last-child { border-bottom: none; }
        .md-list-row:hover { background: rgba(37,99,235,0.022); }

        @media (max-width: 700px) {
          .md-list-head { display: none; }
          .md-list-row {
            grid-template-columns: auto 1fr auto;
            grid-template-rows: auto auto;
          }
          .md-list-row > *:nth-child(2) { grid-column: 2; }
          .md-list-row > *:nth-child(3) { display: none; }
          .md-list-row > *:nth-child(4) { grid-column: 3; grid-row: 1; }
        }

        .md-list-title { font-size: 0.83rem; font-weight: 700; color: #111827; word-break: break-word; }
        .md-list-desc { font-size: 0.74rem; color: #6B7280; line-height: 1.45; word-break: break-word; }
        .md-list-date { font-size: 0.72rem; color: #9CA3AF; }
        .md-list-dl {
          display: inline-flex; align-items: center; gap: 0.3rem;
          height: 32px; padding: 0 0.75rem; border-radius: 8px;
          border: 1.5px solid rgba(37,99,235,0.18);
          background: #EFF6FF; color: #1D4ED8; text-decoration: none;
          font-size: 0.7rem; font-weight: 700; white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
        }
        .md-list-dl:hover { background: #DBEAFE; border-color: #2563EB; }

        /* ── States ── */
        .md-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 3.5rem 1rem; gap: 0.8rem; color: #9CA3AF;
          text-align: center;
        }
        .md-empty-ico {
          width: 54px; height: 54px; border-radius: 50%;
          background: #F9FAFB; border: 1px solid #E5E7EB;
          display: flex; align-items: center; justify-content: center;
        }
        .md-empty p { font-size: 0.82rem; font-weight: 500; }
        .md-empty small { font-size: 0.72rem; color: #CBD5E1; }

        .md-loader {
          display: flex; align-items: center; justify-content: center;
          padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem;
        }
        .md-ring {
          width: 24px; height: 24px;
          border: 2.5px solid rgba(37,99,235,0.1);
          border-top-color: #2563EB; border-radius: 50%;
          animation: mdspin 0.8s linear infinite;
        }
        @keyframes mdspin { to { transform: rotate(360deg); } }

        .md-error {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 1rem; color: #B91C1C; font-size: 0.8rem;
          background: #FEF2F2; border-radius: 12px; border: 1px solid #FECACA;
          margin-bottom: 1rem;
        }

        @keyframes mdin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="md-wrap">

        {/* Header */}
        <div className="md-header">
          <div className="md-eyebrow"><div className="md-eyebrow-dot" />Espace membre</div>
          <h1 className="md-title">Documents <span>&amp; photos</span></h1>
        </div>

        {/* Toolbar */}
        <div className="md-toolbar">
          <div className="md-search-wrap">
            <span className="md-search-ico">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            </span>
            <input
              className="md-search-input"
              placeholder="Rechercher un document&#8230;"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void loadData(q)}
            />
          </div>

          <button className="md-search-btn" onClick={() => void loadData(q)}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            Rechercher
          </button>

          {!loading && (
            <span className="md-count-chip">
              {filtered.length} document{filtered.length !== 1 ? 's' : ''}
            </span>
          )}

          <div className="md-view-toggle">
            <button className={`md-view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Vue grille">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1V2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V2zM1 7a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1V7zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V7zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V7zM1 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1v-2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z"/>
              </svg>
            </button>
            <button className={`md-view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="Vue liste">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="md-error">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="md-loader"><div className="md-ring" />Chargement&#8230;</div>
        ) : filtered.length === 0 ? (
          <div className="md-empty">
            <div className="md-empty-ico">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                <path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <p>Aucun document{q ? ' pour cette recherche' : ''}</p>
            {q && <small>Essayez avec d&#8217;autres mots-cl&eacute;s</small>}
          </div>

        ) : view === 'grid' ? (

          /* ── GRID ── */
          <div className="md-grid">
            {filtered.map((d, i) => {
              const fileCfg = getFileIcon(d.fileAsset?.fileName);
              return (
                <div key={d.id} className="md-card" style={{ animationDelay: `${0.04 * i}s` }}>
                  <div className="md-card-top">
                    <div
                      className="md-file-badge"
                      style={{ color: fileCfg.color, background: fileCfg.bg, borderColor: fileCfg.border }}
                    >
                      {fileCfg.icon}
                    </div>
                    <div className="md-card-info">
                      <div className="md-card-title">{d.title}</div>
                      <div className="md-card-date">{formatDate(d.createdAt)}</div>
                    </div>
                  </div>

                  {d.description && (
                    <p className="md-card-desc">{d.description}</p>
                  )}

                  {d.fileAsset?.url ? (
                    <a href={d.fileAsset.url} target="_blank" rel="noreferrer" className="md-dl-btn">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                      </svg>
                      {d.fileAsset.fileName ?? 'T\u00e9l\u00e9charger'}
                    </a>
                  ) : (
                    <span className="md-no-file">Aucun fichier</span>
                  )}
                </div>
              );
            })}
          </div>

        ) : (

          /* ── LIST ── */
          <div className="md-list">
            <div className="md-list-head">
              <span>Titre</span>
              <span>Description</span>
              <span>Date</span>
              <span>Fichier</span>
            </div>
            {filtered.map(d => {
              const fileCfg = getFileIcon(d.fileAsset?.fileName);
              return (
                <div key={d.id} className="md-list-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      className="md-file-badge"
                      style={{ color: fileCfg.color, background: fileCfg.bg, borderColor: fileCfg.border, width: 32, height: 32, fontSize: '0.5rem' }}
                    >
                      {fileCfg.icon}
                    </div>
                    <div className="md-list-title">{d.title}</div>
                  </div>
                  <div className="md-list-desc">{d.description ?? '—'}</div>
                  <div className="md-list-date">{formatDate(d.createdAt)}</div>
                  <div>
                    {d.fileAsset?.url ? (
                      <a href={d.fileAsset.url} target="_blank" rel="noreferrer" className="md-list-dl">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        T&eacute;l&eacute;charger
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}