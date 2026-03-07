// web/app/(protected)/member/contributions/history/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const load = useCallback(async () => {
    try {
      const res = await api.listMyContributions({
        page: 1,
        pageSize: 200,
        // @ts-expect-error - Force l'injection du statut même s'il manque dans les types de l'API
        status: status || undefined,
      });
      setItems(res?.items || []);
      setError(null); // Placé après le "await" pour éviter l'erreur "set-state-in-effect"
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement historique');
    }
  }, [status]);

  useEffect(() => { 
    void load(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell title="Historique de mes cotisations">
      <Card title="Mes dépôts / cotisations">
        <div className="toolbar responsive-toolbar">
          <Select
            label="Filtrer par statut" // Ajout du label obligatoire
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Tous statuts' },
              { value: 'PENDING_VALIDATION', label: 'En attente' }, // Alignement sur le vrai statut
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