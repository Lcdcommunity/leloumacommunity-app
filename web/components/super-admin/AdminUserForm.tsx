//web/components/super-admin/AdminUserForm.tsx
'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import type { Antenna } from '../../types/antenna';

export type AdminFormValues = {
  antennaId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
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
    <div style={{ flex: 1, minWidth: '220px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '.72rem',
          fontWeight: 900,
          color: '#374151',
          letterSpacing: '.07em',
          textTransform: 'uppercase',
          marginBottom: '.45rem',
        }}
      >
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
          border: `1.5px solid ${focused ? 'rgba(37,99,235,.45)' : 'rgba(37,99,235,.18)'}`,
          background: focused ? 'white' : 'rgba(255,255,255,.88)',
          padding: '0 .95rem',
          fontFamily: "'DM Sans',sans-serif",
          fontSize: '.86rem',
          fontWeight: 600,
          color: '#111827',
          outline: 'none',
          transition: 'border-color .2s, box-shadow .2s',
          boxShadow: focused ? '0 0 0 3px rgba(37,99,235,.09)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />

      {hint && (
        <p
          style={{
            marginTop: '.35rem',
            fontSize: '.71rem',
            fontWeight: 600,
            color: '#9CA3AF',
            lineHeight: 1.4,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

export function AdminUserForm({ onSubmit, busy = false }: AdminUserFormProps) {
  const [antennas, setAntennas] = useState<Antenna[]>([]);
  const [loadingAntennas, setLoadingAntennas] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [antennaId, setAntennaId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sendInvite, setSendInvite] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAntennas() {
      setLoadingAntennas(true);
      setLoadError(null);

      try {
        const res = await api.listAntennas({ pageSize: 100, isActive: true });
        if (cancelled) return;

        setAntennas(res.items);
        setAntennaId(res.items[0]?.id ?? '');
        return;
      } catch (primaryError) {
        console.warn('Chargement filtré des antennes impossible, fallback sans filtre.', primaryError);
      }

      try {
        const res = await api.listAntennas({ pageSize: 100 });
        if (cancelled) return;

        const activeItems = res.items.filter((item) => item.isActive);
        setAntennas(activeItems);
        setAntennaId(activeItems[0]?.id ?? '');
      } catch (fallbackError) {
        console.error('Erreur lors du chargement des antennes :', fallbackError);
        if (!cancelled) {
          setAntennas([]);
          setAntennaId('');
          setLoadError("Impossible de charger la liste des antennes.");
        }
      } finally {
        if (!cancelled) {
          setLoadingAntennas(false);
        }
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
      sendInvite,
    });
  };

  const submitDisabled =
    busy || loadingAntennas || antennas.length === 0 || !!loadError;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '.72rem',
            fontWeight: 900,
            color: '#374151',
            letterSpacing: '.07em',
            textTransform: 'uppercase',
            marginBottom: '.45rem',
          }}
        >
          Antenne assign&eacute;e <span style={{ color: '#DC2626' }}>*</span>
        </label>

        <div style={{ position: 'relative' }}>
          <select
            value={antennaId}
            onChange={(e) => setAntennaId(e.target.value)}
            required
            disabled={loadingAntennas || busy || antennas.length === 0}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 11,
              boxSizing: 'border-box',
              border: '1.5px solid rgba(37,99,235,.18)',
              background: 'rgba(255,255,255,.88)',
              padding: '0 2rem 0 .95rem',
              fontFamily: "'DM Sans',sans-serif",
              fontSize: '.86rem',
              fontWeight: 700,
              color: '#111827',
              outline: 'none',
              appearance: 'none',
              cursor: 'pointer',
              backgroundImage:
                `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%236B7280' stroke-width='2.5' viewBox='0 0 24 24'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right .8rem center',
            }}
          >
            <option value="" disabled>
              {loadingAntennas
                ? 'Chargement des antennes...'
                : antennas.length === 0
                  ? 'Aucune antenne disponible'
                  : 'S&eacute;lectionnez une antenne'}
            </option>

            {antennas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>
        </div>

        {loadError && (
          <p
            style={{
              marginTop: '.45rem',
              fontSize: '.74rem',
              fontWeight: 700,
              color: '#B91C1C',
            }}
          >
            {loadError}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        <Field
          label="Pr&eacute;nom"
          value={firstName}
          onChange={setFirstName}
          placeholder="Ex: Jean"
          required
        />
        <Field
          label="Nom"
          value={lastName}
          onChange={setLastName}
          placeholder="Ex: Dupont"
          required
        />
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
        <Field
          type="email"
          label="Adresse Email"
          value={email}
          onChange={setEmail}
          placeholder="jean.dupont@email.com"
          required
          hint="L'invitation sera envoy&eacute;e &agrave; cette adresse."
        />
        <Field
          type="tel"
          label="T&eacute;l&eacute;phone"
          value={phone}
          onChange={setPhone}
          placeholder="+33 6 00 00 00 00"
          hint="Optionnel"
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.1rem',
          background: 'rgba(239,246,255,.4)',
          border: '1px solid rgba(37,99,235,.15)',
          borderRadius: '12px',
          marginTop: '.5rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '.84rem',
              fontWeight: 800,
              color: '#111827',
              marginBottom: '.15rem',
            }}
          >
            Envoyer l&apos;email d&apos;invitation
          </div>
          <div
            style={{
              fontSize: '.72rem',
              fontWeight: 600,
              color: '#6B7280',
              lineHeight: 1.4,
            }}
          >
            L&apos;utilisateur recevra un lien pour d&eacute;finir son mot de passe.
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={sendInvite}
          onClick={() => setSendInvite(!sendInvite)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 99,
            border: 'none',
            cursor: 'pointer',
            background: sendInvite ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : '#D1D5DB',
            position: 'relative',
            transition: 'background .25s',
            flexShrink: 0,
            boxShadow: sendInvite ? '0 2px 8px rgba(37,99,235,.35)' : 'none',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: sendInvite ? 23 : 3,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'white',
              transition: 'left .22s cubic-bezier(.22,1,.36,1)',
              boxShadow: '0 1px 4px rgba(0,0,0,.18)',
            }}
          />
        </button>
      </div>

      <div
        style={{
          paddingTop: '1rem',
          borderTop: '1px solid rgba(37,99,235,.1)',
          marginTop: '.5rem',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="submit"
          disabled={submitDisabled}
          style={{
            height: 44,
            padding: '0 1.5rem',
            borderRadius: 12,
            background: 'linear-gradient(135deg,#1D4ED8,#2563EB)',
            border: 'none',
            color: 'white',
            cursor: submitDisabled ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans',sans-serif",
            fontSize: '.86rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '.5rem',
            boxShadow: '0 4px 14px rgba(37,99,235,.32)',
            transition: 'all .18s',
            opacity: submitDisabled ? 0.6 : 1,
          }}
        >
          {busy ? (
            <>
              <div
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(255,255,255,.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'sadnpulse 1s linear infinite',
                }}
              />
              Cr&eacute;ation&#8230;
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Cr&eacute;er le compte admin
            </>
          )}
        </button>
      </div>
    </form>
  );
}