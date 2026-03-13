// web/components/member/ProjectProposalForm.tsx
// web/components/member/ProjectProposalForm.tsx
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
        category: 'PROJECT',
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
      // CORRECTION : Appel à la bonne méthode de l'API (createProjectProposalMember)
      await api.createProjectProposalMember({
        title,
        description,
        expectedBudget: expectedBudget ? Number(expectedBudget) : undefined,
        attachmentFileAssetId: attachmentFileAssetId || undefined, 
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
    <form onSubmit={handleSubmit} className="stack-md space-y-4">
      <Input label="Titre du projet proposé" value={title} onChange={(e) => setTitle(e.target.value)} required />

      <Textarea
        label="Description détaillée"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        required
        placeholder="Décrivez le besoin, l'objectif, les bénéficiaires, l'impact, etc."
      />

      <Input
        label="Budget estimatif (optionnel)"
        type="number"
        min="0"
        step="0.01"
        value={expectedBudget}
        onChange={(e) => setExpectedBudget(e.target.value)}
      />

      <div className="flex flex-col gap-1 border border-dashed border-gray-300 p-4 rounded-md bg-gray-50">
        <label className="text-sm font-medium text-gray-700">Photo / document (optionnel)</label>
        <div className="flex items-center gap-4 mt-2">
          <label className="cursor-pointer bg-brand-blue hover:bg-blue-700 text-white py-2 px-4 rounded text-sm font-medium transition-colors">
            <input type="file" hidden onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)} />
            {uploading ? 'Chargement en cours...' : 'Ajouter une pièce jointe'}
          </label>
        </div>
        {attachmentName ? <p className="text-sm text-green-600 mt-2 font-medium">✓ Fichier chargé : {attachmentName}</p> : null}
      </div>

      {message ? <p className="text-sm text-green-600 font-medium bg-green-50 p-3 rounded">{message}</p> : null}
      {error ? <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded">{error}</p> : null}

      <Button type="submit" disabled={saving} className="w-full mt-2">
        {saving ? 'Envoi en cours...' : 'Envoyer la proposition'}
      </Button>
    </form>
  );
}