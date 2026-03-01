//web/app/(protected)/super-admin/AntennaForm.tsx
'use client';

import { FormEvent, useState, ChangeEvent } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface AntennaFormValues {
  code: string; name: string; city: string; country: string; isActive: boolean;
}

export function AntennaForm({ initialValues, submitLabel, onSubmit }: {
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

  async function handle(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onSubmit(values); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handle} className="stack-md">
      <Input label="Code antenne" value={values.code} onChange={(e: ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, code: e.target.value.toUpperCase() }))} required />
      <Input label="Nom" value={values.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, name: e.target.value }))} required />
      <Button type="submit" disabled={loading}>{loading ? 'Enregistrement...' : submitLabel ?? 'Enregistrer'}</Button>
    </form>
  );
}