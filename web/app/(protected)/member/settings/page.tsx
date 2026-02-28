//web/app/(protected)/member/settings/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Select } from '../../../../components/ui/Select';
import { Button } from '../../../../components/ui/Button';

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
      // lazy import pour garder la page autonome
      const { api } = await import('../../../../lib/api-client');
      await api.updateMemberPreferences({
        emailNotifications,
        smsNotifications,
        pushNotifications,
        language,
        theme,
      });
      setMessage('Préférences enregistrées.');
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
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              Recevoir les notifications par email
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={smsNotifications}
                onChange={(e) => setSmsNotifications(e.target.checked)}
              />
              Recevoir les notifications par SMS
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
              />
              Recevoir les notifications push (si activées)
            </label>

            <Select
              label="Langue"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              options={[
                { value: 'fr', label: 'Français' },
                { value: 'en', label: 'English' },
              ]}
            />

            <Select
              label="Thème"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              options={[
                { value: 'system', label: 'Système' },
                { value: 'light', label: 'Clair' },
                { value: 'dark', label: 'Sombre' },
              ]}
            />

            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer les préférences'}
            </Button>

            {message ? <p>{message}</p> : null}
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