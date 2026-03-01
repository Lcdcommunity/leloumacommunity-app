//web/app/(protected)/super-admin/ProjectsTable.tsx
'use client';

import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import type { Project } from '../../types/project';
import { formatCurrency, formatDate } from '../../lib/format';

export function ProjectsTable({ items }: { items: Project[] }) {
  return (
    <Table columns={['Titre', 'Statut', 'Budget prévu', 'Budget dépensé', 'Début', 'Fin']}>
      {items.map((p) => (
        <tr key={p.id}>
          <td><strong>{p.title}</strong></td>
          <td>
            <Badge tone={p.status === 'IN_PROGRESS' ? 'info' : 'neutral'}>
              {p.status}
            </Badge>
          </td>
          <td>{formatCurrency(p.budgetPlanned)}</td>
          <td>{p.budgetSpent != null ? formatCurrency(p.budgetSpent) : '-'}</td>
          <td>{formatDate(p.startsAt)}</td>
          <td>{formatDate(p.endsAt)}</td>
        </tr>
      ))}
    </Table>
  );
}