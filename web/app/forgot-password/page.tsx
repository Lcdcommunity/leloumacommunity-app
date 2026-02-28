//web/app/forgot-password/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { http } from '../../lib/http';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await http<{ message: string }, { email: string }>('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: { email },
      });
      setMessage(res.message);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card-wrap">
        <Card title="Mot de passe oublié">
          <form onSubmit={onSubmit} className="stack-md">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </Button>
            {message ? <p>{message}</p> : null}
          </form>
        </Card>
      </div>
    </div>
  );
}