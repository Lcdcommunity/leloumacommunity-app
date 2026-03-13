//web/components/super-admin/ContributionsTable.tsx
//web/components/super-admin/ContributionsTable.tsx
'use client';

import type { Contribution, ContributionStatus } from '../../types/contribution';

const statusLabels: Record<ContributionStatus, string> = {
  PENDING: 'En attente',
  PENDING_VALIDATION: 'En attente de validation', // <-- CORRECTION ICI
  VALIDATED: 'Validée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
};

export function ContributionsTable({ items }: { items: Contribution[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucune cotisation trouvée.</p>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="table-responsive">
      <table className="table">
        <thead>
          <tr>
            <th>Membre</th>
            <th>Antenne</th>
            <th>Montant</th>
            <th>Méthode</th>
            <th>Date de dépôt</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {items.map((contribution) => (
            <tr key={contribution.id}>
              <td>
                <strong>
                  {contribution.member?.firstName} {contribution.member?.lastName}
                </strong>
              </td>
              <td>{contribution.antenna?.name || '-'}</td>
              <td>{formatCurrency(contribution.amount, contribution.currency)}</td>
              <td>{contribution.method || '-'}</td>
              <td>{formatDate(contribution.depositedAt || contribution.createdAt)}</td>
              <td>
                <span className={`badge badge-${contribution.status.toLowerCase()}`}>
                  {statusLabels[contribution.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}