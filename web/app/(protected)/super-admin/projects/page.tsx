// web/app/(protected)/super-admin/projects/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Project, ProjectStatus } from '../../../../types/project';
import { formatDate, formatCurrency } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ STATUS MAP */
const STATUS_MAP: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:            { label: 'Brouillon',           color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  PENDING_APPROVAL: { label: 'En attente',          color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  APPROVED:         { label: 'Approuv\u00e9',        color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  IN_PROGRESS:      { label: 'En cours',            color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  COMPLETED:        { label: 'Termin\u00e9',         color: '#0E7490', bg: '#ECFEFF', border: '#A5F3FC' },
  SUSPENDED:        { label: 'Suspendu',            color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  CANCELLED:        { label: 'Annul\u00e9',          color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS_MAP[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem', fontWeight: 900, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.2rem .6rem', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ BUDGET BAR */
function BudgetBar({ planned, spent }: { planned?: number | null; spent?: number | null }) {
  if (!planned) return <span style={{ color: '#D1D5DB', fontWeight: 700 }}>—</span>;
  const pct = Math.min(100, Math.round(((spent ?? 0) / planned) * 100));
  const over = (spent ?? 0) > planned;
  const barColor = over ? '#DC2626' : pct > 80 ? '#D97706' : '#059669';
  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2rem' }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.68rem', fontWeight: 700, color: barColor }}>{pct}%</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.65rem', fontWeight: 600, color: '#9CA3AF' }}>{formatCurrency(planned, 'GNF')}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#F3F4F6', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width .5s ease' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ DELETE MODAL */
function DeleteModal({
  project, onConfirm, onCancel, busy,
}: { project: Project; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={onCancel} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(440px,calc(100vw - 2rem))', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(220,38,38,.12)' }}>
        <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.4rem' }}>Supprimer ce projet&nbsp;?</h2>
        <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600, lineHeight: 1.55 }}>
          <strong style={{ color: '#111827' }}>{project.title}</strong> sera supprim&eacute; d&eacute;finitivement.
        </p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center' }}>
          <button onClick={onCancel} disabled={busy} style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid rgba(220,38,38,.18)', background: 'rgba(249,250,251,.95)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirm} disabled={busy} style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.35)', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            {busy && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spjspin .7s linear infinite' }} />}
            Supprimer
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminProjectsPage() {
  const [items,        setItems]        = useState<Project[]>([]);
  const [q,            setQ]            = useState('');
  const [status,       setStatus]       = useState('');
  const [error,        setError]        = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [busyId,       setBusyId]       = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const load = useCallback(async (qVal?: string, sVal?: string) => {
    setError(null); setLoading(true);
    try {
      const res = await api.listProjects({
        page: 1, pageSize: 100,
        q:      (qVal ?? q)      || undefined,
        status: (sVal ?? status) || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement projets');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => { void load('', ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(project: Project) {
    setBusyId(project.id); setDeleteTarget(null);
    try {
      await api.deleteProject(project.id);
      await load(q, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setBusyId(null);
    }
  }

  /* status counts */
  const inProgress = items.filter(p => p.status === 'IN_PROGRESS').length;
  const pending    = items.filter(p => p.status === 'PENDING_APPROVAL').length;
  const completed  = items.filter(p => p.status === 'COMPLETED').length;

  const thStyle: React.CSSProperties = { padding: '.75rem 1.2rem', fontSize: '.63rem', fontWeight: 900, letterSpacing: '.11em', textTransform: 'uppercase', color: '#374151', background: 'rgba(254,242,242,.35)', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '.9rem 1.2rem', fontSize: '.84rem', color: '#111827', verticalAlign: 'middle' };

  return (
    <AppShell title="Projets (pilotage global)">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .spj-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1280px;margin:0 auto}

        /* Header */
        .spj-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:spjin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .spj-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .spj-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:spjpulse 2s ease-in-out infinite}
        @keyframes spjpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .spj-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .spj-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* Stats */
        .spj-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:spjin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:700px){.spj-stats{grid-template-columns:repeat(2,1fr)}}
        .spj-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem 1rem}
        .spj-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .spj-stat-lbl{font-size:.64rem;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.07em}

        /* Panel */
        .spj-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:spjin .5s .14s cubic-bezier(.22,1,.36,1) forwards}
        .spj-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .spj-panel-titlerow{display:flex;align-items:center;gap:.55rem}
        .spj-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .spj-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .spj-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}

        /* Toolbar */
        .spj-toolbar{display:flex;gap:.6rem;align-items:flex-end;flex-wrap:wrap;padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07)}
        .spj-field{display:flex;flex-direction:column;gap:.35rem}
        .spj-field-grow{flex:1;min-width:180px}
        .spj-label{font-size:.7rem;font-weight:900;color:#374151;letter-spacing:.07em;text-transform:uppercase}
        .spj-sw{position:relative}
        .spj-si{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .spj-input{width:100%;height:40px;border-radius:11px;border:1px solid rgba(220,38,38,.15);background:rgba(255,255,255,.88);padding:0 .9rem 0 2.4rem;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:600;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .spj-input:focus{border-color:rgba(220,38,38,.4);box-shadow:0 0 0 3px rgba(220,38,38,.08);background:white}
        .spj-input::placeholder{color:rgba(107,114,128,.45);font-weight:400}
        .spj-select{height:40px;border-radius:11px;border:1px solid rgba(220,38,38,.15);background:rgba(255,255,255,.88);padding:0 2rem 0 .85rem;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:700;color:#111827;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .65rem center;min-width:190px;transition:border-color .2s}
        .spj-select:focus{border-color:rgba(220,38,38,.4);box-shadow:0 0 0 3px rgba(220,38,38,.08);outline:none}
        .spj-filter-btn{height:40px;padding:0 1.2rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:900;display:flex;align-items:center;gap:.45rem;box-shadow:0 3px 10px rgba(220,38,38,.3);transition:all .18s;white-space:nowrap;align-self:flex-end}
        .spj-filter-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 16px rgba(220,38,38,.42)}
        .spj-filter-btn:disabled{opacity:.6;cursor:not-allowed}

        /* Quick filter chips */
        .spj-chips{display:flex;gap:.5rem;flex-wrap:wrap;padding:.7rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.05);background:rgba(254,242,242,.12)}
        .spj-chip{display:inline-flex;align-items:center;gap:.28rem;font-size:.68rem;font-weight:900;border-radius:99px;padding:.22rem .6rem;border:1px solid;cursor:pointer;transition:all .15s}

        /* Table */
        .spj-tw{overflow-x:auto}
        .spj-table{width:100%;border-collapse:collapse;min-width:720px}
        .spj-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .spj-table tbody tr{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s;animation:spjin .4s cubic-bezier(.22,1,.36,1) both}
        .spj-table tbody tr:last-child{border-bottom:none}
        .spj-table tbody tr:hover{background:rgba(220,38,38,.02)}
        .spj-project-title{font-weight:900;font-size:.9rem;color:#0F172A}
        .spj-project-desc{font-size:.73rem;font-weight:600;color:#6B7280;margin-top:2px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .spj-date{font-family:'DM Mono',monospace;font-size:.73rem;font-weight:600;color:#6B7280}
        .spj-btn-del{height:28px;padding:0 .65rem;border-radius:7px;border:1.5px solid rgba(220,38,38,.2);background:rgba(254,242,242,.6);color:#DC2626;font-family:'DM Sans',sans-serif;font-size:.7rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.25rem;transition:all .15s;white-space:nowrap}
        .spj-btn-del:hover:not(:disabled){background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}
        .spj-btn-del:disabled{opacity:.45;cursor:not-allowed}

        /* Mobile cards */
        .spj-mob{display:none;flex-direction:column}
        @media(max-width:700px){.spj-tw{display:none}.spj-mob{display:flex}}
        .spj-mc{padding:1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:spjin .4s cubic-bezier(.22,1,.36,1) both}
        .spj-mc:last-child{border-bottom:none}
        .spj-mc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;margin-bottom:.55rem}
        .spj-mc-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-top:.6rem}

        /* States */
        .spj-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .spj-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:spjspin .8s linear infinite}
        .spj-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}
        .spj-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .spj-empty-title{font-size:.9rem;font-weight:900;color:#374151}
        .spj-empty-sub{font-size:.78rem;font-weight:600}

        @keyframes spjin{to{opacity:1;transform:translateY(0)}}
        @keyframes spjspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="spj-wrap">

        {/* Header */}
        <div className="spj-header">
          <div className="spj-eyebrow"><div className="spj-dot" />Super Admin</div>
          <h1 className="spj-title">Projets — <span>pilotage global</span></h1>
        </div>

        {/* Stats */}
        <div className="spj-stats">
          {([
            { label: 'Total projets', value: items.length, color: '#DC2626' },
            { label: 'En cours',      value: inProgress,   color: '#059669' },
            { label: 'En attente',    value: pending,      color: '#D97706' },
            { label: 'Termin\u00e9s', value: completed,    color: '#0E7490' },
          ] as const).map(s => (
            <div key={s.label} className="spj-stat" style={{ borderTopColor: s.color }}>
              <div className="spj-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="spj-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Panel */}
        <div className="spj-panel">
          <div className="spj-panel-head">
            <div className="spj-panel-titlerow">
              <div className="spj-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="spj-panel-title">Projets pass&eacute;s, en cours et futurs</span>
              {items.length > 0 && <span className="spj-count-chip">{items.length}</span>}
            </div>
          </div>

          {/* Toolbar */}
          <div className="spj-toolbar">
            <div className="spj-field spj-field-grow">
              <label className="spj-label">Recherche</label>
              <div className="spj-sw">
                <span className="spj-si">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>
                </span>
                <input
                  className="spj-input"
                  type="text"
                  placeholder="Recherche par titre&#8230;"
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void load(q, status)}
                />
              </div>
            </div>

            <div className="spj-field">
              <label className="spj-label">Statut</label>
              <select
                className="spj-select"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="">Tous statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="PENDING_APPROVAL">En attente approbation</option>
                <option value="APPROVED">Approuv&eacute;</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Termin&eacute;</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="CANCELLED">Annul&eacute;</option>
              </select>
            </div>

            <button
              className="spj-filter-btn"
              disabled={loading}
              onClick={() => void load(q, status)}
            >
              {loading
                ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spjspin .7s linear infinite' }} />Chargement&#8230;</>
                : <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>Filtrer</>
              }
            </button>
          </div>

          {/* Quick filter chips */}
          {!loading && items.length > 0 && (
            <div className="spj-chips">
              {(Object.entries(STATUS_MAP) as [ProjectStatus, typeof STATUS_MAP[ProjectStatus]][]).map(([key, s]) => {
                const count = items.filter(p => p.status === key).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    className="spj-chip"
                    style={{ color: s.color, background: s.bg, borderColor: s.border }}
                    onClick={() => { setStatus(key); void load(q, key); }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    {s.label}
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.66rem', fontWeight: 700, marginLeft: '.1rem' }}>{count}</span>
                  </button>
                );
              })}
              {status && (
                <button
                  className="spj-chip"
                  style={{ color: '#6B7280', background: '#F9FAFB', borderColor: '#E5E7EB' }}
                  onClick={() => { setStatus(''); void load(q, ''); }}
                >
                  <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  R&eacute;initialiser
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="spj-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="spj-loader"><div className="spj-ring" />Chargement&#8230;</div>
          ) : !error && items.length === 0 ? (
            <div className="spj-empty">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <div className="spj-empty-title">Aucun projet trouv&eacute;</div>
              <div className="spj-empty-sub">Essayez de modifier la recherche ou le filtre de statut.</div>
            </div>
          ) : !error ? (
            <>
              {/* ── Desktop table ── */}
              <div className="spj-tw">
                <table className="spj-table">
                  <thead>
                    <tr>
                      <th style={thStyle}>Projet</th>
                      <th style={thStyle}>Statut</th>
                      <th style={thStyle}>Budget</th>
                      <th style={thStyle}>D&eacute;but</th>
                      <th style={thStyle}>Fin</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => (
                      <tr key={p.id} style={{ animationDelay: `${i * 0.035}s` }}>
                        <td style={tdStyle}>
                          <div className="spj-project-title">{p.title}</div>
                          {p.description && <div className="spj-project-desc">{p.description}</div>}
                        </td>
                        <td style={tdStyle}><StatusBadge status={p.status} /></td>
                        <td style={tdStyle}><BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} /></td>
                        <td style={tdStyle}>
                          <span className="spj-date">{p.startsAt ? formatDate(p.startsAt) : <span style={{ color: '#D1D5DB' }}>—</span>}</span>
                        </td>
                        <td style={tdStyle}>
                          <span className="spj-date">{p.endsAt ? formatDate(p.endsAt) : <span style={{ color: '#D1D5DB' }}>—</span>}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button
                            className="spj-btn-del"
                            disabled={busyId === p.id}
                            onClick={() => setDeleteTarget(p)}
                          >
                            {busyId === p.id
                              ? <div style={{ width: 11, height: 11, border: '2px solid rgba(220,38,38,.3)', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'spjspin .7s linear infinite' }} />
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
              <div className="spj-mob">
                {items.map((p, i) => (
                  <div key={p.id} className="spj-mc" style={{ animationDelay: `${i * 0.035}s` }}>
                    <div className="spj-mc-top">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="spj-project-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        {p.description && <div className="spj-project-desc">{p.description}</div>}
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} />
                    <div className="spj-mc-footer">
                      <span className="spj-date">
                        {p.startsAt ? formatDate(p.startsAt) : '—'}{p.endsAt ? ` → ${formatDate(p.endsAt)}` : ''}
                      </span>
                      <button className="spj-btn-del" disabled={busyId === p.id} onClick={() => setDeleteTarget(p)}>
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
          project={deleteTarget}
          busy={busyId !== null}
          onConfirm={() => void handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  );
}