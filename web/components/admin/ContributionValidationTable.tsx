//web/components/admin/ContributionValidationTable.tsx
'use client';

import type { Contribution } from '../../types/contribution';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/format';

export function ContributionValidationTable({
  items,
  busyId,
  onValidate,
  onReject,
}: {
  items: Contribution[];
  busyId?: string | null;
  onValidate: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  return (
    <Table columns={['Membre', 'Montant', 'Méthode', 'Statut', 'Date dépôt', 'Actions']}>
      {items.map((c) => (
        <tr key={c.id}>
          <td>{c.member ? `${c.member.firstName} ${c.member.lastName}` : c.memberId}</td>
          <td>{formatCurrency(c.amount, c.currency)}</td>
          <td>{c.method || '—'}</td>
          <td>
            <Badge tone={c.status === 'PENDING' ? 'warning' : c.status === 'VALIDATED' ? 'success' : 'danger'}>
              {c.status}
            </Badge>
          </td>
          <td>{formatDate(c.depositedAt || c.createdAt)}</td>
          <td>
            {c.status === 'PENDING' ? (
              <div className="row-actions">
                <Button disabled={busyId === c.id} onClick={() => void onValidate(c.id)}>
                  Valider réception
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
      ))}
    </Table>
  );
}