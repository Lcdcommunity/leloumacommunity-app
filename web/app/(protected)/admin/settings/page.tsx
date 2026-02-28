//web/app/(protected)/admin/settings/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';

export default function AdminSettingsPage() {
  const [me, setMe] = useState<UserSummary | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await api.me();
        setMe(user);
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setPhone(user.phone || '');
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Erreur');
      }
    })();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const updated = await api.updateMyProfile({ firstName, lastName, phone });
      setMe(updated);
      setMessage('Profil mis à jour.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    }
  }

  return (
    <AppShell title="Paramètres / Profil">
      <div className="grid grid-2">
        <Card title="Mon profil (Admin d’antenne)">
          <form onSubmit={handleSubmit} className="stack-md">
            <div className="grid grid-2">
              <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <Input label="Email" value={me?.email || ''} disabled />
            <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button type="submit">Enregistrer</Button>
            {message ? <p>{message}</p> : null}
          </form>
        </Card>

        <Card title="Règles de gestion (rappel)">
          <div className="stack-sm">
            <p><strong>Création des admins :</strong> réservée au Super Admin.</p>
            <p><strong>Création des antennes :</strong> réservée au Super Admin.</p>
            <p><strong>Validation des membres :</strong> limitée à votre antenne.</p>
            <p><strong>Validation des cotisations :</strong> confirmation d’une réception réelle (hors application).</p>
            <p><strong>Périmètre :</strong> vous gérez uniquement les membres, projets, documents et contenus de votre antenne.</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}