//web/app/(protected)/super-admin/profile/page.tsx
'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type FullUserProfile } from '../../../../lib/api-client';
import type { Association } from '../../../../types/association';

export default function SuperAdminProfilePage() {
  const [me, setMe]               = useState<FullUserProfile | null>(null);
  const [association, setAssoc]   = useState<Association | null>(null);
  const [loading, setLoading]     = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [message, setMessage]     = useState<{ text: string; ok: boolean } | null>(null);

  // Avatar
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Fields personnels
  const [firstName, setFirstName]         = useState('');
  const [lastName, setLastName]           = useState('');
  const [phone, setPhone]                 = useState('');
  const [associationTitle, setAssociationTitle] = useState('');
  const [addressLine1, setAddressLine1]   = useState('');
  const [addressLine2, setAddressLine2]   = useState('');
  const [postalCode, setPostalCode]       = useState('');
  const [city, setCity]                   = useState('');
  const [country, setCountry]             = useState('');
  const [originSubPrefecture, setOriginSubPrefecture] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        // Le Super Admin charge son profil ET les infos de l'association
        const [user, assocData] = await Promise.all([
          api.getMyProfile(),
          api.getAssociation().catch(() => null), // Fallback si non configurée
        ]);
        
        setMe(user);
        setAssoc(assocData);
        populateFields(user);
        setAvatarUrl(user.avatarUrl ?? null);
      } catch (err) {
        setMessage({ text: err instanceof Error ? err.message : 'Erreur de chargement', ok: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function populateFields(user: FullUserProfile | null) {
    if (!user) return;
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhone(user.phone || '');
    setAddressLine1(user.addressLine1 || '');
    setAddressLine2(user.addressLine2 || '');
    setPostalCode(user.postalCode || '');
    setCity(user.city || '');
    setCountry(user.country || '');
    setOriginSubPrefecture(user.originSubPrefecture || '');
    setAssociationTitle(user.associationTitle || user.function || 'Super Administrateur');
  }

  // ── Avatar : sélection fichier → preview immédiat ──
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      setMessage({ text: `Image trop volumineuse (max ${MAX_MB} Mo).`, ok: false });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setMessage({ text: 'Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.', ok: false });
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    void uploadAvatar(file);
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.uploadAvatar(formData);
      const newUrl = res.avatarUrl ?? res.profilePhotoUrl ?? res.user?.avatarUrl ?? null;
      setAvatarUrl(newUrl);
      setAvatarPreview(null);
      setMe(prev => prev ? { ...prev, avatarUrl: newUrl } : prev);
      setMessage({ text: 'Photo de profil mise à jour !', ok: true });
    } catch (err) {
      setAvatarPreview(null);
      setMessage({ text: err instanceof Error ? err.message : 'Erreur lors du téléchargement.', ok: false });
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      const payload: Partial<FullUserProfile> = {
        firstName:           firstName.trim()           || undefined,
        lastName:            lastName.trim()            || undefined,
        phone:               phone.trim()               || undefined,
        addressLine1:        addressLine1.trim()        || undefined,
        addressLine2:        addressLine2.trim()        || undefined,
        postalCode:          postalCode.trim()          || undefined,
        city:                city.trim()                || undefined,
        country:             country.trim()             || undefined,
        originSubPrefecture: originSubPrefecture.trim() || undefined,
      };
      
      const updated = await api.updateMyProfile(payload);
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

  const displayAvatar = avatarPreview ?? avatarUrl;
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

  if (loading) {
    return (
      <AppShell title="Mon profil Super Admin">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#6B7280', fontFamily: "'DM Sans', sans-serif" }}>
          Chargement du profil global…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mon profil Super Admin">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@500&display=swap');

        .aprf-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 900px;
          margin: 0 auto;
        }

        .aprf-header { margin-bottom: 1.75rem; opacity: 0; transform: translateY(10px); animation: aprfin 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .aprf-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #4F46E5; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .aprf-eyebrow-dot { width: 6px; height: 6px; background: #6366F1; border-radius: 50%; animation: aprfpulse 2s ease-in-out infinite; }
        @keyframes aprfpulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .aprf-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.9rem); font-weight: 500; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .aprf-title span { background: linear-gradient(135deg,#4F46E5,#8B5CF6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .aprf-hero {
          display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;
          background: rgba(253,253,255,0.93); backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(79,70,229,0.09); box-shadow: 0 2px 14px rgba(79,70,229,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          padding: 1.5rem; margin-bottom: 1.5rem;
          opacity: 0; transform: translateY(10px); animation: aprfin 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards;
        }

        .aprf-avatar-wrap { position: relative; flex-shrink: 0; width: 80px; height: 80px; }
        .aprf-avatar {
          width: 80px; height: 80px; border-radius: 20px;
          background: linear-gradient(135deg,#312E81,#4F46E5);
          display: flex; align-items: center; justify-content: center;
          color: white; font-family: 'Cormorant Garamond', serif;
          font-size: 2rem; font-weight: 700;
          box-shadow: 0 4px 16px rgba(79,70,229,0.25);
          overflow: hidden; cursor: pointer; transition: box-shadow 0.2s, transform 0.15s;
        }
        .aprf-avatar:hover { transform: scale(1.03); box-shadow: 0 6px 22px rgba(79,70,229,0.35); }
        .aprf-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 20px; }

        .aprf-avatar-overlay {
          position: absolute; inset: 0; border-radius: 20px; background: rgba(15,23,42,0.55);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
          opacity: 0; transition: opacity 0.18s; cursor: pointer; color: white; font-size: 0.6rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
        }
        .aprf-avatar-wrap:hover .aprf-avatar-overlay { opacity: 1; }

        .aprf-avatar-spinner { position: absolute; inset: 0; border-radius: 20px; background: rgba(15,23,42,0.65); display: flex; align-items: center; justify-content: center; }
        .aprf-spinner-ring { width: 28px; height: 28px; border: 3px solid rgba(255,255,255,0.25); border-top-color: white; border-radius: 50%; animation: aprfspin 0.7s linear infinite; }
        .aprf-avatar-hint { font-size: 0.62rem; color: #9CA3AF; font-weight: 500; margin-top: 0.35rem; text-align: center; line-height: 1.4; }

        .aprf-hero-info { flex: 1; min-width: 0; }
        .aprf-hero-name { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; color: #0F172A; margin-bottom: 0.3rem; }
        .aprf-hero-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .aprf-role-tag { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.65rem; font-weight: 800; background: #EEF2FF; color: #4F46E5; padding: 0.25rem 0.65rem; border-radius: 99px; border: 1px solid #C7D2FE; letter-spacing: 0.04em; text-transform: uppercase; }

        .aprf-panel {
          background: rgba(253,253,255,0.93); backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(79,70,229,0.09); box-shadow: 0 2px 14px rgba(79,70,229,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden; opacity: 0; transform: translateY(10px); animation: aprfin 0.5s 0.15s cubic-bezier(.22,1,.36,1) forwards;
        }
        .aprf-section { padding: 1.5rem; border-bottom: 1px solid rgba(79,70,229,0.06); }
        .aprf-section:last-child { border-bottom: none; }
        .aprf-section-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.2rem; }
        .aprf-section-ico { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .aprf-section-title { font-size: 0.75rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; }

        .aprf-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        @media (max-width: 640px) { .aprf-grid-2 { grid-template-columns: 1fr; } }

        .aprf-field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
        .aprf-field.no-margin { margin-bottom: 0; }
        .aprf-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #4B5563; display: flex; justify-content: space-between; }
        .aprf-label .opt { font-weight: 500; color: #9CA3AF; text-transform: none; letter-spacing: 0; font-size: 0.65rem; }

        .aprf-input {
          width: 100%; min-height: 46px; padding: 0 1rem;
          border-radius: 10px; border: 1px solid rgba(79,70,229,0.15); background: rgba(255,255,255,0.85);
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #111827; font-weight: 500;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .aprf-input.mono { font-family: 'DM Mono', monospace; font-size: 0.9rem; font-weight: 600; letter-spacing: 0.05em; }
        .aprf-input:focus { border-color: rgba(79,70,229,0.5); box-shadow: 0 0 0 3px rgba(79,70,229,0.09); background: white; }
        .aprf-input:disabled { background: #F8FAFC; color: #64748B; cursor: not-allowed; border-color: rgba(79,70,229,0.05); font-weight: 600; }
        
        .aprf-footer { padding: 1.5rem; background: rgba(248,250,252,0.5); display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .aprf-btn-primary {
          height: 46px; padding: 0 1.5rem;
          background: linear-gradient(135deg,#4F46E5,#6366F1); border: none; border-radius: 10px; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.02em;
          cursor: pointer; display: flex; align-items: center; gap: 0.45rem; box-shadow: 0 4px 14px rgba(79,70,229,0.28);
          transition: transform 0.15s, box-shadow 0.2s; white-space: nowrap;
        }
        .aprf-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,0.38); }
        .aprf-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .aprf-btn-secondary {
          height: 46px; padding: 0 1.25rem;
          background: white; border: 1px solid rgba(79,70,229,0.2); border-radius: 10px; color: #4F46E5;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 0.45rem;
          transition: background 0.15s; white-space: nowrap;
        }
        .aprf-btn-secondary:hover:not(:disabled) { background: #EEF2FF; }

        .aprf-spinner-btn { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: aprfspin 0.7s linear infinite; }
        .aprf-toast { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1rem; border-radius: 10px; font-size: 0.8rem; font-weight: 700; border: 1px solid; animation: aprfin 0.3s cubic-bezier(.22,1,.36,1); width: 100%; }
        .aprf-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .aprf-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }

        @keyframes aprfin  { to { opacity: 1; transform: translateY(0); } }
        @keyframes aprfspin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="aprf-wrap">
        {/* Header */}
        <div className="aprf-header">
          <div className="aprf-eyebrow"><div className="aprf-eyebrow-dot" />Direction Globale</div>
          <h1 className="aprf-title">Mon profil <span>Super Admin</span></h1>
        </div>

        {/* Hero */}
        <div className="aprf-hero">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div className="aprf-avatar-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />

              <div
                className="aprf-avatar"
                onClick={() => !avatarUploading && fileInputRef.current?.click()}
                title="Changer la photo de profil"
              >
                {displayAvatar ? (
                  <Image
                    src={displayAvatar}
                    alt={`${firstName} ${lastName}`}
                    width={80}
                    height={80}
                    style={{ borderRadius: '20px', objectFit: 'cover' }}
                    unoptimized={!!avatarPreview} 
                  />
                ) : (
                  <span>{initials || 'SA'}</span>
                )}
              </div>

              {!avatarUploading && (
                <div
                  className="aprf-avatar-overlay"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  Photo
                </div>
              )}

              {avatarUploading && (
                <div className="aprf-avatar-spinner">
                  <div className="aprf-spinner-ring" />
                </div>
              )}
            </div>
            <div className="aprf-avatar-hint">JPG, PNG, WEBP<br />max 5 Mo</div>
          </div>

          <div className="aprf-hero-info">
            <h2 className="aprf-hero-name">
              {firstName || lastName ? `${firstName} ${lastName}` : 'Super Administrateur'}
            </h2>
            <div className="aprf-hero-meta">
              <span className="aprf-role-tag">
                <div style={{ width: 5, height: 5, background: '#4F46E5', borderRadius: '50%' }} />
                Super Administrateur
              </span>
              <span className="aprf-role-tag" style={{ background: '#F3F4F6', color: '#4B5563', borderColor: '#D1D5DB' }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                {association?.name || 'Association Globale'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="aprf-panel">

            {/* ── Identité ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
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
                <label className="aprf-label">Fonction Officielle</label>
                <input className="aprf-input" value={associationTitle} onChange={e => setAssociationTitle(e.target.value)} disabled={!isEditing} placeholder="Ex: Président, Secrétaire Général..." />
              </div>
            </div>

            {/* ── Adresse ── */}
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

            {/* ── Origine ── */}
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

            {/* ── Association (Read-only) ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#F3F4F6', color: '#4B5563' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
                <span className="aprf-section-title">Informations de l&apos;Association</span>
              </div>
              <div className="aprf-grid-2">
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Nom légal <span className="opt">(Géré dans Paramètres)</span></label>
                  <input className="aprf-input" value={association?.legalName || association?.name || '—'} disabled />
                </div>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">N° Enregistrement</label>
                  <input className="aprf-input mono" value={association?.registrationNumber || '—'} disabled />
                </div>
              </div>
              <div className="aprf-grid-2" style={{ marginTop: '1rem' }}>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Siège social</label>
                  <input className="aprf-input" value={`${association?.city || '—'}, ${association?.country || '—'}`} disabled />
                </div>
                <div className="aprf-field no-margin">
                  <label className="aprf-label">Devise principale</label>
                  <input className="aprf-input mono" value={association?.defaultCurrency || 'EUR'} disabled />
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="aprf-footer">
              {!isEditing ? (
                <button type="button" className="aprf-btn-primary" onClick={() => setIsEditing(true)}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Modifier mes informations
                </button>
              ) : (
                <>
                  <button type="button" className="aprf-btn-secondary" onClick={handleCancel} disabled={saving}>Annuler</button>
                  <button type="submit" className="aprf-btn-primary" disabled={saving}>
                    {saving
                      ? <><div className="aprf-spinner-btn" />Enregistrement…</>
                      : <><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Enregistrer</>
                    }
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