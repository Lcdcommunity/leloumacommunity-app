// web/components/super-admin/ContributionsTable.tsx
'use client';

import { useMemo } from 'react';
import type { Contribution } from '../../types/contribution';
import { formatDate } from '../../lib/format';

const STATUS_MAP: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
  }
> = {
  PENDING: {
    label: 'En attente',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  PENDING_VALIDATION: {
    label: 'En attente',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  VALIDATED: {
    label: 'Validée',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  REJECTED: {
    label: 'Rejetée',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  CANCELLED: {
    label: 'Annulée',
    color: '#9CA3AF',
    bg: '#F9FAFB',
    border: '#E5E7EB',
  },
};

function getInitials(name: string): string {
  const cleanName = name.trim();

  if (!cleanName) return '--';

  return cleanName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? {
    label: status,
    color: '#6B7280',
    bg: '#F3F4F6',
    border: '#E5E7EB',
  };

  return (
    <span
      className="sa-ct-status"
      style={{
        color: s.color,
        background: s.bg,
        borderColor: s.border,
      }}
    >
      <span
        style={{
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: s.color,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

type Props = {
  items: Contribution[];
  onItemClick?: (contribution: Contribution) => void;
};

export function ContributionsTable({
  items,
  onItemClick,
}: Props) {
  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      ),
    [items],
  );

  return (
    <div className="sa-ct-wrap">
      <style>{`
        .sa-ct-wrap {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          overflow-y: visible;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .sa-ct-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin: 0;
        }

        .sa-ct-table thead tr {
          border-bottom: 1px solid rgba(220, 38, 38, 0.07);
        }

        .sa-ct-table th {
          padding: 0.8rem 1rem;
          font-size: 0.65rem;
          font-weight: 900;
          text-transform: uppercase;
          color: #9CA3AF;
          text-align: left;
          white-space: nowrap;
        }

        .sa-ct-table td {
          padding: 0.8rem 1rem;
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
          vertical-align: middle;
        }

        .sa-ct-row {
          border-bottom: 1px solid rgba(220, 38, 38, 0.05);
          transition: background 0.15s ease;
          cursor: pointer;
        }

        .sa-ct-row:hover {
          background: rgba(220, 38, 38, 0.03);
        }

        .sa-ct-user {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
        }

        .sa-ct-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #DC2626, #991B1B);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.68rem;
          font-weight: 900;
          color: white;
          flex-shrink: 0;
        }

        .sa-ct-status {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.68rem;
          font-weight: 800;
          border-radius: 999px;
          padding: 0.15rem 0.6rem;
          border: 1px solid;
          white-space: nowrap;
        }

        .sa-ct-cards {
          display: none;
          width: 100%;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .sa-ct-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          display: block;
        }

        @media (max-width: 600px) {
          .sa-ct-table {
            display: none;
          }

          .sa-ct-cards {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            width: 100%;
            padding: 0;
            margin: 0;
          }

          .sa-ct-card {
            width: 100%;
            background: white;
            border-radius: 14px;
            border: 1px solid rgba(220, 38, 38, 0.07);
            padding: 0.8rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            cursor: pointer;
            box-sizing: border-box;
          }

          .sa-ct-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            min-width: 0;
          }

          .sa-ct-card-body {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid rgba(0, 0, 0, 0.04);
            padding-top: 0.5rem;
          }

          .sa-ct-card-subtext {
            font-size: 0.7rem;
            color: #9CA3AF;
            font-weight: 500;
          }
        }
      `}</style>

      {/* Desktop */}
      <table className="sa-ct-table">
        <thead>
          <tr>
            <th>Membre</th>
            <th>Statut</th>
            <th>Créée le</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((c) => {
            const fullName = `${c.member?.firstName ?? ''} ${c.member?.lastName ?? ''}`;

            return (
              <tr
                key={c.id}
                className="sa-ct-row"
                onClick={() => onItemClick?.(c)}
              >
                <td>
                  <div className="sa-ct-user">
                    <div className="sa-ct-avatar">
                      {getInitials(fullName)}
                    </div>
                    <span className="sa-ct-name">{fullName}</span>
                  </div>
                </td>

                <td>
                  <StatusBadge status={c.status} />
                </td>

                <td
                  style={{
                    color: '#6B7280',
                    fontSize: '.76rem',
                  }}
                >
                  {formatDate(c.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile */}
      <div className="sa-ct-cards">
        {sortedItems.map((c) => {
          const fullName = `${c.member?.firstName ?? ''} ${c.member?.lastName ?? ''}`;

          return (
            <div
              key={c.id}
              className="sa-ct-card"
              onClick={() => onItemClick?.(c)}
            >
              <div className="sa-ct-card-header">
                <div className="sa-ct-user">
                  <div className="sa-ct-avatar">
                    {getInitials(fullName)}
                  </div>
                  <span className="sa-ct-name">{fullName}</span>
                </div>

                <StatusBadge status={c.status} />
              </div>

              <div className="sa-ct-card-body">
                <span className="sa-ct-card-subtext">
                  Créée le
                </span>
                <span
                  style={{
                    fontSize: '.7rem',
                    color: '#6B7280',
                    fontWeight: 600,
                  }}
                >
                  {formatDate(c.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}