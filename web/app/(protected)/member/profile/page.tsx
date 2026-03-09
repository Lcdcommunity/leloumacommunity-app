// web/app/(protected)/member/profile/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { Card } from '../../../../components/ui/Card';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';

// 👇 NOUVEAU : Création d'un type local pour inclure tous les champs sans utiliser "any"
interface FullProfileData extends UserSummary {
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  birthDate?: string | null;
  placeOfBirth?: string | null;
  countryOfBirth?: string | null;
}

export default function MemberProfilePage() {
  const [me, setMe] = useState<UserSummary | null>(null);

  // Infos de base
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  
  // 👇 NOUVEAU : Champs pour la carte membre
  const [birthDate, setBirthDate] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [countryOfBirth, setCountryOfBirth] = useState('');

  // Adresse
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const rawUser = await api.me();
        if (!isMounted) return;

        // Cast propre au lieu d'utiliser "any" partout
        const user = rawUser as unknown as FullProfileData;
        
        setMe(user);
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setPhone(user.phone || '');
        
        // Gestion propre de la date pour un input type="date"
        if (user.birthDate) {
          setBirthDate(new Date(user.birthDate).toISOString().split('T')[0]);
        } else {
          setBirthDate('');
        }
        
        setPlaceOfBirth(user.placeOfBirth || '');
        setCountryOfBirth(user.countryOfBirth || '');

        setAddressLine1(user.addressLine1 || '');
        setAddressLine2(user.addressLine2 || '');
        setPostalCode(user.postalCode || '');
        setCity(user.city || '');
        setCountry(user.country || '');
      } catch (err) {
        if (isMounted) {
          setMessage(err instanceof Error ? err.message : 'Erreur chargement profil');
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      // Construction d'un objet propre sans clés undefined implicites
      const payload: Record<string, string | undefined> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
        placeOfBirth: placeOfBirth.trim() || undefined,
        countryOfBirth: countryOfBirth.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      };

      // 👇 CORRECTION : appel de la bonne méthode "updateMyProfile" et double cast propre
      const updated = await api.updateMyProfile(payload as unknown as Partial<UserSummary>);
      
      setMe(updated);
      setMessage('Profil mis à jour avec succès.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur sauvegarde profil');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Mon profil">
      <Card title="Informations personnelles">
        <form onSubmit={handleSubmit} className="stack-md">
          
          <div className="grid grid-2">
            <Input label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>

          <div className="grid grid-2">
            <Input label="Email (identifiant)" value={me?.email || ''} disabled />
            <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {/* Section Naissance (Nécessaire pour la carte membre) */}
          <div className="pt-4 border-t border-gray-100 mt-2 mb-2">
            <h4 className="text-sm font-bold text-gray-700 mb-3">Informations de naissance (pour la carte membre)</h4>
            <div className="grid grid-3 md:grid-cols-3 gap-4">
              <Input type="date" label="Date de naissance" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              <Input label="Lieu de naissance" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
              <Input label="Pays de naissance" value={countryOfBirth} onChange={(e) => setCountryOfBirth(e.target.value)} />
            </div>
          </div>

          {/* Section Adresse */}
          <div className="pt-4 border-t border-gray-100 mt-2 mb-2">
            <h4 className="text-sm font-bold text-gray-700 mb-3">Adresse de résidence</h4>
            <Input label="Adresse (ligne 1)" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            <Input label="Adresse (ligne 2)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />

            <div className="grid grid-3 md:grid-cols-3 gap-4 mt-4">
              <Input label="Code postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
              <Input label="Pays de résidence" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement en cours...' : 'Mettre à jour le profil'}
            </Button>
          </div>

          {message && (
            <div className={`p-3 rounded-md text-sm mt-4 font-medium ${message.includes('Erreur') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}>
              {message}
            </div>
          )}
          
        </form>
      </Card>
    </AppShell>
  );
}