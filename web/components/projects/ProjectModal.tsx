//web/components/projects/ProjectModal.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api-client';
import type { Project, ProjectStatus } from '../../types/project';

/* ══════════════════════════════════════════════════ TYPES */
interface ProjectFormData {
  title: string;
  summary: string;
  description: string;
  status: ProjectStatus | '';
  locationText: string;
  promoterName: string;
  budgetPlanned: string;
  budgetSpent: string;
  startsAt: string;
  endsAt: string;
  targetBeneficiaries: string;
  populationImpact: string;
  environmentalImpact: string;
  implementationMethod: string;
  risksAndMitigation: string;
}

const EMPTY_FORM: ProjectFormData = {
  title: '',
  summary: '',
  description: '',
  status: '',
  locationText: '',
  promoterName: '',
  budgetPlanned: '',
  budgetSpent: '',
  startsAt: '',
  endsAt: '',
  targetBeneficiaries: '',
  populationImpact: '',
  environmentalImpact: '',
  implementationMethod: '',
  risksAndMitigation: '',
};

function toFormData(p: Project): ProjectFormData {
  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : '';
  return {
    title: p.title ?? '',
    summary: p.summary ?? '',
    description: p.description ?? '',
    status: p.status ?? '',
    locationText: p.locationText ?? '',
    promoterName: p.promoterName ?? '',
    budgetPlanned: p.budgetPlanned != null ? String(p.budgetPlanned) : '',
    budgetSpent: p.budgetSpent != null ? String(p.budgetSpent) : '',
    startsAt: fmtDate(p.startsAt),
    endsAt: fmtDate(p.endsAt),
    targetBeneficiaries: p.targetBeneficiaries ?? '',
    populationImpact: p.populationImpact ?? '',
    environmentalImpact: p.environmentalImpact ?? '',
    implementationMethod: p.implementationMethod ?? '',
    risksAndMitigation: p.risksAndMitigation ?? '',
  };
}

/* ══════════════════════════════════════════════════ SECTION */
function Section({
  icon,
  title,
  color,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 16,
        border: `1px solid ${color}20`,
        padding: '1.1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '.85rem',
        opacity: 0,
        animation: `pfmIn .45s ${delay}s cubic-bezier(.22,1,.36,1) forwards`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.5rem',
          paddingBottom: '.7rem',
          borderBottom: `1px solid ${color}18`,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: `${color}15`,
            border: `1px solid ${color}25`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: '.62rem',
            fontWeight: 900,
            letterSpacing: '.11em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════ FIELD */
function Field({
  label,
  required,
  hint,
  children,
  col = 1,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  col?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.28rem', gridColumn: col > 1 ? `span ${col}` : undefined }}>
      <label
        style={{
          fontFamily: "'DM Sans',sans-serif",
          fontSize: '.63rem',
          fontWeight: 800,
          color: '#475569',
          letterSpacing: '.06em',
          textTransform: 'uppercase',
          display: 'flex',
          gap: '.2rem',
          alignItems: 'center',
        }}
      >
        {label}
        {required && <span style={{ color: '#3B82F6' }}>*</span>}
      </label>
      {children}
      {hint && (
        <span style={{ fontSize: '.62rem', color: '#94A3B8', fontFamily: "'DM Sans',sans-serif" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════ MAIN */
export default function ProjectFormModal({
  project,
  onClose,
  onSaved,
}: {
  project?: Project | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(project);
  const [form, setForm] = useState<ProjectFormData>(
    project ? toFormData(project) : EMPTY_FORM
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setForm(project ? toFormData(project) : EMPTY_FORM);
    setError(null);
  }, [project]);

  function set(key: keyof ProjectFormData) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      setError('Le titre du projet est obligatoire.');
      return;
    }
    setBusy(true);
    setError(null);

    const common = {
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      description: form.description.trim() || undefined,
      status: (form.status as ProjectStatus) || undefined,
      locationText: form.locationText.trim() || undefined,
      promoterName: form.promoterName.trim() || undefined,
      targetBeneficiaries: form.targetBeneficiaries.trim() || undefined,
      populationImpact:    form.populationImpact.trim()    || undefined,
      environmentalImpact: form.environmentalImpact.trim() || undefined,
      implementationMethod: form.implementationMethod.trim() || undefined,
      risksAndMitigation:  form.risksAndMitigation.trim()  || undefined,
    };

    try {
      if (isEdit && project) {
        await api.updateProject(project.id, {
          ...common,
          // Correction des erreurs "Unexpected any"
          budgetAmount: form.budgetPlanned ? Number(form.budgetPlanned) : undefined,
          amountSpent:  form.budgetSpent   ? Number(form.budgetSpent)   : undefined,
          startDate: form.startsAt || undefined,
          endDate:   form.endsAt   || undefined,
        } as Parameters<typeof api.updateProject>[1]); // Cast global propre
      } else {
        await api.createProject({
          ...common,
          budgetPlanned: form.budgetPlanned ? Number(form.budgetPlanned) : undefined,
          budgetSpent:   form.budgetSpent   ? Number(form.budgetSpent)   : undefined,
          startsAt: form.startsAt || undefined,
          endsAt:   form.endsAt   || undefined,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  // Input style helpers
  const inp = (name: string): React.CSSProperties => ({
    width: '100%',
    height: 40,
    borderRadius: 10,
    border: focused === name ? '1.5px solid #3B82F6' : '1.5px solid #E2E8F0',
    // Changement ici : backgroundColor au lieu de background pour éviter les conflits
    backgroundColor: focused === name ? 'white' : 'rgba(248,250,252,0.7)',
    padding: '0 .85rem',
    fontFamily: "'DM Sans',sans-serif",
    fontSize: '.84rem',
    fontWeight: 600,
    color: '#0F172A',
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: focused === name ? '0 0 0 3px rgba(59,130,246,.1)' : 'none',
    transition: 'all .18s',
  });

  const ta = (name: string, minH = 80): React.CSSProperties => ({
    ...inp(name),
    height: 'auto',
    minHeight: minH,
    padding: '.65rem .85rem',
    resize: 'vertical',
    lineHeight: 1.55,
  });

  const sel = (name: string): React.CSSProperties => ({
    ...inp(name),
    appearance: 'none',
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right .75rem center',
    paddingRight: '2.2rem',
  });

  const fo = (name: string) => () => setFocused(name);
  const bl = () => setFocused(null);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes pfmIn { to { opacity: 1; transform: translateY(0) } }
        @keyframes pfmPop { from { opacity: 0; transform: scale(.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes pfmSpin { to { transform: rotate(360deg) } }
        .pfm-scroll::-webkit-scrollbar { width: 4px }
        .pfm-scroll::-webkit-scrollbar-track { background: transparent }
        .pfm-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px }
        .pfm-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8 }
        .pfm-inp:focus { border-color: #3B82F6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,.1) !important; backgroundColor: white !important }
        .pfm-inp::placeholder { color: rgba(148,163,184,.6); font-weight: 400 }
        .pfm-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem }
        @media (max-width: 540px) { .pfm-grid2 { grid-template-columns: 1fr } }
      `}</style>

      {/* BACKDROP */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,.55)',
          backdropFilter: 'blur(8px)',
          zIndex: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={onClose}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 660,
            maxHeight: '92vh',
            background: 'linear-gradient(160deg, rgba(248,250,252,0.98) 0%, rgba(239,246,255,0.97) 100%)',
            borderRadius: 24,
            border: '1px solid rgba(59,130,246,.14)',
            boxShadow: '0 30px 70px rgba(15,23,42,.2), 0 0 0 1px rgba(255,255,255,.9) inset',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'pfmPop .35s cubic-bezier(.22,1,.36,1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* HEADER */}
          <div
            style={{
              padding: '1.35rem 1.6rem 1.1rem',
              borderBottom: '1px solid rgba(59,130,246,.1)',
              background: 'linear-gradient(135deg, rgba(239,246,255,.9), rgba(248,250,252,.95))',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              flexShrink: 0,
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '.35rem',
                  fontSize: '.6rem',
                  fontWeight: 900,
                  color: '#3B82F6',
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  fontFamily: "'DM Sans',sans-serif",
                  marginBottom: '.3rem',
                  backgroundColor: 'rgba(59,130,246,.08)',
                  border: '1px solid rgba(59,130,246,.18)',
                  padding: '.18rem .55rem',
                  borderRadius: 99,
                }}
              >
                <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={isEdit
                    ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    : "M12 4v16m8-8H4"
                  } />
                </svg>
                {isEdit ? 'Modification' : 'Création'}
              </div>
              <h2
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: '1.55rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: 0,
                  lineHeight: 1.1,
                  letterSpacing: '-.01em',
                }}
              >
                {isEdit ? (
                  <>Modifier <span style={{ color: '#2563EB' }}>le projet</span></>
                ) : (
                  <>Nouveau <span style={{ color: '#2563EB' }}>projet</span></>
                )}
              </h2>
              {isEdit && project?.title && (
                <p
                  style={{
                    fontFamily: "'DM Sans',sans-serif",
                    fontSize: '.78rem',
                    color: '#64748B',
                    margin: '.3rem 0 0',
                    fontWeight: 500,
                  }}
                >
                  {project.title}
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
                backgroundColor: 'white',
                border: '1.5px solid #E2E8F0',
                color: '#64748B',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all .15s',
              }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* BODY */}
          <div
            ref={bodyRef}
            className="pfm-scroll"
            style={{ overflowY: 'auto', flex: 1, padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >

            {/* ── IDENTITÉ */}
            <Section
              delay={0.04}
              color="#2563EB"
              title="Identité du projet"
              icon={
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              <Field label="Titre" required>
                <input
                  className="pfm-inp"
                  style={inp('title')}
                  value={form.title}
                  onChange={set('title')}
                  onFocus={fo('title')}
                  onBlur={bl}
                  placeholder="Nom du projet…"
                />
              </Field>

              <Field label="Résumé" hint="Une phrase courte décrivant l'essentiel du projet">
                <input
                  className="pfm-inp"
                  style={inp('summary')}
                  value={form.summary}
                  onChange={set('summary')}
                  onFocus={fo('summary')}
                  onBlur={bl}
                  placeholder="Résumé en une ligne…"
                />
              </Field>

              <Field label="Description complète">
                <textarea
                  className="pfm-inp"
                  style={ta('description', 100)}
                  value={form.description}
                  onChange={set('description')}
                  onFocus={fo('description')}
                  onBlur={bl}
                  placeholder="Description détaillée du projet…"
                  rows={4}
                />
              </Field>

              <div className="pfm-grid2">
                <Field label="Promoteur">
                  <input
                    className="pfm-inp"
                    style={inp('promoterName')}
                    value={form.promoterName}
                    onChange={set('promoterName')}
                    onFocus={fo('promoterName')}
                    onBlur={bl}
                    placeholder="Nom du promoteur…"
                  />
                </Field>

                <Field label="Localisation">
                  <input
                    className="pfm-inp"
                    style={inp('locationText')}
                    value={form.locationText}
                    onChange={set('locationText')}
                    onFocus={fo('locationText')}
                    onBlur={bl}
                    placeholder="Ville, quartier…"
                  />
                </Field>
              </div>

              <Field label="Statut">
                <select
                  className="pfm-inp"
                  style={sel('status')}
                  value={form.status}
                  onChange={set('status')}
                  onFocus={fo('status')}
                  onBlur={bl}
                >
                  <option value="">— Choisir un statut —</option>
                  <option value="DRAFT">Brouillon</option>
                  <option value="PENDING_APPROVAL">En attente d&apos;approbation</option>
                  <option value="APPROVED">Approuvé</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Terminé</option>
                  <option value="SUSPENDED">Suspendu</option>
                  <option value="CANCELLED">Annulé</option>
                </select>
              </Field>
            </Section>

            {/* ── BUDGET & PLANNING */}
            <Section
              delay={0.1}
              color="#0891B2"
              title="Budget & Planning"
              icon={
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              <div className="pfm-grid2">
                <Field label="Budget prévu (GNF)" hint="Montant planifié">
                  <input
                    className="pfm-inp"
                    style={inp('budgetPlanned')}
                    type="number"
                    min={0}
                    value={form.budgetPlanned}
                    onChange={set('budgetPlanned')}
                    onFocus={fo('budgetPlanned')}
                    onBlur={bl}
                    placeholder="0"
                  />
                </Field>

                <Field label="Budget dépensé (GNF)" hint="Montant déjà consommé">
                  <input
                    className="pfm-inp"
                    style={inp('budgetSpent')}
                    type="number"
                    min={0}
                    value={form.budgetSpent}
                    onChange={set('budgetSpent')}
                    onFocus={fo('budgetSpent')}
                    onBlur={bl}
                    placeholder="0"
                  />
                </Field>
              </div>

              <div className="pfm-grid2">
                <Field label="Date de début">
                  <input
                    className="pfm-inp"
                    style={inp('startsAt')}
                    type="date"
                    value={form.startsAt}
                    onChange={set('startsAt')}
                    onFocus={fo('startsAt')}
                    onBlur={bl}
                  />
                </Field>

                <Field label="Date de fin">
                  <input
                    className="pfm-inp"
                    style={inp('endsAt')}
                    type="date"
                    value={form.endsAt}
                    onChange={set('endsAt')}
                    onFocus={fo('endsAt')}
                    onBlur={bl}
                  />
                </Field>
              </div>
            </Section>

            {/* ── IMPACT */}
            <Section
              delay={0.16}
              color="#059669"
              title="Impact & Bénéficiaires"
              icon={
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            >
              <Field label="Bénéficiaires cibles">
                <textarea
                  className="pfm-inp"
                  style={ta('targetBeneficiaries', 72)}
                  value={form.targetBeneficiaries}
                  onChange={set('targetBeneficiaries')}
                  onFocus={fo('targetBeneficiaries')}
                  onBlur={bl}
                  placeholder="Qui sont les bénéficiaires directs ?"
                  rows={3}
                />
              </Field>

              <div className="pfm-grid2">
                <Field label="Impact sur la population">
                  <textarea
                    className="pfm-inp"
                    style={ta('populationImpact', 72)}
                    value={form.populationImpact}
                    onChange={set('populationImpact')}
                    onFocus={fo('populationImpact')}
                    onBlur={bl}
                    placeholder="Impact social attendu…"
                    rows={3}
                  />
                </Field>

                <Field label="Impact environnemental">
                  <textarea
                    className="pfm-inp"
                    style={ta('environmentalImpact', 72)}
                    value={form.environmentalImpact}
                    onChange={set('environmentalImpact')}
                    onFocus={fo('environmentalImpact')}
                    onBlur={bl}
                    placeholder="Impact sur l'environnement…"
                    rows={3}
                  />
                </Field>
              </div>
            </Section>

            {/* ── EXÉCUTION & RISQUES */}
            <Section
              delay={0.22}
              color="#D97706"
              title="Exécution & Risques"
              icon={
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            >
              <Field label="Méthode d'implémentation">
                <textarea
                  className="pfm-inp"
                  style={ta('implementationMethod', 80)}
                  value={form.implementationMethod}
                  onChange={set('implementationMethod')}
                  onFocus={fo('implementationMethod')}
                  onBlur={bl}
                  placeholder="Comment le projet sera-t-il mis en œuvre ?"
                  rows={3}
                />
              </Field>

              <Field label="Risques & Mitigations">
                <textarea
                  className="pfm-inp"
                  style={ta('risksAndMitigation', 80)}
                  value={form.risksAndMitigation}
                  onChange={set('risksAndMitigation')}
                  onFocus={fo('risksAndMitigation')}
                  onBlur={bl}
                  placeholder="Risques identifiés et mesures de mitigation…"
                  rows={3}
                />
              </Field>
            </Section>

            {/* ERROR */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.6rem',
                  padding: '.8rem 1rem',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 11,
                  color: '#B91C1C',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '.8rem',
                  fontWeight: 700,
                  animation: 'pfmIn .3s ease forwards',
                }}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid rgba(59,130,246,.1)',
              backgroundColor: 'rgba(248,250,252,.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans',sans-serif",
                fontSize: '.68rem',
                color: '#94A3B8',
                fontWeight: 600,
              }}
            >
              <span style={{ color: '#3B82F6' }}>*</span> Champs obligatoires
            </span>

            <div style={{ display: 'flex', gap: '.55rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                style={{
                  height: 40,
                  padding: '0 1.2rem',
                  borderRadius: 10,
                  border: '1.5px solid #E2E8F0',
                  backgroundColor: 'white',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '.82rem',
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={busy}
                style={{
                  height: 40,
                  padding: '0 1.4rem',
                  borderRadius: 10,
                  border: 'none',
                  background: busy
                    ? 'linear-gradient(135deg,#93C5FD,#60A5FA)'
                    : 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: '.82rem',
                  fontWeight: 800,
                  color: 'white',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: busy ? 'none' : '0 4px 14px rgba(59,130,246,.35)',
                  transition: 'all .18s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.45rem',
                }}
              >
                {busy ? (
                  <>
                    <div
                      style={{
                        width: 13,
                        height: 13,
                        border: '2px solid rgba(255,255,255,.35)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'pfmSpin .7s linear infinite',
                      }}
                    />
                    Enregistrement…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {isEdit ? 'Enregistrer' : 'Créer le projet'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}