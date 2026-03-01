//web/app/(protected)/super-admin/contributions/page.tsx
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

  async function load() {
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

  useEffect(() => { 
    void load(); 
  }, []);

  return (
    <AppShell title="Cotisations globales">
      <Card title="Suivi des cotisations de toutes les antennes">
        <div className="toolbar responsive-toolbar">
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
          <Button onClick={() => void load()} disabled={loading}>
            {loading ? 'Chargement...' : 'Filtrer'}
          </Button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        
        <ContributionsTable items={items} />
      </Card>
    </AppShell>
  );
}