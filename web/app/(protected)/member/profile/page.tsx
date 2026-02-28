//web/app/(protected)/member/profile/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';

export default function MemberProfilePage() {
  const [me, setMe] = useState<UserSummary | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await api.me();
        setMe(user);
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setPhone(user.phone || '');
        setAddressLine1((user as any).addressLine1 || '');
        setAddressLine2((user as any).addressLine2 || '');
        setCity((user as any).city || '');
        setCountry((user as any).country || '');
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Erreur chargement profil');
      }
    })();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateMemberProfile({
        firstName,
        lastName,
        phone,
        ...(addressLine1 ? ({ addressLine1 } as any) : {}),
        ...(addressLine2 ? ({ addressLine2 } as any) : {}),
        ...(city ? ({ city } as any) : {}),
        ...(country ? ({ country } as any) : {}),
      });
      setMe(updated);
      setMessage('Profil mis à jour avec succès.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur sauvegarde profil');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Mon profil">
      <Card title="Informations personnelles">
        <form onSubmit={handleSubmit} className="stack-md">
          <div className="grid grid-2">
            <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>

          <div className="grid grid-2">
            <Input label="Email (identifiant)" value={me?.email || ''} disabled />
            <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <Input label="Adresse (ligne 1)" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          <Input label="Adresse (ligne 2)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />

          <div className="grid grid-2">
            <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input label="Pays" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement...' : 'Mettre à jour le profil'}
          </Button>

          {message ? <p>{message}</p> : null}
        </form>
      </Card>
    </AppShell>
  );
}