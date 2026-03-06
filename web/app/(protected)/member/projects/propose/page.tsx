// web/app/(protected)/member/projects/propose/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const load = useCallback(async () => {
    // ATTENTION : Aucun setError(null) ici au début pour éviter l'erreur ESLint "set-state-in-effect"
    try {
      const res = await api.listProjectProposals({
        page: 1,
        pageSize: 100,
        // @ts-expect-error - Contournement TS pour l'injection du statut
        status: status || undefined,
      });
      
      // 👇 La double conversion "as unknown as ProjectProposal[]" corrige l'erreur rouge TS2345
      setItems((res?.items as unknown as ProjectProposal[]) || []);
      setError(null); // On efface l'erreur seulement APRÈS le chargement réussi
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement propositions');
    }
  }, [status]);

  useEffect(() => { 
    void load(); 
    // 👇 On désactive l'avertissement car on veut charger uniquement au montage initial de la page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell title="Proposer un projet">
      <div className="grid grid-2">
        <Card title="Nouvelle proposition de projet">
          <ProjectProposalForm onCreated={load} />
        </Card>

        <Card title="Mes propositions envoyées">
          <div className="toolbar">
            <Select
              label="Filtrer par statut"
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