// web/app/(protected)/admin/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { api } from '../../../../lib/api-client';
import type { NotificationItem } from '../../../../types/notification';
import { formatDate } from '../../../../lib/format';

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.listNotifications();
        // 👇 SÉCURITÉ 1 : On garantit qu'on stocke toujours un tableau, même si res.items n'existe pas
        setItems(res?.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur');
      }
    })();
  }, []);

  return (
    <AppShell title="Notifications">
      <Card title="Notifications de votre compte admin">
        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Message', 'Statut', 'Date']}>
          {/* 👇 SÉCURITÉ 2 : Le point d'interrogation empêche le crash si la variable n'est pas un tableau */}
          {items?.map((n) => (
            <tr key={n.id}>
              <td>{n.message}</td>
              <td>
                <Badge tone={n.isRead ? 'neutral' : 'info'}>
                  {n.isRead ? 'Lue' : 'Non lue'}
                </Badge>
              </td>
              <td>{formatDate(n.createdAt)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}