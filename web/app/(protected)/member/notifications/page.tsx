//web/app/(protected)/member/notifications/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { NotificationItem } from '../../../../types/notification';
import { formatDate } from '../../../../lib/format';

export default function MemberNotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listMyNotifications();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement notifications');
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleMarkRead(id: string) {
    setBusyId(id);
    try {
      await api.markNotificationRead(id);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Notifications">
      <Card title="Mes notifications">
        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Message', 'Statut', 'Date', 'Action']}>
          {items.map((n) => (
            <tr key={n.id}>
              <td>{n.message}</td>
              <td>
                <Badge tone={n.isRead ? 'neutral' : 'info'}>
                  {n.isRead ? 'Lue' : 'Non lue'}
                </Badge>
              </td>
              <td>{formatDate(n.createdAt)}</td>
              <td>
                {!n.isRead ? (
                  <Button disabled={busyId === n.id} onClick={() => void handleMarkRead(n.id)}>
                    Marquer comme lue
                  </Button>
                ) : '—'}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}