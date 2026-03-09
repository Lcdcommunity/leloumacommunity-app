// web/app/(protected)/member/documents/page.tsx
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

  // 1. Fonction dédiée uniquement au bouton "Rechercher"
  const handleSearch = async () => {
    setError(null);
    try {
      const res = await api.listDocumentsForMembers({ page: 1, pageSize: 100, q: q || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement documents');
    }
  };

  // 2. Logique de chargement initial encapsulée proprement dans le useEffect
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const res = await api.listDocumentsForMembers({ page: 1, pageSize: 100 });
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

    // Cleanup pour éviter les fuites de mémoire si le composant est démonté
    return () => {
      isMounted = false;
    };
  }, []); // Plus aucune erreur de dépendance ici !

  return (
    <AppShell title="Documents & photos">
      <Card title="Documents téléchargeables">
        <div className="toolbar">
          <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={() => void handleSearch()}>Rechercher</Button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Titre', 'Description', 'Fichier', 'Date']}>
          {items.map((d) => (
            <tr key={d.id}>
              <td>{d.title}</td>
              <td>{d.description || '—'}</td>
              <td>
                {d.fileAsset?.url ? (
                  <a href={d.fileAsset.url} target="_blank" rel="noreferrer" className="text-brand-blue hover:underline">
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