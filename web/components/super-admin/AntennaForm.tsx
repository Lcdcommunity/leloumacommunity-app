//web/app/(protected)/super-admin/AntennaForm.tsx
'use client';

import { FormEvent, useState } from 'react';

export interface AntennaFormValues {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  defaultCurrency?: string; // <-- Ajout de la devise
  admin: {
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
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
  readOnly = false, // <-- Ajout pour le mode lecture seule
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
        {label}
        {required && !readOnly && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        disabled={readOnly}
        style={{
          width: '100%',
          height: 42,
          borderRadius: 11,
          boxSizing: 'border-box',
          border: '1.5px solid rgba(37,99,235,.18)',
          background: readOnly ? 'rgba(243,244,246,.5)' : 'rgba(255,255,255,.88)',
          padding: '0 .95rem',
          fontFamily: "'DM Sans',sans-serif",
          fontSize: '.86rem',
          fontWeight: 600,
          color: readOnly ? '#6B7280' : '#111827',
          outline: 'none',
          cursor: readOnly ? 'default' : 'text',
        }}
      />
    </div>
  );
}

export function AntennaForm({
  initialValues,
  submitLabel = 'Créer l’antenne',
  onSubmit,
  busy = false,
  readOnly = false, // <-- Ajout de la prop readOnly
}: {
  initialValues?: Partial<AntennaFormValues>;
  submitLabel?: string;
  onSubmit: (values: AntennaFormValues) => Promise<void>;
  busy?: boolean;
  readOnly?: boolean;
}) {
  const [values, setValues] = useState<AntennaFormValues>({
    name: initialValues?.name ?? '',
    addressLine1: initialValues?.addressLine1 ?? '',
    addressLine2: initialValues?.addressLine2 ?? '',
    postalCode: initialValues?.postalCode ?? '',
    city: initialValues?.city ?? '',
    country: initialValues?.country ?? 'France',
    phone: initialValues?.phone ?? '',
    email: initialValues?.email ?? '',
    isActive: initialValues?.isActive ?? true,
    defaultCurrency: initialValues?.defaultCurrency ?? 'EUR', // <-- Initialisation de la devise
    admin: {
      firstName: initialValues?.admin?.firstName ?? '',
      lastName: initialValues?.admin?.lastName ?? '',
      email: initialValues?.admin?.email ?? '',
      phone: initialValues?.admin?.phone ?? '',
      associationTitle: initialValues?.admin?.associationTitle ?? '',
      addressLine1: initialValues?.admin?.addressLine1 ?? '',
      addressLine2: initialValues?.admin?.addressLine2 ?? '',
      postalCode: initialValues?.admin?.postalCode ?? '',
      city: initialValues?.admin?.city ?? '',
      country: initialValues?.admin?.country ?? 'France',
      originSubPrefecture: initialValues?.admin?.originSubPrefecture ?? '',
      sendInvite: initialValues?.admin?.sendInvite ?? true,
    },
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!readOnly) {
      await onSubmit(values);
    }
  }

  const selectStyle = {
    width: '100%',
    height: 42,
    borderRadius: 11,
    boxSizing: 'border-box' as const,
    border: '1.5px solid rgba(37,99,235,.18)',
    background: readOnly ? 'rgba(243,244,246,.5)' : 'rgba(255,255,255,.88)',
    padding: '0 .95rem',
    fontFamily: "'DM Sans',sans-serif",
    fontSize: '.86rem',
    fontWeight: 700,
    color: readOnly ? '#6B7280' : '#111827',
    outline: 'none',
    cursor: readOnly ? 'default' : 'pointer',
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ padding: '1rem 1.1rem', borderRadius: 16, border: '1px solid rgba(37,99,235,.12)', background: 'rgba(239,246,255,.35)' }}>
        <div style={{ fontSize: '.86rem', fontWeight: 900, color: '#1F2937', marginBottom: '1rem' }}>Informations de l’antenne</div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Field readOnly={readOnly} label="Nom de l'antenne" value={values.name} onChange={(v) => setValues((prev) => ({ ...prev, name: v }))} required placeholder="Ex: Antenne Paris Nord" />
          <Field readOnly={readOnly} label="Téléphone" value={values.phone ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, phone: v }))} placeholder="+33 ..." />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Email de l'antenne" type="email" value={values.email ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, email: v }))} placeholder="antenne@email.com" />
          <Field readOnly={readOnly} label="Adresse de l'antenne" value={values.addressLine1 ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, addressLine1: v }))} placeholder="Rue, avenue, quartier..." />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Complément d'adresse" value={values.addressLine2 ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, addressLine2: v }))} placeholder="Bâtiment, étage..." />
          <Field readOnly={readOnly} label="Code postal" value={values.postalCode ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, postalCode: v }))} placeholder="75000" />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Ville" value={values.city ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, city: v }))} placeholder="Paris" />
          <Field readOnly={readOnly} label="Pays" value={values.country ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, country: v }))} placeholder="France" />
        </div>

        {/* NOUVEAU : Sélection de la devise */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              {/* CORRECTION ESLINT ICI */}
              Devise de l&apos;antenne
              {!readOnly && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
            </label>
            <select
              disabled={readOnly}
              value={values.defaultCurrency ?? 'EUR'}
              onChange={(e) => setValues((prev) => ({ ...prev, defaultCurrency: e.target.value }))}
              style={selectStyle}
            >
              <option value="GNF">GNF (Franc Guinéen)</option>
              <option value="USD">DOLLAR (USD)</option>
              <option value="EUR">EURO (EUR)</option>
              <option value="XOF">XOF (Franc CFA)</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}></div>
        </div>
      </div>

      <div style={{ padding: '1rem 1.1rem', borderRadius: 16, border: '1px solid rgba(220,38,38,.12)', background: 'rgba(254,242,242,.4)' }}>
        <div style={{ fontSize: '.86rem', fontWeight: 900, color: '#1F2937', marginBottom: '1rem' }}>Admin principal de l’antenne</div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Field readOnly={readOnly} label="Prénom" value={values.admin.firstName} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, firstName: v } }))} required placeholder="Ex: Jean" />
          <Field readOnly={readOnly} label="Nom" value={values.admin.lastName} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, lastName: v } }))} required placeholder="Ex: Dupont" />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Adresse email" type="email" value={values.admin.email} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, email: v } }))} required placeholder="admin@email.com" />
          <Field readOnly={readOnly} label="Téléphone" value={values.admin.phone ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, phone: v } }))} placeholder="+33 ..." />
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
            Fonction dans l&apos;association
          </label>
          <select
            disabled={readOnly}
            value={values.admin.associationTitle ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, associationTitle: e.target.value } }))}
            style={selectStyle}
          >
            <option value="">Sélectionnez une fonction</option>
            {ASSOCIATION_TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Adresse complète" value={values.admin.addressLine1 ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, addressLine1: v } }))} placeholder="Rue, avenue..." />
          <Field readOnly={readOnly} label="Complément d'adresse" value={values.admin.addressLine2 ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, addressLine2: v } }))} placeholder="Appartement, quartier..." />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Code postal" value={values.admin.postalCode ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, postalCode: v } }))} placeholder="75000" />
          <Field readOnly={readOnly} label="Ville" value={values.admin.city ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, city: v } }))} placeholder="Paris" />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Pays" value={values.admin.country ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, country: v } }))} placeholder="France" />
          <Field readOnly={readOnly} label="Ville d'origine" value={values.admin.originSubPrefecture ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, admin: { ...prev.admin, originSubPrefecture: v } }))} placeholder="Labé, Dakar, Kindia..." />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.1rem', background: 'rgba(255,255,255,.7)', border: '1px solid rgba(37,99,235,.12)', borderRadius: '12px', marginTop: '1rem', opacity: readOnly ? 0.6 : 1 }}>
          <div>
            <div style={{ fontSize: '.84rem', fontWeight: 800, color: '#111827', marginBottom: '.15rem' }}>Envoyer l’email d’invitation</div>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: '#6B7280', lineHeight: 1.4 }}>
              L’admin recevra un mot de passe provisoire.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            disabled={readOnly}
            aria-checked={values.admin.sendInvite}
            onClick={() => setValues((prev) => ({ ...prev, admin: { ...prev.admin, sendInvite: !prev.admin.sendInvite } }))}
            style={{
              width: 44,
              height: 24,
              borderRadius: 99,
              border: 'none',
              cursor: readOnly ? 'default' : 'pointer',
              background: values.admin.sendInvite ? 'linear-gradient(135deg,#1D4ED8,#3B82F6)' : '#D1D5DB',
              position: 'relative',
              transition: 'background .25s',
              flexShrink: 0,
            }}
          >
            <span style={{ position: 'absolute', top: 3, left: values.admin.sendInvite ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left .22s cubic-bezier(.22,1,.36,1)', boxShadow: '0 1px 4px rgba(0,0,0,.18)' }} />
          </button>
        </div>
      </div>

      {!readOnly && (
        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(37,99,235,.1)', marginTop: '.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              height: 44,
              padding: '0 1.5rem',
              borderRadius: 12,
              background: 'linear-gradient(135deg,#1D4ED8,#2563EB)',
              border: 'none',
              color: 'white',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: "'DM Sans',sans-serif",
              fontSize: '.86rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
              boxShadow: '0 4px 14px rgba(37,99,235,.32)',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Mise à jour...' : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}