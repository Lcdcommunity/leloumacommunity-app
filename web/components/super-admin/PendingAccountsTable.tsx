//web/app/(protected)/super-admin/PendingAccountsTable.tsx
'use client';

import { Table } from '../ui/Table';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { UserSummary } from '../../types/user';
import { fullName, formatDate } from '../../lib/format';

export function PendingAccountsTable({
  items,
  onApprove,
  onReject,
  loadingId,
}: {
  items: UserSummary[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  loadingId: string | null;
}) {
  return (
    <Table columns={['Nom', 'Email', 'Statut', 'Date', 'Actions']}>
      {items.map((u) => (
        <tr key={u.id}>
          <td>{fullName(u)}</td>
          <td>{u.email}</td>
          <td><Badge tone="warning">{u.status}</Badge></td>
          <td>{formatDate(u.createdAt)}</td>
          <td>
            <div className="row-actions">
              <Button 
                onClick={() => void onApprove(u.id)} 
                disabled={loadingId === u.id}
              >
                Valider
              </Button>
              <Button 
                variant="danger" 
                onClick={() => void onReject(u.id)} 
                disabled={loadingId === u.id}
              >
                Rejeter
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </Table>
  );
}