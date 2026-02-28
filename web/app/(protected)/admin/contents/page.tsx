//web/app/(protected)/admin/contents/page.tsx
'use client';

import { useEffect, useState } from 'react';
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

  async function load() {
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
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Informations / contenus">
      <div className="grid grid-2">
        <Card title="Publier une information / annonce">
          <ContentForm onCreated={load} />
        </Card>

        <Card title="Contenus de l’antenne">
          <div className="toolbar responsive-toolbar">
            <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
            <Select
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

          {error ? <p className="error-text">{error}</p> : null}

          <Table columns={['Titre', 'Statut', 'Créé le', 'Mis à jour', 'Actions']}>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td>
                  <Badge tone={c.status === 'PUBLISHED' ? 'success' : c.status === 'DRAFT' ? 'warning' : 'neutral'}>
                    {c.status}
                  </Badge>
                </td>
                <td>{formatDate(c.createdAt)}</td>
                <td>{formatDate(c.updatedAt)}</td>
                <td>
                  <div className="row-actions">
                    <Button
                      variant="secondary"
                      disabled={busyId === c.id}
                      onClick={async () => {
                        setBusyId(c.id);
                        try {
                          const nextStatus =
                            c.status === 'DRAFT' ? 'PUBLISHED' :
                            c.status === 'PUBLISHED' ? 'ARCHIVED' : 'DRAFT';
                          await api.updateAntennaContent(c.id, { status: nextStatus as any });
                          await load();
                        } finally {
                          setBusyId(null);
                        }
                      }}
                    >
                      Changer statut
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === c.id}
                      onClick={async () => {
                        const ok = window.confirm(`Supprimer le contenu "${c.title}" ?`);
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