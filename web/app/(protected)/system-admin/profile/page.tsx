// web/app/(protected)/system-admin/profile/page.tsx
'use client';

import React, { useEffect, useState, type FormEvent } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate } from '../../../../lib/format';
import type { CurrentUser } from '../../../../types/user';

export default function SystemAdminProfile() {
  const [user, setUser] = useState<CurrentUser | null>(null);
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    setLoading(true);
    api.me()
      .then((data) => {
        const u = data as CurrentUser;
        setUser(u);
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setPhone(u.phone || '');
        setCity(u.city || '');
        setCountry(u.country || '');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleCancel = () => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setPhone(user.phone || '');
      setCity(user.city || '');
      setCountry(user.country || '');
    }
    setIsEditing(false);
    setMsg(null);
  };

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaveLoading(true);
    setMsg(null);

    try {
      // Simulation d'appel API de mise à jour
      await new Promise(r => setTimeout(r, 1000));
      setMsg({ type: 'success', text: 'Profil mis à jour avec succès !' });
      setIsEditing(false);
      loadProfile();
    } catch {
      setMsg({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <AppShell title="Mon Profil - Administration">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
        
        .prof-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.5rem, 4vw, 3rem); max-width: 1100px; margin: 0 auto; animation: profin 0.4s ease-out; }
        .prof-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; flex-wrap: wrap; gap: 1rem; }
        .prof-title { font-size: 2.2rem; font-weight: 800; color: #111827; letter-spacing: -0.02em; margin: 0; }
        .prof-title span { color: #7C3AED; }

        .prof-grid { display: grid; grid-template-columns: 320px 1fr; gap: 2rem; }
        @media (max-width: 900px) { .prof-grid { grid-template-columns: 1fr; } }

        .prof-card { background: white; border-radius: 28px; border: 1px solid #EDE9FE; padding: 2rem; box-shadow: 0 4px 25px rgba(124,58,237,0.06); position: relative; }
        
        .prof-avatar { 
          width: 120px; height: 120px; border-radius: 40px; background: linear-gradient(135deg, #7C3AED, #9333EA);
          margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center;
          font-size: 3rem; color: white; font-weight: 800; box-shadow: 0 12px 30px rgba(124,58,237,0.3);
        }
        .prof-name { font-size: 1.4rem; font-weight: 800; color: #111827; margin-bottom: 0.4rem; text-align: center; }
        .prof-role-badge { 
          display: block; width: fit-content; margin: 0 auto; padding: 0.5rem 1.2rem; background: #F5F3FF; color: #7C3AED; 
          border-radius: 99px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
        }

        .prof-section-title { font-size: 1.1rem; font-weight: 800; color: #111827; margin-bottom: 2rem; display: flex; align-items: center; gap: 0.75rem; }
        .prof-section-title i { width: 36px; height: 36px; border-radius: 12px; background: #F5F3FF; color: #7C3AED; display: flex; align-items: center; justify-content: center; font-style: normal; }

        .prof-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
        @media (max-width: 600px) { .prof-info-grid { grid-template-columns: 1fr; } }

        .prof-item { display: flex; flex-direction: column; gap: 0.5rem; }
        .prof-label { font-size: 0.7rem; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 0.08em; padding-left: 0.2rem; }
        
        .prof-input { 
          font-size: 0.95rem; font-weight: 600; color: #1F2937; padding: 0.85rem 1.1rem; 
          background: #F9FAFB; border-radius: 14px; border: 1.5px solid transparent; outline: none; transition: all 0.2s;
        }
        .prof-input:focus { background: white; border-color: #7C3AED; box-shadow: 0 0 0 4px rgba(124,58,237,0.1); }
        .prof-input:disabled { color: #4B5563; cursor: not-allowed; opacity: 0.9; }
        .prof-input.editing { background: white; border-color: #EDE9FE; }

        .btn-edit-toggle { background: white; color: #7C3AED; border: 1.5px solid #DDD6FE; padding: 0.6rem 1.2rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
        .btn-edit-toggle:hover { background: #F5F3FF; border-color: #7C3AED; }

        .prof-footer-actions { margin-top: 2rem; display: flex; justify-content: flex-end; gap: 1rem; padding-top: 2rem; border-top: 1px solid #F3F4F6; }
        .btn-save { background: #7C3AED; color: white; border: none; padding: 0.75rem 1.8rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(124,58,237,0.25); }
        .btn-save:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.35); }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-cancel { background: transparent; color: #6B7280; border: 1.5px solid #E5E7EB; padding: 0.75rem 1.8rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }

        @keyframes profin { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <form onSubmit={onSave} className="prof-wrap">
        <header className="prof-header">
          <div>
            <h1 className="prof-title">Mon <span>Profil</span></h1>
            <p style={{ color: '#6B7280', fontWeight: 500, marginTop: '0.4rem' }}>Identité du Grand Chef de la plateforme.</p>
          </div>
          {!isEditing && !loading && (
            <button type="button" className="btn-edit-toggle" onClick={() => setIsEditing(true)}>
              Modifier mon profil
            </button>
          )}
        </header>

        {msg && (
          <div style={{ 
            padding: '1rem 1.5rem', borderRadius: '16px', marginBottom: '2rem', 
            background: msg.type === 'success' ? '#ECFDF5' : '#FEF2F2', 
            color: msg.type === 'success' ? '#065F46' : '#991B1B',
            fontWeight: 700, border: `1px solid ${msg.type === 'success' ? '#A7F3D0' : '#FCA5A5'}`,
            animation: 'profin 0.3s ease-out'
          }}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '5rem', textAlign: 'center', color: '#7C3AED', fontWeight: 800 }}>Chargement de vos accès...</div>
        ) : user ? (
          <div className="prof-grid">
            <aside>
              <div className="prof-card">
                <div className="prof-avatar">
                  {firstName[0] || 'G'}{lastName[0] || 'C'}
                </div>
                <h2 className="prof-name">{firstName} {lastName}</h2>
                <div className="prof-role-badge">Grand Chef Plateforme</div>
                
                <div style={{ marginTop: '2.5rem', fontSize: '0.85rem' }}>
                  <div style={{ padding: '0.8rem', background: '#F9FAFB', borderRadius: '14px', marginBottom: '0.75rem' }}>
                    <div style={{ color: '#9CA3AF', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Membre depuis</div>
                    <div style={{ fontWeight: 700, color: '#1F2937' }}>{formatDate(user.createdAt)}</div>
                  </div>
                  <div style={{ padding: '0.8rem', background: '#F5F3FF', borderRadius: '14px' }}>
                    <div style={{ color: '#7C3AED', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>Privilèges</div>
                    <div style={{ fontWeight: 800, color: '#4C1D95' }}>Administration Totale</div>
                  </div>
                </div>
              </div>
            </aside>

            <main>
              <div className="prof-card">
                <h3 className="prof-section-title">
                  <i>👤</i>
                  Informations Générales
                </h3>
                
                <div className="prof-info-grid">
                  <div className="prof-item">
                    <label className="prof-label">Prénom</label>
                    <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={firstName} onChange={e => setFirstName(e.target.value)} disabled={!isEditing} required />
                  </div>
                  <div className="prof-item">
                    <label className="prof-label">Nom</label>
                    <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={lastName} onChange={e => setLastName(e.target.value)} disabled={!isEditing} required />
                  </div>
                  <div className="prof-item" style={{ gridColumn: 'span 2' }}>
                    <label className="prof-label">Adresse Email (Identifiant)</label>
                    <input className="prof-input" value={user.email} disabled />
                    <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: '0.3rem' }}>L&apos;email ne peut être modifié pour des raisons de sécurité système.</p>
                  </div>
                  <div className="prof-item">
                    <label className="prof-label">Téléphone</label>
                    <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} placeholder="Non renseigné" />
                  </div>
                  <div className="prof-item">
                    <label className="prof-label">Ville</label>
                    <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={city} onChange={e => setCity(e.target.value)} disabled={!isEditing} placeholder="Non renseignée" />
                  </div>
                  <div className="prof-item" style={{ gridColumn: 'span 2' }}>
                    <label className="prof-label">Pays</label>
                    <input className={`prof-input ${isEditing ? 'editing' : ''}`} value={country} onChange={e => setCountry(e.target.value)} disabled={!isEditing} placeholder="Non renseigné" />
                  </div>
                </div>

                {isEditing && (
                  <div className="prof-footer-actions">
                    <button type="button" className="btn-cancel" onClick={handleCancel} disabled={saveLoading}>Annuler</button>
                    <button type="submit" className="btn-save" disabled={saveLoading}>
                      {saveLoading ? 'Mise à jour...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.7rem', color: '#CBD5E1' }}>
                  Identifiant système : {user.id}
                </div>
              </div>

              <div className="prof-card" style={{ marginTop: '1.5rem', background: 'linear-gradient(to right, #ffffff, #F5F3FF)', padding: '1.5rem 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontWeight: 800, color: '#4C1D95', fontSize: '1rem' }}>Sécurité du compte</h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#6B7280' }}>Pour changer votre mot de passe, rendez-vous dans les réglages.</p>
                  </div>
                  <button type="button" className="btn-edit-toggle" style={{ background: 'white' }} onClick={() => window.location.href='/system-admin/settings'}>
                    Aller aux réglages
                  </button>
                </div>
              </div>
            </main>
          </div>
        ) : (
          <div className="prof-card" style={{ textAlign: 'center', color: '#DC2626', fontWeight: 700 }}>
            {error || "Utilisateur introuvable."}
          </div>
        )}
      </form>
    </AppShell>
  );
}