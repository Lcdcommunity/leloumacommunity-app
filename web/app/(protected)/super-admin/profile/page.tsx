//web/app/(protected)/super-admin/profile/page.tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type FullUserProfile } from '../../../../lib/api-client';
import type { Association } from '../../../../types/association';

type FlashMessage = { text: string; ok: boolean } | null;

function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const apiBase = fromEnv
    ? fromEnv.replace(/\/$/, '')
    : typeof window !== 'undefined'
      ? `http://${window.location.hostname}:3001/api`
      : 'http://localhost:3001/api';

  const base = apiBase.replace(/\/api$/, '');
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

export default function SuperAdminProfilePage() {
  const [me, setMe] = useState<FullUserProfile | null>(null);
  const [association, setAssociation] = useState<Association | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<FlashMessage>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [user, assocData] = await Promise.all([
          api.getMyProfile(),
          api.getAssociation().catch(() => null),
        ]);

        if (!isMounted) return;

        setMe(user);
        setAssociation(assocData);
        populateFields(user);
      } catch (err) {
        if (!isMounted) return;
        setMessage({
          text: err instanceof Error ? err.message : 'Erreur de chargement',
          ok: false,
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

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

  function handleCancel() {
    populateFields(me);
    setIsEditing(false);
    setMessage(null);
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.uploadAvatar(formData);
      const newUrl = res.avatarUrl ?? res.profilePhotoUrl ?? res.user?.avatarUrl ?? null;

      setMe((prev) => (prev ? { ...prev, avatarUrl: newUrl } : prev));
      setAvatarPreview(null);
      setMessage({ text: 'Photo de profil mise à jour !', ok: true });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setAvatarPreview(null);
      setMessage({
        text: err instanceof Error ? err.message : 'Erreur lors du téléchargement.',
        ok: false,
      });
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleQuickAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    const maxMb = 5;

    if (file.size > maxMb * 1024 * 1024) {
      e.target.value = '';
      setMessage({ text: `Image trop volumineuse (max ${maxMb} Mo).`, ok: false });
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      e.target.value = '';
      setMessage({ text: 'Format non supporté. Utilisez JPG, PNG, WEBP ou GIF.', ok: false });
      return;
    }

    if (avatarPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);

    await uploadAvatar(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: Partial<FullUserProfile> = {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        associationTitle: associationTitle.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        originSubPrefecture: originSubPrefecture.trim() || undefined,
      };

      const updated = await api.updateMyProfile(payload);
      setMe(updated);
      populateFields(updated);
      setIsEditing(false);
      setMessage({ text: 'Profil mis à jour avec succès.', ok: true });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Erreur de sauvegarde',
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  }

  const displayAvatar = useMemo(
    () => avatarPreview ?? resolveMediaUrl(me?.avatarUrl ?? null),
    [avatarPreview, me?.avatarUrl],
  );

  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

  if (loading) {
    return (
      <AppShell title="Mon profil Super Admin">
        <style>{`
          @keyframes saprfspin { to { transform: rotate(360deg); } }
        `}</style>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem',
            color: '#B91C1C',
            fontFamily: "'DM Sans', sans-serif",
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              border: '2.5px solid rgba(185,28,28,0.15)',
              borderTopColor: '#B91C1C',
              borderRadius: '50%',
              animation: 'saprfspin 0.8s linear infinite',
            }}
          />
          Chargement du profil global…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mon profil Super Admin">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@500&display=swap');

        .saprf-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 960px;
          margin: 0 auto;
        }

        .saprf-header-block {
          margin-bottom: 1.75rem;
          opacity: 0;
          transform: translateY(12px);
          animation: saprfin 0.55s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }

        .saprf-eyebrow {
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #B91C1C;
          margin-bottom: 0.4rem;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .saprf-eyebrow-dot {
          width: 6px;
          height: 6px;
          background: #DC2626;
          border-radius: 50%;
          animation: saprfpulse 2s ease-in-out infinite;
        }

        @keyframes saprfpulse {
          0%,100% { opacity: 1; }
          50% { opacity: .25; }
        }

        .saprf-page-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.6rem, 3.5vw, 2.1rem);
          font-weight: 600;
          color: #991B1B;
          letter-spacing: -0.025em;
          line-height: 1.1;
        }

        .saprf-page-title span {
          color: #DC2626;
        }

        .saprf-hero {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-radius: 22px;
          border: 1px solid rgba(220,38,38,0.12);
          box-shadow: 0 4px 24px rgba(220,38,38,0.08), 0 1px 2px rgba(0,0,0,0.04);
          padding: 1.75rem;
          margin-bottom: 1.25rem;
          opacity: 0;
          transform: translateY(12px);
          animation: saprfin 0.55s 0.1s cubic-bezier(.22,1,.36,1) forwards;
          position: relative;
          overflow: hidden;
        }

        .saprf-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #991B1B, #DC2626, #FCA5A5);
          border-radius: 22px 22px 0 0;
        }

        .saprf-avatar-wrap {
          position: relative;
          flex-shrink: 0;
          width: 96px;
          height: 96px;
        }

        .saprf-avatar {
          width: 96px;
          height: 96px;
          border-radius: 22px;
          background: linear-gradient(145deg, #991B1B, #DC2626);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.3rem;
          font-weight: 700;
          box-shadow: 0 6px 20px rgba(220,38,38,0.30);
          overflow: hidden;
        }

        .saprf-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 22px;
        }

        .saprf-avatar-spinner {
          position: absolute;
          inset: 0;
          border-radius: 22px;
          background: rgba(127,29,29,0.65);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .saprf-spinner-ring {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: saprfspin 0.7s linear infinite;
        }

        .saprf-avatar-edit-btn {
          position: absolute;
          right: -6px;
          bottom: -6px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          background: linear-gradient(135deg, #991B1B, #DC2626);
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(220,38,38,0.28);
          transition: transform 0.18s, box-shadow 0.18s;
        }

        .saprf-avatar-edit-btn:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 8px 22px rgba(220,38,38,0.34);
        }

        .saprf-hidden-file-input {
          display: none;
        }

        .saprf-hero-info {
          flex: 1;
          min-width: 0;
        }

        .saprf-hero-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #991B1B;
          margin-bottom: 0.45rem;
          letter-spacing: -0.02em;
        }

        .saprf-hero-name em {
          color: #DC2626;
          font-style: italic;
        }

        .saprf-hero-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .saprf-role-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.63rem;
          font-weight: 800;
          background: #FEF2F2;
          color: #991B1B;
          padding: 0.28rem 0.7rem;
          border-radius: 99px;
          border: 1px solid #FECACA;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .saprf-role-dot {
          width: 5px;
          height: 5px;
          background: #DC2626;
          border-radius: 50%;
        }

        .saprf-assoc-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.63rem;
          font-weight: 700;
          background: #FFF7ED;
          color: #C2410C;
          padding: 0.28rem 0.7rem;
          border-radius: 99px;
          border: 1px solid #FED7AA;
          letter-spacing: 0.03em;
        }

        .saprf-compact-feedback {
          margin-bottom: 1rem;
        }

        .saprf-panel {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-radius: 22px;
          border: 1px solid rgba(220,38,38,0.09);
          box-shadow: 0 4px 24px rgba(220,38,38,0.06), 0 1px 2px rgba(0,0,0,0.03);
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          animation: saprfin 0.55s 0.2s cubic-bezier(.22,1,.36,1) forwards;
        }

        .saprf-section {
          padding: 1.5rem 1.75rem;
          border-bottom: 1px solid rgba(220,38,38,0.06);
        }

        .saprf-section:last-child {
          border-bottom: none;
        }

        .saprf-section-head {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .saprf-section-ico {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .saprf-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: #991B1B;
          letter-spacing: -0.01em;
        }

        .saprf-section-divider {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(220,38,38,0.18), transparent);
          min-width: 60px;
        }

        .saprf-grid-2-keep {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem 1.25rem;
        }

        .saprf-field {
          display: flex;
          flex-direction: column;
          gap: 0.38rem;
          min-width: 0;
        }

        .saprf-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #B91C1C;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .saprf-label .opt {
          font-weight: 500;
          color: #94A3B8;
          text-transform: none;
          letter-spacing: 0;
          font-size: 0.63rem;
        }

        .saprf-input {
          width: 100%;
          height: 46px;
          padding: 0 1rem;
          border-radius: 11px;
          border: 1.5px solid rgba(220,38,38,0.15);
          background: #ffffff;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          color: #000000;
          font-weight: 500;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
          -webkit-appearance: none;
          appearance: none;
        }

        .saprf-input:focus {
          border-color: rgba(220,38,38,0.55);
          box-shadow: 0 0 0 3px rgba(220,38,38,0.10);
        }

        .saprf-input:disabled {
          background: #ffffff;
          color: #000000;
          cursor: default;
          border-color: rgba(220,38,38,0.10);
        }

        .saprf-input::placeholder {
          color: rgba(0,0,0,0.35);
        }

        .saprf-input-readonly {
          background: #ffffff !important;
          color: #000000 !important;
          border-color: rgba(220,38,38,0.10) !important;
        }

        .saprf-input.mono {
          font-family: 'DM Mono', monospace;
        }

        .saprf-footer {
          padding: 1.25rem 1.75rem;
          border-top: 1px solid rgba(220,38,38,0.07);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          background: rgba(254,242,242,0.35);
        }

        .saprf-btn-primary {
          height: 46px;
          padding: 0 1.5rem;
          background: linear-gradient(135deg, #991B1B, #DC2626);
          border: none;
          border-radius: 11px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          box-shadow: 0 4px 16px rgba(220,38,38,0.28);
          transition: transform 0.15s, box-shadow 0.2s;
          white-space: nowrap;
        }

        .saprf-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(220,38,38,0.38);
        }

        .saprf-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .saprf-btn-secondary {
          height: 46px;
          padding: 0 1.25rem;
          background: #ffffff;
          border: 1.5px solid rgba(220,38,38,0.22);
          border-radius: 11px;
          color: #991B1B;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap;
        }

        .saprf-btn-secondary:hover:not(:disabled) {
          background: #FEF2F2;
          border-color: rgba(220,38,38,0.38);
        }

        .saprf-spinner-btn {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: saprfspin 0.7s linear infinite;
        }

        .saprf-toast {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border-radius: 11px;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1px solid;
          animation: saprfin 0.3s cubic-bezier(.22,1,.36,1);
        }

        .saprf-toast.ok {
          background: #ECFDF5;
          color: #065F46;
          border-color: #A7F3D0;
        }

        .saprf-toast.err {
          background: #FEF2F2;
          color: #B91C1C;
          border-color: #FECACA;
        }

        @keyframes saprfin {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes saprfspin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .saprf-wrap {
            padding: 0.85rem 0.85rem 4rem;
          }

          .saprf-section {
            padding: 1.1rem 1rem;
          }

          .saprf-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .saprf-btn-primary,
          .saprf-btn-secondary,
          .saprf-toast {
            width: 100%;
            justify-content: center;
          }

          .saprf-avatar-wrap {
            width: 84px;
            height: 84px;
          }

          .saprf-avatar {
            width: 84px;
            height: 84px;
          }

          .saprf-avatar-edit-btn {
            width: 34px;
            height: 34px;
            right: -4px;
            bottom: -4px;
          }
        }

        @media (max-width: 430px) {
          .saprf-grid-2-keep {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="saprf-wrap">
        <div className="saprf-header-block">
          <div className="saprf-eyebrow">
            <div className="saprf-eyebrow-dot" />
            Direction globale
          </div>
          <h1 className="saprf-page-title">
            Mon profil <span>Super Admin</span>
          </h1>
        </div>

        <div className="saprf-hero">
          <div className="saprf-avatar-wrap">
            {displayAvatar ? (
              <div className="saprf-avatar">
                <Image
                  src={displayAvatar}
                  alt={`${firstName} ${lastName}`}
                  width={96}
                  height={96}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '22px' }}
                  unoptimized
                />
              </div>
            ) : (
              <div className="saprf-avatar">
                <span>{initials || 'SA'}</span>
              </div>
            )}

            <button
              type="button"
              className="saprf-avatar-edit-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Changer la photo de profil"
              title="Changer la photo"
              disabled={avatarUploading}
            >
              <svg
                width="17"
                height="17"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            <input
              ref={fileInputRef}
              className="saprf-hidden-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleQuickAvatarChange}
            />

            {avatarUploading && (
              <div className="saprf-avatar-spinner">
                <div className="saprf-spinner-ring" />
              </div>
            )}
          </div>

          <div className="saprf-hero-info">
            <h2 className="saprf-hero-name">
              {firstName || lastName ? (
                <>
                  {firstName} <em>{lastName}</em>
                </>
              ) : (
                'Super Administrateur'
              )}
            </h2>

            <div className="saprf-hero-meta">
              <span className="saprf-role-tag">
                <span className="saprf-role-dot" />
                Super Administrateur
              </span>

              <span className="saprf-assoc-tag">
                <svg
                  width="12"
                  height="12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                {association?.name || 'Association Globale'}
              </span>
            </div>
          </div>
        </div>

        {message && (
          <div className="saprf-compact-feedback">
            <div className={`saprf-toast ${message.ok ? 'ok' : 'err'}`}>
              {message.ok ? (
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
              )}
              {message.text}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="saprf-panel">
            <div className="saprf-section">
              <div className="saprf-section-head">
                <div className="saprf-section-ico" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span className="saprf-section-title">Identité &amp; Contact</span>
                <div className="saprf-section-divider" />
              </div>

              <div className="saprf-grid-2-keep" style={{ marginBottom: '1rem' }}>
                <div className="saprf-field">
                  <label className="saprf-label">Prénom</label>
                  <input
                    className="saprf-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div className="saprf-field">
                  <label className="saprf-label">Nom</label>
                  <input
                    className="saprf-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>

              <div className="saprf-grid-2-keep" style={{ marginBottom: '1rem' }}>
                <div className="saprf-field">
                  <label className="saprf-label">
                    Email
                    <span className="opt">Non modifiable</span>
                  </label>
                  <input className="saprf-input saprf-input-readonly" value={me?.email || ''} disabled />
                </div>

                <div className="saprf-field">
                  <label className="saprf-label">Téléphone</label>
                  <input
                    className="saprf-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isEditing}
                    placeholder="+33 6 ..."
                  />
                </div>
              </div>

              <div className="saprf-field">
                <label className="saprf-label">Fonction officielle</label>
                <input
                  className="saprf-input"
                  value={associationTitle}
                  onChange={(e) => setAssociationTitle(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Ex : Président, Secrétaire Général..."
                />
              </div>
            </div>

            <div className="saprf-section">
              <div className="saprf-section-head">
                <div className="saprf-section-ico" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <span className="saprf-section-title">Adresse de résidence</span>
                <div className="saprf-section-divider" />
              </div>

              <div className="saprf-field" style={{ marginBottom: '1rem' }}>
                <label className="saprf-label">Adresse 1</label>
                <input
                  className="saprf-input"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  disabled={!isEditing}
                  placeholder="N° et nom de rue"
                />
              </div>

              <div className="saprf-field" style={{ marginBottom: '1rem' }}>
                <label className="saprf-label">
                  Adresse 2
                  <span className="opt">Optionnel</span>
                </label>
                <input
                  className="saprf-input"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Appartement, bâtiment..."
                />
              </div>

              <div className="saprf-grid-2-keep" style={{ marginBottom: '1rem' }}>
                <div className="saprf-field">
                  <label className="saprf-label">Code postal</label>
                  <input
                    className="saprf-input"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Ex : 75001"
                  />
                </div>

                <div className="saprf-field">
                  <label className="saprf-label">Ville</label>
                  <input
                    className="saprf-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Ex : Paris"
                  />
                </div>
              </div>

              <div className="saprf-field">
                <label className="saprf-label">Pays</label>
                <input
                  className="saprf-input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Ex : France"
                />
              </div>
            </div>

            <div className="saprf-section">
              <div className="saprf-section-head">
                <div className="saprf-section-ico" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="saprf-section-title">Origine communautaire</span>
                <div className="saprf-section-divider" />
              </div>

              <div className="saprf-field">
                <label className="saprf-label">Commune d&apos;origine</label>
                <input
                  className="saprf-input"
                  value={originSubPrefecture}
                  onChange={(e) => setOriginSubPrefecture(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Ex : Lélouma Centre"
                />
              </div>
            </div>

            <div className="saprf-section">
              <div className="saprf-section-head">
                <div className="saprf-section-ico" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <span className="saprf-section-title">Informations de l&apos;association</span>
                <div className="saprf-section-divider" />
              </div>

              <div className="saprf-grid-2-keep" style={{ marginBottom: '1rem' }}>
                <div className="saprf-field">
                  <label className="saprf-label">
                    Nom légal
                    <span className="opt">Géré dans Paramètres</span>
                  </label>
                  <input
                    className="saprf-input saprf-input-readonly"
                    value={association?.legalName || association?.name || '—'}
                    disabled
                  />
                </div>

                <div className="saprf-field">
                  <label className="saprf-label">N° Enregistrement</label>
                  <input
                    className="saprf-input saprf-input-readonly mono"
                    value={association?.registrationNumber || '—'}
                    disabled
                  />
                </div>
              </div>

              <div className="saprf-grid-2-keep">
                <div className="saprf-field">
                  <label className="saprf-label">Siège social</label>
                  <input
                    className="saprf-input saprf-input-readonly"
                    value={`${association?.city || '—'}, ${association?.country || '—'}`}
                    disabled
                  />
                </div>

                <div className="saprf-field">
                  <label className="saprf-label">Devise principale</label>
                  <input
                    className="saprf-input saprf-input-readonly mono"
                    value={association?.defaultCurrency || 'EUR'}
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="saprf-footer">
              {!isEditing ? (
                <button
                  type="button"
                  className="saprf-btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  <svg
                    width="15"
                    height="15"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  Modifier mes informations
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="saprf-btn-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Annuler
                  </button>

                  <button type="submit" className="saprf-btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <div className="saprf-spinner-btn" />
                        Enregistrement…
                      </>
                    ) : (
                      <>
                        <svg
                          width="15"
                          height="15"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Enregistrer
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}