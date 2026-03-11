// web/app/(protected)/admin/projects/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { ProjectForm } from '../../../../components/admin/ProjectForm';
import { api } from '../../../../lib/api-client';
import type { Project, ProjectStatus } from '../../../../types/project';
import { formatCurrency, formatDate } from '../../../../lib/format';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminé' },
];

const PROJ_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:            { label: 'Brouillon',   color:'#6B7280', bg:'#F3F4F6', border:'#E5E7EB' },
  PENDING_APPROVAL: { label: 'En attente',  color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  APPROVED:         { label: 'Approuvé',    color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
  IN_PROGRESS:      { label: 'En cours',    color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
  COMPLETED:        { label: 'Terminé',     color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  SUSPENDED:        { label: 'Suspendu',    color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  CANCELLED:        { label: 'Annulé',      color:'#9CA3AF', bg:'#F9FAFB', border:'#E5E7EB' },
  PROPOSED:         { label: 'Proposé',     color:'#6B7280', bg:'#F3F4F6', border:'#E5E7EB' },
  UNDER_REVIEW:     { label: 'En revue',    color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  MEMBER_APPROVAL_PENDING: { label: 'Vote', color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  ON_HOLD:          { label: 'En pause',    color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  ARCHIVED:         { label: 'Archivé',     color:'#9CA3AF', bg:'#F9FAFB', border:'#E5E7EB' },
};

function StatusBadge({ status }: { status: ProjectStatus | string }) {
  const s = PROJ_STATUS_MAP[status] ?? PROJ_STATUS_MAP['DRAFT'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'.25rem', fontSize:'.65rem', fontWeight:800, color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:99, padding:'.15rem .5rem', whiteSpace:'nowrap' }}>
      <span style={{ width:4, height:4, borderRadius:'50%', background:s.color }} />{s.label}
    </span>
  );
}

export default function AdminProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listAntennaProjects({
        page: 1, pageSize: 100,
        q: q || undefined,
        status: status || undefined,
      });
      setItems(res?.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement projets');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => { void load(); }, [load]);

  const draftCount = items.filter(i => i.status === 'DRAFT').length;
  const inProgressCount = items.filter(i => i.status === 'IN_PROGRESS').length;
  const completedCount = items.filter(i => i.status === 'COMPLETED').length;

  return (
    <AppShell title="Projets de l'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .pp-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1200px; margin: 0 auto;
        }

        /* Header */
        .pp-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(10px);
          animation: ppin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pp-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .pp-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: pppulse 2s ease-in-out infinite; }
        @keyframes pppulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .pp-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .pp-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Layout 2 cols */
        .pp-layout {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        /* Amélioration Responsive Mobile */
        @media (max-width: 1024px) { 
          .pp-layout { grid-template-columns: 1fr; gap: 1.5rem; } 
          .pp-panel-left { order: 1; }
          .pp-panel-right { order: 2; }
        }

        /* Panel */
        .pp-panel {
          background: rgba(253,253,255,0.93);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
        }
        .pp-panel-left {
          opacity: 0; transform: translateY(10px);
          animation: ppin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .pp-panel-right {
          opacity: 0; transform: translateY(10px);
          animation: ppin 0.5s 0.17s cubic-bezier(.22,1,.36,1) forwards;
        }

        .pp-panel-head {
          padding: 1rem 1.3rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
          display: flex; align-items: center; gap: 0.55rem; justify-content: space-between;
        }
        .pp-panel-title-wrap { display: flex; align-items: center; gap: 0.5rem; }
        .pp-panel-ico {
          width: 26px; height: 26px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
        }
        .pp-panel-title { font-size: 0.73rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #1F2937; }
        .pp-count-chip { font-size: 0.68rem; font-weight: 800; padding: 0.18rem 0.55rem; border-radius: 99px; background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }

        .pp-panel-body { padding: 1.3rem; }
        @media (max-width: 640px) {
           .pp-panel-body { padding: 1rem; }
        }

        /* Summary chips */
        .pp-chips {
          display: flex; gap: 0.6rem; flex-wrap: wrap;
          padding: 0.85rem 1.3rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
        }
        .pp-chip { display: flex; align-items: center; gap: 0.38rem; padding: 0.35rem 0.75rem; border-radius: 9px; font-size: 0.72rem; font-weight: 600; border: 1px solid; }
        .pp-chip-dot { width: 5px; height: 5px; border-radius: 50%; }
        .pp-chip-count { font-family: 'Cormorant Garamond', serif; font-size: 0.95rem; font-weight: 600; }

        /* Filter toolbar inside panel */
        .pp-filter-row {
          padding: 0.85rem 1.3rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
          display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap;
        }
        
        .pp-input {
          height: 34px; border-radius: 8px; border: 1px solid rgba(37,99,235,0.15); padding: 0 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; outline: none; flex: 1; min-width: 150px; background: rgba(255,255,255,0.85); transition: border-color 0.2s;
        }
        .pp-input:focus { border-color: rgba(37,99,235,0.4); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }

        .pp-select {
          height: 34px; border-radius: 8px;
          border: 1px solid rgba(37,99,235,0.15); background: rgba(255,255,255,0.85);
          padding: 0 1.8rem 0 0.75rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.75rem; color: #111827; font-weight: 600;
          outline: none; -webkit-appearance: none; appearance: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 0.5rem center;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .pp-select:focus { border-color: rgba(37,99,235,0.4); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }

        .pp-reload-btn {
          height: 34px; padding: 0 0.8rem;
          background: rgba(239,246,255,0.7); border: 1px solid rgba(37,99,235,0.18);
          border-radius: 8px; cursor: pointer; color: #1D4ED8;
          font-family: 'DM Sans', sans-serif; font-size: 0.72rem; font-weight: 700;
          display: flex; align-items: center; gap: 0.3rem;
          transition: all 0.18s; white-space: nowrap;
        }
        .pp-reload-btn:hover { background: #DBEAFE; border-color: #2563EB; transform: translateY(-1px); }
        
        @media (max-width: 640px) {
           .pp-reload-btn { margin-left: 0; width: 100%; justify-content: center; }
           .pp-select { flex: 1; }
        }

        /* Loader / error inside table zone */
        .pp-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; font-weight: 600;}
        .pp-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: ppspin 0.8s linear infinite; }
        @keyframes ppspin { to { transform: rotate(360deg); } }
        .pp-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.8rem; font-weight: 600; margin: 1rem; }

        /* Actions dans le tableau */
        .ap-action-btn { font-size: 0.7rem; font-weight: 600; padding: 0.3rem 0.6rem; border-radius: 6px; cursor: pointer; border: 1px solid transparent; transition: all 0.2s; white-space: nowrap; }
        .ap-action-edit { color: #2563EB; background: #EFF6FF; border-color: rgba(37,99,235,0.15); }
        .ap-action-edit:hover { background: #DBEAFE; }
        .ap-action-del { color: #DC2626; background: #FEF2F2; margin-left: 0.4rem; border-color: rgba(220,38,38,0.15); }
        .ap-action-del:hover { background: #FECACA; }
        .ap-action-del:disabled { opacity: 0.5; cursor: not-allowed; }

        .pp-table { width: 100%; border-collapse: collapse; }
        .pp-table th { padding: 0.8rem 1.2rem; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #6B7280; background: #F8FAFC; text-align: left; border-bottom: 1px solid rgba(37,99,235,0.07); white-space: nowrap; }
        .pp-table td { padding: 1rem 1.2rem; font-size: 0.8rem; color: #111827; border-bottom: 1px solid rgba(37,99,235,0.04); vertical-align: top; }
        .pp-table tr:last-child td { border-bottom: none; }
        .pp-table tr:hover { background: rgba(37,99,235,0.015); }

        @keyframes ppin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pp-wrap">

        {/* Header */}
        <div className="pp-header">
          <div className="pp-eyebrow"><div className="pp-eyebrow-dot" />Admin antenne</div>
          <h1 className="pp-title">Gestion des <span>projets</span></h1>
        </div>

        <div className="pp-layout">

          {/* LEFT — Formulaire */}
          <div className="pp-panel-left">
            <div className="pp-panel">
              <div className="pp-panel-head">
                <div className="pp-panel-title-wrap">
                  <div className="pp-panel-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <span className="pp-panel-title">{editing ? 'Modifier le projet' : 'Nouveau projet'}</span>
                </div>
              </div>
              <div className="pp-panel-body">
                <ProjectForm
                  initialValues={editing ? {
                    title: editing.title,
                    description: editing.description || '',
                    status: editing.status,
                    budgetPlanned: editing.budgetPlanned?.toString() || '',
                    budgetSpent: editing.budgetSpent?.toString() || '',
                    startsAt: editing.startsAt ? new Date(editing.startsAt).toISOString().slice(0, 10) : '',
                    endsAt: editing.endsAt ? new Date(editing.endsAt).toISOString().slice(0, 10) : '',
                  } : undefined}
                  submitLabel={editing ? 'Mettre à jour' : 'Créer le projet'}
                  onSubmit={async (values) => {
                    try {
                      const payload = {
                        title: values.title,
                        description: values.description || undefined,
                        status: values.status as ProjectStatus,
                        budgetPlanned: values.budgetPlanned ? Number(values.budgetPlanned) : undefined,
                        budgetSpent: values.budgetSpent ? Number(values.budgetSpent) : undefined,
                        startsAt: values.startsAt || null,
                        endsAt: values.endsAt || null,
                      };

                      if (editing) {
                        await api.updateAntennaProject(editing.id, payload);
                        setEditing(null);
                      } else {
                        await api.createAntennaProject(payload);
                      }
                      await load();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "Erreur.");
                    }
                  }}
                />
                {editing && (
                  <button 
                    onClick={() => setEditing(null)} 
                    style={{ marginTop: '1rem', width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}
                  >
                    Annuler la modification
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Historique */}
          <div className="pp-panel-right">
            <div className="pp-panel">
              <div className="pp-panel-head">
                <div className="pp-panel-title-wrap">
                  <div className="pp-panel-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <span className="pp-panel-title">Projets de l&apos;antenne</span>
                </div>
                {items.length > 0 && <span className="pp-count-chip">{items.length}</span>}
              </div>

              {/* Summary chips */}
              <div className="pp-chips">
                {[
                  { label: 'Brouillons', count: draftCount,      color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
                  { label: 'En cours',   count: inProgressCount, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                  { label: 'Terminés',   count: completedCount,  color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                ].map(c => (
                  <div key={c.label} className="pp-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }}>
                    <span className="pp-chip-dot" style={{ background: c.color }} />
                    <span className="pp-chip-count">{c.count}</span>
                    <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>{c.label}</span>
                  </div>
                ))}
              </div>

              {/* Filter */}
              <div className="pp-filter-row">
                <input 
                  className="pp-input" 
                  placeholder="Rechercher par titre..." 
                  value={q} 
                  onChange={e => setQ(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && void load()}
                />
                <select className="pp-select" value={status} onChange={e => { setStatus(e.target.value); setTimeout(load, 50); }}>
                   {STATUS_OPTIONS.map(opt => (
                     <option key={opt.value} value={opt.value}>{opt.label}</option>
                   ))}
                </select>
                
                <button className="pp-reload-btn" onClick={() => void load()}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Rechercher
                </button>
              </div>

              {/* Table Area */}
              {loading ? (
                <div className="pp-loader"><div className="pp-ring" />Chargement&#8230;</div>
              ) : error ? (
                <div className="pp-error">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                  </svg>
                  {error}
                </div>
              ) : items.length === 0 ? (
                 <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#9CA3AF' }}>
                    <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.5" style={{ margin: '0 auto 0.75rem' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                    </svg>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>Aucun projet trouvé.</p>
                 </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="pp-table">
                    <thead>
                      <tr>
                        <th>Projet</th>
                        <th>Statut</th>
                        <th>Budget</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((p, i) => (
                        <tr key={p.id} style={{ animation: `ppin 0.4s ${i * 0.05}s both` }}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{p.title}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '4px' }}>
                              {p.startsAt ? formatDate(p.startsAt) : '—'} → {p.endsAt ? formatDate(p.endsAt) : '—'}
                            </div>
                          </td>
                          <td><StatusBadge status={p.status} /></td>
                          <td>
                            {p.budgetPlanned ? <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: '#111827' }}>{formatCurrency(p.budgetPlanned)}</span> : <span style={{ color: '#D1D5DB' }}>—</span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="ap-action-btn ap-action-edit" onClick={() => setEditing(p)}>Modifier</button>
                            <button 
                              className="ap-action-btn ap-action-del" 
                              disabled={busyId === p.id}
                              onClick={async () => {
                                if(window.confirm('Supprimer ce projet ?')) {
                                  setBusyId(p.id);
                                  await api.deleteAntennaProject(p.id);
                                  if (editing?.id === p.id) setEditing(null);
                                  await load();
                                  setBusyId(null);
                                }
                              }}
                            >
                              {busyId === p.id ? '...' : 'Supprimer'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}