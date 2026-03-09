// web/app/reset-password/page.tsx
'use client';

import { FormEvent, useMemo, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { http } from '../../lib/http';

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!token) {
      setMessage('Token manquant');
      return;
    }
    if (password.length < 8) {
      setMessage('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirm) {
      setMessage('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await http('/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: { token, newPassword: password },
      });
      setMessage('Mot de passe réinitialisé avec succès. Redirection...');
      setTimeout(() => router.replace('/login'), 1000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack-md">
      <Input
        label="Nouveau mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        label="Confirmer le mot de passe"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Validation...' : 'Valider'}
      </Button>
      {message ? <p className="mt-4 text-center text-sm font-medium">{message}</p> : null}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="auth-page">
      <div className="auth-card-wrap">
        <Card title="Réinitialiser le mot de passe">
          <Suspense fallback={<p className="text-center">Chargement en cours...</p>}>
            <ResetPasswordContent />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}