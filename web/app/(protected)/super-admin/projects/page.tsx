// web/app/(protected)/super-admin/projects/page.tsx
'use client';

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Project, ProjectStatus } from '../../../../types/project';
import { formatDate, formatCurrency } from '../../../../lib/format';
import ProjectFormModal from '../../../../components/projects/ProjectModal';

/* ══════════════════════════════════════════════════════ STATUS MAP */
const STATUS_MAP: Record<
  ProjectStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  DRAFT: {
    label: 'Brouillon',
    color: '#6B7280',
    bg: '#F3F4F6',
    border: '#E5E7EB',
  },
  PENDING_APPROVAL: {
    label: 'En attente',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  APPROVED: {
    label: 'Approuvé',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  IN_PROGRESS: {
    label: 'En cours',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  COMPLETED: {
    label: 'Terminé',
    color: '#0E7490',
    bg: '#ECFEFF',
    border: '#A5F3FC',
  },
  SUSPENDED: {
    label: 'Suspendu',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  CANCELLED: {
    label: 'Annulé',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
};

type Attachment = {
  url: string;
  fileName?: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

const MAX_PHOTOS = 5;

function isImageAttachment(attachment: Attachment): boolean {
  return Boolean(
    attachment.mimeType?.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(
        attachment.fileName ?? attachment.url ?? ''
      )
  );
}

function looksLikeLogo(attachment: Attachment): boolean {
  const target = `${attachment.fileName ?? ''} ${attachment.url ?? ''}`.toLowerCase();
  return ['logo', 'brand', 'marque', 'icon', 'icone', 'banner', 'bann'].some(
    (word) => target.includes(word)
  );
}

function fileIcon(mime?: string | null): string {
  if (mime?.includes('pdf')) return '📄';
  if (mime?.includes('word') || mime?.includes('document')) return '📝';
  if (mime?.includes('sheet') || mime?.includes('excel')) return '📊';
  return '📎';
}

function fmtSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ══════════════════════════════════════════════════════ STATUS BADGE */
function StatusBadge({ status }: { status: ProjectStatus }) {
  const current = STATUS_MAP[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '.25rem',
        fontSize: '.68rem',
        fontWeight: 900,
        color: current.color,
        background: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: 99,
        padding: '.2rem .6rem',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: current.color,
          flexShrink: 0,
        }}
      />
      {current.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ BUDGET BAR */
function BudgetBar({
  planned,
  spent,
}: {
  planned?: number | null;
  spent?: number | null;
}) {
  if (!planned) {
    return <span style={{ color: '#D1D5DB', fontWeight: 700 }}>—</span>;
  }
  const pct = Math.min(100, Math.round(((spent ?? 0) / planned) * 100));
  const over = (spent ?? 0) > planned;
  const barColor = over ? '#DC2626' : pct > 80 ? '#D97706' : '#059669';

  return (
    <div style={{ minWidth: 110 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '.2rem',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: '.68rem',
            fontWeight: 700,
            color: barColor,
          }}
        >
          {pct}%
        </span>
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: '.65rem',
            fontWeight: 600,
            color: '#9CA3AF',
          }}
        >
          {formatCurrency(planned, 'GNF')}
        </span>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 99,
          background: '#F3F4F6',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            borderRadius: 99,
            transition: 'width .5s ease',
          }}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ DETAIL ROW */
function DetailRow({
  icon,
  label,
  value,
  vertical = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
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
        borderBottom: '1px solid rgba(220,38,38,.06)',
      }}
    >
      {vertical ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: 'rgba(220,38,38,.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#DC2626',
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
            background: 'rgba(220,38,38,.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#DC2626',
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

/* ══════════════════════════════════════════════════════ GALLERY UI */
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
      <svg
        width={compact ? '14' : '20'}
        height={compact ? '14' : '20'}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <circle cx="12" cy="13" r="3" />
      </svg>
      {!compact && (
        <span style={{ fontSize: '.7rem', fontWeight: 800 }}>Aucune image</span>
      )}
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
        border: active
          ? '2px solid #DC2626'
          : '1px solid rgba(220,38,38,.12)',
        background: '#F8FAFC',
        padding: 0,
        cursor: clickable ? 'pointer' : 'default',
        position: 'relative',
        boxShadow: active ? '0 0 0 3px rgba(220,38,38,.1)' : 'none',
        transition: 'all .18s ease',
      }}
    >{attachment ? (
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
                boxShadow: 'inset 0 0 0 2px rgba(220,38,38,.08)',
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

/* ══════════════════════════════════════════════════════ MODAL DÉTAIL */
function ProjectDetailModal({
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
  const dedicatedPhotos = (
    (project as Project & { photos?: Attachment[] }).photos ?? []
  ) as Attachment[];
  const allAttachments = (project.attachments ?? []) as Attachment[];
  const attachmentImages = allAttachments.filter(isImageAttachment);
  const rawImages = [
    ...dedicatedPhotos,
    ...attachmentImages.filter(
      (attachmentImage) =>
        !dedicatedPhotos.some(
          (dedicatedPhoto) => dedicatedPhoto.url === attachmentImage.url
        )
    ),
  ];
  const docs = allAttachments.filter(
    (attachment) => !attachmentImages.includes(attachment)
  );

  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);

  const validImages = rawImages
    .filter((image) => !failedImages.has(image.url))
    .slice(0, MAX_PHOTOS);

  const maxImageIndex = Math.max(validImages.length - 1, 0);
  const effectiveSelectedIndex = Math.min(selectedIndex, maxImageIndex);
  const selectedImage = validImages[effectiveSelectedIndex] ?? null;
  const mainImageFit = selectedImage && looksLikeLogo(selectedImage) ? 'contain' : 'contain';

  const pct = project.budgetPlanned
    ? Math.min(100, Math.round(((project.budgetSpent ?? 0) / project.budgetPlanned) * 100))
    : 0;
  const over = (project.budgetSpent ?? 0) > (project.budgetPlanned ?? 0);
  const budgetCol = over ? '#DC2626' : pct > 80 ? '#D97706' : '#059669';

  const downloadPDF = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    window.open(`${apiUrl}/super-admin/projects/${project.id}/export`, '_blank');
  };

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
            maxWidth: 720,
            background: 'rgba(253,253,255,.98)',
            borderRadius: 22,
            maxHeight: '90vh',
            boxShadow: '0 25px 50px rgba(15,23,42,.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'spjModalPop .3s cubic-bezier(.22,1,.36,1)',
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid rgba(220,38,38,.09)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              background: '#FFF7F7',
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
                  fontSize: '1.7rem',
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
              type="button"
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

          {/* Body */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Gallery */}
            <div style={{ padding: '1.25rem', borderBottom: '1px solid rgba(220,38,38,.08)' }}>
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
                    border: '1px solid rgba(220,38,38,.1)',
                    background: 'linear-gradient(135deg,#F8FAFC,#F1F5F9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedImage.url}
                      alt={project.title}
                      onError={() =>
                        setFailedImages((prev) => new Set(prev).add(selectedImage.url))
                      }
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: mainImageFit,
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
                    const image = validImages[index];
                    return (
                      <GalleryThumb
                        key={image?.url ?? `empty-${index}`}
                        attachment={image}
                        active={Boolean(image) && index === selectedIndex}
                        onClick={image ? () => setSelectedIndex(index) : undefined}
                        onError={
                          image
                            ? () => setFailedImages((prev) => new Set(prev).add(image.url))
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Details */}
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
                    {project.startsAt ? formatDate(project.startsAt) : '—'}
                    &nbsp;&nbsp;&rarr;&nbsp;&nbsp;
                    {project.endsAt ? formatDate(project.endsAt) : '—'}
                  </span>
                }
              />
              <DetailRow
                icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                label="Budget"
                value={
                  project.budgetPlanned ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.4rem', flexWrap: 'wrap', gap: '.5rem' }}>
                        <div>
                          <span style={{ fontSize: '.68rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>Prévu&nbsp;</span>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: '#0F172A' }}>{formatCurrency(project.budgetPlanned, 'GNF')}</span>
                        </div>
                        {project.budgetSpent != null && (
                          <div>
                            <span style={{ fontSize: '.68rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.06em' }}>Dépensé&nbsp;</span>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: budgetCol }}>{formatCurrency(project.budgetSpent, 'GNF')}</span>
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
              <DetailRow
                vertical
                icon={<svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" /></svg>}
                label="Description complète"
                value={project.description}
              />

              {(project.targetBeneficiaries || project.populationImpact || project.environmentalImpact) && (
                <div style={{ marginTop: '1rem', background: '#FFF7F7', padding: '1rem', borderRadius: 12, border: '1px solid rgba(220,38,38,.08)' }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 900, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    Impact &amp; Cibles
                  </div>
                  <DetailRow vertical icon={<span />} label="Bénéficiaires cibles" value={project.targetBeneficiaries} />
                  <DetailRow vertical icon={<span />} label="Impact sur la population" value={project.populationImpact} />
                  <DetailRow vertical icon={<span />} label="Impact environnemental" value={project.environmentalImpact} />
                </div>
              )}

              {(project.implementationMethod || project.risksAndMitigation) && (
                <div style={{ marginTop: '1rem', background: '#FFFBEB', padding: '1rem', borderRadius: 12, border: '1px solid #FDE68A' }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 900, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.8rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Exécution &amp; Risques
                  </div>
                  <DetailRow vertical icon={<span />} label="Méthode d'implémentation" value={project.implementationMethod} />
                  <DetailRow vertical icon={<span />} label="Risques &amp; Mitigations" value={project.risksAndMitigation} />
                </div>
              )}

              {docs.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '.65rem', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.65rem', display: 'center', alignItems: 'center', gap: '.35rem' }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    Documents ({docs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    {docs.map((doc, index) => (
                      <a
                        key={`${doc.url}-${index}`}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.6rem', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', textDecoration: 'none' }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 7, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem' }}>
                          {fileIcon(doc.mimeType)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.fileName ?? `Document ${index + 1}`}
                          </div>
                          {doc.sizeBytes != null && (
                            <div style={{ fontSize: '.64rem', color: '#94A3B8' }}>{fmtSize(doc.sizeBytes)}</div>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              background: 'white',
              borderTop: '1px solid #E5E7EB',
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <StatusBadge status={project.status} />

            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onDelete}
                style={{
                  height: 38,
                  padding: '0 1rem',
                  borderRadius: 10,
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#DC2626',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.4rem',
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </button>

              <button
                type="button"
                onClick={downloadPDF}
                style={{
                  height: 38,
                  padding: '0 1rem',
                  borderRadius: 10,
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  color: '#374151',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.4rem',
                }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4" />
                </svg>
                PDF
              </button>

              <button
                type="button"
                onClick={onEdit}
                style={{
                  height: 38,
                  padding: '0 1.2rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg,#991B1B,#DC2626)',
                  border: 'none',
                  color: 'white',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.4rem',
                  boxShadow: '0 4px 12px rgba(220,38,38,.25)',
                }}
              >
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
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
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 400 }}
        onClick={onCancel}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          zIndex: 401,
          background: 'rgba(255,255,255,.97)',
          backdropFilter: 'blur(18px)',
          borderRadius: 22,
          padding: 'clamp(1.5rem,4vw,2rem)',
          width: 'min(440px,calc(100vw - 2rem))',
          border: '1px solid rgba(220,38,38,.15)',
          boxShadow: '0 24px 60px rgba(220,38,38,.12)',
        }}
      > <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
            <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.4rem' }}>
          Supprimer ce projet&nbsp;?
        </h2>
        <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600, lineHeight: 1.55 }}>
          <strong style={{ color: '#111827' }}>{project.title}</strong> sera supprimé définitivement.
        </p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid rgba(220,38,38,.18)', background: 'rgba(249,250,251,.95)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.35)', opacity: busy ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}
          >
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
  const [items, setItems] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const load = useCallback(
    async (qVal?: string, sVal?: string) => {
      setError(null);
      setLoading(true);
      try {
        const response = await api.listProjects({
          page: 1,
          pageSize: 100,
          q: (qVal ?? q) || undefined,
          status: (sVal ?? status) || undefined,
        });
        setItems(response?.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement projets');
      } finally {
        setLoading(false);
      }
    },
    [q, status]
  );

  useEffect(() => {
    void load('', '');
  }, [load]);

  async function handleDelete(project: Project) {
    setBusyId(project.id);
    setDeleteTarget(null);
    try {
      await api.deleteProject(project.id);
      if (detailProject?.id === project.id) setDetailProject(null);
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
        setModalOpen(false);
      }
      await load(q, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setBusyId(null);
    }
  }

  const inProgress = items.filter((p) => p.status === 'IN_PROGRESS').length;
  const pending = items.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const completed = items.filter((p) => p.status === 'COMPLETED').length;

  const thStyle: CSSProperties = {
    padding: '.75rem 1.2rem',
    fontSize: '.63rem',
    fontWeight: 900,
    letterSpacing: '.11em',
    textTransform: 'uppercase',
    color: '#374151',
    background: 'rgba(254,242,242,.35)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };

  const tdStyle: CSSProperties = {
    padding: '.9rem 1.2rem',
    fontSize: '.84rem',
    color: '#111827',
    verticalAlign: 'middle',
  };

  return (
    <AppShell title="Projets (pilotage global)">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        .spj-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1280px;margin:0 auto}

        .spj-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:spjin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .spj-eyebrow{font-size:.67rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .spj-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:spjpulse 2s ease-in-out infinite}
        @keyframes spjpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .spj-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .spj-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .spj-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:spjin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:700px){.spj-stats{grid-template-columns:repeat(2,1fr)}}
        .spj-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem 1rem}
        .spj-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .spj-stat-lbl{font-size:.64rem;font-weight:900;color:#6B7280;text-transform:uppercase;letter-spacing:.07em}

        .spj-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:spjin .5s .14s cubic-bezier(.22,1,.36,1) forwards}
        .spj-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .spj-panel-titlerow{display:flex;align-items:center;gap:.55rem}
        .spj-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .spj-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .spj-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}
        .spj-new-btn{height:38px;padding:0 1rem;border-radius:10px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:900;cursor:pointer;display:flex;align-items:center;gap:.4rem;box-shadow:0 3px 10px rgba(220,38,38,.3);transition:all .18s;white-space:nowrap}
        .spj-new-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(220,38,38,.42)}

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

        .spj-chips{display:flex;gap:.5rem;flex-wrap:wrap;padding:.7rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.05);background:rgba(254,242,242,.12)}
        .spj-chip{display:inline-flex;align-items:center;gap:.28rem;font-size:.68rem;font-weight:900;border-radius:99px;padding:.22rem .6rem;border:1px solid;cursor:pointer;transition:all .15s;background:transparent}

        .spj-tw{overflow-x:auto}
        .spj-table{width:100%;border-collapse:collapse;min-width:620px}
        .spj-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .spj-table tbody tr{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s;animation:spjin .4s cubic-bezier(.22,1,.36,1) both;cursor:pointer}
        .spj-table tbody tr:last-child{border-bottom:none}
        .spj-table tbody tr:hover{background:rgba(220,38,38,.02)}

        /* Row hover hint */
        .spj-table tbody tr:hover td:last-child::after{content:'Voir →';font-size:.65rem;font-weight:800;color:#DC262655;margin-left:.5rem}

        .spj-project-title{font-weight:900;font-size:.9rem;color:#0F172A}
        .spj-project-desc{font-size:.73rem;font-weight:600;color:#6B7280;margin-top:2px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .spj-date{font-family:'DM Mono',monospace;font-size:.73rem;font-weight:600;color:#6B7280}

        .spj-mob{display:none;flex-direction:column}
        @media(max-width:700px){.spj-tw{display:none}.spj-mob{display:flex}}
        .spj-mc{padding:1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:spjin .4s cubic-bezier(.22,1,.36,1) both;cursor:pointer;transition:background .15s}
        .spj-mc:hover{background:rgba(220,38,38,.015)}
        .spj-mc:last-child{border-bottom:none}
        .spj-mc-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.6rem;margin-bottom:.55rem}
        .spj-mc-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-top:.6rem}
        .spj-mc-hint{font-size:.67rem;font-weight:800;color:#DC262666;display:flex;align-items:center;gap:.2rem}

        .spj-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .spj-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:spjspin .8s linear infinite}
        .spj-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}
        .spj-empty{display:flex;flex-direction:column;align-items:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .spj-empty-title{font-size:.9rem;font-weight:900;color:#374151}
        .spj-empty-sub{font-size:.78rem;font-weight:600}

        @keyframes spjin{to{opacity:1;transform:translateY(0)}}
        @keyframes spjspin{to{transform:rotate(360deg)}}
        @keyframes spjModalPop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
      `}</style>

      <div className="spj-wrap">
        <div className="spj-header">
          <div className="spj-eyebrow">
            <div className="spj-dot" />
            Super Admin
          </div>
          <h1 className="spj-title">
            Projets — <span>pilotage global</span>
          </h1>
        </div>

        <div className="spj-stats">
          {[
            { label: 'Total projets', value: items.length, color: '#DC2626' },
            { label: 'En cours', value: inProgress, color: '#059669' },
            { label: 'En attente', value: pending, color: '#D97706' },
            { label: 'Terminés', value: completed, color: '#0E7490' },
          ].map((stat) => (
            <div key={stat.label} className="spj-stat" style={{ borderTopColor: stat.color }}>
              <div className="spj-stat-val" style={{ color: stat.color }}>{stat.value}</div>
              <div className="spj-stat-lbl">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="spj-panel">
          <div className="spj-panel-head">
            <div className="spj-panel-titlerow">
              <div className="spj-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <span className="spj-panel-title">Projets actifs et terminés</span>
              {items.length > 0 && <span className="spj-count-chip">{items.length}</span>}
            </div>

            <button
              type="button"
              className="spj-new-btn"
              onClick={() => { setSelectedProject(null); setModalOpen(true); }}
            >
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.8">
                <path strokeLinecap="round" d="M12 4v16m8-8H4" />
              </svg>
              Nouveau projet
            </button>
          </div>

          <div className="spj-toolbar">
            <div className="spj-field spj-field-grow">
              <label className="spj-label">Recherche</label>
              <div className="spj-sw">
                <span className="spj-si">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                  </svg>
                </span>
                <input
                  className="spj-input"
                  type="text"
                  placeholder="Recherche par titre…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void load(q, status); }}
                />
              </div>
            </div>

            <div className="spj-field">
              <label className="spj-label">Statut</label>
              <select className="spj-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tous statuts</option>
                <option value="DRAFT">Brouillon</option>
                <option value="PENDING_APPROVAL">En attente approbation</option>
                <option value="APPROVED">Approuvé</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="COMPLETED">Terminé</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="CANCELLED">Annulé</option>
              </select>
            </div>

            <button
              type="button"
              className="spj-filter-btn"
              disabled={loading}
              onClick={() => void load(q, status)}
            >
              {loading ? (
                <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spjspin .7s linear infinite' }} />Chargement…</>
              ) : (
                <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>Filtrer</>
              )}
            </button>
          </div>

          {!loading && items.length > 0 && (
            <div className="spj-chips">
              {(Object.entries(STATUS_MAP) as [ProjectStatus, { label: string; color: string; bg: string; border: string }][]).map(([key, current]) => {
                const count = items.filter((p) => p.status === key).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    className="spj-chip"
                    style={{ color: current.color, background: current.bg, borderColor: current.border }}
                    onClick={() => { setStatus(key); void load(q, key); }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: current.color, flexShrink: 0 }} />
                    {current.label}
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: '.66rem', fontWeight: 700, marginLeft: '.1rem' }}>{count}</span>
                  </button>
                );
              })}
              {status && (
                <button
                  type="button"
                  className="spj-chip"
                  style={{ color: '#6B7280', background: '#F9FAFB', borderColor: '#E5E7EB' }}
                  onClick={() => { setStatus(''); void load(q, ''); }}
                >
                  <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  Réinitialiser
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="spj-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="spj-loader"><div className="spj-ring" />Chargement…</div>
          ) : !error && items.length === 0 ? (
            <div className="spj-empty">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <div className="spj-empty-title">Aucun projet trouvé</div>
              <div className="spj-empty-sub">Essayez de modifier la recherche ou le filtre de statut.</div>
            </div>
          ) : !error ? (
            <>
              <div className="spj-tw">
                <table className="spj-table">
                  <thead>
                    <tr>
                      <th style={thStyle}>Projet</th>
                      <th style={thStyle}>Statut</th>
                      <th style={thStyle}>Budget</th>
                      <th style={thStyle}>Début</th>
                      <th style={thStyle}>Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((project, index) => (
                      <tr
                        key={project.id}
                        style={{ animationDelay: `${index * 0.035}s` }}
                        onClick={() => setDetailProject(project)}
                      >
                        <td style={tdStyle}>
                          <div className="spj-project-title">{project.title}</div>
                          {project.description && (
                            <div className="spj-project-desc">{project.description}</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <StatusBadge status={project.status} />
                        </td>
                        <td style={tdStyle}>
                          <BudgetBar planned={project.budgetPlanned} spent={project.budgetSpent} />
                        </td>
                        <td style={tdStyle}>
                          <span className="spj-date">
                            {project.startsAt ? formatDate(project.startsAt) : <span style={{ color: '#D1D5DB' }}>—</span>}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span className="spj-date">
                            {project.endsAt ? formatDate(project.endsAt) : <span style={{ color: '#D1D5DB' }}>—</span>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="spj-mob">
                {items.map((project, index) => (
                  <div
                    key={project.id}
                    className="spj-mc"
                    style={{ animationDelay: `${index * 0.035}s` }}
                    onClick={() => setDetailProject(project)}
                  >
                    <div className="spj-mc-top">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="spj-project-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.title}
                        </div>
                        {project.description && (
                          <div className="spj-project-desc">{project.description}</div>
                        )}
                      </div>
                      <StatusBadge status={project.status} />
                    </div>
                    <BudgetBar planned={project.budgetPlanned} spent={project.budgetSpent} />
                    <div className="spj-mc-footer">
                      <span className="spj-date">
                        {project.startsAt ? formatDate(project.startsAt) : '—'}
                        {project.endsAt ? ` → ${formatDate(project.endsAt)}` : ''}
                      </span>
                      <span className="spj-mc-hint">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Voir détails
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {detailProject && (
        <ProjectDetailModal
          key={detailProject.id}
          project={detailProject}
          onClose={() => setDetailProject(null)}
          onEdit={() => {
            setSelectedProject(detailProject);
            setModalOpen(true);
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

      {modalOpen && (
        <ProjectFormModal
          project={selectedProject}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            setSelectedProject(null);
            void load(q, status);
          }}
        />
      )}
    </AppShell>
  );
}