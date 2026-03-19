//web/components/super-admin/ContributionsTable.tsx
'use client';

import type { Contribution, ContributionStatus } from '../../types/contribution';
import { formatCurrency, formatDate } from '../../lib/format';

const statusLabels: Record<ContributionStatus, string> = {
  PENDING: 'En attente',
  PENDING_VALIDATION: 'En attente de validation',
  VALIDATED: 'Validée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
};

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte',
  OTHER: 'Autre',
};

export function ContributionsTable({ items }: { items: Contribution[] }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '2rem 1.25rem', color: '#6B7280', fontWeight: 600 }}>
        Aucune cotisation trouvée.
      </div>
    );
  }

  return (
    <>
      <style>{`
        .sct-wrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .sct-table {
          width: 100%;
          min-width: 840px;
          border-collapse: collapse;
          font-family: 'DM Sans', sans-serif;
        }

        .sct-table thead tr {
          border-bottom: 1px solid rgba(220,38,38,.08);
        }

        .sct-table thead th {
          padding: .85rem 1.1rem;
          text-align: left;
          font-size: .66rem;
          font-weight: 900;
          letter-spacing: .09em;
          text-transform: uppercase;
          color: #6B7280;
          background: rgba(254,242,242,.22);
          white-space: nowrap;
        }

        .sct-table tbody tr {
          border-bottom: 1px solid rgba(220,38,38,.06);
          transition: background .15s ease;
        }

        .sct-table tbody tr:hover {
          background: rgba(220,38,38,.025);
        }

        .sct-table tbody tr:last-child {
          border-bottom: none;
        }

        .sct-table td {
          padding: .9rem 1.1rem;
          font-size: .82rem;
          color: #374151;
          vertical-align: middle;
        }

        .sct-member {
          display: flex;
          flex-direction: column;
          gap: .18rem;
        }

        .sct-member-name {
          font-size: .87rem;
          font-weight: 800;
          color: #111827;
        }

        .sct-member-email {
          font-size: .72rem;
          color: #9CA3AF;
          font-weight: 500;
        }

        .sct-amount {
          font-family: 'DM Mono', monospace;
          font-size: .84rem;
          font-weight: 700;
          color: #111827;
          white-space: nowrap;
        }

        .sct-method {
          display: inline-flex;
          align-items: center;
          gap: .28rem;
          font-size: .7rem;
          font-weight: 700;
          color: #374151;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 999px;
          padding: .24rem .58rem;
          white-space: nowrap;
        }

        .sct-date {
          white-space: nowrap;
          font-size: .78rem;
          font-weight: 600;
          color: #374151;
        }

        .sct-status {
          display: inline-flex;
          align-items: center;
          gap: .32rem;
          padding: .25rem .62rem;
          border-radius: 999px;
          font-size: .7rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .sct-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>

      <div className="sct-wrap">
        <table className="sct-table">
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
            {items.map((contribution) => {
              const statusStyles =
                contribution.status === 'VALIDATED'
                  ? { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' }
                  : contribution.status === 'REJECTED'
                    ? { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' }
                    : contribution.status === 'CANCELLED'
                      ? { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' }
                      : { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };

              const fullName =
                `${contribution.member?.firstName ?? ''} ${contribution.member?.lastName ?? ''}`.trim() || '—';

              return (
                <tr key={contribution.id}>
                  <td>
                    <div className="sct-member">
                      <span className="sct-member-name">{fullName}</span>
                      <span className="sct-member-email">{contribution.member?.email ?? '—'}</span>
                    </div>
                  </td>

                  <td>{contribution.antenna?.name || '-'}</td>

                  <td className="sct-amount">
                    {formatCurrency(contribution.amount, contribution.currency || 'EUR')}
                  </td>

                  <td>
                    <span className="sct-method">
                      {methodLabels[contribution.method ?? ''] ?? contribution.method ?? '-'}
                    </span>
                  </td>

                  <td className="sct-date">
                    {formatDate(contribution.depositedAt || contribution.createdAt)}
                  </td>

                  <td>
                    <span
                      className="sct-status"
                      style={{
                        color: statusStyles.color,
                        background: statusStyles.bg,
                        border: `1px solid ${statusStyles.border}`,
                      }}
                    >
                      <span
                        className="sct-status-dot"
                        style={{ background: statusStyles.color }}
                      />
                      {statusLabels[contribution.status] ?? contribution.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}