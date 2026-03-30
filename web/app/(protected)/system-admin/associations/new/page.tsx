// web/app/(protected)/system-admin/associations/new/page.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppShell } from '../../../../../components/layout/AppShell';
import { http } from '../../../../../lib/http';
import { api } from '../../../../../lib/api-client';

// Interfaces pour le typage strict
interface FONT_OPTION {
  name: string;
  value: string;
}

const FONT_OPTIONS: FONT_OPTION[] = [
  { name: 'DM Sans (Moderne)', value: "'DM Sans', sans-serif" },
  { name: 'Inter (Pro)', value: "'Inter', sans-serif" },
  { name: 'Montserrat (Élégant)', value: "'Montserrat', sans-serif" },
  { name: 'Playfair Display (Classique)', value: "'Playfair Display', serif" },
  { name: 'Roboto (Standard)', value: "'Roboto', sans-serif" },
];

// DÉCLARATION DES ICÔNES À L'EXTÉRIEUR DU COMPOSANT
const IconDesign = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
const IconLegal = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const IconLocation = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const IconAdmin = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;

export default function CreateAssociationPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // État : Identité & Look
  const [assoName, setAssoName] = useState('');
  const [assoCode, setAssoCode] = useState('');
  const [assoDomain, setAssoDomain] = useState('');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].value);
  const [primaryColor, setPrimaryColor] = useState('#7C3AED');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');

  // État : Siège Social & Légal
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Guinée');

  // État : Super Admin
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let logoFileId = null;

      // 1. Upload du logo via le api-client (Correction du POST /api/uploads)
      if (logoFile) {
        const uploadRes = await api.uploadFile(logoFile, {
          category: 'ASSOCIATION_DOCUMENT'
        });
        logoFileId = uploadRes.id;
      }

      // 2. Création de l'association
      const payload = {
        associationName: assoName,
        code: assoCode,
        domain: assoDomain,
        registrationNumber,
        addressLine1: address,
        city,
        postalCode,
        country,
        logoFileId,
        fontFamily,
        themeColors: { primary: primaryColor, secondary: secondaryColor },
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPhone,
      };

      await http('/system-admin/associations', { method: 'POST', body: payload });
      
      alert('Instance déployée avec succès !');
      router.push('/system-admin/associations');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du déploiement.';
      setError(message);
      setSaving(false);
    }
  }, [assoName, assoCode, assoDomain, registrationNumber, address, city, postalCode, country, logoFile, fontFamily, primaryColor, secondaryColor, adminFirstName, adminLastName, adminEmail, adminPhone, router]);

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');

    :root {
      --bg: #F8FAFC;
      --surface: #FFFFFF;
      --surface-2: #F1F5F9;
      --border: rgba(15, 23, 42, 0.08);
      --accent: #8B5CF6;
      --accent-glow: rgba(139, 92, 246, 0.15);
      --text-1: #0F172A;
      --text-2: #334155;
      --text-3: #64748B;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.05);
    }

    .new-wrap { 
      font-family: 'Inter', sans-serif; 
      padding: clamp(1rem, 3vw, 2.5rem); 
      max-width: 1080px; 
      margin: 0 auto; 
      color: var(--text-1);
      animation: profin 0.4s ease-out; 
      padding-bottom: 6rem; /* Espace pour menu mobile */
    }

    /* ─── HEADER ULTRA COMPACT ─── */
    .new-header {
      text-align: center; margin-bottom: 2rem;
    }
    .new-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: clamp(1.5rem, 5vw, 2.5rem); 
      font-weight: 800; color: var(--text-1);
      letter-spacing: -0.03em; margin: 0 0 0.25rem 0; line-height: 1.1;
    }
    .new-title span {
      background: linear-gradient(135deg, var(--accent), #C026D3);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .new-subtitle {
      color: var(--text-3); font-weight: 500; margin: 0; font-size: clamp(0.85rem, 2vw, 1rem);
    }

    /* ─── GRID ET CARTES COMPACTES ─── */
    .grid-main { 
      display: grid; grid-template-columns: 1fr; gap: 1.25rem; 
    }
    @media (min-width: 900px) { 
      .grid-main { grid-template-columns: repeat(2, 1fr); align-items: start; } 
    }

    .card-glass { 
      background: var(--surface); border-radius: 16px; 
      border: 1px solid var(--border); padding: clamp(1rem, 3vw, 1.5rem); 
      box-shadow: var(--shadow-sm); margin-bottom: 1.25rem;
    }

    .section-title { 
      font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1rem; font-weight: 700; color: var(--text-1); 
      margin: 0 0 1.25rem 0; display: flex; align-items: center; gap: 0.5rem; 
      padding-bottom: 0.75rem; border-bottom: 1px solid var(--surface-2);
    }
    .section-icon { color: var(--accent); display: flex; align-items: center; }

    /* ─── FORMULAIRE COMPACT & ALIGNÉ ─── */
    .gc-form-group { display: flex; flex-direction: column; gap: 0.85rem; }
    
    /* On force 2 colonnes partout pour l'optimisation d'espace */
    .gc-row { display: flex; gap: 0.75rem; width: 100%; }
    .gc-col { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }

    .label { font-size: 0.7rem; font-weight: 700; color: var(--text-2); text-transform: uppercase; letter-spacing: 0.05em; margin-left: 0.2rem; }
    
    .input-custom { 
      font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 500; color: var(--text-1); 
      padding: 0.75rem 1rem; width: 100%; box-sizing: border-box;
      background: var(--surface-2); border-radius: 10px; border: 1px solid transparent; 
      outline: none; transition: all 0.2s; height: 42px;
    }
    .input-custom::placeholder { color: #94A3B8; }
    .input-custom:focus { background: var(--surface); border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }

    /* ─── ZONE UPLOAD LOGO ─── */
    .logo-upload-zone {
      width: 100%; height: 90px; border: 2px dashed rgba(139, 92, 246, 0.3); border-radius: 12px;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      transition: all 0.2s; background: rgba(139, 92, 246, 0.02); position: relative; overflow: hidden;
    }
    .logo-upload-zone:hover { border-color: var(--accent); background: var(--surface); }
    .logo-img { object-fit: contain; }

    /* ─── COULEURS THÈME CENTRÉES & MODERNES ─── */
    .color-row { display: flex; gap: 0.75rem; width: 100%; }
    .color-item { 
      flex: 1; position: relative; height: 42px; border-radius: 10px; 
      background: var(--surface-2); overflow: hidden; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .color-item:hover { background: var(--surface); box-shadow: var(--shadow-sm); }
    .color-picker { 
      position: absolute; opacity: 0; width: 100%; height: 100%; cursor: pointer; z-index: 2;
    }
    .color-display {
      display: flex; align-items: center; gap: 0.5rem; z-index: 1; pointer-events: none;
    }
    .color-circle {
      width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .color-label { font-size: 0.75rem; font-weight: 700; color: var(--text-1); }

    /* ─── SELECT CUSTOM ─── */
    .select-custom { 
      appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1em;
    }

    /* ─── BOUTON ACTION ─── */
    .btn-main { 
      background: linear-gradient(135deg, var(--text-1), var(--text-2)); color: white; border: none; 
      height: 52px; padding: 0 2rem; border-radius: 14px; font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; 
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2); width: 100%; margin-top: 0.5rem;
    }
    .btn-main:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(15, 23, 42, 0.3); background: linear-gradient(135deg, var(--accent), #C026D3); }
    .btn-main:disabled { opacity: 0.6; cursor: not-allowed; }

    .error-msg { background: #FEF2F2; color: #DC2626; padding: 0.85rem; border-radius: 12px; border: 1px solid #FCA5A5; margin-bottom: 1.5rem; text-align: center; font-weight: 600; font-size: 0.85rem; }

    @keyframes profin { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `;

  return (
    <AppShell title="Déploiement d'Instance">
      <style>{CSS}</style>

      <div className="new-wrap">
        <header className="new-header">
          <h1 className="new-title">
            Déployer une <span>Instance</span>
          </h1>
          <p className="new-subtitle">Configurez un espace isolé pour une nouvelle organisation.</p>
        </header>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="grid-main">
            {/* COLONNE GAUCHE */}
            <div className="col-left">
              <div className="card-glass">
                <h2 className="section-title"><span className="section-icon"><IconDesign /></span> Identité Visuelle</h2>
                
                <div className="gc-form-group">
                  <div className="gc-col">
                    <label className="label">Logo de l&apos;organisation</label>
                    <div className="logo-upload-zone" onClick={() => fileInputRef.current?.click()}>
                      {logoPreview ? (
                        <Image src={logoPreview} alt="Logo" fill className="logo-img" unoptimized />
                      ) : (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                          <span style={{ fontSize: '1.5rem' }}>📁</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem' }}>Uploader un logo</span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>(PNG/JPG/SVG)</span>
                        </div>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleLogoChange} hidden accept="image/*" />
                  </div>

                  <div className="gc-col">
                    <label className="label">Police d&apos;écriture</label>
                    <select 
                      className="input-custom select-custom" 
                      value={fontFamily} 
                      onChange={e => setFontFamily(e.target.value)}
                      style={{ fontFamily: fontFamily }}
                    >
                      {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                    </select>
                  </div>

                  <div className="gc-col">
                    <label className="label">Couleurs du thème</label>
                    <div className="color-row">
                      <div className="color-item">
                        <input type="color" className="color-picker" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                        <div className="color-display">
                          <div className="color-circle" style={{ backgroundColor: primaryColor }} />
                          <span className="color-label">Principale</span>
                        </div>
                      </div>
                      <div className="color-item">
                        <input type="color" className="color-picker" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                        <div className="color-display">
                          <div className="color-circle" style={{ backgroundColor: secondaryColor }} />
                          <span className="color-label">Accent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-glass">
                <h2 className="section-title"><span className="section-icon"><IconLegal /></span> Informations Légales</h2>
                <div className="gc-form-group">
                  
                  {/* Nom complet prend toute la largeur */}
                  <div className="gc-col">
                    <label className="label">Nom officiel de l&apos;association *</label>
                    <input className="input-custom" value={assoName} onChange={e => setAssoName(e.target.value)} required placeholder="Ex: Association Solidaire" />
                  </div>
                  
                  {/* Ligne : Code ID | N° Enregistrement */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="label">Code ID *</label>
                      <input className="input-custom" value={assoCode} onChange={e => setAssoCode(e.target.value.toUpperCase().replace(/\s/g,''))} required placeholder="Ex: ASCOK" />
                    </div>
                    <div className="gc-col">
                      <label className="label">N° Enregistrement</label>
                      <input className="input-custom" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="RNA / Siret..." />
                    </div>
                  </div>

                  {/* Sous domaine */}
                  <div className="gc-col">
                    <label className="label">Sous-domaine personnalisé</label>
                    <input className="input-custom" value={assoDomain} onChange={e => setAssoDomain(e.target.value)} placeholder="asso.lcd.com" />
                  </div>
                </div>
              </div>
            </div>

            {/* COLONNE DROITE */}
            <div className="col-right">
              <div className="card-glass">
                <h2 className="section-title"><span className="section-icon"><IconLocation /></span> Siège Social</h2>
                <div className="gc-form-group">
                  
                  <div className="gc-col">
                    <label className="label">Adresse complète</label>
                    <input className="input-custom" value={address} onChange={e => setAddress(e.target.value)} placeholder="Numéro et rue..." />
                  </div>
                  
                  {/* Ligne : Ville | Code Postal */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="label">Ville</label>
                      <input className="input-custom" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Paris" />
                    </div>
                    <div className="gc-col">
                      <label className="label">Code Postal</label>
                      <input className="input-custom" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="Ex: 75001" />
                    </div>
                  </div>

                  {/* Ligne : Pays */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="label">Pays</label>
                      <input className="input-custom" value={country} onChange={e => setCountry(e.target.value)} />
                    </div>
                    <div className="gc-col"></div>
                  </div>
                </div>
              </div>

              <div className="card-glass">
                <h2 className="section-title"><span className="section-icon"><IconAdmin /></span> Compte Administrateur</h2>
                <div className="gc-form-group">
                  
                  {/* Ligne : Prénom | Nom */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="label">Prénom *</label>
                      <input className="input-custom" value={adminFirstName} onChange={e => setAdminFirstName(e.target.value)} required placeholder="Prénom de l&apos;admin" />
                    </div>
                    <div className="gc-col">
                      <label className="label">Nom *</label>
                      <input className="input-custom" value={adminLastName} onChange={e => setAdminLastName(e.target.value)} required placeholder="Nom de l&apos;admin" />
                    </div>
                  </div>

                  {/* Ligne : Email | Téléphone */}
                  <div className="gc-row">
                    <div className="gc-col">
                      <label className="label">Email Pro *</label>
                      <input type="email" className="input-custom" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required placeholder="admin@asso.com" />
                    </div>
                    <div className="gc-col">
                      <label className="label">Téléphone *</label>
                      <input type="tel" className="input-custom" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} required placeholder="+33 6..." />
                    </div>
                  </div>
                  
                </div>
              </div>

              <button type="submit" className="btn-main" disabled={saving}>
                {saving ? 'Création de l\'instance...' : 'DÉPLOYER L\'INSTANCE'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}