// web/app/(protected)/super-admin/documents/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { api } from '../../../../lib/api-client';
import type { DocumentItem } from '../../../../types/document';
import { formatDate } from '../../../../lib/format';

export default function SuperAdminDocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // 1. Fonction dédiée pour le bouton "Rechercher" ET pour rafraîchir après un upload
  const handleSearch = async () => {
    setError(null);
    try {
      const res = await api.listDocuments({ q: q || undefined, page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement documents');
    }
  };

  // 2. Logique de chargement initial encapsulée dans le useEffect
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const res = await api.listDocuments({ page: 1, pageSize: 100 });
        if (isMounted) {
          setItems(res.items);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur chargement documents');
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function onUploadFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadFile(file, {
        category: 'DOCUMENT',
        folder: 'association-docs',
        description: 'Upload super admin',
      });
      // On utilise handleSearch pour rafraîchir la liste après un upload
      await handleSearch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell title="Documents / médias">
      <Card title="Documents téléchargeables">
        
        <div className="toolbar responsive-toolbar flex items-end gap-2 mb-4">
          <Input 
            label="Recherche"
            placeholder="Mots-clés..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
          <Button onClick={() => void handleSearch()}>Rechercher</Button>
          
          <label className="file-upload-btn cursor-pointer ml-auto bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-800 font-medium py-2 px-4 rounded transition-colors">
            <input
              type="file"
              hidden
              disabled={uploading}
              onChange={(e) => void onUploadFile(e.target.files?.[0] ?? null)}
            />
            {uploading ? 'Upload en cours...' : 'Uploader un fichier'}
          </label>
        </div>

        {error ? <p className="error-text text-red-600 mb-4">{error}</p> : null}

        <Table columns={['Titre', 'Description', 'Fichier', 'Créé le']}>
          {items.map((d) => (
            <tr key={d.id}>
              <td className="font-medium text-gray-800">{d.title}</td>
              <td>{d.description || '—'}</td>
              <td>
                {d.fileAsset?.url ? (
                  <a href={d.fileAsset.url} target="_blank" rel="noreferrer" className="text-brand-blue hover:underline font-medium">
                    {d.fileAsset.fileName || 'Télécharger'}
                  </a>
                ) : '—'}
              </td>
              <td className="text-gray-500 text-sm">{formatDate(d.createdAt)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}