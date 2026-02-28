//web/app/(protected)/super-admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { StatCard } from '../../../components/ui/StatCard';
import { Card } from '../../../components/ui/Card';
import { Loader } from '../../../components/ui/Loader';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate, fullName } from '../../../lib/format';
import type { UserSummary } from '../../../types/user';
import type { Contribution } from '../../../types/contribution';
import type { Project } from '../../../types/project';

type DashboardData = {
  stats: {
    associations: number;
    antennas: number;
    members: number;
    pendingAccounts: number;
    pendingContributions: number;
    activeProjects: number;
    totalValidatedContributionsAmount: number;
  };
  recentPendingAccounts: UserSummary[];
  recentContributions: Contribution[];
  recentProjects: Project[];
};

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.dashboardSuperAdmin();
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    })();
  }, []);

  return (
    <AppShell title="Dashboard Super Admin">
      {!data && !error ? <Loader /> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {data ? (
        <div className="stack-lg">
          <div className="grid grid-stats">
            <StatCard label="Associations" value={data.stats.associations} />
            <StatCard label="Antennes" value={data.stats.antennas} />
            <StatCard label="Membres" value={data.stats.members} />
            <StatCard label="Comptes en attente" value={data.stats.pendingAccounts} />
            <StatCard label="Cotisations en attente" value={data.stats.pendingContributions} />
            <StatCard label="Projets actifs" value={data.stats.activeProjects} />
            <StatCard
              label="Cagnotte validée (globale)"
              value={formatCurrency(data.stats.totalValidatedContributionsAmount, 'EUR')}
            />
          </div>

          <div className="grid grid-2">
            <Card title="Comptes membres en attente (récents)">
              <Table columns={['Nom', 'Email', 'Rôle', 'Statut', 'Créé le']}>
                {data.recentPendingAccounts.map((u) => (
                  <tr key={u.id}>
                    <td>{fullName(u)}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td><Badge tone="warning">{u.status}</Badge></td>
                    <td>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </Card>

            <Card title="Cotisations récentes">
              <Table columns={['Membre', 'Montant', 'Statut', 'Date']}>
                {data.recentContributions.map((c) => (
                  <tr key={c.id}>
                    <td>{c.member ? `${c.member.firstName} ${c.member.lastName}` : c.memberId}</td>
                    <td>{formatCurrency(c.amount, c.currency)}</td>
                    <td>
                      <Badge tone={c.status === 'VALIDATED' ? 'success' : c.status === 'PENDING' ? 'warning' : 'danger'}>
                        {c.status}
                      </Badge>
                    </td>
                    <td>{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>

          <Card title="Projets récents">
            <Table columns={['Titre', 'Statut', 'Budget prévu', 'Budget dépensé', 'Créé le']}>
              {data.recentProjects.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td><Badge tone="info">{p.status}</Badge></td>
                  <td>{p.budgetPlanned != null ? formatCurrency(p.budgetPlanned) : '—'}</td>
                  <td>{p.budgetSpent != null ? formatCurrency(p.budgetSpent) : '—'}</td>
                  <td>{formatDate(p.createdAt)}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}