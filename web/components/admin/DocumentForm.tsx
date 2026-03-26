// web/components/admin/DocumentForm.tsx
'use client';

import { FormEvent, useState, useRef } from 'react';
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
  const [drag, setDrag] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleRemoveFile() {
    setFileAssetId(null);
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fileAssetId) {
      setError("Veuillez sélectionner un fichier avant d'enregistrer.");
      return;
    }
    
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
    <form onSubmit={handleSubmit}>
      <style>{`
        .df-dropzone { border: 2px dashed rgba(37,99,235,0.2); border-radius: 12px; padding: 1.5rem 1rem; text-align: center; cursor: pointer; transition: all 0.2s ease; background: rgba(239,246,255,0.3); }
        .df-dropzone.drag { background: rgba(239,246,255,0.8); border-color: #2563EB; }
        .df-dropzone:hover { background: rgba(239,246,255,0.6); }
        .df-icon-wrap { width: 42px; height: 42px; border-radius: 10px; background: white; border: 1px solid rgba(37,99,235,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 0.8rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03); }
        .df-file-success { background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 1rem; display: flex; align-items: center; justify-content: space-between; }
        .df-remove-btn { width: 28px; height: 28px; border-radius: 50%; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s; }
        .df-remove-btn:hover { transform: scale(1.1); }
      `}</style>

      <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <Input label="Titre" required value={title} onChange={(e) => setTitle(e.target.value)} />
        
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ minHeight: '100px' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
            Fichier / Document <span style={{ color: '#DC2626' }}>*</span>
          </label>
          
          <input 
            ref={fileInputRef}
            type="file" 
            hidden 
            onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)} 
          />

          {fileName ? (
            <div className="df-file-success">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065F46', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {fileName}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#047857' }}>Prêt à être enregistré</div>
                </div>
              </div>
              <button type="button" onClick={handleRemoveFile} className="df-remove-btn" title="Retirer ce fichier">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div 
              className={`df-dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="df-icon-wrap">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E3A8A', marginBottom: '0.2rem' }}>
                {loadingUpload ? 'Envoi du fichier en cours...' : 'Cliquez ou glissez un fichier ici'}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                PDF, Word, Excel, Images...
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

      <Button type="submit" disabled={loadingSave || loadingUpload || !fileAssetId} style={{ width: '100%' }}>
        {loadingSave ? 'Enregistrement...' : 'Créer le document'}
      </Button>
    </form>
  );
}