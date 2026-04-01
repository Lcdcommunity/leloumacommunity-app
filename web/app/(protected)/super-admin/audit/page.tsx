// web/app/(protected)/super-admin/audit/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ TYPES */
interface ExtendedAuditItem {
  id: string;
  action: string;
  entity?: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null; 
  createdAt: string;
  actorUser?: { firstName: string; lastName: string } | null;
  antenna?: { name: string } | null;
  targetModel?: string | null;
  targetId?: string | null;
  summary?: string | null;
}

/* ══════════════════════════════════════════════════════ ACTION PILL */
const ACTION_THEMES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  CREATE: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Création' },
  UPDATE: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Modif.' },
  DELETE: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Suppr.' },
  LOGIN_SUCCESS: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Connexion' },
  APPROVE_ACCOUNT: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Approbation' },
  VALIDATE_CONTRIBUTION: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Validation' },
  DEFAULT: { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', label: 'Action' },
};

function ActionPill({ action }: { action: string }) {
  const theme = ACTION_THEMES[action] || ACTION_THEMES.DEFAULT;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '.2rem .5rem', borderRadius: 6,
      fontFamily: "'DM Sans', sans-serif", fontSize: '.68rem', fontWeight: 800,
      background: theme.bg, border: `1px solid ${theme.border}`, color: theme.color,
      textTransform: 'uppercase', letterSpacing: '0.02em'
    }}>
      {theme.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ LOGIC: STYLED DESCRIPTION */
function getAuditDescription(item: ExtendedAuditItem): React.ReactNode {
  // Nom et Prénom en BLEU et en Gras
  const actorNode = item.actorUser ? (
    <span className="sau-actor-name">{`${item.actorUser.firstName} ${item.actorUser.lastName}`}</span>
  ) : <span className="sau-normal-text">Système</span>;
  
  const entityName = item.entity || item.targetModel || 'élément';

  switch (item.action) {
    case 'LOGIN_SUCCESS':
      return <>{actorNode} <span className="sau-normal-text">s&apos;est connecté à la plateforme.</span></>;
    
    case 'UPDATE':
      const fields = item.details?.updatedFields;
      let fieldNodeList: React.ReactNode = 'des informations';
      
      if (Array.isArray(fields) && fields.length > 0) {
        // 🔥 Correction : On type 'field' en 'unknown' pour éviter l'erreur 'any'
        fieldNodeList = fields.map((field: unknown, index: number) => (
          <span key={index} className="sau-mono-inline">
            {String(field)}{index < fields.length - 1 ? ', ' : ''}
          </span>
        ));
      }
      return (
        <>
          {actorNode} <span className="sau-normal-text">a modifié [</span> {fieldNodeList} <span className="sau-normal-text">] sur</span> {entityName}.
        </>
      );
      
    case 'CREATE':
      return <>{actorNode} <span className="sau-normal-text">a créé un nouveau dossier</span> {entityName}.</>;
    case 'APPROVE_ACCOUNT':
      return <>{actorNode} <span className="sau-normal-text">a approuvé un compte membre.</span></>;
    case 'VALIDATE_CONTRIBUTION':
      return <>{actorNode} <span className="sau-normal-text">a validé une cotisation.</span></>;
    case 'DELETE':
      return <>{actorNode} <span className="sau-normal-text">a supprimé</span> {entityName}.</>;
    default:
      return <>{actorNode} <span className="sau-normal-text">action :</span> {item.action} <span className="sau-normal-text">sur</span> {entityName}.</>;
  }
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminAuditPage() {
  const [items, setItems] = useState<ExtendedAuditItem[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (filter?: string) => {
    setLoading(true);
    try {
      const res = await api.listAudit({
        action: filter || undefined,
        page: 1, pageSize: 100,
      });
      setItems(res.items as unknown as ExtendedAuditItem[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const uniqueActions = new Set(items.map(i => i.action)).size;
  const todayCount    = items.filter(i => new Date(i.createdAt).toDateString() === new Date().toDateString()).length;
  const deleteCount   = items.filter(i => i.action === 'DELETE').length;

  return (
    <AppShell title="Journal d'audit">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        
        .sau-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1100px; margin: 0 auto; }
        .sau-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 4vw, 2.2rem); font-weight: 700; color: #111827; margin-bottom: 1.5rem; }
        .sau-title span { color: #DC2626; }

        /* Stats - Une seule ligne mobile */
        .sau-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 1.25rem; }
        .sau-stat { background: white; border-radius: 14px; border: 1px solid #F1F5F9; border-top: 3px solid; padding: 0.7rem 0.4rem; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .sau-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.4rem; font-weight: 700; line-height: 1; margin-bottom: 2px; }
        .sau-stat-lbl { font-size: 0.55rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }

        .sau-panel { background: white; border-radius: 24px; border: 1px solid rgba(220,38,38,0.1); box-shadow: 0 10px 25px rgba(0,0,0,0.03); overflow: hidden; }
        
        /* Header - Titre + Icone Refresh sur une ligne */
        .sau-panel-head { padding: 1rem 1.25rem; border-bottom: 1px solid #F1F5F9; background: #FAFBFD; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .sau-panel-titlerow { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
        .sau-panel-title { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; color: #1F2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .sau-reload-btn { width: 38px; height: 38px; border-radius: 10px; background: white; border: 1.5px solid #E2E8F0; color: #DC2626; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .sau-reload-btn:active { transform: rotate(90deg); background: #FEF2F2; }

        /* Toolbar - Recherche + Bouton Filtrer sur une ligne */
        .sau-toolbar { display: flex; gap: 0.5rem; align-items: center; padding: 0.8rem 1rem; border-bottom: 1px solid #F1F5F9; flex-wrap: nowrap; }
        .sau-sw { position: relative; flex: 1; min-width: 0; }
        .sau-si { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #94A3B8; }
        .sau-input { width: 100%; height: 42px; border-radius: 11px; border: 1.5px solid #E2E8F0; background: white; padding: 0 0.5rem 0 2.2rem; font-size: 0.82rem; font-weight: 600; outline: none; transition: all 0.2s; }
        .sau-filter-btn { height: 42px; padding: 0 1rem; border-radius: 11px; background: #DC2626; border: none; color: white; cursor: pointer; font-size: 0.8rem; font-weight: 800; display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

        /* Style des textes demandés */
        .sau-summary { font-size: 0.9rem; color: #1E293B; line-height: 1.4; }
        .sau-actor-name { color: #2563EB; font-weight: 800; } /* BLEU et Gras */
        .sau-normal-text { font-weight: 400; color: #475569; } /* NON-Gras */
        .sau-mono-inline { font-family: 'DM Mono', monospace; font-weight: 400; color: #1E293B; background: #F8FAFC; padding: 0 2px; border-radius: 4px; } /* Autre police, NON-Gras */

        .sau-mc { padding: 1.25rem; border-bottom: 1px solid #F8FAFC; }
        .sau-mc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
        .sau-date { font-family: 'DM Mono', monospace; font-size: 0.7rem; font-weight: 600; color: #94A3B8; }
        .sau-meta { font-size: 0.72rem; color: #64748B; font-weight: 600; display: flex; align-items: center; gap: 0.35rem; margin-top: 0.5rem; }

        .sau-table-wrap { display: none; }
        @media (min-width: 768px) {
          .sau-mob-list { display: none; }
          .sau-table-wrap { display: block; }
          .sau-table { width: 100%; border-collapse: collapse; }
          .sau-table th { padding: 1rem 1.25rem; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #64748B; text-align: left; background: #FAFBFD; border-bottom: 1px solid #F1F5F9; }
          .sau-table td { padding: 1.25rem; border-bottom: 1px solid #F8FAFC; }
        }

        .spinner { width: 24px; height: 24px; border: 3px solid rgba(220,38,38,0.1); border-top-color: #DC2626; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 4rem auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="sau-wrap">
        <h1 className="sau-title">Journal d&apos;<span>audit</span></h1>
        
        {/* Stats - Forcés sur une ligne */}
        <div className="sau-stats">
          {[
            { label: 'Événements', value: items.length, color: '#DC2626' },
            { label: 'Uniques',    value: uniqueActions, color: '#2563EB' },
            { label: 'Aujourd’hui', value: todayCount, color: '#059669' },
            { label: 'Suppressions', value: deleteCount, color: '#D97706' },
          ].map(s => (
            <div key={s.label} className="sau-stat" style={{ borderTopColor: s.color }}>
              <div className="sau-stat-val" style={{ color: s.color }}>{loading ? '…' : s.value}</div>
              <div className="sau-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="sau-panel">
          <div className="sau-panel-head">
            <div className="sau-panel-titlerow">
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <span className="sau-panel-title">Historique des actions</span>
            </div>
            <button className="sau-reload-btn" onClick={() => void load(actionFilter)}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>

          <div className="sau-toolbar">
            <div className="sau-sw">
              <span className="sau-si"><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span>
              <input 
                className="sau-input" 
                placeholder="Filtrer (ex: UPDATE)..." 
                value={actionFilter} 
                onChange={e => setActionFilter(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && void load(actionFilter)}
              />
            </div>
            <button className="sau-filter-btn" onClick={() => void load(actionFilter)}>Filtrer</button>
          </div>

          {loading ? (
            <div className="spinner" />
          ) : (
            <>
              <div className="sau-mob-list">
                {items.map(item => (
                  <div key={item.id} className="sau-mc">
                    <div className="sau-mc-top">
                      <ActionPill action={item.action} />
                      <span className="sau-date">{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="sau-summary">{getAuditDescription(item)}</div>
                    <div className="sau-meta">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      {item.antenna?.name || 'Direction Générale'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="sau-table-wrap">
                <table className="sau-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Détails de l&apos;événement</th>
                      <th>Antenne</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td><ActionPill action={item.action} /></td>
                        <td className="sau-summary">
                          {getAuditDescription(item)}
                        </td>
                        <td style={{ color: '#64748B', fontWeight: 600 }}>{item.antenna?.name || 'Direction'}</td>
                        <td className="sau-date">{formatDate(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '5rem 1rem', color: '#94A3B8', fontSize: '0.9rem', fontWeight: 600 }}>
                  <div style={{fontSize:'2rem', marginBottom:'1rem'}}>🍃</div>
                  Aucun journal d&apos;audit trouvé.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}