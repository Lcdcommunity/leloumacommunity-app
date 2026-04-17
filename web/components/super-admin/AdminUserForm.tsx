// web/components/super-admin/AdminUserForm.tsx
'use client';

import { type FormEvent, useEffect, useState } from 'react';
import type { Antenna } from '../../types/antenna';
import { api } from '../../lib/api-client';

export type AdminFormValues = {
  antennaIds: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  associationTitle?: string;
  professionalStatus?: string;
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
  'Président', 'Vice-président', 'Secrétaire général', 'Secrétaire adjoint',
  "Secrétaire à l'information", "Secrétaire à l'organisation", 'Trésorier',
  'Trésorier adjoint', 'Responsable jeunesse', 'Responsable des femmes',
  'Coordinateur', 'Conseiller', 'Chargé de mission', 'Commissaire aux comptes', 'Autre',
];

const PROFESSIONAL_STATUSES = [
  'Employé(e)', 'Indépendant(e)', 'Ouvrier(ère)', 'Cadre',
  'Étudiant(e)', 'Retraité(e)', 'Sans emploi', 'Autre',
];

const COUNTRIES = [
  'Guinée', 'Sénégal', 'Côte d\'Ivoire', 'Mali', 'Burkina Faso', 'Togo',
  'Bénin', 'Niger', 'France', 'Belgique', 'Suisse', 'Allemagne', 'Espagne',
  'Italie', 'États-Unis', 'Canada', 'Royaume-Uni', 'Autre (Non listé)'
].sort();

function Field({ label, type = 'text', value, onChange, placeholder, required = false, hint }: FieldProps) {
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
          width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box',
          border: `1.5px solid ${focused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
          background: focused ? 'white' : 'rgba(255,255,255,.88)',
          padding: '0 .95rem', fontFamily: "'DM Sans',sans-serif",
          fontSize: '.86rem', fontWeight: 600, color: '#111827',
          outline: 'none', transition: 'border-color .2s, box-shadow .2s',
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

  const [roleFocused, setRoleFocused] = useState(false);
  const [statusFocused, setStatusFocused] = useState(false);
  const [countryFocused, setCountryFocused] = useState(false);

  // States
  const [antennaIds, setAntennaIds] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [associationTitle, setAssociationTitle] = useState('');
  const [professionalStatus, setProfessionalStatus] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('France');
  const [originSubPrefecture, setOriginSubPrefecture] = useState('');
  const [sendInvite, setSendInvite] = useState(true);

  // Computed currency constraint
  const selectedCurrency = antennaIds.length > 0 
    ? antennas.find(a => a.id === antennaIds[0])?.defaultCurrency 
    : null;

  useEffect(() => {
    let cancelled = false;
    async function loadAntennas() {
      setLoadingAntennas(true);
      setLoadError(null);
      try {
        const res = await api.listAntennas({ pageSize: 100, isActive: true });
        if (cancelled) return;
        setAntennas(res.items);
      } catch {
        if (!cancelled) setLoadError("Impossible de charger la liste des antennes.");
      } finally {
        if (!cancelled) setLoadingAntennas(false);
      }
    }
    void loadAntennas();
    return () => { cancelled = true; };
  }, []);

  const handleToggleAntenna = (id: string, currency?: string | null) => {
    if (selectedCurrency && currency !== selectedCurrency && !antennaIds.includes(id)) {
      return; // Bloqué par la devise
    }
    setAntennaIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (antennaIds.length === 0) {
      alert("Veuillez sélectionner au moins une antenne.");
      return;
    }
    await onSubmit({
      antennaIds,
      firstName, lastName, email, phone: phone || undefined,
      associationTitle: associationTitle || undefined,
      professionalStatus: professionalStatus || undefined,
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
        .sauf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; margin-bottom: 1.25rem; }
        .sauf-antennas { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: .75rem; margin-top: .5rem; }
        .sauf-card { display: flex; align-items: center; gap: .75rem; padding: .8rem 1rem; border-radius: 12px; border: 2px solid; cursor: pointer; transition: all .2s; }
        .sauf-card.active { border-color: rgba(220,38,38,.6); background: rgba(254,242,242,.6); box-shadow: 0 4px 12px rgba(220,38,38,.08); }
        .sauf-card.idle { border-color: rgba(229,231,235,1); background: white; }
        .sauf-card.disabled { border-color: rgba(229,231,235,.5); background: rgba(243,244,246,.5); opacity: 0.5; cursor: not-allowed; }
        .sauf-card:hover:not(.disabled):not(.active) { border-color: rgba(220,38,38,.3); transform: translateY(-1px); }
        .sauf-chk { width: 18px; height: 18px; border-radius: 6px; border: 2px solid; display: flex; align-items: center; justify-content: center; transition: all .2s; flex-shrink: 0; }
        .active .sauf-chk { background: #DC2626; border-color: #DC2626; color: white; }
        .idle .sauf-chk { border-color: #D1D5DB; }
        @media (max-width: 600px) { .sauf-grid { grid-template-columns: 1fr; } .sauf-antennas { grid-template-columns: 1fr; } }
      `}</style>

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column' }}>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>
            <span>Antennes assign&eacute;es <span style={{ color: '#DC2626' }}>*</span></span>
            {selectedCurrency && (
              <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '2px 8px', borderRadius: 6, border: '1px solid #FECACA', fontSize: '.6rem' }}>
                Filtre Devise: {selectedCurrency}
              </span>
            )}
          </label>
          <p style={{ fontSize: '.75rem', color: '#6B7280', marginBottom: '1rem', lineHeight: 1.4 }}>
            Un administrateur ne peut gérer que des antennes partageant la <strong>même devise</strong> pour des raisons comptables.
          </p>

          {loadingAntennas ? (
            <div style={{ fontSize: '.8rem', color: '#6B7280', fontWeight: 600 }}>Chargement des antennes...</div>
          ) : loadError ? (
            <div style={{ color: '#DC2626', fontSize: '.8rem', fontWeight: 700 }}>{loadError}</div>
          ) : (
            <div className="sauf-antennas">
              {antennas.map(a => {
                const isSelected = antennaIds.includes(a.id);
                const isBlocked = selectedCurrency && a.defaultCurrency !== selectedCurrency && !isSelected;
                const cardClass = isSelected ? 'active' : isBlocked ? 'disabled' : 'idle';

                return (
                  <div key={a.id} className={`sauf-card ${cardClass}`} onClick={() => handleToggleAntenna(a.id, a.defaultCurrency)}>
                    <div className="sauf-chk">
                      {isSelected && <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '.84rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                      <div style={{ fontSize: '.7rem', fontWeight: 600, color: isBlocked ? '#DC2626' : '#6B7280' }}>Devise : {a.defaultCurrency}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="sauf-grid">
          <Field label="Pr&eacute;nom" value={firstName} onChange={setFirstName} placeholder="Ex: Jean" required />
          <Field label="Nom" value={lastName} onChange={setLastName} placeholder="Ex: Dupont" required />
        </div>

        <div className="sauf-grid">
          <Field type="email" label="Adresse Email" value={email} onChange={setEmail} placeholder="jean.dupont@email.com" required hint="Reçoit l'invitation et le mot de passe." />
          <Field type="tel" label="T&eacute;l&eacute;phone" value={phone} onChange={setPhone} placeholder="+33 6 00 00 00 00" />
        </div>

        <div className="sauf-grid">
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>Poste dans l&apos;asso</label>
            <select
              value={associationTitle} onChange={(e) => setAssociationTitle(e.target.value)} onFocus={() => setRoleFocused(true)} onBlur={() => setRoleFocused(false)}
              style={{
                width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box', border: `1.5px solid ${roleFocused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
                background: roleFocused ? 'white' : 'rgba(255,255,255,.88)', padding: '0 .95rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.86rem', fontWeight: 700, color: '#111827', outline: 'none', transition: 'border-color .2s, box-shadow .2s', boxShadow: roleFocused ? '0 0 0 3px rgba(220,38,38,.09)' : 'none',
              }}
            >
              <option value="">Sélectionnez un poste</option>
              {ASSOCIATION_TITLES.map((title) => <option key={title} value={title}>{title}</option>)}
            </select>
          </div>
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>Statut Professionnel</label>
            <select
              value={professionalStatus} onChange={(e) => setProfessionalStatus(e.target.value)} onFocus={() => setStatusFocused(true)} onBlur={() => setStatusFocused(false)}
              style={{
                width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box', border: `1.5px solid ${statusFocused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
                background: statusFocused ? 'white' : 'rgba(255,255,255,.88)', padding: '0 .95rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.86rem', fontWeight: 700, color: '#111827', outline: 'none', transition: 'border-color .2s, box-shadow .2s', boxShadow: statusFocused ? '0 0 0 3px rgba(220,38,38,.09)' : 'none',
              }}
            >
              <option value="">Sélectionnez un statut</option>
              {PROFESSIONAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 900, color: '#374151', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '.45rem' }}>Pays de résidence</label>
            <select
              value={country} onChange={(e) => setCountry(e.target.value)} onFocus={() => setCountryFocused(true)} onBlur={() => setCountryFocused(false)}
              style={{
                width: '100%', height: 42, borderRadius: 11, boxSizing: 'border-box', border: `1.5px solid ${countryFocused ? 'rgba(220,38,38,.45)' : 'rgba(220,38,38,.18)'}`,
                background: countryFocused ? 'white' : 'rgba(255,255,255,.88)', padding: '0 .95rem', fontFamily: "'DM Sans',sans-serif", fontSize: '.86rem', fontWeight: 700, color: '#111827', outline: 'none', transition: 'border-color .2s, box-shadow .2s', boxShadow: countryFocused ? '0 0 0 3px rgba(220,38,38,.09)' : 'none',
              }}
            >
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Field label="Commune d'origine" value={originSubPrefecture} onChange={setOriginSubPrefecture} placeholder="Ex: Sagalé" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.1rem', background: 'rgba(254,242,242,.6)', border: '1px solid rgba(220,38,38,.15)', borderRadius: '12px', marginTop: '.5rem' }}>
          <div>
            <div style={{ fontSize: '.84rem', fontWeight: 800, color: '#111827', marginBottom: '.15rem' }}>Envoyer l&apos;email d&apos;invitation</div>
            <div style={{ fontSize: '.72rem', fontWeight: 600, color: '#6B7280', lineHeight: 1.4 }}>
              L&apos;utilisateur recevra son mot de passe provisoire à modifier à la connexion.
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

        <div style={{ paddingTop: '1.25rem', borderTop: '1px solid rgba(220,38,38,.1)', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
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
              <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Création...</>
            ) : (
              <><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Créer le compte admin</>
            )}
          </button>
        </div>
      </form>
    </>
  );
}