//web/app/login/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/auth';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);

      // Si backend renvoie user, on route directement
      const role = res.user?.role;
      if (role === 'SUPER_ADMIN') router.replace('/super-admin');
      else if (role === 'ANTENNA_ADMIN') router.replace('/admin');
      else if (role === 'MEMBER') router.replace('/member');
      else router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card-wrap">
        <Card title="Connexion">
          <form onSubmit={onSubmit} className="stack-md">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error ? <p className="error-text">{error}</p> : null}

            <Button type="submit" fullWidth disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>

            <div className="auth-links">
              <a href="/forgot-password">Mot de passe oublié ?</a>
              <a href="/signup">S’enrôler (membre)</a>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}