// web/app/(protected)/super-admin/contributions/page.tsx
'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { Contribution } from '../../../../types/contribution';
import { ContributionsTable } from '../../../../components/super-admin/ContributionsTable';

export default function SuperAdminContributionsPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Fonction dédiée au bouton "Filtrer"
  async function handleSearch() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.listContributions({ 
        page: 1, 
        pageSize: 100, 
        status: status || undefined 
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des cotisations');
    } finally {
      setLoading(false);
    }
  }

  // 2. Logique de chargement initial dans le useEffect
  useEffect(() => { 
    let isMounted = true;

    async function loadInitialData() {
      setLoading(true);
      try {
        const res = await api.listContributions({ 
          page: 1, 
          pageSize: 100 
        });
        if (isMounted) {
          setItems(res.items);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur lors du chargement des cotisations');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []); // <-- Plus d'avertissement de dépendance !

  return (
    <AppShell title="Cotisations globales">
      <Card title="Suivi des cotisations de toutes les antennes">
        <div className="toolbar responsive-toolbar flex items-end gap-2">
          {/* Le label est obligatoire ici pour corriger l'erreur ts(2741) */}
          <Select
            label="Filtrer par statut"
            value={status}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: 'PENDING', label: 'En attente' },
              { value: 'VALIDATED', label: 'Validées' },
              { value: 'REJECTED', label: 'Rejetées' },
              { value: 'CANCELLED', label: 'Annulées' },
            ]}
          />
          <Button onClick={() => void handleSearch()} disabled={loading}>
            {loading ? 'Chargement...' : 'Filtrer'}
          </Button>
        </div>

        {error ? <p className="error-text mt-4">{error}</p> : null}
        
        <div className="mt-4">
          <ContributionsTable items={items} />
        </div>
      </Card>
    </AppShell>
  );
}