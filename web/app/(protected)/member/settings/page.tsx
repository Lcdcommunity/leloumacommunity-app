// web/app/(protected)/member/settings/page.tsx
'use client';

import { FormEvent, useState, ChangeEvent } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client'; // 👈 Import statique propre

export default function MemberSettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [language, setLanguage] = useState('fr');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // 👇 Plus de "as any", on appelle directement la méthode correctement typée
      await api.updateMemberPreferences({
        emailNotifications,
        smsNotifications,
        pushNotifications,
        language,
        theme,
      });
      setMessage('Préférences enregistrées avec succès.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur enregistrement préférences');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Paramètres membre">
      <div className="grid grid-2">
        <Card title="Préférences de notifications">
          <form onSubmit={handleSubmit} className="stack-md">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmailNotifications(e.target.checked)}
              />
              Recevoir les notifications par email
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSmsNotifications(e.target.checked)}
              />
              Recevoir les notifications par SMS
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPushNotifications(e.target.checked)}
              />
              Recevoir les notifications push (si activées)
            </label>

            <Select
              label="Langue"
              value={language}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setLanguage(e.target.value)}
              options={[
                { value: 'fr', label: 'Français' },
                { value: 'en', label: 'English' },
              ]}
            />

            <Select
              label="Thème"
              value={theme}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              options={[
                { value: 'system', label: 'Système' },
                { value: 'light', label: 'Clair' },
                { value: 'dark', label: 'Sombre' },
              ]}
            />

            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les préférences'}
            </Button>

            {message && (
              <p className={`mt-2 text-sm font-medium ${message.includes('Erreur') ? 'text-red-600' : 'text-green-600'}`}>
                {message}
              </p>
            )}
          </form>
        </Card>

        <Card title="Rappel de statut de compte">
          <div className="stack-sm">
            <p><strong>Validation d’email :</strong> obligatoire après enrôlement.</p>
            <p><strong>Validation admin d’antenne :</strong> obligatoire avant activation complète.</p>
            <p><strong>Cotisations :</strong> validation manuelle par l’admin après confirmation de réception réelle.</p>
            <p><strong>Propositions de projets :</strong> soumises puis traitées par les responsables.</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}