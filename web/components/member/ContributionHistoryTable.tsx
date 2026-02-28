//web/components/member/ContributionHistoryTable.tsx
'use client';

import type { Contribution } from '../../types/contribution';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/format';

export function ContributionHistoryTable({ items }: { items: Contribution[] }) {
  return (
    <Table columns={['Montant', 'Méthode', 'Référence', 'Statut', 'Date dépôt', 'Validation']}>
      {items.map((c) => (
        <tr key={c.id}>
          <td>{formatCurrency(c.amount, c.currency)}</td>
          <td>{c.method || '—'}</td>
          <td>{c.reference || '—'}</td>
          <td>
            <Badge
              tone={
                c.status === 'VALIDATED' ? 'success' :
                c.status === 'PENDING' ? 'warning' :
                c.status === 'REJECTED' ? 'danger' : 'neutral'
              }
            >
              {c.status}
            </Badge>
          </td>
          <td>{formatDate(c.depositedAt || c.createdAt)}</td>
          <td>{formatDate((c as any).validatedAt ?? null)}</td>
        </tr>
      ))}
    </Table>
  );
}