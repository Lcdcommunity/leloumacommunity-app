//web/app/(protected)/super-admin/settings/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { Association } from '../../../../types/association';

export default function SuperAdminSettingsPage() {
  const [association, setAssociation] = useState<Association | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const a = await api.getAssociation();
        setAssociation(a);
        setName(a.name);
        setCode(a.code);
        setIsActive(a.isActive);
      } catch (err) {
        setMsg(err instanceof Error ? err.message : 'Erreur');
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.updateAssociation({ name, code, isActive });
      setMsg('Paramètres enregistrés.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    }
  }

  return (
    <AppShell title="Paramètres Super Admin">
      <div className="grid grid-2">
        <Card title="Association (globale)">
          <form onSubmit={onSubmit} className="stack-md">
            <Input label="Nom de l’association" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input label="Code association" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
            <label className="checkbox-row">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              <span>Association active</span>
            </label>
            <Button type="submit">Enregistrer</Button>
            {msg ? <p>{msg}</p> : null}
          </form>
        </Card>

        <Card title="Informations techniques">
          <div className="stack-sm">
            <p><strong>ID association:</strong> {association?.id ?? '—'}</p>
            <p><strong>Créé le:</strong> {association?.createdAt ?? '—'}</p>
            <p><strong>Mis à jour:</strong> {association?.updatedAt ?? '—'}</p>
            <p>
              <strong>Règle métier:</strong> Seul le Super Admin crée les comptes admins et les antennes.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}