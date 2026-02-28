//web/app/(protected)/super-admin/ContributionsTable.tsx
'use client';

import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import type { Contribution } from '../../types/contribution';
import { formatCurrency, formatDate } from '../../lib/format';

export function ContributionsTable({ items }: { items: Contribution[] }) {
  return (
    <Table columns={['Membre', 'Montant', 'Méthode', 'Statut', 'Créé le', 'Validé le']}>
      {items.map((c) => (
        <tr key={c.id}>
          <td>{c.member ? `${c.member.firstName} ${c.member.lastName}` : c.memberId}</td>
          <td>{formatCurrency(c.amount, c.currency)}</td>
          <td>{c.method || '—'}</td>
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
          <td>{formatDate(c.createdAt)}</td>
          <td>{formatDate(c.validatedAt)}</td>
        </tr>
      ))}
    </Table>
  );
}