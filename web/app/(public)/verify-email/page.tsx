// web/app/(public)/verify-email/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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

  // Utilisation de useCallback pour stabiliser la fonction et éviter l'erreur de dépendance
  const verify = useCallback(async () => {
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
          : 'La vérification n’a pas pu être finalisée.'
      );
    } catch (err) {
      setSuccess(false);
      setMessage(err instanceof Error ? err.message : 'Erreur de vérification email.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void verify();
  }, [verify]);

  return (
    <main className="auth-page">
      <div className="auth-card-wrap">
        <Card title="Vérification de l’email">
          <p className="mb-4">{message}</p>

          {!loading && (
            <div className="flex gap-4 mt-6">
              <Link href="/login">
                <Button>Aller à la connexion</Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary">Retour inscription</Button>
              </Link>
            </div>
          )}

          {success === true && (
            <p className="mt-4 text-green-600 font-medium">Étape 1/2 terminée : email vérifié.</p>
          )}
          {success === false && (
            <p className="mt-4 text-red-600 font-medium">Vérification échouée ou lien expiré.</p>
          )}
        </Card>
      </div>
    </main>
  );
}