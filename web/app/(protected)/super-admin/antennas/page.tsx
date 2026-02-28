//web/app/(protected)/super-admin/antennas/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Table } from '../../../../components/ui/Table';
import { Loader } from '../../../../components/ui/Loader';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { api } from '../../../../lib/api-client';
import type { Antenna } from '../../../../types/antenna';
import { formatDate } from '../../../../lib/format';

export default function SuperAdminAntennasPage() {
  const [items, setItems] = useState<Antenna[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAntennas({ q, page: 1, pageSize: 50 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Antennes">
      <Card
        title="Gestion des antennes"
        actions={<Link href="/super-admin/antennas/new"><Button>Nouvelle antenne</Button></Link>}
      >
        <div className="toolbar">
          <Input
            placeholder="Recherche (nom, code...)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button onClick={() => void load()}>Rechercher</Button>
        </div>

        {loading ? <Loader /> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error ? (
          <Table columns={['Code', 'Nom', 'Ville', 'Pays', 'Statut', 'Créé le']}>
            {items.map((a) => (
              <tr key={a.id}>
                <td>{a.code}</td>
                <td>{a.name}</td>
                <td>{a.city || '—'}</td>
                <td>{a.country || '—'}</td>
                <td>
                  <Badge tone={a.isActive ? 'success' : 'danger'}>
                    {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </td>
                <td>{formatDate(a.createdAt)}</td>
              </tr>
            ))}
          </Table>
        ) : null}
      </Card>
    </AppShell>
  );
}