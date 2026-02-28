//web/app/(protected)/admin/contributions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Select } from '../../../../components/ui/Select';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { Contribution } from '../../../../types/contribution';
import { ContributionValidationTable } from '../../../../components/admin/ContributionValidationTable';

export default function AdminContributionsPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('PENDING');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listAntennaContributions({
        page: 1,
        pageSize: 100,
        status: status || undefined,
        q: q || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleValidate(id: string) {
    const note = window.prompt('Note de validation (optionnel)') || undefined;
    setBusyId(id);
    try {
      await api.validateContributionAntenna(id, { note });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt('Motif du rejet (optionnel)') || undefined;
    setBusyId(id);
    try {
      await api.rejectContributionAntenna(id, { reason });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Validation des cotisations">
      <Card title="Cotisations des membres (votre antenne)">
        <div className="toolbar responsive-toolbar">
          <Input placeholder="Recherche membre / référence..." value={q} onChange={(e) => setQ(e.target.value)} />
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

        <ContributionValidationTable
          items={items}
          busyId={busyId}
          onValidate={handleValidate}
          onReject={handleReject}
        />
      </Card>
    </AppShell>
  );
}