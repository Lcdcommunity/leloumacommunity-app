// web/app/(protected)/member/projects/page.tsx
// web/app/(protected)/member/projects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Project } from '../../../../types/project';
import { formatCurrency, formatDate } from '../../../../lib/format';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les projets' },
  { value: 'APPROVED', label: 'Approuvés' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminés' },
  { value: 'SUSPENDED', label: 'Suspendus' },
  { value: 'CANCELLED', label: 'Annulés' },
];

function getStatusCfg(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string; bar: string }> = {
    IN_PROGRESS: { label: 'En cours',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', bar: '#3B82F6' },
    APPROVED:    { label: 'Approuvé',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', bar: '#10B981' },
    COMPLETED:   { label: 'Terminé',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', bar: '#8B5CF6' },
    SUSPENDED:   { label: 'Suspendu',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', bar: '#F59E0B' },
    CANCELLED:   { label: 'Annulé',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', bar: '#EF4444' },
    DRAFT:       { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', bar: '#9CA3AF' },
  };
  return map[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', bar: '#9CA3AF' };
}

function BudgetBar({ planned, spent }: { planned?: number | null; spent?: number | null }) {
  if (!planned || planned === 0) return <span style={{ color: '#CBD5E1', fontSize: '0.72rem' }}>—</span>;
  const pct = Math.min(((spent ?? 0) / planned) * 100, 100);
  const over = (spent ?? 0) > planned;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>
        <span>{formatCurrency(spent ?? 0)}</span>
        <span style={{ color: over ? '#DC2626' : '#94A3B8' }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          width: `${pct}%`,
          background: over ? 'linear-gradient(90deg,#F97316,#DC2626)' : pct > 75 ? '#F59E0B' : '#3B82F6',
          transition: 'width 0.8s cubic-bezier(.22,1,.36,1)',
        }} />
      </div>
      <div style={{ fontSize: '0.62rem', color: '#CBD5E1' }}>/ {formatCurrency(planned)}</div>
    </div>
  );
}

// ─── Project Detail Modal ─────────────────────────────────────────────────────

function ProjectDetailModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const cfg = getStatusCfg(project.status);
  const budgetPct = project.budgetPlanned && project.budgetPlanned > 0
    ? Math.min(((project.budgetSpent ?? 0) / project.budgetPlanned) * 100, 100)
    : 0;
  const budgetOver = (project.budgetSpent ?? 0) > (project.budgetPlanned ?? 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem',
        animation: 'mpmodalin 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 520,
          background: '#fff', borderRadius: 24,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 32px 72px rgba(0,0,0,0.2)',
          animation: 'mpscalein 0.28s cubic-bezier(.22,1,.36,1)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Bande colorée en haut */}
        <div style={{ height: 5, background: cfg.bar }} />

        {/* Header */}
        <div style={{ padding: '1.25rem 1.4rem 1rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.62rem', fontWeight: 700, border: `1px solid ${cfg.border}`,
              color: cfg.color, background: cfg.bg,
              borderRadius: 99, padding: '0.2rem 0.55rem', marginBottom: '0.5rem',
            }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color }} />
              {cfg.label}
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '1.4rem', fontWeight: 600, color: '#111827',
              lineHeight: 1.2, margin: 0,
            }}>
              {project.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: '#F3F4F6', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280',
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 1.4rem 1.5rem', maxHeight: 'calc(90vh - 120px)', overflowY: 'auto' }}>

          {/* Description */}
          {project.description && (
            <div style={{ margin: '1.1rem 0', padding: '0.9rem 1rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem' }}>Description</div>
              <p style={{ fontSize: '0.84rem', color: '#374151', lineHeight: 1.65, margin: 0 }}>{project.description}</p>
            </div>
          )}

          {/* Grid infos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: project.description ? 0 : '1.1rem' }}>

            {/* Dates */}
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem' }}>
                Début
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
                {project.startsAt ? formatDate(project.startsAt) : <span style={{ color: '#D1D5DB', fontFamily: 'inherit' }}>—</span>}
              </div>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem' }}>
                Fin prévue
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
                {project.endsAt ? formatDate(project.endsAt) : <span style={{ color: '#D1D5DB', fontFamily: 'inherit' }}>—</span>}
              </div>
            </div>

            {/* Budget prévu */}
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem' }}>
                Budget prévu
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                {project.budgetPlanned != null ? formatCurrency(project.budgetPlanned) : <span style={{ color: '#D1D5DB', fontFamily: 'inherit' }}>—</span>}
              </div>
            </div>

            {/* Budget dépensé */}
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem' }}>
                Budget dépensé
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: budgetOver ? '#DC2626' : '#111827' }}>
                {project.budgetSpent != null ? formatCurrency(project.budgetSpent) : <span style={{ color: '#D1D5DB', fontFamily: 'inherit' }}>—</span>}
              </div>
            </div>
          </div>

          {/* Barre budget détaillée */}
          {project.budgetPlanned != null && project.budgetPlanned > 0 && (
            <div style={{ marginTop: '0.75rem', background: '#F8FAFC', borderRadius: 12, padding: '0.9rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Avancement budgétaire
                </div>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 800,
                  color: budgetOver ? '#DC2626' : budgetPct > 80 ? '#D97706' : '#059669',
                }}>
                  {Math.round(budgetPct)}%{budgetOver ? ' ⚠ Dépassement' : ''}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${budgetPct}%`,
                  background: budgetOver
                    ? 'linear-gradient(90deg,#F97316,#DC2626)'
                    : budgetPct > 80 ? '#F59E0B' : 'linear-gradient(90deg,#3B82F6,#6366F1)',
                  transition: 'width 0.9s cubic-bezier(.22,1,.36,1)',
                }} />
              </div>
            </div>
          )}

          {/* Dates de création / mise à jour */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>Créé le</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{formatDate(project.createdAt)}</div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>Mis à jour</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{formatDate(project.updatedAt)}</div>
            </div>
          </div>

          {/* Pièces jointes */}
          {project.attachments && project.attachments.length > 0 && (
            <div style={{ marginTop: '0.75rem', background: '#F8FAFC', borderRadius: 12, padding: '0.9rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>
                Pièces jointes ({project.attachments.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {project.attachments.map((att, i) => (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      fontSize: '0.78rem', fontWeight: 600, color: '#2563EB',
                      textDecoration: 'none', padding: '0.4rem 0.7rem',
                      background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE',
                      transition: 'background 0.15s',
                    }}
                  >
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                    </svg>
                    Document {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MemberProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listProjectsForMembers({ page: 1, pageSize: 100 });
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement projets');
      } finally {
        setLoading(false);
      }
    };
    void fetchProjects();
  }, []);

  const handleFilter = async (searchQ: string, searchStatus: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listProjectsForMembers({
        page: 1, pageSize: 100,
        q: searchQ || undefined,
        status: searchStatus || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement projets');
    } finally {
      setLoading(false);
    }
  };

  const inProgress = items.filter(p => p.status === 'IN_PROGRESS').length;
  const completed  = items.filter(p => p.status === 'COMPLETED').length;
  const approved   = items.filter(p => p.status === 'APPROVED').length;

  return (
    <AppShell title="Projets">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        @keyframes mpmodalin { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mpscalein { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }

        .mp-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1200px; margin: 0 auto;
        }

        .mp-header {
          display: flex; justify-content: space-between;
          align-items: flex-end; flex-wrap: wrap; gap: 1rem;
          margin-bottom: 1.75rem;
          opacity: 0; animation: mpin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mp-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .mp-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: mppulse 2s ease-in-out infinite; }
        @keyframes mppulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .mp-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .mp-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .mp-propose-btn {
          display: inline-flex; align-items: center; gap: 0.45rem;
          height: 42px; padding: 0 1.2rem;
          background: linear-gradient(135deg,#1D4ED8,#2563EB);
          color: white; border-radius: 11px; text-decoration: none;
          font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em;
          box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          transition: transform 0.15s, box-shadow 0.2s;
          white-space: nowrap;
        }
        .mp-propose-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(37,99,235,0.38); }

        .mp-summary {
          display: flex; gap: 0.75rem; flex-wrap: wrap;
          margin-bottom: 1.25rem;
          opacity: 0; animation: mpin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mp-chip { display: flex; align-items: center; gap: 0.4rem; padding: 0.42rem 0.85rem; border-radius: 10px; font-size: 0.74rem; font-weight: 600; border: 1px solid; }
        .mp-chip-dot { width: 6px; height: 6px; border-radius: 50%; }
        .mp-chip-count { font-family: 'Cormorant Garamond', serif; font-size: 1rem; font-weight: 600; }

        .mp-toolbar {
          display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;
          margin-bottom: 1.25rem;
          opacity: 0; animation: mpin 0.5s 0.15s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mp-search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 320px; }
        .mp-search-ico { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .mp-search-input {
          width: 100%; height: 40px; padding: 0 0.9rem 0 2.4rem;
          border-radius: 10px; border: 1px solid rgba(37,99,235,0.14);
          background: rgba(255,255,255,0.85); font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem; color: #111827; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .mp-search-input:focus { border-color: rgba(37,99,235,0.45); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); }
        .mp-search-input::placeholder { color: rgba(107,114,128,0.5); }

        .mp-filter-pills { display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .mp-pill {
          height: 34px; padding: 0 0.75rem; border-radius: 99px;
          border: 1.5px solid rgba(37,99,235,0.13);
          background: rgba(255,255,255,0.8); cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.73rem; font-weight: 600; color: #374151;
          transition: all 0.2s; white-space: nowrap;
        }
        .mp-pill:hover { border-color: rgba(37,99,235,0.38); background: #EFF6FF; color: #1D4ED8; }
        .mp-pill.active { background: #EFF6FF; border-color: #2563EB; color: #1D4ED8; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

        .mp-view-toggle { display: flex; gap: 0.3rem; margin-left: auto; }
        .mp-view-btn {
          width: 34px; height: 34px; border-radius: 9px;
          border: 1.5px solid rgba(37,99,235,0.13);
          background: rgba(255,255,255,0.8); cursor: pointer;
          display: flex; align-items: center; justify-content: center; color: #94A3B8;
          transition: all 0.2s;
        }
        .mp-view-btn.active { background: #EFF6FF; border-color: #2563EB; color: #2563EB; }
        .mp-view-btn:hover:not(.active) { background: #F8FAFC; color: #374151; }

        /* ── Grid ── */
        .mp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
          opacity: 0; animation: mpin 0.5s 0.2s cubic-bezier(.22,1,.36,1) forwards;
        }
        @media (max-width: 600px) { .mp-grid { grid-template-columns: 1fr; } }

        .mp-card {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex; flex-direction: column;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .mp-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 32px rgba(37,99,235,0.13), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        .mp-card:hover .mp-card-cta { opacity: 1; transform: translateY(0); }

        .mp-card-accent { height: 3px; }
        .mp-card-body { padding: 1.1rem 1.2rem; flex: 1; display: flex; flex-direction: column; gap: 0.65rem; }

        .mp-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
        .mp-card-title { font-size: 0.9rem; font-weight: 700; color: #111827; line-height: 1.35; flex: 1; }

        .mp-status-badge {
          display: inline-flex; align-items: center; gap: 0.22rem;
          font-size: 0.62rem; font-weight: 700; border-radius: 99px;
          padding: 0.18rem 0.55rem; white-space: nowrap; border: 1px solid; flex-shrink: 0;
        }
        .mp-status-dot { width: 4px; height: 4px; border-radius: 50%; }
        .mp-card-dates { font-size: 0.72rem; color: #9CA3AF; display: flex; align-items: center; gap: 0.35rem; }
        .mp-card-budget { margin-top: auto; }

        /* CTA hint */
        .mp-card-cta {
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          padding: 0.6rem;
          font-size: 0.72rem; font-weight: 700; color: #2563EB;
          border-top: 1px solid rgba(37,99,235,0.08);
          background: rgba(239,246,255,0.5);
          opacity: 0; transform: translateY(4px);
          transition: opacity 0.2s, transform 0.2s;
        }

        /* ── List ── */
        .mp-list {
          display: flex; flex-direction: column; gap: 0;
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(10px);
          border-radius: 18px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; animation: mpin 0.5s 0.2s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mp-list-head {
          display: grid;
          grid-template-columns: 1fr 110px 120px 140px 140px 36px;
          padding: 0.7rem 1.2rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
        }
        .mp-list-head span { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #9CA3AF; }
        .mp-list-row {
          display: grid;
          grid-template-columns: 1fr 110px 120px 140px 140px 36px;
          padding: 0.85rem 1.2rem;
          border-bottom: 1px solid rgba(37,99,235,0.05);
          align-items: center;
          transition: background 0.15s;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .mp-list-row:last-child { border-bottom: none; }
        .mp-list-row:hover { background: rgba(37,99,235,0.03); }
        @media (max-width: 768px) {
          .mp-list-head { display: none; }
          .mp-list-row { grid-template-columns: 1fr auto; gap: 0.5rem; }
          .mp-list-row > *:nth-child(3),
          .mp-list-row > *:nth-child(4),
          .mp-list-row > *:nth-child(5) { display: none; }
        }
        .mp-list-title { font-size: 0.83rem; font-weight: 700; color: #111827; }
        .mp-list-sub { font-size: 0.7rem; color: #9CA3AF; margin-top: 2px; }
        .mp-chevron { color: #D1D5DB; display: flex; align-items: center; justify-content: flex-end; }

        /* ── States ── */
        .mp-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; gap: 0.75rem; color: #9CA3AF; }
        .mp-empty-ico { width: 52px; height: 52px; border-radius: 50%; background: #F9FAFB; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; }
        .mp-empty p { font-size: 0.82rem; font-weight: 500; }
        .mp-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; }
        .mp-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: mpspin 0.8s linear infinite; }
        @keyframes mpspin { to { transform: rotate(360deg); } }
        .mp-error { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.3rem; color: #B91C1C; font-size: 0.8rem; }

        @keyframes mpin { to { opacity: 1; transform: translateY(0); } }
        .mp-header, .mp-summary, .mp-toolbar { transform: translateY(10px); }
      `}</style>

      <div className="mp-wrap">

        {/* Header */}
        <div className="mp-header">
          <div>
            <div className="mp-eyebrow"><div className="mp-eyebrow-dot" />Espace membre</div>
            <h1 className="mp-title">Projets de <span>l&apos;association</span></h1>
          </div>
          <Link href="/member/projects/propose" className="mp-propose-btn">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Proposer un projet
          </Link>
        </div>

        {/* Summary */}
        <div className="mp-summary">
          {[
            { label: 'Total',     count: items.length, color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'En cours',  count: inProgress,   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
            { label: 'Approuvés', count: approved,     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
            { label: 'Terminés',  count: completed,    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
          ].map(c => (
            <div key={c.label} className="mp-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }}>
              <span className="mp-chip-dot" style={{ background: c.color }} />
              <span className="mp-chip-count">{c.count}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="mp-toolbar">
          <div className="mp-search-wrap">
            <span className="mp-search-ico">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            </span>
            <input
              className="mp-search-input"
              placeholder="Rechercher un projet…"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void handleFilter(q, status)}
            />
          </div>

          <div className="mp-filter-pills">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`mp-pill${status === opt.value ? ' active' : ''}`}
                onClick={() => { setStatus(opt.value); void handleFilter(q, opt.value); }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mp-view-toggle">
            <button className={`mp-view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Vue grille">
              <svg width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1V2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V2zM1 7a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1V7zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V7zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V7zM1 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1v-2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z"/>
              </svg>
            </button>
            <button className={`mp-view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="Vue liste">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="mp-loader"><div className="mp-ring" />Chargement…</div>
        ) : error ? (
          <div className="mp-error">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mp-empty">
            <div className="mp-empty-ico">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                <path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <p>Aucun projet trouvé</p>
          </div>
        ) : view === 'grid' ? (

          /* ── GRID VIEW ── */
          <div className="mp-grid">
            {items.map((p, i) => {
              const cfg = getStatusCfg(p.status);
              return (
                <div
                  key={p.id}
                  className="mp-card"
                  style={{ animationDelay: `${0.04 * i}s` }}
                  onClick={() => setSelectedProject(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedProject(p)}
                  aria-label={`Voir les détails de ${p.title}`}
                >
                  <div className="mp-card-accent" style={{ background: cfg.bar }} />
                  <div className="mp-card-body">
                    <div className="mp-card-top">
                      <div className="mp-card-title">{p.title}</div>
                      <div className="mp-status-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                        <span className="mp-status-dot" style={{ background: cfg.color }} />
                        {cfg.label}
                      </div>
                    </div>

                    {p.description && (
                      <p style={{ fontSize: '0.76rem', color: '#6B7280', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {p.description}
                      </p>
                    )}

                    {(p.startsAt || p.endsAt) && (
                      <div className="mp-card-dates">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {formatDate(p.startsAt)}
                        {p.endsAt && <> → {formatDate(p.endsAt)}</>}
                      </div>
                    )}

                    <div className="mp-card-budget">
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>Budget utilisé</div>
                      <BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} />
                    </div>
                  </div>
                  <div className="mp-card-cta">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Voir les détails
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ── LIST VIEW ── */
          <div className="mp-list">
            <div className="mp-list-head">
              <span>Projet</span>
              <span>Statut</span>
              <span>Budget prévu</span>
              <span>Budget dépensé</span>
              <span>Dates</span>
              <span></span>
            </div>
            {items.map(p => {
              const cfg = getStatusCfg(p.status);
              return (
                <div
                  key={p.id}
                  className="mp-list-row"
                  onClick={() => setSelectedProject(p)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelectedProject(p)}
                >
                  <div>
                    <div className="mp-list-title">{p.title}</div>
                    {p.description && (
                      <div className="mp-list-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                        {p.description}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mp-status-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border, display: 'inline-flex' }}>
                      <span className="mp-status-dot" style={{ background: cfg.color }} />
                      {cfg.label}
                    </div>
                  </div>
                  <div style={{ color: '#374151', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '0.95rem' }}>
                    {p.budgetPlanned != null ? formatCurrency(p.budgetPlanned) : '—'}
                  </div>
                  <div>
                    <BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} />
                  </div>
                  <div className="mp-card-dates" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {formatDate(p.startsAt)}{p.endsAt ? ` → ${formatDate(p.endsAt)}` : ''}
                  </div>
                  <div className="mp-chevron">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale détail projet */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </AppShell>
  );
}