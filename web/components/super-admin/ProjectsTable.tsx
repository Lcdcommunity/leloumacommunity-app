// web/components/super-admin/ProjectsTable.tsx
'use client';

import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import type { Project, ProjectStatus } from '../../types/project';
import { formatCurrency, formatDate } from '../../lib/format';

const STATUS_TONES: Record<ProjectStatus, "info" | "success" | "warning" | "danger" | "neutral"> = {
  PROPOSED: 'neutral',
  UNDER_REVIEW: 'warning',
  MEMBER_APPROVAL_PENDING: 'warning',
  APPROVED: 'info',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  ON_HOLD: 'warning',
  CANCELLED: 'danger',
  ARCHIVED: 'neutral'
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  PROPOSED: 'Brouillon',
  UNDER_REVIEW: 'En attente',
  MEMBER_APPROVAL_PENDING: 'Approbation membre requise',
  APPROVED: 'Approuvé',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  ON_HOLD: 'Suspendu',
  CANCELLED: 'Annulé',
  ARCHIVED: 'Archivé'
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
            <Badge tone={STATUS_TONES[p.status] || 'neutral'}>
              {STATUS_LABELS[p.status] || p.status}
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