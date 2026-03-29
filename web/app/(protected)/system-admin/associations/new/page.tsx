// web/app/(protected)/system-admin/associations/new/page.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppShell } from '../../../../../components/layout/AppShell';
import { http } from '../../../../../lib/http';

// Interfaces pour le typage strict
interface FileUploadResponse {
  id: string;
  url: string;
}

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

      // 1. Upload du logo si présent (Remplacement de any par FileUploadResponse)
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('category', 'ASSOCIATION_DOCUMENT');
        const uploadRes = await http<FileUploadResponse>('/uploads', {
          method: 'POST',
          body: formData,
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

  return (
    <AppShell title="Déploiement d'Instance">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Inter:wght@400;700&family=Montserrat:wght@400;700&family=Playfair+Display:wght@700&family=Roboto:wght@400;700&display=swap');
        
        .new-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 5vw, 3rem); max-width: 1300px; margin: 0 auto; animation: fadeInUp 0.6s ease-out; }
        .grid-main { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        @media (max-width: 1024px) { .grid-main { grid-template-columns: 1fr; } }

        .card-glass { 
          background: white; border-radius: 32px; padding: 2.5rem; 
          box-shadow: 0 20px 50px rgba(124, 58, 237, 0.05); 
          border: 1px solid #F3F4F6; margin-bottom: 2rem;
        }

        .section-title { 
          font-size: 1.3rem; font-weight: 800; color: #111827; margin-bottom: 2rem; 
          display: flex; align-items: center; gap: 0.75rem; border-bottom: 1.5px solid #F9FAFB; padding-bottom: 1rem;
        }

        .input-group { margin-bottom: 1.5rem; }
        .label { display: block; font-size: 0.85rem; font-weight: 700; color: #4B5563; margin-bottom: 0.6rem; margin-left: 0.2rem; }
        .input-custom { 
          width: 100%; height: 54px; border-radius: 16px; border: 2px solid #F3F4F6; 
          padding: 0 1.2rem; font-family: inherit; font-size: 0.95rem; font-weight: 500; 
          transition: all 0.2s; background: #F9FAFB; box-sizing: border-box; 
        }
        .input-custom:focus { border-color: #7C3AED; background: white; outline: none; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1); }

        .logo-upload-zone {
          width: 100%; height: 120px; border: 2px dashed #DDD6FE; border-radius: 20px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.3s; overflow: hidden; background: #F5F3FF; margin-bottom: 2rem;
          position: relative;
        }
        .logo-upload-zone:hover { border-color: #7C3AED; background: white; }
        .logo-img { object-fit: contain; }

        .select-custom { 
          appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.2em;
        }

        .color-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .color-item { position: relative; height: 54px; border-radius: 16px; border: 2px solid #F3F4F6; overflow: hidden; display: flex; align-items: center; }
        .color-item input[type="color"] { position: absolute; left: -10px; top: -10px; width: 150%; height: 150%; cursor: pointer; border: none; }
        .color-item span { position: relative; margin-left: 3.5rem; font-size: 0.85rem; font-weight: 700; color: #4B5563; pointer-events: none; }

        .btn-main { 
          background: #111827; color: white; border: none; height: 68px; padding: 0 4rem; 
          border-radius: 24px; font-size: 1.1rem; font-weight: 800; cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 15px 35px rgba(0,0,0,0.1); width: 100%;
        }
        .btn-main:hover:not(:disabled) { transform: translateY(-4px); background: #7C3AED; box-shadow: 0 20px 40px rgba(124, 58, 237, 0.3); }
        .btn-main:disabled { opacity: 0.6; cursor: not-allowed; }

        .error-msg { background: #FEF2F2; color: #DC2626; padding: 1.2rem; border-radius: 20px; border: 1px solid #FEE2E2; margin-bottom: 2rem; text-align: center; font-weight: 700; }

        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="new-wrap">
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.05em' }}>
            Déployer une <span>Nouvelle Instance</span>
          </h1>
          <p style={{ color: '#6B7280', fontSize: '1.1rem', marginTop: '1rem' }}>Créez un environnement isolé, sécurisé et personnalisé pour votre association cliente.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}

          <div className="grid-main">
            {/* COLONNE GAUCHE */}
            <div className="col-left">
              <div className="card-glass">
                <div className="section-title">🖼️ Identité Visuelle</div>
                
                <div className="label">Logo de l&apos;organisation</div>
                <div className="logo-upload-zone" onClick={() => fileInputRef.current?.click()}>
                  {logoPreview ? (
                    <Image src={logoPreview} alt="Logo Preview" fill className="logo-img" unoptimized />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '2rem', display: 'block' }}>📁</span>
                      <span style={{ color: '#7C3AED', fontWeight: 700 }}>Cliquez pour uploader le logo</span>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#9CA3AF' }}>PNG, JPG ou SVG (max 2MB)</span>
                    </div>
                  )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleLogoChange} hidden accept="image/*" />

                <div className="input-group">
                  <label className="label">Police d&apos;écriture (Font)</label>
                  <select 
                    className="input-custom select-custom" 
                    value={fontFamily} 
                    onChange={e => setFontFamily(e.target.value)}
                    style={{ fontFamily: fontFamily }}
                  >
                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                  </select>
                </div>

                <label className="label">Couleurs du thème</label>
                <div className="color-row">
                  <div className="color-item">
                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} />
                    <span>Principale</span>
                  </div>
                  <div className="color-item">
                    <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                    <span>Accent</span>
                  </div>
                </div>
              </div>

              <div className="card-glass">
                <div className="section-title">🏛️ Informations Légales</div>
                <div className="input-group">
                  <label className="label">Nom complet *</label>
                  <input className="input-custom" value={assoName} onChange={e => setAssoName(e.target.value)} required placeholder="Nom officiel" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="label">Code ID *</label>
                    <input className="input-custom" value={assoCode} onChange={e => setAssoCode(e.target.value.toUpperCase().replace(/\s/g,''))} required placeholder="Ex: ASCOK" />
                  </div>
                  <div className="input-group">
                    <label className="label">N° Enregistrement</label>
                    <input className="input-custom" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="N° RNA / Siret..." />
                  </div>
                </div>
                <div className="input-group">
                  <label className="label">Sous-domaine</label>
                  <input className="input-custom" value={assoDomain} onChange={e => setAssoDomain(e.target.value)} placeholder="mon-asso.lcd.com" />
                </div>
              </div>
            </div>

            {/* COLONNE DROITE */}
            <div className="col-right">
              <div className="card-glass">
                <div className="section-title">📍 Siège Social</div>
                <div className="input-group">
                  <label className="label">Adresse complète</label>
                  <input className="input-custom" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rue, Quartier..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="label">Ville</label>
                    <input className="input-custom" value={city} onChange={e => setCity(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="label">Code Postal</label>
                    <input className="input-custom" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="label">Pays</label>
                  <input className="input-custom" value={country} onChange={e => setCountry(e.target.value)} />
                </div>
              </div>

              <div className="card-glass">
                <div className="section-title">👑 Super Administrateur</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label className="label">Prénom</label>
                    <input className="input-custom" value={adminFirstName} onChange={e => setAdminFirstName(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label className="label">Nom</label>
                    <input className="input-custom" value={adminLastName} onChange={e => setAdminLastName(e.target.value)} required />
                  </div>
                </div>
                <div className="input-group">
                  <label className="label">Email Professionnel</label>
                  <input type="email" className="input-custom" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label className="label">Téléphone</label>
                  <input type="tel" className="input-custom" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="btn-main" disabled={saving}>
                {saving ? 'Déploiement en cours (Patience...)' : 'DÉPLOYER L\'INSTANCE MAINTENANT'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}