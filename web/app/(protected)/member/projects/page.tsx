// web/app/(protected)/member/projects/page.tsx
// v2.0 — CHANGELOG :
// 🔥 CORRIGÉ (ProjectDetailModal) : project.summary dans le header n'avait
//    aucune limite de lignes, pouvait écraser la zone défilante en dessous
//    sur un résumé long. Fix : clamp 2 lignes + minHeight: 0 sur le corps
//    scrollable (même correctif que sur les pages admin/super-admin/projects).
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Project } from '../../../../types/project';
import { formatCurrency, formatDate } from '../../../../lib/format';

/* ─────────────────────────────────────────────────────────────────────────────
   RichProject : on étend le type Project avec les champs avancés que l'admin
   peut saisir (admin/projects/page.tsx). Le cast `as RichProject[]` n'est fait
   qu'une seule fois, lors du setItems — jamais dans le JSX.
───────────────────────────────────────────────────────────────────────────── */
interface RichAttachment {
  id?:        string;
  url:        string;
  fileName?:  string | null;
  mimeType?:  string | null;
  sizeBytes?: number | null;
}

interface RichProject extends Project {
  summary?:              string | null;
  locationText?:         string | null;
  promoterName?:         string | null;
  targetBeneficiaries?:  string | null;
  populationImpact?:     string | null;
  environmentalImpact?:  string | null;
  specificObjectives?:   string | null;
  successIndicators?:    string | null;
  implementationMethod?: string | null;
  risksAndMitigation?:   string | null;
  expectedResults?:      string | null;
  /* Galerie photos uploadée via PhotoDropZone côté admin */
  photos?: RichAttachment[] | null;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: '',             label: 'Tous les projets' },
  { value: 'PROPOSED',     label: 'Brouillons' },
  { value: 'APPROVED',     label: 'Approuvés' },
  { value: 'IN_PROGRESS',  label: 'En cours' },
  { value: 'COMPLETED',    label: 'Terminés' },
];

function getStatusCfg(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string; bar: string }> = {
    PROPOSED:    { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', bar: '#9CA3AF' },
    APPROVED:    { label: 'Approuvé',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', bar: '#10B981' },
    IN_PROGRESS: { label: 'En cours',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', bar: '#3B82F6' },
    COMPLETED:   { label: 'Terminé',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', bar: '#8B5CF6' },
  };
  return map[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', bar: '#9CA3AF' };
}

/* ─── BudgetBar ───────────────────────────────────────────────────────────── */
function BudgetBar({ planned, spent }: { planned?: number | null; spent?: number | null }) {
  if (!planned || planned === 0) return <span style={{ color: '#CBD5E1', fontSize: '0.72rem' }}>—</span>;
  const pct  = Math.min(((spent ?? 0) / planned) * 100, 100);
  const over = (spent ?? 0) > planned;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#6B7280', fontWeight: 600 }}>
        <span>{formatCurrency(spent ?? 0)}</span>
        <span style={{ color: over ? '#DC2626' : '#94A3B8' }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: over ? 'linear-gradient(90deg,#F97316,#DC2626)' : pct > 75 ? '#F59E0B' : '#3B82F6', transition: 'width 0.8s cubic-bezier(.22,1,.36,1)' }} />
      </div>
      <div style={{ fontSize: '0.62rem', color: '#CBD5E1' }}>/ {formatCurrency(planned)}</div>
    </div>
  );
}

/* ── InfoSection : composant déclaré au niveau module (pas dans un render) ── */
interface InfoField { label: string; value: string | null | undefined }

function InfoSection({
  fields, title, icon, bgColor, borderColor, titleColor,
}: {
  fields: InfoField[];
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  titleColor: string;
}) {
  const visible = fields.filter(f => !!f.value);
  if (visible.length === 0) return null;
  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', background: bgColor, borderRadius: 14, border: `1px solid ${borderColor}` }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: titleColor, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.38rem' }}>
        {icon}
        {title}
      </div>
      <div style={{ display: 'grid', gap: '0.65rem' }}>
        {visible.map(f => (
          <div key={f.label}>
            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: titleColor, opacity: 0.7, textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: '0.22rem' }}>{f.label}</div>
            <div style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODALE DÉTAIL ENRICHIE
   — Reçoit RichProject, accède directement aux champs typés, jamais de cast
══════════════════════════════════════════════════════════════════════════════ */
function ProjectDetailModal({ project, onClose }: { project: RichProject; onClose: () => void }) {
  const cfg      = getStatusCfg(project.status);
  const budgetPct  = project.budgetPlanned && project.budgetPlanned > 0
    ? Math.min(((project.budgetSpent ?? 0) / project.budgetPlanned) * 100, 100) : 0;
  const budgetOver = (project.budgetSpent ?? 0) > (project.budgetPlanned ?? 0);
  const budgetCol  = budgetOver ? '#DC2626' : budgetPct > 80 ? '#D97706' : '#2563EB';

  /* ── Sources multimédias ─────────────────────────────────────────────────
     L'admin peut uploader des photos via PhotoDropZone (→ project.photos[])
     ET joindre des fichiers divers (→ project.attachments[]).
     On fusionne les deux, puis on sépare images / documents.
  ────────────────────────────────────────────────────────────────────────── */
  const dedicatedPhotos  = (project.photos      ?? []) as RichAttachment[];
  const allAttachments   = (project.attachments ?? []) as RichAttachment[];

  // Images présentes dans attachments
  const attachmentImages = allAttachments.filter(a =>
    a.mimeType?.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif)$/i.test(a.fileName ?? a.url ?? ''),
  );

  // Fusion sans doublons : photos dédiées d'abord, puis images en attachments
  const photos = [
    ...dedicatedPhotos,
    ...attachmentImages.filter(ai =>
      !dedicatedPhotos.some(dp => dp.url === ai.url),
    ),
  ];

  // Documents = tout ce qui n'est PAS une image dans attachments
  const docs = allAttachments.filter(a => !attachmentImages.includes(a));

  const [activePhoto, setActivePhoto] = useState(0);

  function fileIcon(mime?: string | null): string {
    if (mime?.includes('pdf'))   return '📄';
    if (mime?.includes('word') || mime?.includes('document')) return '📝';
    if (mime?.includes('sheet') || mime?.includes('excel'))   return '📊';
    if (mime?.includes('image')) return '🖼';
    return '📎';
  }

  function fmtSize(bytes?: number | null): string {
    if (!bytes) return '';
    if (bytes < 1024)        return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(10,20,40,0.52)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', animation: 'mpmodalin 0.22s ease' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 660, background: 'rgba(250,252,255,0.98)', borderRadius: 26, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(10,20,40,0.28), 0 0 0 1px rgba(255,255,255,0.9) inset', animation: 'mpscalein 0.3s cubic-bezier(.22,1,.36,1)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >

        {/* Barre colorée */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.bar}, ${cfg.color})`, flexShrink: 0 }} />

        {/* ── Header ── */}
        <div style={{ padding: '1.2rem 1.4rem 1rem', borderBottom: '1px solid rgba(37,99,235,0.08)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.62rem', fontWeight: 800, border: `1px solid ${cfg.border}`, color: cfg.color, background: cfg.bg, borderRadius: 99, padding: '0.2rem 0.6rem', marginBottom: '0.55rem', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, animation: 'mppulse 2s ease-in-out infinite' }} />
              {cfg.label}
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(1.2rem,3vw,1.6rem)', fontWeight: 700, color: '#0F172A', lineHeight: 1.18, margin: 0 }}>
              {project.title}
            </h2>
            {project.summary && (
              // ── CORRIGÉ : limité à 2 lignes (ellipse) — un résumé long ne
              // doit plus pouvoir dominer le header et réduire d'autant la
              // zone défilante en dessous. La description complète (non
              // tronquée) reste consultable plus bas dans le corps.
              <p
                style={{
                  margin: '0.35rem 0 0',
                  fontSize: '0.82rem',
                  color: '#64748B',
                  lineHeight: 1.5,
                  fontWeight: 500,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {project.summary}
              </p>
            )}
            {project.locationText && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.4rem', fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {project.locationText}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', background: '#F1F5F9', border: '1px solid #E2E8F0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Corps scrollable ── */}
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '1.1rem 1.4rem 1.5rem' }}>

          {/* ── Galerie photos (Ajoutée) ── */}
          {photos.length > 0 && (
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
                Photos ({photos.length})
              </div>

              {/* Image principale */}
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(37,99,235,0.1)', aspectRatio: '16/9', background: '#F8FAFC', marginBottom: '0.55rem', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photos[activePhoto]?.url} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActivePhoto(p => Math.max(p - 1, 0))}
                      disabled={activePhoto === 0}
                      style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(15,23,42,0.55)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activePhoto === 0 ? 0.3 : 1 }}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhoto(p => Math.min(p + 1, photos.length - 1))}
                      disabled={activePhoto === photos.length - 1}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(15,23,42,0.55)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activePhoto === photos.length - 1 ? 0.3 : 1 }}
                    >
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </button>
                    <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '4px' }}>
                      {photos.map((_, i) => (
                        <button key={i} type="button" onClick={() => setActivePhoto(i)} style={{ width: i === activePhoto ? 18 : 6, height: 6, borderRadius: 99, background: i === activePhoto ? 'white' : 'rgba(255,255,255,0.45)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Miniatures */}
              {photos.length > 1 && (
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {photos.map((ph, i) => (
                    <button key={i} type="button" onClick={() => setActivePhoto(i)} style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', border: `2px solid ${i === activePhoto ? '#2563EB' : 'transparent'}`, padding: 0, cursor: 'pointer', background: '#F8FAFC', transition: 'border-color 0.18s', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {project.description && (
            <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Description</div>
              <p style={{ fontSize: '0.84rem', color: '#374151', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{project.description}</p>
            </div>
          )}

          {/* Promoteur */}
          {project.promoterName && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#EFF6FF,#DBEAFE)', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.18rem' }}>Promoteur / Porteur</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>{project.promoterName}</div>
              </div>
            </div>
          )}

          {/* Grille dates + budgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.45rem' }}>Début</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
                {project.startsAt ? formatDate(project.startsAt) : <span style={{ color: '#D1D5DB' }}>—</span>}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.45rem' }}>Fin prévue</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
                {project.endsAt ? formatDate(project.endsAt) : <span style={{ color: '#D1D5DB' }}>—</span>}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.45rem' }}>Budget prévu</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
                {project.budgetPlanned != null ? formatCurrency(project.budgetPlanned) : <span style={{ color: '#D1D5DB' }}>—</span>}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.45rem' }}>Budget dépensé</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.1rem', fontWeight: 700, color: budgetOver ? '#DC2626' : '#111827' }}>
                {project.budgetSpent != null ? formatCurrency(project.budgetSpent) : <span style={{ color: '#D1D5DB' }}>—</span>}
              </div>
            </div>
          </div>

          {/* Barre budget */}
          {project.budgetPlanned != null && project.budgetPlanned > 0 && (
            <div style={{ marginBottom: '1rem', background: '#F8FAFC', borderRadius: 14, padding: '0.9rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Avancement budgétaire</div>
                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: budgetCol }}>
                  {Math.round(budgetPct)}%{budgetOver ? ' ⚠ Dépassement' : ''}
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${budgetPct}%`, background: budgetOver ? 'linear-gradient(90deg,#F97316,#DC2626)' : budgetPct > 80 ? '#F59E0B' : `linear-gradient(90deg,${cfg.bar},${cfg.color})`, transition: 'width 0.9s cubic-bezier(.22,1,.36,1)' }} />
              </div>
            </div>
          )}

          {/* Impact & Objectifs */}
          <InfoSection
            title="Impact & Objectifs"
            icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>}
            bgColor="linear-gradient(135deg,rgba(239,246,255,0.7),rgba(245,243,255,0.5))"
            borderColor="rgba(37,99,235,0.12)"
            titleColor="#1D4ED8"
            fields={[
              { label: 'Bénéficiaires cibles',  value: project.targetBeneficiaries },
              { label: 'Impact population',     value: project.populationImpact },
              { label: 'Impact environnemental', value: project.environmentalImpact },
              { label: 'Objectifs spécifiques',  value: project.specificObjectives },
              { label: 'Indicateurs de succès',  value: project.successIndicators },
            ]}
          />

          {/* Exécution & Risques */}
          <InfoSection
            title="Exécution & Risques"
            icon={<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>}
            bgColor="rgba(255,251,235,0.8)"
            borderColor="#FDE68A"
            titleColor="#B45309"
            fields={[
              { label: "Méthode d'implémentation", value: project.implementationMethod },
              { label: 'Risques & Mitigations',    value: project.risksAndMitigation },
              { label: 'Résultats attendus',        value: project.expectedResults },
            ]}
          />

          {/* Documents téléchargeables */}
          {docs.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '0.9rem 1rem', background: '#F8FAFC', borderRadius: 14, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
                Documents ({docs.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {docs.map((doc, i) => (
                  <a key={doc.id ?? i} href={doc.url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', background: 'white', borderRadius: 10, border: '1px solid rgba(37,99,235,0.12)', textDecoration: 'none', boxShadow: '0 1px 3px rgba(37,99,235,0.05)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                      {fileIcon(doc.mimeType)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.fileName ?? `Document ${i + 1}`}
                      </div>
                      {doc.sizeBytes != null && (
                        <div style={{ fontSize: '0.64rem', color: '#94A3B8', marginTop: '1px' }}>{fmtSize(doc.sizeBytes)}</div>
                      )}
                    </div>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4"/>
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Dates système */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '0.75rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Créé le</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{formatDate(project.createdAt)}</div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '0.75rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>Mis à jour</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{formatDate(project.updatedAt)}</div>
            </div>
          </div>

          {/* CTA proposer */}
          <div style={{ padding: '0.9rem 1rem', background: 'linear-gradient(135deg,#EFF6FF,#F5F3FF)', borderRadius: 14, border: '1px solid rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#1D4ED8', marginBottom: '0.18rem' }}>Vous avez une idée ?</div>
              <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Proposez un projet à votre antenne</div>
            </div>
            <Link href="/member/projects/propose" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', color: 'white', borderRadius: 10, textDecoration: 'none', fontSize: '0.76rem', fontWeight: 700, boxShadow: '0 3px 10px rgba(37,99,235,0.25)' }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              Proposer
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE 
══════════════════════════════════════════════════════════════════════════════ */
export default function MemberProjectsPage() {
  const [items,           setItems]           = useState<RichProject[]>([]);
  const [q,               setQ]               = useState('');
  const [status,          setStatus]          = useState('');
  const [error,           setError]           = useState<string | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [view,            setView]            = useState<'grid' | 'list'>('grid');
  const [selectedProject, setSelectedProject] = useState<RichProject | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listProjectsForMembers({ page: 1, pageSize: 100 });
        setItems(res.items as RichProject[]);
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
        q:      searchQ      || undefined,
        status: searchStatus || undefined,
      });
      setItems(res.items as RichProject[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement projets');
    } finally {
      setLoading(false);
    }
  };

  const draftCount = items.filter(p => p.status === 'PROPOSED').length;
  const approved   = items.filter(p => p.status === 'APPROVED').length;
  const inProgress = items.filter(p => p.status === 'IN_PROGRESS').length;
  const completed  = items.filter(p => p.status === 'COMPLETED').length;

  return (
    <AppShell title="Projets">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');

        @keyframes mpmodalin { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mpscalein { from { opacity: 0; transform: scale(0.93) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes mppulse   { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes mpin { to { opacity: 1; transform: translateY(0); } }
        @keyframes mpspin { to { transform: rotate(360deg); } }

        .mp-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; box-sizing: border-box; width: 100%; }

        /* ── HEADER MODIFIÉ ── */
        .mp-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; opacity: 0; animation: mpin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .mp-header-text { display: flex; flex-direction: column; }
        .mp-eyebrow { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .mp-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: mppulse 2s ease-in-out infinite; }
        .mp-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 4vw, 2rem); font-weight: 700; color: #111827; letter-spacing: -0.02em; line-height: 1.15; margin: 0; }
        .mp-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .mp-propose-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; height: 42px; padding: 0 1.2rem; background: linear-gradient(135deg,#1D4ED8,#2563EB); color: white; border-radius: 11px; text-decoration: none; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; box-shadow: 0 4px 14px rgba(37,99,235,0.28); transition: transform 0.15s, box-shadow 0.2s; white-space: nowrap; flex-shrink: 0; }
        .mp-propose-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(37,99,235,0.38); }

        /* ── CARTES STATISTIQUES ── */
        .mp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; opacity: 0; animation: mpin 0.5s 0.08s cubic-bezier(.22,1,.36,1) forwards; }
        .mp-stat-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 1.2rem 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-bottom: 4px solid; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .mp-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 700; line-height: 1; margin-bottom: 0.3rem; }
        .mp-stat-lbl { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; }

        /* ── TOOLBAR RECHERCHE & FILTRES (CORRIGÉ MOBILE) ── */
        .mp-toolbar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; width: 100%; box-sizing: border-box; margin-bottom: 1.5rem; opacity: 0; animation: mpin 0.5s 0.12s cubic-bezier(.22,1,.36,1) forwards; }
        .mp-search-wrap { position: relative; flex: 1 1 200px; min-width: 150px; }
        .mp-search-ico { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .mp-search-input { width: 100%; height: 42px; border-radius: 10px; border: 1px solid #CBD5E1; padding: 0 0.8rem 0 2.2rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
        .mp-search-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .mp-search-input::placeholder { color: rgba(107,114,128,0.5); }
        
        .mp-select { flex: 0 1 auto; min-width: 140px; height: 42px; border-radius: 10px; border: 1px solid #CBD5E1; padding: 0 2rem 0 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; appearance: none; background-color: white; color: #111827; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.7rem center; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
        .mp-select:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); outline: none; }

        .mp-view-toggle { display: flex; gap: 0.3rem; flex-shrink: 0; }
        .mp-view-btn { width: 42px; height: 42px; border-radius: 10px; border: 1px solid #CBD5E1; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s; }
        .mp-view-btn.active { background: #EFF6FF; border-color: #2563EB; color: #2563EB; }
        .mp-view-btn:hover:not(.active) { background: #F8FAFC; color: #111827; }

        /* ── RESPONSIVE MOBILE ── */
        @media (max-width: 640px) {
          .mp-header { align-items: center; margin-bottom: 1.25rem; }
          .mp-title { font-size: 1.4rem !important; }
          .mp-propose-btn { height: 38px; padding: 0 0.85rem; font-size: 0.75rem; }
          /* Grille de stats : 2 par ligne */
          .mp-stats { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1.5rem; }
          .mp-stat-card { padding: 0.85rem 0.5rem; border-radius: 12px; }
          .mp-stat-val { font-size: 1.5rem; }
          .mp-stat-lbl { font-size: 0.55rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        }

        @media (max-width: 500px) {
          /* Flexbox wrap pour que la recherche et le select ne soient pas écrasés */
          .mp-toolbar { gap: 0.5rem; flex-wrap: wrap; }
          .mp-search-wrap { flex: 1 1 100%; }
          .mp-select { flex: 1 1 100%; }
          .mp-search-input, .mp-select, .mp-view-btn { height: 40px; font-size: 0.8rem; }
          .mp-search-input { padding-left: 1.8rem; }
          .mp-search-ico { left: 0.6rem; width: 14px; height: 14px; }
          .mp-select { padding: 0 1.5rem 0 0.6rem; background-position: right 0.5rem center; }
          .mp-view-toggle { display: none; }
        }

        .mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; opacity: 0; animation: mpin 0.5s 0.16s cubic-bezier(.22,1,.36,1) forwards; }
        @media (max-width: 600px) { .mp-grid { grid-template-columns: 1fr; } }

        .mp-card { background: rgba(253,253,255,0.92); backdrop-filter: blur(10px); border-radius: 18px; border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .mp-card:hover { transform: translateY(-4px); box-shadow: 0 14px 32px rgba(37,99,235,0.13), 0 0 0 1px rgba(255,255,255,0.9) inset; }
        .mp-card:hover .mp-card-cta { opacity: 1; transform: translateY(0); }
        .mp-card-accent { height: 3px; }
        .mp-card-body { padding: 1.1rem 1.2rem; flex: 1; display: flex; flex-direction: column; gap: 0.65rem; }
        .mp-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; }
        .mp-card-title { font-size: 0.9rem; font-weight: 700; color: #111827; line-height: 1.35; flex: 1; }
        .mp-status-badge { display: inline-flex; align-items: center; gap: 0.22rem; font-size: 0.62rem; font-weight: 700; border-radius: 99px; padding: 0.18rem 0.55rem; white-space: nowrap; border: 1px solid; flex-shrink: 0; }
        .mp-status-dot { width: 4px; height: 4px; border-radius: 50%; }
        .mp-card-dates { font-size: 0.72rem; color: #9CA3AF; display: flex; align-items: center; gap: 0.35rem; }
        .mp-card-budget { margin-top: auto; }
        .mp-card-cta { display: flex; align-items: center; justify-content: center; gap: 0.4rem; padding: 0.6rem; font-size: 0.72rem; font-weight: 700; color: #2563EB; border-top: 1px solid rgba(37,99,235,0.08); background: rgba(239,246,255,0.5); opacity: 0; transform: translateY(4px); transition: opacity 0.2s, transform 0.2s; }

        .mp-list { display: flex; flex-direction: column; gap: 0; background: rgba(253,253,255,0.92); backdrop-filter: blur(10px); border-radius: 18px; border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset; overflow: hidden; opacity: 0; animation: mpin 0.5s 0.16s cubic-bezier(.22,1,.36,1) forwards; }        
        .mp-list-head { display: grid; grid-template-columns: 1fr 110px 120px 140px 140px 36px; padding: 0.7rem 1.2rem; border-bottom: 1px solid rgba(37,99,235,0.07); }
        .mp-list-head span { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: #9CA3AF; }
        .mp-list-row { display: grid; grid-template-columns: 1fr 110px 120px 140px 140px 36px; padding: 0.85rem 1.2rem; border-bottom: 1px solid rgba(37,99,235,0.05); align-items: center; transition: background 0.15s; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .mp-list-row:last-child { border-bottom: none; }
        .mp-list-row:hover { background: rgba(37,99,235,0.03); }
        @media (max-width: 768px) { .mp-list-head { display: none; } .mp-list-row { grid-template-columns: 1fr auto; gap: 0.5rem; } .mp-list-row > *:nth-child(3), .mp-list-row > *:nth-child(4), .mp-list-row > *:nth-child(5) { display: none; } }
        .mp-list-title { font-size: 0.83rem; font-weight: 700; color: #111827; }
        .mp-list-sub { font-size: 0.7rem; color: #9CA3AF; margin-top: 2px; }
        .mp-chevron { color: #D1D5DB; display: flex; align-items: center; justify-content: flex-end; }

        .mp-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; gap: 0.75rem; color: #9CA3AF; }
        .mp-empty-ico { width: 52px; height: 52px; border-radius: 50%; background: #F9FAFB; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; }
        .mp-empty p { font-size: 0.82rem; font-weight: 500; }
        .mp-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; }
        .mp-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: mpspin 0.8s linear infinite; }
        .mp-error { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.3rem; color: #B91C1C; font-size: 0.8rem; }
      `}</style>

      <div className="mp-wrap">

        {/* HEADER */}
        <div className="mp-header">
          <div className="mp-header-text">
            <div className="mp-eyebrow"><div className="mp-eyebrow-dot" />Espace membre</div>
            <h1 className="mp-title">Projets de <span>l&apos;association</span></h1>
          </div>
          <Link href="/member/projects/propose" className="mp-propose-btn">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
            Proposer un projet
          </Link>
        </div>

        {/* CARTES STATISTIQUES */}
        <div className="mp-stats">
          <div className="mp-stat-card" style={{ borderBottomColor: '#6B7280' }}>
            <span className="mp-stat-val" style={{ color: '#4B5563' }}>{draftCount}</span>
            <span className="mp-stat-lbl">Brouillons</span>
          </div>
          <div className="mp-stat-card" style={{ borderBottomColor: '#059669' }}>
            <span className="mp-stat-val" style={{ color: '#047857' }}>{approved}</span>
            <span className="mp-stat-lbl">Approuvés</span>
          </div>
          <div className="mp-stat-card" style={{ borderBottomColor: '#2563EB' }}>
            <span className="mp-stat-val" style={{ color: '#1D4ED8' }}>{inProgress}</span>
            <span className="mp-stat-lbl">En cours</span>
          </div>
          <div className="mp-stat-card" style={{ borderBottomColor: '#7C3AED' }}>
            <span className="mp-stat-val" style={{ color: '#6D28D9' }}>{completed}</span>
            <span className="mp-stat-lbl">Terminés</span>
          </div>
        </div>

        {/* TOOLBAR RECHERCHE & FILTRES */}
        <div className="mp-toolbar">
          <div className="mp-search-wrap">
            <span className="mp-search-ico">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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

          <select 
            className="mp-select" 
            value={status} 
            onChange={(e) => { 
              setStatus(e.target.value); 
              void handleFilter(q, e.target.value); 
            }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="mp-view-toggle">
            <button className={`mp-view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Vue grille">
              <svg width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1V2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V2zM1 7a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1V7zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1V7zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V7zM1 12a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H2a1 1 0 01-1-1v-2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H7a1 1 0 01-1-1v-2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z"/>
              </svg>
            </button>
            <button className={`mp-view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="Vue liste">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
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
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mp-empty">
            <div className="mp-empty-ico">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5"><path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p>Aucun projet trouvé</p>
          </div>
        ) : view === 'grid' ? (
          <div className="mp-grid">
            {items.map((p, i) => {
              const c = getStatusCfg(p.status);
              return (
                <div key={p.id} className="mp-card" style={{ animationDelay: `${0.04 * i}s` }} onClick={() => setSelectedProject(p)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSelectedProject(p)} aria-label={`Voir les détails de ${p.title}`}>
                  <div className="mp-card-accent" style={{ background: c.bar }} />
                  <div className="mp-card-body">
                    <div className="mp-card-top">
                      <div className="mp-card-title">{p.title}</div>
                      <div className="mp-status-badge" style={{ color: c.color, background: c.bg, borderColor: c.border }}>
                        <span className="mp-status-dot" style={{ background: c.color }} />
                        {c.label}
                      </div>
                    </div>
                    {p.description && (
                      <p style={{ fontSize: '0.76rem', color: '#6B7280', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {p.description}
                      </p>
                    )}
                    {(p.startsAt || p.endsAt) && (
                      <div className="mp-card-dates">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {formatDate(p.startsAt)}{p.endsAt && <> → {formatDate(p.endsAt)}</>}
                      </div>
                    )}
                    <div className="mp-card-budget">
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>Budget utilisé</div>
                      <BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} />
                    </div>
                  </div>
                  <div className="mp-card-cta">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Voir les détails
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mp-list">
            <div className="mp-list-head">
              <span>Projet</span><span>Statut</span><span>Budget prévu</span><span>Budget dépensé</span><span>Dates</span><span></span>
            </div>
            {items.map(p => {
              const c = getStatusCfg(p.status);
              return (
                <div key={p.id} className="mp-list-row" onClick={() => setSelectedProject(p)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSelectedProject(p)}>
                  <div>
                    <div className="mp-list-title">{p.title}</div>
                    {p.description && <div className="mp-list-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{p.description}</div>}
                  </div>
                  <div><div className="mp-status-badge" style={{ color: c.color, background: c.bg, borderColor: c.border, display: 'inline-flex' }}><span className="mp-status-dot" style={{ background: c.color }} />{c.label}</div></div>
                  <div style={{ color: '#374151', fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: '0.95rem' }}>{p.budgetPlanned != null ? formatCurrency(p.budgetPlanned) : '—'}</div>
                  <div><BudgetBar planned={p.budgetPlanned} spent={p.budgetSpent} /></div>
                  <div className="mp-card-dates" style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{formatDate(p.startsAt)}{p.endsAt ? ` → ${formatDate(p.endsAt)}` : ''}</div>
                  <div className="mp-chevron"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProject && (
        <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </AppShell>
  );
}