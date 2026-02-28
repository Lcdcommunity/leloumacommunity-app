//web/app/(protected)/member/association/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { StatCard } from '../../../../components/ui/StatCard';
import { api } from '../../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../../lib/format';

export default function MemberAssociationOverviewPage() {
  const [data, setData] = useState<{
    associationId: string;
    associationName: string;
    totalValidatedContributionsAmount: number;
    currency: string;
    lastUpdatedAt?: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.getAssociationBalanceSummary();
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    })();
  }, []);

  return (
    <AppShell title="Solde global de l’association">
      <Card title="Résumé financier global (lecture)">
        {error ? <p className="error-text">{error}</p> : null}
        {data ? (
          <div className="grid grid-stats">
            <StatCard label="Association" value={data.associationName} />
            <StatCard label="Total cotisations validées" value={formatCurrency(data.totalValidatedContributionsAmount, data.currency)} />
            <StatCard label="Dernière mise à jour" value={formatDate(data.lastUpdatedAt ?? null)} />
          </div>
        ) : null}
      </Card>
    </AppShell>
  );
}