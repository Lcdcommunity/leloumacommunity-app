// web/components/member/ProjectProposalHistoryTable.tsx
'use client';

import type { ProjectProposal } from '../../types/project-proposal';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { formatDate, formatCurrency } from '../../lib/format';

export function ProjectProposalHistoryTable({ items }: { items: ProjectProposal[] }) {
  return (
    <Table columns={['Titre', 'Budget estimatif', 'Statut', 'Créée le', 'Mise à jour']}>
      {items.map((p) => {
        // 👇 CORRECTION : On accepte les deux noms de variables selon ce qui revient du Backend
        // @ts-expect-error - Force la lecture de la variable réelle renvoyée par le backend
        const budget = p.estimatedBudget !== undefined ? p.estimatedBudget : p.expectedBudget;
        
        return (
          <tr key={p.id}>
            <td>{p.title}</td>
            <td>{budget != null ? formatCurrency(budget, 'EUR') : '—'}</td>
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
        );
      })}
    </Table>
  );
}