// web/components/super-admin/AntennaForm.tsx
'use client';

import { type FormEvent, useState } from 'react';

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
  defaultCurrency?: string;
}

const COUNTRIES = [
  { name: 'Guinée', code: 'GN', currency: 'GNF' },
  { name: 'Sénégal', code: 'SN', currency: 'XOF' },
  { name: 'Côte d\'Ivoire', code: 'CI', currency: 'XOF' },
  { name: 'Mali', code: 'ML', currency: 'XOF' },
  { name: 'Burkina Faso', code: 'BF', currency: 'XOF' },
  { name: 'Togo', code: 'TG', currency: 'XOF' },
  { name: 'Bénin', code: 'BJ', currency: 'XOF' },
  { name: 'Niger', code: 'NE', currency: 'XOF' },
  { name: 'Guinée-Bissau', code: 'GW', currency: 'XOF' },
  { name: 'France', code: 'FR', currency: 'EUR' },
  { name: 'Belgique', code: 'BE', currency: 'EUR' },
  { name: 'Suisse', code: 'CH', currency: 'EUR' },
  { name: 'Allemagne', code: 'DE', currency: 'EUR' },
  { name: 'Espagne', code: 'ES', currency: 'EUR' },
  { name: 'Italie', code: 'IT', currency: 'EUR' },
  { name: 'États-Unis', code: 'US', currency: 'USD' },
  { name: 'Canada', code: 'CA', currency: 'USD' },
  { name: 'Royaume-Uni', code: 'GB', currency: 'EUR' },
  { name: 'Autre (Non listé)', code: 'OTHER', currency: 'EUR' }
].sort((a, b) => a.name.localeCompare(b.name));

function Field({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
  readOnly = false,
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
    <div style={{ flex: 1, minWidth: 'min(100%, 220px)' }}>
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
          transition: 'border-color .2s, box-shadow .2s',
        }}
        onFocus={(e) => { if (!readOnly) { e.target.style.borderColor = 'rgba(37,99,235,.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.09)'; } }}
        onBlur={(e) => { if (!readOnly) { e.target.style.borderColor = 'rgba(37,99,235,.18)'; e.target.style.boxShadow = 'none'; } }}
      />
    </div>
  );
}

export function AntennaForm({
  initialValues,
  submitLabel = 'Créer l’antenne',
  onSubmit,
  busy = false,
  readOnly = false,
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
    country: initialValues?.country ?? '',
    phone: initialValues?.phone ?? '',
    email: initialValues?.email ?? '',
    isActive: initialValues?.isActive ?? true,
    defaultCurrency: initialValues?.defaultCurrency ?? 'EUR',
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
    transition: 'border-color .2s, box-shadow .2s',
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ padding: 'clamp(1rem, 3vw, 1.5rem)', borderRadius: 16, border: '1px solid rgba(37,99,235,.12)', background: 'rgba(239,246,255,.35)' }}>
        <div style={{ fontSize: '.86rem', fontWeight: 900, color: '#1F2937', marginBottom: '1rem' }}>Informations de l&apos;antenne</div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Field readOnly={readOnly} label="Nom de l'antenne" value={values.name} onChange={(v) => setValues((prev) => ({ ...prev, name: v }))} required placeholder="Ex: Antenne Paris Nord" />
          <Field readOnly={readOnly} label="Téléphone" value={values.phone ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, phone: v }))} placeholder="+33 ..." />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Email de l'antenne" type="email" value={values.email ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, email: v }))} placeholder="antenne@email.com" />
          <Field readOnly={readOnly} label="Adresse (Siège)" value={values.addressLine1 ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, addressLine1: v }))} placeholder="Rue, avenue, quartier..." />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Complément d'adresse" value={values.addressLine2 ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, addressLine2: v }))} placeholder="Bâtiment, étage..." />
          <Field readOnly={readOnly} label="Code postal" value={values.postalCode ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, postalCode: v }))} placeholder="75000" />
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Field readOnly={readOnly} label="Ville" value={values.city ?? ''} onChange={(v) => setValues((prev) => ({ ...prev, city: v }))} placeholder="Ex: Conakry, Paris..." />

          <div style={{ flex: 1, minWidth: 'min(100%, 220px)' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              Pays de l&apos;antenne
              {!readOnly && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
            </label>
            <select
              disabled={readOnly}
              value={values.country ?? ''}
              required
              onChange={(e) => {
                const selectedCountryName = e.target.value;
                const countryData = COUNTRIES.find(c => c.name === selectedCountryName);

                setValues((prev) => ({ 
                  ...prev, 
                  country: selectedCountryName,
                  defaultCurrency: countryData ? countryData.currency : prev.defaultCurrency
                }));
              }}
              style={selectStyle}
              onFocus={(e) => { if (!readOnly) { e.target.style.borderColor = 'rgba(37,99,235,.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.09)'; } }}
              onBlur={(e) => { if (!readOnly) { e.target.style.borderColor = 'rgba(37,99,235,.18)'; e.target.style.boxShadow = 'none'; } }}
            >
              <option value="">Sélectionnez un pays</option>
              {COUNTRIES.map(c => <option key={`ant-${c.code}`} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <div style={{ flex: 1, minWidth: 'min(100%, 220px)' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
              Devise de l&apos;antenne
              {!readOnly && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
            </label>
            <select
              disabled={readOnly}
              value={values.defaultCurrency ?? 'EUR'}
              onChange={(e) => setValues((prev) => ({ ...prev, defaultCurrency: e.target.value }))}
              style={selectStyle}
              onFocus={(e) => { if (!readOnly) { e.target.style.borderColor = 'rgba(37,99,235,.45)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,.09)'; } }}
              onBlur={(e) => { if (!readOnly) { e.target.style.borderColor = 'rgba(37,99,235,.18)'; e.target.style.boxShadow = 'none'; } }}
            >
              <option value="GNF">GNF (Franc Guinéen)</option>
              <option value="XOF">XOF (Franc CFA)</option>
              <option value="USD">DOLLAR (USD)</option>
              <option value="EUR">EURO (EUR)</option>
            </select>
            <p style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: '0.3rem', fontStyle: 'italic' }}>*Ajustée automatiquement selon le pays.</p>
          </div>
          <div style={{ flex: 1, minWidth: 'min(100%, 220px)' }} />
        </div>
      </div>

      {!readOnly && (
        <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(37,99,235,.1)', marginTop: '.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              height: 46,
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
              transition: 'all .2s'
            }}
          >
            {busy ? (
              <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Création...</>
            ) : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}