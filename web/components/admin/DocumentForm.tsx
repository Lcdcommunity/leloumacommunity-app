//web/components/admin/DocumentForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { api } from '../../lib/api-client';

export function DocumentForm({
  onCreated,
}: {
  onCreated?: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileAssetId, setFileAssetId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File | null) {
    if (!file) return;
    setLoadingUpload(true);
    setError(null);
    try {
      const uploaded = await api.uploadFile(file, {
        category: 'DOCUMENT',
        folder: 'antenna-documents',
        description: 'Document antenne',
      });
      setFileAssetId(uploaded.id);
      setFileName(uploaded.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setLoadingUpload(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoadingSave(true);
    setError(null);
    try {
      await api.createAntennaDocument({
        title,
        description: description || undefined,
        fileAssetId,
      });
      setTitle('');
      setDescription('');
      setFileAssetId(null);
      setFileName(null);
      await onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur enregistrement');
    } finally {
      setLoadingSave(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack-md">
      <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="field">
        <label className="label">Fichier / Photo</label>
        <label className="file-upload-btn">
          <input type="file" hidden onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)} />
          {loadingUpload ? 'Upload...' : 'Choisir un fichier'}
        </label>
        {fileName ? <p>Fichier chargé : {fileName}</p> : null}
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <Button type="submit" disabled={loadingSave}>
        {loadingSave ? 'Enregistrement...' : 'Créer le document'}
      </Button>
    </form>
  );
}