//web/app/(protected)/super-admin/documents/page.tsx
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

  async function load() {
    setError(null);
    try {
      const res = await api.listDocuments({ q: q || undefined, page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <AppShell title="Documents / médias">
      <Card title="Documents téléchargeables">
        <div className="toolbar responsive-toolbar">
          <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={() => void load()}>Rechercher</Button>
          <label className="file-upload-btn">
            <input
              type="file"
              hidden
              onChange={(e) => void onUploadFile(e.target.files?.[0] ?? null)}
            />
            {uploading ? 'Upload...' : 'Uploader un fichier'}
          </label>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Titre', 'Description', 'Fichier', 'Créé le']}>
          {items.map((d) => (
            <tr key={d.id}>
              <td>{d.title}</td>
              <td>{d.description || '—'}</td>
              <td>
                {d.fileAsset?.url ? (
                  <a href={d.fileAsset.url} target="_blank" rel="noreferrer">
                    {d.fileAsset.fileName || 'Télécharger'}
                  </a>
                ) : '—'}
              </td>
              <td>{formatDate(d.createdAt)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}