//web/app/(protected)/super-admin/ProjectsTable.tsx
'use client';

import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import type { Project, ProjectStatus } from '../../types/project';
import { formatCurrency, formatDate } from '../../lib/format';

const STATUS_TONES: Record<ProjectStatus, "info" | "success" | "warning" | "danger" | "neutral"> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  SUSPENDED: 'warning',
  CANCELLED: 'danger'
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_APPROVAL: 'En attente',
  APPROVED: 'Approuvé',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  SUSPENDED: 'Suspendu',
  CANCELLED: 'Annulé'
};

export function ProjectsTable({ items }: { items: Project[] }) {
  return (
    <Table columns={['Titre', 'Statut', 'Budget prévu', 'Budget dépensé', 'Début', 'Fin']}>
      {items.map((p) => (
        <tr key={p.id}>
          <td>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>{p.title}</span>
              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{p.promoterName || 'Pas de promoteur'}</span>
            </div>
          </td>
          <td>
            <Badge tone={STATUS_TONES[p.status as ProjectStatus] || 'neutral'}>
              {STATUS_LABELS[p.status as ProjectStatus] || p.status}
            </Badge>
          </td>
          <td style={{ fontWeight: 600 }}>{formatCurrency(p.budgetPlanned)}</td>
          <td style={{ color: p.budgetSpent && p.budgetPlanned && p.budgetSpent > p.budgetPlanned ? '#DC2626' : 'inherit' }}>
            {p.budgetSpent != null ? formatCurrency(p.budgetSpent) : '-'}
          </td>
          <td style={{ fontSize: '0.8rem' }}>{p.startsAt ? formatDate(p.startsAt) : '-'}</td>
          <td style={{ fontSize: '0.8rem' }}>{p.endsAt ? formatDate(p.endsAt) : '-'}</td>
        </tr>
      ))}
    </Table>
  );
}