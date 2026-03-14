// web/app/(protected)/admin/projects/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef, DragEvent } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Project, ProjectStatus } from '../../../../types/project';
import { formatCurrency, formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ STATUS MAP */
const PROJ_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:            { label: 'Brouillon',     color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  PENDING_APPROVAL: { label: 'En attente',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  APPROVED:         { label: 'Approuv\u00e9',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  IN_PROGRESS:      { label: 'En cours',      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  COMPLETED:        { label: 'Termin\u00e9',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  SUSPENDED:        { label: 'Suspendu',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  CANCELLED:        { label: 'Annul\u00e9',    color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

const STATUS_FORM_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'DRAFT',            label: 'Brouillon' },
  { value: 'PENDING_APPROVAL', label: "En attente d\u2019approbation" },
  { value: 'APPROVED',         label: 'Approuv\u00e9' },
  { value: 'IN_PROGRESS',      label: 'En cours' },
  { value: 'COMPLETED',        label: 'Termin\u00e9' },
  { value: 'SUSPENDED',        label: 'Suspendu' },
  { value: 'CANCELLED',        label: 'Annul\u00e9' },
];

const STATUS_LIST_OPTIONS = [
  { value: '',            label: 'Tous les statuts' },
  { value: 'DRAFT',       label: 'Brouillon' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED',   label: 'Termin\u00e9' },
];

/* ══════════════════════════════════════════════════════ STATUS BADGE */
function StatusBadge({ status }: { status: string }) {
  const s = PROJ_STATUS_MAP[status] ?? PROJ_STATUS_MAP['DRAFT'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.28rem', fontSize: '.67rem', fontWeight: 900, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.2rem .6rem', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />{s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ BUDGET BAR */
function BudgetBar({ planned, spent }: { planned?: number | null; spent?: number | null }) {
  if (!planned) return <span style={{ color: '#D1D5DB', fontWeight: 700 }}>—</span>;
  const pct  = Math.min(100, Math.round(((spent ?? 0) / planned) * 100));
  const over = (spent ?? 0) > planned;
  const col  = over ? '#DC2626' : pct > 80 ? '#D97706' : '#2563EB';
  return (
    <div style={{ minWidth: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.22rem', gap: '.4rem' }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.7rem', fontWeight: 700, color: col }}>{pct}%</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.65rem', color: '#9CA3AF', fontWeight: 600 }}>{formatCurrency(planned)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width .5s ease' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PROJECT DETAIL DRAWER */
type Attachment = { url: string; fileName?: string; mimeType?: string | null; sizeBytes?: number | null };

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '.75rem', padding: '.7rem 0', borderBottom: '1px solid rgba(37,99,235,.06)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(37,99,235,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#2563EB' }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.63rem', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.2rem' }}>{label}</div>
        <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.5, wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
}

function formatBytes(b?: number | null): string {
  if (!b) return '';
  if (b < 1024) return `${b}\u00a0o`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}\u00a0Ko`;
  return `${(b / (1024 * 1024)).toFixed(1)}\u00a0Mo`;
}

function ProjectDrawer({ project, onClose, onEdit }: { project: Project; onClose: () => void; onEdit: () => void }) {
  const s   = PROJ_STATUS_MAP[project.status] ?? PROJ_STATUS_MAP['DRAFT'];
  // Project.attachments only carries { id, url } — no mimeType in the API response.
  // Treat every attachment as a photo; the docs array stays empty.
  const attachments = (project.attachments ?? []) as Attachment[];
  const images      = attachments; // all treated as images
  const docs: Attachment[] = [];

  const pct  = project.budgetPlanned
    ? Math.min(100, Math.round(((project.budgetSpent ?? 0) / project.budgetPlanned) * 100))
    : 0;
  const over = (project.budgetSpent ?? 0) > (project.budgetPlanned ?? 0);
  const budgetCol = over ? '#DC2626' : pct > 80 ? '#D97706' : '#2563EB';

  // extract promoter from description if prefixed
  let description = project.description ?? '';
  let promoter    = (project as unknown as { promoter?: string }).promoter ?? '';
  if (!promoter && description.startsWith('**Promoteur')) {
    const m = description.match(/\*\*Promoteur[^:]*:\*\*\s*([^\n]+)\n/);
    if (m) { promoter = m[1].trim(); description = description.replace(m[0], '').trim(); }
  }
  const locationText = (project as unknown as { locationText?: string }).locationText ?? '';

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', backdropFilter: 'blur(3px)', zIndex: 300 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 301,
        width: 'min(480px, 100vw)',
        background: 'rgba(253,253,255,.98)',
        backdropFilter: 'blur(20px)',
        boxShadow: '-8px 0 40px rgba(15,23,42,.18)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        animation: 'drawerIn .3s cubic-bezier(.22,1,.36,1)',
      }}>

        {/* Drawer header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 1, background: 'rgba(253,253,255,.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(37,99,235,.09)', padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem', flexWrap: 'wrap' }}>
              <StatusBadge status={project.status} />
              {locationText && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.22rem', fontSize: '.67rem', fontWeight: 700, color: '#6B7280' }}>
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {locationText}
                </span>
              )}
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(1.2rem,3vw,1.55rem)', fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>{project.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
            <button
              onClick={onEdit}
              style={{ height: 34, padding: '0 .85rem', borderRadius: 9, background: '#EFF6FF', border: '1.5px solid rgba(37,99,235,.18)', color: '#1D4ED8', fontFamily: "'DM Sans',sans-serif", fontSize: '.76rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.3rem' }}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Modifier
            </button>
            <button
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: 9, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Photo gallery */}
        {images.length > 0 && (
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(37,99,235,.08)' }}>
            <div style={{ fontSize: '.65rem', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.65rem', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
              Galerie photos ({images.length})
            </div>
            {/* Featured image */}
            <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: '.5rem', border: '1px solid rgba(37,99,235,.1)', aspectRatio: '16/9', background: '#F8FAFC' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- remote asset URL from API */}
              <img src={images[0].url} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(images.length - 1, 4)}, 1fr)`, gap: '.4rem' }}>
                {images.slice(1, 5).map((img, idx) => (
                  <div key={idx} style={{ aspectRatio: '1', borderRadius: 9, overflow: 'hidden', border: '1px solid rgba(37,99,235,.1)', background: '#F8FAFC', position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote asset URL from API */}
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {idx === 3 && images.length > 5 && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'DM Mono',monospace", fontSize: '.88rem', fontWeight: 700 }}>
                        +{images.length - 5}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detail rows */}
        <div style={{ padding: '0 1.25rem', flex: 1 }}>

          {description && (
            <DetailRow
              icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
              label="Description"
              value={<span style={{ whiteSpace: 'pre-wrap', fontSize: '.84rem', fontWeight: 600, color: '#374151' }}>{description}</span>}
            />
          )}

          {promoter && (
            <DetailRow
              icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              label="Promoteur"
              value={promoter}
            />
          )}

          {locationText && (
            <DetailRow
              icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              label="Localisation"
              value={locationText}
            />
          )}

          <DetailRow
            icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Statut"
            value={<StatusBadge status={project.status} />}
          />

          <DetailRow
            icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            label="P\u00e9riode"
            value={
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.84rem' }}>
                {project.startsAt ? formatDate(project.startsAt) : '—'}&nbsp;&nbsp;&rarr;&nbsp;&nbsp;{project.endsAt ? formatDate(project.endsAt) : '—'}
              </span>
            }
          />

          {project.budgetPlanned ? (
            <DetailRow
              icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label="Budget"
              value={
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', flexWrap: 'wrap', gap: '.5rem' }}>
                    <div>
                      <span style={{ fontSize: '.68rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>Pr\u00e9vu&nbsp;</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: '#0F172A' }}>{formatCurrency(project.budgetPlanned)}</span>
                    </div>
                    {project.budgetSpent != null && (
                      <div>
                        <span style={{ fontSize: '.68rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>D\u00e9pens\u00e9&nbsp;</span>
                        <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: budgetCol }}>{formatCurrency(project.budgetSpent)}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: budgetCol, borderRadius: 99 }} />
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '.2rem', fontFamily: "'DM Mono',monospace", fontSize: '.68rem', fontWeight: 700, color: budgetCol }}>{pct}% utilis\u00e9{over ? ' \u2014 D\u00e9passement !' : ''}</div>
                </div>
              }
            />
          ) : (
            <DetailRow
              icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              label="Budget"
              value={<span style={{ color: '#D1D5DB' }}>Non d\u00e9fini</span>}
            />
          )}

          <DetailRow
            icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Cr\u00e9\u00e9 le"
            value={<span style={{ fontFamily: "'DM Mono',monospace" }}>{formatDate(project.createdAt)}</span>}
          />

          <DetailRow
            icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            label="Modifi\u00e9 le"
            value={<span style={{ fontFamily: "'DM Mono',monospace" }}>{formatDate(project.updatedAt)}</span>}
          />

          {/* Documents / non-image attachments */}
          {docs.length > 0 && (
            <DetailRow
              icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
              label="Pi\u00e8ces jointes"
              value={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                  {docs.map((d, idx) => (
                    <a key={idx} href={d.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.78rem', fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      {d.fileName ?? 'T\u00e9l\u00e9charger'}
                      {d.sizeBytes && <span style={{ color: '#9CA3AF', fontWeight: 600 }}>({formatBytes(d.sizeBytes)})</span>}
                    </a>
                  ))}
                </div>
              }
            />
          )}

          {/* ID technique (small, collapsible feel) */}
          <div style={{ padding: '.65rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '.62rem', fontWeight: 800, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '.08em' }}>ID projet</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.68rem', fontWeight: 600, color: '#D1D5DB' }}>{project.id}</span>
          </div>
        </div>

        {/* Sticky bottom status bar */}
        <div style={{ position: 'sticky', bottom: 0, background: 'rgba(253,253,255,.97)', borderTop: '1px solid rgba(37,99,235,.08)', padding: '.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
            <span style={{ fontSize: '.76rem', fontWeight: 800, color: '#374151' }}>{s.label}</span>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.72rem', fontWeight: 600, color: '#9CA3AF' }}>
            {attachments.length} fichier{attachments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ DELETE MODAL */
function DeleteModal({ project, onConfirm, onCancel, busy }: { project: Project; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 400 }} onClick={onCancel} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 401, background: 'rgba(255,255,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(430px,calc(100vw - 2rem))', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(15,23,42,.18)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .9rem' }}>
          <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.25rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.35rem' }}>Supprimer ce projet&nbsp;?</h2>
        <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.4rem', fontWeight: 600, lineHeight: 1.55 }}>
          <strong style={{ color: '#111827' }}>{project.title}</strong> sera supprim&eacute; d&eacute;finitivement.
        </p>
        <div style={{ display: 'flex', gap: '.55rem', justifyContent: 'center' }}>
          <button onClick={onCancel} disabled={busy} style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirm} disabled={busy} style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.3)', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            {busy && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} />}
            Supprimer
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PHOTO DROP ZONE */
const MAX_PHOTOS = 5;
const ACCEPT     = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_MB     = 5;
interface PhotoFile { file: File; preview: string; id: string }

function PhotoDropZone({ photos, onChange }: { photos: PhotoFile[]; onChange: (p: PhotoFile[]) => void }) {
  const inputRef        = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err,  setErr]  = useState<string | null>(null);

  function addFiles(files: FileList | File[]) {
    setErr(null);
    const arr = Array.from(files); const valid: PhotoFile[] = [];
    for (const f of arr) {
      if (!ACCEPT.includes(f.type))                  { setErr('Format non accept\u00e9 (PNG, JPG, WEBP).'); continue; }
      if (f.size > MAX_MB * 1024 * 1024)             { setErr(`Fichier trop lourd \u2014 max ${MAX_MB}\u00a0Mo.`); continue; }
      if (photos.length + valid.length >= MAX_PHOTOS) { setErr(`Maximum ${MAX_PHOTOS} photos.`); break; }
      valid.push({ file: f, preview: URL.createObjectURL(f), id: `${f.name}-${f.size}-${Date.now()}` });
    }
    if (valid.length) onChange([...photos, ...valid]);
  }

  function remove(id: string) {
    const p = photos.find(x => x.id === id);
    if (p) URL.revokeObjectURL(p.preview);
    onChange(photos.filter(x => x.id !== id));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }

  const remaining = MAX_PHOTOS - photos.length;
  const full      = photos.length >= MAX_PHOTOS;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(37,99,235,.3)' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
          </div>
          <span style={{ fontSize: '.78rem', fontWeight: 900, color: '#1F2937', letterSpacing: '.04em', textTransform: 'uppercase' }}>Galerie photos</span>
        </div>
        <span style={{ fontSize: '.7rem', fontWeight: 800, color: photos.length > 0 ? '#2563EB' : '#9CA3AF', background: photos.length > 0 ? '#EFF6FF' : '#F3F4F6', border: `1px solid ${photos.length > 0 ? '#BFDBFE' : '#E5E7EB'}`, borderRadius: 99, padding: '.18rem .55rem', fontFamily: "'DM Mono',monospace" }}>
          {photos.length}&thinsp;/&thinsp;{MAX_PHOTOS}
        </span>
      </div>
      {!full && (
        <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${drag ? '#2563EB' : 'rgba(37,99,235,.22)'}`, borderRadius: 14, padding: '1.4rem 1rem', textAlign: 'center', cursor: 'pointer', background: drag ? 'rgba(239,246,255,.7)' : 'rgba(239,246,255,.3)', transition: 'all .18s', marginBottom: '.75rem', userSelect: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,99,235,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .7rem', border: '1px solid rgba(37,99,235,.14)' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <p style={{ margin: '0 0 .3rem', fontSize: '.82rem', fontWeight: 800, color: '#1D4ED8' }}>Cliquez ou glissez vos photos</p>
          <p style={{ margin: 0, fontSize: '.72rem', fontWeight: 600, color: '#9CA3AF' }}>PNG, JPG, WEBP &mdash; max&nbsp;{MAX_MB}&nbsp;Mo &mdash; {remaining}&nbsp;emplacement{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}</p>
          <input ref={inputRef} type="file" accept={ACCEPT.join(',')} multiple hidden onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
        </div>
      )}
      {err && <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.55rem .8rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, marginBottom: '.6rem', fontSize: '.75rem', fontWeight: 700, color: '#B91C1C' }}><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>{err}</div>}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: '.5rem' }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(37,99,235,.15)', background: '#F8FAFC' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URL */}
              <img src={p.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={e => { e.stopPropagation(); remove(p.id); }} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(15,23,42,.65)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {!full && (
            <div onClick={() => inputRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 10, border: '2px dashed rgba(37,99,235,.2)', background: 'rgba(239,246,255,.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '.2rem' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#93C5FD" strokeWidth="2"><path strokeLinecap="round" d="M12 4v16m8-8H4" /></svg>
              <span style={{ fontSize: '.6rem', fontWeight: 800, color: '#93C5FD' }}>Ajouter</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ INLINE FORM */
const LS: React.CSSProperties = { fontSize: '.7rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.32rem', display: 'block' };
const IS: React.CSSProperties = { width: '100%', height: 40, borderRadius: 11, border: '1px solid rgba(37,99,235,.15)', background: 'rgba(255,255,255,.88)', padding: '0 .9rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, color: '#111827', outline: 'none', boxSizing: 'border-box' };
const TA: React.CSSProperties = { width: '100%', borderRadius: 11, border: '1px solid rgba(37,99,235,.15)', background: 'rgba(255,255,255,.88)', padding: '.75rem .9rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' };
const SS: React.CSSProperties = { ...IS, appearance: 'none', cursor: 'pointer', backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right .75rem center', paddingRight: '2.2rem' };

interface FormValues { title: string; description: string; location: string; promoter: string; status: ProjectStatus; budgetPlanned: string; budgetSpent: string; startsAt: string; endsAt: string; }
const EMPTY: FormValues = { title: '', description: '', location: '', promoter: '', status: 'DRAFT', budgetPlanned: '', budgetSpent: '', startsAt: '', endsAt: '' };

function ProjectForm({ initial, onSave, onCancel, submitting, submitLabel, uploadProgress }: {
  initial?: FormValues; onSave: (v: FormValues, p: File[]) => void; onCancel: () => void;
  submitting: boolean; submitLabel: string; uploadProgress: string | null;
}) {
  const [v, setV]           = useState<FormValues>(initial ?? EMPTY);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const f = (k: keyof FormValues) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV(p => ({ ...p, [k]: e.target.value })) });
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(v, photos.map(p => p.file)); }}>
      <div style={{ display: 'grid', gap: '.85rem' }}>
        <div><label style={LS}>Titre <span style={{ color: '#EF4444' }}>*</span></label><input style={IS} placeholder="Nom du projet" required {...f('title')} /></div>
        <div><label style={LS}>Statut</label>
          <select style={SS} value={v.status} onChange={e => setV(p => ({ ...p, status: e.target.value as ProjectStatus }))}>
            {STATUS_FORM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
          <div><label style={LS}>Localisation</label><input style={IS} placeholder="Ville, r\u00e9gion\u2026" {...f('location')} /></div>
          <div><label style={LS}>Promoteur</label><input style={IS} placeholder="Nom du porteur" {...f('promoter')} /></div>
        </div>
        <div><label style={LS}>Description</label><textarea style={TA} placeholder="D\u00e9crivez le projet\u2026" {...f('description')} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
          <div><label style={LS}>Budget pr\u00e9vu (GNF)</label><input style={IS} type="number" min="0" placeholder="0" {...f('budgetPlanned')} /></div>
          <div><label style={LS}>Budget d\u00e9pens\u00e9 (GNF)</label><input style={IS} type="number" min="0" placeholder="0" {...f('budgetSpent')} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
          <div><label style={LS}>D\u00e9but</label><input style={IS} type="date" {...f('startsAt')} /></div>
          <div><label style={LS}>Fin</label><input style={IS} type="date" {...f('endsAt')} /></div>
        </div>
        <div style={{ borderTop: '1px solid rgba(37,99,235,.08)' }} />
        <PhotoDropZone photos={photos} onChange={setPhotos} />
        <div style={{ borderTop: '1px solid rgba(37,99,235,.08)' }} />
        {uploadProgress && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', padding: '.65rem .9rem', background: 'rgba(239,246,255,.8)', border: '1px solid rgba(37,99,235,.18)', borderRadius: 10, fontSize: '.78rem', fontWeight: 700, color: '#1D4ED8' }}>
            <div style={{ width: 14, height: 14, border: '2px solid rgba(37,99,235,.2)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'ppspin .7s linear infinite', flexShrink: 0 }} />{uploadProgress}
          </div>
        )}
        <div style={{ display: 'flex', gap: '.55rem' }}>
          <button type="button" onClick={onCancel} disabled={submitting} style={{ flex: 1, height: 44, borderRadius: 11, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 700, color: '#374151', cursor: 'pointer', opacity: submitting ? .5 : 1 }}>Annuler</button>
          <button type="submit" disabled={submitting} style={{ flex: 2, height: 44, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', fontWeight: 900, color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', boxShadow: '0 4px 14px rgba(37,99,235,.3)', opacity: submitting ? .7 : 1 }}>
            {submitting ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} />Enregistrement&#8230;</> : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>{submitLabel}</>}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
type FormMode = 'hidden' | 'create' | 'edit';

export default function AdminProjectsPage() {
  const [items,          setItems]          = useState<Project[]>([]);
  const [q,              setQ]              = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [formMode,       setFormMode]       = useState<FormMode>('hidden');
  const [editing,        setEditing]        = useState<Project | null>(null);
  const [detailProject,  setDetailProject]  = useState<Project | null>(null);
  const [busyId,         setBusyId]         = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [submitting,     setSubmitting]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Project | null>(null);
  const [saveError,      setSaveError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listAntennaProjects({ page: 1, pageSize: 100, q: q || undefined, status: statusFilter || undefined });
      setItems(res?.items ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement projets');
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  function openCreate() { setEditing(null); setSaveError(null); setFormMode('create'); setDetailProject(null); }
  function openEdit(p: Project) { setEditing(p); setSaveError(null); setFormMode('edit'); setDetailProject(null); }
  function closeForm() { setFormMode('hidden'); setEditing(null); setSaveError(null); }

  async function handleSave(values: FormValues, photos: File[]) {
    setSaveError(null); setSubmitting(true);
    try {
      const photoIds: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setUploadProgress(`Upload photo ${i + 1}\u202f/\u202f${photos.length}\u2026`);
        const up = await api.uploadFile(photos[i], { category: 'PROJECT_IMAGE', folder: 'projects' });
        photoIds.push(up.id);
      }
      setUploadProgress('Finalisation\u2026');
      let desc = values.description || '';
      if (values.promoter) desc = `**Promoteur\u00a0:** ${values.promoter}\n\n${desc}`;
      const payload = {
        title: values.title, description: desc || undefined,
        locationText: values.location || undefined, status: values.status,
        budgetPlanned: values.budgetPlanned ? Number(values.budgetPlanned) : undefined,
        budgetSpent:   values.budgetSpent   ? Number(values.budgetSpent)   : undefined,
        startsAt: values.startsAt || null, endsAt: values.endsAt || null,
        ...(photoIds.length > 0 && { photoIds }),
      };
      if (editing) {
        await api.updateAntennaProject(editing.id, payload as Parameters<typeof api.updateAntennaProject>[1]);
      } else {
        await api.createAntennaProject(payload as Parameters<typeof api.createAntennaProject>[0]);
      }
      closeForm(); await load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur enregistrement');
    } finally {
      setSubmitting(false); setUploadProgress(null);
    }
  }

  async function handleDelete(project: Project) {
    setBusyId(project.id); setDeleteTarget(null);
    try {
      await api.deleteAntennaProject(project.id);
      if (editing?.id === project.id) closeForm();
      if (detailProject?.id === project.id) setDetailProject(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setBusyId(null);
    }
  }

  const editingInitial: FormValues | undefined = editing ? {
    title: editing.title, description: editing.description ?? '',
    location: (editing as unknown as { locationText?: string }).locationText ?? '',
    promoter: '',  status: editing.status,
    budgetPlanned: editing.budgetPlanned?.toString() ?? '',
    budgetSpent:   editing.budgetSpent?.toString()   ?? '',
    startsAt: editing.startsAt ? new Date(editing.startsAt).toISOString().slice(0, 10) : '',
    endsAt:   editing.endsAt   ? new Date(editing.endsAt).toISOString().slice(0, 10)   : '',
  } : undefined;

  const draftCount      = items.filter(i => i.status === 'DRAFT').length;
  const inProgressCount = items.filter(i => i.status === 'IN_PROGRESS').length;
  const completedCount  = items.filter(i => i.status === 'COMPLETED').length;
  const formOpen        = formMode !== 'hidden';

  const thStyle: React.CSSProperties = { padding: '.7rem 1.1rem', fontSize: '.63rem', fontWeight: 900, letterSpacing: '.11em', textTransform: 'uppercase', color: '#374151', background: 'rgba(37,99,235,.025)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid rgba(37,99,235,.08)' };

  return (
    <AppShell title="Projets de l'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .pp-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.1rem,3vw,2rem);max-width:1100px;margin:0 auto}
        .pp-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:ppin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .pp-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.3rem;display:flex;align-items:center;gap:.4rem}
        .pp-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:pppulse 2s ease-in-out infinite}
        @keyframes pppulse{0%,100%{opacity:1}50%{opacity:.3}}
        .pp-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.4rem,3vw,1.85rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .pp-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .pp-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 16px rgba(37,99,235,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:ppin .5s .09s cubic-bezier(.22,1,.36,1) forwards}
        .pp-panel-head{padding:.9rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .pp-panel-titlerow{display:flex;align-items:center;gap:.5rem}
        .pp-panel-ico{width:27px;height:27px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pp-panel-title{font-size:.73rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .pp-count-chip{font-size:.67rem;font-weight:900;padding:.2rem .58rem;border-radius:99px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}

        .pp-new-btn{height:36px;padding:0 1rem;border-radius:10px;background:linear-gradient(135deg,#1D4ED8,#2563EB);border:none;color:white;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:.4rem;box-shadow:0 3px 10px rgba(37,99,235,.3);transition:all .18s;white-space:nowrap}
        .pp-new-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(37,99,235,.4)}
        .pp-new-btn.open{background:rgba(37,99,235,.08);color:#1D4ED8;border:1.5px solid rgba(37,99,235,.2);box-shadow:none}

        .pp-form-panel{overflow:hidden;transition:max-height .35s cubic-bezier(.22,1,.36,1),opacity .25s ease;max-height:0;opacity:0}
        .pp-form-panel.open{max-height:2000px;opacity:1}
        .pp-form-inner{padding:1.2rem;border-bottom:1px solid rgba(37,99,235,.07);background:rgba(239,246,255,.18)}
        @media(max-width:560px){.pp-form-inner{padding:.9rem}}
        .pp-edit-banner{display:flex;align-items:center;gap:.4rem;font-size:.72rem;font-weight:800;color:#2563EB;margin-bottom:.7rem;padding:.5rem .75rem;background:rgba(239,246,255,.9);border:1px solid rgba(37,99,235,.2);border-radius:9px}
        .pp-edit-dot{width:6px;height:6px;border-radius:50%;background:#2563EB;animation:pppulse 1.5s infinite;flex-shrink:0}
        .pp-save-err{display:flex;align-items:center;gap:.5rem;padding:.65rem .85rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:9px;color:#B91C1C;font-size:.78rem;font-weight:800;margin-bottom:.7rem}
        .pp-form-inner input:focus,.pp-form-inner textarea:focus,.pp-form-inner select:focus{border-color:rgba(37,99,235,.4)!important;box-shadow:0 0 0 3px rgba(37,99,235,.08)!important;background:white!important}

        .pp-chips{display:flex;gap:.5rem;flex-wrap:wrap;padding:.7rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);background:rgba(239,246,255,.12)}
        .pp-chip{display:inline-flex;align-items:center;gap:.32rem;padding:.28rem .65rem;border-radius:9px;font-size:.7rem;font-weight:700;border:1px solid}
        .pp-chip-dot{width:5px;height:5px;border-radius:50%}
        .pp-chip-num{font-family:'Cormorant Garamond',serif;font-size:.95rem;font-weight:700}

        .pp-filter-row{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;padding:.8rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07)}
        .pp-finput{height:36px;border-radius:9px;border:1px solid rgba(37,99,235,.14);padding:0 .8rem;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:600;color:#111827;outline:none;flex:1;min-width:130px;background:rgba(255,255,255,.88);transition:border-color .2s,box-shadow .2s}
        .pp-finput:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08)}
        .pp-finput::placeholder{color:rgba(107,114,128,.4);font-weight:400}
        .pp-fselect{height:36px;border-radius:9px;border:1px solid rgba(37,99,235,.14);background:rgba(255,255,255,.88);padding:0 1.8rem 0 .7rem;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:700;color:#111827;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .55rem center}
        .pp-fselect:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08);outline:none}
        .pp-reload-btn{height:36px;padding:0 .85rem;background:rgba(239,246,255,.8);border:1.5px solid rgba(37,99,235,.18);border-radius:9px;cursor:pointer;color:#1D4ED8;font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:800;display:flex;align-items:center;gap:.32rem;transition:all .18s;white-space:nowrap}
        .pp-reload-btn:hover{background:#DBEAFE;border-color:#2563EB;transform:translateY(-1px)}

        /* Clickable row */
        .pp-tw{overflow-x:auto}
        .pp-table{width:100%;border-collapse:collapse;min-width:480px}
        .pp-table thead tr th{cursor:default}
        .pp-table tbody tr{border-bottom:1px solid rgba(37,99,235,.04);transition:background .15s;animation:ppin .38s cubic-bezier(.22,1,.36,1) both;cursor:pointer}
        .pp-table tbody tr:last-child{border-bottom:none}
        .pp-table tbody tr:hover{background:rgba(239,246,255,.55)}
        .pp-table tbody tr:hover .pp-proj-title{color:#1D4ED8}
        .pp-table tbody tr.pp-editing-row{background:rgba(239,246,255,.6)!important;box-shadow:inset 3px 0 0 #2563EB}
        .pp-td{padding:.85rem 1.1rem;font-size:.84rem;color:#111827;vertical-align:middle}
        .pp-proj-title{font-weight:900;font-size:.88rem;color:#0F172A;margin-bottom:.18rem;transition:color .15s}
        .pp-proj-dates{font-family:'DM Mono',monospace;font-size:.68rem;font-weight:600;color:#9CA3AF}
        .pp-hint{display:inline-flex;align-items:center;gap:.22rem;font-size:.67rem;font-weight:700;color:#93C5FD;margin-top:.18rem}

        .pp-btn-edit{height:28px;padding:0 .65rem;border-radius:7px;background:#EFF6FF;border:1.5px solid rgba(37,99,235,.18);color:#1D4ED8;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:.22rem;transition:all .15s;white-space:nowrap}
        .pp-btn-edit:hover{background:#DBEAFE;border-color:#2563EB;transform:translateY(-1px)}
        .pp-btn-del{height:28px;padding:0 .65rem;border-radius:7px;background:rgba(254,242,242,.7);border:1.5px solid rgba(220,38,38,.18);color:#DC2626;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:.22rem;transition:all .15s;white-space:nowrap}
        .pp-btn-del:hover:not(:disabled){background:#FEE2E2;border-color:rgba(220,38,38,.4);transform:translateY(-1px)}
        .pp-btn-del:disabled{opacity:.45;cursor:not-allowed}

        /* Mobile cards */
        .pp-mob{display:none;flex-direction:column}
        @media(max-width:600px){.pp-tw{display:none}.pp-mob{display:flex}}
        .pp-mc{padding:.9rem 1.1rem;border-bottom:1px solid rgba(37,99,235,.06);animation:ppin .38s cubic-bezier(.22,1,.36,1) both;cursor:pointer;transition:background .15s}
        .pp-mc:last-child{border-bottom:none}
        .pp-mc:hover{background:rgba(239,246,255,.55)}
        .pp-mc-top{display:flex;align-items:flex-start;gap:.65rem;margin-bottom:.5rem}
        .pp-mc-info{flex:1;min-width:0}
        .pp-mc-footer{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.5rem}

        .pp-loader{display:flex;align-items:center;justify-content:center;padding:2.5rem;gap:.7rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .pp-ring{width:22px;height:22px;border:2.5px solid rgba(37,99,235,.1);border-top-color:#2563EB;border-radius:50%;animation:ppspin .8s linear infinite}
        .pp-error{display:flex;align-items:center;gap:.6rem;padding:.85rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.8rem;font-weight:800;margin:1rem}
        .pp-empty{display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;gap:.65rem;color:#9CA3AF}
        .pp-empty-title{font-size:.88rem;font-weight:900;color:#374151}
        .pp-empty-sub{font-size:.75rem;font-weight:600}

        @keyframes ppin{to{opacity:1;transform:translateY(0)}}
        @keyframes ppspin{to{transform:rotate(360deg)}}
        @keyframes drawerIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
      `}</style>

      <div className="pp-wrap">
        <div className="pp-header">
          <div className="pp-eyebrow"><div className="pp-dot" />Admin antenne</div>
          <h1 className="pp-title">Gestion des <span>projets</span></h1>
        </div>

        <div className="pp-panel">

          {/* Header */}
          <div className="pp-panel-head">
            <div className="pp-panel-titlerow">
              <div className="pp-panel-ico" style={{ background: '#F5F3FF' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#7C3AED" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="pp-panel-title">Projets de l&apos;antenne</span>
              {items.length > 0 && <span className="pp-count-chip">{items.length}</span>}
            </div>
            <button className={`pp-new-btn${formOpen && formMode === 'create' ? ' open' : ''}`} onClick={formOpen ? closeForm : openCreate}>
              {formOpen && formMode === 'create'
                ? <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>Fermer</>
                : <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.8"><path strokeLinecap="round" d="M12 4v16m8-8H4" /></svg>Nouveau projet</>
              }
            </button>
          </div>

          {/* Collapsible form */}
          <div className={`pp-form-panel${formOpen ? ' open' : ''}`}>
            <div className="pp-form-inner">
              {formMode === 'edit' && editing && (
                <div className="pp-edit-banner"><div className="pp-edit-dot" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Modification&nbsp;: <strong>{editing.title}</strong></span></div>
              )}
              {saveError && (
                <div className="pp-save-err"><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>{saveError}</div>
              )}
              <ProjectForm key={editing?.id ?? 'new'} initial={editingInitial} onSave={(v, p) => void handleSave(v, p)} onCancel={closeForm} submitting={submitting} submitLabel={formMode === 'edit' ? 'Mettre \u00e0 jour' : 'Cr\u00e9er le projet'} uploadProgress={uploadProgress} />
            </div>
          </div>

          {/* Chips */}
          <div className="pp-chips">
            {([
              { label: 'Brouillons', count: draftCount,      color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
              { label: 'En cours',   count: inProgressCount, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { label: 'Termin\u00e9s', count: completedCount, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
            ] as const).map(c => (
              <div key={c.label} className="pp-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }}>
                <span className="pp-chip-dot" style={{ background: c.color }} />
                <span className="pp-chip-num">{c.count}</span>
                <span style={{ fontSize: '.67rem', opacity: .85 }}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="pp-filter-row">
            <input className="pp-finput" placeholder="Rechercher par titre\u2026" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && void load()} />
            <select className="pp-fselect" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUS_LIST_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="pp-reload-btn" onClick={() => void load()}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Rechercher
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="pp-loader"><div className="pp-ring" />Chargement&#8230;</div>
          ) : error ? (
            <div className="pp-error"><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>{error}</div>
          ) : items.length === 0 ? (
            <div className="pp-empty">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <div className="pp-empty-title">Aucun projet trouv&eacute;</div>
              <div className="pp-empty-sub">Cliquez sur <strong>Nouveau projet</strong> pour en cr&eacute;er un.</div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="pp-tw">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th style={thStyle}>Projet</th>
                      <th style={thStyle}>Statut</th>
                      <th style={thStyle}>Budget</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p, i) => (
                      <tr
                        key={p.id}
                        className={editing?.id === p.id && formOpen ? 'pp-editing-row' : ''}
                        style={{ animationDelay: `${i * .04}s` }}
                        onClick={() => setDetailProject(p)}
                      >
                        <td className="pp-td">
                          <div className="pp-proj-title">{p.title}</div>
                          <div className="pp-proj-dates">{p.startsAt ? formatDate(p.startsAt) : '—'}&nbsp;&rarr;&nbsp;{p.endsAt ? formatDate(p.endsAt) : '—'}</div>
                          <div className="pp-hint">
                            <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Voir les d&eacute;tails
                          </div>
                        </td>
                        <td className="pp-td"><StatusBadge status={p.status} /></td>
                        <td className="pp-td"><BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} /></td>
                        <td className="pp-td" style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                            <button className="pp-btn-edit" onClick={() => openEdit(p)}>
                              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Modifier
                            </button>
                            <button className="pp-btn-del" disabled={busyId === p.id} onClick={() => setDeleteTarget(p)}>
                              {busyId === p.id ? <div style={{ width: 11, height: 11, border: '2px solid rgba(220,38,38,.3)', borderTopColor: '#DC2626', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} /> : <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
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
              <div className="pp-mob">
                {items.map((p, i) => (
                  <div key={p.id} className="pp-mc" style={{ animationDelay: `${i * .04}s`, background: editing?.id === p.id && formOpen ? 'rgba(239,246,255,.55)' : undefined }} onClick={() => setDetailProject(p)}>
                    <div className="pp-mc-top">
                      <div className="pp-mc-info">
                        <div className="pp-proj-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        <div className="pp-proj-dates">{p.startsAt ? formatDate(p.startsAt) : '—'} → {p.endsAt ? formatDate(p.endsAt) : '—'}</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} />
                    <div className="pp-mc-footer" onClick={e => e.stopPropagation()}>
                      <button className="pp-btn-edit" onClick={() => openEdit(p)}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Modifier
                      </button>
                      <button className="pp-btn-del" disabled={busyId === p.id} onClick={() => setDeleteTarget(p)}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

      {/* Detail drawer */}
      {detailProject && (
        <ProjectDrawer
          project={detailProject}
          onClose={() => setDetailProject(null)}
          onEdit={() => { openEdit(detailProject); setDetailProject(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteModal project={deleteTarget} busy={busyId !== null} onConfirm={() => void handleDelete(deleteTarget)} onCancel={() => setDeleteTarget(null)} />
      )}
    </AppShell>
  );
}