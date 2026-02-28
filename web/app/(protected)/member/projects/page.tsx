//web/app/(protected)/member/projects/page.tsx
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

  async function load() {
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
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Projets de l’association">
      <Card title="Projets (passés / en cours / futurs)">
        <div className="toolbar responsive-toolbar">
          <Input placeholder="Recherche..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
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
          <Button onClick={() => void load()}>Filtrer</Button>
          <Link href="/member/projects/propose"><Button>Proposer un projet</Button></Link>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <Table columns={['Titre', 'Statut', 'Budget prévu', 'Budget dépensé', 'Dates']}>
          {items.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td><Badge tone="info">{p.status}</Badge></td>
              <td>{p.budgetPlanned != null ? formatCurrency(p.budgetPlanned) : '—'}</td>
              <td>{p.budgetSpent != null ? formatCurrency(p.budgetSpent) : '—'}</td>
              <td>{formatDate(p.startsAt)} → {formatDate(p.endsAt)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </AppShell>
  );
}