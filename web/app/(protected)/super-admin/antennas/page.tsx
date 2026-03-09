// web/app/(protected)/super-admin/antennas/page.tsx
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

  // 1. Fonction dédiée au bouton "Rechercher"
  const handleSearch = async () => {
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
  };

  // 2. Logique de chargement initial dans le useEffect
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listAntennas({ q: '', page: 1, pageSize: 50 });
        if (isMounted) {
          setItems(res.items);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell title="Antennes">
      <Card
        title="Gestion des antennes"
        actions={<Link href="/super-admin/antennas/new"><Button>Nouvelle antenne</Button></Link>}
      >
        <div className="toolbar flex items-end gap-2 mb-4">
          <Input
            label="Recherche"
            placeholder="Nom, code..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button onClick={() => void handleSearch()} disabled={loading}>
            Rechercher
          </Button>
        </div>

        {loading ? <Loader /> : null}
        {error ? <p className="error-text text-red-600 mb-4">{error}</p> : null}

        {!loading && !error ? (
          <Table columns={['Code', 'Nom', 'Ville', 'Pays', 'Statut', 'Créé le']}>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="font-mono font-medium">{a.code}</td>
                <td className="font-semibold text-gray-800">{a.name}</td>
                <td>{a.city || '—'}</td>
                <td>{a.country || '—'}</td>
                <td>
                  <Badge tone={a.isActive ? 'success' : 'danger'}>
                    {a.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </td>
                <td className="text-gray-500 text-sm">{formatDate(a.createdAt)}</td>
              </tr>
            ))}
          </Table>
        ) : null}
      </Card>
    </AppShell>
  );
}