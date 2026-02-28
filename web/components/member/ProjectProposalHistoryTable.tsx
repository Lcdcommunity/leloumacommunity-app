//web/components/member/ProjectProposalHistoryTable.tsx
'use client';

import type { ProjectProposal } from '../../types/project-proposal';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { formatDate, formatCurrency } from '../../lib/format';

export function ProjectProposalHistoryTable({ items }: { items: ProjectProposal[] }) {
  return (
    <Table columns={['Titre', 'Budget estimatif', 'Statut', 'Créée le', 'Mise à jour']}>
      {items.map((p) => (
        <tr key={p.id}>
          <td>{p.title}</td>
          <td>{p.expectedBudget != null ? formatCurrency(p.expectedBudget, 'EUR') : '—'}</td>
          <td>
            <Badge
              tone={
                p.status === 'APPROVED' || p.status === 'CONVERTED_TO_PROJECT'
                  ? 'success'
                  : p.status === 'REJECTED'
                  ? 'danger'
                  : 'warning'
              }
            >
              {p.status}
            </Badge>
          </td>
          <td>{formatDate(p.createdAt)}</td>
          <td>{formatDate(p.updatedAt)}</td>
        </tr>
      ))}
    </Table>
  );
}