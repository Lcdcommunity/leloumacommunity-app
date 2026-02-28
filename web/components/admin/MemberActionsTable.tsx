//web/components/admin/MemberActionsTable.tsx
'use client';

import type { UserSummary } from '../../types/user';
import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { fullName, formatDate } from '../../lib/format';

export function MemberActionsTable({
  items,
  busyId,
  onSuspend,
  onActivate,
  onDelete,
}: {
  items: UserSummary[];
  busyId?: string | null;
  onSuspend: (id: string) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <Table columns={['Nom', 'Email', 'Statut', 'Créé le', 'Actions']}>
      {items.map((u) => (
        <tr key={u.id}>
          <td>{fullName(u)}</td>
          <td>{u.email}</td>
          <td>
            <Badge
              tone={
                u.status === 'ACTIVE'
                  ? 'success'
                  : u.status === 'PENDING_APPROVAL'
                  ? 'warning'
                  : u.status === 'SUSPENDED' || u.status === 'REJECTED'
                  ? 'danger'
                  : 'neutral'
              }
            >
              {u.status}
            </Badge>
          </td>
          <td>{formatDate(u.createdAt)}</td>
          <td>
            <div className="row-actions">
              {u.status === 'ACTIVE' ? (
                <Button disabled={busyId === u.id} variant="secondary" onClick={() => void onSuspend(u.id)}>
                  Suspendre
                </Button>
              ) : (
                <Button disabled={busyId === u.id} onClick={() => void onActivate(u.id)}>
                  Réactiver
                </Button>
              )}

              <Button
                disabled={busyId === u.id}
                variant="danger"
                onClick={() => void onDelete(u.id)}
              >
                Supprimer
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}