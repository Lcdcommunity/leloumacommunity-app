//////// web/app/(protected)/member/profile/page.tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type VirtualCardData, type FullUserProfile } from '../../../../lib/api-client';
import { VirtualCardWidget } from '../../../../components/member/VirtualCardWidget';

type FlashMessage = { text: string; ok: boolean } | null;

function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:3001/api`;
  }

  return 'http://localhost:3001/api';
}

function Avatar({
  firstName,
  lastName,
  profilePhotoUrl,
  size = 86,
}: {
  firstName: string;
  lastName: string;
  profilePhotoUrl?: string | null;
  size?: number;
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  if (profilePhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profilePhotoUrl}
        alt="Photo de profil"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: '0 8px 24px rgba(37,99,235,0.22)',
          border: '3px solid rgba(255,255,255,0.95)',
          flexShrink: 0,
          background: '#EFF6FF',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: size >= 80 ? '1.9rem' : '1.45rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        boxShadow: '0 8px 24px rgba(37,99,235,0.28)',
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </div>
  );
}

export default function MemberProfilePage() {
  const [me, setMe] = useState<FullUserProfile | null>(null);

  const [isEditing, setIsEditing] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [countryOfBirth, setCountryOfBirth] = useState('');
  const [originVillage, setOriginVillage] = useState(''); 
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<FlashMessage>(null);
  const [photoMessage, setPhotoMessage] = useState<FlashMessage>(null);
  const [loading, setLoading] = useState(true);

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const currentPhotoUrl = useMemo(() => {
    if (photoPreviewUrl) {
      return photoPreviewUrl;
    }

    if (!me?.profilePhotoUrl) {
      return null;
    }

    if (/^https?:\/\//i.test(me.profilePhotoUrl)) {
      return me.profilePhotoUrl;
    }

    if (me.profilePhotoUrl.startsWith('/')) {
      return `${apiBaseUrl.replace(/\/api$/, '')}${me.profilePhotoUrl}`;
    }

    return me.profilePhotoUrl;
  }, [apiBaseUrl, me?.profilePhotoUrl, photoPreviewUrl]);

  // Données de la carte blindées et typées à 100% avec l'interface de api-client.ts
  const liveCardData: VirtualCardData | null = me
    ? {
        cardNumber: me.virtualCard?.cardNumber || me.cardNumber || 'EN ATTENTE',
        isLocked: me.virtualCard?.isLocked ?? me.isCardLocked ?? false,
        expiresAt: me.virtualCard?.expiresAt || me.cardExpiresAt || null,
        qrToken: me.virtualCard?.qrToken || me.qrToken || 'preview-token',
        antennaName: me.antenna?.name || me.antennaName || 'Antenne non assignée',
        user: {
          firstName,
          lastName,
          birthDate,
          placeOfBirth,
          originVillage: originVillage || 'Non renseignée', 
          originSubPrefecture: originVillage || 'Non renseignée',
          country,
          city,
          profilePhotoUrl: currentPhotoUrl,
        },
      }
    : null;

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const user = await api.getMyProfile();
        if (!isMounted) return;

        setMe(user);
        populateFields(user);
      } catch (err) {
        if (isMounted) {
          setMessage({
            text: err instanceof Error ? err.message : 'Erreur chargement profil',
            ok: false,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  function populateFields(user: FullUserProfile) {
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhone(user.phone || '');
    setBirthDate(user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '');
    setPlaceOfBirth(user.placeOfBirth || '');
    setCountryOfBirth(user.countryOfBirth || '');
    setOriginVillage(user.originSubPrefecture || user.originVillage || ''); 
    setAddressLine1(user.addressLine1 || '');
    setAddressLine2(user.addressLine2 || '');
    setPostalCode(user.postalCode || '');
    setCity(user.city || '');
    setCountry(user.country || '');
  }

  function handleCancel() {
    if (me) {
      populateFields(me);
    }
    setIsEditing(false);
    setMessage(null);
  }

  function handlePhotoInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoMessage(null);

    if (!file) {
      setSelectedPhotoFile(null);
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setPhotoPreviewUrl(null);
      return;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      e.target.value = '';
      setSelectedPhotoFile(null);
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setPhotoPreviewUrl(null);
      setPhotoMessage({
        text: 'Formats autorisés : JPG, PNG, WEBP.',
        ok: false,
      });
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      e.target.value = '';
      setSelectedPhotoFile(null);
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setPhotoPreviewUrl(null);
      setPhotoMessage({
        text: 'La photo ne doit pas dépasser 5 Mo.',
        ok: false,
      });
      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }

    const nextPreview = URL.createObjectURL(file);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(nextPreview);
  }

  async function handlePhotoUpload() {
    if (!selectedPhotoFile) {
      setPhotoMessage({
        text: 'Sélectionnez d’abord une photo.',
        ok: false,
      });
      return;
    }

    setUploadingPhoto(true);
    setPhotoMessage(null);

    try {
      const result = await api.uploadProfilePhoto(selectedPhotoFile);

      const nextUser = result?.user ?? null;

      if (nextUser) {
        setMe(nextUser);
        populateFields(nextUser);
      } else if (result?.profilePhotoUrl && me) {
        setMe({
          ...me,
          profilePhotoUrl: result.profilePhotoUrl,
        });
      }

      setSelectedPhotoFile(null);
      setPhotoMessage({
        text: result?.message || 'Photo de profil mise à jour avec succès.',
        ok: true,
      });

      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setPhotoPreviewUrl(null);

      const input = document.getElementById('member-profile-photo-input') as HTMLInputElement | null;
      if (input) {
        input.value = '';
      }
    } catch (err) {
      setPhotoMessage({
        text: err instanceof Error ? err.message : 'Erreur upload photo',
        ok: false,
      });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload: Record<string, string | undefined> = {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        birthDate: birthDate || undefined,
        placeOfBirth: placeOfBirth.trim() || undefined,
        countryOfBirth: countryOfBirth.trim() || undefined,
        originSubPrefecture: originVillage.trim() || undefined, 
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      };

      const nextUser = await api.updateMyProfile(payload);

      setMe(nextUser);
      populateFields(nextUser);
      setIsEditing(false);

      setMessage({
        text: 'Profil mis à jour avec succès.',
        ok: true,
      });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Erreur sauvegarde profil',
        ok: false,
      });
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
          padding: clamp(0.9rem, 2.4vw, 2rem);
          max-width: 1100px;
          margin: 0 auto;
        }

        .mpr-hero {
          display: grid;
          grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
          gap: 1rem;
          align-items: stretch;
          margin-bottom: 1.1rem;
        }

        .mpr-hero-card,
        .mpr-panel {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(12px);
          border-radius: 22px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow:
            0 2px 14px rgba(37,99,235,0.06),
            0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          animation: mprin 0.5s cubic-bezier(.22,1,.36,1) forwards;
        }

        .mpr-hero-card {
          padding: 1.1rem;
          animation-delay: 0.03s;
        }

        .mpr-panel {
          animation-delay: 0.08s;
        }

        .mpr-card-panel {
          padding: 2rem 1rem;
          margin-bottom: 1.1rem;
          background: linear-gradient(180deg, rgba(239,246,255,0.45) 0%, rgba(255,255,255,0.85) 100%);
        }

        .mpr-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.15rem;
        }

        .mpr-header-text {
          min-width: 0;
        }

        .mpr-eyebrow {
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #2563EB;
          margin-bottom: 0.3rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .mpr-eyebrow-dot {
          width: 6px;
          height: 6px;
          background: #3B82F6;
          border-radius: 50%;
          animation: mprpulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes mprpulse {
          0%,100% { opacity: 1; }
          50% { opacity: .3; }
        }

        .mpr-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.45rem, 3vw, 2rem);
          font-weight: 600;
          color: #111827;
          letter-spacing: -0.02em;
          line-height: 1.1;
          word-break: break-word;
        }

        .mpr-subtitle {
          font-size: 0.8rem;
          color: #6B7280;
          margin-top: 0.3rem;
          overflow-wrap: anywhere;
        }

        .mpr-hero-photo-card {
          border-radius: 18px;
          background:
            radial-gradient(circle at top right, rgba(59,130,246,0.12), transparent 42%),
            linear-gradient(180deg, rgba(239,246,255,0.95), rgba(255,255,255,0.98));
          border: 1px solid rgba(37,99,235,0.08);
          padding: 1rem;
        }

        .mpr-photo-top {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          margin-bottom: 1rem;
        }

        .mpr-photo-top-meta {
          min-width: 0;
        }

        .mpr-photo-top-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
          word-break: break-word;
        }

        .mpr-photo-top-role {
          margin-top: 0.2rem;
          font-size: 0.72rem;
          color: #6B7280;
        }

        .mpr-photo-box {
          border: 1px dashed rgba(37,99,235,0.25);
          border-radius: 18px;
          padding: 1rem;
          background: rgba(255,255,255,0.72);
        }

        .mpr-photo-preview {
          width: 100%;
          min-height: 220px;
          border-radius: 16px;
          border: 1px solid rgba(37,99,235,0.1);
          background:
            linear-gradient(180deg, rgba(239,246,255,0.55), rgba(255,255,255,0.96));
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          margin-bottom: 0.9rem;
        }

        .mpr-photo-preview img {
          width: 100%;
          height: 100%;
          max-height: 340px;
          object-fit: cover;
          display: block;
        }

        .mpr-photo-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          text-align: center;
          color: #6B7280;
          padding: 1.2rem;
        }

        .mpr-photo-empty-badge {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #EFF6FF;
          color: #2563EB;
        }

        .mpr-photo-empty-title {
          font-size: 0.88rem;
          font-weight: 700;
          color: #111827;
        }

        .mpr-photo-empty-sub {
          font-size: 0.76rem;
          line-height: 1.5;
          max-width: 260px;
        }

        .mpr-photo-help {
          margin-top: 0.6rem;
          font-size: 0.72rem;
          color: #64748B;
          line-height: 1.55;
        }

        .mpr-photo-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }

        .mpr-file-label {
          min-height: 46px;
          padding: 0.72rem 1rem;
          border-radius: 12px;
          border: 1px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.96);
          color: #1E3A8A;
          font-size: 0.84rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mpr-file-label:hover {
          border-color: rgba(37,99,235,0.35);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.06);
        }

        .mpr-file-input {
          display: none;
        }

        .mpr-upload-btn {
          min-height: 46px;
          padding: 0.72rem 1.15rem;
          background: linear-gradient(135deg, #0F766E, #059669);
          border: none;
          border-radius: 12px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 6px 18px rgba(5,150,105,0.22);
          transition: transform 0.15s, box-shadow 0.25s, opacity 0.25s;
        }

        .mpr-upload-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 22px rgba(5,150,105,0.28);
        }

        .mpr-upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mpr-file-name {
          font-size: 0.76rem;
          color: #475569;
          word-break: break-word;
        }

        .mpr-section {
          padding: clamp(1rem, 3%, 1.45rem) clamp(1rem, 4%, 1.5rem);
          border-bottom: 1px solid rgba(37,99,235,0.07);
        }

        .mpr-section:last-of-type {
          border-bottom: none;
        }

        .mpr-section-head {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .mpr-section-ico {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mpr-section-title {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #374151;
        }

        .mpr-section-hint {
          font-size: 0.68rem;
          color: #9CA3AF;
          margin-left: auto;
          font-style: italic;
        }

        .mpr-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.9rem;
        }

        .mpr-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.9rem;
        }

        .mpr-field {
          display: flex;
          flex-direction: column;
          gap: 0.38rem;
          min-width: 0;
        }

        .mpr-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #2563EB;
        }

        .mpr-label .mpr-opt {
          font-weight: 400;
          color: #94A3B8;
          text-transform: none;
          letter-spacing: 0;
          font-size: 0.62rem;
          margin-left: 0.3rem;
        }

        .mpr-input {
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.84);
          padding: 0 1rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          color: #111827;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s, color 0.2s;
          width: 100%;
          -webkit-appearance: none;
        }

        .mpr-input:focus {
          border-color: rgba(37,99,235,0.5);
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.09);
        }

        .mpr-input:disabled {
          background: rgba(248,250,252,0.85);
          color: #334155;
          cursor: default;
          border-color: rgba(226,232,240, 0.8);
          font-weight: 500;
        }

        .mpr-input::placeholder {
          color: rgba(107,114,128,0.45);
        }

        .mpr-field-note {
          font-size: 0.72rem;
          color: #6B7280;
          line-height: 1.5;
        }

        .mpr-email-wrap {
          position: relative;
        }

        .mpr-email-lock {
          position: absolute;
          right: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: #CBD5E1;
          pointer-events: none;
        }

        .mpr-email-input {
          padding-right: 2.2rem !important;
        }

        .mpr-footer {
          padding: clamp(1rem, 3%, 1.4rem) clamp(1rem, 4%, 1.5rem);
          border-top: 1px solid rgba(37,99,235,0.07);
          display: flex;
          align-items: center;
          gap: 0.85rem;
          flex-wrap: wrap;
        }

        .mpr-submit-btn {
          min-height: 50px;
          padding: 0 1.35rem;
          background: linear-gradient(135deg, #1D4ED8, #2563EB, #3B82F6);
          background-size: 200%;
          background-position: 0%;
          border: none;
          border-radius: 13px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 18px rgba(37,99,235,0.3);
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.3s;
          white-space: nowrap;
        }

        .mpr-submit-btn:hover:not(:disabled) {
          background-position: 100%;
          box-shadow: 0 8px 26px rgba(37,99,235,0.42);
          transform: translateY(-1px);
        }

        .mpr-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mpr-cancel-btn {
          min-height: 50px;
          padding: 0 1.35rem;
          background: rgba(241, 245, 249, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 13px;
          color: #475569;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mpr-cancel-btn:hover:not(:disabled) {
          background: #E2E8F0;
          color: #1E293B;
        }

        .mpr-cancel-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mpr-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: mprspin 0.7s linear infinite;
        }

        @keyframes mprspin {
          to { transform: rotate(360deg); }
        }

        .mpr-toast {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.72rem 0.95rem;
          border-radius: 11px;
          font-size: 0.78rem;
          font-weight: 600;
          border: 1px solid;
          animation: mprin 0.35s cubic-bezier(.22,1,.36,1);
          max-width: 100%;
        }

        .mpr-toast.ok {
          background: #ECFDF5;
          color: #065F46;
          border-color: #A7F3D0;
        }

        .mpr-toast.err {
          background: #FEF2F2;
          color: #B91C1C;
          border-color: #FECACA;
        }

        .mpr-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 0.75rem;
          color: #6B7280;
          font-size: 0.82rem;
        }

        .mpr-loader-ring {
          width: 24px;
          height: 24px;
          border: 2.5px solid rgba(37,99,235,0.1);
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: mprspin 0.8s linear infinite;
        }

        @keyframes mprin {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 980px) {
          .mpr-hero {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 820px) {
          .mpr-grid-3 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .mpr-wrap {
            padding: 0.8rem;
          }

          .mpr-header {
            align-items: flex-start;
          }

          .mpr-hero-card {
            padding: 0.9rem;
          }

          .mpr-card-panel {
            padding: 1.5rem 0.5rem;
          }

          .mpr-photo-top {
            align-items: flex-start;
          }

          .mpr-photo-preview {
            min-height: 180px;
          }

          .mpr-grid-2,
          .mpr-grid-3 {
            grid-template-columns: 1fr;
          }

          .mpr-section-hint {
            margin-left: 0;
            width: 100%;
          }

          .mpr-footer {
            align-items: stretch;
            flex-direction: column;
          }

          .mpr-submit-btn,
          .mpr-cancel-btn,
          .mpr-upload-btn,
          .mpr-file-label {
            width: 100%;
            justify-content: center;
          }

          .mpr-toast {
            width: 100%;
          }
        }
      `}</style>

      <div className="mpr-wrap">
        <div className="mpr-hero">
          <div className="mpr-hero-card">
            <div className="mpr-header">
              <Avatar
                firstName={firstName}
                lastName={lastName}
                profilePhotoUrl={currentPhotoUrl}
                size={86}
              />
              <div className="mpr-header-text">
                <div className="mpr-eyebrow">
                  <div className="mpr-eyebrow-dot" />
                  Espace membre
                </div>
                <h1 className="mpr-title">
                  {firstName || lastName ? (
                    <>
                      {firstName}{' '}
                      <span style={{ fontStyle: 'italic', color: '#2563EB' }}>{lastName}</span>
                    </>
                  ) : (
                    'Mon profil'
                  )}
                </h1>
                {me?.email && <p className="mpr-subtitle">{me.email}</p>}
              </div>
            </div>

            <div className="mpr-hero-photo-card">
              <div className="mpr-photo-top">
                <Avatar
                  firstName={firstName}
                  lastName={lastName}
                  profilePhotoUrl={currentPhotoUrl}
                  size={64}
                />
                <div className="mpr-photo-top-meta">
                  <div className="mpr-photo-top-name">
                    {firstName || lastName ? `${firstName} ${lastName}` : 'Membre'}
                  </div>
                  <div className="mpr-photo-top-role">
                    Cette photo sera utilisée pour votre carte de membre.
                  </div>
                </div>
              </div>

              <div className="mpr-photo-box">
                <div className="mpr-photo-preview">
                  {currentPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentPhotoUrl} alt="Aperçu de la photo de profil" />
                  ) : (
                    <div className="mpr-photo-empty">
                      <div className="mpr-photo-empty-badge">
                        <svg
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.9"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16l4-4a3 3 0 014.243 0L15 15.757m2-2.757l.586-.586a3 3 0 014.243 0L21 13m-9-6h.01M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="mpr-photo-empty-title">Ajoutez votre photo</div>
                      <div className="mpr-photo-empty-sub">
                        Importez une photo nette, de face, au format JPG, PNG ou WEBP.
                      </div>
                    </div>
                  )}
                </div>

                <div className="mpr-photo-actions">
                  <label className="mpr-file-label" htmlFor="member-profile-photo-input">
                    <svg
                      width="15"
                      height="15"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Choisir une photo
                  </label>

                  <input
                    id="member-profile-photo-input"
                    className="mpr-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoInputChange}
                  />

                  <button
                    type="button"
                    className="mpr-upload-btn"
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhoto || !selectedPhotoFile}
                  >
                    {uploadingPhoto ? (
                      <>
                        <div className="mpr-spinner" />
                        Upload en cours…
                      </>
                    ) : (
                      <>
                        <svg
                          width="15"
                          height="15"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        Enregistrer la photo
                      </>
                    )}
                  </button>
                </div>

                {selectedPhotoFile && (
                  <div className="mpr-file-name" style={{ marginTop: '0.7rem' }}>
                    Fichier sélectionné : <strong>{selectedPhotoFile.name}</strong>
                  </div>
                )}

                <div className="mpr-photo-help">
                  Taille max : 5 Mo. Formats acceptés : JPG, PNG, WEBP.
                </div>

                {photoMessage && (
                  <div
                    className={`mpr-toast${photoMessage.ok ? ' ok' : ' err'}`}
                    style={{ marginTop: '0.9rem' }}
                  >
                    {photoMessage.ok ? (
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                      </svg>
                    )}
                    {photoMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            {loading ? (
              <div className="mpr-panel">
                <div className="mpr-loader">
                  <div className="mpr-loader-ring" />
                  Chargement du profil…
                </div>
              </div>
            ) : (
              <>
                {/* PREVISUALISATION CARTE EN DIRECT - REDIMENSIONNÉE */}
                {me && (
                  <div className="mpr-panel mpr-card-panel">
                    <div className="mpr-section-head" style={{ justifyContent: 'center', marginBottom: '1.2rem' }}>
                      <div className="mpr-section-ico" style={{ background: '#ECFDF5', color: '#059669' }}>
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <span className="mpr-section-title" style={{ color: '#064E3B' }}>Votre Carte Numérique</span>
                    </div>
                    <div style={{ maxWidth: '420px', margin: '0 auto' }}>
                      <VirtualCardWidget card={liveCardData} />
                    </div>
                  </div>
                )}

                {/* FORMULAIRE VERROUILLABLE */}
                <form onSubmit={handleSubmit}>
                  <div className="mpr-panel">
                    <div className="mpr-section">
                      <div className="mpr-section-head">
                        <div
                          className="mpr-section-ico"
                          style={{ background: '#EFF6FF', color: '#2563EB' }}
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <span className="mpr-section-title">Identité</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">Prénom</label>
                            <input
                              className="mpr-input"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              placeholder="Votre prénom"
                              disabled={!isEditing}
                            />
                          </div>

                          <div className="mpr-field">
                            <label className="mpr-label">Nom</label>
                            <input
                              className="mpr-input"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              placeholder="Votre nom"
                              disabled={!isEditing}
                            />
                          </div>
                        </div>

                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">
                              Email <span className="mpr-opt">(identifiant)</span>
                            </label>
                            <div className="mpr-email-wrap">
                              <input className="mpr-input mpr-email-input" disabled value={me?.email || ''} />
                              <span className="mpr-email-lock">
                                <svg
                                  width="14"
                                  height="14"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                              </span>
                            </div>
                          </div>

                          <div className="mpr-field">
                            <label className="mpr-label">Téléphone</label>
                            <input
                              className="mpr-input"
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+33 6 xx xx xx xx"
                              disabled={!isEditing}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mpr-section">
                      <div className="mpr-section-head">
                        <div
                          className="mpr-section-ico"
                          style={{ background: '#F5F3FF', color: '#7C3AED' }}
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <span className="mpr-section-title">Naissance & Origine</span>
                        <span className="mpr-section-hint">Requis pour la carte membre</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">Date de naissance</label>
                            <input
                              className="mpr-input"
                              type="date"
                              value={birthDate}
                              onChange={(e) => setBirthDate(e.target.value)}
                              disabled={!isEditing}
                            />
                          </div>

                          <div className="mpr-field">
                            <label className="mpr-label">Lieu de naissance</label>
                            <input
                              className="mpr-input"
                              value={placeOfBirth}
                              onChange={(e) => setPlaceOfBirth(e.target.value)}
                              placeholder="Ville"
                              disabled={!isEditing}
                            />
                          </div>
                        </div>

                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">Pays de naissance</label>
                            <input
                              className="mpr-input"
                              value={countryOfBirth}
                              onChange={(e) => setCountryOfBirth(e.target.value)}
                              placeholder="Pays"
                              disabled={!isEditing}
                            />
                          </div>

                          <div className="mpr-field">
                            <label className="mpr-label">Commune d&apos;origine</label>
                            <input
                              className="mpr-input"
                              value={originVillage}
                              onChange={(e) => setOriginVillage(e.target.value)}
                              placeholder="Ex: Korbé"
                              disabled={!isEditing}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mpr-section">
                      <div className="mpr-section-head">
                        <div
                          className="mpr-section-ico"
                          style={{ background: '#ECFDF5', color: '#059669' }}
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <span className="mpr-section-title">Adresse de résidence</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        <div className="mpr-field">
                          <label className="mpr-label">Ligne 1</label>
                          <input
                            className="mpr-input"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            placeholder="N° et nom de rue"
                            disabled={!isEditing}
                          />
                        </div>

                        <div className="mpr-field">
                          <label className="mpr-label">
                            Ligne 2 <span className="mpr-opt">(optionnel)</span>
                          </label>
                          <input
                            className="mpr-input"
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            placeholder="Appartement, bâtiment…"
                            disabled={!isEditing}
                          />
                        </div>

                        <div className="mpr-grid-3">
                          <div className="mpr-field">
                            <label className="mpr-label">Code postal</label>
                            <input
                              className="mpr-input"
                              value={postalCode}
                              onChange={(e) => setPostalCode(e.target.value)}
                              placeholder="75001"
                              disabled={!isEditing}
                            />
                          </div>

                          <div className="mpr-field">
                            <label className="mpr-label">Ville</label>
                            <input
                              className="mpr-input"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              placeholder="Paris"
                              disabled={!isEditing}
                            />
                          </div>

                          <div className="mpr-field">
                            <label className="mpr-label">Pays</label>
                            <input
                              className="mpr-input"
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                              placeholder="France"
                              disabled={!isEditing}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mpr-footer">
                      {!isEditing ? (
                        <button
                          type="button"
                          className="mpr-submit-btn"
                          onClick={() => setIsEditing(true)}
                        >
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
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          Modifier mes informations
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="mpr-cancel-btn"
                            onClick={handleCancel}
                            disabled={saving}
                          >
                            Annuler
                          </button>
                          <button type="submit" className="mpr-submit-btn" disabled={saving}>
                            {saving ? (
                              <>
                                <div className="mpr-spinner" />
                                Enregistrement…
                              </>
                            ) : (
                              <>
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
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Mettre à jour le profil
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {message && (
                        <div className={`mpr-toast${message.ok ? ' ok' : ' err'}`}>
                          {message.ok ? (
                            <svg
                              width="14"
                              height="14"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="2.2"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg
                              width="14"
                              height="14"
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
                      )}
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}