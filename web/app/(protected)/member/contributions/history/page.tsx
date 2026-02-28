//web/app/(protected)/member/contributions/history/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { Card } from '../../../../../components/ui/Card';
import { Select } from '../../../../../components/ui/Select';
import { Button } from '../../../../../components/ui/Button';
import { api } from '../../../../../lib/api-client';
import type { Contribution } from '../../../../../types/contribution';
import { ContributionHistoryTable } from '../../../../../components/member/ContributionHistoryTable';

export default function MemberContributionsHistoryPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listMyContributions({
        page: 1,
        pageSize: 200,
        status: status || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement historique');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Historique de mes cotisations">
      <Card title="Mes dépôts / cotisations">
        <div className="toolbar responsive-toolbar">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Tous statuts' },
              { value: 'PENDING', label: 'En attente' },
              { value: 'VALIDATED', label: 'Validée' },
              { value: 'REJECTED', label: 'Rejetée' },
              { value: 'CANCELLED', label: 'Annulée' },
            ]}
          />
          <Button onClick={() => void load()}>Filtrer</Button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}
        <ContributionHistoryTable items={items} />
      </Card>
    </AppShell>
  );
}