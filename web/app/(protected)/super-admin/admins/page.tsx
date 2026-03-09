// web/app/(protected)/super-admin/admins/page.tsx
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

  // 1. Fonction dédiée uniquement au bouton "Rechercher"
  const handleSearch = async () => {
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
  };

  // 2. Logique de chargement initial encapsulée proprement
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listAntennaAdmins({ page: 1, pageSize: 100, q: '' });
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

    // Cleanup pour éviter les fuites de mémoire
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell title="Admins d’antenne">
      <Card
        title="Comptes admins (créés par Super Admin)"
        actions={<Link href="/super-admin/admins/new"><Button className="bg-brand-blue text-white">Nouveau compte admin</Button></Link>}
      >
        <div className="toolbar flex items-end gap-2 mb-4">
          <Input 
            label="Recherche"
            placeholder="Nom, email..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
          <Button onClick={() => void handleSearch()} disabled={loading}>
            Rechercher
          </Button>
        </div>

        {loading ? <p className="mt-4 text-gray-500">Chargement...</p> : null}
        {error ? <p className="error-text mt-4 text-red-600">{error}</p> : null}

        {!loading && !error ? (
          <div className="mt-4">
            <Table columns={['Nom', 'Email', 'Rôle', 'Statut', 'Créé le']}>
              {items.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-gray-800">{fullName(u)}</td>
                  <td>{u.email}</td>
                  <td><Badge tone="info">{u.role}</Badge></td>
                  <td>
                    <Badge tone={u.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="text-gray-500 text-sm">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </Table>
          </div>
        ) : null}
      </Card>
    </AppShell>
  );
}