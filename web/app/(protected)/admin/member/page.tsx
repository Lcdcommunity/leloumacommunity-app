//web/app/(protected)/admin/member/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { StatCard } from '../../../components/ui/StatCard';
import { Card } from '../../../components/ui/Card';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Loader } from '../../../components/ui/Loader';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate, fullName } from '../../../lib/format';
import type { UserSummary } from '../../../types/user';
import type { Contribution } from '../../../types/contribution';
import type { Project } from '../../../types/project';
import type { AntennaDashboardStats } from '../../../types/stats';

type DashboardAntennaData = {
  stats: AntennaDashboardStats;
  recentPendingAccounts: UserSummary[];
  recentPendingContributions: Contribution[];
  recentProjects: Project[];
  lateMembers: Array<UserSummary & { lastValidatedContributionAt?: string | null; lateMonths?: number }>;
};

export default function AdminAntennaHomePage() {
  const [data, setData] = useState<DashboardAntennaData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.dashboardAntennaAdmin();
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur dashboard');
      }
    })();
  }, []);

  return (
    <AppShell title="Dashboard Admin d’antenne">
      {!data && !error ? <Loader text="Chargement du dashboard..." /> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {data ? (
        <div className="stack-lg">
          <Card title={`Antenne : ${data.stats.antennaName}`}>
            <div className="grid grid-stats">
              <StatCard label="Membres" value={data.stats.membersTotal} />
              <StatCard label="Membres actifs" value={data.stats.membersActive} />
              <StatCard label="Comptes à valider" value={data.stats.pendingAccounts} />
              <StatCard label="Cotisations à valider" value={data.stats.pendingContributions} />
              <StatCard
                label="Cotisations validées (mois)"
                value={formatCurrency(data.stats.validatedContributionsAmountMonth, 'EUR')}
              />
              <StatCard
                label="Cotisations validées (total)"
                value={formatCurrency(data.stats.validatedContributionsAmountAllTime, 'EUR')}
              />
              <StatCard label="Retardataires > 3 mois" value={data.stats.lateMembersOver3Months} />
              <StatCard label="Projets actifs" value={data.stats.activeProjects} />
            </div>
          </Card>

          <div className="grid grid-2">
            <Card title="Comptes membres en attente (antenne)">
              <Table columns={['Nom', 'Email', 'Statut', 'Créé le']}>
                {data.recentPendingAccounts.map((u) => (
                  <tr key={u.id}>
                    <td>{fullName(u)}</td>
                    <td>{u.email}</td>
                    <td><Badge tone="warning">{u.status}</Badge></td>
                    <td>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </Card>

            <Card title="Cotisations à valider (récentes)">
              <Table columns={['Membre', 'Montant', 'Méthode', 'Statut', 'Date']}>
                {data.recentPendingContributions.map((c) => (
                  <tr key={c.id}>
                    <td>{c.member ? `${c.member.firstName} ${c.member.lastName}` : c.memberId}</td>
                    <td>{formatCurrency(c.amount, c.currency)}</td>
                    <td>{c.method || '—'}</td>
                    <td><Badge tone="warning">{c.status}</Badge></td>
                    <td>{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>

          <div className="grid grid-2">
            <Card title="Projets récents (antenne)">
              <Table columns={['Titre', 'Statut', 'Budget prévu', 'Créé le']}>
                {data.recentProjects.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td><Badge tone="info">{p.status}</Badge></td>
                    <td>{p.budgetPlanned != null ? formatCurrency(p.budgetPlanned) : '—'}</td>
                    <td>{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </Card>

            <Card title="Retardataires (+3 mois)">
              <Table columns={['Nom', 'Email', 'Retard (mois)', 'Dernière cotisation validée']}>
                {data.lateMembers.map((m) => (
                  <tr key={m.id}>
                    <td>{fullName(m)}</td>
                    <td>{m.email}</td>
                    <td>{m.lateMonths ?? '—'}</td>
                    <td>{formatDate(m.lastValidatedContributionAt ?? null)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}