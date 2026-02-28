//web/app/(protected)/member/late-members/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import { api } from '../../../../lib/api-client';

type LateMemberVisible = {
  id: string;
  firstName: string;
  lastName: string;
  antennaName?: string | null;
  lateMonths?: number;
};

export default function MemberLateMembersPage() {
  const [items, setItems] = useState<LateMemberVisible[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.listLateMembersVisible({ page: 1, pageSize: 100 });
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement');
      }
    })();
  }, []);

  return (
    <AppShell title="Retardataires (+3 mois)">
      <Card title="Liste des retardataires de plus de 3 mois">
        <p style={{ marginTop: 0 }}>
          Affichage informatif pour transparence communautaire (lecture seule).
        </p>

        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Nom', 'Antenne', 'Retard (mois)']}>
          {items.map((m) => (
            <tr key={m.id}>
              <td>{m.firstName} {m.lastName}</td>
              <td>{m.antennaName || '—'}</td>
              <td>{m.lateMonths ?? '—'}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}