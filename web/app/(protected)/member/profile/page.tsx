// web/app/(protected)/member/profile/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';

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

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <div style={{
      width: 72, height: 72, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: "'Cormorant Garamond', serif",
      fontSize: '1.6rem', fontWeight: 600, letterSpacing: '0.04em',
      boxShadow: '0 4px 18px rgba(37,99,235,0.35)',
      flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  );
}

export default function MemberProfilePage() {
  const [me, setMe] = useState<FullProfileData | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [countryOfBirth, setCountryOfBirth] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const raw = await api.me();
        if (!isMounted) return;
        const user = raw as unknown as FullProfileData;
        setMe(user);
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setPhone(user.phone || '');
        setBirthDate(user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '');
        setPlaceOfBirth(user.placeOfBirth || '');
        setCountryOfBirth(user.countryOfBirth || '');
        setAddressLine1(user.addressLine1 || '');
        setAddressLine2(user.addressLine2 || '');
        setPostalCode(user.postalCode || '');
        setCity(user.city || '');
        setCountry(user.country || '');
      } catch (err) {
        if (isMounted) setMessage({ text: err instanceof Error ? err.message : 'Erreur chargement profil', ok: false });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
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
      const updated = await api.updateMyProfile(payload as unknown as Partial<UserSummary>);
      setMe(updated as unknown as FullProfileData);
      setMessage({ text: 'Profil mis \u00e0 jour avec succ\u00e8s.', ok: true });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Erreur sauvegarde profil', ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Mon profil">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .mpr-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 820px; margin: 0 auto;
        }

        /* ── Header ── */
        .mpr-header {
          display: flex; align-items: center; gap: 1.1rem;
          margin-bottom: 2rem;
          opacity: 0; transform: translateY(10px);
          animation: mprin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mpr-header-text {}
        .mpr-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.4rem; }
        .mpr-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: mprpulse 2s ease-in-out infinite; }
        @keyframes mprpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .mpr-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .mpr-subtitle { font-size: 0.75rem; color: #9CA3AF; margin-top: 0.2rem; }

        /* ── Panel ── */
        .mpr-panel {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(12px);
          border-radius: 22px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 14px rgba(37,99,235,0.06), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0; transform: translateY(12px);
          animation: mprin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }

        /* ── Section ── */
        .mpr-section {
          padding: clamp(1.1rem, 3%, 1.5rem) clamp(1.2rem, 4%, 1.75rem);
          border-bottom: 1px solid rgba(37,99,235,0.07);
        }
        .mpr-section:last-of-type { border-bottom: none; }

        .mpr-section-head {
          display: flex; align-items: center; gap: 0.6rem;
          margin-bottom: 1.1rem;
        }
        .mpr-section-ico {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .mpr-section-title {
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase; color: #374151;
        }
        .mpr-section-hint {
          font-size: 0.68rem; color: #9CA3AF; margin-left: auto;
          font-style: italic;
        }

        /* ── Grid ── */
        .mpr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
        .mpr-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.9rem; }
        @media (max-width: 640px) {
          .mpr-grid-2 { grid-template-columns: 1fr; }
          .mpr-grid-3 { grid-template-columns: 1fr; }
        }
        @media (min-width: 641px) and (max-width: 820px) {
          .mpr-grid-3 { grid-template-columns: 1fr 1fr; }
        }

        /* ── Field ── */
        .mpr-field { display: flex; flex-direction: column; gap: 0.38rem; }
        .mpr-label {
          font-size: 0.68rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase; color: #2563EB;
        }
        .mpr-label .mpr-opt { font-weight: 400; color: #94A3B8; text-transform: none; letter-spacing: 0; font-size: 0.62rem; margin-left: 0.3rem; }
        .mpr-input {
          height: 46px; border-radius: 12px;
          border: 1px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.8);
          padding: 0 1rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.86rem; color: #111827; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          width: 100%; -webkit-appearance: none;
        }
        .mpr-input:focus {
          border-color: rgba(37,99,235,0.5);
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.09);
        }
        .mpr-input:disabled {
          background: rgba(248,250,252,0.9);
          color: #9CA3AF; cursor: not-allowed;
          border-color: rgba(37,99,235,0.07);
        }
        .mpr-input::placeholder { color: rgba(107,114,128,0.4); }

        /* Email readonly pill */
        .mpr-email-wrap { position: relative; }
        .mpr-email-lock {
          position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%);
          color: #CBD5E1; pointer-events: none;
        }
        .mpr-email-input { padding-right: 2.2rem !important; }

        /* ── Footer (submit) ── */
        .mpr-footer {
          padding: clamp(1rem, 3%, 1.4rem) clamp(1.2rem, 4%, 1.75rem);
          border-top: 1px solid rgba(37,99,235,0.07);
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
        }
        .mpr-submit-btn {
          height: 50px; padding: 0 1.75rem;
          background: linear-gradient(135deg, #1D4ED8, #2563EB, #3B82F6);
          background-size: 200%; background-position: 0%;
          border: none; border-radius: 13px; color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 700; letter-spacing: 0.05em;
          cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          box-shadow: 0 4px 18px rgba(37,99,235,0.3);
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.3s;
          white-space: nowrap;
        }
        .mpr-submit-btn:hover:not(:disabled) {
          background-position: 100%;
          box-shadow: 0 8px 26px rgba(37,99,235,0.42);
          transform: translateY(-1px);
        }
        .mpr-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .mpr-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: mprspin 0.7s linear infinite;
        }
        @keyframes mprspin { to { transform: rotate(360deg); } }

        /* ── Toast message ── */
        .mpr-toast {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.65rem 1rem; border-radius: 11px;
          font-size: 0.78rem; font-weight: 600; border: 1px solid;
          animation: mprin 0.35s cubic-bezier(.22,1,.36,1);
        }
        .mpr-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .mpr-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }

        /* ── Loader ── */
        .mpr-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; }
        .mpr-loader-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: mprspin 0.8s linear infinite; }

        @keyframes mprin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="mpr-wrap">

        {/* Header with avatar */}
        <div className="mpr-header">
          {(firstName || lastName) && <Avatar firstName={firstName} lastName={lastName} />}
          <div className="mpr-header-text">
            <div className="mpr-eyebrow"><div className="mpr-eyebrow-dot" />Espace membre</div>
            <h1 className="mpr-title">
              {firstName || lastName
                ? <>{firstName} <span style={{ fontStyle: 'italic', color: '#2563EB' }}>{lastName}</span></>
                : 'Mon profil'
              }
            </h1>
            {me?.email && <p className="mpr-subtitle">{me.email}</p>}
          </div>
        </div>

        {loading ? (
          <div className="mpr-panel">
            <div className="mpr-loader"><div className="mpr-loader-ring" />Chargement du profil&#8230;</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mpr-panel">

              {/* ── Section 1 : Identit&#233; ── */}
              <div className="mpr-section">
                <div className="mpr-section-head">
                  <div className="mpr-section-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <span className="mpr-section-title">Identit&#233;</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div className="mpr-grid-2">
                    <div className="mpr-field">
                      <label className="mpr-label">Pr&#233;nom</label>
                      <input className="mpr-input" required value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Votre pr&#233;nom" />
                    </div>
                    <div className="mpr-field">
                      <label className="mpr-label">Nom</label>
                      <input className="mpr-input" required value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Votre nom" />
                    </div>
                  </div>
                  <div className="mpr-grid-2">
                    <div className="mpr-field">
                      <label className="mpr-label">Email <span className="mpr-opt">(identifiant)</span></label>
                      <div className="mpr-email-wrap">
                        <input className="mpr-input mpr-email-input" disabled value={me?.email || ''} />
                        <span className="mpr-email-lock">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="mpr-field">
                      <label className="mpr-label">T&#233;l&#233;phone <span className="mpr-opt">(optionnel)</span></label>
                      <input className="mpr-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 xx xx xx xx" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 2 : Naissance ── */}
              <div className="mpr-section">
                <div className="mpr-section-head">
                  <div className="mpr-section-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <span className="mpr-section-title">Naissance</span>
                  <span className="mpr-section-hint">Requis pour la carte membre</span>
                </div>
                <div className="mpr-grid-3">
                  <div className="mpr-field">
                    <label className="mpr-label">Date de naissance</label>
                    <input className="mpr-input" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                  </div>
                  <div className="mpr-field">
                    <label className="mpr-label">Lieu de naissance</label>
                    <input className="mpr-input" value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} placeholder="Ville" />
                  </div>
                  <div className="mpr-field">
                    <label className="mpr-label">Pays de naissance</label>
                    <input className="mpr-input" value={countryOfBirth} onChange={e => setCountryOfBirth(e.target.value)} placeholder="Pays" />
                  </div>
                </div>
              </div>

              {/* ── Section 3 : Adresse ── */}
              <div className="mpr-section">
                <div className="mpr-section-head">
                  <div className="mpr-section-ico" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <span className="mpr-section-title">Adresse de r&#233;sidence</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                  <div className="mpr-field">
                    <label className="mpr-label">Ligne 1</label>
                    <input className="mpr-input" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="N&#176; et nom de rue" />
                  </div>
                  <div className="mpr-field">
                    <label className="mpr-label">Ligne 2 <span className="mpr-opt">(optionnel)</span></label>
                    <input className="mpr-input" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Appartement, b&#226;timent&#8230;" />
                  </div>
                  <div className="mpr-grid-3">
                    <div className="mpr-field">
                      <label className="mpr-label">Code postal</label>
                      <input className="mpr-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" />
                    </div>
                    <div className="mpr-field">
                      <label className="mpr-label">Ville</label>
                      <input className="mpr-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" />
                    </div>
                    <div className="mpr-field">
                      <label className="mpr-label">Pays</label>
                      <input className="mpr-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="France" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="mpr-footer">
                <button type="submit" className="mpr-submit-btn" disabled={saving}>
                  {saving ? (
                    <><div className="mpr-spinner" />Enregistrement&#8230;</>
                  ) : (
                    <>
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      Mettre &#224; jour le profil
                    </>
                  )}
                </button>

                {message && (
                  <div className={`mpr-toast${message.ok ? ' ok' : ' err'}`}>
                    {message.ok
                      ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                    }
                    {message.text}
                  </div>
                )}
              </div>

            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}