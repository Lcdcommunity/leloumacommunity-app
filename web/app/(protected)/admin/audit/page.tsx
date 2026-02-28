//web/app/(protected)/admin/audit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { api } from '../../../../lib/api-client';
import type { AuditItem } from '../../../../types/audit';
import { formatDate } from '../../../../lib/format';

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [action, setAction] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listAudit({ page: 1, pageSize: 100, action: action || undefined });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Journal d’audit">
      <Card title="Actions (périmètre antenne / compte)">
        <div className="toolbar">
          <Input
            placeholder="Filtrer par action (ex: VALIDATE_CONTRIBUTION)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <Button onClick={() => void load()}>Filtrer</Button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Action', 'Cible', 'Résumé', 'Date']}>
          {items.map((a) => (
            <tr key={a.id}>
              <td>{a.action}</td>
              <td>{[a.targetModel, a.targetId].filter(Boolean).join(' / ') || '—'}</td>
              <td>{a.summary || '—'}</td>
              <td>{formatDate(a.createdAt)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}