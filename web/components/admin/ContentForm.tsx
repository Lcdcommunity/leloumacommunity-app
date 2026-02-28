//web/components/admin/ContentForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api } from '../../lib/api-client';

type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export function ContentForm({
  onCreated,
}: {
  onCreated?: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<ContentStatus>('DRAFT');
  const [coverFileAssetId, setCoverFileAssetId] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCoverUpload(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadFile(file, {
        category: 'IMAGE',
        folder: 'antenna-content-covers',
        description: 'Cover contenu antenne',
      });
      setCoverFileAssetId(uploaded.id);
      setCoverName(uploaded.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.createAntennaContent({
        title,
        body,
        status,
        coverFileAssetId,
      });
      setTitle('');
      setBody('');
      setStatus('DRAFT');
      setCoverFileAssetId(null);
      setCoverName(null);
      await onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack-md">
      <Input label="Titre" required value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea
        label="Contenu / Information"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Select
        label="Statut"
        value={status}
        onChange={(e) => setStatus(e.target.value as ContentStatus)}
        options={[
          { value: 'DRAFT', label: 'Brouillon' },
          { value: 'PUBLISHED', label: 'Publié' },
          { value: 'ARCHIVED', label: 'Archivé' },
        ]}
      />

      <div className="field">
        <label className="label">Image de couverture (optionnel)</label>
        <label className="file-upload-btn">
          <input type="file" hidden accept="image/*" onChange={(e) => void handleCoverUpload(e.target.files?.[0] ?? null)} />
          {uploading ? 'Upload...' : 'Choisir une image'}
        </label>
        {coverName ? <p>Image chargée : {coverName}</p> : null}
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? 'Enregistrement...' : 'Créer le contenu'}
      </Button>
    </form>
  );
}