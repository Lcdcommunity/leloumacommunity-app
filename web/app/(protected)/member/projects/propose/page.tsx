// web/app/(protected)/member/projects/propose/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef, ChangeEvent } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import type { ProjectProposal } from '../../../../../types/project-proposal';

// ─── Types ──────────────────────────────────────────────────────────────────
type StatusKey = '' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PROJECT';

const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: '',                      label: 'Tous' },
  { value: 'SUBMITTED',             label: 'Soumise' },
  { value: 'UNDER_REVIEW',          label: 'En revue' },
  { value: 'APPROVED',              label: 'Approuvée' },
  { value: 'REJECTED',              label: 'Rejetée' },
  { value: 'CONVERTED_TO_PROJECT',  label: 'Convertie' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  SUBMITTED:            { label: 'Soumise',   color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  UNDER_REVIEW:         { label: 'En revue',  color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
  APPROVED:             { label: 'Approuvée', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981' },
  REJECTED:             { label: 'Rejetée',   color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
  CONVERTED_TO_PROJECT: { label: 'Convertie', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', dot: '#8B5CF6' },
};

function fmt(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function MemberProjectProposalsPage() {
  // ── Liste propositions ──
  const [items,      setItems]      = useState<ProjectProposal[]>([]);
  const [status,     setStatus]     = useState<StatusKey>('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);

  // ── Formulaire ──
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [budget,      setBudget]      = useState('');
  const [currency,    setCurrency]    = useState('EUR'); // Ajout de la devise
  const [submitting,  setSubmitting]  = useState(false);
  const [formError,   setFormError]   = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // ── Pièce jointe (document) ──
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentAssetId,   setAttachmentAssetId]   = useState<string | null>(null);
  const [attachmentPreview,   setAttachmentPreview]   = useState<{ name: string; size: string; type: string } | null>(null);
  const [attachmentError,     setAttachmentError]     = useState<string | null>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  // ── Photo ──
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoMeta,      setPhotoMeta]      = useState<{ name: string; size: string } | null>(null);
  const [photoAssetId,   setPhotoAssetId]   = useState<string | null>(null);
  const [photoError,     setPhotoError]     = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Chargement liste ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listMyProjectProposals({ page: 1, pageSize: 100, status: status || undefined });
      setItems((res?.items as unknown as ProjectProposal[]) || []);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  // ── Upload pièce jointe ──
  async function handleAttachmentChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAttachmentError(null);
    if (!file) return;

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/webp',
    ];
    if (!allowed.includes(file.type)) {
      setAttachmentError('Format non supporté. Acceptés : PDF, DOC, DOCX, JPG, PNG, WEBP');
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('Fichier trop grand (max 10 Mo)');
      e.target.value = '';
      return;
    }

    const sizeStr = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} Ko`
      : `${(file.size / (1024 * 1024)).toFixed(1)} Mo`;

    const typeStr = file.type.includes('pdf') ? 'PDF'
      : file.type.includes('word') ? 'DOC'
      : 'Image';

    setAttachmentPreview({ name: file.name, size: sizeStr, type: typeStr });
    setUploadingAttachment(true);

    try {
      // CORRECTION : Utilisation de la catégorie 'PROJECT_DOCUMENT' prévue par le schéma Prisma
      const result = await api.uploadFile(file, { category: 'PROJECT_DOCUMENT', folder: 'proposals' });
      setAttachmentAssetId(result.id);
    } catch {
      setAttachmentError("Échec de l'upload. Réessayez.");
      setAttachmentPreview(null);
    } finally {
      setUploadingAttachment(false);
    }
  }

  function removeAttachment() {
    setAttachmentPreview(null);
    setAttachmentAssetId(null);
    setAttachmentError(null);
    if (attachmentRef.current) attachmentRef.current.value = '';
  }

  // ── Upload photo ──
  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoError(null);
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Formats acceptés : JPG, PNG, WEBP');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo trop grande (max 5 Mo)');
      e.target.value = '';
      return;
    }

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setPhotoMeta({
      name: file.name,
      size: file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(0)} Ko`
        : `${(file.size / (1024 * 1024)).toFixed(1)} Mo`,
    });
    setUploadingPhoto(true);

    try {
      // CORRECTION : Utilisation de la catégorie 'PROJECT_IMAGE' prévue par le schéma Prisma
      const result = await api.uploadFile(file, { category: 'PROJECT_IMAGE', folder: 'proposals' });
      setPhotoAssetId(result.id);
    } catch {
      setPhotoError("Échec de l'upload. Réessayez.");
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
      setPhotoMeta(null);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(null);
    setPhotoMeta(null);
    setPhotoAssetId(null);
    setPhotoError(null);
    if (photoRef.current) photoRef.current.value = '';
  }

  useEffect(() => {
    return () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); };
  }, [photoPreviewUrl]);

  // ── Soumission ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())       { setFormError('Le titre est obligatoire.'); return; }
    if (!description.trim()) { setFormError('La description est obligatoire.'); return; }
    if (uploadingAttachment || uploadingPhoto) { setFormError('Upload en cours, patientez…'); return; }

    setFormError(null);
    setSubmitting(true);
    try {
      await api.createProjectProposalMember({
        title:       title.trim(),
        description: description.trim(),
        expectedBudget:          budget ? Number(budget) : undefined,
        currency:                budget ? currency : undefined, // Envoi de la devise sélectionnée
        attachmentFileAssetId:   attachmentAssetId ?? photoAssetId ?? null,
      });
      setTitle('');
      setDescription('');
      setBudget('');
      setCurrency('EUR');
      removeAttachment();
      removePhoto();
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 4000);
      void load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la soumission.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Stats ──
  const total     = items.length;
  const submitted = items.filter(i => i.status === 'SUBMITTED').length;
  const underRev  = items.filter(i => i.status === 'UNDER_REVIEW').length;
  const approved  = items.filter(i => i.status === 'APPROVED').length;
  const rejected  = items.filter(i => i.status === 'REJECTED').length;

  return (
    <AppShell title="Proposer un projet">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        :root {
          --b-deep:   #1D4ED8;
          --b-mid:    #2563EB;
          --b-light:  #3B82F6;
          --b-pale:   #EFF6FF;
          --b-faint:  #F5F8FF;
          --b-border: rgba(37,99,235,0.12);
          --s-dark:   #0F172A;
          --s-mid:    #374151;
          --s-muted:  #6B7280;
          --card-bg:  rgba(253,253,255,0.96);
          --card-shadow: 0 2px 16px rgba(37,99,235,0.06), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }

        .pp-root { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1160px; margin: 0 auto; }

        .pp-header { margin-bottom: 2rem; opacity: 0; transform: translateY(12px); animation: ppfade 0.55s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .pp-eyebrow { display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.64rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--b-mid); background: var(--b-pale); border: 1px solid #BFDBFE; border-radius: 99px; padding: 0.24rem 0.8rem; margin-bottom: 0.85rem; }
        .pp-eyebrow-dot { width: 5px; height: 5px; background: var(--b-light); border-radius: 50%; animation: ppblink 2.2s ease-in-out infinite; }
        @keyframes ppblink { 0%,100%{opacity:1} 50%{opacity:.25} }
        .pp-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.7rem, 4vw, 2.2rem); font-weight: 600; color: var(--s-dark); letter-spacing: -0.025em; line-height: 1.12; }
        .pp-title-accent { background: linear-gradient(135deg, var(--b-deep) 0%, var(--b-light) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .pp-subtitle { font-size: 0.82rem; color: var(--s-muted); margin-top: 0.4rem; }

        .pp-layout { display: grid; grid-template-columns: 440px 1fr; gap: 1.5rem; align-items: start; }
        @media (max-width: 980px) { .pp-layout { grid-template-columns: 1fr; } }

        .pp-card { background: var(--card-bg); backdrop-filter: blur(14px); border-radius: 22px; border: 1px solid var(--b-border); box-shadow: var(--card-shadow); overflow: hidden; opacity: 0; transform: translateY(14px); }
        .pp-card-left  { animation: ppfade 0.55s 0.12s cubic-bezier(.22,1,.36,1) forwards; }
        .pp-card-right { animation: ppfade 0.55s 0.2s  cubic-bezier(.22,1,.36,1) forwards; }
        @keyframes ppfade { to { opacity: 1; transform: translateY(0); } }

        .pp-card-head { padding: 1rem 1.4rem; border-bottom: 1px solid var(--b-border); display: flex; align-items: center; gap: 0.6rem; }
        .pp-head-ico { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pp-head-title { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--s-mid); }

        .pp-card-body { padding: 1.4rem; }
        @media (max-width: 640px) { .pp-card-body { padding: 1rem; } }

        /* Fields */
        .pp-field { display: flex; flex-direction: column; gap: 0.32rem; margin-bottom: 1rem; }
        .pp-field:last-of-type { margin-bottom: 0; }
        .pp-label { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--b-mid); }
        .pp-label .pp-opt { font-weight: 400; color: var(--s-muted); text-transform: none; letter-spacing: 0; margin-left: 0.3rem; font-size: 0.63rem; }
        .pp-input, .pp-textarea { width: 100%; border-radius: 12px; border: 1.5px solid rgba(37,99,235,0.14); background: rgba(255,255,255,0.9); padding: 0.72rem 0.95rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: var(--s-dark); outline: none; transition: border-color 0.18s, box-shadow 0.18s, background 0.18s; -webkit-appearance: none; }
        .pp-input::placeholder, .pp-textarea::placeholder { color: rgba(107,114,128,0.5); }
        .pp-input:focus, .pp-textarea:focus { border-color: var(--b-mid); background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.10); }
        .pp-textarea { resize: vertical; min-height: 120px; line-height: 1.6; }
        
        /* Composant Budget + Devise revisité */
        .pp-budget-wrap { 
          display: flex; 
          align-items: center; 
          border-radius: 12px; 
          border: 1.5px solid rgba(37,99,235,0.14); 
          background: rgba(255,255,255,0.9); 
          transition: border-color 0.18s, box-shadow 0.18s; 
          overflow: hidden; 
        }
        .pp-budget-wrap:focus-within { 
          border-color: var(--b-mid); 
          background: white; 
          box-shadow: 0 0 0 3px rgba(37,99,235,0.10); 
        }
        .pp-budget-select-wrap {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--b-faint);
          border-right: 1.5px solid rgba(37,99,235,0.14);
        }
        .pp-budget-currency {
          appearance: none;
          background: transparent;
          border: none;
          padding: 0.72rem 1.8rem 0.72rem 0.95rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--b-mid);
          outline: none;
          cursor: pointer;
        }
        .pp-budget-select-icon {
          position: absolute;
          right: 0.6rem;
          pointer-events: none;
          color: var(--b-mid);
        }
        .pp-budget-input { 
          border: none !important; 
          background: transparent !important; 
          box-shadow: none !important; 
          padding-left: 0.95rem !important; 
          border-radius: 0 !important; 
          flex: 1; 
        }

        /* Upload section */
        .pp-upload-section { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.15rem; background: linear-gradient(135deg, rgba(239,246,255,0.6) 0%, rgba(248,250,255,0.4) 100%); border-radius: 14px; border: 1px solid rgba(37,99,235,0.09); margin-bottom: 1rem; }
        .pp-upload-title { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--s-mid); display: flex; align-items: center; gap: 0.4rem; }
        .pp-upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
        @media (max-width: 480px) { .pp-upload-grid { grid-template-columns: 1fr; } }

        /* Upload button */
        .pp-upload-btn-wrap { position: relative; display: flex; flex-direction: column; gap: 0.35rem; }
        .pp-upload-btn { position: relative; overflow: hidden; min-height: 88px; border-radius: 13px; border: 1.5px dashed rgba(37,99,235,0.25); background: rgba(255,255,255,0.82); cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.45rem; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s; text-align: center; padding: 0.85rem; }
        .pp-upload-btn:hover { border-color: var(--b-mid); background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); transform: translateY(-1px); }
        .pp-upload-btn:active { transform: scale(0.98); }
        .pp-upload-btn.has-file { border-style: solid; border-color: rgba(37,99,235,0.3); background: var(--b-pale); }
        .pp-upload-btn.uploading { border-color: var(--b-light); background: #EFF6FF; animation: pp-pulse 1.4s ease-in-out infinite; }
        @keyframes pp-pulse { 0%,100%{opacity:1} 50%{opacity:0.75} }
        .pp-upload-btn input[type="file"] { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .pp-upload-ico-wrap { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
        .pp-upload-btn:hover .pp-upload-ico-wrap { transform: scale(1.1); }
        .pp-upload-btn-label { font-size: 0.73rem; font-weight: 700; color: var(--s-mid); line-height: 1.3; }
        .pp-upload-btn-sub { font-size: 0.62rem; color: var(--s-muted); }

        /* Upload preview */
        .pp-upload-preview { display: flex; align-items: center; gap: 0.65rem; padding: 0.7rem 0.85rem; background: white; border-radius: 11px; border: 1px solid rgba(37,99,235,0.14); box-shadow: 0 1px 4px rgba(37,99,235,0.05); }
        .pp-preview-thumb { width: 44px; height: 44px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: var(--b-pale); display: flex; align-items: center; justify-content: center; border: 1px solid var(--b-border); }
        .pp-preview-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pp-preview-info { min-width: 0; flex: 1; }
        .pp-preview-name { font-size: 0.73rem; font-weight: 600; color: var(--s-dark); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pp-preview-meta { font-size: 0.62rem; color: var(--s-muted); display: flex; gap: 0.4rem; align-items: center; margin-top: 1px; }
        .pp-preview-badge { font-size: 0.55rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.08rem 0.38rem; border-radius: 99px; background: var(--b-pale); color: var(--b-mid); border: 1px solid #BFDBFE; }
        .pp-preview-remove { width: 28px; height: 28px; border-radius: 50%; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.18s; }
        .pp-preview-remove:hover { background: #FEE2E2; transform: scale(1.1); }
        .pp-upload-spinner { width: 18px; height: 18px; border: 2px solid rgba(37,99,235,0.15); border-top-color: var(--b-mid); border-radius: 50%; animation: ppspin 0.75s linear infinite; flex-shrink: 0; }
        @keyframes ppspin { to { transform: rotate(360deg); } }
        .pp-upload-err { font-size: 0.68rem; color: #B91C1C; display: flex; align-items: center; gap: 0.3rem; }

        /* Divider */
        .pp-section-divider { display: flex; align-items: center; gap: 0.65rem; margin: 1.1rem 0; }
        .pp-section-divider::before, .pp-section-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(37,99,235,0.12), transparent); }
        .pp-section-divider span { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--s-muted); white-space: nowrap; }

        /* Submit */
        .pp-submit-btn { width: 100%; min-height: 50px; background: linear-gradient(135deg, var(--b-deep) 0%, var(--b-mid) 50%, var(--b-light) 100%); background-size: 200% 100%; background-position: 0% 0%; border: none; border-radius: 13px; color: white; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 700; letter-spacing: 0.05em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 18px rgba(37,99,235,0.28); transition: background-position 0.5s, transform 0.15s, box-shadow 0.25s; margin-top: 0.25rem; }
        .pp-submit-btn:hover:not(:disabled) { background-position: 100% 0%; box-shadow: 0 8px 28px rgba(37,99,235,0.38); transform: translateY(-1px); }
        .pp-submit-btn:disabled { opacity: 0.58; cursor: not-allowed; }
        .pp-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: ppspin 0.75s linear infinite; }

        /* Form feedback */
        .pp-form-msg { display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.75rem 0.95rem; border-radius: 11px; font-size: 0.78rem; line-height: 1.5; font-weight: 500; border: 1px solid; margin-top: 0.9rem; animation: ppfade 0.3s ease; }
        .pp-form-msg.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }
        .pp-form-msg.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }

        /* Chips */
        .pp-chips { display: flex; gap: 0.55rem; flex-wrap: wrap; padding: 0.9rem 1.4rem; border-bottom: 1px solid var(--b-border); }
        .pp-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.32rem 0.72rem; border-radius: 9px; font-size: 0.7rem; font-weight: 600; border: 1px solid; transition: transform 0.15s; }
        .pp-chip:hover { transform: translateY(-1px); }
        .pp-chip-dot { width: 5px; height: 5px; border-radius: 50%; }
        .pp-chip-count { font-family: 'Cormorant Garamond', serif; font-size: 1rem; font-weight: 600; line-height: 1; }

        /* Filters */
        .pp-filter-bar { padding: 0.85rem 1.4rem; border-bottom: 1px solid var(--b-border); display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .pp-filter-lbl { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--s-muted); white-space: nowrap; }
        .pp-pills { display: flex; gap: 0.32rem; flex-wrap: wrap; }
        .pp-pill { height: 28px; padding: 0 0.72rem; border-radius: 99px; border: 1.5px solid rgba(37,99,235,0.13); background: rgba(255,255,255,0.85); font-family: 'DM Sans', sans-serif; font-size: 0.68rem; font-weight: 600; color: var(--s-mid); cursor: pointer; transition: all 0.18s; white-space: nowrap; }
        .pp-pill:hover { border-color: rgba(37,99,235,0.35); background: var(--b-pale); color: var(--b-mid); }
        .pp-pill.active { background: var(--b-pale); border-color: var(--b-mid); color: var(--b-mid); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); }
        .pp-refresh-btn { margin-left: auto; height: 28px; padding: 0 0.8rem; background: none; border: 1.5px solid rgba(37,99,235,0.16); border-radius: 99px; cursor: pointer; color: var(--b-mid); font-family: 'DM Sans', sans-serif; font-size: 0.68rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.32rem; transition: all 0.18s; white-space: nowrap; }
        .pp-refresh-btn:hover { background: var(--b-pale); border-color: var(--b-mid); }
        @media (max-width: 640px) { .pp-refresh-btn { margin-left: 0; width: 100%; justify-content: center; } }

        /* Table */
        .pp-table-wrap { overflow-x: auto; }
        .pp-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .pp-table th { padding: 0.72rem 1.4rem; text-align: left; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--s-muted); white-space: nowrap; border-bottom: 1px solid var(--b-border); }
        .pp-table td { padding: 0.95rem 1.4rem; vertical-align: middle; border-bottom: 1px solid rgba(37,99,235,0.05); color: var(--s-dark); }
        .pp-table tr:last-child td { border-bottom: none; }
        .pp-table tr:hover td { background: rgba(239,246,255,0.35); }
        .pp-table-title { font-weight: 600; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pp-table-budget { font-family: 'DM Mono', monospace; font-size: 0.8rem; color: var(--s-mid); }
        .pp-table-date { font-size: 0.76rem; color: var(--s-muted); white-space: nowrap; }
        .pp-status-badge { display: inline-flex; align-items: center; gap: 0.32rem; padding: 0.26rem 0.62rem; border-radius: 99px; font-size: 0.63rem; font-weight: 700; border: 1px solid; white-space: nowrap; }
        .pp-status-dot { width: 5px; height: 5px; border-radius: 50%; }

        /* States */
        .pp-loader { display: flex; align-items: center; justify-content: center; padding: 2.5rem; gap: 0.65rem; color: var(--s-muted); font-size: 0.8rem; }
        .pp-ring { width: 20px; height: 20px; border: 2px solid rgba(37,99,235,0.1); border-top-color: var(--b-mid); border-radius: 50%; animation: ppspin 0.8s linear infinite; }
        .pp-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem 1.5rem; gap: 0.6rem; text-align: center; }
        .pp-empty-ico { width: 48px; height: 48px; border-radius: 50%; background: var(--b-pale); display: flex; align-items: center; justify-content: center; }
        .pp-empty-title { font-size: 0.88rem; font-weight: 600; color: var(--s-mid); }
        .pp-empty-sub { font-size: 0.74rem; color: var(--s-muted); }
        .pp-fetch-err { display: flex; align-items: center; gap: 0.5rem; padding: 1.2rem 1.4rem; color: #B91C1C; font-size: 0.78rem; }

        /* Note */
        .pp-note { margin: 0 1.4rem 1.4rem; background: var(--b-faint); border: 1px solid rgba(37,99,235,0.1); border-radius: 14px; padding: 0.9rem 1.1rem; display: flex; gap: 0.65rem; align-items: flex-start; }
        .pp-note p { font-size: 0.76rem; color: var(--s-mid); line-height: 1.65; }
        .pp-note strong { color: var(--s-dark); }
      `}</style>

      <div className={`pp-root${mounted ? '' : ''}`}>

        {/* Header */}
        <div className="pp-header">
          <div className="pp-eyebrow"><div className="pp-eyebrow-dot" />Espace membre</div>
          <h1 className="pp-title">Proposer un <span className="pp-title-accent">projet</span></h1>
          <p className="pp-subtitle">Soumettez une idée à l&apos;administrateur de votre antenne</p>
        </div>

        <div className="pp-layout">

          {/* ── LEFT — Formulaire ── */}
          <div className="pp-card pp-card-left">
            <div className="pp-card-head">
              <div className="pp-head-ico" style={{ background: '#EFF6FF' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <span className="pp-head-title">Nouvelle proposition</span>
            </div>

            <div className="pp-card-body">
              <form onSubmit={(e) => { void handleSubmit(e); }}>
                <div className="pp-field">
                  <label className="pp-label">Titre du projet</label>
                  <input className="pp-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Un titre clair et concis…" maxLength={120} disabled={submitting} />
                </div>

                <div className="pp-field">
                  <label className="pp-label">Description détaillée</label>
                  <textarea className="pp-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez le besoin, l'objectif, les bénéficiaires, l'impact attendu…" disabled={submitting} />
                </div>

                <div className="pp-field">
                  <label className="pp-label">Budget estimatif <span className="pp-opt">(optionnel)</span></label>
                  <div className="pp-budget-wrap">
                    <div className="pp-budget-select-wrap">
                      <select className="pp-budget-currency" value={currency} onChange={e => setCurrency(e.target.value)} disabled={submitting}>
                        <option value="EUR">EUR (€)</option>
                        <option value="XOF">XOF (CFA)</option>
                        <option value="GNF">GNF (FG)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="CHF">CHF</option>
                      </select>
                      <svg className="pp-budget-select-icon" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                    <input className="pp-input pp-budget-input" type="number" min="0" step="any" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" disabled={submitting} />
                  </div>
                </div>

                <div className="pp-section-divider"><span>Pièces jointes</span></div>

                <div className="pp-upload-section">
                  <div className="pp-upload-title">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    Ajouter des fichiers
                  </div>

                  <div className="pp-upload-grid">
                    {/* ── Bouton document ── */}
                    <div className="pp-upload-btn-wrap">
                      {!attachmentPreview ? (
                        <label className={`pp-upload-btn${uploadingAttachment ? ' uploading' : ''}`}>
                          <input ref={attachmentRef} type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp" onChange={handleAttachmentChange} disabled={uploadingAttachment || submitting} />
                          {uploadingAttachment ? (
                            <><div className="pp-upload-spinner" /><span className="pp-upload-btn-label">Upload…</span></>
                          ) : (
                            <>
                              <div className="pp-upload-ico-wrap" style={{ background: '#EFF6FF' }}>
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                              </div>
                              <span className="pp-upload-btn-label">Document</span>
                              <span className="pp-upload-btn-sub">PDF · DOC · DOCX</span>
                            </>
                          )}
                        </label>
                      ) : (
                        <div className="pp-upload-preview">
                          <div className="pp-preview-thumb">
                            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          </div>
                          <div className="pp-preview-info">
                            <div className="pp-preview-name">{attachmentPreview.name}</div>
                            <div className="pp-preview-meta">
                              <span className="pp-preview-badge">{attachmentPreview.type}</span>
                              {attachmentPreview.size}
                              {uploadingAttachment && <div className="pp-upload-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
                              {!uploadingAttachment && attachmentAssetId && (
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                              )}
                            </div>
                          </div>
                          <button type="button" className="pp-preview-remove" onClick={removeAttachment}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      )}
                      {attachmentError && (
                        <div className="pp-upload-err">
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                          {attachmentError}
                        </div>
                      )}
                    </div>

                    {/* ── Bouton photo ── */}
                    <div className="pp-upload-btn-wrap">
                      {!photoPreviewUrl ? (
                        <label className={`pp-upload-btn${uploadingPhoto ? ' uploading' : ''}`}>
                          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} disabled={uploadingPhoto || submitting} />
                          {uploadingPhoto ? (
                            <><div className="pp-upload-spinner" /><span className="pp-upload-btn-label">Upload…</span></>
                          ) : (
                            <>
                              <div className="pp-upload-ico-wrap" style={{ background: '#F5F3FF' }}>
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#7C3AED" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              </div>
                              <span className="pp-upload-btn-label">Photo</span>
                              <span className="pp-upload-btn-sub">JPG · PNG · WEBP</span>
                            </>
                          )}
                        </label>
                      ) : (
                        <div className="pp-upload-preview">
                          <div className="pp-preview-thumb">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoPreviewUrl} alt="Aperçu" />
                          </div>
                          <div className="pp-preview-info">
                            <div className="pp-preview-name">{photoMeta?.name}</div>
                            <div className="pp-preview-meta">
                              <span className="pp-preview-badge">Image</span>
                              {photoMeta?.size}
                              {uploadingPhoto && <div className="pp-upload-spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />}
                              {!uploadingPhoto && photoAssetId && (
                                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                              )}
                            </div>
                          </div>
                          <button type="button" className="pp-preview-remove" onClick={removePhoto}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      )}
                      {photoError && (
                        <div className="pp-upload-err">
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                          {photoError}
                        </div>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.64rem', color: 'var(--s-muted)', lineHeight: 1.5 }}>
                    Document : PDF, DOC, DOCX, images — max 10 Mo&nbsp;·&nbsp;Photo : JPG, PNG, WEBP — max 5 Mo
                  </p>
                </div>

                <button type="submit" className="pp-submit-btn" disabled={submitting || uploadingAttachment || uploadingPhoto}>
                  {submitting ? (
                    <><div className="pp-spinner" />Envoi en cours…</>
                  ) : (
                    <>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                      Envoyer la proposition
                    </>
                  )}
                </button>

                {formError && (
                  <div className="pp-form-msg err">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="pp-form-msg ok">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Proposition soumise avec succès !
                  </div>
                )}
              </form>
            </div>

            <div className="pp-note">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="1.8" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p>
                Votre proposition sera examinée par l&apos;administrateur de votre antenne.
                Vous serez notifié dès qu&apos;une décision sera prise.
                Une proposition <strong>approuvée</strong> peut être convertie en projet officiel.
              </p>
            </div>
          </div>

          {/* ── RIGHT — Historique ── */}
          <div className="pp-card pp-card-right">
            <div className="pp-card-head">
              <div className="pp-head-ico" style={{ background: '#F5F3FF' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#7C3AED" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <span className="pp-head-title">Mes propositions</span>
            </div>

            {/* Stats chips */}
            <div className="pp-chips">
              {[
                { label: 'Total',      count: total,     color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
                { label: 'Soumises',   count: submitted, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
                { label: 'En revue',   count: underRev,  color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
                { label: 'Approuvées', count: approved,  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981' },
                { label: 'Rejetées',   count: rejected,  color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
              ].map(c => (
                <div key={c.label} className="pp-chip" style={{ background: c.bg, borderColor: c.border, color: c.color }}>
                  <span className="pp-chip-dot" style={{ background: c.dot }} />
                  <span className="pp-chip-count">{c.count}</span>
                  <span style={{ fontSize: '0.66rem', opacity: 0.9 }}>{c.label}</span>
                </div>
              ))}
            </div>

            {/* Filtres */}
            <div className="pp-filter-bar">
              <span className="pp-filter-lbl">Filtrer :</span>
              <div className="pp-pills">
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} className={`pp-pill${status === opt.value ? ' active' : ''}`} onClick={() => setStatus(opt.value)} type="button">
                    {opt.label}
                  </button>
                ))}
              </div>
              <button className="pp-refresh-btn" onClick={() => void load()} type="button">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Actualiser
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="pp-loader"><div className="pp-ring" />Chargement…</div>
            ) : fetchError ? (
              <div className="pp-fetch-err">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                {fetchError}
              </div>
            ) : items.length === 0 ? (
              <div className="pp-empty">
                <div className="pp-empty-ico">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#93C5FD" strokeWidth="1.6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <p className="pp-empty-title">Aucune proposition</p>
                <p className="pp-empty-sub">{status ? 'Aucune proposition avec ce statut.' : 'Soumettez votre première idée de projet !'}</p>
              </div>
            ) : (
              <div className="pp-table-wrap">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Budget</th>
                      <th>Statut</th>
                      <th>Créée le</th>
                      <th>Mise à jour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const meta = STATUS_META[item.status] ?? { label: item.status, color: '#374151', bg: '#F3F4F6', border: '#E5E7EB', dot: '#9CA3AF' };
                      return (
                        <tr key={item.id}>
                          <td><div className="pp-table-title" title={item.title}>{item.title}</div></td>
                          <td><span className="pp-table-budget">{item.expectedBudget != null ? `${Number(item.expectedBudget).toLocaleString('fr-FR')} ${item.currency ?? '€'}` : '—'}</span></td>
                          <td>
                            <span className="pp-status-badge" style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}>
                              <span className="pp-status-dot" style={{ background: meta.dot }} />
                              {meta.label}
                            </span>
                          </td>
                          <td><span className="pp-table-date">{fmt(item.createdAt)}</span></td>
                          <td><span className="pp-table-date">{fmt(item.updatedAt)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppShell>
  );
}