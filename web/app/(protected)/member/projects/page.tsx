// web/app/(protected)/member/projects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { Table } from '../../../../components/ui/Table';
import { Badge } from '../../../../components/ui/Badge';
import { api } from '../../../../lib/api-client';
import type { Project } from '../../../../types/project';
import { formatCurrency, formatDate } from '../../../../lib/format';

export default function MemberProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 1. Fonction dédiée uniquement au bouton "Filtrer"
  const handleSearch = async () => {
    setError(null);
    try {
      const res = await api.listProjectsForMembers({
        page: 1,
        pageSize: 100,
        q: q || undefined,
        status: status || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement projets');
    }
  };

  // 2. Logique de chargement initial encapsulée proprement dans le useEffect
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const res = await api.listProjectsForMembers({ page: 1, pageSize: 100 });
        if (isMounted) {
          setItems(res.items);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erreur chargement projets');
        }
      }
    }

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell title="Projets de l’association">
      <Card title="Projets (passés / en cours / futurs)">
        <div className="toolbar responsive-toolbar flex items-end gap-2">
          <Input 
            label="Rechercher" 
            placeholder="Mots-clés..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
          
          {/* 👇 CORRECTION : Ajout de la propriété "label" obligatoire */}
          <Select
            label="Statut du projet"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Tous' },
              { value: 'APPROVED', label: 'Approuvés' },
              { value: 'IN_PROGRESS', label: 'En cours' },
              { value: 'COMPLETED', label: 'Terminés' },
              { value: 'SUSPENDED', label: 'Suspendus' },
              { value: 'CANCELLED', label: 'Annulés' },
            ]}
          />
          
          <Button onClick={() => void handleSearch()}>Filtrer</Button>
          <Link href="/member/projects/propose">
            <Button className="bg-brand-blue text-white">Proposer un projet</Button>
          </Link>
        </div>

        {error ? <p className="error-text mt-4">{error}</p> : null}

        <div className="mt-4">
          <Table columns={['Titre', 'Statut', 'Budget prévu', 'Budget dépensé', 'Dates']}>
            {items.map((p) => (
              <tr key={p.id}>
                <td className="font-medium text-gray-800">{p.title}</td>
                <td><Badge tone="info">{p.status}</Badge></td>
                <td>{p.budgetPlanned != null ? formatCurrency(p.budgetPlanned) : '—'}</td>
                <td>{p.budgetSpent != null ? formatCurrency(p.budgetSpent) : '—'}</td>
                <td className="text-gray-500 text-sm">
                  {formatDate(p.startsAt)} → {formatDate(p.endsAt) || '...'}
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>
    </AppShell>
  );
}