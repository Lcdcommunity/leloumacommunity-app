//web/app/(protected)/admin/late-members/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { fullName, formatDate } from '../../../../lib/format';

type LateMember = UserSummary & {
  lateMonths?: number;
  lastValidatedContributionAt?: string | null;
};

export default function AdminLateMembersPage() {
  const [items, setItems] = useState<LateMember[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.listLateMembersOver3Months({ page: 1, pageSize: 100 });
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    })();
  }, []);

  return (
    <AppShell title="Retardataires (+3 mois)">
      <Card title="Membres retardataires de plus de 3 mois">
        {error ? <p className="error-text">{error}</p> : null}
        <Table columns={['Nom', 'Email', 'Statut', 'Retard (mois)', 'Dernière cotisation validée']}>
          {items.map((m) => (
            <tr key={m.id}>
              <td>{fullName(m)}</td>
              <td>{m.email}</td>
              <td>{m.status}</td>
              <td>{m.lateMonths ?? '—'}</td>
              <td>{formatDate(m.lastValidatedContributionAt ?? null)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}