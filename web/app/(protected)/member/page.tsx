// web/app/(protected)/member/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { Card } from '../../../components/ui/Card';
import { StatCard } from '../../../components/ui/StatCard';
import { Table } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import { Loader } from '../../../components/ui/Loader';
import { MemberStatusBanner } from '../../../components/member/MemberStatusBanner';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../lib/format';
import type { UserSummary } from '../../../types/user';
import type { Contribution } from '../../../types/contribution';
import type { Project } from '../../../types/project';
import type { ContentPost } from '../../../types/content';

type MemberDashboardResponse = {
  stats?: {
    myTotalContributions?: number;
    activeProjects?: number;
    myContributionsTotal?: number;
    myContributionsValidatedTotal?: number;
    myPendingContributionsCount?: number;
    associationTotalBalance?: number;
    lateMonths?: number;
    myLastContributionAt?: string | null;
    currency?: string;
  };
  me?: UserSummary;
  user?: UserSummary;
  recentContributions?: Contribution[];
  projectsInProgress?: Project[];
  latestContents?: ContentPost[];
  lateMembersPreview?: Array<{ id: string; firstName: string; lastName: string; lateMonths?: number }>;
};

export default function MemberHomePage() {
  const [data, setData] = useState<MemberDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.dashboardMember();
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement dashboard');
      }
    })();
  }, []);

  return (
    <AppShell title="Espace membre">
      {!data && !error ? <Loader text="Chargement..." /> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {data ? (
        <div className="stack-lg">
          {/* On vérifie que l'utilisateur existe bien avant d'afficher la bannière */}
          {(data?.me || data?.user) && <MemberStatusBanner me={(data?.me || data?.user)!} />}

          <div className="grid grid-stats">
            <StatCard label="Mes cotisations (total)" value={formatCurrency(data?.stats?.myContributionsTotal ?? data?.stats?.myTotalContributions ?? 0, data?.stats?.currency || 'EUR')} />
            <StatCard label="Mes cotisations validées" value={formatCurrency(data?.stats?.myContributionsValidatedTotal ?? data?.stats?.myTotalContributions ?? 0, data?.stats?.currency || 'EUR')} />
            <StatCard label="Mes dépôts en attente" value={data?.stats?.myPendingContributionsCount ?? 0} />
            <StatCard label="Solde association" value={formatCurrency(data?.stats?.associationTotalBalance ?? 0, data?.stats?.currency || 'EUR')} />
            <StatCard label="Mon retard (mois)" value={data?.stats?.lateMonths ?? 0} />
            <StatCard label="Dernière cotisation" value={formatDate(data?.stats?.myLastContributionAt ?? null)} />
          </div>

          <div className="grid grid-2">
            <Card title="Mes cotisations récentes">
              <Table columns={['Montant', 'Statut', 'Date']}>
                {/* Fallback array vide garanti pour éviter le "map is not a function" */}
                {(data?.recentContributions || []).map((c) => (
                  <tr key={c.id}>
                    <td>{formatCurrency(c.amount, c.currency)}</td>
                    <td>
                      <Badge tone={c.status === 'VALIDATED' ? 'success' : c.status === 'PENDING' ? 'warning' : 'danger'}>
                        {c.status}
                      </Badge>
                    </td>
                    <td>{formatDate(c.depositedAt || c.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </Card>

            <Card title="Projets en cours">
              <Table columns={['Projet', 'Statut', 'Date']}>
                {(data?.projectsInProgress || []).map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td><Badge tone="info">{p.status}</Badge></td>
                    <td>{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>

          <div className="grid grid-2">
            <Card title="Informations récentes">
              <Table columns={['Titre', 'Statut', 'Date']}>
                {(data?.latestContents || []).map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td><Badge tone="success">{c.status}</Badge></td>
                    <td>{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </Table>
            </Card>

            <Card title="Retardataires (+3 mois) — aperçu">
              <Table columns={['Nom', 'Retard (mois)']}>
                {(data?.lateMembersPreview || []).map((m) => (
                  <tr key={m.id}>
                    <td>{m.firstName} {m.lastName}</td>
                    <td>{m.lateMonths ?? '—'}</td>
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