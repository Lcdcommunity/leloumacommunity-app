// web/components/admin/ContributionValidationTable.tsx
'use client';

import type { Contribution } from '../../types/contribution';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/format';

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
  return method;
}

type ExtendedContribution = Omit<Contribution, 'status'> & {
  status: string;
  memberName?: string; 
};

export function ContributionValidationTable({
  items,
  busyId,
  onValidate,
  onReject,
  onEdit,
  isHistoryView = false, // 👇 NOUVELLE OPTION POUR LA PAGE HISTORIQUE
}: {
  items: ExtendedContribution[];
  busyId?: string | null;
  onValidate: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onEdit: (id: string, currentAmount: number) => Promise<void>;
  isHistoryView?: boolean; // 👇 TYPAGE DE L'OPTION
}) {
  return (
    <Table columns={['Membre', 'Montant', 'Méthode', 'Statut', 'Date dépôt', 'Actions']}>
      {items.map((c) => {
        const isPending = c.status === 'PENDING_VALIDATION' || c.status === 'PENDING';

        return (
          <tr key={c.id}>
            <td className="font-medium text-gray-900">{c.memberName || 'Inconnu'}</td>
            <td>{formatCurrency(c.amount, c.currency)}</td>
            <td>{getMethodLabel(c.method || '') || '—'}</td>
            <td>
              <Badge tone={getStatusTone(c.status)}>
                {getStatusLabel(c.status)}
              </Badge>
            </td>
            <td>{formatDate(c.depositedAt || c.createdAt)}</td>
            <td>
              {/* 👇 CONDITION D'AFFICHAGE ADAPTÉE */}
              {isHistoryView ? (
                <div className="row-actions flex gap-2">
                  {/* Icône moderne "Modifier" toujours visible dans l'historique */}
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