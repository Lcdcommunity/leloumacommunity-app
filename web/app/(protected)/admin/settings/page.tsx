//web/app/(protected)/admin/settings/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';

const RULES = [
  {
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
      </svg>
    ),
    title: 'Admins & Antennes',
    desc: 'La création d\'antennes et l\'ajout de nouveaux administrateurs sont strictement réservés au Super Admin.',
    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
  },
  {
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    title: 'Validation des membres',
    desc: 'Vous ne pouvez valider que les membres rattachés spécifiquement à votre antenne.',
    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
  },
  {
    icon: (
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    title: 'Cotisations',
    desc: 'Ne validez les cotisations qu\'après confirmation d\'une réception réelle sur les comptes.',
    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
  }
];

export default function AdminSettingsPage() {
  const [me, setMe] = useState<UserSummary | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const user = await api.me();
        setMe(user ?? null);
        setFirstName(user?.firstName || '');
        setLastName(user?.lastName || '');
        setPhone(user?.phone || '');
      } catch (err) {
        setMessage({ text: err instanceof Error ? err.message : 'Erreur', ok: false });
      }
    })();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateMyProfile({ firstName, lastName, phone });
      setMe(updated);
      setMessage({ text: 'Profil mis à jour avec succès.', ok: true });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Erreur de sauvegarde', ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Paramètres admin">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ms-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1000px; margin: 0 auto;
        }

        /* Header */
        .ms-header { margin-bottom: 1.75rem; opacity: 0; transform: translateY(10px); animation: msin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .ms-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .ms-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: mspulse 2s ease-in-out infinite; }
        @keyframes mspulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .ms-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .ms-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Layout */
        .ms-layout { display: grid; grid-template-columns: 1fr 400px; gap: 1.5rem; align-items: start; }
        @media (max-width: 900px) { .ms-layout { grid-template-columns: 1fr; } }

        /* Panel */
        .ms-panel {
          background: rgba(253,253,255,0.93); backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09); box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
        }
        .ms-panel-left { opacity: 0; transform: translateY(10px); animation: msin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards; }
        .ms-panel-right { opacity: 0; transform: translateY(10px); animation: msin 0.5s 0.17s cubic-bezier(.22,1,.36,1) forwards; }

        .ms-panel-head { padding: 1rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,0.07); display: flex; align-items: center; gap: 0.55rem; }
        .ms-panel-ico { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ms-panel-title { font-size: 0.73rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }

        /* Section inside panel */
        .ms-section { padding: 1.25rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.06); }
        .ms-section:last-child { border-bottom: none; }
        .ms-section-label { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin-bottom: 1rem; }

        /* Field */
        .ms-field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
        .ms-field:last-child { margin-bottom: 0; }
        .ms-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #4B5563; }
        .ms-input {
          width: 100%; height: 44px; padding: 0 1rem;
          border-radius: 10px; border: 1px solid rgba(37,99,235,0.15); background: rgba(255,255,255,0.85);
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #111827; font-weight: 500;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ms-input:focus { border-color: rgba(37,99,235,0.5); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: white; }
        .ms-input:disabled { background: #F3F4F6; color: #9CA3AF; cursor: not-allowed; }

        /* Submit footer */
        .ms-footer { padding: 1.2rem 1.4rem; border-top: 1px solid rgba(37,99,235,0.07); display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; background: rgba(248,250,252,0.4); }
        .ms-submit {
          height: 44px; padding: 0 1.5rem;
          background: linear-gradient(135deg,#1D4ED8,#2563EB); border: none; border-radius: 10px; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.05em;
          cursor: pointer; display: flex; align-items: center; gap: 0.45rem; box-shadow: 0 4px 14px rgba(37,99,235,0.28);
          transition: transform 0.15s, box-shadow 0.2s; white-space: nowrap;
        }
        .ms-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.38); }
        .ms-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .ms-spinner { width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: msspin 0.7s linear infinite; }
        @keyframes msspin { to { transform: rotate(360deg); } }

        .ms-toast { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.78rem; font-weight: 700; border: 1px solid; animation: msin 0.3s cubic-bezier(.22,1,.36,1); }
        .ms-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .ms-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }

        /* Status steps */
        .ms-steps { display: flex; flex-direction: column; }
        .ms-step { display: flex; gap: 0.85rem; padding: 1.1rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.05); transition: background 0.15s; }
        .ms-step:last-child { border-bottom: none; }
        .ms-step:hover { background: rgba(37,99,235,0.02); }
        .ms-step-ico { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid; }
        .ms-step-title { font-size: 0.84rem; font-weight: 800; color: #111827; margin-bottom: 2px; }
        .ms-step-desc { font-size: 0.74rem; color: #6B7280; line-height: 1.55; }

        @keyframes msin { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="ms-wrap">
        {/* Header */}
        <div className="ms-header">
          <div className="ms-eyebrow"><div className="ms-eyebrow-dot" />Admin antenne</div>
          <h1 className="ms-title">Mon profil <span>admin</span></h1>
        </div>

        <div className="ms-layout">
          {/* LEFT — Preferences form */}
          <div className="ms-panel-left">
            <form onSubmit={handleSubmit}>
              <div className="ms-panel">

                <div className="ms-panel-head">
                  <div className="ms-panel-ico" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <span className="ms-panel-title">Informations personnelles</span>
                </div>

                <div className="ms-section">
                  <div className="ms-field">
                    <label className="ms-label">Prénom</label>
                    <input className="ms-input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Nom</label>
                    <input className="ms-input" value={lastName} onChange={e => setLastName(e.target.value)} required />
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Email (Non modifiable)</label>
                    <input className="ms-input" value={me?.email || ''} disabled />
                  </div>
                  <div className="ms-field">
                    <label className="ms-label">Téléphone</label>
                    <input className="ms-input" value={phone} onChange={e => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="ms-footer">
                  <button type="submit" className="ms-submit" disabled={saving}>
                    {saving ? <><div className="ms-spinner" />Enregistrement&#8230;</> : <>Enregistrer les modifications</>}
                  </button>
                  {message && (
                    <div className={`ms-toast${message.ok ? ' ok' : ' err'}`}>
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

          {/* RIGHT — Status steps */}
          <div className="ms-panel-right">
            <div className="ms-panel">
              <div className="ms-panel-head">
                <div className="ms-panel-ico" style={{ background: '#FFFBEB', color: '#D97706' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="ms-panel-title">Règles de gestion</span>
              </div>
              <div className="ms-steps">
                {RULES.map((s, i) => (
                  <div key={i} className="ms-step">
                    <div className="ms-step-ico" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="ms-step-title">{s.title}</div>
                      <div className="ms-step-desc">{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}