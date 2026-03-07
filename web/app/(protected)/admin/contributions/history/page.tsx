// web/app/(protected)/admin/contributions/history/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { Card } from '../../../../../components/ui/Card';
import { Select } from '../../../../../components/ui/Select';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { api } from '../../../../../lib/api-client';
import type { Contribution } from '../../../../../types/contribution';
import { ContributionValidationTable } from '../../../../../components/admin/ContributionValidationTable';

export default function AdminContributionsHistoryPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState(''); 
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.listAntennaContributions({
        page: 1,
        pageSize: 100,
        status: status || undefined,
        q: q || undefined,
      });
      setItems(res?.items || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }, [status, q]);

  useEffect(() => { 
    void load(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!reason) return;
    setBusyId(id);
    try {
      await api.rejectContributionAntenna(id, { reason });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function handleEdit(id: string, currentAmount: number) {
    const newAmountStr = window.prompt('Nouveau montant de la cotisation :', String(currentAmount));
    if (!newAmountStr) return;

    const newAmount = parseFloat(newAmountStr.replace(',', '.'));
    if (isNaN(newAmount) || newAmount <= 0) {
      alert('Veuillez entrer un montant valide (supérieur à 0).');
      return;
    }

    setBusyId(id);
    try {
      await api.updateContributionAntenna(id, { amount: newAmount });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Historique des cotisations">
      <Card title="Archives de l'antenne">
        <div className="toolbar responsive-toolbar">
          <Input placeholder="Recherche membre / référence..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            label="Filtrer par statut"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Tous statuts' },
              { value: 'VALIDATED', label: 'Validée' },
              { value: 'REJECTED', label: 'Rejetée' },
              { value: 'PENDING_VALIDATION', label: 'En attente' },
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
          onEdit={handleEdit}
          isHistoryView={true} // 👇 ON ACTIVE LE NOUVEAU MODE ICI
        />
      </Card>
    </AppShell>
  );
}