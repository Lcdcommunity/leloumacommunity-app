//web/app/(protected)/super-admin/AdminUserForm.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
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

export function AdminUserForm({
  onSubmit,
}: {
  onSubmit: (values: AdminUserFormValues) => Promise<void>;
}) {
  const [antennas, setAntennas] = useState<Antenna[]>([]);
  const [values, setValues] = useState<AdminUserFormValues>({
    antennaId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    sendInvite: true,
  });
  const [loading, setLoading] = useState(false);
  const [loadingAntennas, setLoadingAntennas] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.listAntennas({ page: 1, pageSize: 200, isActive: true });
        setAntennas(res.items);
        if (res.items.length > 0) {
          setValues((v) => ({ ...v, antennaId: res.items[0].id }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de chargement des antennes');
      } finally {
        setLoadingAntennas(false);
      }
    })();
  }, []);

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
      {loadingAntennas ? <p>Chargement des antennes...</p> : null}

      <Select
        label="Antenne"
        value={values.antennaId}
        onChange={(e) => setValues((v) => ({ ...v, antennaId: e.target.value }))}
        options={antennas.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))}
        required
      />

      <div className="grid grid-2">
        <Input
          label="Prénom"
          value={values.firstName}
          onChange={(e) => setValues((v) => ({ ...v, firstName: e.target.value }))}
          required
        />
        <Input
          label="Nom"
          value={values.lastName}
          onChange={(e) => setValues((v) => ({ ...v, lastName: e.target.value }))}
          required
        />
      </div>

      <Input
        label="Email"
        type="email"
        value={values.email}
        onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        required
      />

      <Input
        label="Téléphone"
        value={values.phone}
        onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
      />

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={values.sendInvite}
          onChange={(e) => setValues((v) => ({ ...v, sendInvite: e.target.checked }))}
        />
        <span>Envoyer un email d’invitation / activation</span>
      </label>

      {error ? <p className="error-text">{error}</p> : null}

      <Button type="submit" disabled={loading}>
        {loading ? 'Création...' : 'Créer le compte admin'}
      </Button>
    </form>
  );
}