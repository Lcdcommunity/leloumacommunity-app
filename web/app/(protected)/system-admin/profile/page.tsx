// web/app/(protected)/system-admin/profile/page.tsx
'use client';

import React, { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';
import type { CurrentUser } from '../../../../types/user';

// On étend le type CurrentUser pour inclure les nouveaux champs sans utiliser 'any'
interface ProfileUser extends CurrentUser {
  address?: string;
  postalCode?: string;
}

export default function SystemAdminProfile() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    setLoading(true);
    api.me()
      .then((data) => {
        const u = data as ProfileUser;
        setUser(u);
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setPhone(u.phone || '');
        setCity(u.city || '');
        setCountry(u.country || '');
        setAddress(u.address || '');
        setPostalCode(u.postalCode || '');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleCancel = () => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      setCity(user.city || '');
      setCountry(user.country || '');
      setAddress(user.address || '');
      setPostalCode(user.postalCode || '');
    }
    setIsEditing(false);
    setMsg(null);
  };

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveLoading(true);
    setMsg(null);

    try {
      // 🚨 TODO API: Remplacez le timeout par votre véritable appel API d'update.
      // Exemple: await api.updateProfile({ firstName, lastName, phone, city, country, address, postalCode });
      await new Promise(r => setTimeout(r, 800)); 

      // On met à jour l'utilisateur localement pour refléter les changements à l'écran
      // sans avoir à refaire un loadProfile() qui ramènerait les anciennes données de la BDD.
      setUser(prev => prev ? { 
        ...prev, 
        firstName, 
        lastName, 
        phone, 
        city, 
        country, 
        address, 
        postalCode 
      } as ProfileUser : null);

      setMsg({ type: 'success', text: 'Profil mis à jour avec succès !' });
      setIsEditing(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.';
      setMsg({ type: 'error', text: errorMessage });
    } finally {
      setSaveLoading(false);
    }
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --surface: #FFFFFF;
      --surface-2: #F1F5F9;
      --border: rgba(15, 23, 42, 0.08);
      --border-hover: rgba(139, 92, 246, 0.4);
      --accent: #8B5CF6;
      --accent-glow: rgba(139, 92, 246, 0.15);
      --text-1: #0F172A;
      --text-2: #334155;
      --text-3: #64748B;
      --green: #059669;
      --red: #DC2626;
      
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
      --shadow-md: 0 8px 16px -4px rgba(0,0,0,0.05), 0 4px 8px -4px rgba(0,0,0,0.03);
    }

    .prof-wrap { 
      font-family: 'Inter', sans-serif; 
      padding: clamp(1rem, 3vw, 2rem); 
      max-width: 1040px; 
      margin: 0 auto; 
      color: var(--text-1);
      animation: profin 0.4s ease-out; 
      padding-bottom: 6rem;
    }

    /* ─── HEADER ─── */
    .prof-header { 
      display: flex; justify-content: space-between; align-items: flex-end; 
      margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; 
    }
    .prof-title { 
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 800; color: var(--text-1); 
      letter-spacing: -0.03em; margin: 0 0 0.2rem 0; line-height: 1.1;
    }
    .prof-title span { 
      background: linear-gradient(135deg, var(--accent), #C026D3);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .prof-subtitle { color: var(--text-3); font-weight: 500; margin: 0; font-size: 0.85rem; }

    /* ─── ALERTS ─── */
    .prof-alert {
      padding: 0.8rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; 
      font-weight: 600; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;
    }
    .prof-alert-success { background: #ECFDF5; color: var(--green); border: 1px solid rgba(16,185,129,0.2); }
    .prof-alert-error { background: #FEF2F2; color: var(--red); border: 1px solid rgba(239,68,68,0.2); }

    /* ─── MAIN GRID ─── */
    .prof-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
    @media (min-width: 900px) { .prof-grid { grid-template-columns: 320px 1fr; } }

    .prof-card { 
      background: var(--surface); border-radius: 20px; border: 1px solid var(--border); 
      box-shadow: var(--shadow-sm); overflow: hidden; position: relative; 
    }
    
    /* ─── SIDEBAR PREMIUM ─── */
    .prof-cover {
      height: 100px; width: 100%;
      background: linear-gradient(135deg, var(--accent), #C026D3);
      position: relative;
    }
    .prof-cover::after {
      content: ''; position: absolute; inset: 0;
      background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" opacity="0.1"><circle cx="2" cy="2" r="2" fill="white"/></svg>') repeat;
    }
    .prof-avatar-wrap {
      display: flex; justify-content: center; margin-top: -45px; position: relative; z-index: 2;
    }
    .prof-avatar { 
      width: 90px; height: 90px; border-radius: 24px; 
      background: var(--surface); border: 4px solid var(--surface);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 2rem; color: var(--accent); font-weight: 800; 
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .prof-side-content { padding: 1rem 1.5rem 1.5rem; text-align: center; }
    .prof-name { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.25rem; font-weight: 800; margin-bottom: 0.2rem; }
    .prof-role-badge { 
      display: inline-block; padding: 0.35rem 0.8rem; background: var(--surface-2); color: var(--accent); 
      border: 1px solid var(--border); border-radius: 100px; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .prof-stats { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; text-align: left; }
    .prof-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; background: var(--surface-2); border-radius: 12px; }
    .prof-stat-label { font-size: 0.65rem; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }
    .prof-stat-val { font-size: 0.8rem; font-weight: 700; color: var(--text-1); }

    /* ─── FORM CONTENT ─── */
    .prof-main-pad { padding: 1.5rem; }
    .prof-section-title { 
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.05rem; font-weight: 800; 
      margin: 0 0 1.5rem 0; display: flex; align-items: center; gap: 0.6rem; color: var(--text-1);
    }

    /* Lignes Flexbox forcées pour le responsive */
    .gc-form-group { display: flex; flex-direction: column; gap: 1rem; }
    
    .gc-row { 
      display: flex; gap: 0.75rem; width: 100%; 
    }
    .gc-col { 
      flex: 1; display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; 
    }

    .prof-label { 
      font-size: 0.65rem; font-weight: 700; color: var(--text-3); 
      text-transform: uppercase; letter-spacing: 0.08em; padding-left: 0.2rem;
      display: flex; align-items: center; gap: 0.3rem;
    }
    .prof-label svg { opacity: 0.6; }
    
    .prof-input-wrap { position: relative; }
    .prof-input { 
      font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600; color: var(--text-1); 
      padding: 0.8rem 1rem; width: 100%; box-sizing: border-box;
      background: var(--surface-2); border-radius: 10px; border: 1px solid transparent; 
      outline: none; transition: all 0.2s;
    }
    .prof-input::placeholder { color: #94A3B8; font-weight: 500; }
    .prof-input:focus { background: var(--surface); border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .prof-input:disabled { color: var(--text-3); cursor: not-allowed; opacity: 0.8; }
    .prof-input.editing { background: var(--surface); border: 1px solid var(--border); }
    .prof-input.editing:hover { border-color: var(--border-hover); }

    .prof-hint { font-size: 0.65rem; color: var(--text-3); margin-top: 0.25rem; margin-left: 0.2rem; }

    /* ─── ACTIONS ─── */
    .btn-edit-toggle { 
      background: var(--surface); color: var(--text-1); border: 1px solid var(--border); 
      padding: 0.5rem 1rem; border-radius: 10px; font-weight: 600; font-size: 0.8rem;
      cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm);
    }
    .btn-edit-toggle:hover { background: var(--surface-2); }

    .prof-footer-actions { 
      margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem; 
      padding-top: 1.5rem; border-top: 1px solid var(--border); 
    }
    .btn-save { 
      background: linear-gradient(135deg, var(--accent), #C026D3); color: white; border: none; 
      padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; font-size: 0.85rem;
      cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px var(--accent-glow);
    }
    .btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(139,92,246,0.3); }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    
    .btn-cancel { 
      background: transparent; color: var(--text-2); border: 1px solid var(--border); 
      padding: 0.75rem 1.5rem; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
    }
    .btn-cancel:hover { background: var(--surface-2); color: var(--text-1); }

    /* ─── ID SYSTEM & SECU ─── */
    .prof-system-id { margin-top: 1.5rem; text-align: center; font-size: 0.65rem; color: var(--text-3); }
    .prof-system-id span { font-family: monospace; background: var(--surface-2); padding: 0.2rem 0.5rem; border-radius: 6px; font-weight: 600; color: var(--text-2); }

    .prof-security-banner {
      margin-top: 1.5rem; border-radius: 16px; background: linear-gradient(to right, var(--surface), #FDFBFF); 
      padding: 1.25rem; border: 1px dashed var(--border-hover);
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
    }

    @keyframes profin { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  // Icons Helper
  const IconUser = () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
  const IconMail = () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
  const IconPhone = () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>;
  const IconMap = () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

  return (
    <AppShell title="Mon Profil - Administration">
      <style>{CSS}</style>

      <form onSubmit={onSave} className="prof-wrap">
        <header className="prof-header">
          <div>
            <h1 className="prof-title">Mon <span>Profil</span></h1>
            <p className="prof-subtitle">Identité et informations du Grand Chef.</p>
          </div>
          {!isEditing && !loading && (
            <button type="button" className="btn-edit-toggle" onClick={() => setIsEditing(true)}>
              Modifier mon profil
            </button>
          )}
        </header>

        {msg && (
          <div className={`prof-alert ${msg.type === 'success' ? 'prof-alert-success' : 'prof-alert-error'}`}>
            {msg.type === 'success' ? '✓' : '✕'} {msg.text}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-3)', fontWeight: 600 }}>
             Chargement sécurisé...
          </div>
        ) : user ? (
          <div className="prof-grid">
            
            {/* SIDEBAR */}
            <aside>
              <div className="prof-card">
                <div className="prof-cover"></div>
                <div className="prof-avatar-wrap">
                  <div className="prof-avatar">
                    {firstName[0] || 'G'}{lastName[0] || 'C'}
                  </div>
                </div>
                <div className="prof-side-content">
                  <h2 className="prof-name">{firstName} {lastName}</h2>
                  <div className="prof-role-badge">Grand Chef</div>
                  
                  <div className="prof-stats">
                    <div className="prof-stat-row">
                      <span className="prof-stat-label">Membre depuis</span>
                      <span className="prof-stat-val">{formatDate(user.createdAt)}</span>
                    </div>
                    <div className="prof-stat-row" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
                      <span className="prof-stat-label" style={{ color: 'var(--accent)' }}>Privilèges</span>
                      <span className="prof-stat-val" style={{ color: 'var(--accent)' }}>Admin Total</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>

            {/* MAIN FORM */}
            <main>
              <div className="prof-card prof-main-pad">
                <h3 className="prof-section-title">
                  Identité & Coordonnées
                </h3>
                
                <div className="gc-form-group">
                  
                  {/* Ligne 1 : Prénom | Nom */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="prof-label"><IconUser /> Prénom</label>
                      <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={firstName} onChange={e => setFirstName(e.target.value)} disabled={!isEditing} required placeholder="Votre prénom" />
                    </div>
                    <div className="gc-col">
                      <label className="prof-label"><IconUser /> Nom</label>
                      <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={lastName} onChange={e => setLastName(e.target.value)} disabled={!isEditing} required placeholder="Votre nom" />
                    </div>
                  </div>

                  {/* Ligne 2 : Email */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="prof-label"><IconMail /> Email (Identifiant)</label>
                      <input className="prof-input" value={user.email} disabled />
                      <p className="prof-hint">Verrouillé pour la sécurité du compte système.</p>
                    </div>
                  </div>

                  {/* Ligne 3 : Libellé Adresse | Code Postal */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="prof-label"><IconMap /> Libellé (Adresse)</label>
                      <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={address} onChange={e => setAddress(e.target.value)} disabled={!isEditing} placeholder="N° et rue" />
                    </div>
                    <div className="gc-col" style={{ flex: 0.6 }}> 
                      <label className="prof-label">Code Postal</label>
                      <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={postalCode} onChange={e => setPostalCode(e.target.value)} disabled={!isEditing} placeholder="Ex: 75001" />
                    </div>
                  </div>

                  {/* Ligne 4 : Ville | Pays */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="prof-label"><IconMap /> Ville</label>
                      <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={city} onChange={e => setCity(e.target.value)} disabled={!isEditing} placeholder="Votre ville" />
                    </div>
                    <div className="gc-col">
                      <label className="prof-label">Pays</label>
                      <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={country} onChange={e => setCountry(e.target.value)} disabled={!isEditing} placeholder="Votre pays" />
                    </div>
                  </div>

                  {/* Ligne 5 : Téléphone */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="prof-label"><IconPhone /> Téléphone</label>
                      <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} placeholder="+33 6..." />
                    </div>
                    <div className="gc-col">
                      {/* Empty col for spacing */}
                    </div>
                  </div>

                </div>

                {isEditing && (
                  <div className="prof-footer-actions">
                    <button type="button" className="btn-cancel" onClick={handleCancel} disabled={saveLoading}>Annuler</button>
                    <button type="submit" className="btn-save" disabled={saveLoading}>
                      {saveLoading ? 'Sauvegarde...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                )}

                <div className="prof-system-id">
                  ID d&apos;authentification : <span>{user.id}</span>
                </div>
              </div>

              {/* BANNIÈRE DE SÉCURITÉ */}
              <div className="prof-security-banner">
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text-1)', fontSize: '0.9rem' }}>Sécurité et Accès</h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-3)' }}>Gérez votre mot de passe et vos clés d&apos;API.</p>
                </div>
                <button type="button" className="btn-edit-toggle" style={{ background: 'white' }} onClick={() => window.location.href='/system-admin/settings'}>
                  Accéder aux réglages
                </button>
              </div>
            </main>

          </div>
        ) : (
          <div className="prof-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--red)', fontWeight: 600 }}>
            {error || "Impossible de charger le profil de l'administrateur."}
          </div>
        )}
      </form>
    </AppShell>
  );
}