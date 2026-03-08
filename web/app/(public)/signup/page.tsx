// web/app/(public)/signup/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api-client';

type PublicAntenna = {
  id: string;
  code: string;
  name: string;
  city?: string;
  country?: string;
};

const STEPS = ['Identité', 'Contact', 'Sécurité'];

export default function MemberSignupPage() {
  const [antennas, setAntennas] = useState<PublicAntenna[]>([]);
  const [loadingAntennas, setLoadingAntennas] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [antennaId, setAntennaId] = useState('');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
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

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!firstName.trim()) return 'Le prénom est requis.';
      if (!lastName.trim()) return 'Le nom est requis.';
      if (!antennaId) return 'Veuillez sélectionner une antenne.';
    }
    if (s === 1) {
      if (!email.trim()) return "L'email est requis.";
      if (!/\S+@\S+\.\S+/.test(email)) return "Format d'email invalide.";
    }
    if (s === 2) {
      if (!password) return 'Le mot de passe est requis.';
      if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
      if (password !== passwordConfirm) return 'Les mots de passe ne correspondent pas.';
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setError(null);
    setStep(s => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateStep(2);
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      await api.memberSignup({
        firstName, lastName, email,
        phone: phone || undefined,
        password, antennaId,
        city: city || undefined,
        country: country || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inscription');
    } finally {
      setSubmitting(false);
    }
  }

  const pwdStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort'][pwdStrength];
  const strengthColor = ['', '#E05050', '#E09030', '#4A9E6A', '#1E7A4E'][pwdStrength];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --blue: #2563EB;
          --blue-light: #3B82F6;
          --blue-pale: #DBEAFE;
          --blue-faint: #EFF6FF;
          --bg: #EEF2F8;
          --surface: rgba(253,253,255,0.88);
          --text: #111827;
          --text-2: #374151;
          --mist: #6B7280;
          --border: rgba(37,99,235,0.15);
          --success: #15803D;
          --error-c: #B91C1C;
        }

        .sp-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100svh;
          background: linear-gradient(150deg, #E8EEF8 0%, #F0F4FC 40%, #E4ECF7 100%);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 2rem 1.25rem 3rem;
        }

        /* Orbs */
        .sp-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
        }
        .sp-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 70%);
          top: -150px; right: -100px;
          animation: oa 16s ease-in-out infinite alternate;
        }
        .sp-orb-2 {
          width: 360px; height: 360px;
          background: radial-gradient(circle, rgba(100,180,255,0.10) 0%, transparent 70%);
          bottom: -80px; left: -80px;
          animation: ob 20s ease-in-out infinite alternate;
        }
        @keyframes oa { from { transform: translate(0,0); } to { transform: translate(-40px, 40px); } }
        @keyframes ob { from { transform: translate(0,0); } to { transform: translate(30px, -30px); } }

        /* Grid */
        .sp-grid {
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
        }

        /* Card */
        .sp-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 560px;
          background: var(--surface);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(37,99,235,0.13);
          border-radius: 28px;
          padding: clamp(1.75rem, 5vw, 2.75rem);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.85) inset,
            0 24px 64px rgba(37,99,235,0.10),
            0 4px 16px rgba(37,99,235,0.06);
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1);
          margin-top: 0.5rem;
        }
        .sp-card.visible { opacity: 1; transform: translateY(0); }

        /* Header */
        .sp-header {
          text-align: center;
          margin-bottom: 1.75rem;
        }
        .sp-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--blue-faint);
          border: 1px solid var(--blue-pale);
          border-radius: 99px;
          padding: 0.3rem 0.85rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--blue);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.9rem;
        }
        .sp-badge-dot {
          width: 6px; height: 6px;
          background: var(--blue-light);
          border-radius: 50%;
          animation: blink 2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

        .sp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.7rem, 4.5vw, 2.1rem);
          font-weight: 500;
          color: var(--text);
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .sp-title span {
          background: linear-gradient(135deg, var(--blue), var(--blue-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .sp-subtitle {
          font-size: 0.8rem;
          color: var(--mist);
          margin-top: 0.45rem;
          line-height: 1.6;
        }

        /* Stepper */
        .sp-stepper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 2rem;
        }
        .sp-step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          position: relative;
          flex: 1;
        }
        .sp-step-item:not(:last-child)::after {
          content: '';
          position: absolute;
          top: 15px; left: calc(50% + 16px);
          width: calc(100% - 32px); height: 1px;
          background: rgba(37,99,235,0.15);
          transition: background 0.4s;
        }
        .sp-step-item.done:not(:last-child)::after {
          background: var(--blue-light);
        }
        .sp-step-circle {
          width: 30px; height: 30px;
          border-radius: 50%;
          border: 2px solid rgba(37,99,235,0.2);
          background: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--mist);
          transition: all 0.3s cubic-bezier(.22,1,.36,1);
          position: relative; z-index: 1;
        }
        .sp-step-item.active .sp-step-circle {
          border-color: var(--blue);
          background: var(--blue);
          color: white;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.12);
        }
        .sp-step-item.done .sp-step-circle {
          border-color: var(--blue-light);
          background: var(--blue-faint);
          color: var(--blue);
        }
        .sp-step-label {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--mist);
          transition: color 0.3s;
        }
        .sp-step-item.active .sp-step-label { color: var(--blue); }
        .sp-step-item.done .sp-step-label { color: var(--blue-light); }

        /* Section title */
        .sp-section-title {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .sp-section-title::after {
          content: '';
          flex: 1; height: 1px;
          background: linear-gradient(90deg, var(--blue-pale), transparent);
        }

        /* Grid layouts */
        .sp-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }
        .sp-stack { display: flex; flex-direction: column; gap: 0.85rem; }

        /* Field */
        .sp-field { display: flex; flex-direction: column; gap: 0.38rem; }
        .sp-label {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: var(--blue);
        }
        .sp-label .sp-optional {
          font-weight: 400;
          color: var(--mist);
          text-transform: none;
          letter-spacing: 0;
          font-size: 0.68rem;
          margin-left: 0.3rem;
        }

        .sp-input-wrap { position: relative; }

        .sp-input, .sp-select {
          width: 100%;
          height: 48px;
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(37,99,235,0.15);
          border-radius: 13px;
          padding: 0 1rem;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.22s, background 0.22s, box-shadow 0.22s;
          -webkit-appearance: none;
          appearance: none;
        }
        .sp-input::placeholder { color: rgba(107,114,128,0.45); }
        .sp-input:focus, .sp-select:focus {
          border-color: rgba(37,99,235,0.55);
          background: rgba(255,255,255,0.98);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.09);
        }
        .sp-input.has-icon { padding-right: 2.8rem; }

        .sp-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%232563EB' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }

        .sp-eye-btn {
          position: absolute;
          right: 0.85rem; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: var(--mist); cursor: pointer;
          padding: 4px;
          display: flex; align-items: center;
          transition: color 0.2s;
        }
        .sp-eye-btn:hover { color: var(--blue); }

        /* Password strength */
        .sp-pwd-strength {
          display: flex;
          gap: 3px;
          margin-top: 0.4rem;
          align-items: center;
        }
        .sp-pwd-bar {
          flex: 1; height: 3px;
          border-radius: 99px;
          background: rgba(37,99,235,0.1);
          transition: background 0.3s;
          overflow: hidden;
        }
        .sp-pwd-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.4s, background 0.4s;
        }
        .sp-pwd-label {
          font-size: 0.68rem;
          font-weight: 600;
          margin-left: 0.4rem;
          transition: color 0.3s;
          min-width: 32px;
        }

        /* Notice */
        .sp-notice {
          background: var(--blue-faint);
          border: 1px solid var(--blue-pale);
          border-radius: 12px;
          padding: 0.85rem 1rem;
          font-size: 0.78rem;
          color: #1E40AF;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          display: flex;
          gap: 0.6rem;
          align-items: flex-start;
        }

        /* Error / Success */
        .sp-error {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.8rem 1rem;
          background: rgba(185,28,28,0.06);
          border: 1px solid rgba(185,28,28,0.18);
          border-radius: 12px;
          color: var(--error-c);
          font-size: 0.8rem;
          line-height: 1.45;
        }

        .sp-success {
          text-align: center;
          padding: 1rem 0 0.5rem;
        }
        .sp-success-icon {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #DCFCE7, #BBF7D0);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem;
          box-shadow: 0 0 0 8px rgba(21,128,61,0.08);
          animation: popin 0.5s cubic-bezier(.22,1,.36,1);
        }
        @keyframes popin {
          from { opacity:0; transform: scale(0.5); }
          to   { opacity:1; transform: scale(1); }
        }
        .sp-success-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.5rem; font-weight: 500;
          color: var(--text); margin-bottom: 0.6rem;
        }
        .sp-success-text { font-size: 0.83rem; color: var(--mist); line-height: 1.65; }

        /* Nav buttons */
        .sp-nav {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .sp-btn-back {
          flex: 0 0 auto;
          height: 50px;
          padding: 0 1.2rem;
          background: transparent;
          border: 1px solid rgba(37,99,235,0.22);
          border-radius: 13px;
          color: var(--blue);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.86rem;
          font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; gap: 0.4rem;
          transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }
        .sp-btn-back:hover {
          background: var(--blue-faint);
          border-color: rgba(37,99,235,0.4);
          transform: translateY(-1px);
        }

        .sp-btn-next, .sp-btn-submit {
          flex: 1;
          height: 50px;
          background: linear-gradient(135deg, #1D4ED8 0%, var(--blue) 50%, var(--blue-light) 100%);
          background-size: 200% 100%;
          background-position: 0% 0%;
          border: none;
          border-radius: 13px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.45rem;
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.3s;
          box-shadow: 0 4px 18px rgba(37,99,235,0.28);
        }
        .sp-btn-next:hover:not(:disabled), .sp-btn-submit:hover:not(:disabled) {
          background-position: 100% 0%;
          box-shadow: 0 8px 26px rgba(37,99,235,0.4);
          transform: translateY(-1px);
        }
        .sp-btn-next:disabled, .sp-btn-submit:disabled {
          opacity: 0.6; cursor: not-allowed;
        }

        .sp-spinner {
          width: 17px; height: 17px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Footer link */
        .sp-footer {
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(37,99,235,0.09);
          text-align: center;
          font-size: 0.8rem;
          color: var(--mist);
        }
        .sp-footer a {
          color: var(--blue);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .sp-footer a:hover { color: var(--blue-light); }

        /* Step panels */
        .sp-panel {
          animation: fadeup 0.35s cubic-bezier(.22,1,.36,1);
        }
        @keyframes fadeup {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 520px) {
          .sp-grid-2 { grid-template-columns: 1fr; }
          .sp-root { padding: 1.25rem 0.85rem 2.5rem; }
          .sp-card { border-radius: 22px; }
        }
      `}</style>

      <div className="sp-root">
        <div className="sp-grid" />
        <div className="sp-orb sp-orb-1" />
        <div className="sp-orb sp-orb-2" />

        <div className={`sp-card ${mounted ? 'visible' : ''}`}>

          {/* Header */}
          <div className="sp-header">
            <div className="sp-badge">
              <div className="sp-badge-dot" />
              Nouveau membre
            </div>
            <h1 className="sp-title">
              Rejoindre <span>Lélouma</span>
            </h1>
            <p className="sp-subtitle">
              Créez votre compte en 3 étapes · Validation par votre antenne
            </p>
          </div>

          {/* Stepper */}
          {!success && (
            <div className="sp-stepper">
              {STEPS.map((label, i) => (
                <div
                  key={label}
                  className={`sp-step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                >
                  <div className="sp-step-circle">
                    {i < step ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (i + 1)}
                  </div>
                  <span className="sp-step-label">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Success ── */}
          {success ? (
            <div className="sp-success sp-panel">
              <div className="sp-success-icon">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#15803D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="sp-success-title">Inscription enregistrée !</p>
              <p className="sp-success-text">
                Vérifiez votre email pour activer votre compte,<br/>
                puis attendez la validation par l&apos;administrateur<br/>de votre antenne.
              </p>
              <div style={{marginTop:'1.5rem'}}>
                <Link href="/login" style={{
                  display:'inline-flex', alignItems:'center', gap:'0.4rem',
                  color:'var(--blue)', fontWeight:600, fontSize:'0.85rem',
                  textDecoration:'none'
                }}>
                  Se connecter
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* ── STEP 0 : Identité ── */}
              {step === 0 && (
                <div className="sp-panel sp-stack">
                  <div className="sp-notice">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0,marginTop:'1px'}}>
                      <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                    </svg>
                    Le compte sera activé après vérification email et validation par l&apos;administrateur de votre antenne.
                  </div>

                  <p className="sp-section-title">Informations personnelles</p>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Prénom</label>
                      <input className="sp-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Mamadou" required />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Nom</label>
                      <input className="sp-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Diallo" required />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">Antenne de rattachement</label>
                    <select
                      className="sp-select"
                      value={antennaId}
                      onChange={e => setAntennaId(e.target.value)}
                      required
                    >
                      <option value="">{loadingAntennas ? 'Chargement...' : 'Sélectionnez une antenne'}</option>
                      {antennas.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name}{a.city ? ` (${a.city})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── STEP 1 : Contact ── */}
              {step === 1 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">Coordonnées</p>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Email</label>
                      <input className="sp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Téléphone <span className="sp-optional">(optionnel)</span></label>
                      <input className="sp-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 …" />
                    </div>
                  </div>

                  <p className="sp-section-title" style={{marginTop:'0.5rem'}}>Adresse</p>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Ville <span className="sp-optional">(optionnel)</span></label>
                      <input className="sp-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Pays <span className="sp-optional">(optionnel)</span></label>
                      <input className="sp-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="France" />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">Adresse ligne 1 <span className="sp-optional">(optionnel)</span></label>
                    <input className="sp-input" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="12 rue de la Paix" />
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Adresse ligne 2 <span className="sp-optional">(optionnel)</span></label>
                    <input className="sp-input" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Apt 3B" />
                  </div>
                </div>
              )}

              {/* ── STEP 2 : Sécurité ── */}
              {step === 2 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">Mot de passe</p>

                  <div className="sp-field">
                    <label className="sp-label">Mot de passe</label>
                    <div className="sp-input-wrap">
                      <input
                        className="sp-input has-icon"
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="8 caractères minimum"
                        required
                      />
                      <button type="button" className="sp-eye-btn" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                        {showPwd
                          ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                          : <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        }
                      </button>
                    </div>
                    {/* Strength indicator */}
                    {password && (
                      <div className="sp-pwd-strength">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="sp-pwd-bar">
                            <div className="sp-pwd-bar-fill" style={{
                              width: pwdStrength >= i ? '100%' : '0%',
                              background: strengthColor
                            }}/>
                          </div>
                        ))}
                        <span className="sp-pwd-label" style={{color: strengthColor}}>{strengthLabel}</span>
                      </div>
                    )}
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">Confirmer le mot de passe</label>
                    <div className="sp-input-wrap">
                      <input
                        className="sp-input has-icon"
                        type={showPwd2 ? 'text' : 'password'}
                        value={passwordConfirm}
                        onChange={e => setPasswordConfirm(e.target.value)}
                        placeholder="Répétez le mot de passe"
                        required
                      />
                      <button type="button" className="sp-eye-btn" onClick={() => setShowPwd2(v => !v)} tabIndex={-1}>
                        {showPwd2
                          ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                          : <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        }
                      </button>
                    </div>
                    {/* Match indicator */}
                    {passwordConfirm && (
                      <p style={{fontSize:'0.7rem', marginTop:'0.3rem', color: password === passwordConfirm ? '#15803D' : '#B91C1C', fontWeight:600}}>
                        {password === passwordConfirm ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="sp-error" style={{marginTop:'1rem'}}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="sp-nav">
                {step > 0 && (
                  <button type="button" className="sp-btn-back" onClick={prevStep}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                    </svg>
                    Retour
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button type="button" className="sp-btn-next" onClick={nextStep}>
                    Continuer
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </button>
                ) : (
                  <button type="submit" className="sp-btn-submit" disabled={submitting || loadingAntennas}>
                    {submitting ? (
                      <><div className="sp-spinner"/>Inscription…</>
                    ) : (
                      <>
                        Créer mon compte
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Footer */}
          {!success && (
            <div className="sp-footer">
              Déjà membre ? <Link href="/login">Se connecter</Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
}