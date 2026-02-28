//web/app/(protected)/super-admin/members/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { fullName, formatDate } from '../../../../lib/format';

export default function SuperAdminMembersPage() {
  const [items, setItems] = useState<UserSummary[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listMembers({
        page: 1,
        pageSize: 100,
        q: q || undefined,
        status: status || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Membres (vue globale)">
      <Card title="Tous les membres">
        <div className="toolbar responsive-toolbar">
          <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Tous les statuts' },
              { value: 'PENDING_EMAIL_VERIFICATION', label: 'Email non vérifié' },
              { value: 'PENDING_APPROVAL', label: 'En attente d’approbation' },
              { value: 'ACTIVE', label: 'Actif' },
              { value: 'SUSPENDED', label: 'Suspendu' },
              { value: 'REJECTED', label: 'Rejeté' },
            ]}
          />
          <Button onClick={() => void load()}>Filtrer</Button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Nom', 'Email', 'Rôle', 'Statut', 'Créé le']}>
          {items.map((u) => (
            <tr key={u.id}>
              <td>{fullName(u)}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
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
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}