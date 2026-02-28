//web/app/(protected)/super-admin/admins/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { formatDate, fullName } from '../../../../lib/format';

export default function SuperAdminAdminsPage() {
  const [items, setItems] = useState<UserSummary[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAntennaAdmins({ page: 1, pageSize: 100, q });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Admins d’antenne">
      <Card
        title="Comptes admins (créés par Super Admin)"
        actions={<Link href="/super-admin/admins/new"><Button>Nouveau compte admin</Button></Link>}
      >
        <div className="toolbar">
          <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={() => void load()}>Rechercher</Button>
        </div>

        {loading ? <p>Chargement...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error ? (
          <Table columns={['Nom', 'Email', 'Rôle', 'Statut', 'Créé le']}>
            {items.map((u) => (
              <tr key={u.id}>
                <td>{fullName(u)}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>
                  <Badge tone={u.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {u.status}
                  </Badge>
                </td>
                <td>{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </Table>
        ) : null}
      </Card>
    </AppShell>
  );
}