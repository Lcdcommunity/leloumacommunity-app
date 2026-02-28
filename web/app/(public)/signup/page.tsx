//web/app/(public)/signup/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api-client';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

type PublicAntenna = {
  id: string;
  code: string;
  name: string;
  city?: string;
  country?: string;
};

export default function MemberSignupPage() {
  const [antennas, setAntennas] = useState<PublicAntenna[]>([]);
  const [loadingAntennas, setLoadingAntennas] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [antennaId, setAntennaId] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const items = await api.listPublicAntennasForSignup();
        setAntennas(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement antennes');
      } finally {
        setLoadingAntennas(false);
      }
    })();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!antennaId) {
      setError('Veuillez sélectionner une antenne.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setSubmitting(true);
    try {
      await api.memberSignup({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
        antennaId,
        city: city || undefined,
        country: country || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
      });

      setMessage(
        'Inscription enregistrée. Vérifiez votre email pour activer votre compte, puis attendez la validation de l’administrateur de votre antenne.',
      );

      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setCity('');
      setCountry('');
      setAddressLine1('');
      setAddressLine2('');
      setPassword('');
      setPasswordConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inscription');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card-wrap">
        <Card title="Enrôlement membre">
          <p style={{ marginTop: 0 }}>
            Le compte membre sera activé en 2 étapes :
            <br />1) Vérification de votre email
            <br />2) Validation par l’administrateur de votre antenne
          </p>

          <form onSubmit={handleSubmit} className="stack-md">
            <div className="grid grid-2">
              <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>

            <div className="grid grid-2">
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <Select
              label="Antenne de rattachement"
              value={antennaId}
              onChange={(e) => setAntennaId(e.target.value)}
              options={[
                { value: '', label: loadingAntennas ? 'Chargement...' : 'Sélectionnez une antenne' },
                ...antennas.map((a) => ({
                  value: a.id,
                  label: `${a.name}${a.city ? ` (${a.city})` : ''}`,
                })),
              ]}
              required
            />

            <div className="grid grid-2">
              <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input label="Pays" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>

            <Input
              label="Adresse (ligne 1)"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
            <Input
              label="Adresse (ligne 2)"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />

            <div className="grid grid-2">
              <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Input
                label="Confirmer le mot de passe"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>

            {message ? <p className="success-text">{message}</p> : null}
            {error ? <p className="error-text">{error}</p> : null}

            <Button type="submit" disabled={submitting || loadingAntennas}>
              {submitting ? 'Inscription...' : 'Créer mon compte membre'}
            </Button>
          </form>

          <p style={{ marginBottom: 0 }}>
            Vous avez déjà un compte ? <Link href="/login">Se connecter</Link>
          </p>
        </Card>
      </div>
    </main>
  );
}