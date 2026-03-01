//web/app/(protected)/super-admin/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { api } from '../../../../lib/api-client';
import type { NotificationItem } from '../../../../types/notification';
import { formatDate } from '../../../../lib/format';

export default function SuperAdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.listNotifications();
        // Correction : S'assurer que items est toujours un tableau même si l'API renvoie null/undefined
        setItems(res?.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des notifications');
      }
    })();
  }, []);

  return (
    <AppShell title="Notifications">
      <Card title="Centre de notifications">
        {error ? <p className="text-red-500 mb-4">{error}</p> : null}
        
        <Table columns={['Message', 'Statut', 'Date']}>
          {items.length > 0 ? (
            items.map((n) => (
              <tr key={n.id} className="border-b last:border-0">
                <td className="py-3 px-4">{n.message}</td>
                <td className="py-3 px-4">
                  <Badge tone={n.isRead ? 'neutral' : 'info'}>
                    {n.isRead ? 'Lue' : 'Non lue'}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {formatDate(n.createdAt)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center py-8 text-gray-500">
                Aucune notification trouvée.
              </td>
            </tr>
          )}
        </Table>
      </Card>
    </AppShell>
  );
}