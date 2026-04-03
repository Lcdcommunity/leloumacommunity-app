//web/app/(protected)/admin/profile/page.tsx
'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type FullUserProfile } from '../../../../lib/api-client';

type ExtendedAdminProfile = FullUserProfile & {
  associationTitle?: string | null;
  avatarUrl?: string | null;
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
  const [me, setMe]             = useState<ExtendedAdminProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [message, setMessage]   = useState<{ text: string; ok: boolean } | null>(null);

  const fileInputRef            = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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

  const [antennaName, setAntennaName]       = useState('');
  const [antennaCode, setAntennaCode]       = useState('');
  const [antennaCity, setAntennaCity]       = useState('');
  const [antennaCountry, setAntennaCountry] = useState('');
  const [antennaCurrency, setAntennaCurrency] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const user = await api.getMyProfile() as ExtendedAdminProfile;
        setMe(user);
        populateFields(user);
        setAvatarUrl(user.avatarUrl ?? null);
      } catch (err) {
        setMessage({ text: err instanceof Error ? err.message : 'Erreur de chargement', ok: false });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function populateFields(user: ExtendedAdminProfile | null) {
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
    setAssociationTitle(user.associationTitle || user.function || '');
    const ant = user.adminAssignments?.[0]?.antenna ?? user.antenna;
    if (ant) {
      setAntennaName(ant.name || '');
      setAntennaCode(ant.code || '');
      setAntennaCity(ant.city || '');
      setAntennaCountry(ant.country || '');
      setAntennaCurrency(ant.defaultCurrency || '');
    }
  }

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
      const payload: Record<string, string | undefined> = {
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

  const displayAvatar = avatarPreview ?? avatarUrl;
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

  if (loading) {
    return (
      <AppShell title="Mon profil admin">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#6B7280', fontFamily: "'DM Sans', sans-serif" }}>
          Chargement du profil…
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
          max-width: 960px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .aprf-header {
          margin-bottom: 1.75rem;
          opacity: 0; transform: translateY(12px);
          animation: aprfin 0.55s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .aprf-eyebrow {
          font-size: 0.67rem; font-weight: 700; letter-spacing: 0.13em;
          text-transform: uppercase; color: #2563EB; margin-bottom: 0.4rem;
          display: flex; align-items: center; gap: 0.45rem;
        }
        .aprf-eyebrow-dot {
          width: 6px; height: 6px; background: #3B82F6; border-radius: 50%;
          animation: aprfpulse 2s ease-in-out infinite;
        }
        @keyframes aprfpulse { 0%,100%{opacity:1;} 50%{opacity:.25;} }
        .aprf-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.6rem, 3.5vw, 2.1rem);
          font-weight: 600; color: #0F172A;
          letter-spacing: -0.025em; line-height: 1.1;
        }
        .aprf-title span {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Hero card ── */
        .aprf-hero {
          display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-radius: 22px;
          border: 1px solid rgba(37,99,235,0.10);
          box-shadow: 0 4px 24px rgba(37,99,235,0.07), 0 1px 2px rgba(0,0,0,0.04);
          padding: 1.75rem;
          margin-bottom: 1.25rem;
          opacity: 0; transform: translateY(12px);
          animation: aprfin 0.55s 0.1s cubic-bezier(.22,1,.36,1) forwards;
          position: relative; overflow: hidden;
        }
        /* Subtle decorative gradient top bar */
        .aprf-hero::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #1D4ED8, #3B82F6, #93C5FD);
          border-radius: 22px 22px 0 0;
        }

        /* ── Avatar ── */
        .aprf-avatar-wrap { position: relative; flex-shrink: 0; width: 88px; height: 88px; }
        .aprf-avatar {
          width: 88px; height: 88px; border-radius: 22px;
          background: linear-gradient(145deg, #1E3A8A, #3B82F6);
          display: flex; align-items: center; justify-content: center;
          color: white; font-family: 'Cormorant Garamond', serif;
          font-size: 2.2rem; font-weight: 700;
          box-shadow: 0 6px 20px rgba(37,99,235,0.3);
          overflow: hidden; cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .aprf-avatar:hover { transform: scale(1.04); box-shadow: 0 8px 28px rgba(37,99,235,0.4); }
        .aprf-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 22px; }
        .aprf-avatar-overlay {
          position: absolute; inset: 0; border-radius: 22px;
          background: rgba(15,23,42,0.58);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          opacity: 0; transition: opacity 0.18s; cursor: pointer;
          color: white; font-size: 0.58rem; font-weight: 800;
          letter-spacing: 0.07em; text-transform: uppercase;
        }
        .aprf-avatar-wrap:hover .aprf-avatar-overlay { opacity: 1; }
        .aprf-avatar-spinner {
          position: absolute; inset: 0; border-radius: 22px;
          background: rgba(15,23,42,0.65);
          display: flex; align-items: center; justify-content: center;
        }
        .aprf-spinner-ring {
          width: 28px; height: 28px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: white; border-radius: 50%;
          animation: aprfspin 0.7s linear infinite;
        }
        .aprf-avatar-hint {
          font-size: 0.6rem; color: #94A3B8; font-weight: 500;
          margin-top: 0.4rem; text-align: center; line-height: 1.45;
        }

        .aprf-hero-info { flex: 1; min-width: 0; }
        .aprf-hero-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75rem; font-weight: 700; color: #0F172A;
          margin-bottom: 0.45rem; letter-spacing: -0.02em;
        }
        .aprf-hero-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .aprf-role-tag {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.63rem; font-weight: 800;
          background: #EFF6FF; color: #1D4ED8;
          padding: 0.28rem 0.7rem; border-radius: 99px;
          border: 1px solid #BFDBFE; letter-spacing: 0.05em; text-transform: uppercase;
        }
        .aprf-role-dot { width: 5px; height: 5px; background: #3B82F6; border-radius: 50%; }
        .aprf-antenna-tag {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.63rem; font-weight: 700;
          background: #F8FAFC; color: #475569;
          padding: 0.28rem 0.7rem; border-radius: 99px;
          border: 1px solid #E2E8F0; letter-spacing: 0.03em; text-transform: uppercase;
        }
        .aprf-hero-email {
          margin-top: 0.5rem;
          font-size: 0.8rem; color: #64748B; font-weight: 500;
          display: flex; align-items: center; gap: 0.4rem;
        }

        /* ── Panel ── */
        .aprf-panel {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px); border-radius: 22px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 4px 24px rgba(37,99,235,0.06), 0 1px 2px rgba(0,0,0,0.03);
          overflow: hidden;
          opacity: 0; transform: translateY(12px);
          animation: aprfin 0.55s 0.18s cubic-bezier(.22,1,.36,1) forwards;
        }

        /* ── Section ── */
        .aprf-section {
          padding: 1.5rem 1.75rem;
          border-bottom: 1px solid rgba(37,99,235,0.06);
        }
        .aprf-section:last-child { border-bottom: none; }

        .aprf-section-head {
          display: flex; align-items: center; gap: 0.7rem;
          margin-bottom: 1.25rem;
        }
        .aprf-section-ico {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        /* Blue section titles as requested */
        .aprf-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem; font-weight: 600;
          color: #1D4ED8;
          letter-spacing: -0.01em;
        }
        .aprf-section-divider {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, rgba(37,99,235,0.15), transparent);
        }

        /* ── Grid layouts ── */
        .aprf-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem 1.25rem;
        }
        .aprf-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1rem 1.25rem;
        }
        .aprf-col-full { grid-column: 1 / -1; }

        @media (max-width: 640px) {
          .aprf-grid-2, .aprf-grid-3 { grid-template-columns: 1fr; }
          .aprf-col-full { grid-column: 1; }
        }

        /* ── Fields ── */
        .aprf-field { display: flex; flex-direction: column; gap: 0.38rem; }
        .aprf-label {
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: #475569;
          display: flex; justify-content: space-between; align-items: center;
        }
        .aprf-label .opt {
          font-weight: 500; color: #94A3B8; text-transform: none;
          letter-spacing: 0; font-size: 0.63rem;
        }
        .aprf-input {
          width: 100%; height: 46px; padding: 0 1rem;
          border-radius: 11px; border: 1.5px solid rgba(37,99,235,0.13);
          background: rgba(248,250,252,0.8);
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
          color: #0F172A; font-weight: 500;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          box-sizing: border-box;
        }
        .aprf-input.mono {
          font-family: 'DM Mono', monospace; font-size: 0.875rem;
          font-weight: 600; letter-spacing: 0.04em;
          color: #1D4ED8;
        }
        .aprf-input:focus {
          border-color: rgba(37,99,235,0.5);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
          background: white;
        }
        .aprf-input:not(:disabled):not(:focus) { background: white; }
        .aprf-input:disabled {
          background: #F8FAFC; color: #64748B;
          cursor: default; border-color: rgba(37,99,235,0.06);
        }
        .aprf-input-readonly {
          background: rgba(241,245,249,0.7) !important;
          color: #64748B !important;
          border-color: rgba(37,99,235,0.06) !important;
          font-style: italic;
        } /* ── Antenna cards (read-only) ── */
        .aprf-info-card {
          background: linear-gradient(135deg, #EFF6FF, #F0F9FF);
          border: 1px solid #BFDBFE; border-radius: 12px;
          padding: 1rem 1.1rem;
          display: flex; flex-direction: column; gap: 0.25rem;
        }
        .aprf-info-card-label {
          font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: #3B82F6;
        }
        .aprf-info-card-value {
          font-size: 0.9rem; font-weight: 600; color: #1E3A8A;
          font-family: 'DM Sans', sans-serif;
        }
        .aprf-info-card-value.mono {
          font-family: 'DM Mono', monospace; font-size: 0.875rem;
          letter-spacing: 0.04em;
        }

        /* ── Footer ── */
        .aprf-footer {
          padding: 1.25rem 1.75rem;
          border-top: 1px solid rgba(37,99,235,0.07);
          display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
          background: rgba(248,250,252,0.5);
        }
        .aprf-btn-primary {
          height: 46px; padding: 0 1.5rem;
          background: linear-gradient(135deg, #1D4ED8, #2563EB);
          border: none; border-radius: 11px; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem;
          font-weight: 700; letter-spacing: 0.02em;
          cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem;
          box-shadow: 0 4px 16px rgba(37,99,235,0.3);
          transition: transform 0.15s, box-shadow 0.2s; white-space: nowrap;
        }
        .aprf-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(37,99,235,0.4);
        }
        .aprf-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .aprf-btn-secondary {
          height: 46px; padding: 0 1.25rem;
          background: white; border: 1.5px solid rgba(37,99,235,0.2);
          border-radius: 11px; color: #1D4ED8;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700;
          cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem;
          transition: background 0.15s, border-color 0.15s; white-space: nowrap;
        }
        .aprf-btn-secondary:hover:not(:disabled) {
          background: #EFF6FF; border-color: rgba(37,99,235,0.35);
        }
        .aprf-spinner-btn {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: aprfspin 0.7s linear infinite;
        }

        /* ── Toast ── */
        .aprf-toast {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.65rem 1rem; border-radius: 11px;
          font-size: 0.8rem; font-weight: 700; border: 1px solid;
          animation: aprfin 0.3s cubic-bezier(.22,1,.36,1);
        }
        .aprf-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .aprf-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }

        @keyframes aprfin  { to { opacity: 1; transform: translateY(0); } }
        @keyframes aprfspin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="aprf-wrap">

        {/* ── Header ── */}
        <div className="aprf-header">
          <div className="aprf-eyebrow">
            <div className="aprf-eyebrow-dot" />
            Admin antenne
          </div>
          <h1 className="aprf-title">Mon profil <span>admin</span></h1>
        </div>

        {/* ── Hero ── */}
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
                    width={88} height={88}
                    style={{ borderRadius: '22px', objectFit: 'cover' }}
                    unoptimized={!!avatarPreview}
                  />
                ) : (
                  <span>{initials || '?'}</span>
                )}
              </div>
              {!avatarUploading && (
                <div className="aprf-avatar-overlay" onClick={() => fileInputRef.current?.click()}>
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
              {firstName || lastName ? `${firstName} ${lastName}` : 'Administrateur'}
            </h2>
            <div className="aprf-hero-meta">
              <span className="aprf-role-tag">
                <span className="aprf-role-dot" />
                Administrateur
              </span>
              <span className="aprf-antenna-tag">
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {antennaName || 'Non assignée'}
              </span>
            </div>
            {me?.email && (
              <div className="aprf-hero-email">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                {me.email}
              </div>
            )}
          </div>
        </div>

        {/* ── Form panel ── */}
        <form onSubmit={handleSubmit}>
          <div className="aprf-panel">

            {/* ── Identité & Contact ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#EFF6FF' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </div>
                <span className="aprf-section-title">Identité &amp; Contact</span>
                <div className="aprf-section-divider" />
              </div>

              {/* Row 1: Prénom + Nom */}
              <div className="aprf-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="aprf-field">
                  <label className="aprf-label">Prénom</label>
                  <input className="aprf-input" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={!isEditing} required />
                </div>
                <div className="aprf-field">
                  <label className="aprf-label">Nom</label>
                  <input className="aprf-input" value={lastName} onChange={e => setLastName(e.target.value)} disabled={!isEditing} required />
                </div>
              </div>

              {/* Row 2: Téléphone + Titre */}
              <div className="aprf-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="aprf-field">
                  <label className="aprf-label">Téléphone</label>
                  <input className="aprf-input" value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} placeholder="+33 6 …" />
                </div>
                <div className="aprf-field">
                  <label className="aprf-label">
                    Poste occupé
                    <span className="opt">Admin</span>
                  </label>
                  <input className="aprf-input aprf-input-readonly" value={associationTitle || 'Non défini'} disabled />
                </div>
              </div>

              {/* Row 3: Email (full width) */}
              <div className="aprf-field">
                <label className="aprf-label">
                  Email
                  <span className="opt">Non modifiable</span>
                </label>
                <input className="aprf-input aprf-input-readonly" value={me?.email || ''} disabled />
              </div>
            </div>

            {/* ── Adresse ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#F0FDFA' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#0D9488" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                  </svg>
                </div>
                <span className="aprf-section-title">Adresse de résidence</span>
                <div className="aprf-section-divider" />
              </div>

              {/* Row 1: Adresse 1 + Adresse 2 */}
              <div className="aprf-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="aprf-field">
                  <label className="aprf-label">Adresse ligne 1</label>
                  <input className="aprf-input" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} disabled={!isEditing} placeholder="N° et nom de rue" />
                </div>
                <div className="aprf-field">
                  <label className="aprf-label">
                    Adresse ligne 2
                    <span className="opt">Optionnel</span>
                  </label>
                  <input className="aprf-input" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} disabled={!isEditing} placeholder="Appartement, bâtiment…" />
                </div>
              </div>

              {/* Row 2: Code postal + Ville + Pays */}
              <div className="aprf-grid-3">
                <div className="aprf-field">
                  <label className="aprf-label">Code Postal</label>
                  <input className="aprf-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} disabled={!isEditing} placeholder="75001" />
                </div>
                <div className="aprf-field">
                  <label className="aprf-label">Ville</label>
                  <input className="aprf-input" value={city} onChange={e => setCity(e.target.value)} disabled={!isEditing} placeholder="Paris" />
                </div>
                <div className="aprf-field">
                  <label className="aprf-label">Pays</label>
                  <input className="aprf-input" value={country} onChange={e => setCountry(e.target.value)} disabled={!isEditing} placeholder="France" />
                </div>
              </div>
            </div>

            {/* ── Origine communautaire ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#FFFBEB' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="aprf-section-title">Origine communautaire</span>
                <div className="aprf-section-divider" />
              </div>
              <div className="aprf-field">
                <label className="aprf-label">Commune d&apos;origine</label>
                <input className="aprf-input" value={originSubPrefecture} onChange={e => setOriginSubPrefecture(e.target.value)} disabled={!isEditing} placeholder="Ex : Lélouma Centre" />
              </div>
            </div>

            {/* ── Informations de l'antenne ── */}
            <div className="aprf-section">
              <div className="aprf-section-head">
                <div className="aprf-section-ico" style={{ background: '#F1F5F9' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#475569" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                  </svg>
                </div>
                <span className="aprf-section-title">Informations de l&apos;antenne</span>
                <div className="aprf-section-divider" />
              </div>
              {/* Antenna info cards (read-only, styled differently) */}
              <div className="aprf-grid-2" style={{ marginBottom: '1rem' }}>
                <div className="aprf-info-card">
                  <span className="aprf-info-card-label">Nom de l&apos;antenne</span>
                  <span className="aprf-info-card-value">{antennaName || '—'}</span>
                </div>
                <div className="aprf-info-card">
                  <span className="aprf-info-card-label">Code identifiant</span>
                  <span className="aprf-info-card-value mono">{antennaCode || '—'}</span>
                </div>
              </div>
              <div className="aprf-grid-2">
                <div className="aprf-info-card">
                  <span className="aprf-info-card-label">Ville / Pays</span>
                  <span className="aprf-info-card-value">{antennaCity || '—'}, {antennaCountry || '—'}</span>
                </div>
                <div className="aprf-info-card">
                  <span className="aprf-info-card-label">Devise par défaut</span>
                  <span className="aprf-info-card-value mono">{antennaCurrency || '—'}</span>
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="aprf-footer">
              {!isEditing ? (
                <button type="button" className="aprf-btn-primary" onClick={() => setIsEditing(true)}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                  Modifier mes informations
                </button>
              ) : (
                <>
                  <button type="button" className="aprf-btn-secondary" onClick={handleCancel} disabled={saving}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Annuler
                  </button>
                  <button type="submit" className="aprf-btn-primary" disabled={saving}>
                    {saving ? (
                      <><div className="aprf-spinner-btn" />Enregistrement…</>
                    ) : (
                      <>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                        Enregistrer
                      </>
                    )}
                  </button>
                </>
              )}
              {message && (
                <div className={`aprf-toast ${message.ok ? 'ok' : 'err'}`}>
                  {message.ok
                    ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
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