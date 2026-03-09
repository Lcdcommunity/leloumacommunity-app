// web/app/(protected)/super-admin/audit/page.tsx
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

  // 1. Fonction dédiée uniquement au bouton "Filtrer"
  const handleSearch = async () => {
    setError(null);
    try {
      const res = await api.listAudit({ action: action || undefined, page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  };

  // 2. Logique de chargement initial encapsulée proprement
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const res = await api.listAudit({ page: 1, pageSize: 100 });
        if (isMounted) {
          setItems(res.items);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur');
        }
      }
    }

    void loadInitialData();

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell title="Journal d’audit">
      <Card title="Historique des actions">
        <div className="toolbar">
          <Input placeholder="Action (ex: UPLOAD_FILE)" value={action} onChange={(e) => setAction(e.target.value)} />
          <Button onClick={() => void handleSearch()}>Filtrer</Button>
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