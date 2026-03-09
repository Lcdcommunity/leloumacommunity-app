//web/app/(protected)/admin/members/page.tsx
'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { StatCard } from '../../../../components/ui/StatCard';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Loader } from '../../../../components/ui/Loader';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { MemberActionsTable } from '../../../../components/admin/MemberActionsTable';
import { api } from '../../../../lib/api-client';
import { formatCurrency, formatDate, fullName } from '../../../../lib/format';
import type { UserSummary } from '../../../../types/user';
import type { Contribution } from '../../../../types/contribution';
import type { Project } from '../../../../types/project';
import type { AntennaDashboardStats } from '../../../../types/stats';

type DashboardAntennaData = {
  stats: AntennaDashboardStats;
  recentPendingAccounts: UserSummary[];
  recentPendingContributions: Contribution[];
  recentProjects: Project[];
  lateMembers: Array<UserSummary & { lastValidatedContributionAt?: string | null; lateMonths?: number }>;
};

export default function AdminAntennaMembersPage() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members'>('dashboard');

  // Dashboard State
  const [dashboardData, setDashboardData] = useState<DashboardAntennaData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Members Management State
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Load Dashboard Data
  useEffect(() => {
    if (activeTab === 'dashboard' && !dashboardData) {
      void (async () => {
        try {
          const res = await api.dashboardAntennaAdmin();
          setDashboardData(res);
        } catch (err) {
          setDashboardError(err instanceof Error ? err.message : 'Erreur dashboard');
        }
      })();
    }
  }, [activeTab, dashboardData]);

  // Load Members Data
  async function loadMembers() {
    setMembersError(null);
    try {
      const res = await api.listAntennaMembers({
        page: 1,
        pageSize: 100,
        q: q || undefined,
        status: status || undefined,
      });
      setMembers(res.items);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : 'Erreur chargement membres');
    }
  }

  useEffect(() => {
    if (activeTab === 'members' && members.length === 0) {
      void loadMembers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handle Member Actions
  async function withReload(fn: () => Promise<void>, id: string) {
    setBusyId(id);
    try {
      await fn();
      await loadMembers();
      // Optional: reload dashboard data to refresh counts
      const res = await api.dashboardAntennaAdmin();
      setDashboardData(res);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Espace Administrateur d'Antenne">
      
      {/* Navigation interne (Onglets) */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'dashboard'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Vue d&apos;ensemble
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'members'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Annuaire &amp; Gestion des Membres
        </button>
      </div>

      {/* VUE 1 : DASHBOARD */}
      {activeTab === 'dashboard' && (
        <>
          {!dashboardData && !dashboardError ? <Loader text="Chargement du dashboard..." /> : null}
          {dashboardError ? <p className="error-text">{dashboardError}</p> : null}

          {dashboardData ? (
            <div className="stack-lg">
              <Card title={`Antenne : ${dashboardData.stats.antennaName}`}>
                <div className="grid grid-stats">
                  <StatCard label="Membres" value={dashboardData.stats.membersTotal} />
                  <StatCard label="Membres actifs" value={dashboardData.stats.membersActive} />
                  <StatCard label="Comptes à valider" value={dashboardData.stats.pendingAccounts} />
                  <StatCard label="Cotisations à valider" value={dashboardData.stats.pendingContributions} />
                  <StatCard
                    label="Cotisations validées (mois)"
                    value={formatCurrency(dashboardData.stats.validatedContributionsAmountMonth, 'EUR')}
                  />
                  <StatCard
                    label="Cotisations validées (total)"
                    value={formatCurrency(dashboardData.stats.validatedContributionsAmountAllTime, 'EUR')}
                  />
                  <StatCard label="Retardataires > 3 mois" value={dashboardData.stats.lateMembersOver3Months} />
                  <StatCard label="Projets actifs" value={dashboardData.stats.activeProjects} />
                </div>
              </Card>

              <div className="grid grid-2">
                <Card title="Comptes membres en attente (antenne)">
                  <Table columns={['Nom', 'Email', 'Statut', 'Créé le']}>
                    {dashboardData.recentPendingAccounts.map((u) => (
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
                    {dashboardData.recentPendingContributions.map((c) => (
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
                    {dashboardData.recentProjects.map((p) => (
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
                    {dashboardData.lateMembers.map((m) => (
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
        </>
      )}

      {/* VUE 2 : GESTION DES MEMBRES */}
      {activeTab === 'members' && (
        <Card title="Gestion des membres">
          <div className="toolbar responsive-toolbar">
            <Input 
              placeholder="Recherche (nom, email...)" 
              value={q} 
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} 
            />
            <Select
              label="Statut"
              value={status}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'Tous statuts' },
                { value: 'PENDING_EMAIL_VERIFICATION', label: 'Email non vérifié' },
                { value: 'PENDING_APPROVAL', label: 'En attente approbation' },
                { value: 'ACTIVE', label: 'Actif' },
                { value: 'SUSPENDED', label: 'Suspendu' },
                { value: 'REJECTED', label: 'Rejeté' },
              ]}
            />
            <Button onClick={() => void loadMembers()}>Filtrer</Button>
          </div>

          {membersError ? <p className="error-text">{membersError}</p> : null}

          <MemberActionsTable
            items={members}
            busyId={busyId}
            onSuspend={(id: string) => withReload(() => api.suspendUser(id).then(() => undefined), id)}
            onActivate={(id: string) => withReload(() => api.activateUser(id).then(() => undefined), id)}
            onDelete={async (id: string) => {
              const ok = window.confirm('Confirmer la suppression du membre ?');
              if (!ok) return;
              await withReload(() => api.deleteUser(id).then(() => undefined), id);
            }}
          />
        </Card>
      )}

    </AppShell>
  );
}