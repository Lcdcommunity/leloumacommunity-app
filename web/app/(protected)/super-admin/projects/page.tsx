// web/app/(protected)/super-admin/projects/page.tsx
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

  // 1. Fonction dédiée uniquement au bouton "Filtrer"
  const handleSearch = async () => {
    setError(null);
    try {
      const res = await api.listProjects({ page: 1, pageSize: 100, status: status || undefined, q: q || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // 2. Logique de chargement initial propre dans le useEffect
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const res = await api.listProjects({ page: 1, pageSize: 100 });
        if (isMounted) {
          setItems(res.items);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur');
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell title="Projets (pilotage global)">
      <Card title="Projets passés, en cours et futurs">
        
        {/* Ajout des classes flex pour un alignement parfait */}
        <div className="toolbar responsive-toolbar flex items-end gap-2 mb-4">
          <Input 
            label="Recherche"
            placeholder="Recherche par titre..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
          
          {/* 👇 CORRECTION : Ajout du label obligatoire ici */}
          <Select
            label="Filtrer par statut"
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
          <Button onClick={() => void handleSearch()}>Filtrer</Button>
        </div>

        {error ? <p className="error-text text-red-600 mb-4">{error}</p> : null}
        
        <div className="mt-4">
          <ProjectsTable items={items} />
        </div>
      </Card>
    </AppShell>
  );
}