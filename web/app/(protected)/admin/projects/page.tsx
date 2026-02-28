//web/app/(protected)/admin/projects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { ProjectForm } from '../../../../components/admin/ProjectForm';
import { api } from '../../../../lib/api-client';
import type { Project } from '../../../../types/project';
import { formatCurrency, formatDate } from '../../../../lib/format';

export default function AdminProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listAntennaProjects({
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
    <AppShell title="Projets de l’antenne">
      <div className="grid grid-2">
        <Card title={editing ? 'Modifier le projet' : 'Nouveau projet'}>
          <ProjectForm
            initialValues={
              editing
                ? {
                    title: editing.title,
                    description: editing.description || '',
                    status: editing.status as any,
                    budgetPlanned: editing.budgetPlanned?.toString() || '',
                    budgetSpent: editing.budgetSpent?.toString() || '',
                    startsAt: editing.startsAt ? new Date(editing.startsAt).toISOString().slice(0, 10) : '',
                    endsAt: editing.endsAt ? new Date(editing.endsAt).toISOString().slice(0, 10) : '',
                  }
                : undefined
            }
            submitLabel={editing ? 'Mettre à jour le projet' : 'Créer le projet'}
            onSubmit={async (values) => {
              const payload = {
                title: values.title,
                description: values.description || undefined,
                status: values.status,
                budgetPlanned: values.budgetPlanned ? Number(values.budgetPlanned) : undefined,
                budgetSpent: values.budgetSpent ? Number(values.budgetSpent) : undefined,
                startsAt: values.startsAt || null,
                endsAt: values.endsAt || null,
              };

              if (editing) {
                await api.updateAntennaProject(editing.id, payload);
                setEditing(null);
              } else {
                await api.createAntennaProject(payload);
              }

              await load();
            }}
          />
        </Card>

        <Card title="Liste des projets">
          <div className="toolbar responsive-toolbar">
            <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'Tous statuts' },
                { value: 'DRAFT', label: 'Brouillon' },
                { value: 'PENDING_APPROVAL', label: 'En attente approbation' },
                { value: 'APPROVED', label: 'Approuvé' },
                { value: 'IN_PROGRESS', label: 'En cours' },
                { value: 'COMPLETED', label: 'Terminé' },
                { value: 'SUSPENDED', label: 'Suspendu' },
                { value: 'CANCELLED', label: 'Annulé' },
              ]}
            />
            <Button onClick={() => void load()}>Filtrer</Button>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <Table columns={['Titre', 'Statut', 'Budget prévu', 'Budget dépensé', 'Dates', 'Actions']}>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td><Badge tone="info">{p.status}</Badge></td>
                <td>{p.budgetPlanned != null ? formatCurrency(p.budgetPlanned) : '—'}</td>
                <td>{p.budgetSpent != null ? formatCurrency(p.budgetSpent) : '—'}</td>
                <td>
                  {formatDate(p.startsAt)}<br />
                  {formatDate(p.endsAt)}
                </td>
                <td>
                  <div className="row-actions">
                    <Button variant="secondary" onClick={() => setEditing(p)}>
                      Modifier
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busyId === p.id}
                      onClick={async () => {
                        const ok = window.confirm(`Supprimer le projet "${p.title}" ?`);
                        if (!ok) return;
                        setBusyId(p.id);
                        try {
                          await api.deleteAntennaProject(p.id);
                          if (editing?.id === p.id) setEditing(null);
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