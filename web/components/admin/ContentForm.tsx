// web/components/admin/ContentForm.tsx
'use client';

import { FormEvent, useEffect, useState, useRef } from 'react';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { api, type MyTransferAntenna } from '../../lib/api-client';

type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface UploadedImage {
  id: string;
  preview: string;
  name: string;
}

export function ContentForm({
  onCreated,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isSuperAdmin = false, 
}: {
  onCreated?: () => Promise<void> | void;
  isSuperAdmin?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<ContentStatus>('DRAFT');

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  // Sélecteur d'antenne (admin multi-antennes) : masqué si l'admin ne gère
  // qu'une seule antenne, affiché et requis s'il en gère plusieurs.
  const [antennas, setAntennas] = useState<MyTransferAntenna[]>([]);
  const [antennaId, setAntennaId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 3;

  useEffect(() => {
    let cancelled = false;
    api.getMyTransferAntennas()
      .then((res) => { if (!cancelled) setAntennas(res); })
      .catch(() => { /* silencieux : le backend retombera sur l'antenne unique */ });
    return () => { cancelled = true; };
  }, []);

  async function handleFilesUpload(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (validFiles.length === 0) {
      setError('Veuillez sélectionner des images valides.');
      return;
    }

    const availableSlots = MAX_IMAGES - images.length;
    if (availableSlots <= 0) {
      setError(`Vous ne pouvez pas ajouter plus de ${MAX_IMAGES} images.`);
      return;
    }

    const filesToUpload = validFiles.slice(0, availableSlots);
    setUploading(true);
    setError(null);

    const newUploadedImages = [...images];

    for (const file of filesToUpload) {
      try {
        const preview = URL.createObjectURL(file);
        const uploaded = await api.uploadFile(file, {
          category: 'NEWS_IMAGE',
          folder: 'content-covers',
          description: 'Image contenu',
        });

        newUploadedImages.push({ id: uploaded.id, preview, name: file.name });
        setImages([...newUploadedImages]);
      } catch {
        // 🔥 Correction : suppression du "err" non utilisé
        setError(`Erreur lors de l'upload de ${file.name}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleRemoveImage(index: number) {
    const imgToRemove = images[index];
    if (imgToRemove?.preview) URL.revokeObjectURL(imgToRemove.preview);

    setImages(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (antennas.length > 1 && !antennaId) {
      setError('Veuillez sélectionner une antenne.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        body,
        status,
        coverImageFileId: images[0]?.id || null,
        imageIds: images.slice(1).map(img => img.id),
        antennaId: antennaId || undefined,
      };

      // 🔥 CORRECTION CHIRURGICALE : 
      // Puisque nous avons autorisé le Super Admin sur le contrôleur "admin", 
      // nous utilisons la même méthode API pour les deux rôles.
      await api.createAntennaContent(payload);

      setTitle('');
      setBody('');
      setStatus('DRAFT');
      images.forEach(img => URL.revokeObjectURL(img.preview));
      setImages([]);
      setAntennaId('');

      await onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <style>{`
        .cf-dropzone { border: 2px dashed rgba(37,99,235,0.2); border-radius: 12px; padding: 1.5rem 1rem; text-align: center; cursor: pointer; transition: all 0.2s ease; background: rgba(239,246,255,0.3); position: relative; overflow: hidden; }
        .cf-dropzone.drag { background: rgba(239,246,255,0.8); border-color: #2563EB; }
        .cf-dropzone:hover { background: rgba(239,246,255,0.6); }
        .cf-icon-wrap { width: 42px; height: 42px; border-radius: 10px; background: white; border: 1px solid rgba(37,99,235,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03); }
        .cf-images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.75rem; margin-bottom: 0.5rem; }
        .cf-preview-container { position: relative; width: 100%; aspect-ratio: 1; border-radius: 10px; overflow: hidden; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .cf-preview-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cf-remove-btn { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px); transition: transform 0.2s; }
        .cf-remove-btn:hover { transform: scale(1.1); background: rgba(220,38,38,0.9); }
        .cf-main-badge { position: absolute; bottom: 4px; left: 4px; background: rgba(37,99,235,0.9); color: white; font-size: 0.55rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 99px; letter-spacing: 0.05em; backdrop-filter: blur(4px); }
        .cf-upload-spinner { width: 16px; height: 16px; border: 2px solid rgba(37,99,235,0.2); border-top-color: #2563EB; border-radius: 50%; animation: cfspin 0.8s linear infinite; margin: 0 auto 0.5rem; }
        @keyframes cfspin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {antennas.length > 1 && (
          <Select
            label="Antenne"
            value={antennaId}
            onChange={(e) => setAntennaId(e.target.value)}
            options={[
              { value: '', label: 'Sélectionnez une antenne…' },
              ...antennas.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
        )}

        <Input label="Titre" required value={title} onChange={(e) => setTitle(e.target.value)} />

        <Textarea
          label="Contenu / Information"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ minHeight: '120px' }}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
              Images (jusqu&apos;à 3)
            </label>
            <span style={{ fontSize: '0.7rem', color: images.length >= MAX_IMAGES ? '#DC2626' : '#6B7280', fontWeight: 700 }}>
              {images.length} / {MAX_IMAGES}
            </span>
          </div>

          <input 
            ref={fileInputRef}
            type="file" 
            hidden 
            multiple
            accept="image/*" 
            onChange={(e) => void handleFilesUpload(e.target.files)} 
          />

          {images.length > 0 && (
            <div className="cf-images-grid">
              {images.map((img, idx) => (
                <div key={img.id} className="cf-preview-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={`Aperçu ${idx + 1}`} className="cf-preview-img" />

                  <button type="button" onClick={() => handleRemoveImage(idx)} className="cf-remove-btn" title="Supprimer l'image">
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {idx === 0 && <span className="cf-main-badge">PRINCIPALE</span>}
                </div>
              ))}
            </div>
          )}

          {images.length < MAX_IMAGES && (
            <div 
              className={`cf-dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                void handleFilesUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <div className="cf-upload-spinner" />
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#2563EB' }}>Envoi en cours...</div>
                </>
              ) : (
                <>
                  <div className="cf-icon-wrap">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '0.2rem' }}>
                    Cliquez ou glissez vos images
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                    PNG, JPG, WEBP
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#B91C1C', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading || uploading} style={{ width: '100%' }}>
        {loading ? 'Enregistrement en cours...' : 'Créer le contenu'}
      </Button>
    </form>
  );
}