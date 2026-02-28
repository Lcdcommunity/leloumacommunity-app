//web/app/(protected)/super-admin/approvals/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { PendingAccountsTable } from '../../../../components/super-admin/PendingAccountsTable';

export default function SuperAdminApprovalsPage() {
  const [items, setItems] = useState<UserSummary[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listMembers({ status: 'PENDING_APPROVAL', page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

  async function approve(userId: string) {
    setLoadingId(userId);
    try {
      await api.approveMemberAccount(userId);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  async function reject(userId: string) {
    const reason = window.prompt('Motif du rejet (optionnel)') ?? undefined;
    setLoadingId(userId);
    try {
      await api.rejectMemberAccount(userId, reason);
      await load();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <AppShell title="Validation des comptes membres">
      <Card title="Comptes en attente d’approbation">
        {error ? <p className="error-text">{error}</p> : null}
        <PendingAccountsTable
          items={items}
          onApprove={approve}
          onReject={reject}
          loadingId={loadingId}
        />
      </Card>
    </AppShell>
  );
}