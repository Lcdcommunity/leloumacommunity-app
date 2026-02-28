//web/components/member/ProjectProposalForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { api } from '../../lib/api-client';

export function ProjectProposalForm({
  onCreated,
}: {
  onCreated?: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedBudget, setExpectedBudget] = useState('');
  const [attachmentFileAssetId, setAttachmentFileAssetId] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadFile(file, {
        category: 'PROJECT_PROPOSAL_ATTACHMENT',
        folder: 'member-project-proposals',
        description: 'Pièce jointe proposition de projet',
      });
      setAttachmentFileAssetId(uploaded.id);
      setAttachmentName(uploaded.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      await api.createProjectProposalMember({
        title,
        description,
        expectedBudget: expectedBudget ? Number(expectedBudget) : undefined,
        attachmentFileAssetId,
      });

      setTitle('');
      setDescription('');
      setExpectedBudget('');
      setAttachmentFileAssetId(null);
      setAttachmentName(null);

      setMessage('Votre proposition de projet a été envoyée avec succès.');
      await onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur envoi proposition');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack-md">
      <Input label="Titre du projet proposé" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <Textarea
        label="Description détaillée"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        placeholder="Décrivez le besoin, l’objectif, les bénéficiaires, l’impact, etc."
      />

      <Input
        label="Budget estimatif (optionnel)"
        type="number"
        min="0"
        step="0.01"
        value={expectedBudget}
        onChange={(e) => setExpectedBudget(e.target.value)}
      />

      <div className="field">
        <label className="label">Photo / document (optionnel)</label>
        <label className="file-upload-btn">
          <input type="file" hidden onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)} />
          {uploading ? 'Upload...' : 'Ajouter une photo / pièce jointe'}
        </label>
        {attachmentName ? <p>Fichier chargé : {attachmentName}</p> : null}
      </div>

      {message ? <p className="success-text">{message}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <Button type="submit" disabled={saving}>
        {saving ? 'Envoi...' : 'Envoyer la proposition'}
      </Button>
    </form>
  );
}