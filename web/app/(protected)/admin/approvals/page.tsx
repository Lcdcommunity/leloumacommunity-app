//web/app/(protected)/admin/approvals/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { PendingAccountsTable } from '../../../../components/super-admin/PendingAccountsTable';
import type { UserSummary } from '../../../../types/user';
import { api } from '../../../../lib/api-client';

export default function AdminApprovalsPage() {
  const [items, setItems] = useState<UserSummary[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listPendingMemberApprovalsAntenna({ page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleApprove(userId: string) {
    setLoadingId(userId);
    try {
      await api.approveMemberAccountAntenna(userId);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleReject(userId: string) {
    const reason = window.prompt('Motif du rejet (optionnel)') || undefined;
    setLoadingId(userId);
    try {
      await api.rejectMemberAccountAntenna(userId, reason);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <AppShell title="Validation des comptes membres">
      <Card title="Comptes en attente d’approbation (votre antenne)">
        {error ? <p className="error-text">{error}</p> : null}
        <PendingAccountsTable
          items={items}
          loadingId={loadingId}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </Card>
    </AppShell>
  );
}