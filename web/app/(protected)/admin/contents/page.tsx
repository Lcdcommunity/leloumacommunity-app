// web/app/(protected)/admin/contents/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { ContentForm } from '../../../../components/admin/ContentForm';
import { api } from '../../../../lib/api-client';
import type { ContentPost } from '../../../../types/content';
import { formatDate } from '../../../../lib/format';

export default function AdminContentsPage() {
  const [items, setItems] = useState<ContentPost[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Utilisation de useCallback pour stabiliser la fonction et satisfaire le linter
  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.listAntennaContents({
        page: 1,
        pageSize: 100,
        q: q || undefined,
        status: status || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }
  }, [q, status]);

  // Chargement initial
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell title="Informations / contenus">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Publier une information / annonce">
          <ContentForm onCreated={() => void load()} />
        </Card>

        <Card title="Contenus de l’antenne">
          <div className="toolbar flex flex-wrap items-end gap-2 mb-4">
            <Input 
              label="Recherche"
              placeholder="Mots-clés..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
            />
            
            <Select
              label="Statut"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'Tous statuts' },
                { value: 'DRAFT', label: 'Brouillon' },
                { value: 'PUBLISHED', label: 'Publié' },
                { value: 'ARCHIVED', label: 'Archivé' },
              ]}
            />
            <Button onClick={() => void load()}>Filtrer</Button>
          </div>

          {error ? <p className="text-red-600 mb-4">{error}</p> : null}

          <Table columns={['Titre', 'Statut', 'Créé le', 'Actions']}>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.title}</td>
                <td>
                  <Badge tone={c.status === 'PUBLISHED' ? 'success' : c.status === 'DRAFT' ? 'warning' : 'neutral'}>
                    {c.status}
                  </Badge>
                </td>
                <td className="text-sm text-gray-500">{formatDate(c.createdAt)}</td>
                <td>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={busyId === c.id}
                      onClick={async () => {
                        setBusyId(c.id);
                        try {
                          const nextStatus: ContentPost['status'] =
                            c.status === 'DRAFT' ? 'PUBLISHED' :
                            c.status === 'PUBLISHED' ? 'ARCHIVED' : 'DRAFT';
                          
                          await api.updateAntennaContent(c.id, { status: nextStatus });
                          await load();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Statut
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === c.id}
                      onClick={async () => {
                        const ok = window.confirm(`Supprimer "${c.title}" ?`);
                        if (!ok) return;
                        setBusyId(c.id);
                        try {
                          await api.deleteAntennaContent(c.id);
                          await load();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Supprimer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </AppShell>
  );
}