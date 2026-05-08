// web/components/admin/ContributionValidationTable.tsx
'use client';

import type { Contribution } from '../../types/contribution';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/format';

// ── Helper: Mois concerné ────────────────────────────────────────────────────
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

type ExtendedContribution = Omit<Contribution, 'status'> & {
  status: string;
  memberName?: string;
  monthReference?: number | null;
  yearReference?: number | null;
};

function formatMonthRef(c: ExtendedContribution): string | null {
  const m = c.monthReference;
  const y = c.yearReference;
  if (!m || !y) return null;
  return `${MONTHS_FR[(m - 1) % 12]} ${y}`;
}

function MonthCell({ contribution }: { contribution: ExtendedContribution }) {
  const label = formatMonthRef(contribution);
  if (!label) return <span style={{ color: '#CBD5E1', fontSize: '0.72rem' }}>—</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
      background: '#EFF6FF', color: '#1D4ED8',
      fontSize: '0.7rem', fontWeight: 800,
      padding: '0.2rem 0.55rem', borderRadius: 99,
      border: '1px solid #BFDBFE', whiteSpace: 'nowrap',
    }}>
      <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      {label}
    </span>
  );
}

// ── Existing helpers (unchanged) ─────────────────────────────────────────────

function getStatusLabel(status: string) {
  if (status === 'VALIDATED') return 'Validée';
  if (status === 'PENDING_VALIDATION' || status === 'PENDING') return 'En attente';
  if (status === 'REJECTED') return 'Rejetée';
  return status;
}

function getStatusTone(status: string) {
  if (status === 'VALIDATED') return 'success';
  if (status === 'PENDING_VALIDATION' || status === 'PENDING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
}

function getMethodLabel(method: string) {
  if (method === 'CASH') return 'Espèces';
  if (method === 'BANK_TRANSFER') return 'Virement';
  if (method === 'MOBILE_MONEY') return 'Mobile Money';
  if (method === 'CARD') return 'Carte';
  return method;
}

export function ContributionValidationTable({
  items,
  busyId,
  onValidate,
  onReject,
  onEdit,
  isHistoryView = false,
}: {
  items: ExtendedContribution[];
  busyId?: string | null;
  onValidate: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, currentAmount: number) => Promise<void>;
  isHistoryView?: boolean;
}) {
  return (
    <Table columns={['Membre', 'Montant', 'Méthode', 'Mois concerné', 'Statut', 'Date dépôt', 'Actions']}>
      {items.map((c) => {
        const isPending = c.status === 'PENDING_VALIDATION' || c.status === 'PENDING';

        return (
          <tr key={c.id}>
            <td className="font-medium text-gray-900">{c.memberName || 'Inconnu'}</td>
            <td>{formatCurrency(c.amount, c.currency)}</td>
            <td>{getMethodLabel(c.paymentMethod || '') || '—'}</td>
            <td><MonthCell contribution={c} /></td>
            <td>
              <Badge tone={getStatusTone(c.status)}>
                {getStatusLabel(c.status)}
              </Badge>
            </td>
            <td>{formatDate(c.contributionDate || c.createdAt)}</td>
            <td>
              {isHistoryView ? (
                <div className="row-actions flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => void onEdit(c.id, Number(c.amount))}
                    className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                    title="Corriger le montant"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                    </svg>
                  </button>
                </div>
              ) : isPending ? (
                <div className="row-actions flex gap-2">
                  <Button disabled={busyId === c.id} onClick={() => void onValidate(c.id)}>
                    Valider
                  </Button>
                  <Button disabled={busyId === c.id} onClick={() => void onEdit(c.id, Number(c.amount))}>
                    Modifier
                  </Button>
                  <Button disabled={busyId === c.id} variant="danger" onClick={() => void onReject(c.id)}>
                    Rejeter
                  </Button>
                </div>
              ) : (
                '—'
              )}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}