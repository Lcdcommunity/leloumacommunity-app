// web/app/(protected)/member/projects/propose/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import type { ProjectProposal } from '../../../../../types/project-proposal';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttachedFile {
  id: string;
  url: string;
  mimeType?: string | null;
  fileName?: string | null;
  sizeBytes?: number | null;
}

interface ExtendedProposal extends ProjectProposal {
  attachedFile?: AttachedFile | null;
  attachmentFileAssetId?: string | null;
  authorName?: string | null;
  estimatedBudget?: number | null;
}

interface PhotoFile {
  file: File;
  preview: string;
  id: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const MAX_PHOTOS = 5;
const ACCEPT_IMG = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_MB = 5;

// Statuts visibles par le membre
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string; desc: string }> = {
  DRAFT:      { label: 'Brouillon',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', dot: '#9CA3AF', desc: 'Visible seulement par vous' },
  SUBMITTED:  { label: 'Soumis',     color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706', desc: 'En attente de validation admin' },
  UNDER_REVIEW: { label: 'En revue', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', desc: 'En cours d\'examen' },
  APPROVED:   { label: 'Approuvé',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981', desc: 'Approuvé par l\'admin' },
  REJECTED:   { label: 'Rejeté',     color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444', desc: 'Non retenu' },
  CONVERTED_TO_PROJECT: { label: 'Converti', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', dot: '#8B5CF6', desc: 'Transformé en projet officiel' },
};

function fmt(d?: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Styles globaux partagés avec le formulaire admin ─────────────────────────
const LS: React.CSSProperties = { fontSize: '.7rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.32rem', display: 'block' };
const IS: React.CSSProperties = { width: '100%', height: 40, borderRadius: 11, border: '1px solid rgba(37,99,235,.15)', background: 'rgba(255,255,255,.88)', padding: '0 .9rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, color: '#111827', outline: 'none', boxSizing: 'border-box' };
const TA: React.CSSProperties = { width: '100%', borderRadius: 11, border: '1px solid rgba(37,99,235,.15)', background: 'rgba(255,255,255,.88)', padding: '.75rem .9rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 600, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 90, boxSizing: 'border-box' };
const SS: React.CSSProperties = { ...IS, appearance: 'none', cursor: 'pointer', backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right .75rem center', paddingRight: '2.2rem' };

// ── FormValues ────────────────────────────────────────────────────────────────
interface FormValues {
  title: string;
  summary: string;
  description: string;
  locationText: string;
  promoterName: string;
  budgetPlanned: string;
  currency: string;
  startsAt: string;
  endsAt: string;
  targetBeneficiaries: string;
  populationImpact: string;
  environmentalImpact: string;
  implementationMethod: string;
  risksAndMitigation: string;
  specificObjectives: string;
  expectedResults: string;
  successIndicators: string;
}

const EMPTY: FormValues = {
  title: '', summary: '', description: '', locationText: '', promoterName: '',
  budgetPlanned: '', currency: 'EUR', startsAt: '', endsAt: '',
  targetBeneficiaries: '', populationImpact: '', environmentalImpact: '',
  implementationMethod: '', risksAndMitigation: '',
  specificObjectives: '', expectedResults: '', successIndicators: '',
};

// ── PhotoDropZone (identique admin) ──────────────────────────────────────────
function UploadSlot({ photo, onRemove, onAdd, disabled }: { photo?: PhotoFile; onRemove?: () => void; onAdd?: () => void; disabled?: boolean }) {
  if (photo) {
    return (
      <div style={{ position: 'relative', aspectRatio: '1/1', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(37,99,235,.15)', background: '#F8FAFC' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '.3rem .4rem', background: 'linear-gradient(to top,rgba(15,23,42,.72),rgba(15,23,42,0))', color: 'white', fontSize: '.58rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.file.name}</div>
        <button type="button" onClick={onRemove} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%', background: 'rgba(15,23,42,.68)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={disabled ? undefined : onAdd} disabled={disabled} style={{ aspectRatio: '1/1', borderRadius: 12, border: '2px dashed rgba(37,99,235,.18)', background: 'rgba(239,246,255,.45)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', gap: '.28rem', color: '#93C5FD', opacity: disabled ? 0.55 : 1 }}>
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
      if (!ACCEPT_IMG.includes(f.type)) { setErr('Format non accepté (PNG, JPG, WEBP).'); continue; }
      if (f.size > MAX_MB * 1024 * 1024) { setErr(`Fichier trop lourd — max ${MAX_MB} Mo.`); continue; }
      if (photos.length + valid.length >= MAX_PHOTOS) { setErr(`Maximum ${MAX_PHOTOS} photos.`); break; }
      valid.push({ file: f, preview: URL.createObjectURL(f), id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
    }
    if (valid.length) onChange([...photos, ...valid]);
  }

  function remove(id: string) {
    const p = photos.find(x => x.id === id);
    if (p) URL.revokeObjectURL(p.preview);
    onChange(photos.filter(x => x.id !== id));
  }

  const full = photos.length >= MAX_PHOTOS;
  const remaining = MAX_PHOTOS - photos.length;

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
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${drag ? '#2563EB' : 'rgba(37,99,235,.22)'}`, borderRadius: 14, padding: '1.4rem 1rem', textAlign: 'center', cursor: 'pointer', background: drag ? 'rgba(239,246,255,.7)' : 'rgba(239,246,255,.3)', transition: 'all .18s', marginBottom: '.75rem' }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(37,99,235,.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto .7rem', border: '1px solid rgba(37,99,235,.14)' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <p style={{ margin: '0 0 .3rem', fontSize: '.82rem', fontWeight: 800, color: '#1D4ED8' }}>Cliquez ou glissez vos photos</p>
          <p style={{ margin: 0, fontSize: '.72rem', fontWeight: 600, color: '#9CA3AF' }}>PNG, JPG, WEBP — max {MAX_MB} Mo — {remaining} emplacement{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}</p>
          <input ref={inputRef} type="file" accept={ACCEPT_IMG.join(',')} multiple hidden onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} />
        </div>
      )}
      {err && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.55rem .8rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, marginBottom: '.6rem', fontSize: '.75rem', fontWeight: 700, color: '#B91C1C' }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
          {err}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: '.55rem' }}>
        {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
          const photo = photos[i];
          return <UploadSlot key={photo?.id ?? `slot-${i}`} photo={photo} onRemove={photo ? () => remove(photo.id) : undefined} onAdd={!photo ? () => inputRef.current?.click() : undefined} disabled={!photo && full} />;
        })}
      </div>
    </div>
  );
}

// ── ProposalForm ──────────────────────────────────────────────────────────────
function ProposalForm({
  initial,
  editingId,
  onSave,
  onCancel,
  submitting,
  uploadProgress,
}: {
  initial?: FormValues;
  editingId: string | null;
  onSave: (v: FormValues, photos: File[], status: 'DRAFT' | 'SUBMITTED') => void;
  onCancel: () => void;
  submitting: boolean;
  uploadProgress: string | null;
}) {
  const [v, setV] = useState<FormValues>(initial ?? EMPTY);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const f = (k: keyof FormValues) => ({
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV(p => ({ ...p, [k]: e.target.value })),
  });

  return (
    <form onSubmit={e => e.preventDefault()}>
      <div style={{ display: 'grid', gap: '1.2rem' }}>

        {/* Section 1 — Informations générales */}
        <div className="pp-form-section">
          <h3 className="pp-form-section-title">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Informations Générales
          </h3>
          <div style={{ display: 'grid', gap: '.85rem' }}>
            <div>
              <label style={LS}>Titre du projet <span style={{ color: '#EF4444' }}>*</span></label>
              <input style={IS} placeholder="Nom clair et concis du projet" required {...f('title')} />
            </div>
            <div>
              <label style={LS}>Résumé court</label>
              <input style={IS} placeholder="Une phrase d'accroche" {...f('summary')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div>
                <label style={LS}>Promoteur / Responsable</label>
                <input style={IS} placeholder="Nom du porteur du projet" {...f('promoterName')} />
              </div>
              <div>
                <label style={LS}>Localisation</label>
                <input style={IS} placeholder="Région, Ville…" {...f('locationText')} />
              </div>
            </div>
            <div>
              <label style={LS}>Description détaillée <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea style={{ ...TA, minHeight: 120 }} placeholder="Contexte, justification, besoin identifié…" required {...f('description')} />
            </div>
          </div>
        </div>

        {/* Section 2 — Impact & Objectifs */}
        <div className="pp-form-section">
          <h3 className="pp-form-section-title">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Impact & Objectifs
          </h3>
          <div style={{ display: 'grid', gap: '.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.85rem' }}>
              <div>
                <label style={LS}>Bénéficiaires cibles</label>
                <input style={IS} placeholder="Ex: Étudiants, Agriculteurs…" {...f('targetBeneficiaries')} />
              </div>
              <div>
                <label style={LS}>Impact population</label>
                <input style={IS} placeholder="Bénéfices sociaux attendus" {...f('populationImpact')} />
              </div>
            </div>
            <div>
              <label style={LS}>Impact environnemental</label>
              <input style={IS} placeholder="Conséquences sur l'environnement" {...f('environmentalImpact')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.85rem' }}>
              <div>
                <label style={LS}>Objectifs spécifiques</label>
                <textarea style={TA} placeholder="Liste des objectifs à atteindre" {...f('specificObjectives')} />
              </div>
              <div>
                <label style={LS}>Indicateurs de succès</label>
                <textarea style={TA} placeholder="Comment mesurer la réussite ?" {...f('successIndicators')} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 — Exécution & Budget */}
        <div className="pp-form-section">
          <h3 className="pp-form-section-title">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Exécution & Budget Estimatif
          </h3>
          <div style={{ display: 'grid', gap: '.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '.85rem' }}>
              <div>
                <label style={LS}>Méthode d&apos;implémentation</label>
                <textarea style={TA} placeholder="Étapes de réalisation…" {...f('implementationMethod')} />
              </div>
              <div>
                <label style={LS}>Risques & Mitigations</label>
                <textarea style={TA} placeholder="Risques potentiels et solutions…" {...f('risksAndMitigation')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.85rem' }}>
              <div>
                <label style={LS}>Début estimé</label>
                <input style={IS} type="date" {...f('startsAt')} />
              </div>
              <div>
                <label style={LS}>Fin estimée</label>
                <input style={IS} type="date" {...f('endsAt')} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '.85rem' }}>
              <div>
                <label style={LS}>Budget estimatif <span style={{ fontWeight: 400, textTransform: 'none', color: '#9CA3AF' }}>(optionnel)</span></label>
                <input style={IS} type="number" min="0" placeholder="0" {...f('budgetPlanned')} />
              </div>
              <div>
                <label style={LS}>Devise</label>
                <select style={SS} value={v.currency} onChange={e => setV(p => ({ ...p, currency: e.target.value }))}>
                  <option value="GNF">GNF (FG)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="XOF">XOF (CFA)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Photos */}
        <PhotoDropZone photos={photos} onChange={setPhotos} />

        {/* Progress upload */}
        {uploadProgress && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', padding: '.65rem .9rem', background: 'rgba(239,246,255,.8)', border: '1px solid rgba(37,99,235,.18)', borderRadius: 10, fontSize: '.78rem', fontWeight: 700, color: '#1D4ED8' }}>
            <div style={{ width: 14, height: 14, border: '2px solid rgba(37,99,235,.2)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'ppspin .7s linear infinite', flexShrink: 0 }} />
            {uploadProgress}
          </div>
        )}

        {/* Boutons d'action */}
        <div style={{ display: 'flex', gap: '.55rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={onCancel} disabled={submitting} style={{ flex: '0 0 auto', height: 44, padding: '0 1.2rem', borderRadius: 11, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 700, color: '#374151', cursor: 'pointer', opacity: submitting ? 0.5 : 1 }}>
            Annuler
          </button>
          {/* Sauvegarder brouillon */}
          <button
            type="button"
            disabled={submitting || !v.title.trim()}
            onClick={() => onSave(v, photos.map(p => p.file), 'DRAFT')}
            style={{ flex: 1, height: 44, borderRadius: 11, border: '1.5px solid #D1D5DB', background: 'white', fontFamily: "'DM Sans',sans-serif", fontSize: '.84rem', fontWeight: 800, color: '#374151', cursor: submitting || !v.title.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', opacity: (submitting || !v.title.trim()) ? 0.5 : 1 }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            {submitting ? 'Sauvegarde…' : 'Brouillon'}
          </button>
          {/* Soumettre à l'admin */}
          <button
            type="button"
            disabled={submitting || !v.title.trim() || !v.description.trim()}
            onClick={() => onSave(v, photos.map(p => p.file), 'SUBMITTED')}
            style={{ flex: 2, height: 44, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1D4ED8,#2563EB)', fontFamily: "'DM Sans',sans-serif", fontSize: '.88rem', fontWeight: 900, color: 'white', cursor: (submitting || !v.title.trim() || !v.description.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', boxShadow: '0 4px 14px rgba(37,99,235,.3)', opacity: (submitting || !v.title.trim() || !v.description.trim()) ? 0.7 : 1 }}
          >
            {submitting ? (
              <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} /> Envoi…</>
            ) : (
              <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> {editingId ? 'Mettre à jour & Soumettre' : 'Soumettre à l\'admin'}</>
            )}
          </button>
        </div>

      </div>
    </form>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function MemberProjectProposePage() {
  const [mounted, setMounted] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingInitial, setEditingInitial] = useState<FormValues | undefined>(undefined);
  const [selectedProposal, setSelectedProposal] = useState<ExtendedProposal | null>(null);

  const [items, setItems] = useState<ExtendedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExtendedProposal | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listMyProjectProposals({ page: 1, pageSize: 100 });
      setItems((res?.items as unknown as ExtendedProposal[]) || []);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));

  const total = items.length;
  const drafts = items.filter(i => i.status === 'DRAFT').length;
  const submitted = items.filter(i => i.status === 'SUBMITTED' || i.status === 'UNDER_REVIEW').length;
  const approved = items.filter(i => i.status === 'APPROVED' || i.status === 'CONVERTED_TO_PROJECT').length;
  const rejected = items.filter(i => i.status === 'REJECTED').length;

  function handleCancel() {
    setIsFormOpen(false);
    setEditingId(null);
    setEditingInitial(undefined);
    setSaveError(null);
    setSaveSuccess(null);
  }

  function handleEditProposal(proposal: ExtendedProposal) {
    setEditingId(proposal.id);
    setEditingInitial({
      title: proposal.title || '',
      summary: '',
      description: proposal.description || '',
      locationText: '',
      promoterName: '',
      budgetPlanned: proposal.expectedBudget ? String(proposal.expectedBudget) : '',
      currency: proposal.currency || 'EUR',
      startsAt: '',
      endsAt: '',
      targetBeneficiaries: '',
      populationImpact: '',
      environmentalImpact: '',
      implementationMethod: '',
      risksAndMitigation: '',
      specificObjectives: '',
      expectedResults: '',
      successIndicators: '',
    });
    setSelectedProposal(null);
    setIsFormOpen(true);
  }

  async function handleSave(values: FormValues, photos: File[], status: 'DRAFT' | 'SUBMITTED') {
    setSaveError(null);
    setSubmitting(true);
    try {
      // Upload photos si présentes — on prend seulement la 1ère comme pièce jointe principale
      let attachmentFileAssetId: string | null = null;
      if (photos.length > 0) {
        setUploadProgress(`Upload photo 1/${photos.length}…`);
        const up = await api.uploadFile(photos[0], { category: 'PROJECT_IMAGE', folder: 'proposals' });
        attachmentFileAssetId = up.id;
      }
      setUploadProgress('Finalisation…');

      const payload = {
        title: values.title.trim(),
        description: values.description.trim(),
        expectedBudget: values.budgetPlanned ? Number(values.budgetPlanned) : undefined,
        currency: values.currency || undefined,
        attachmentFileAssetId: attachmentFileAssetId || undefined,
        status,
      };

      if (editingId) {
        await api.updateProjectProposalMember(editingId, payload as Parameters<typeof api.updateProjectProposalMember>[1]);
      } else {
        await api.createProjectProposalMember(payload as Parameters<typeof api.createProjectProposalMember>[0]);
      }

      setSaveSuccess(status === 'DRAFT' ? 'Brouillon sauvegardé.' : 'Proposition soumise à votre admin d\'antenne !');
      setTimeout(() => {
        setSaveSuccess(null);
        handleCancel();
        void load();
      }, 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteProjectProposalMember(deleteTarget.id);
      setDeleteTarget(null);
      setSelectedProposal(null);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur suppression');
    } finally {
      setIsDeleting(false);
    }
  }

  // Soumettre un brouillon existant directement depuis la liste
  async function handleSubmitDraft(proposal: ExtendedProposal) {
    try {
      await api.updateProjectProposalMember(proposal.id, { status: 'SUBMITTED' } as Parameters<typeof api.updateProjectProposalMember>[1]);
      setSelectedProposal(null);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur');
    }
  }

  if (!mounted) return null;

  return (
    <AppShell title="Proposer un projet">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        @keyframes ppin { to { opacity:1; transform:translateY(0); } }
        @keyframes ppspin { to { transform:rotate(360deg); } }
        @keyframes modalPop { from { opacity:0; transform:scale(0.95) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes fadein { from{opacity:0} to{opacity:1} }

        .pp-wrap { font-family:'DM Sans',sans-serif; padding:clamp(1rem,3vw,2rem); max-width:880px; margin:0 auto; color:#0F172A; }

        .pp-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; opacity:0; transform:translateY(10px); animation:ppin .5s .04s cubic-bezier(.22,1,.36,1) forwards; }
        .pp-eyebrow { font-size:.65rem; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:#2563EB; margin-bottom:.35rem; display:flex; align-items:center; gap:.4rem; }
        .pp-eyebrow-dot { width:6px; height:6px; background:#3B82F6; border-radius:50%; animation:fadein 2s ease-in-out infinite; }
        .pp-page-title { font-family:'Cormorant Garamond',serif; font-size:clamp(1.4rem,4vw,2rem); font-weight:700; color:#111827; letter-spacing:-.02em; line-height:1.15; margin:0; }

        .pp-primary-btn { background:linear-gradient(135deg,#1D4ED8,#2563EB); color:white; border:none; padding:.7rem 1.2rem; border-radius:99px; font-weight:700; font-size:.85rem; cursor:pointer; transition:all .2s; display:inline-flex; align-items:center; gap:.4rem; box-shadow:0 4px 12px rgba(37,99,235,.2); }
        .pp-primary-btn:hover { transform:translateY(-1px); box-shadow:0 6px 16px rgba(37,99,235,.3); }
        .pp-back-btn { background:white; color:#374151; border:1px solid #E2E8F0; padding:.6rem 1rem; border-radius:99px; font-weight:600; font-size:.8rem; cursor:pointer; transition:all .2s; display:inline-flex; align-items:center; gap:.4rem; }
        .pp-back-btn:hover { background:#F8FAFC; border-color:#CBD5E1; }

        .pp-panel { background:white; border-radius:24px; border:1px solid rgba(37,99,235,.09); box-shadow:0 10px 30px -10px rgba(0,0,0,.05); overflow:hidden; opacity:0; transform:translateY(10px); animation:ppin .5s .09s cubic-bezier(.22,1,.36,1) forwards; }

        /* Bandeau d'édition */
        .pp-edit-banner { display:flex; align-items:center; gap:.4rem; font-size:.72rem; font-weight:800; color:#2563EB; padding:.5rem .75rem; background:rgba(239,246,255,.9); border:1px solid rgba(37,99,235,.2); border-radius:9px; margin-bottom:.7rem; }
        .pp-save-err { display:flex; align-items:center; gap:.5rem; padding:.65rem .85rem; background:#FEF2F2; border:1px solid #FECACA; border-radius:9px; color:#B91C1C; font-size:.78rem; font-weight:800; margin-bottom:.7rem; }
        .pp-save-ok { display:flex; align-items:center; gap:.5rem; padding:.65rem .85rem; background:#ECFDF5; border:1px solid #A7F3D0; border-radius:9px; color:#065F46; font-size:.78rem; font-weight:800; margin-bottom:.7rem; }

        /* Head wrapper */
        .pp-wrapper-head { padding:1.25rem 1.5rem; border-bottom:1px solid rgba(0,0,0,.04); display:flex; align-items:center; gap:.6rem; }
        .pp-head-ico { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; }
        .pp-head-title { font-size:.75rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:#0F172A; }

        /* Stats */
        .pp-stat-grid { display:flex; flex-wrap:wrap; gap:1rem; padding:1.5rem; border-bottom:1px solid rgba(0,0,0,.04); }
        .pp-stat-card { flex:1; min-width:90px; position:relative; background:white; border-radius:12px; padding:1.2rem .5rem; border:1px solid #E2E8F0; text-align:center; overflow:hidden; transition:transform .15s; }
        .pp-stat-card:hover { transform:translateY(-2px); }
        .pp-stat-val { font-family:'Cormorant Garamond',serif; font-size:1.8rem; font-weight:700; color:#0F172A; display:block; line-height:1; margin-bottom:.4rem; }
        .pp-stat-lbl { font-size:.62rem; font-weight:800; text-transform:uppercase; color:#6B7280; letter-spacing:.05em; }

        /* Filtre */
        .pp-filter-bar { padding:1.2rem 1.5rem; border-bottom:1px solid rgba(0,0,0,.04); display:flex; align-items:center; gap:.6rem; flex-wrap:nowrap; background:#FAFAFA; overflow-x:auto; }
        .pp-search-box { display:flex; align-items:center; gap:.5rem; background:white; border:1.5px solid #E2E8F0; border-radius:99px; padding:.4rem .8rem; flex:1; min-width:130px; transition:border-color .2s; }
        .pp-search-box:focus-within { border-color:#2563EB; box-shadow:0 0 0 3px rgba(37,99,235,.08); }
        .pp-search-box input { border:none; outline:none; font-family:'DM Sans',sans-serif; font-size:.85rem; width:100%; color:#0F172A; background:transparent; }
        .pp-refresh-btn { height:36px; padding:0 1rem; background:white; border:1.5px solid #E2E8F0; border-radius:99px; cursor:pointer; color:#2563EB; font-family:'DM Sans',sans-serif; font-size:.8rem; font-weight:600; display:inline-flex; align-items:center; gap:.4rem; transition:all .2s; flex-shrink:0; }
        .pp-refresh-btn:hover { background:#EFF6FF; border-color:#2563EB; }

        /* Liste */
        .pp-list-container { padding:1.5rem; display:flex; flex-direction:column; gap:1rem; background:#FAFAFA; }
        .pp-item-card { background:rgba(239,246,255,.5); border:1px solid rgba(191,219,254,.8); border-radius:16px; padding:1.25rem 1.5rem; cursor:pointer; display:flex; flex-direction:column; gap:.8rem; transition:all .2s; }
        .pp-item-card:hover { transform:translateY(-3px); box-shadow:0 12px 24px rgba(37,99,235,.08); background:rgba(239,246,255,.9); border-color:#93C5FD; }
        .pp-item-card.draft { background:rgba(243,244,246,.5); border-color:rgba(209,213,219,.8); }
        .pp-item-card.draft:hover { border-color:#D1D5DB; }
        .pp-item-header { display:flex; justify-content:space-between; align-items:center; }
        .pp-item-date { font-size:.75rem; color:#6B7280; font-weight:600; display:flex; align-items:center; gap:.4rem; }
        .pp-status-badge { display:inline-flex; align-items:center; gap:.35rem; padding:.25rem .65rem; border-radius:99px; font-size:.65rem; font-weight:700; border:1px solid; white-space:nowrap; }
        .pp-status-dot { width:6px; height:6px; border-radius:50%; }
        .pp-item-title { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:700; color:#0F172A; line-height:1.2; margin:0; }
        .pp-item-divider { border:none; border-top:1.5px dotted #93C5FD; margin:.5rem 0; }
        .pp-item-card.draft .pp-item-divider { border-top-color:#D1D5DB; }

        /* Formulaire */
        .pp-form-body { padding:1.5rem; }
        .pp-form-section { background:rgba(255,255,255,.6); border:1px solid rgba(37,99,235,.1); padding:1.2rem; border-radius:14px; margin-bottom:1rem; }
        .pp-form-section-title { margin:0 0 1rem; font-size:.8rem; font-weight:800; color:#1D4ED8; text-transform:uppercase; letter-spacing:.05em; display:flex; align-items:center; gap:.4rem; border-bottom:1px dashed rgba(37,99,235,.15); padding-bottom:.6rem; }

        /* Modal */
        .pp-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(4px); z-index:999; display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadein .2s ease; }
        .pp-modal-content { background:white; width:100%; max-width:540px; border-radius:24px; box-shadow:0 20px 40px rgba(0,0,0,.2); overflow:hidden; animation:modalPop .3s cubic-bezier(.2,.8,.2,1); max-height:90vh; display:flex; flex-direction:column; }
        .pp-modal-header { padding:1.5rem; border-bottom:1px solid #E2E8F0; display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; }
        .pp-modal-body { padding:1.5rem; overflow-y:auto; display:flex; flex-direction:column; gap:1.25rem; }
        .pp-modal-close { width:34px; height:34px; border-radius:10px; background:#F1F5F9; border:1px solid transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#6B7280; flex-shrink:0; transition:all .2s; }
        .pp-modal-close:hover { background:#E2E8F0; }
        .pp-icon-btn { width:34px; height:34px; border-radius:10px; border:1px solid #E2E8F0; background:white; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; }
        .pp-edit-btn { color:#2563EB; }
        .pp-edit-btn:hover { background:#EFF6FF; border-color:#BFDBFE; }
        .pp-delete-btn { color:#DC2626; }
        .pp-delete-btn:hover { background:#FEF2F2; border-color:#FECACA; }
        .pp-submit-draft-btn { height:34px; padding:0 .85rem; background:#ECFDF5; border:1px solid #A7F3D0; color:#059669; border-radius:9px; font-size:.75rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:.35rem; transition:all .2s; }
        .pp-submit-draft-btn:hover { background:#D1FAE5; }
        .pp-detail-block { background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:1rem; }
        .pp-detail-lbl { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em; color:#6B7280; margin-bottom:.4rem; }
        .pp-detail-txt { font-size:.9rem; color:#0F172A; line-height:1.6; white-space:pre-wrap; }
        .pp-empty-state { text-align:center; padding:3rem 1rem; color:#6B7280; }
        .pp-loader { display:flex; align-items:center; justify-content:center; padding:3rem; gap:.7rem; color:#6B7280; font-size:.82rem; }
        .pp-ring { width:22px; height:22px; border:2.5px solid rgba(37,99,235,.1); border-top-color:#2563EB; border-radius:50%; animation:ppspin .8s linear infinite; }

        /* Dialog suppression */
        .pp-dialog-overlay { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:1000; display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadein .2s ease; }
        .pp-dialog-card { background:white; width:100%; max-width:380px; border-radius:20px; box-shadow:0 25px 50px -12px rgba(0,0,0,.25); padding:1.5rem; text-align:center; animation:modalPop .3s cubic-bezier(.2,.8,.2,1); }

        @media(max-width:640px) {
          .pp-stat-grid { gap:.6rem; }
          .pp-stat-card { padding:.85rem .4rem; }
          .pp-stat-val { font-size:1.4rem; }
          .pp-filter-bar { padding:.8rem 1rem; }
        }
      `}</style>

      <div className="pp-wrap">

        {/* HEADER */}
        <div className="pp-header">
          <div>
            <div className="pp-eyebrow"><div className="pp-eyebrow-dot" />Espace membre</div>
            <h1 className="pp-page-title">Mes propositions</h1>
          </div>
          {!isFormOpen ? (
            <button className="pp-primary-btn" onClick={() => setIsFormOpen(true)}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nouvelle proposition
            </button>
          ) : (
            <button className="pp-back-btn" onClick={handleCancel}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Retour à la liste
            </button>
          )}
        </div>

        <div className="pp-panel">

          {/* FORMULAIRE */}
          {isFormOpen ? (
            <>
              <div className="pp-wrapper-head">
                <div className="pp-head-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className="pp-head-title">{editingId ? 'Modifier la proposition' : 'Nouvelle proposition de projet'}</span>
              </div>
              <div className="pp-form-body">
                {editingId && (
                  <div className="pp-edit-banner">
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', flexShrink: 0 }} />
                    Mode modification
                  </div>
                )}
                {saveError && (
                  <div className="pp-save-err">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="pp-save-ok">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {saveSuccess}
                  </div>
                )}
                <ProposalForm
                  key={editingId ?? 'new'}
                  initial={editingInitial}
                  editingId={editingId}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  submitting={submitting}
                  uploadProgress={uploadProgress}
                />
              </div>
            </>
          ) : (
            <>
              {/* HEADER DU PANEL LISTE */}
              <div className="pp-wrapper-head">
                <div className="pp-head-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="pp-head-title">Mes propositions</span>
              </div>

              {/* STATS */}
              <div className="pp-stat-grid">
                {[
                  { label: 'Total',     count: total,    color: '#1D4ED8' },
                  { label: 'Brouillons', count: drafts,   color: '#6B7280' },
                  { label: 'Soumises',  count: submitted, color: '#B45309' },
                  { label: 'Approuvées', count: approved, color: '#059669' },
                  { label: 'Rejetées',  count: rejected,  color: '#B91C1C' },
                ].map(c => (
                  <div key={c.label} className="pp-stat-card">
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: c.color, borderRadius: '12px 12px 0 0' }} />
                    <span className="pp-stat-val">{c.count}</span>
                    <span className="pp-stat-lbl">{c.label}</span>
                  </div>
                ))}
              </div>

              {/* FILTRE */}
              <div className="pp-filter-bar">
                <div className="pp-search-box">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input type="text" placeholder="Rechercher par titre…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="pp-refresh-btn" onClick={() => void load()} type="button">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Actualiser
                </button>
              </div>

              {/* LISTE */}
              <div className="pp-list-container">
                {loading ? (
                  <div className="pp-loader"><div className="pp-ring" />Chargement…</div>
                ) : fetchError ? (
                  <div className="pp-empty-state" style={{ color: '#DC2626' }}>{fetchError}</div>
                ) : filtered.length === 0 ? (
                  <div className="pp-empty-state">
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.3" style={{ margin: '0 auto 1rem' }}><path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <div style={{ fontWeight: 700, color: '#374151', marginBottom: '.3rem' }}>Aucune proposition trouvée</div>
                    <div style={{ fontSize: '.8rem' }}>Cliquez sur <strong>Nouvelle proposition</strong> pour commencer.</div>
                  </div>
                ) : (
                  filtered.map(item => {
                    const meta = STATUS_META[item.status] ?? STATUS_META['SUBMITTED'];
                    const isDraft = item.status === 'DRAFT';
                    const canEdit = item.status === 'DRAFT' || item.status === 'SUBMITTED';
                    return (
                      <div key={item.id} className={`pp-item-card${isDraft ? ' draft' : ''}`} onClick={() => setSelectedProposal(item)}>
                        <div className="pp-item-header">
                          <span className="pp-item-date">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                            {fmt(item.createdAt)}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                            {isDraft && (
                              <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#6B7280', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 99, padding: '.18rem .5rem' }}>
                                👁 Visible seulement par vous
                              </span>
                            )}
                            <span className="pp-status-badge" style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}>
                              <span className="pp-status-dot" style={{ background: meta.dot }} />
                              {meta.label}
                            </span>
                          </div>
                        </div>
                        <h3 className="pp-item-title">{item.title}</h3>
                        <hr className="pp-item-divider" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
                          <div>
                            <div style={{ fontSize: '.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#6B7280', marginBottom: '.3rem' }}>Budget estimé</div>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '1.05rem', fontWeight: 700, color: isDraft ? '#6B7280' : '#2563EB', background: 'white', display: 'inline-block', padding: '.2rem .5rem', borderRadius: 6, border: `1px solid ${isDraft ? '#E5E7EB' : '#E0E7FF'}` }}>
                              {item.expectedBudget != null ? `${Number(item.expectedBudget).toLocaleString('fr-FR')} ${item.currency ?? ''}` : 'Non défini'}
                            </div>
                          </div>
                          {canEdit && (
                            <div style={{ display: 'flex', gap: '.4rem' }} onClick={e => e.stopPropagation()}>
                              {isDraft && (
                                <button className="pp-submit-draft-btn" onClick={() => void handleSubmitDraft(item)} title="Soumettre à l'admin">
                                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                  Soumettre
                                </button>
                              )}
                              <button className="pp-icon-btn pp-edit-btn" title="Modifier" onClick={() => handleEditProposal(item)}>
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button className="pp-icon-btn pp-delete-btn" title="Supprimer" onClick={() => setDeleteTarget(item)}>
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL DÉTAIL */}
      {selectedProposal && !isFormOpen && (
        <div className="pp-modal-overlay" onClick={() => setSelectedProposal(null)}>
          <div className="pp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="pp-modal-header">
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginBottom: '.6rem' }}>
                  <span className="pp-status-badge" style={{ background: STATUS_META[selectedProposal.status]?.bg, color: STATUS_META[selectedProposal.status]?.color, borderColor: STATUS_META[selectedProposal.status]?.border }}>
                    {STATUS_META[selectedProposal.status]?.label}
                  </span>
                  <span style={{ fontSize: '.72rem', color: '#6B7280', fontWeight: 600 }}>{STATUS_META[selectedProposal.status]?.desc}</span>
                </div>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.7rem', fontWeight: 700, margin: 0, color: '#0F172A', lineHeight: 1.2 }}>
                  {selectedProposal.title}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
                {(selectedProposal.status === 'DRAFT' || selectedProposal.status === 'SUBMITTED') && (
                  <>
                    <button className="pp-icon-btn pp-edit-btn" title="Modifier" onClick={() => handleEditProposal(selectedProposal)}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button className="pp-icon-btn pp-delete-btn" title="Supprimer" onClick={() => { setDeleteTarget(selectedProposal); setSelectedProposal(null); }}>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </>
                )}
                <button className="pp-modal-close" onClick={() => setSelectedProposal(null)}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="pp-modal-body">
              {selectedProposal.status === 'DRAFT' && (
                <div style={{ padding: '.75rem 1rem', background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 12, fontSize: '.82rem', color: '#854D0E', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <span>👁</span>
                  Ce brouillon est visible seulement par vous. Soumettez-le pour que votre admin d&apos;antenne puisse le voir.
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="pp-detail-block" style={{ flex: 1 }}>
                  <div className="pp-detail-lbl">Budget demandé</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '1.2rem', fontWeight: 700, color: '#2563EB' }}>
                    {selectedProposal.expectedBudget != null ? `${Number(selectedProposal.expectedBudget).toLocaleString('fr-FR')} ${selectedProposal.currency ?? ''}` : 'Non défini'}
                  </div>
                </div>
                <div className="pp-detail-block" style={{ flex: 1 }}>
                  <div className="pp-detail-lbl">Soumis le</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: '.9rem', fontWeight: 700, color: '#374151' }}>{fmt(selectedProposal.createdAt)}</div>
                </div>
              </div>
              <div>
                <div className="pp-detail-lbl" style={{ marginBottom: '.6rem' }}>Description</div>
                <div className="pp-detail-txt">{selectedProposal.description}</div>
              </div>
              {selectedProposal.status === 'DRAFT' && (
                <button
                  className="pp-submit-draft-btn"
                  style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: '.85rem' }}
                  onClick={() => { void handleSubmitDraft(selectedProposal); }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  Soumettre à l&apos;admin d&apos;antenne
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIALOG SUPPRESSION */}
      {deleteTarget && (
        <div className="pp-dialog-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="pp-dialog-card" onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, margin: '0 0 .4rem', color: '#0F172A' }}>Supprimer cette proposition ?</h3>
            <p style={{ fontSize: '.82rem', color: '#6B7280', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              <strong style={{ color: '#0F172A' }}>{deleteTarget.title}</strong> sera supprimée définitivement.
            </p>
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button onClick={() => setDeleteTarget(null)} disabled={isDeleting} style={{ flex: 1, height: 40, borderRadius: 10, border: '1px solid #D1D5DB', background: '#F9FAFB', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => void handleDelete()} disabled={isDeleting} style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
                {isDeleting && <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'ppspin .7s linear infinite' }} />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}