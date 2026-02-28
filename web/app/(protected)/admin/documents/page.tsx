//web/app/(protected)/admin/documents/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { DocumentForm } from '../../../../components/admin/DocumentForm';
import { api } from '../../../../lib/api-client';
import type { DocumentItem } from '../../../../types/document';
import { formatDate } from '../../../../lib/format';

export default function AdminDocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listAntennaDocuments({ page: 1, pageSize: 100, q: q || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Documents & photos de l’antenne">
      <div className="grid grid-2">
        <Card title="Ajouter un document / média">
          <DocumentForm onCreated={load} />
        </Card>

        <Card title="Bibliothèque de documents">
          <div className="toolbar">
            <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
            <Button onClick={() => void load()}>Rechercher</Button>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <Table columns={['Titre', 'Description', 'Fichier', 'Date', 'Actions']}>
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
                <td>
                  <Button
                    variant="danger"
                    disabled={busyId === d.id}
                    onClick={async () => {
                      const ok = window.confirm(`Supprimer le document "${d.title}" ?`);
                      if (!ok) return;
                      setBusyId(d.id);
                      try {
                        await api.deleteAntennaDocument(d.id);
                        await load();
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Supprimer
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </AppShell>
  );
}