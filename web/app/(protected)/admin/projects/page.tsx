// web/app/(protected)/admin/projects/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef, DragEvent } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { getAccessToken } from '../../../../lib/auth-store';
import type { Project, ProjectStatus } from '../../../../types/project';
import { formatCurrency, formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ STATUS MAP */
const PROJ_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:            { label: 'Brouillon',     color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  PENDING_APPROVAL: { label: 'En attente',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  APPROVED:         { label: 'Approuvé',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  IN_PROGRESS:      { label: 'En cours',      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  COMPLETED:        { label: 'Terminé',       color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  SUSPENDED:        { label: 'Suspendu',      color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  CANCELLED:        { label: 'Annulé',        color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

const STATUS_FORM_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'DRAFT',            label: 'Brouillon' },
  { value: 'PENDING_APPROVAL', label: "En attente d'approbation" },
  { value: 'APPROVED',         label: 'Approuvé' },
  { value: 'IN_PROGRESS',      label: 'En cours' },
  { value: 'COMPLETED',        label: 'Terminé' },
  { value: 'SUSPENDED',        label: 'Suspendu' },
  { value: 'CANCELLED',        label: 'Annulé' },
];

const STATUS_LIST_OPTIONS = [
  { value: '',            label: 'Tous les statuts' },
  { value: 'DRAFT',       label: 'Brouillon' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED',   label: 'Terminé' },
];

/* ══════════════════════════════════════════════════════ STATUS BADGE */
function StatusBadge({ status }: { status: string }) {
  const s = PROJ_STATUS_MAP[status] ?? PROJ_STATUS_MAP['DRAFT'];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '.28rem',
        fontSize: '.67rem',
        fontWeight: 900,
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 99,
        padding: '.2rem .6rem',
        whiteSpace: 'nowrap',
      }}
    >
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
  const col = over ? '#DC2626' : pct > 80 ? '#D97706' : '#2563EB';

  return (
    <div style={{ minWidth: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.22rem', gap: '.4rem' }}>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.7rem', fontWeight: 700, color: col }}>{pct}%</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.65rem', color: '#9CA3AF', fontWeight: 600 }}>
          {formatCurrency(planned)}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width .5s ease' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ HELPERS */
type Attachment = { url: string; fileName?: string; mimeType?: string | null; sizeBytes?: number | null };
const MAX_PHOTOS = 5;
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_MB = 5;

function isImageAttachment(a: Attachment) {
  return Boolean(
    a.mimeType?.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(a.fileName ?? a.url ?? '')
  );
}

function looksLikeLogo(a: Attachment) {
  const target = `${a.fileName ?? ''} ${a.url ?? ''}`.toLowerCase();
  return ['logo', 'brand', 'marque', 'icon', 'icone', 'bann', 'banner'].some((word) => target.includes(word));
}

function fileIcon(mime?: string | null) {
  if (mime?.includes('pdf')) return '📄';
  if (mime?.includes('word') || mime?.includes('document')) return '📝';
  if (mime?.includes('sheet') || mime?.includes('excel')) return '📊';
  return '📎';
}

function fmtSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ══════════════════════════════════════════════════════ DETAIL ROW */
function DetailRow({
  icon,
  label,
  value,
  vertical = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  vertical?: boolean;
}) {
  if (!value) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: vertical ? '.4rem' : '.75rem',
        padding: '.7rem 0',
        borderBottom: '1px solid rgba(37,99,235,.06)',
      }}
    >
      {vertical ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'rgba(37,99,235,.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#2563EB',
            }}
          >
            {icon}
          </div>
          <div
            style={{
              fontSize: '.65rem',
              fontWeight: 900,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
            }}
          >
            {label}
          </div>
        </div>
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: 'rgba(37,99,235,.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#2563EB',
          }}
        >
          {icon}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {!vertical && (
          <div
            style={{
              fontSize: '.63rem',
              fontWeight: 900,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              marginBottom: '.2rem',
            }}
          >
            {label}
          </div>
        )}
        <div
          style={{
            fontSize: '.84rem',
            fontWeight: 600,
            color: '#374151',
            lineHeight: 1.6,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ GALLERY SLOT */
function GalleryPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? '.15rem' : '.35rem',
        color: '#CBD5E1',
        background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
      }}
    >
      <svg width={compact ? '14' : '20'} height={compact ? '14' : '20'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
      {!compact && <span style={{ fontSize: '.7rem', fontWeight: 800 }}>Aucune image</span>}
    </div>
  );
}

function GalleryThumb({
  attachment,
  active,
  onClick,
  onError,
}: {
  attachment?: Attachment;
  active?: boolean;
  onClick?: () => void;
  onError?: () => void;
}) {
  const clickable = Boolean(attachment && onClick);

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        borderRadius: 12,
        overflow: 'hidden',
        border: active ? '2px solid #2563EB' : '1px solid rgba(37,99,235,.12)',
        background: '#F8FAFC',
        padding: 0,
        cursor: clickable ? 'pointer' : 'default',
        position: 'relative',
        boxShadow: active ? '0 0 0 3px rgba(37,99,235,.12)' : 'none',
        transition: 'all .18s ease',
      }}
    >
      {attachment ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.fileName ?? ''}
            onError={onError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              background: '#F8FAFC',
            }}
          />
          {active && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                boxShadow: 'inset 0 0 0 2px rgba(37,99,235,.08)',
              }}
            />
          )}
        </>
      ) : (
        <GalleryPlaceholder compact />
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════ PROJECT DETAIL MODAL */
function ProjectModal({
  project,
  onClose,
  onEdit,
  onDelete,
}: {
  project: Project;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dedicatedPhotos = ((project as Project & { photos?: Attachment[] }).photos ?? []) as Attachment[];
  const allAttachments = (project.attachments ?? []) as Attachment[];

  const attachmentImages = allAttachments.filter(isImageAttachment);
  const rawImages = [...dedicatedPhotos, ...attachmentImages.filter((ai) => !dedicatedPhotos.some((dp) => dp.url === ai.url))];
  const docs = allAttachments.filter((a) => !attachmentImages.includes(a));

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const validImages = rawImages.filter((img) => !failedImages.has(img.url)).slice(0, MAX_PHOTOS);
  const maxImageIndex = Math.max(validImages.length - 1, 0);
  const effectiveSelectedIndex = Math.min(selectedIndex, maxImageIndex);
  const selectedImage = validImages[effectiveSelectedIndex] ?? null;
  const pct = project.budgetPlanned
    ? Math.min(100, Math.round(((project.budgetSpent ?? 0) / project.budgetPlanned) * 100))
    : 0;
  const over = (project.budgetSpent ?? 0) > (project.budgetPlanned ?? 0);
  const budgetCol = over ? '#DC2626' : pct > 80 ? '#D97706' : '#2563EB';

  const downloadPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const token = getAccessToken(); 

      const response = await fetch(`${apiUrl}/admin/projects/${project.id}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Projet_${project.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur d'exportation:", error);
      alert("Impossible de télécharger le PDF. Vérifiez votre connexion.");
    } finally {
      setIsExporting(false);
    }
  };

  const mainImageFit = selectedImage && looksLikeLogo(selectedImage) ? 'contain' : 'contain';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,.5)',
          backdropFilter: 'blur(5px)',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem',
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 680,
            background: 'rgba(253,253,255,.98)',
            borderRadius: 22,
            maxHeight: '90vh',
            boxShadow: '0 25px 50px rgba(15,23,42,.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalPop .3s cubic-bezier(.22,1,.36,1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid rgba(37,99,235,.09)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              background: '#F8FAFC',
            }}
          >
            <div style={{ flex: 1 }}>
              {project.locationText && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.22rem',
                    fontSize: '.65rem',
                    fontWeight: 800,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    marginBottom: '.4rem',
                  }}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {project.locationText}
                </div>
              )}
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: '1.65rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                {project.title}
              </h2>
              {project.summary && (
                <p style={{ fontSize: '.85rem', color: '#64748B', margin: '.4rem 0 0', fontWeight: 500, lineHeight: 1.4 }}>
                  {project.summary}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'white',
                border: '1px solid #E2E8F0',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Corps scrollable */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Galerie photos */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(37,99,235,.08)' }}>
              <div
                style={{
                  fontSize: '.65rem',
                  fontWeight: 900,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  marginBottom: '.65rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.35rem',
                }}
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                Galerie photos ({validImages.length}/{MAX_PHOTOS})
              </div>

              <div style={{ display: 'grid', gap: '.75rem' }}>
                <div
                  style={{
                    height: 240,
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1px solid rgba(37,99,235,.1)',
                    background: 'linear-gradient(135deg,#F8FAFC,#F1F5F9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedImage.url}
                      alt={project.title}
                      onError={() => {
                        setFailedImages((prev) => new Set(prev).add(selectedImage.url));
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: mainImageFit as 'contain',
                        display: 'block',
                        padding: '.65rem',
                        background: 'linear-gradient(135deg,#F8FAFC,#F1F5F9)',
                      }}
                    />
                  ) : (
                    <GalleryPlaceholder />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '.55rem' }}>
                  {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
                    const img = validImages[index];
                    return (
                      <GalleryThumb
                        key={img?.url ?? `empty-${index}`}
                        attachment={img}
                        active={Boolean(img) && index === selectedIndex}
                        onClick={img ? () => setSelectedIndex(index) : undefined}
                        onError={
                          img
                            ? () => {
                                setFailedImages((prev) => new Set(prev).add(img.url));
                              }
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Details Content */}
            <div style={{ padding: '1.25rem' }}>
              <DetailRow
                icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                label="Promoteur"
                value={project.promoterName}
              />

              <DetailRow
                icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                label="Période"
                value={
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.84rem' }}>
                    {project.startsAt ? formatDate(project.startsAt) : '—'}&nbsp;&nbsp;&rarr;&nbsp;&nbsp;
                    {project.endsAt ? formatDate(project.endsAt) : '—'}
                  </span>
                }
              />              <DetailRow
                icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599-1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                label="Budget"
                value={
                  project.budgetPlanned ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', flexWrap: 'wrap', gap: '.5rem' }}>
                        <div>
                          <span style={{ fontSize: '.68rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>Prévu&nbsp;</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: '#0F172A' }}>{formatCurrency(project.budgetPlanned)}</span>
                        </div>
                        {project.budgetSpent != null && (
                          <div>
                            <span style={{ fontSize: '.68rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>Dépensé&nbsp;</span>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: budgetCol }}>{formatCurrency(project.budgetSpent)}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ height: 7, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: budgetCol, borderRadius: 99 }} />
                      </div>
                      <div style={{ textAlign: 'right', marginTop: '.2rem', fontFamily: "'DM Mono',monospace", fontSize: '.68rem', fontWeight: 700, color: budgetCol }}>
                        {pct}% utilisé{over ? ' — Dépassement !' : ''}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#D1D5DB' }}>Non défini</span>
                  )
                }
              />

              <DetailRow vertical icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>} label="Description complète" value={project.description} />

              {(project.targetBeneficiaries || project.populationImpact || project.environmentalImpact) && (
                <div style={{ marginTop: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid rgba(37,99,235,.08)' }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 900, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Impact &amp; Cibles
                  </div>
                  <DetailRow vertical icon={<span />} label="Bénéficiaires cibles" value={project.targetBeneficiaries} />
                  <DetailRow vertical icon={<span />} label="Impact sur la population" value={project.populationImpact} />
                  <DetailRow vertical icon={<span />} label="Impact environnemental" value={project.environmentalImpact} />
                </div>
              )}

              {(project.implementationMethod || project.risksAndMitigation) && (
                <div style={{ marginTop: '1rem', background: '#FFFBEB', padding: '1rem', borderRadius: 12, border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 900, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Exécution &amp; Risques
                  </div>
                  <DetailRow vertical icon={<span />} label="Méthode d'implémentation" value={project.implementationMethod} />
                  <DetailRow vertical icon={<span />} label="Risques &amp; Mitigations" value={project.risksAndMitigation} />
                </div>
              )}

              {docs.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '.65rem', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.65rem', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg> Documents ({docs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    {docs.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.6rem', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', textDecoration: 'none' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem' }}>
                          {fileIcon(doc.mimeType)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.fileName ?? `Document ${i + 1}`}</div>
                          {doc.sizeBytes != null && <div style={{ fontSize: '.64rem', color: '#94A3B8' }}>{fmtSize(doc.sizeBytes)}</div>}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: 'white', borderTop: '1px solid #E5E7EB', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <StatusBadge status={project.status} />
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button onClick={onDelete} style={{ height: 38, padding: '0 1rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontFamily: "'DM Sans',sans-serif", fontSize: '.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem', transition: 'all .2s' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Supprimer
              </button>
              <button onClick={downloadPDF} disabled={isExporting} style={{ height: 38, padding: '0 1rem', borderRadius: 10, background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#374151', fontFamily: "'DM Sans',sans-serif", fontSize: '.8rem', fontWeight: 800, cursor: isExporting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', opacity: isExporting ? 0.7 : 1 }}>
                {isExporting ? <div style={{ width: 14, height: 14, border: '2px solid rgba(55,65,81,.3)', borderTopColor: '#374151', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} /> : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4" /></svg>}
                PDF
              </button>
              <button onClick={onEdit} style={{ height: 38, padding: '0 1.2rem', borderRadius: 10, background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', border: 'none', color: 'white', fontFamily: "'DM Sans',sans-serif", fontSize: '.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '.4rem', boxShadow: '0 4px 12px rgba(37,99,235,.25)' }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Modifier
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ DELETE MODAL */
function DeleteModal({
  project,
  onConfirm,
  onCancel,
  busy,
}: {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 400 }} onClick={onCancel} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 401, background: 'rgba(255,255,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(430px,calc(100vw - 2rem))', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(15,23,42,.18)' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .9rem' }}>
          <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.25rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.35rem' }}>Supprimer ce projet&nbsp;?</h2>
        <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.4rem', fontWeight: 600, lineHeight: 1.55 }}>
          <strong style={{ color: '#111827' }}>{project.title}</strong> sera supprimé définitivement.
        </p>
        <div style={{ display: 'flex', gap: '.55rem', justifyContent: 'center' }}>
          <button onClick={onCancel} disabled={busy} style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirm} disabled={busy} style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.3)', opacity: busy ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            {busy && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} />}
            Supprimer
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PHOTO DROP ZONE */
interface PhotoFile {
  file: File;
  preview: string;
  id: string;
}

function UploadSlot({ photo, onRemove, onAdd, disabled }: { photo?: PhotoFile; onRemove?: () => void; onAdd?: () => void; disabled?: boolean; }) {
  if (photo) {
    return (
      <div style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(37,99,235,.15)', background: '#F8FAFC', boxShadow: '0 1px 3px rgba(15,23,42,.04)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '.3rem .4rem', background: 'linear-gradient(to top, rgba(15,23,42,.72), rgba(15,23,42,0))', color: 'white', fontSize: '.58rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={photo.file.name}>{photo.file.name}</div>
        <button type="button" onClick={onRemove} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(15,23,42,.68)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={disabled ? undefined : onAdd} disabled={disabled} style={{ aspectRatio: '1 / 1', borderRadius: 12, border: '2px dashed rgba(37,99,235,.18)', background: 'rgba(239,246,255,.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', gap: '.28rem', color: '#93C5FD', opacity: disabled ? 0.55 : 1, transition: 'all .18s ease' }}>
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 4v16m8-8H4" /></svg>
      <span style={{ fontSize: '.6rem', fontWeight: 800 }}>{disabled ? 'Plein' : 'Ajouter'}</span>
    </button>
  );
}

function PhotoDropZone({ photos, onChange }: { photos: PhotoFile[]; onChange: (p: PhotoFile[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addFiles(files: FileList | File[]) {
    setErr(null);
    const arr = Array.from(files);
    const valid: PhotoFile[] = [];

    for (const f of arr) {
      if (!ACCEPT.includes(f.type)) { setErr('Format non accepté (PNG, JPG, WEBP).'); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { setErr(`Fichier trop lourd — max ${MAX_MB} Mo.`); continue; }
      if (photos.length + valid.length >= MAX_PHOTOS) { setErr(`Maximum ${MAX_PHOTOS} photos.`); break; }

      valid.push({
        file: f,
        preview: URL.createObjectURL(f),
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
    }

    if (valid.length) onChange([...photos, ...valid]);
  }

  function remove(id: string) {
    const p = photos.find((x) => x.id === id);
    if (p) URL.revokeObjectURL(p.preview);
    onChange(photos.filter((x) => x.id !== id));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    addFiles(e.dataTransfer.files);
  }

  const remaining = MAX_PHOTOS - photos.length;
  const full = photos.length >= MAX_PHOTOS;

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
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop} onClick={() => inputRef.current?.click()} style={{ border: `2px dashed ${drag ? '#2563EB' : 'rgba(37,99,235,.22)'}`, borderRadius: 14, padding: '1.4rem 1rem', textAlign: 'center', cursor: 'pointer', background: drag ? 'rgba(239,246,255,.7)' : 'rgba(239,246,255,.3)', transition: 'all .18s', marginBottom: '.75rem', userSelect: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,99,235,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .7rem', border: '1px solid rgba(37,99,235,.14)' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <p style={{ margin: '0 0 .3rem', fontSize: '.82rem', fontWeight: 800, color: '#1D4ED8' }}>Cliquez ou glissez vos photos</p>
          <p style={{ margin: 0, fontSize: '.72rem', fontWeight: 600, color: '#9CA3AF' }}>PNG, JPG, WEBP — max {MAX_MB} Mo — {remaining} emplacement{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}</p>
          <input ref={inputRef} type="file" accept={ACCEPT.join(',')} multiple hidden onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
        </div>
      )}
      {err && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.55rem .8rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, marginBottom: '.6rem', fontSize: '.75rem', fontWeight: 700, color: '#B91C1C' }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '.55rem' }}>
        {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
          const photo = photos[index];
          return <UploadSlot key={photo?.id ?? `slot-${index}`} photo={photo} onRemove={photo ? () => remove(photo.id) : undefined} onAdd={!photo ? () => inputRef.current?.click() : undefined} disabled={!photo && full} />;
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ INLINE FORM */
const LS: React.CSSProperties = { fontSize: '.7rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.32rem', display: 'block' };
const IS: React.CSSProperties = { width: '100%', height: 40, borderRadius: 11, border: '1px solid rgba(37,99,235,.15)', background: 'rgba(255,255,255,.88)', padding: '0 .9rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, color: '#111827', outline: 'none', boxSizing: 'border-box' };
const TA: React.CSSProperties = { width: '100%', borderRadius: 11, border: '1px solid rgba(37,99,235,.15)', background: 'rgba(255,255,255,.88)', padding: '.75rem .9rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' };
const SS: React.CSSProperties = { ...IS, appearance: 'none', cursor: 'pointer', backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right .75rem center', paddingRight: '2.2rem' };

interface FormValues {
  title: string; summary: string; description: string; locationText: string; promoterName: string; status: ProjectStatus; budgetPlanned: string; budgetSpent: string; startsAt: string; endsAt: string; targetBeneficiaries: string; populationImpact: string; environmentalImpact: string; risksAndMitigation: string; implementationMethod: string; specificObjectives: string; expectedResults: string; successIndicators: string;
}

const EMPTY: FormValues = { title: '', summary: '', description: '', locationText: '', promoterName: '', status: 'DRAFT', budgetPlanned: '', budgetSpent: '', startsAt: '', endsAt: '', targetBeneficiaries: '', populationImpact: '', environmentalImpact: '', risksAndMitigation: '', implementationMethod: '', specificObjectives: '', expectedResults: '', successIndicators: '' };

function ProjectForm({ initial, onSave, onCancel, submitting, submitLabel, uploadProgress }: { initial?: FormValues; onSave: (v: FormValues, p: File[]) => void; onCancel: () => void; submitting: boolean; submitLabel: string; uploadProgress: string | null; }) {
  const [v, setV] = useState<FormValues>(initial ?? EMPTY);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const f = (k: keyof FormValues) => ({ value: v[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((p) => ({ ...p, [k]: e.target.value })) });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(v, photos.map((p) => p.file)); }}>
      <div style={{ display: 'grid', gap: '1.2rem' }}>
        <div className="pp-form-section">
          <h3 className="pp-form-section-title"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Informations Générales</h3>
          <div style={{ display: 'grid', gap: '.85rem' }}>
            <div><label style={LS}>Titre du projet <span style={{ color: '#EF4444' }}>*</span></label><input style={IS} placeholder="Nom officiel du projet" required {...f('title')} /></div>
            <div><label style={LS}>Résumé court</label><input style={IS} placeholder="Une phrase d'accroche ou résumé rapide" {...f('summary')} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div><label style={LS}>Statut</label><select style={SS} value={v.status} onChange={(e) => setV((p) => ({ ...p, status: e.target.value as ProjectStatus }))}>{STATUS_FORM_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select></div>
              <div><label style={LS}>Promoteur / Porteur</label><input style={IS} placeholder="Nom du responsable" {...f('promoterName')} /></div>
            </div>
            <div><label style={LS}>Localisation</label><input style={IS} placeholder="Région, Ville, ou Adresse" {...f('locationText')} /></div>
            <div><label style={LS}>Description détaillée</label><textarea style={{ ...TA, minHeight: 120 }} placeholder="Contexte, justification et description complète du projet..." {...f('description')} /></div>
          </div>
        </div>

        <div className="pp-form-section">
          <h3 className="pp-form-section-title"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Impact &amp; Objectifs</h3>
          <div style={{ display: 'grid', gap: '.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.85rem' }}>
              <div><label style={LS}>Bénéficiaires cibles</label><input style={IS} placeholder="Ex: Étudiants, Agriculteurs..." {...f('targetBeneficiaries')} /></div>
              <div><label style={LS}>Impact population</label><input style={IS} placeholder="Bénéfices sociaux" {...f('populationImpact')} /></div>
            </div>
            <div><label style={LS}>Impact environnemental</label><input style={IS} placeholder="Conséquences sur l'environnement" {...f('environmentalImpact')} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.85rem' }}>
              <div><label style={LS}>Objectifs spécifiques</label><textarea style={TA} placeholder="Liste des objectifs" {...f('specificObjectives')} /></div>
              <div><label style={LS}>Indicateurs de succès</label><textarea style={TA} placeholder="Comment mesurer la réussite ?" {...f('successIndicators')} /></div>
            </div>
          </div>
        </div>

        <div className="pp-form-section">
          <h3 className="pp-form-section-title"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Exécution &amp; Budget</h3>
          <div style={{ display: 'grid', gap: '.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.85rem' }}>
              <div><label style={LS}>Méthode d&apos;implémentation</label><textarea style={TA} placeholder="Étapes de réalisation..." {...f('implementationMethod')} /></div>
              <div><label style={LS}>Risques &amp; Mitigations</label><textarea style={TA} placeholder="Dangers potentiels et solutions..." {...f('risksAndMitigation')} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div><label style={LS}>Début prévu</label><input style={IS} type="date" {...f('startsAt')} /></div>
              <div><label style={LS}>Fin prévue</label><input style={IS} type="date" {...f('endsAt')} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div><label style={LS}>Budget prévu (GNF)</label><input style={IS} type="number" min="0" placeholder="0" {...f('budgetPlanned')} /></div>
              <div><label style={LS}>Budget dépensé (GNF)</label><input style={IS} type="number" min="0" placeholder="0" {...f('budgetSpent')} /></div>
            </div>
          </div>
        </div>

        <PhotoDropZone photos={photos} onChange={setPhotos} />

        {uploadProgress && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', padding: '.65rem .9rem', background: 'rgba(239,246,255,.8)', border: '1px solid rgba(37,99,235,.18)', borderRadius: 10, fontSize: '.78rem', fontWeight: 700, color: '#1D4ED8' }}>
            <div style={{ width: 14, height: 14, border: '2px solid rgba(37,99,235,.2)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'ppspin .7s linear infinite', flexShrink: 0 }} />
            {uploadProgress}
          </div>
        )}

        <div style={{ display: 'flex', gap: '.55rem', marginTop: '.5rem' }}>
          <button type="button" onClick={onCancel} disabled={submitting} style={{ flex: 1, height: 44, borderRadius: 11, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 700, color: '#374151', cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>Annuler</button>
          <button type="submit" disabled={submitting} style={{ flex: 2, height: 44, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', fontWeight: 900, color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', boxShadow: '0 4px 14px rgba(37,99,235,.3)', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} /> Enregistrement&#8230;</> : <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> {submitLabel}</>}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
type FormMode = 'hidden' | 'create' | 'edit';

export default function AdminProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('hidden');
  const [editing, setEditing] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

      const payload = {
        title: values.title, summary: values.summary || undefined, description: values.description || undefined,
        locationText: values.locationText || undefined, status: values.status, promoterName: values.promoterName || undefined,
        targetBeneficiaries: values.targetBeneficiaries || undefined, populationImpact: values.populationImpact || undefined,
        environmentalImpact: values.environmentalImpact || undefined, risksAndMitigation: values.risksAndMitigation || undefined,
        implementationMethod: values.implementationMethod || undefined, specificObjectives: values.specificObjectives || undefined,
        expectedResults: values.expectedResults || undefined, successIndicators: values.successIndicators || undefined,
        budgetPlanned: values.budgetPlanned ? Number(values.budgetPlanned) : undefined,
        budgetSpent: values.budgetSpent ? Number(values.budgetSpent) : undefined,
        startsAt: values.startsAt || null, endsAt: values.endsAt || null, ...(photoIds.length > 0 && { photoIds }),
      };

      if (editing) await api.updateAntennaProject(editing.id, payload as Parameters<typeof api.updateAntennaProject>[1]);
      else await api.createAntennaProject(payload as Parameters<typeof api.createAntennaProject>[0]);

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
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur suppression'); } 
    finally { setBusyId(null); }
  }

  const editingInitial: FormValues | undefined = editing ? {
    title: editing.title, summary: editing.summary ?? '', description: editing.description ?? '', locationText: editing.locationText ?? '',
    promoterName: editing.promoterName ?? '', status: editing.status, budgetPlanned: editing.budgetPlanned?.toString() ?? '',
    budgetSpent: editing.budgetSpent?.toString() ?? '', startsAt: editing.startsAt ? new Date(editing.startsAt).toISOString().slice(0, 10) : '',
    endsAt: editing.endsAt ? new Date(editing.endsAt).toISOString().slice(0, 10) : '', targetBeneficiaries: editing.targetBeneficiaries ?? '',
    populationImpact: editing.populationImpact ?? '', environmentalImpact: editing.environmentalImpact ?? '', risksAndMitigation: editing.risksAndMitigation ?? '',
    implementationMethod: editing.implementationMethod ?? '', specificObjectives: typeof editing.specificObjectives === 'string' ? editing.specificObjectives : JSON.stringify(editing.specificObjectives ?? ''),
    expectedResults: typeof editing.expectedResults === 'string' ? editing.expectedResults : JSON.stringify(editing.expectedResults ?? ''),
    successIndicators: typeof editing.successIndicators === 'string' ? editing.successIndicators : JSON.stringify(editing.successIndicators ?? ''),
  } : undefined;

  const draftCount = items.filter((i) => i.status === 'DRAFT').length;
  const inProgressCount = items.filter((i) => i.status === 'IN_PROGRESS').length;
  const completedCount = items.filter((i) => i.status === 'COMPLETED').length;
  const formOpen = formMode !== 'hidden';

  const thStyle: React.CSSProperties = { padding: '.7rem 1.1rem', fontSize: '.63rem', fontWeight: 900, letterSpacing: '.11em', textTransform: 'uppercase', color: '#374151', background: 'rgba(37,99,235,.025)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid rgba(37,99,235,.08)' };

  return (
    <AppShell title="Projets de l'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .pp-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.1rem,3vw,2rem);max-width:1100px;margin:0 auto}
        
        /* 1. HEADER & BOUTON NOUVEAU */
        .pp-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 0.5rem; margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: ppin .5s .04s cubic-bezier(.22,1,.36,1) forwards; }
        .pp-header-left { display: flex; flex-direction: column; }
        .pp-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.3rem;display:flex;align-items:center;gap:.4rem}
        .pp-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:pppulse 2s ease-in-out infinite}
        @keyframes pppulse{0%,100%{opacity:1}50%{opacity:.3}}
        .pp-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.4rem,3vw,1.85rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15;margin:0;}
        .pp-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        
        .pp-new-btn{height:36px;padding:0 1rem;border-radius:10px;background:linear-gradient(135deg,#1D4ED8,#2563EB);border:none;color:white;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:.4rem;box-shadow:0 3px 10px rgba(37,99,235,.3);transition:all .18s;white-space:nowrap}
        .pp-new-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(37,99,235,.4)}
        .pp-new-btn.open{background:rgba(37,99,235,.08);color:#1D4ED8;border:1.5px solid rgba(37,99,235,.2);box-shadow:none}

        @media(max-width:500px){
          .pp-header { align-items: center; }
          .pp-title { font-size: 1.15rem !important; }
          .pp-new-btn { padding: 0 0.6rem !important; height: 32px !important; font-size: 0.7rem !important; }
        }

        .pp-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 16px rgba(37,99,235,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:ppin .5s .09s cubic-bezier(.22,1,.36,1) forwards}
        .pp-panel-head{padding:.9rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .pp-panel-titlerow{display:flex;align-items:center;gap:.5rem}
        .pp-panel-ico{width:27px;height:27px;border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pp-panel-title{font-size:.73rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .pp-count-chip{font-size:.67rem;font-weight:900;padding:.2rem .58rem;border-radius:99px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}

        .pp-form-panel{overflow:hidden;transition:max-height .35s cubic-bezier(.22,1,.36,1),opacity .25s ease;max-height:0;opacity:0}
        .pp-form-panel.open{max-height:3000px;opacity:1}
        .pp-form-inner{padding:1.5rem 1.2rem;border-bottom:1px solid rgba(37,99,235,.07);background:rgba(239,246,255,.18)}
        @media(max-width:560px){.pp-form-inner{padding:1.2rem .9rem}}

        .pp-form-section { background: rgba(255,255,255,.6); border: 1px solid rgba(37,99,235,.1); padding: 1.2rem; border-radius: 14px; margin-bottom: 1rem; }
        .pp-form-section-title { margin: 0 0 1rem; font-size: .8rem; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: .05em; display: flex; align-items: center; gap: .4rem; border-bottom: 1px dashed rgba(37,99,235,.15); padding-bottom: .6rem; }

        .pp-edit-banner{display:flex;align-items:center;gap:.4rem;font-size:.72rem;font-weight:800;color:#2563EB;margin-bottom:.7rem;padding:.5rem .75rem;background:rgba(239,246,255,.9);border:1px solid rgba(37,99,235,.2);border-radius:9px}
        .pp-edit-dot{width:6px;height:6px;border-radius:50%;background:#2563EB;animation:pppulse 1.5s infinite;flex-shrink:0}
        .pp-save-err{display:flex;align-items:center;gap:.5rem;padding:.65rem .85rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:9px;color:#B91C1C;font-size:.78rem;font-weight:800;margin-bottom:.7rem}
        .pp-form-inner input:focus,.pp-form-inner textarea:focus,.pp-form-inner select:focus{border-color:rgba(37,99,235,.4)!important;box-shadow:0 0 0 3px rgba(37,99,235,.08)!important;background:white!important}

        /* 2. BADGES CHIPS - SUR UNE SEULE LIGNE */
        .pp-chips{display:flex;gap:.5rem;flex-wrap:nowrap;padding:.7rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);background:rgba(239,246,255,.12);width:100%;box-sizing:border-box}
        .pp-chip{display:inline-flex;align-items:center;justify-content:center;gap:.32rem;padding:.28rem .4rem;border-radius:9px;font-size:.7rem;font-weight:700;border:1px solid;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .pp-chip-dot{width:5px;height:5px;border-radius:50%}
        .pp-chip-num{font-family:'Cormorant Garamond',serif;font-size:.95rem;font-weight:700}
        @media(max-width:500px){
          .pp-chips{padding:.5rem;gap:.25rem}
          .pp-chip{padding:.2rem}
          .pp-chip-label{font-size:.55rem!important}
          .pp-chip-num{font-size:.8rem!important}
          .pp-chip-dot{display:none}
        }

        /* 3. RECHERCHE ET FILTRES - SUR UNE SEULE LIGNE */
        .pp-filter-row{display:flex;gap:.55rem;align-items:center;flex-wrap:nowrap;padding:.8rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);width:100%;box-sizing:border-box}
        .pp-finput{height:36px;border-radius:9px;border:1px solid rgba(37,99,235,.14);padding:0 .8rem;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:600;color:#111827;outline:none;flex:1 1 auto;min-width:0;background:rgba(255,255,255,.88);transition:border-color .2s,box-shadow .2s}
        .pp-finput:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08)}
        .pp-finput::placeholder{color:rgba(107,114,128,.4);font-weight:400}
        .pp-fselect{height:36px;border-radius:9px;border:1px solid rgba(37,99,235,.14);background:rgba(255,255,255,.88);padding:0 1.8rem 0 .7rem;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:700;color:#111827;outline:none;appearance:none;cursor:pointer;flex:0 1 auto;min-width:0;background-image:url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .55rem center}
        .pp-fselect:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08);outline:none}
        .pp-reload-btn{height:36px;padding:0 .85rem;background:rgba(239,246,255,.8);border:1.5px solid rgba(37,99,235,.18);border-radius:9px;cursor:pointer;color:#1D4ED8;font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:800;display:flex;align-items:center;gap:.32rem;transition:all .18s;white-space:nowrap;flex:0 0 auto}
        .pp-reload-btn:hover{background:#DBEAFE;border-color:#2563EB;transform:translateY(-1px)}
        @media(max-width:500px){
          .pp-filter-row{padding:.6rem .5rem;gap:.3rem}
          .pp-finput{padding:0 .4rem;font-size:.7rem;height:34px}
          .pp-fselect{padding:0 1.2rem 0 .4rem;font-size:.7rem;height:34px;background-position:right .3rem center}
          .pp-reload-btn{padding:0 .5rem;font-size:.7rem;height:34px}
          .btn-text{display:none} /* Cache le texte du bouton Rechercher pour éviter le scroll sur les très petits écrans */
        }

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

        .pp-mob{display:none;flex-direction:column}
        @media(max-width:600px){.pp-tw{display:none}.pp-mob{display:flex}}
        .pp-mc{padding:.9rem 1.1rem;border-bottom:1px solid rgba(37,99,235,.06);animation:ppin .38s cubic-bezier(.22,1,.36,1) both;cursor:pointer;transition:background .15s}
        .pp-mc:last-child{border-bottom:none}
        .pp-mc:hover{background:rgba(239,246,255,.55)}
        .pp-mc-top{display:flex;align-items:flex-start;gap:.65rem;margin-bottom:.5rem}
        .pp-mc-info{flex:1;min-width:0}

        .pp-loader{display:flex;align-items:center;justify-content:center;padding:2.5rem;gap:.7rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .pp-ring{width:22px;height:22px;border:2.5px solid rgba(37,99,235,.1);border-top-color:#2563EB;border-radius:50%;animation:ppspin .8s linear infinite}
        .pp-error{display:flex;align-items:center;gap:.6rem;padding:.85rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.8rem;font-weight:800;margin:1rem}
        .pp-empty{display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;gap:.65rem;color:#9CA3AF}
        .pp-empty-title{font-size:.88rem;font-weight:900;color:#374151}
        .pp-empty-sub{font-size:.75rem;font-weight:600}

        @keyframes ppin{to{opacity:1;transform:translateY(0)}}
        @keyframes ppspin{to{transform:rotate(360deg)}}
        @keyframes drawerIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
        @keyframes modalPop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <div className="pp-wrap">
        {/* 👇 Le bouton "Nouveau projet" est désormais ici */}
        <div className="pp-header">
          <div className="pp-header-left">
            <div className="pp-eyebrow">
              <div className="pp-dot" />
              Admin antenne
            </div>
            <h1 className="pp-title">
              Gestion des <span>projets</span>
            </h1>
          </div>
          <button className={`pp-new-btn${formOpen && formMode === 'create' ? ' open' : ''}`} onClick={formOpen ? closeForm : openCreate}>
            {formOpen && formMode === 'create' ? (
              <>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="btn-text-new">Fermer</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8">
                  <path strokeLinecap="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="btn-text-new">Nouveau projet</span>
              </>
            )}
          </button>
        </div>

        <div className="pp-panel">
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
          </div>

          <div className={`pp-form-panel${formOpen ? ' open' : ''}`}>
            <div className="pp-form-inner">
              {formMode === 'edit' && editing && (
                <div className="pp-edit-banner">
                  <div className="pp-edit-dot" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Modification&nbsp;: <strong>{editing.title}</strong>
                  </span>
                </div>
              )}
              {saveError && (
                <div className="pp-save-err">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" />
                    <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                  </svg>
                  {saveError}
                </div>
              )}
              {formOpen && (
                <ProjectForm
                  key={editing?.id ?? 'new'}
                  initial={editingInitial}
                  onSave={(v, p) => void handleSave(v, p)}
                  onCancel={closeForm}
                  submitting={submitting}
                  submitLabel={formMode === 'edit' ? 'Mettre à jour' : 'Créer le projet'}
                  uploadProgress={uploadProgress}
                />
              )}
            </div>
          </div>

          <div className="pp-chips">
            {([
              { label: 'Brouillons', count: draftCount, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
              { label: 'En cours', count: inProgressCount, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
              { label: 'Terminés', count: completedCount, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
            ] as const).map((c) => (
              <div key={c.label} className="pp-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }}>
                <span className="pp-chip-dot" style={{ background: c.color }} />
                <span className="pp-chip-num">{c.count}</span>
                <span className="pp-chip-label" style={{ fontSize: '.67rem', opacity: 0.85 }}>{c.label}</span>
              </div>
            ))}
          </div>

          <div className="pp-filter-row">
            <input
              className="pp-finput"
              placeholder="Rechercher par titre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void load()}
            />
            <select className="pp-fselect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_LIST_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button className="pp-reload-btn" onClick={() => void load()}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="btn-text">Rechercher</span>
            </button>
          </div>

          {loading ? (
            <div className="pp-loader">
              <div className="pp-ring" />
              Chargement&#8230;
            </div>
          ) : error ? (
            <div className="pp-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="pp-empty">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="pp-empty-title">Aucun projet trouvé</div>
              <div className="pp-empty-sub">
                Cliquez sur <strong>Nouveau projet</strong> pour en créer un.
              </div>
            </div>
          ) : (
            <>
              <div className="pp-tw">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th style={thStyle}>Projet</th>
                      <th style={thStyle}>Statut</th>
                      <th style={thStyle}>Budget</th>
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
                          <div className="pp-proj-dates">
                            {p.startsAt ? formatDate(p.startsAt) : '—'}&nbsp;&rarr;&nbsp;{p.endsAt ? formatDate(p.endsAt) : '—'}
                          </div>
                          <div className="pp-hint">
                            <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Voir les détails
                          </div>
                        </td>
                        <td className="pp-td">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="pp-td">
                          <BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pp-mob">
                {items.map((p, i) => (
                  <div
                    key={p.id}
                    className="pp-mc"
                    style={{ animationDelay: `${i * .04}s`, background: editing?.id === p.id && formOpen ? 'rgba(239,246,255,.55)' : undefined }}
                    onClick={() => setDetailProject(p)}
                  >
                    <div className="pp-mc-top">
                      <div className="pp-mc-info">
                        <div className="pp-proj-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title}
                        </div>
                        <div className="pp-proj-dates">
                          {p.startsAt ? formatDate(p.startsAt) : '—'} → {p.endsAt ? formatDate(p.endsAt) : '—'}
                        </div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {detailProject && (
        <ProjectModal
          project={detailProject}
          onClose={() => setDetailProject(null)}
          onEdit={() => {
            openEdit(detailProject);
            setDetailProject(null);
          }}
          onDelete={() => setDeleteTarget(detailProject)}
        />
      )}

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