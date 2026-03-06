//web/app/(protected)/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { Card } from '../../../components/ui/Card';
import { api } from '../../../lib/api-client';

// 1. Interfaces strictes pour supprimer tout message 'any'
interface PendingAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

interface DashboardData {
  antennaName: string;
  stats: {
    members: number;
    pendingApprovals: number;
    pendingContributions: number;
    activeProjects: number;
    totalValidatedAmount: number;
  };
  recentPendingAccounts: PendingAccount[];
}

export default function AntennaAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    // Appel typé pour supprimer les erreurs TS et ESLint
    api.dashboardAntennaAdmin().then((res) => {
      setData(res as unknown as DashboardData);
    });
  }, []);

  if (!data) return <AppShell title="Chargement du dashboard...">...</AppShell>;

  return (
    <AppShell title={`Tableau de bord : ${data.antennaName}`}>
      {/* Grille de statistiques avec design moderne */}
      <div className="grid grid-4 gap-lg mb-xl">
        <div className="card-stat shadow-sm border-left-blue">
          <div className="flex justify-between items-start">
            <span className="text-muted weight-bold uppercase text-xs">Membres Actifs</span>
            <span className="icon-bg bg-soft-blue">👥</span>
          </div>
          <p className="value-lg mt-sm">{data.stats.members}</p>
        </div>

        <div className="card-stat shadow-sm border-left-orange">
          <div className="flex justify-between items-start">
            <span className="text-muted weight-bold uppercase text-xs">Adhésions en attente</span>
            <span className="icon-bg bg-soft-orange">⏳</span>
          </div>
          <p className="value-lg mt-sm text-orange">{data.stats.pendingApprovals}</p>
        </div>

        <div className="card-stat shadow-sm border-left-purple">
          <div className="flex justify-between items-start">
            <span className="text-muted weight-bold uppercase text-xs">Cotisations à valider</span>
            <span className="icon-bg bg-soft-purple">💰</span>
          </div>
          <p className="value-lg mt-sm text-purple">{data.stats.pendingContributions}</p>
        </div>

        <div className="card-stat shadow-sm border-left-green">
          <div className="flex justify-between items-start">
            <span className="text-muted weight-bold uppercase text-xs">Total Récolté</span>
            <span className="icon-bg bg-soft-green">📈</span>
          </div>
          <p className="value-lg mt-sm text-green">{data.stats.totalValidatedAmount} €</p>
        </div>
      </div>

      {/* Section Contenu avec meilleure gestion de l'espace */}
      <div className="grid grid-2 gap-xl">
        <Card title="Dernières demandes d&apos;adhésion">
          <div className="p-md">
            {data.recentPendingAccounts.length > 0 ? (
              <div className="stack-md">
                {data.recentPendingAccounts.map((acc) => (
                  <div key={acc.id} className="flex justify-between items-center border-bottom pb-sm hover-row">
                    <div>
                      <p className="weight-bold">{acc.firstName} {acc.lastName}</p>
                      <p className="text-muted text-xs">{acc.email}</p>
                    </div>
                    <span className="badge-light text-xs">
                      {new Date(acc.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-xl text-muted">
                <p>Aucune demande en attente pour le moment.</p>
              </div>
            )}
          </div>
        </Card>

        <Card title="Alertes & Rappels">
          <div className="p-md">
            <div className="alert-warning p-md radius-md mb-md">
              <p className="text-sm weight-bold mb-xs">Membres en retard</p>
              <p className="text-xs">
                Certains membres n&apos;ayant pas cotisé depuis plus de 3 mois ont été identifiés.
              </p>
            </div>
            <div className="p-md border radius-md bg-light text-center cursor-pointer hover-bg">
              <span className="text-sm weight-bold text-primary">Consulter la liste des retardataires →</span>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}