//web/app/(public)/verify-email/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api-client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [message, setMessage] = useState('Vérification de votre email en cours...');

  useEffect(() => {
    void (async () => {
      if (!token) {
        setSuccess(false);
        setMessage('Token de vérification manquant.');
        setLoading(false);
        return;
      }

      try {
        const res = await api.verifyEmailToken({ token });
        setSuccess(res.emailVerified);
        setMessage(
          res.emailVerified
            ? 'Email vérifié avec succès. Votre compte attend maintenant la validation de l’administrateur de votre antenne.'
            : 'La vérification n’a pas pu être finalisée.',
        );
      } catch (err) {
        setSuccess(false);
        setMessage(err instanceof Error ? err.message : 'Erreur de vérification email.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <main className="auth-page">
      <div className="auth-card-wrap">
        <Card title="Vérification de l’email">
          <p>{message}</p>

          {!loading ? (
            <div className="row-actions">
              <Link href="/login"><Button>Aller à la connexion</Button></Link>
              <Link href="/signup"><Button variant="secondary">Retour inscription</Button></Link>
            </div>
          ) : null}

          {success === true ? (
            <p className="success-text">Étape 1/2 terminée : email vérifié.</p>
          ) : null}
          {success === false ? (
            <p className="error-text">Vérification échouée ou lien expiré.</p>
          ) : null}
        </Card>
      </div>
    </main>
  );
}