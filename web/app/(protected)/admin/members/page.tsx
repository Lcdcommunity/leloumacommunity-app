//web/app/(protected)/admin/members/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { MemberActionsTable } from '../../../../components/admin/MemberActionsTable';

export default function AdminMembersPage() {
  const [items, setItems] = useState<UserSummary[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listAntennaMembers({
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

  async function withReload(fn: () => Promise<void>, id: string) {
    setBusyId(id);
    try {
      await fn();
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell title="Membres de mon antenne">
      <Card title="Gestion des membres">
        <div className="toolbar responsive-toolbar">
          <Input placeholder="Recherche (nom, email...)" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'Tous statuts' },
              { value: 'PENDING_EMAIL_VERIFICATION', label: 'Email non vérifié' },
              { value: 'PENDING_APPROVAL', label: 'En attente approbation' },
              { value: 'ACTIVE', label: 'Actif' },
              { value: 'SUSPENDED', label: 'Suspendu' },
              { value: 'REJECTED', label: 'Rejeté' },
            ]}
          />
          <Button onClick={() => void load()}>Filtrer</Button>
        </div>

        {error ? <p className="error-text">{error}</p> : null}

        <MemberActionsTable
          items={items}
          busyId={busyId}
          onSuspend={(id) => withReload(() => api.suspendUser(id).then(() => undefined), id)}
          onActivate={(id) => withReload(() => api.activateUser(id).then(() => undefined), id)}
          onDelete={async (id) => {
            const ok = window.confirm('Confirmer la suppression du membre ?');
            if (!ok) return;
            await withReload(() => api.deleteUser(id).then(() => undefined), id);
          }}
        />
      </Card>
    </AppShell>
  );
}