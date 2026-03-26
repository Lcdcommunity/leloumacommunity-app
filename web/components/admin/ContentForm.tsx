// web/components/admin/ContentForm.tsx
'use client';

import { FormEvent, useState, useRef } from 'react';
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
  
  // États pour l'image
  const [coverFileAssetId, setCoverFileAssetId] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverName, setCoverName] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCoverUpload(file: File | null) {
    if (!file) return;
    
    // Vérification basique
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner une image valide.');
      return;
    }
    
    // Créer une URL temporaire pour la prévisualisation immédiate
    const objectUrl = URL.createObjectURL(file);
    setCoverPreview(objectUrl);
    setCoverName(file.name);
    
    setUploading(true);
    setError(null);
    try {
      const uploaded = await api.uploadFile(file, {
        category: 'NEWS_IMAGE', // <-- CORRECTION CHIRURGICALE: Utiliser l'enum Prisma correct
        folder: 'antenna-content-covers',
        description: 'Cover contenu antenne',
      });
      setCoverFileAssetId(uploaded.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
      setCoverPreview(null);
      setCoverName(null);
      setCoverFileAssetId(null);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    setCoverName(null);
    setCoverFileAssetId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
        coverImageFileId: coverFileAssetId,
      });
      setTitle('');
      setBody('');
      setStatus('DRAFT');
      handleRemoveImage();
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
        .cf-preview-container { position: relative; width: 100%; height: 160px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .cf-preview-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cf-preview-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%); opacity: 0; transition: opacity 0.2s; display: flex; align-items: flex-end; padding: 1rem; }
        .cf-preview-container:hover .cf-preview-overlay { opacity: 1; }
        .cf-remove-btn { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(4px); transition: transform 0.2s; }
        .cf-remove-btn:hover { transform: scale(1.1); background: rgba(220,38,38,0.9); }
        .cf-upload-spinner { width: 16px; height: 16px; border: 2px solid rgba(37,99,235,0.2); border-top-color: #2563EB; border-radius: 50%; animation: cfspin 0.8s linear infinite; margin: 0 auto 0.5rem; }
        @keyframes cfspin { to { transform: rotate(360deg) } }
      `}</style>

      <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.5rem' }}>
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
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
            Image de couverture (optionnel)
          </label>
          
          <input 
            ref={fileInputRef}
            type="file" 
            hidden 
            accept="image/*" 
            onChange={(e) => void handleCoverUpload(e.target.files?.[0] ?? null)} 
          />

          {coverPreview ? (
            <div className="cf-preview-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverPreview} alt="Aperçu" className="cf-preview-img" />
              
              <button type="button" onClick={handleRemoveImage} className="cf-remove-btn" title="Supprimer l'image">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="cf-preview-overlay">
                <div style={{ color: 'white', minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {coverName}
                  </div>
                  {uploading && (
                    <div style={{ fontSize: '0.7rem', color: '#93C5FD', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                      <div style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'cfspin 0.8s linear infinite' }} />
                      Envoi en cours...
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div 
              className={`cf-dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files?.[0]) handleCoverUpload(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="cf-icon-wrap">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '0.2rem' }}>
                Cliquez ou glissez une image ici
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                PNG, JPG, WEBP jusqu&apos;à 10MB
              </div>
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