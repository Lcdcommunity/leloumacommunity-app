//web/app/(protected)/member/projects/propose/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { Card } from '../../../../../components/ui/Card';
import { Select } from '../../../../../components/ui/Select';
import { Button } from '../../../../../components/ui/Button';
import { api } from '../../../../../lib/api-client';
import type { ProjectProposal } from '../../../../../types/project-proposal';
import { ProjectProposalForm } from '../../../../../components/member/ProjectProposalForm';
import { ProjectProposalHistoryTable } from '../../../../../components/member/ProjectProposalHistoryTable';

export default function MemberProjectProposalsPage() {
  const [items, setItems] = useState<ProjectProposal[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listMyProjectProposals({
        page: 1,
        pageSize: 100,
        status: status || undefined,
      });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement propositions');
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <AppShell title="Proposer un projet">
      <div className="grid grid-2">
        <Card title="Nouvelle proposition de projet">
          <ProjectProposalForm onCreated={load} />
        </Card>

        <Card title="Mes propositions envoyées">
          <div className="toolbar">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'Tous statuts' },
                { value: 'SUBMITTED', label: 'Soumise' },
                { value: 'UNDER_REVIEW', label: 'En revue' },
                { value: 'APPROVED', label: 'Approuvée' },
                { value: 'REJECTED', label: 'Rejetée' },
                { value: 'CONVERTED_TO_PROJECT', label: 'Convertie en projet' },
              ]}
            />
            <Button onClick={() => void load()}>Filtrer</Button>
          </div>

          {error ? <p className="error-text">{error}</p> : null}
          <ProjectProposalHistoryTable items={items} />
        </Card>
      </div>
    </AppShell>
  );
}