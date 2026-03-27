// web/app/(protected)/member/profile/page.tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type FullUserProfile, type VirtualCardData } from '../../../../lib/api-client';
import { VirtualCardWidget } from '../../../../components/member/VirtualCardWidget';

type FlashMessage = { text: string; ok: boolean } | null;

type FullUserProfileWithProfession = FullUserProfile & {
  function?: string | null;
  originVillage?: string | null;
  originSubPrefecture?: string | null;
  birthCountry?: string | null;
  countryOfBirth?: string | null;
  postalCode?: string | null;
};

export const ASSOCIATION_ROLES = [
  'Membre (simple)',
  "Secrétaire à l'organisation",
  'Secrétaire Général(e)',
  'Trésorier / Trésorière',
  'Président(e)',
  'Vice-président(e)',
  'Chargé(e) de communication',
  'Conseiller / Conseillère',
  'Autre',
] as const;

function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:3001/api`;
  }
  return 'http://localhost:3001/api';
}

export default function MemberProfilePage() {
  const [me, setMe] = useState<FullUserProfileWithProfession | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [countryOfBirth, setCountryOfBirth] = useState('');
  const [originSubPrefecture, setOriginSubPrefecture] = useState('');
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
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const currentPhotoUrl = useMemo(() => {
    if (photoPreviewUrl) return photoPreviewUrl;
    if (!me?.profilePhotoUrl) return null;
    if (/^https?:\/\//i.test(me.profilePhotoUrl)) return me.profilePhotoUrl;
    if (me.profilePhotoUrl.startsWith('/')) {
      return `${apiBaseUrl.replace(/\/api$/, '')}${me.profilePhotoUrl}`;
    }
    return me.profilePhotoUrl;
  }, [apiBaseUrl, me?.profilePhotoUrl, photoPreviewUrl]);

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
          birthDate: birthDate || null,
          placeOfBirth: placeOfBirth || null,
          birthCountry: countryOfBirth || null,
          originSubPrefecture: originSubPrefecture || null,
          originCommune: originSubPrefecture || null,
          originVillage: originVillage || null,
          country: country || null,
          city: city || null,
          postalCode: postalCode || null,
          profilePhotoUrl: currentPhotoUrl,
          function: profession || null,
        },
      }
    : null;

  const rawMemberNumber = me?.virtualCard?.cardNumber || me?.cardNumber;
  const displayMemberNumber = rawMemberNumber ? rawMemberNumber.replace(/-/g, '') : null;
  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const user = (await api.getMyProfile()) as FullUserProfileWithProfession;
        if (!isMounted) return;
        setMe(user);
        populateFields(user);
      } catch (err) {
        if (!isMounted) return;
        setMessage({
          text: err instanceof Error ? err.message : 'Erreur chargement profil',
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
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  function populateFields(user: FullUserProfileWithProfession) {
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhone(user.phone || '');
    setProfession(user.function || '');
    setBirthDate(user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '');
    setPlaceOfBirth(user.placeOfBirth || '');
    setCountryOfBirth(user.birthCountry || user.countryOfBirth || '');
    setOriginSubPrefecture(user.originSubPrefecture || '');
    setOriginVillage(user.originVillage || '');
    setAddressLine1(user.addressLine1 || '');
    setAddressLine2(user.addressLine2 || '');
    setPostalCode(user.postalCode || '');
    setCity(user.city || '');
    setCountry(user.country || '');
  }

  function handleCancel() {
    if (me) populateFields(me);
    setIsEditing(false);
    setMessage(null);
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    setPhotoMessage(null);

    try {
      const result = await api.uploadProfilePhoto(file);
      const nextUser = (result?.user ?? null) as FullUserProfileWithProfession | null;

      if (nextUser) {
        setMe(nextUser);
        populateFields(nextUser);
      } else if (result?.profilePhotoUrl && me) {
        setMe({ ...me, profilePhotoUrl: result.profilePhotoUrl });
      }

      setPhotoMessage({
        text: result?.message || 'Photo mise à jour avec succès.',
        ok: true,
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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

  async function handleQuickPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoMessage(null);

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      e.target.value = '';
      setPhotoMessage({ text: 'Formats autorisés : JPG, PNG, WEBP.', ok: false });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      e.target.value = '';
      setPhotoMessage({ text: 'La photo ne doit pas dépasser 5 Mo.', ok: false });
      return;
    }

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    const preview = URL.createObjectURL(file);
    setPhotoPreviewUrl(preview);

    await handlePhotoUpload(file);
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
        function: profession.trim() || undefined,
        birthDate: birthDate || undefined,
        placeOfBirth: placeOfBirth.trim() || undefined,
        originSubPrefecture: originSubPrefecture.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      };

      const nextUser = (await api.updateMyProfile(payload)) as FullUserProfileWithProfession;

      setMe(nextUser);
      populateFields(nextUser);
      setIsEditing(false);
      setMessage({ text: 'Profil mis à jour avec succès.', ok: true });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Erreur sauvegarde profil',
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Mon profil">
        <style>{`
          @keyframes mprspin { to { transform: rotate(360deg); } }
        `}</style>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem',
            color: '#2D6A4F',
            fontFamily: "'DM Sans', sans-serif",
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              border: '2.5px solid rgba(45,106,79,0.15)',
              borderTopColor: '#2D6A4F',
              borderRadius: '50%',
              animation: 'mprspin 0.8s linear infinite',
            }}
          />
          Chargement du profil…
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mon profil">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@500&display=swap');

        .mpr-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 960px;
          margin: 0 auto;
        }

        .mpr-header-block {
          margin-bottom: 1.75rem;
          opacity: 0;
          transform: translateY(12px);
          animation: mprin 0.55s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }

        .mpr-eyebrow {
          font-size: 0.67rem;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #2D6A4F;
          margin-bottom: 0.4rem;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .mpr-eyebrow-dot {
          width: 6px;
          height: 6px;
          background: #2D6A4F;
          border-radius: 50%;
          animation: mprpulse 2s ease-in-out infinite;
        }

        @keyframes mprpulse {
          0%,100% { opacity: 1; }
          50% { opacity: .25; }
        }

        .mpr-page-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.6rem, 3.5vw, 2.1rem);
          font-weight: 600;
          color: #1A4731;
          letter-spacing: -0.025em;
          line-height: 1.1;
        }

        .mpr-page-title span {
          color: #2D6A4F;
        }

        .mpr-hero {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-radius: 22px;
          border: 1px solid rgba(45,106,79,0.12);
          box-shadow: 0 4px 24px rgba(45,106,79,0.08), 0 1px 2px rgba(0,0,0,0.04);
          padding: 1.75rem;
          margin-bottom: 1.25rem;
          opacity: 0;
          transform: translateY(12px);
          animation: mprin 0.55s 0.1s cubic-bezier(.22,1,.36,1) forwards;
          position: relative;
          overflow: hidden;
        }

        .mpr-hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #1A4731, #2D6A4F, #86EFAC);
          border-radius: 22px 22px 0 0;
        }

        .mpr-avatar-wrap {
          position: relative;
          flex-shrink: 0;
          width: 96px;
          height: 96px;
        }

        .mpr-avatar {
          width: 96px;
          height: 96px;
          border-radius: 22px;
          background: linear-gradient(145deg, #1A4731, #2D6A4F);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.3rem;
          font-weight: 700;
          box-shadow: 0 6px 20px rgba(26,71,49,0.3);
          overflow: hidden;
        }

        .mpr-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 22px;
        }

        .mpr-avatar-spinner {
          position: absolute;
          inset: 0;
          border-radius: 22px;
          background: rgba(15,35,24,0.65);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mpr-spinner-ring {
          width: 28px;
          height: 28px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: mprspin 0.7s linear infinite;
        }

        .mpr-avatar-edit-btn {
          position: absolute;
          right: -6px;
          bottom: -6px;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          background: linear-gradient(135deg, #1A4731, #2D6A4F);
          color: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 6px 18px rgba(26,71,49,0.28);
          transition: transform 0.18s, box-shadow 0.18s;
        }

        .mpr-avatar-edit-btn:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 8px 22px rgba(26,71,49,0.34);
        }

        .mpr-hidden-file-input {
          display: none;
        }

        .mpr-hero-info {
          flex: 1;
          min-width: 0;
        }

        .mpr-hero-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1A4731;
          margin-bottom: 0.45rem;
          letter-spacing: -0.02em;
        }

        .mpr-hero-name em {
          color: #2D6A4F;
          font-style: italic;
        }

        .mpr-hero-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .mpr-role-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.63rem;
          font-weight: 800;
          background: #ECFDF5;
          color: #1A4731;
          padding: 0.28rem 0.7rem;
          border-radius: 99px;
          border: 1px solid #A7F3D0;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .mpr-role-dot {
          width: 5px;
          height: 5px;
          background: #2D6A4F;
          border-radius: 50%;
        }

        .mpr-member-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.63rem;
          font-weight: 700;
          background: #FEF3C7;
          color: #92400E;
          padding: 0.28rem 0.7rem;
          border-radius: 99px;
          border: 1px solid #FDE68A;
          letter-spacing: 0.03em;
        }

        .mpr-hero-email {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: #52796A;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          overflow-wrap: anywhere;
        }

        .mpr-compact-feedback {
          margin-bottom: 1rem;
        }

        .mpr-card-fab {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          margin-bottom: 1rem;
          padding: 0.7rem 1.35rem;
          background: linear-gradient(135deg, #1A4731, #2D6A4F);
          border: none;
          border-radius: 50px;
          color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.86rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(26,71,49,0.28);
          transition: transform 0.18s, box-shadow 0.18s;
        }

        .mpr-card-fab:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(26,71,49,0.35);
        }

        .mpr-card-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          animation: mprfadein 0.22s ease forwards;
        }

        @keyframes mprfadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .mpr-card-modal {
          position: relative;
          width: 100%;
          max-width: 420px;
          animation: mprscalein 0.28s cubic-bezier(.22,1,.36,1) forwards;
        }

        @keyframes mprscalein {
          from {
            opacity: 0;
            transform: scale(0.88) translateY(18px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .mpr-card-modal-close {
          position: absolute;
          top: -0.7rem;
          right: -0.7rem;
          z-index: 10;
          width: 32px;
          height: 32px;
          background: white;
          border: 1px solid rgba(0,0,0,0.10);
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.14);
          color: #374151;
          transition: background 0.15s, transform 0.15s;
        }

        .mpr-card-modal-close:hover {
          background: #F3F4F6;
          transform: scale(1.1);
        }

        .mpr-panel {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(16px);
          border-radius: 22px;
          border: 1px solid rgba(45,106,79,0.09);
          box-shadow: 0 4px 24px rgba(45,106,79,0.06), 0 1px 2px rgba(0,0,0,0.03);
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          animation: mprin 0.55s 0.2s cubic-bezier(.22,1,.36,1) forwards;
        }

        .mpr-section {
          padding: 1.5rem 1.75rem;
          border-bottom: 1px solid rgba(45,106,79,0.06);
        }

        .mpr-section:last-child {
          border-bottom: none;
        }

        .mpr-section-head {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
        }

        .mpr-section-ico {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .mpr-section-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: #1A4731;
          letter-spacing: -0.01em;
        }

        .mpr-section-divider {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(45,106,79,0.18), transparent);
          min-width: 60px;
        }

        .mpr-section-badge {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
          padding: 0.18rem 0.55rem;
          border-radius: 99px;
          white-space: nowrap;
        }

        .mpr-grid-2-keep {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem 1.25rem;
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
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #2D6A4F;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .mpr-label .opt {
          font-weight: 500;
          color: #94A3B8;
          text-transform: none;
          letter-spacing: 0;
          font-size: 0.63rem;
        }

        .mpr-input,
        .mpr-select {
          width: 100%;
          height: 46px;
          padding: 0 1rem;
          border-radius: 11px;
          border: 1.5px solid rgba(45,106,79,0.15);
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

        .mpr-input:focus,
        .mpr-select:focus {
          border-color: rgba(45,106,79,0.55);
          box-shadow: 0 0 0 3px rgba(45,106,79,0.1);
        }

        .mpr-input:disabled,
        .mpr-select:disabled {
          background: #ffffff;
          color: #000000;
          cursor: default;
          border-color: rgba(45,106,79,0.10);
        }

        .mpr-input::placeholder {
          color: rgba(0,0,0,0.35);
        }

        .mpr-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%231A4731' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.85rem center;
          padding-right: 2.2rem;
          background-color: #ffffff;
        }

        .mpr-select:disabled {
          cursor: not-allowed;
          background-image: none;
        }

        .mpr-input-readonly {
          background: #ffffff !important;
          color: #000000 !important;
          border-color: rgba(45,106,79,0.10) !important;
        }

        .mpr-footer {
          padding: 1.25rem 1.75rem;
          border-top: 1px solid rgba(45,106,79,0.07);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          background: rgba(236,253,245,0.3);
        }

        .mpr-btn-primary {
          height: 46px;
          padding: 0 1.5rem;
          background: linear-gradient(135deg, #1A4731, #2D6A4F);
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
          box-shadow: 0 4px 16px rgba(26,71,49,0.28);
          transition: transform 0.15s, box-shadow 0.2s;
          white-space: nowrap;
        }

        .mpr-btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(26,71,49,0.38);
        }

        .mpr-btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .mpr-btn-secondary {
          height: 46px;
          padding: 0 1.25rem;
          background: #ffffff;
          border: 1.5px solid rgba(45,106,79,0.22);
          border-radius: 11px;
          color: #1A4731;
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

        .mpr-btn-secondary:hover:not(:disabled) {
          background: #ECFDF5;
          border-color: rgba(45,106,79,0.38);
        }

        .mpr-spinner-btn {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: mprspin 0.7s linear infinite;
        }

        .mpr-toast {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border-radius: 11px;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1px solid;
          animation: mprin 0.3s cubic-bezier(.22,1,.36,1);
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

        @keyframes mprin {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes mprspin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {
          .mpr-wrap {
            padding: 0.85rem 0.85rem 4rem;
          }

          .mpr-section {
            padding: 1.1rem 1rem;
          }

          .mpr-footer {
            flex-direction: column;
            align-items: stretch;
          }

          .mpr-btn-primary,
          .mpr-btn-secondary,
          .mpr-toast {
            width: 100%;
            justify-content: center;
          }

          .mpr-avatar-wrap {
            width: 84px;
            height: 84px;
          }

          .mpr-avatar {
            width: 84px;
            height: 84px;
          }

          .mpr-avatar-edit-btn {
            width: 34px;
            height: 34px;
            right: -4px;
            bottom: -4px;
          }
        }

        @media (max-width: 430px) {
          .mpr-grid-2-keep {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="mpr-wrap">
        <div className="mpr-header-block">
          <div className="mpr-eyebrow">
            <div className="mpr-eyebrow-dot" />
            Espace membre
          </div>
          <h1 className="mpr-page-title">
            Mon profil <span>membre</span>
          </h1>
        </div>

        <div className="mpr-hero">
          <div className="mpr-avatar-wrap">
            {currentPhotoUrl ? (
              <div className="mpr-avatar">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentPhotoUrl} alt="Photo de profil" />
              </div>
            ) : (
              <div className="mpr-avatar">
                <span>{initials || '?'}</span>
              </div>
            )}

            <button
              type="button"
              className="mpr-avatar-edit-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Changer la photo de profil"
              title="Changer la photo"
              disabled={uploadingPhoto}
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
              className="mpr-hidden-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleQuickPhotoChange}
            />

            {uploadingPhoto && (
              <div className="mpr-avatar-spinner">
                <div className="mpr-spinner-ring" />
              </div>
            )}
          </div>

          <div className="mpr-hero-info">
            <h2 className="mpr-hero-name">
              {firstName || lastName ? (
                <>
                  {firstName} <em>{lastName}</em>
                </>
              ) : (
                'Mon profil'
              )}
            </h2>

            <div className="mpr-hero-meta">
              <span className="mpr-role-tag">
                <span className="mpr-role-dot" />
                Membre
              </span>

              {displayMemberNumber && (
                <span className="mpr-member-tag">
                  <svg
                    width="11"
                    height="11"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  N° {displayMemberNumber}
                </span>
              )}
            </div>

            {me?.email && (
              <div className="mpr-hero-email">
                <svg
                  width="13"
                  height="13"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {me.email}
              </div>
            )}
          </div>
        </div>

        {photoMessage && (
          <div className="mpr-compact-feedback">
            <div className={`mpr-toast ${photoMessage.ok ? 'ok' : 'err'}`}>
              {photoMessage.ok ? (
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
              {photoMessage.text}
            </div>
          </div>
        )}

        {me && (
          <button
            type="button"
            className="mpr-card-fab"
            onClick={() => setCardVisible((v) => !v)}
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
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            {cardVisible ? 'Masquer ma carte' : 'Ma carte membre'}
          </button>
        )}

        {cardVisible && (
          <div className="mpr-card-overlay" onClick={() => setCardVisible(false)}>
            <div className="mpr-card-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="mpr-card-modal-close"
                onClick={() => setCardVisible(false)}
                type="button"
                aria-label="Fermer"
              >
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <VirtualCardWidget card={liveCardData} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mpr-panel">
            <div className="mpr-section">
              <div className="mpr-section-head">
                <div className="mpr-section-ico" style={{ background: '#ECFDF5' }}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#1A4731"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <span className="mpr-section-title">Identité &amp; Contact</span>
                <div className="mpr-section-divider" />
              </div>

              <div className="mpr-grid-2-keep" style={{ marginBottom: '1rem' }}>
                <div className="mpr-field">
                  <label className="mpr-label">Prénom</label>
                  <input
                    className="mpr-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Votre prénom"
                  />
                </div>

                <div className="mpr-field">
                  <label className="mpr-label">Nom</label>
                  <input
                    className="mpr-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div className="mpr-grid-2-keep" style={{ marginBottom: '1rem' }}>
                <div className="mpr-field">
                  <label className="mpr-label">Téléphone</label>
                  <input
                    className="mpr-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!isEditing}
                    placeholder="+33 6 xx xx xx xx"
                  />
                </div>

                <div className="mpr-field">
                  <label className="mpr-label">
                    Poste occupé
                    <span className="opt">Optionnel</span>
                  </label>
                  <select
                    className="mpr-select"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="">Sélectionnez un rôle dans l&apos;association</option>
                    {ASSOCIATION_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mpr-field">
                <label className="mpr-label">
                  Email
                  <span className="opt">Non modifiable</span>
                </label>
                <input className="mpr-input mpr-input-readonly" value={me?.email || ''} disabled />
              </div>
            </div>

            <div className="mpr-section">
              <div className="mpr-section-head">
                <div className="mpr-section-ico" style={{ background: '#FEF3C7' }}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#B45309"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <span className="mpr-section-title">Naissance &amp; Origine</span>
                <span className="mpr-section-badge">Requis pour la carte</span>
                <div className="mpr-section-divider" />
              </div>

              <div className="mpr-grid-2-keep" style={{ marginBottom: '1rem' }}>
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
                    disabled={!isEditing}
                    placeholder="Ex : Lélouma"
                  />
                </div>
              </div>

              <div className="mpr-grid-2-keep" style={{ marginBottom: '1rem' }}>
                <div className="mpr-field">
                  <label className="mpr-label">
                    Pays de naissance
                    <span className="opt">Non modifiable</span>
                  </label>
                  <input
                    className="mpr-input mpr-input-readonly"
                    value={countryOfBirth}
                    placeholder="Ex : Guinée"
                    disabled
                  />
                </div>

                <div className="mpr-field">
                  <label className="mpr-label">Commune d&apos;origine</label>
                  <input
                    className="mpr-input"
                    value={originSubPrefecture}
                    onChange={(e) => setOriginSubPrefecture(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Ex : Lafou"
                  />
                </div>
              </div>

              <div className="mpr-field">
                <label className="mpr-label">
                  Village d&apos;origine
                  <span className="opt">Non modifiable</span>
                </label>
                <input
                  className="mpr-input mpr-input-readonly"
                  value={originVillage}
                  placeholder="Ex : Balaya"
                  disabled
                />
              </div>
            </div>

            <div className="mpr-section">
              <div className="mpr-section-head">
                <div className="mpr-section-ico" style={{ background: '#F0FDFA' }}>
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="#0D9488"
                    strokeWidth="2.2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <span className="mpr-section-title">Adresse de résidence</span>
                <div className="mpr-section-divider" />
              </div>

              <div className="mpr-field" style={{ marginBottom: '1rem' }}>
                <label className="mpr-label">Ligne 1</label>
                <input
                  className="mpr-input"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  disabled={!isEditing}
                  placeholder="N° et nom de rue"
                />
              </div>

              <div className="mpr-field" style={{ marginBottom: '1rem' }}>
                <label className="mpr-label">
                  Ligne 2
                  <span className="opt">Optionnel</span>
                </label>
                <input
                  className="mpr-input"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Appartement, bâtiment…"
                />
              </div>

              <div className="mpr-grid-2-keep" style={{ marginBottom: '1rem' }}>
                <div className="mpr-field">
                  <label className="mpr-label">Code postal</label>
                  <input
                    className="mpr-input"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    disabled={!isEditing}
                    placeholder="75001"
                  />
                </div>

                <div className="mpr-field">
                  <label className="mpr-label">Ville</label>
                  <input
                    className="mpr-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="mpr-field">
                <label className="mpr-label">Pays</label>
                <input
                  className="mpr-input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={!isEditing}
                  placeholder="France"
                />
              </div>
            </div>

            <div className="mpr-footer">
              {!isEditing ? (
                <button
                  type="button"
                  className="mpr-btn-primary"
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
                    className="mpr-btn-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Annuler
                  </button>

                  <button type="submit" className="mpr-btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <div className="mpr-spinner-btn" />
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Mettre à jour
                      </>
                    )}
                  </button>
                </>
              )}

              {message && (
                <div className={`mpr-toast ${message.ok ? 'ok' : 'err'}`}>
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
              )}
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}