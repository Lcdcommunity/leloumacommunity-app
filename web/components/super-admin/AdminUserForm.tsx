// web/components/super-admin/AdminUserForm.tsx
'use client';

import { type FormEvent, useEffect, useState } from 'react';
import type { Antenna } from '../../types/antenna';
import { superAdminApi } from '../../lib/super-admin-api';

export type AdminFormValues = {
  antennaId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  associationTitle?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  originSubPrefecture?: string;
  sendInvite: boolean;
};

interface AdminUserFormProps {
  onSubmit: (values: AdminFormValues) => Promise<void>;
  busy?: boolean;
}

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}

const ASSOCIATION_TITLES = [
  'Président',
  'Vice-président',
  'Secrétaire général',
  'Secrétaire adjoint',
  "Secrétaire à l'information",
  "Secrétaire à l'organisation",
  'Trésorier',
  'Trésorier adjoint',
  'Responsable jeunesse',
  'Responsable des femmes',
  'Coordinateur',
  'Conseiller',
  'Chargé de mission',
  'Commissaire aux comptes',
  'Autre',
];

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  hint,
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ width: '100%' }}>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
        {label}
        {required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%',
          height: 42,
          borderRadius: 11,
          boxSizing: 'border-box',
          border: `1.5px solid ${focused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
          background: focused ? 'white' : 'rgba(255,255,255,.88)',
          padding: '0 .95rem',
          fontFamily: "'DM Sans',sans-serif",
          fontSize: '.86rem',
          fontWeight: 600,
          color: '#111827',
          outline: 'none',
          transition: 'border-color .2s, box-shadow .2s',
          boxShadow: focused ? '0 0 0 3px rgba(220,38,38,.09)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <p style={{ marginTop: '.35rem', fontSize: '.71rem', fontWeight: 600, color: '#9CA3AF', lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}

export function AdminUserForm({ onSubmit, busy = false }: AdminUserFormProps) {
  const [antennas, setAntennas] = useState<Antenna[]>([]);
  const [loadingAntennas, setLoadingAntennas] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Focus states for selects to match red theme
  const [antennaFocused, setAntennaFocused] = useState(false);
  const [roleFocused, setRoleFocused] = useState(false);

  const [antennaId, setAntennaId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [associationTitle, setAssociationTitle] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('France');
  const [originSubPrefecture, setOriginSubPrefecture] = useState('');
  const [sendInvite, setSendInvite] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAntennas() {
      setLoadingAntennas(true);
      setLoadError(null);

      try {
        const res = await superAdminApi.listAntennas({ pageSize: 100, isActive: true });
        if (cancelled) return;
        setAntennas(res.items);
        setAntennaId(res.items[0]?.id ?? '');
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setLoadError("Impossible de charger la liste des antennes.");
          setAntennas([]);
          setAntennaId('');
        }
      } finally {
        if (!cancelled) setLoadingAntennas(false);
      }
    }

    void loadAntennas();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!antennaId) {
      alert("Veuillez sélectionner une antenne.");
      return;
    }

    await onSubmit({
      antennaId,
      firstName,
      lastName,
      email,
      phone: phone || undefined,
      associationTitle: associationTitle || undefined,
      addressLine1: addressLine1 || undefined,
      addressLine2: addressLine2 || undefined,
      postalCode: postalCode || undefined,
      city: city || undefined,
      country: country || undefined,
      originSubPrefecture: originSubPrefecture || undefined,
      sendInvite,
    });
  };

  return (
    <>
      <style>{`
        .sauf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; }
        @media (max-width: 600px) { .sauf-grid { grid-template-columns: 1fr; } }
      `}</style>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        <div className="sauf-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              Antenne assign&eacute;e <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={antennaId}
                onChange={(e) => setAntennaId(e.target.value)}
                onFocus={() => setAntennaFocused(true)}
                onBlur={() => setAntennaFocused(false)}
                required
                disabled={loadingAntennas || busy}
                style={{
                  width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box',
                  border: `1.5px solid ${antennaFocused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
                  background: antennaFocused ? 'white' : 'rgba(255,255,255,.88)',
                  padding: '0 2rem 0 .95rem', fontFamily: "'DM Sans',sans-serif",
                  fontSize: '.86rem', fontWeight: 700, color: '#111827',
                  outline: 'none', appearance: 'none', cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%236B7280' stroke-width='2.5' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right .8rem center',
                  transition: 'border-color .2s, box-shadow .2s',
                  boxShadow: antennaFocused ? '0 0 0 3px rgba(220,38,38,.09)' : 'none',
                }}
              >
                <option value="" disabled>
                  {loadingAntennas ? 'Chargement des antennes...' : 'Sélectionnez une antenne'}
                </option>
                {antennas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>
            {loadError && <p style={{ marginTop: '.45rem', fontSize: '.74rem', fontWeight: 700, color: '#B91C1C' }}>{loadError}</p>}
          </div>
        </div>

        <div className="sauf-grid">
          <Field label="Pr&eacute;nom" value={firstName} onChange={setFirstName} placeholder="Ex: Jean" required />
          <Field label="Nom" value={lastName} onChange={setLastName} placeholder="Ex: Dupont" required />
        </div>

        <div className="sauf-grid">
          <Field type="email" label="Adresse Email" value={email} onChange={setEmail} placeholder="jean.dupont@email.com" required hint="Reçoit l'invitation et le mot de passe provisoire." />
          <Field type="tel" label="T&eacute;l&eacute;phone" value={phone} onChange={setPhone} placeholder="+33 6 00 00 00 00" />
        </div>

        <div className="sauf-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              Fonction dans l&apos;association
            </label>
            <select
              value={associationTitle}
              onChange={(e) => setAssociationTitle(e.target.value)}
              onFocus={() => setRoleFocused(true)}
              onBlur={() => setRoleFocused(false)}
              style={{
                width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box',
                border: `1.5px solid ${roleFocused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
                background: roleFocused ? 'white' : 'rgba(255,255,255,.88)',
                padding: '0 .95rem', fontFamily: "'DM Sans',sans-serif",
                fontSize: '.86rem', fontWeight: 700, color: '#111827',
                outline: 'none', transition: 'border-color .2s, box-shadow .2s',
                boxShadow: roleFocused ? '0 0 0 3px rgba(220,38,38,.09)' : 'none',
              }}
            >
              <option value="">Sélectionnez une fonction</option>
              {ASSOCIATION_TITLES.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sauf-grid">
          <Field label="Adresse 1" value={addressLine1} onChange={setAddressLine1} placeholder="Ex: 12 rue de Paris" />
          <Field label="Compl&eacute;ment" value={addressLine2} onChange={setAddressLine2} placeholder="Bâtiment, étage..." />
        </div>

        <div className="sauf-grid">
          <Field label="Code postal" value={postalCode} onChange={setPostalCode} placeholder="75000" />
          <Field label="Ville" value={city} onChange={setCity} placeholder="Paris" />
        </div>

        <div className="sauf-grid">
          <Field label="Pays" value={country} onChange={setCountry} placeholder="France" />
          <Field label="Commune d'origine" value={originSubPrefecture} onChange={setOriginSubPrefecture} placeholder="Ex: Sagalé" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.1rem', background: 'rgba(254,242,242,.6)', border: '1px solid rgba(220,38,38,.15)', borderRadius: '12px', marginTop: '.5rem' }}>
          <div>
            <div style={{ fontSize: '.84rem', fontWeight: 800, color: '#111827', marginBottom: '.15rem' }}>Envoyer l&apos;email d&apos;invitation</div>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: '#6B7280', lineHeight: 1.4 }}>
              L&apos;utilisateur recevra son mot de passe provisoire et devra le modifier à la première connexion.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={sendInvite}
            onClick={() => setSendInvite(!sendInvite)}
            style={{
              width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
              background: sendInvite ? 'linear-gradient(135deg,#991B1B,#DC2626)' : '#D1D5DB',
              position: 'relative', transition: 'background .25s', flexShrink: 0,
              boxShadow: sendInvite ? '0 2px 8px rgba(220,38,38,.35)' : 'none',
            }}
          >
            <span style={{ position: 'absolute', top: 3, left: sendInvite ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left .22s cubic-bezier(.22,1,.36,1)', boxShadow: '0 1px 4px rgba(0,0,0,.18)' }} />
          </button>
        </div>

        <div style={{ paddingTop: '1.25rem', borderTop: '1px solid rgba(220,38,38,.1)', marginTop: '.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={busy || loadingAntennas}
            style={{
              height: 46, padding: '0 1.5rem', borderRadius: 12,
              background: 'linear-gradient(135deg,#991B1B,#DC2626)', border: 'none',
              color: 'white', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
              fontSize: '.86rem', fontWeight: 800, display: 'flex', alignItems: 'center',
              gap: '.5rem', boxShadow: '0 4px 14px rgba(220,38,38,.32)',
              transition: 'all .18s', opacity: (busy || loadingAntennas) ? 0.6 : 1,
            }}
          >
            {busy ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'sadnpulse 1s linear infinite' }} />
                Cr&eacute;ation&#8230;
              </>
            ) : (
              <>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Cr&eacute;er le compte admin
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}