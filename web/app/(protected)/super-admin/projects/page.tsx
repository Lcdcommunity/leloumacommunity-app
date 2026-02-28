//web/app/(protected)/super-admin/projects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { Project } from '../../../../types/project';
import { ProjectsTable } from '../../../../components/super-admin/ProjectsTable';

export default function SuperAdminProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listProjects({ page: 1, pageSize: 100, status: status || undefined, q: q || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Projets (pilotage global)">
      <Card title="Projets passés, en cours et futurs">
        <div className="toolbar responsive-toolbar">
          <Input placeholder="Recherche par titre..." value={q} onChange={(e) => setQ(e.target.value)} />
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
        <ProjectsTable items={items} />
      </Card>
    </AppShell>
  );
}