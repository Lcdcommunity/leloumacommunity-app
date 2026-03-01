//web/app/(protected)/super-admin/AdminUserForm.tsx
'use client';

import { FormEvent, useEffect, useState, ChangeEvent } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { api } from '../../lib/api-client';
import type { Antenna } from '../../types/antenna';

interface AdminUserFormValues {
  antennaId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sendInvite: boolean;
}

export function AdminUserForm({ onSubmit }: { onSubmit: (values: AdminUserFormValues) => Promise<void> }) {
  const [antennas, setAntennas] = useState<Antenna[]>([]);
  const [values, setValues] = useState<AdminUserFormValues>({
    antennaId: '', firstName: '', lastName: '', email: '', phone: '', sendInvite: true,
  });
  const [loading, setLoading] = useState(false);
  const [loadingAntennas, setLoadingAntennas] = useState(true);

  useEffect(() => {
    api.listAntennas({ page: 1, pageSize: 200, isActive: true })
      .then(res => {
        setAntennas(res.items);
        if (res.items.length > 0) setValues(v => ({ ...v, antennaId: res.items[0].id }));
      })
      .finally(() => setLoadingAntennas(false));
  }, []);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try { await onSubmit(values); } finally { setLoading(false); }
  }

  return (
    <form onSubmit={handle} className="stack-md">
      <Select
        label="Antenne"
        value={values.antennaId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setValues(v => ({ ...v, antennaId: e.target.value }))}
        options={antennas.map(a => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
        required
      />
      <div className="grid grid-2">
        <Input label="Prénom" value={values.firstName} onChange={(e: ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, firstName: e.target.value }))} required />
        <Input label="Nom" value={values.lastName} onChange={(e: ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, lastName: e.target.value }))} required />
      </div>
      <Input label="Email" type="email" value={values.email} onChange={(e: ChangeEvent<HTMLInputElement>) => setValues(v => ({ ...v, email: e.target.value }))} required />
      <Button type="submit" disabled={loading || loadingAntennas}>{loading ? 'Création...' : 'Créer le compte admin'}</Button>
    </form>
  );
}