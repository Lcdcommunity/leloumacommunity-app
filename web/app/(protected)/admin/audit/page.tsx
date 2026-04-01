// web/app/(protected)/admin/audit/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ TYPES */

interface AuditItem {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  actorUser?: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  details?: unknown;
  createdAt: string;
}

/* ══════════════════════════════════════════════════════ COMPOSANTS UTILITAIRES */

function ActionBadge({ action }: { action: string }) {
  const upper = action.toUpperCase();
  let color = '#2563EB', bg = '#EFF6FF', border = '#BFDBFE';

  if (upper.includes('DELETE') || upper.includes('REJECT') || upper.includes('SUSPEND') || upper.includes('CANCEL')) {
    color = '#DC2626'; bg = '#FEF2F2'; border = '#FECACA';
  } else if (upper.includes('CREATE') || upper.includes('APPROVE') || upper.includes('VALIDATE') || upper.includes('SUBMIT')) {
    color = '#059669'; bg = '#ECFDF5'; border = '#A7F3D0';
  } else if (upper.includes('UPDATE') || upper.includes('EDIT')) {
    color = '#D97706'; bg = '#FFFBEB'; border = '#FDE68A';
  }

  const displayAction = action.replace(/_/g, ' ');

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.04em',
      color, background: bg, border: `1px solid ${border}`,
      borderRadius: 99, padding: '0.2rem 0.6rem',
      whiteSpace: 'nowrap', textTransform: 'uppercase'
    }}>
      {displayAction}
    </span>
  );
}

function getSummaryFromDetails(details: unknown): string {
  if (!details) return '—';
  if (typeof details === 'string') return details;
  
  if (typeof details === 'object' && details !== null) {
    const d = details as Record<string, unknown>;
    if (typeof d.summary === 'string') return d.summary;
    if (typeof d.message === 'string') return d.message;
  }
  
  return 'Action enregistrée';
}

// Transforme le JSON moche en une belle interface lisible
function RenderTechnicalDetails({ details }: { details: unknown }) {
  if (!details) return <span style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.85rem' }}>Aucun détail technique supplémentaire.</span>;
  
  let parsed = details;
  if (typeof details === 'string') {
    try { parsed = JSON.parse(details); } catch { return <span style={{ fontSize: '0.85rem' }}>{details}</span>; }
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const d = parsed as Record<string, unknown>;
    const fields = Array.isArray(d.updatedFields) ? d.updatedFields : [];
    const others = Object.entries(d).filter(([k]) => k !== 'updatedFields' && k !== 'summary' && k !== 'message');
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {fields.length > 0 && (
          <div>
            <strong style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Champs modifiés
            </strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {fields.map((f: string) => (
                <span key={f} style={{ background: '#E2E8F0', color: '#0F172A', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {others.length > 0 && (
          <div style={{ marginTop: fields.length > 0 ? '0.5rem' : '0' }}>
            <strong style={{ fontSize: '0.7rem', color: '#64748B', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Autres données
            </strong>
            <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {others.map(([k, v]) => (
                <div key={k} style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{k} :</span>
                  <span style={{ wordBreak: 'break-all' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  return <span style={{ fontSize: '0.85rem' }}>{String(details)}</span>;
}

/* ══════════════════════════════════════════════════════ MODALE DE DÉTAILS */

function AuditDetailModal({ item, onClose }: { item: AuditItem; onClose: () => void }) {
  const actorName = item.actorUser 
    ? `${item.actorUser.firstName || ''} ${item.actorUser.lastName || ''}`.trim() 
    : 'Système automatique';
  
  const summary = getSummaryFromDetails(item.details);

  return (
    <div className="au-modal-overlay" onClick={onClose}>
      <div className="au-modal" onClick={e => e.stopPropagation()}>
        <div className="au-modal-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-start' }}>
            <ActionBadge action={item.action} />
            <h2 className="au-modal-title" style={{ marginTop: '0.2rem' }}>Détails de l&apos;action</h2>
          </div>
          <button className="au-modal-close" onClick={onClose} aria-label="Fermer">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="au-modal-body">
          <div className="au-grid-2">
            <div className="au-info-box">
              <label>Auteur de l&apos;action</label>
              <span className="au-text-primary">{actorName}</span>
            </div>
            <div className="au-info-box">
              <label>Date et Heure</label>
              <span>{formatDate(item.createdAt)}</span>
            </div>
            <div className="au-info-box">
              <label>Cible (Entité)</label>
              <span>{item.entity}</span>
            </div>
            <div className="au-info-box">
              <label>Identifiant Cible</label>
              <span className="au-mono">{item.entityId || '—'}</span>
            </div>
          </div>

          <div className="au-info-box full-width" style={{ marginTop: '0.75rem' }}>
            <label>Résumé</label>
            <span style={{ fontSize: '0.9rem', lineHeight: 1.4 }}>{summary}</span>
          </div>

          <div className="au-info-box full-width" style={{ marginTop: '0.75rem', background: '#F8FAFC', borderStyle: 'dashed' }}>
            <label>Données Techniques</label>
            <RenderTechnicalDetails details={item.details} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE PRINCIPALE */

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);

  const load = useCallback(async (filterAction?: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.listAudit({
        page: 1, pageSize: 100,
        action: filterAction || undefined,
      });
      setItems((res as unknown as { items: AuditItem[] }).items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleFilter() {
    void load(actionFilter.trim() || undefined);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleFilter();
  }

  return (
    <AppShell title="Journal d'audit">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        .au-wrap { font-family: 'DM Sans', 'Inter', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1000px; margin: 0 auto; }
        
        .au-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: auin 0.5s cubic-bezier(.22,1,.36,1) forwards; }
        .au-eyebrow { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem; }
        .au-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; }
        .au-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.6rem, 4vw, 2.2rem); font-weight: 700; color: #0F172A; letter-spacing: -0.02em; line-height: 1.15; margin: 0; }
        .au-title span { color: #2563EB; }

        .au-count-chip { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.85rem; border-radius: 99px; background: #EFF6FF; border: 1px solid #BFDBFE; font-size: 0.75rem; font-weight: 700; color: #1D4ED8; box-shadow: 0 2px 4px rgba(37,99,235,0.05); }

        .au-toolbar { display: flex; gap: 0.75rem; margin-bottom: 2rem; flex-wrap: nowrap; opacity: 0; transform: translateY(10px); animation: auin 0.5s 0.05s cubic-bezier(.22,1,.36,1) forwards; }
        .au-input-wrap { position: relative; flex: 1; min-width: 0; }
        .au-input-ico { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }
        .au-input { width: 100%; height: 46px; border-radius: 12px; border: 1px solid #CBD5E1; background: white; padding: 0 1rem 0 2.8rem; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 500; color: #0F172A; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .au-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .au-input::placeholder { color: #94A3B8; font-weight: 400; }

        .au-filter-btn { height: 46px; padding: 0 1.5rem; border-radius: 12px; background: #2563EB; border: none; color: white; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(37,99,235,0.2); transition: all 0.2s; flex-shrink: 0; }
        .au-filter-btn:hover { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.3); }

        .au-clear-btn { height: 46px; padding: 0 1rem; border-radius: 12px; border: 1px solid #CBD5E1; background: white; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: #475569; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; flex-shrink: 0; }
        .au-clear-btn:hover { background: #F8FAFC; color: #0F172A; border-color: #94A3B8; }

        /* Grille de cartes d'audit */
        .au-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; opacity: 0; transform: translateY(10px); animation: auin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards; }
        
        .au-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 1.25rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; gap: 1rem; position: relative; overflow: hidden; cursor: pointer; }
        .au-card:hover { border-color: #93C5FD; transform: translateY(-2px); box-shadow: 0 12px 24px -10px rgba(37,99,235,0.15); }
        .au-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #E2E8F0; transition: background 0.2s; }
        .au-card:hover::before { background: #3B82F6; }

        .au-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .au-card-actor { display: flex; align-items: center; gap: 0.6rem; }
        .au-actor-ico { width: 32px; height: 32px; border-radius: 8px; background: #F1F5F9; color: #64748B; display: flex; align-items: center; justify-content: center; }
        .au-actor-name { font-weight: 700; font-size: 0.95rem; color: #0F172A; line-height: 1.2; }
        .au-date { font-size: 0.7rem; font-weight: 600; color: #64748B; }

        .au-card-body { background: #F8FAFC; border-radius: 10px; padding: 0.85rem; border: 1px solid #F1F5F9; flex: 1; }
        .au-summary-text { font-size: 0.85rem; color: #1E293B; font-weight: 500; line-height: 1.5; margin: 0; }
        
        .au-card-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px dashed #E2E8F0; }
        .au-target { display: inline-flex; align-items: center; gap: 0.3rem; font-family: 'DM Mono', monospace; font-size: 0.7rem; color: #475569; font-weight: 600; background: white; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0.2rem 0.5rem; }

        /* ── MODALE STYLES (SCROLL MOBILE CORRIGÉ) ── */
        .au-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; overflow-y: auto; -webkit-overflow-scrolling: touch; animation: aefade 0.2s ease; }
        .au-modal { background: white; width: 100%; max-width: 520px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); display: flex; flex-direction: column; margin: auto; flex-shrink: 0; animation: aescale 0.3s cubic-bezier(.22,1,.36,1); position: relative; }
        
        .au-modal-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; background: white; border-radius: 20px 20px 0 0; }
        .au-modal-title { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; color: #0F172A; margin: 0; line-height: 1.2; }
        .au-modal-close { background: white; border: 1px solid #E2E8F0; width: 34px; height: 34px; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #64748B; transition: all 0.2s; }
        .au-modal-close:hover { background: #F1F5F9; color: #0F172A; }
        
        .au-modal-body { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; gap: 0.75rem; }
        
        .au-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
        .full-width { grid-column: 1 / -1; }
        
        .au-info-box { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .au-info-box label { font-size: 0.65rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; display: block; }
        .au-info-box span { font-size: 0.9rem; font-weight: 600; color: #0F172A; display: block; word-break: break-word; }
        .au-text-primary { color: #2563EB !important; font-weight: 700 !important; }
        .au-mono { font-family: 'DM Mono', monospace; font-size: 0.85rem !important; }

        /* États (Loading, Empty, Error) */
        .au-loader { display: flex; align-items: center; justify-content: center; padding: 4rem 1rem; gap: 0.75rem; color: #64748B; font-size: 0.9rem; font-weight: 600; grid-column: 1 / -1; }
        .au-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.2); border-top-color: #2563EB; border-radius: 50%; animation: auspin 0.8s linear infinite; }
        
        .au-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem 1rem; gap: 0.75rem; color: #94A3B8; grid-column: 1 / -1; text-align: center; }
        .au-empty-ico { width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; border: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: center; color: #CBD5E1; }
        .au-empty p { font-size: 0.9rem; font-weight: 600; margin: 0; }

        .au-error { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.25rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.85rem; font-weight: 600; margin-bottom: 1.5rem; }

        /* Mobile Adjustments */
        @media (max-width: 640px) {
          .au-grid { grid-template-columns: 1fr; }
          .au-toolbar { flex-direction: row; align-items: center; padding: 0.2rem; gap: 0.4rem; }
          .au-input-wrap { min-width: 0; flex: 1; }
          .au-input { font-size: 0.8rem; padding-left: 2.2rem; }
          .au-input-ico { left: 0.7rem; }
          .au-filter-btn { padding: 0 0.8rem; font-size: 0.8rem; }
          .au-clear-btn { padding: 0 0.6rem; font-size: 0.75rem; }
          .au-grid-2 { grid-template-columns: 1fr; gap: 0.5rem; }
        }

        @keyframes auin { to { opacity: 1; transform: translateY(0); } }
        @keyframes aefade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aescale { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes auspin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="au-wrap">

        <div className="au-header">
          <div>
            <div className="au-eyebrow"><div className="au-eyebrow-dot" />Admin antenne</div>
            <h1 className="au-title">Journal <span>d&apos;audit</span></h1>
          </div>
          <div>
            <span className="au-count-chip">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              {items.length} entrées trouvées
            </span>
          </div>
        </div>

        {error && (
          <div className="au-error">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
            {error}
          </div>
        )}

        <div className="au-toolbar">
          <div className="au-input-wrap">
            <span className="au-input-ico">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              className="au-input"
              type="text"
              placeholder="Filtrer par action (ex: VALIDATE_CONTRIBUTION)..."
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button className="au-filter-btn" onClick={handleFilter}>
            Filtrer
          </button>

          {actionFilter && (
            <button className="au-clear-btn" onClick={() => { setActionFilter(''); void load(); }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              <span className="hide-mobile">Effacer</span>
            </button>
          )}
        </div>

        <div className="au-grid">
          {loading ? (
            <div className="au-loader"><div className="au-ring" />Chargement du journal...</div>
          ) : items.length === 0 ? (
            <div className="au-empty">
              <div className="au-empty-ico">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
              </div>
              <p>{actionFilter ? 'Aucun résultat pour ce filtre.' : 'Le journal d\'audit est vide.'}</p>
            </div>
          ) : (
            items.map((item, i) => {
              const actorName = item.actorUser 
                ? `${item.actorUser.firstName || ''} ${item.actorUser.lastName || ''}`.trim() 
                : 'Système';
              const summary = getSummaryFromDetails(item.details);
              
              return (
                <div key={item.id} className="au-card" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => setSelectedItem(item)}>
                  <div className="au-card-head">
                    <div className="au-card-actor">
                      <div className="au-actor-ico">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="au-actor-name">{actorName}</div>
                        <div className="au-date">{formatDate(item.createdAt)}</div>
                      </div>
                    </div>
                    <ActionBadge action={item.action} />
                  </div>
                  
                  <div className="au-card-body">
                    <p className="au-summary-text">{summary}</p>
                  </div>
                  
                  <div className="au-card-foot">
                    <div className="au-target">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ color: '#94A3B8' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      {item.entity} {item.entityId ? `[${item.entityId.slice(0,8)}...]` : ''}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedItem && (
        <AuditDetailModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
        />
      )}
    </AppShell>
  );
}