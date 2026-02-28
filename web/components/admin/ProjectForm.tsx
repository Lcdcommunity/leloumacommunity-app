//web/components/admin/ProjectForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';

type ProjectStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUSPENDED' | 'CANCELLED';

export interface ProjectFormValues {
  title: string;
  description: string;
  status: ProjectStatus;
  budgetPlanned: string;
  budgetSpent: string;
  startsAt: string;
  endsAt: string;
}

export function ProjectForm({
  initialValues,
  onSubmit,
  submitLabel = 'Enregistrer',
}: {
  initialValues?: Partial<ProjectFormValues>;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<ProjectFormValues>({
    title: initialValues?.title ?? '',
    description: initialValues?.description ?? '',
    status: (initialValues?.status as ProjectStatus) ?? 'DRAFT',
    budgetPlanned: initialValues?.budgetPlanned ?? '',
    budgetSpent: initialValues?.budgetSpent ?? '',
    startsAt: initialValues?.startsAt ?? '',
    endsAt: initialValues?.endsAt ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(values);
      setValues((v) => ({ ...v, title: '', description: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="stack-md">
      <Input
        label="Titre du projet"
        required
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
      />

      <Textarea
        label="Description"
        value={values.description}
        onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
      />

      <div className="grid grid-2">
        <Select
          label="Statut"
          value={values.status}
          onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as ProjectStatus }))}
          options={[
            { value: 'DRAFT', label: 'Brouillon' },
            { value: 'PENDING_APPROVAL', label: 'En attente approbation' },
            { value: 'APPROVED', label: 'Approuvé' },
            { value: 'IN_PROGRESS', label: 'En cours' },
            { value: 'COMPLETED', label: 'Terminé' },
            { value: 'SUSPENDED', label: 'Suspendu' },
            { value: 'CANCELLED', label: 'Annulé' },
          ]}
        />
        <Input
          label="Budget prévu"
          type="number"
          min="0"
          step="0.01"
          value={values.budgetPlanned}
          onChange={(e) => setValues((v) => ({ ...v, budgetPlanned: e.target.value }))}
        />
      </div>

      <div className="grid grid-2">
        <Input
          label="Budget dépensé"
          type="number"
          min="0"
          step="0.01"
          value={values.budgetSpent}
          onChange={(e) => setValues((v) => ({ ...v, budgetSpent: e.target.value }))}
        />
        <div />
      </div>

      <div className="grid grid-2">
        <Input
          label="Date de début"
          type="date"
          value={values.startsAt}
          onChange={(e) => setValues((v) => ({ ...v, startsAt: e.target.value }))}
        />
        <Input
          label="Date de fin"
          type="date"
          value={values.endsAt}
          onChange={(e) => setValues((v) => ({ ...v, endsAt: e.target.value }))}
        />
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? 'Enregistrement...' : submitLabel}
      </Button>
    </form>
  );
}