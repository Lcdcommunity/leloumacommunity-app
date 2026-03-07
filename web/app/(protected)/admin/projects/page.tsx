// web/app/(protected)/admin/projects/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { ProjectForm } from '../../../../components/admin/ProjectForm';
import { api } from '../../../../lib/api-client';
import type { Project, ProjectStatus } from '../../../../types/project';
import { formatCurrency, formatDate } from '../../../../lib/format';

export default function AdminProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Project | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.listAntennaProjects({
        page: 1,
        pageSize: 100,
        q: q || undefined,
        status: status || undefined,
      });
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des projets');
    }
  }, [q, status]);

  useEffect(() => { 
    void load(); 
  }, [load]);

  return (
    <AppShell title="Projets de l'antenne">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* Colonne Formulaire */}
        <div className="lg:col-span-5 w-full sticky top-4">
          <Card title={editing ? 'Modifier le projet' : 'Nouveau projet'}>
            <ProjectForm
              initialValues={
                editing
                  ? {
                      title: editing.title,
                      description: editing.description || '',
                      status: editing.status,
                      budgetPlanned: editing.budgetPlanned?.toString() || '',
                      budgetSpent: editing.budgetSpent?.toString() || '',
                      startsAt: editing.startsAt ? new Date(editing.startsAt).toISOString().slice(0, 10) : '',
                      endsAt: editing.endsAt ? new Date(editing.endsAt).toISOString().slice(0, 10) : '',
                    }
                  : undefined
              }
              submitLabel={editing ? 'Mettre à jour le projet' : 'Créer le projet'}
              onSubmit={async (values) => {
                try {
                  const photoIds: string[] = [];
                  if (values.photos && values.photos.length > 0) {
                    for (const file of values.photos) {
                      const uploaded = await api.uploadFile(file, { category: 'PROJECT' });
                      photoIds.push(uploaded.id);
                    }
                  }

                  const payload = {
                    title: values.title,
                    description: values.description || undefined,
                    status: values.status as ProjectStatus,
                    budgetPlanned: values.budgetPlanned ? Number(values.budgetPlanned) : undefined,
                    budgetSpent: values.budgetSpent ? Number(values.budgetSpent) : undefined,
                    startsAt: values.startsAt || null,
                    endsAt: values.endsAt || null,
                    photoIds: photoIds.length > 0 ? photoIds : undefined,
                  };

                  if (editing) {
                    await api.updateAntennaProject(editing.id, payload);
                    setEditing(null);
                  } else {
                    await api.createAntennaProject(payload);
                  }
                  await load();
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
                }
              }}
            />
            {editing && (
              <div className="mt-4 border-t pt-4">
                <Button variant="secondary" className="w-full" onClick={() => setEditing(null)}>
                  Annuler la modification
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Colonne Liste */}
        <div className="lg:col-span-7 w-full">
          <Card title="Liste des projets">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <Input 
                  label=""
                  placeholder="Rechercher un projet..." 
                  value={q} 
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} 
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  label=""
                  value={status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
                  options={[
                    { value: '', label: 'Tous statuts' },
                    { value: 'DRAFT', label: 'Brouillon' },
                    { value: 'PENDING_APPROVAL', label: 'En attente' },
                    { value: 'APPROVED', label: 'Approuvé' },
                    { value: 'IN_PROGRESS', label: 'En cours' },
                    { value: 'COMPLETED', label: 'Terminé' },
                    { value: 'SUSPENDED', label: 'Suspendu' },
                    { value: 'CANCELLED', label: 'Annulé' },
                  ]}
                />
              </div>
              <Button onClick={() => void load()} className="w-full sm:w-auto">
                Filtrer
              </Button>
            </div>

            {error ? <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div> : null}

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table columns={['Projet', 'Statut', 'Finances', 'Période', 'Actions']}>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500 italic">
                        Aucun projet trouvé.
                      </td>
                    </tr>
                  ) : (
                    items.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="font-medium whitespace-nowrap">{p.title}</td>
                        <td className="whitespace-nowrap">
                          <Badge tone={p.status === 'APPROVED' || p.status === 'COMPLETED' ? 'success' : 'info'}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="text-sm whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-gray-600">Prévu: {p.budgetPlanned != null ? formatCurrency(p.budgetPlanned, 'EUR') : '—'}</span>
                            <span className="font-medium text-gray-900">Dépensé: {p.budgetSpent != null ? formatCurrency(p.budgetSpent, 'EUR') : '—'}</span>
                          </div>
                        </td>
                        <td className="text-sm whitespace-nowrap text-gray-600">
                          {p.startsAt ? formatDate(p.startsAt) : '—'} <br />
                          <span className="text-xs">au</span> <br />
                          {p.endsAt ? formatDate(p.endsAt) : '—'}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button onClick={() => setEditing(p)}>
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
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Erreur lors de la suppression.");
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
                    ))
                  )}
                </Table>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}