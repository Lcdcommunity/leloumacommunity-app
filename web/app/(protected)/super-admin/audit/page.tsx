//web/app/(protected)/super-admin/audit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { AuditItem } from '../../../../types/audit';
import { formatDate } from '../../../../lib/format';

export default function SuperAdminAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [action, setAction] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.listAudit({ action: action || undefined, page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Journal d’audit">
      <Card title="Historique des actions">
        <div className="toolbar">
          <Input placeholder="Action (ex: UPLOAD_FILE)" value={action} onChange={(e) => setAction(e.target.value)} />
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