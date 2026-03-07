// web/components/member/ContributionHistoryTable.tsx
'use client';

import type { Contribution } from '../../types/contribution';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/format';

// 👇 Extension locale du type pour éliminer les erreurs TypeScript sans toucher aux types globaux
type ExtendedContribution = Contribution & {
  reference?: string | null;
  validatedAt?: string | null;
};

// 👇 Helpers de traduction et de style
function getStatusLabel(status: string) {
  if (status === 'VALIDATED') return 'Validée';
  if (status === 'PENDING' || status === 'PENDING_VALIDATION') return 'En attente';
  if (status === 'REJECTED') return 'Rejetée';
  return status;
}

function getStatusTone(status: string) {
  if (status === 'VALIDATED') return 'success';
  if (status === 'PENDING' || status === 'PENDING_VALIDATION') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
}

function getMethodLabel(method: string) {
  if (method === 'CASH') return 'Espèces';
  if (method === 'BANK_TRANSFER') return 'Virement';
  if (method === 'MOBILE_MONEY') return 'Mobile Money';
  return method;
}

// On utilise notre type étendu ici
export function ContributionHistoryTable({ items }: { items: ExtendedContribution[] }) {
  return (
    <Table columns={['Montant', 'Méthode', 'Référence', 'Statut', 'Date dépôt', 'Validation']}>
      {items.map((c) => (
        <tr key={c.id}>
          <td>{formatCurrency(c.amount, c.currency)}</td>
          <td>{getMethodLabel(c.method || '') || '—'}</td>
          <td>{c.reference || '—'}</td>
          <td>
            {/* Affichage du badge avec la couleur et la traduction */}
            <Badge tone={getStatusTone(c.status)}>
              {getStatusLabel(c.status)}
            </Badge>
          </td>
          <td>{formatDate(c.depositedAt || c.createdAt)}</td>
          {/* L'erreur "any" est corrigée grâce à notre ExtendedContribution */}
          <td>{formatDate(c.validatedAt ?? null)}</td>
        </tr>
      ))}
    </Table>
  );
}