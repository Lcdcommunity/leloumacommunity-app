// web/app/(protected)/member/projects/propose/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef, ChangeEvent } from 'react';
import Image from 'next/image';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import type { ProjectProposal } from '../../../../../types/project-proposal';

// ─── Interfaces & Types stricts (Correction ESLint) ──────────────────────────
type StatusKey = '' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_PROJECT';

interface ProposalPayload {
  title: string;
  description: string;
  expectedBudget?: number;
  currency?: string;
  attachmentFileAssetId?: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string | string[];
    };
  };
  message?: string;
}

interface AttachedFile {
  id: string;
  url: string;
  mimeType?: string | null;
  fileName?: string | null;
  sizeBytes?: number | null;
}

interface ExtendedProjectProposal extends ProjectProposal {
  attachedFile?: AttachedFile | null;
  attachmentFileAssetId?: string | null;
}

interface ActionDialogState {
  isOpen: boolean;
  type: 'edit' | 'delete';
  title: string;
  desc: string;
}

// ─── Constantes ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: StatusKey; label: string }[] = [
  { value: '',                      label: 'Tous' },
  { value: 'SUBMITTED',             label: 'Soumises' },
  { value: 'UNDER_REVIEW',          label: 'En revue' },
  { value: 'APPROVED',              label: 'Approuvées' },
  { value: 'REJECTED',              label: 'Rejetées' },
  { value: 'CONVERTED_TO_PROJECT',  label: 'Converties' },
];

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  SUBMITTED:            { label: 'Soumise',   color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', dot: '#D97706' },
  UNDER_REVIEW:         { label: 'En revue',  color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6' },
  APPROVED:             { label: 'Approuvée', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981' },
  REJECTED:             { label: 'Rejetée',   color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444' },
  CONVERTED_TO_PROJECT: { label: 'Convertie', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', dot: '#8B5CF6' },
};

function fmt(dateStr?: string | Date) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isFileImage(file: AttachedFile | null | undefined): boolean {
  if (!file) return false;
  const name = (file.fileName || file.url || '').toLowerCase();
  if (name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')) return false;
  const mime = (file.mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return false;
  if (mime.includes('image/')) return true;
  return /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(name);
}

// ─── Composant principal ─────────────────────────────────────────────────────
export default function MemberProjectProposalsPage() {
  const [mounted, setMounted] = useState(false);
  
  // ── Gestion des vues ──
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ExtendedProjectProposal | null>(null);
  const [imgError, setImgError] = useState(false); 
  const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);

  // 🔥 ID de la proposition en cours de modification
  const [editingId, setEditingId] = useState<string | null>(null);

  // ── Liste propositions ──
  const [items,      setItems]      = useState<ExtendedProjectProposal[]>([]);
  const [status,     setStatus]     = useState<StatusKey>('');
  const [search,     setSearch]     = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Formulaire ──
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [budget,      setBudget]      = useState('');
  const [currency,    setCurrency]    = useState('EUR');
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

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setImgError(false);
  }, [selectedProposal]);

  // ── Chargement liste ──
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listMyProjectProposals({ page: 1, pageSize: 100, status: status || undefined });
      setItems((res?.items as unknown as ExtendedProjectProposal[]) || []);
      setFetchError(null);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── Upload pièce jointe ──
  async function handleAttachmentChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAttachmentError(null);
    if (!file) return;

    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp'];
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

    const sizeStr = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} Ko` : `${(file.size / (1024 * 1024)).toFixed(1)} Mo`;
    const typeStr = file.type.includes('pdf') ? 'PDF' : file.type.includes('word') ? 'DOC' : 'Image';

    setAttachmentPreview({ name: file.name, size: sizeStr, type: typeStr });
    setUploadingAttachment(true);

    try {
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
    setPhotoMeta({ name: file.name, size: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} Ko` : `${(file.size / (1024 * 1024)).toFixed(1)} Mo` });
    setUploadingPhoto(true);

    try {
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

  // ── Annuler le formulaire ──
  function handleCancel() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setBudget('');
    setCurrency('EUR');
    removeAttachment();
    removePhoto();
    setFormError(null);
    setIsFormOpen(false);
  }

  // ── Actions Modification / Suppression avec Custom Dialog ──
  function handleEditProposal() {
    if (!selectedProposal) return;
    
    // Bascule en mode édition
    setEditingId(selectedProposal.id);
    setTitle(selectedProposal.title || '');
    setDescription(selectedProposal.description || '');
    setBudget(selectedProposal.expectedBudget ? String(selectedProposal.expectedBudget) : '');
    setCurrency(selectedProposal.currency || 'GNF');

    // Récupération des pièces jointes existantes
    removeAttachment();
    removePhoto();
    
    if (selectedProposal.attachedFile) {
      if (isFileImage(selectedProposal.attachedFile)) {
        setPhotoPreviewUrl(selectedProposal.attachedFile.url);
        setPhotoAssetId(selectedProposal.attachmentFileAssetId || selectedProposal.attachedFile.id);
        setPhotoMeta({ name: selectedProposal.attachedFile.fileName || '', size: 'Fichier existant' });
      } else {
        setAttachmentPreview({ name: selectedProposal.attachedFile.fileName || '', size: 'Fichier existant', type: 'DOC' });
        setAttachmentAssetId(selectedProposal.attachmentFileAssetId || selectedProposal.attachedFile.id);
      }
    }

    setActionDialog(null);
    setSelectedProposal(null);
    setIsFormOpen(true);
  }

  function handleDeleteProposal() {
    setActionDialog({
      isOpen: true,
      type: 'delete',
      title: 'Supprimer la proposition',
      desc: 'Voulez-vous vraiment supprimer cette proposition ? Cette action est irréversible.'
    });
  }

  async function executeDelete() {
    if (!selectedProposal?.id) return;
    
    setIsDeleting(true);
    try {
      await api.deleteProjectProposalMember(selectedProposal.id);
      setActionDialog(null);
      setSelectedProposal(null);
      void load();
    } catch (err: unknown) {
      const errorObj = err as ApiError;
      alert(errorObj?.message || 'Erreur lors de la suppression.');
      setActionDialog(null);
    } finally {
      setIsDeleting(false);
    }
  }

  // ── Soumission ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())       { setFormError('Le titre est obligatoire.'); return; }
    if (!description.trim()) { setFormError('La description est obligatoire.'); return; }
    if (uploadingAttachment || uploadingPhoto) { setFormError('Upload en cours, patientez…'); return; }

    setFormError(null);
    setSubmitting(true);
    try {
      const payload: ProposalPayload = {
        title:       title.trim(),
        description: description.trim(),
      };

      if (budget) {
        payload.expectedBudget = Number(budget);
        payload.currency = currency;
      }

      const finalAssetId = attachmentAssetId || photoAssetId;
      if (finalAssetId) {
        payload.attachmentFileAssetId = finalAssetId;
      }

      if (editingId) {
        await api.updateProjectProposalMember(editingId, payload as unknown as Parameters<typeof api.updateProjectProposalMember>[1]);
      } else {
        await api.createProjectProposalMember(payload as unknown as Parameters<typeof api.createProjectProposalMember>[0]);
      }
      
      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        handleCancel();
        void load();
      }, 2000);
    } catch (err: unknown) {
      const errorObj = err as ApiError;
      const msg = errorObj?.response?.data?.message || errorObj?.message;
      setFormError(Array.isArray(msg) ? msg[0] : (msg || 'Erreur lors de la soumission.'));
    } finally {
      setSubmitting(false);
    }
  }

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
          --card-bg:  #FFFFFF;
        }

        .pp-root { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 860px; margin: 0 auto; color: var(--s-dark); }

        /* HEADER & BOUTONS */
        .pp-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .pp-page-title { font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 700; color: var(--s-dark); line-height: 1.1; margin: 0; }
        .pp-page-subtitle { font-size: 0.85rem; color: var(--s-muted); margin-top: 0.2rem; }
        
        .pp-primary-btn { background: var(--b-mid); color: white; border: none; padding: 0.7rem 1.2rem; border-radius: 99px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.4rem; box-shadow: 0 4px 12px rgba(37,99,235,0.2); }
        .pp-primary-btn:hover { background: var(--b-deep); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.3); }
        
        .pp-back-btn { background: white; color: var(--s-mid); border: 1px solid #E2E8F0; padding: 0.6rem 1rem; border-radius: 99px; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.4rem; }
        .pp-back-btn:hover { background: #F8FAFC; color: var(--s-dark); border-color: #CBD5E1; }

        /* WRAPPER PRINCIPAL */
        .pp-main-wrapper { background: var(--card-bg); border-radius: 24px; border: 1px solid var(--b-border); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05); overflow: hidden; animation: ppfade 0.4s ease forwards; }
        @keyframes ppfade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* EN-TÊTE DU WRAPPER */
        .pp-wrapper-head { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.04); display: flex; align-items: center; gap: 0.6rem; }
        .pp-head-ico { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #F5F3FF; color: #7C3AED; }
        .pp-head-title { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--s-dark); }

        /* GRILLE DE STATS EXACTE */
        .pp-stat-grid { display: flex; flex-wrap: wrap; gap: 1rem; padding: 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.04); }
        .pp-stat-card { flex: 1; min-width: 100px; position: relative; background: white; border-radius: 12px; padding: 1.2rem 0.5rem; border: 1px solid #E2E8F0; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.02); overflow: hidden; transition: transform 0.15s; }
        .pp-stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.04); }
        .pp-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 700; color: var(--s-dark); display: block; line-height: 1; margin-bottom: 0.4rem; }
        .pp-stat-lbl { font-size: 0.62rem; font-weight: 800; text-transform: uppercase; color: var(--s-muted); letter-spacing: 0.05em; }

        /* BARRE DE FILTRES : Forcée sur une ligne (Mobile) */
        .pp-filter-bar { padding: 1.2rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.04); display: flex; align-items: center; gap: 0.6rem; flex-wrap: nowrap; background: #FAFAFA; overflow-x: auto; }
        .pp-search-box { display: flex; align-items: center; gap: 0.5rem; background: white; border: 1.5px solid #E2E8F0; border-radius: 99px; padding: 0.4rem 0.8rem; flex: 1; min-width: 130px; transition: border-color 0.2s; }
        .pp-search-box:focus-within { border-color: var(--b-mid); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .pp-search-box input { border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; width: 100%; color: var(--s-dark); background: transparent; }
        .pp-search-box input::placeholder { color: #9CA3AF; }
        .pp-status-select { border: 1.5px solid #E2E8F0; border-radius: 99px; padding: 0.4rem 0.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; color: var(--s-mid); outline: none; background: white; cursor: pointer; transition: border-color 0.2s; flex-shrink: 0; }
        .pp-status-select:focus { border-color: var(--b-mid); }
        .pp-refresh-btn { height: 36px; padding: 0 1rem; background: white; border: 1.5px solid #E2E8F0; border-radius: 99px; cursor: pointer; color: var(--b-mid); font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.2s; flex-shrink: 0; }
        .pp-refresh-btn:hover { background: var(--b-pale); border-color: var(--b-mid); }
        
        @media (max-width: 640px) { 
          .pp-filter-bar { padding: 0.8rem 1rem; gap: 0.4rem; }
          .pp-search-box { min-width: 100px; padding: 0.35rem 0.6rem; }
          .pp-search-box input { font-size: 0.75rem; }
          .pp-status-select { padding: 0.35rem 0.6rem; font-size: 0.75rem; }
          .pp-refresh-btn { padding: 0 0.6rem; font-size: 0.75rem; height: 32px; }
          .pp-refresh-text { display: none; }
        }

        /* LISTE DES CARTES : Transparentes Bleu Ciel */
        .pp-list-container { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; background: #FAFAFA; }
        .pp-item-card { background: rgba(239, 246, 255, 0.5); border: 1px solid rgba(191, 219, 254, 0.8); border-radius: 16px; padding: 1.25rem 1.5rem; transition: transform 0.2s, box-shadow 0.2s, background 0.2s; cursor: pointer; display: flex; flex-direction: column; gap: 0.8rem; }
        .pp-item-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(37,99,235,0.08); background: rgba(239, 246, 255, 0.9); border-color: #93C5FD; }
        
        .pp-item-header { display: flex; justify-content: space-between; align-items: center; }
        .pp-item-date { font-size: 0.75rem; color: var(--s-muted); font-weight: 600; display: flex; align-items: center; gap: 0.4rem; }
        .pp-status-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 99px; font-size: 0.65rem; font-weight: 700; border: 1px solid; white-space: nowrap; }
        .pp-status-dot { width: 6px; height: 6px; border-radius: 50%; }
        
        .pp-item-title { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; font-weight: 700; color: var(--s-dark); line-height: 1.2; margin: 0; }
        .pp-item-divider { border: none; border-top: 1.5px dotted #93C5FD; margin: 0.5rem 0; }
        
        .pp-item-budget-lbl { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--s-muted); margin-bottom: 0.3rem; }
        .pp-item-budget-val { font-family: 'DM Mono', monospace; font-size: 1.1rem; font-weight: 700; color: var(--b-mid); background: white; display: inline-block; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid #E0E7FF; }

        /* FORMULAIRE */
        .pp-form-body { padding: 1.5rem; }
        .pp-field { margin-bottom: 1.2rem; }
        .pp-label { display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--s-mid); margin-bottom: 0.4rem; letter-spacing: 0.05em; }
        .pp-input, .pp-textarea { width: 100%; border-radius: 12px; border: 1.5px solid #E2E8F0; background: #FAFAFA; padding: 0.8rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; outline: none; transition: all 0.2s; }
        .pp-input:focus, .pp-textarea:focus { border-color: var(--b-mid); background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .pp-textarea { min-height: 140px; resize: vertical; line-height: 1.6; }
        
        .pp-budget-wrap { display: flex; border: 1.5px solid #E2E8F0; border-radius: 12px; overflow: hidden; background: #FAFAFA; transition: all 0.2s; }
        .pp-budget-wrap:focus-within { border-color: var(--b-mid); background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
        .pp-currency-select { border: none; background: transparent; padding: 0 1rem; font-weight: 700; font-size: 0.9rem; color: var(--b-mid); border-right: 1px solid #E2E8F0; outline: none; cursor: pointer; }
        .pp-budget-input { border: none !important; background: transparent !important; box-shadow: none !important; padding: 0.8rem 1rem; font-family: 'DM Mono', monospace; font-size: 1rem; flex: 1; outline: none; }

        .pp-upload-zone { background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .pp-upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
        @media (max-width: 480px) { .pp-upload-grid { grid-template-columns: 1fr; } }
        
        .pp-upload-btn { height: 100px; border: 1.5px dashed #CBD5E1; border-radius: 12px; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
        .pp-upload-btn:hover { border-color: var(--b-mid); background: var(--b-pale); }
        .pp-upload-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .pp-upload-err-txt { font-size: 0.65rem; color: #DC2626; margin-top: 0.4rem; text-align: center; padding: 0 0.5rem; }

        .pp-file-preview { display: flex; align-items: center; gap: 0.8rem; background: white; padding: 0.8rem; border-radius: 12px; border: 1px solid #E2E8F0; height: 100%; }
        .pp-file-thumb { position: relative; width: 40px; height: 40px; border-radius: 8px; background: var(--b-pale); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: var(--b-mid); flex-shrink: 0; }
        .pp-file-info { flex: 1; min-width: 0; }
        .pp-file-name { font-size: 0.75rem; font-weight: 700; overflow-wrap: anywhere; word-break: break-word; line-height: 1.3; }
        .pp-file-meta { font-size: 0.65rem; color: var(--s-muted); margin-top: 0.2rem; display: flex; align-items: center; gap: 0.4rem; }
        .pp-file-remove { background: #FEF2F2; color: #EF4444; border: 1px solid #FECACA; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.18s; }
        .pp-file-remove:hover { background: #FEE2E2; transform: scale(1.1); }

        .pp-form-actions { display: flex; gap: 1rem; margin-top: 1rem; }
        .pp-cancel-btn { flex: 1; padding: 1rem; background: white; border: 1.5px solid #E2E8F0; border-radius: 14px; font-weight: 700; color: var(--s-mid); cursor: pointer; transition: all 0.2s; }
        .pp-cancel-btn:hover { background: #F8FAFC; border-color: #CBD5E1; color: var(--s-dark); }
        .pp-submit-btn { flex: 2; padding: 1rem; background: var(--b-mid); color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.2); display: flex; align-items: center; justify-content: center; gap: 0.6rem; }
        .pp-submit-btn:hover:not(:disabled) { background: var(--b-deep); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37,99,235,0.3); }
        .pp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .pp-alert { padding: 1rem; border-radius: 12px; margin-top: 1rem; font-size: 0.85rem; font-weight: 500; display: flex; align-items: flex-start; gap: 0.6rem; animation: ppfade 0.3s ease; }
        .pp-alert-err { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
        .pp-alert-ok { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }

        /* MODAL PRINCIPAL */
        .pp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 1rem; animation: fadein 0.2s ease; }
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        .pp-modal-content { background: white; width: 100%; max-width: 540px; border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; animation: slideup 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); max-height: 90vh; display: flex; flex-direction: column; }
        @keyframes slideup { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .pp-modal-header { padding: 1.5rem; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
        .pp-modal-body { padding: 1.5rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.25rem; }
        
        /* 🔥 ICÔNES D'ACTION (MODAL) */
        .pp-modal-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
        .pp-icon-btn { width: 34px; height: 34px; border-radius: 10px; border: 1px solid #E2E8F0; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
        .pp-edit-btn { color: var(--b-mid); }
        .pp-edit-btn:hover { background: #EFF6FF; border-color: #BFDBFE; transform: scale(1.05); }
        .pp-delete-btn { color: #DC2626; }
        .pp-delete-btn:hover { background: #FEF2F2; border-color: #FECACA; transform: scale(1.05); }
        .pp-modal-actions-divider { width: 1px; height: 24px; background: #E2E8F0; margin: 0 0.2rem; }

        .pp-modal-close { width: 34px; height: 34px; border-radius: 10px; background: #F1F5F9; border: 1px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--s-muted); flex-shrink: 0; transition: all 0.2s; }
        .pp-modal-close:hover { background: #E2E8F0; color: var(--s-dark); border-color: #CBD5E1; }
        
        .pp-detail-block { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1rem; }
        .pp-detail-lbl { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--s-muted); margin-bottom: 0.4rem; }
        .pp-detail-txt { font-size: 0.9rem; color: var(--s-dark); line-height: 1.6; white-space: pre-wrap; }

        .pp-empty-state { text-align: center; padding: 3rem 1rem; color: var(--s-muted); }

        /* 🔥 MODAL DE CONFIRMATION (REMPLACE WINDOW.ALERT) */
        .pp-dialog-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; animation: fadein 0.2s ease; }
        .pp-dialog-card { background: white; width: 100%; max-width: 400px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); padding: 1.5rem; text-align: center; animation: slideup 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .pp-dialog-icon { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .pp-dialog-icon.danger { background: #FEF2F2; color: #DC2626; }
        .pp-dialog-icon.info { background: #EFF6FF; color: #2563EB; }
        .pp-dialog-title { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; font-weight: 700; color: var(--s-dark); margin-bottom: 0.5rem; line-height: 1.2; }
        .pp-dialog-desc { font-size: 0.85rem; color: var(--s-muted); line-height: 1.5; margin-bottom: 1.5rem; }
        .pp-dialog-actions { display: flex; gap: 0.8rem; justify-content: center; }
        .pp-dialog-btn { flex: 1; padding: 0.7rem 1rem; border-radius: 12px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; border: none; display: flex; align-items: center; justify-content: center; gap: 0.4rem; }
        .pp-dialog-btn-cancel { background: #F1F5F9; color: var(--s-mid); }
        .pp-dialog-btn-cancel:hover:not(:disabled) { background: #E2E8F0; color: var(--s-dark); }
        .pp-dialog-btn-danger { background: #DC2626; color: white; box-shadow: 0 4px 12px rgba(220,38,38,0.2); }
        .pp-dialog-btn-danger:hover:not(:disabled) { background: #B91C1C; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(220,38,38,0.3); }
        .pp-dialog-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className={`pp-root${mounted ? '' : ''}`}>
        
        {/* EN-TÊTE PRINCIPAL */}
        <div className="pp-top-bar">
          <div>
            <h1 className="pp-page-title">Projets proposés</h1>
            <p className="pp-page-subtitle">Gérez et soumettez vos idées de projets pour l&apos;antenne.</p>
          </div>
          {!isFormOpen ? (
            <button className="pp-primary-btn" onClick={() => setIsFormOpen(true)}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Nouvelle proposition
            </button>
          ) : (
            <button className="pp-back-btn" onClick={handleCancel}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Retour à la liste
            </button>
          )}
        </div>

        {/* ─── VUE 1 : LISTE DES PROPOSITIONS ─── */}
        {!isFormOpen && (
          <div className="pp-main-wrapper">
            <div className="pp-wrapper-head">
              <div className="pp-head-ico">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <span className="pp-head-title">Mes propositions</span>
            </div>

            {/* GRILLE STATS */}
            <div className="pp-stat-grid">
              {[
                { label: 'Total',      count: total,     color: '#1D4ED8' },
                { label: 'Soumises',   count: submitted, color: '#B45309' },
                { label: 'En revue',   count: underRev,  color: '#1D4ED8' },
                { label: 'Approuvées', count: approved,  color: '#059669' },
                { label: 'Rejetées',   count: rejected,  color: '#B91C1C' },
              ].map(c => (
                <div key={c.label} className="pp-stat-card">
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: c.color, borderRadius: '12px 12px 0 0' }} />
                  <span className="pp-stat-val">{c.count}</span>
                  <span className="pp-stat-lbl">{c.label}</span>
                </div>
              ))}
            </div>

            {/* BARRE DE FILTRES (Mobile Optimisée) */}
            <div className="pp-filter-bar">
              <div className="pp-search-box">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input type="text" placeholder="Rechercher par titre..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              
              <select className="pp-status-select" value={status} onChange={e => setStatus(e.target.value as StatusKey)}>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <button className="pp-refresh-btn" onClick={() => void load()} type="button" title="Actualiser">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                <span className="pp-refresh-text">Actualiser</span>
              </button>
            </div>

            {/* LISTE DES CARTES (Bleu Ciel Transparent) */}
            <div className="pp-list-container">
              {loading ? (
                <div className="pp-empty-state">Chargement...</div>
              ) : fetchError ? (
                <div className="pp-empty-state" style={{ color: '#DC2626' }}>{fetchError}</div>
              ) : filteredItems.length === 0 ? (
                <div className="pp-empty-state">Aucune proposition trouvée.</div>
              ) : (
                filteredItems.map(item => {
                  const meta = STATUS_META[item.status] ?? { label: item.status, color: '#374151', bg: '#F3F4F6', border: '#E5E7EB', dot: '#9CA3AF' };
                  return (
                    <div key={item.id} className="pp-item-card" onClick={() => setSelectedProposal(item)}>
                      <div className="pp-item-header">
                        <span className="pp-item-date">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                          {fmt(item.createdAt)}
                        </span>
                        <span className="pp-status-badge" style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}>
                          <span className="pp-status-dot" style={{ background: meta.dot }} />
                          {meta.label}
                        </span>
                      </div>
                      
                      <h3 className="pp-item-title">{item.title}</h3>
                      <hr className="pp-item-divider" />
                      
                      <div>
                        <div className="pp-item-budget-lbl">BUDGET ESTIMÉ</div>
                        <div className="pp-item-budget-val">
                          {item.expectedBudget != null ? `${Number(item.expectedBudget).toLocaleString('fr-FR')} ${item.currency ?? 'GNF'}` : 'Non défini'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── VUE 2 : FORMULAIRE ─── */}
        {isFormOpen && (
          <div className="pp-main-wrapper">
            <div className="pp-wrapper-head">
              <div className="pp-head-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </div>
              <span className="pp-head-title">{editingId ? 'Modifier la proposition' : 'Rédiger une proposition'}</span>
            </div>

            <div className="pp-form-body">
              <form onSubmit={(e) => { void handleSubmit(e); }}>
                <div className="pp-field">
                  <label className="pp-label">Titre du projet</label>
                  <input className="pp-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Un titre clair et concis…" maxLength={120} disabled={submitting} />
                </div>

                <div className="pp-field">
                  <label className="pp-label">Description détaillée</label>
                  <textarea className="pp-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez le besoin, l&apos;objectif, les bénéficiaires, l&apos;impact attendu…" disabled={submitting} />
                </div>

                <div className="pp-field">
                  <label className="pp-label">Budget estimatif <span style={{ textTransform: 'none', fontWeight: 400, color: '#9CA3AF' }}>(optionnel)</span></label>
                  <div className="pp-budget-wrap">
                    <select className="pp-currency-select" value={currency} onChange={e => setCurrency(e.target.value)} disabled={submitting}>
                      <option value="GNF">GNF (FG)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="XOF">XOF (CFA)</option>
                      <option value="USD">USD ($)</option>
                      <option value="CAD">CAD ($)</option>
                    </select>
                    <input className="pp-budget-input" type="number" min="0" step="any" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" disabled={submitting} />
                  </div>
                </div>

                <div className="pp-upload-zone">
                  <label className="pp-label" style={{ marginBottom: '1rem' }}>Documents & Illustrations</label>
                  <div className="pp-upload-grid">
                    
                    {/* -- Upload Document -- */}
                    <div style={{ position: 'relative' }}>
                      {!attachmentPreview ? (
                        <label className="pp-upload-btn">
                          <input ref={attachmentRef} type="file" accept=".pdf,.doc,.docx,image/*" onChange={handleAttachmentChange} disabled={uploadingAttachment || submitting} />
                          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="1.5" style={{ marginBottom: '0.5rem' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563' }}>{uploadingAttachment ? 'Envoi...' : 'Ajouter Document'}</span>
                        </label>
                      ) : (
                        <div className="pp-file-preview">
                          <div className="pp-file-thumb">DOC</div>
                          <div className="pp-file-info">
                            <div className="pp-file-name">{attachmentPreview.name}</div>
                            <div className="pp-file-meta">{attachmentPreview.size} {attachmentAssetId && <span style={{ color: '#059669' }}>✓</span>}</div>
                          </div>
                          <button type="button" className="pp-file-remove" onClick={removeAttachment}>×</button>
                        </div>
                      )}
                      {attachmentError && <div className="pp-upload-err-txt">{attachmentError}</div>}
                    </div>

                    {/* -- Upload Photo -- */}
                    <div style={{ position: 'relative' }}>
                      {!photoPreviewUrl ? (
                        <label className="pp-upload-btn">
                          <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto || submitting} />
                          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="1.5" style={{ marginBottom: '0.5rem' }}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4B5563' }}>{uploadingPhoto ? 'Envoi...' : 'Ajouter Photo'}</span>
                        </label>
                      ) : (
                        <div className="pp-file-preview">
                          <div className="pp-file-thumb">
                            <Image src={photoPreviewUrl} alt="Aperçu" fill style={{ objectFit: 'cover' }} unoptimized />
                          </div>
                          <div className="pp-file-info">
                            <div className="pp-file-name">{photoMeta?.name}</div>
                            <div className="pp-file-meta">{photoMeta?.size} {photoAssetId && <span style={{ color: '#059669' }}>✓</span>}</div>
                          </div>
                          <button type="button" className="pp-file-remove" onClick={removePhoto}>×</button>
                        </div>
                      )}
                      {photoError && <div className="pp-upload-err-txt">{photoError}</div>}
                    </div>

                  </div>
                </div>

                <div className="pp-form-actions">
                  <button type="button" className="pp-cancel-btn" onClick={handleCancel} disabled={submitting}>Annuler</button>
                  <button type="submit" className="pp-submit-btn" disabled={submitting || uploadingAttachment || uploadingPhoto}>
                    {submitting ? (
                      <><div className="pp-spinner" />Envoi en cours…</>
                    ) : editingId ? (
                      <>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Mettre à jour
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                        Envoyer la proposition
                      </>
                    )}
                  </button>
                </div>

                {formError && <div className="pp-alert pp-alert-err">{formError}</div>}
                {formSuccess && <div className="pp-alert pp-alert-ok">Opération réussie ! Retour à la liste...</div>}
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL DE DÉTAIL D'UNE PROPOSITION ─── */}
        {selectedProposal && (
          <div className="pp-modal-overlay" onClick={() => setSelectedProposal(null)}>
            <div className="pp-modal-content" onClick={e => e.stopPropagation()}>
              
              <div className="pp-modal-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span className="pp-status-badge" style={{ background: STATUS_META[selectedProposal.status]?.bg, color: STATUS_META[selectedProposal.status]?.color, borderColor: STATUS_META[selectedProposal.status]?.border }}>
                      {STATUS_META[selectedProposal.status]?.label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>Le {fmt(selectedProposal.createdAt)}</span>
                  </div>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8rem', fontWeight: 700, margin: 0, color: '#0F172A', lineHeight: 1.2 }}>
                    {selectedProposal.title}
                  </h2>
                </div>
                
                {/* 🔥 BOUTONS D'ACTION MODERNES DANS LE MODAL */}
                <div className="pp-modal-actions">
                  {(selectedProposal.status === 'SUBMITTED' || selectedProposal.status === 'UNDER_REVIEW') && (
                    <>
                      <button className="pp-icon-btn pp-edit-btn" title="Modifier la proposition" onClick={handleEditProposal}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button className="pp-icon-btn pp-delete-btn" title="Supprimer la proposition" onClick={handleDeleteProposal}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                      <div className="pp-modal-actions-divider" />
                    </>
                  )}
                  <button className="pp-modal-close" onClick={() => setSelectedProposal(null)} title="Fermer">
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              <div className="pp-modal-body">
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="pp-detail-block" style={{ flex: 1 }}>
                    <div className="pp-detail-lbl">BUDGET DEMANDÉ</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '1.2rem', fontWeight: 700, color: '#2563EB' }}>
                      {selectedProposal.expectedBudget != null ? `${Number(selectedProposal.expectedBudget).toLocaleString('fr-FR')} ${selectedProposal.currency ?? 'GNF'}` : 'Non défini'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="pp-detail-lbl" style={{ marginBottom: '0.6rem' }}>DESCRIPTION DÉTAILLÉE</div>
                  <div className="pp-detail-txt">{selectedProposal.description}</div>
                </div>

                {/* 🔥 AFFICHAGE DYNAMIQUE DE LA PIÈCE JOINTE */}
                {selectedProposal.attachedFile ? (
                  <div className="pp-detail-block" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
                    <div className="pp-detail-lbl" style={{ marginBottom: '0.6rem' }}>PIÈCE JOINTE</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      {isFileImage(selectedProposal.attachedFile) && !imgError ? (
                        <div style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                          <Image 
                            src={selectedProposal.attachedFile.url} 
                            alt="Aperçu" 
                            fill 
                            style={{ objectFit: 'cover' }} 
                            unoptimized 
                            onError={() => setImgError(true)} 
                          />
                        </div>
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                          {selectedProposal.attachedFile.fileName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'DOC'}
                        </div>
                      )}
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedProposal.attachedFile.fileName || 'Fichier joint'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: '2px' }}>
                          <a href={selectedProposal.attachedFile.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>
                            Ouvrir / Télécharger ➔
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pp-detail-block" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#B45309', fontWeight: 600, fontSize: '0.85rem' }}>
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span>Aucune pièce jointe (document ou photo) liée à cette proposition.</span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* ─── MODAL DE CONFIRMATION / INFO (REMPLACE WINDOW.ALERT) ─── */}
        {actionDialog?.isOpen && (
          <div className="pp-dialog-overlay" onClick={() => setActionDialog(null)}>
            <div className="pp-dialog-card" onClick={e => e.stopPropagation()}>
              
              <div className={`pp-dialog-icon ${actionDialog.type === 'delete' ? 'danger' : 'info'}`}>
                {actionDialog.type === 'delete' ? (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                ) : (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                )}
              </div>
              
              <h3 className="pp-dialog-title">{actionDialog.title}</h3>
              <p className="pp-dialog-desc">{actionDialog.desc}</p>
              
              <div className="pp-dialog-actions">
                <button className="pp-dialog-btn pp-dialog-btn-cancel" onClick={() => setActionDialog(null)} disabled={isDeleting}>
                  {actionDialog.type === 'delete' ? 'Annuler' : 'Fermer'}
                </button>
                {actionDialog.type === 'delete' && (
                  <button className="pp-dialog-btn pp-dialog-btn-danger" onClick={executeDelete} disabled={isDeleting}>
                    {isDeleting ? 'Suppression...' : 'Supprimer'}
                  </button>
                )}
              </div>
              
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}