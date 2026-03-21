// web/app/(protected)/admin/profile/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type FullUserProfile } from '../../../../lib/api-client';

// On étend le profil de base pour inclure les champs spécifiques à l'admin d'antenne
// afin que TypeScript soit content et qu'on évite le type "any".
type ExtendedAdminProfile = FullUserProfile & {
  associationTitle?: string | null;
  adminAssignments?: Array<{
    antenna?: {
      name?: string | null;
      code?: string | null;
      city?: string | null;
      country?: string | null;
      defaultCurrency?: string | null;
    } | null;
  }> | null;
};

export default function AdminProfilePage() {
  const [me, setMe] = useState<ExtendedAdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Form fields (Admin) ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [associationTitle, setAssociationTitle] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [originSubPrefecture, setOriginSubPrefecture] = useState('');

  // ── Info Antenne (Lecture seule) ──
  const [antennaName, setAntennaName] = useState('');
  const [antennaCode, setAntennaCode] = useState('');
  const [antennaCity, setAntennaCity] = useState('');
  const [antennaCountry, setAntennaCountry] = useState('');
  const [antennaCurrency, setAntennaCurrency] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const user = await api.getMyProfile() as ExtendedAdminProfile;
        setMe(user);
        populateFields(user);
      } catch (err) {
        setMessage({ text: err instanceof Error ? err.message : 'Erreur de chargement', ok: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function populateFields(user: ExtendedAdminProfile | null) {
    if (!user) return;
    
    // Infos perso
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhone(user.phone || '');
    setAddressLine1(user.addressLine1 || '');
    setAddressLine2(user.addressLine2 || '');
    setPostalCode(user.postalCode || '');
    setCity(user.city || '');
    setCountry(user.country || '');
    setOriginSubPrefecture(user.originSubPrefecture || '');
    setAssociationTitle(user.associationTitle || user.function || '');

    // Infos de l'antenne gérée
    const ant = user.adminAssignments?.[0]?.antenna || user.antenna;
    if (ant) {
      setAntennaName(ant.name || '');
      setAntennaCode(ant.code || '');
      setAntennaCity(ant.city || '');
      setAntennaCountry(ant.country || '');
      setAntennaCurrency(ant.defaultCurrency || '');
    }
  }

  function handleCancel() {
    populateFields(me);
    setIsEditing(false);
    setMessage(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      // Typage strict pour éviter l'erreur eslint `any`
      const payload: Record<string, string | undefined> = {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        originSubPrefecture: originSubPrefecture.trim() || undefined,
      };

      const updated = await api.updateMyProfile(payload) as ExtendedAdminProfile;
      setMe(updated);
      populateFields(updated);
      setIsEditing(false);
      setMessage({ text: 'Profil mis à jour avec succès.', ok: true });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Erreur de sauvegarde', ok: false });
    } finally {
      setSaving(false);
    }
  }

  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

  if (loading) {
    return (
      <AppShell title="Mon profil admin">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#6B7280', fontFamily: "'DM Sans', sans-serif" }}>
          Chargement du profil...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mon profil admin">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@500&display=swap');

        .aprf-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 900px; 
          margin: 0 auto;
        }

        /* ── Header ── */
        .aprf-header { margin-bottom: 1.75rem; opacity: 0; transform: translateY(10px); animation: aprfin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .aprf-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .aprf-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: aprfpulse 2s ease-in-out infinite; }
        @keyframes aprfpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .aprf-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .aprf-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* ── Hero / Avatar ── */
        .aprf-hero {
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
          background: rgba(253,253,255,0.93); backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          padding: 1.5rem; margin-bottom: 1.5rem;
          opacity: 0; transform: translateY(10px); animation: aprfin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }
        .aprf-avatar {
          width: 72px; height: 72px; border-radius: 18px;
          background: linear-gradient(135deg, #1E3A8A, #3B82F6);
          display: flex; align-items: center; justify-content: center;
          color: white; font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 700;
          box-shadow: 0 4px 14px rgba(37,99,235,0.28); flex-shrink: 0;
        }
        .aprf-hero-info { flex: 1; min-width: 0; }
        .aprf-hero-name { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; color: #0F172A; margin-bottom: 0.2rem; }
        .aprf-hero-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .aprf-role-tag { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.65rem; font-weight: 800; background: #EFF6FF; color: #1D4ED8; padding: 0.25rem 0.65rem; border-radius: 99px; border: 1px solid #BFDBFE; letter-spacing: 0.04em; text-transform: uppercase; }

        /* ── Panel Form ── */
        .aprf-panel {
          background: rgba(253,253,255,0.93); backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(10px); animation: aprfin 0.5s 0.15s cubic-bezier(.22,1,.36,1) forwards;
        }

        .aprf-section { padding: 1.5rem; border-bottom: 1px solid rgba(37,99,235,0.06); }
        .aprf-section:last-child { border-bottom: none; }
        
        .aprf-section-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.2rem; }
        .aprf-section-ico { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .aprf-section-title { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }

        .aprf-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        @media (max-width: 640px) { .aprf-grid-2 { grid-template-columns: 1fr; } }

        .aprf-field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
        .aprf-field.no-margin { margin-bottom: 0; }
        .aprf-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #4B5563; display: flex; justify-content: space-between; }
        .aprf-label .opt { font-weight: 500; color: #9CA3AF; text-transform: none; letter-spacing: 0; font-size: 0.65rem; margin-left: 0.3rem; }
        
        .aprf-input {
          width: 100%; min-height: 46px; padding: 0 1rem;
          border-radius: 10px; border: 1px solid rgba(37,99,235,0.15); background: rgba(255,255,255,0.85);
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #111827; font-weight: 500;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .aprf-input.mono { font-family: 'DM Mono', monospace; font-size: 0.9rem; font-weight: 600; letter-spacing: 0.05em; }
        .aprf-input:focus { border-color: rgba(37,99,235,0.5); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: white; }
        
        /* Style des champs verrouillés */
        .aprf-input:disabled { 
          background: #F8FAFC; 
          color: #64748B; 
          cursor: not-allowed; 
          border-color: rgba(37,99,235,0.05); 
          font-weight: 600; 
        }

        /* ── Footer Actions ── */
        .aprf-footer { padding: 1.2rem 1.5rem; border-top: 1px solid rgba(37,99,235,0.07); display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; background: rgba(248,250,252,0.4); }
        
        .aprf-btn-primary {
          height: 46px; padding: 0 1.5rem;
          background: linear-gradient(135deg,#1D4ED8,#2563EB); border: none; border-radius: 10px; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.02em;
          cursor: pointer; display: flex; align-items: center; gap: 0.45rem; box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          transition: transform 0.15s, box-shadow 0.2s; white-space: nowrap;
        }
        .aprf-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.38); }
        .aprf-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .aprf-btn-secondary {
          height: 46px; padding: 0 1.25rem;
          background: white; border: 1px solid rgba(37,99,235,0.2); border-radius: 10px; color: #1D4ED8;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 0.45rem;
          transition: background 0.15s; white-space: nowrap;
        }
        .aprf-btn-secondary:hover:not(:disabled) { background: #EFF6FF; }

        .aprf-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: aprfspin 0.7s linear infinite; }
        @keyframes aprfspin { to { transform: rotate(360deg); } }

        .aprf-toast { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.8rem; font-weight: 700; border: 1px solid; animation: aprfin 0.3s cubic-bezier(.22,1,.36,1); width: 100%; }
        .aprf-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .aprf-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }

        @keyframes aprfin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="aprf-wrap">
        {/* Header */}
        <div className="aprf-header">
          <div className="aprf-eyebrow"><div className="aprf-eyebrow-dot" />Admin antenne</div>
          <h1 className="aprf-title">Mon profil <span>admin</span></h1>
        </div>

        {/* Hero Card */}
        <div className="aprf-hero">
          <div className="aprf-avatar">{initials || '?'}</div>
          <div className="aprf-hero-info">
            <h2 className="aprf-hero-name">{firstName || lastName ? `${firstName} ${lastName}` : 'Administrateur'}</h2>
            <div className="aprf-hero-meta">
              <span className="aprf-role-tag">
                <div style={{ width: 5, height: 5, background: '#3B82F6', borderRadius: '50%' }} />
                Administrateur
              </span>
              <span className="aprf-role-tag" style={{ background: '#F3F4F6', color: '#4B5563', borderColor: '#D1D5DB' }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Antenne : {antennaName || 'Non assignée'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="aprf-panel">
            
            {/* ── Section Identité ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <span className="aprf-section-title">Identité & Contact</span>
              </div>
              
              <div className="aprf-grid-2">
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Prénom</label>
                  <input className="aprf-input" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={!isEditing} required />
                </div>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Nom</label>
                  <input className="aprf-input" value={lastName} onChange={e => setLastName(e.target.value)} disabled={!isEditing} required />
                </div>
              </div>

              <div className="aprf-grid-2" style={{ marginTop: '1rem' }}>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Email <span className="opt">(Non modifiable)</span></label>
                  <input className="aprf-input" value={me?.email || ''} disabled />
                </div>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Téléphone</label>
                  <input className="aprf-input" value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} placeholder="+33 6 ..." />
                </div>
              </div>

              <div className="aprf-field" style={{ marginTop: '1rem', marginBottom: 0 }}>
                <label className="aprf-label">Titre dans l&apos;association <span className="opt">(Géré par le Super Admin)</span></label>
                <input className="aprf-input" value={associationTitle || 'Non défini'} disabled />
              </div>
            </div>

            {/* ── Section Localisation ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#F0FDFA', color: '#0D9488' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                </div>
                <span className="aprf-section-title">Adresse de résidence</span>
              </div>

              <div className="aprf-grid-2">
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Adresse 1</label>
                  <input className="aprf-input" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} disabled={!isEditing} placeholder="N° et nom de rue" />
                </div>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Adresse 2 <span className="opt">(Optionnel)</span></label>
                  <input className="aprf-input" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} disabled={!isEditing} placeholder="Appartement, bâtiment..." />
                </div>
              </div>

              <div className="aprf-grid-2" style={{ marginTop: '1rem' }}>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Code Postal</label>
                  <input className="aprf-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} disabled={!isEditing} placeholder="Ex: 75001" />
                </div>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Ville</label>
                  <input className="aprf-input" value={city} onChange={e => setCity(e.target.value)} disabled={!isEditing} placeholder="Ex: Paris" />
                </div>
              </div>

              <div className="aprf-field" style={{ marginTop: '1rem', marginBottom: 0 }}>
                <label className="aprf-label">Pays</label>
                <input className="aprf-input" value={country} onChange={e => setCountry(e.target.value)} disabled={!isEditing} placeholder="Ex: France" />
              </div>
            </div>

            {/* ── Section Origine ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#FFFBEB', color: '#D97706' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="aprf-section-title">Origine communautaire</span>
              </div>

              <div className="aprf-field no-margin">
                <label className="aprf-label">Commune d&apos;origine</label>
                <input className="aprf-input" value={originSubPrefecture} onChange={e => setOriginSubPrefecture(e.target.value)} disabled={!isEditing} placeholder="Ex: Lélouma Centre" />
              </div>
            </div>

            {/* ── Section Antenne (Super Admin) ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="aprf-section-title">Informations de l&apos;antenne</span>
              </div>

              <div className="aprf-grid-2">
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Nom de l&apos;antenne <span className="opt">(Lecture seule)</span></label>
                  <input className="aprf-input" value={antennaName || '—'} disabled />
                </div>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Code identifiant <span className="opt">(Lecture seule)</span></label>
                  <input className="aprf-input mono" value={antennaCode || '—'} disabled />
                </div>
              </div>

              <div className="aprf-grid-2" style={{ marginTop: '1rem' }}>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Ville / Pays <span className="opt">(Lecture seule)</span></label>
                  <input className="aprf-input" value={`${antennaCity || '—'}, ${antennaCountry || '—'}`} disabled />
                </div>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Devise par défaut <span className="opt">(Lecture seule)</span></label>
                  <input className="aprf-input mono" value={antennaCurrency || '—'} disabled />
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="aprf-footer">
              {!isEditing ? (
                <button type="button" className="aprf-btn-primary" onClick={() => setIsEditing(true)}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Modifier mes informations
                </button>
              ) : (
                <>
                  <button type="button" className="aprf-btn-secondary" onClick={handleCancel} disabled={saving}>
                    Annuler
                  </button>
                  <button type="submit" className="aprf-btn-primary" disabled={saving}>
                    {saving ? <><div className="aprf-spinner" />Enregistrement...</> : <>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                      Enregistrer les modifications
                    </>}
                  </button>
                </>
              )}

              {message && (
                <div className={`aprf-toast${message.ok ? ' ok' : ' err'}`}>
                  {message.ok
                    ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                  }
                  {message.text}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}