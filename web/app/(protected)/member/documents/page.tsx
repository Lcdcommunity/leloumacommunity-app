//web/app/(protected)/member/documents/page.tsx
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

export default function MemberDocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listDocumentsForMembers({ page: 1, pageSize: 100, q: q || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement documents');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Documents & photos">
      <Card title="Documents téléchargeables">
        <div className="toolbar">
          <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={() => void load()}>Rechercher</Button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Titre', 'Description', 'Fichier', 'Date']}>
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