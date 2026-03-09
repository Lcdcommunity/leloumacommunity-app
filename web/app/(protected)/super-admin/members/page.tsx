// web/app/(protected)/super-admin/members/page.tsx
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

  // 1. Fonction dédiée uniquement au bouton "Filtrer"
  const handleSearch = async () => {
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
  };

  // 2. Logique de chargement initial propre dans le useEffect
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const res = await api.listMembers({
          page: 1,
          pageSize: 100,
        });
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

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell title="Membres (vue globale)">
      <Card title="Tous les membres">
        
        {/* Ajout des classes flex pour un alignement parfait */}
        <div className="toolbar responsive-toolbar flex items-end gap-2 mb-4">
          <Input 
            label="Recherche"
            placeholder="Nom, email..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
          
          {/* 👇 CORRECTION : Ajout du label obligatoire ici */}
          <Select
            label="Filtrer par statut"
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
          <Button onClick={() => void handleSearch()}>Filtrer</Button>
        </div>

        {error ? <p className="error-text text-red-600 mb-4">{error}</p> : null}

        <div className="mt-4">
          <Table columns={['Nom', 'Email', 'Rôle', 'Statut', 'Créé le']}>
            {items.map((u) => (
              <tr key={u.id}>
                <td className="font-medium text-gray-800">{fullName(u)}</td>
                <td>{u.email}</td>
                <td><Badge tone="info">{u.role}</Badge></td>
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
                <td className="text-gray-500 text-sm">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>
    </AppShell>
  );
}