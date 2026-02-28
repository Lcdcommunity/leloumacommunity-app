//web/app/(protected)/super-admin/AntennaForm.tsx
'use client';

import { FormEvent, useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface AntennaFormValues {
  code: string;
  name: string;
  city: string;
  country: string;
  isActive: boolean;
}

export function AntennaForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<AntennaFormValues>;
  submitLabel?: string;
  onSubmit: (values: AntennaFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<AntennaFormValues>({
    code: initialValues?.code ?? '',
    name: initialValues?.name ?? '',
    city: initialValues?.city ?? '',
    country: initialValues?.country ?? '',
    isActive: initialValues?.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handle} className="stack-md">
      <Input
        label="Code antenne"
        value={values.code}
        onChange={(e) => setValues((v) => ({ ...v, code: e.target.value.toUpperCase() }))}
        required
        placeholder="PARIS"
      />
      <Input
        label="Nom de l’antenne"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        required
        placeholder="Antenne Paris"
      />
      <div className="grid grid-2">
        <Input
          label="Ville"
          value={values.city}
          onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
        />
        <Input
          label="Pays"
          value={values.country}
          onChange={(e) => setValues((v) => ({ ...v, country: e.target.value }))}
        />
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
        />
        <span>Antenne active</span>
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <Button type="submit" disabled={loading}>
        {loading ? 'Enregistrement...' : submitLabel ?? 'Enregistrer'}
      </Button>
    </form>
  );
}