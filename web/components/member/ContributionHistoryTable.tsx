// web/components/member/ContributionHistoryTable.tsx
'use client';

import type { Contribution } from '../../types/contribution';
import { formatCurrency, formatDate } from '../../lib/format';

type ExtendedContribution = Contribution & {
  reference?: string | null;
  validatedAt?: string | null;
  purpose?: string | null; // 👇 Ajout du champ purpose au type
};

function getStatusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED:          { label: 'Validée',     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    PENDING:            { label: 'En attente',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING_VALIDATION: { label: 'En attente',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    REJECTED:           { label: 'Rejetée',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    CANCELLED:          { label: 'Annulée',     color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  return map[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
}

function getMethodLabel(method: string) {
  const map: Record<string, string> = {
    CASH: 'Espèces',
    BANK_TRANSFER: 'Virement',
    MOBILE_MONEY: 'Mobile Money',
  };
  return map[method] ?? method;
}

function getPurposeLabel(purpose?: string | null) {
  // 👇 Ajout des emojis pour correspondre au formulaire
  const map: Record<string, string> = {
    REGULAR_QUOTA: '📅 Cotisation',
    MEMBERSHIP_CARD: '💳 Carte membre',
    DONATION: '🤝 Don',
  };
  return purpose ? (map[purpose] ?? purpose) : '—';
}

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.68rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 99, padding: '0.18rem 0.58rem', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

export function ContributionHistoryTable({ items }: { items: ExtendedContribution[] }) {
  if (items.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '2.5rem 1rem', gap: '0.75rem',
        color: '#9CA3AF',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#F9FAFB', border: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4m6 8l4-4-4-4"/>
          </svg>
        </div>
        <p style={{ fontSize: '0.82rem', fontWeight: 500 }}>Aucune cotisation trouvée</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .cht-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cht-table { width: 100%; border-collapse: collapse; font-family: 'DM Sans', sans-serif; min-width: 540px; }
        .cht-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.08); }
        .cht-table thead th {
          padding: 0.6rem 1rem;
          font-size: 0.63rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase;
          color: #9CA3AF; text-align: left; white-space: nowrap;
        }
        .cht-table tbody tr {
          border-bottom: 1px solid rgba(37,99,235,0.05);
          transition: background 0.15s;
        }
        .cht-table tbody tr:last-child { border-bottom: none; }
        .cht-table tbody tr:hover { background: rgba(37,99,235,0.025); }
        .cht-table td {
          padding: 0.72rem 1rem;
          font-size: 0.8rem; color: #374151;
          vertical-align: middle;
        }
        .cht-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.98rem; font-weight: 600; color: #111827;
        }
        .cht-muted { color: #9CA3AF; font-size: 0.73rem; }
        .cht-method-chip {
          display: inline-flex; align-items: center; gap: 0.28rem;
          font-size: 0.7rem; font-weight: 600;
          background: #F3F4F6; color: #374151;
          border: 1px solid #E5E7EB;
          border-radius: 7px; padding: 0.18rem 0.55rem;
        }
        .cht-purpose-pill {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.75rem; font-weight: 500; color: #1F2937;
          background: #F8FAFC; border: 1px solid #E2E8F0;
          padding: 0.2rem 0.6rem; border-radius: 8px;
        }
      `}</style>

      <div className="cht-wrap">
        <table className="cht-table">
          <thead>
            <tr>
              <th>Montant</th>
              <th>Motif</th>
              <th>Méthode</th>
              <th>Référence</th>
              <th>Statut</th>
              <th>Date dépôt</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => (
              <tr key={c.id}>
                <td className="cht-amount">{formatCurrency(c.amount, c.currency)}</td>
                <td>
                  <span className="cht-purpose-pill">
                    {getPurposeLabel(c.purpose)}
                  </span>
                </td>
                <td>
                  <span className="cht-method-chip">{getMethodLabel(c.method ?? '')}</span>
                </td>
                <td className="cht-muted">{c.reference ?? '—'}</td>
                <td><StatusBadge status={c.status} /></td>
                <td className="cht-muted">{formatDate(c.depositedAt || c.createdAt)}</td>
                <td className="cht-muted">{formatDate(c.validatedAt ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}