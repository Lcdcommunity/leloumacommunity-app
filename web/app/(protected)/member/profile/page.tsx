// web/app/(protected)/member/profile/page.tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type FullUserProfile, type VirtualCardData } from '../../../../lib/api-client';
import { VirtualCardWidget } from '../../../../components/member/VirtualCardWidget';

type FlashMessage = { text: string; ok: boolean } | null;

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
];

export const PROFESSION_LIST = [
  'Étudiant(e)',
  'Employé(e)',
  'Fonctionnaire',
  'Indépendant / Entrepreneur',
  'Profession libérale',
  'Cadre / Dirigeant',
  'Artisan / Commerçant',
  'Agriculteur',
  'Sans emploi',
  'Retraité(e)',
  'Autre',
];

export const COMMUNES_ORIGINE = [
  'C. Urbaine', 'Lafou', 'Manda', 'Balaya', 'Thiaguel Bori', 
  'Parawol', 'Sagalé', 'Hérico', 'Diountou', 'Korbé', 'Linsan'
];

export const COUNTRIES = [
  { name: 'Guinée', code: 'GN' },
  { name: 'France', code: 'FR' },
  { name: 'Sénégal', code: 'SN' },
  { name: 'Côte d\'Ivoire', code: 'CI' },
  { name: 'Mali', code: 'ML' },
  { name: 'Maroc', code: 'MA' },
  { name: 'Canada', code: 'CA' },
  { name: 'États-Unis', code: 'US' },
  { name: 'Belgique', code: 'BE' },
  { name: 'Suisse', code: 'CH' },
  { name: 'Allemagne', code: 'DE' },
  { name: 'Royaume-Uni', code: 'GB' },
  { name: 'Espagne', code: 'ES' },
  { name: 'Italie', code: 'IT' },
  { name: 'Sierra Leone', code: 'SL' },
  { name: 'Libéria', code: 'LR' },
  { name: 'Guinée-Bissau', code: 'GW' },
  { name: 'Gambie', code: 'GM' },
  { name: 'Angola', code: 'AO' },
  { name: 'Cameroun', code: 'CM' },
  { name: 'Niger', code: 'NE' },
  { name: 'Afrique du Sud', code: 'ZA' },
  { name: 'Mozambique', code: 'MZ' },
  { name: 'Portugal', code: 'PT' },
  { name: 'Autre (Non listé)', code: 'OTHER' }
].sort((a, b) => a.name.localeCompare(b.name));

export default function MemberProfilePage() {
  const [me, setMe] = useState<FullUserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [originSubPrefecture, setOriginSubPrefecture] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [birthCountry, setBirthCountry] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [profession, setProfession] = useState('');
  const [associationRole, setAssociationRole] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState<FlashMessage>(null);
  const [photoMessage, setPhotoMessage] = useState<FlashMessage>(null);
  const [loading, setLoading] = useState(true);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const user = await api.getMyProfile();
        if (!isMounted) return;
        setMe(user);
        populateFields(user);
      } catch (err) {
        if (!isMounted) return;
        setMessage({ text: err instanceof Error ? err.message : 'Erreur chargement profil', ok: false });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  function populateFields(user: FullUserProfile) {
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setPhone(user.phone || '');
    setOriginSubPrefecture(user.originSubPrefecture || '');
    setPlaceOfBirth(user.placeOfBirth || '');
    setBirthCountry(user.countryOfBirth || user.birthCountry || '');
    setCity(user.city || '');
    setCountry(user.country || '');
    setPostalCode(user.postalCode || '');
    setAddressLine1(user.addressLine1 || '');
    setAddressLine2(user.addressLine2 || '');

    setAssociationRole(user.function || '');
    setProfession(user.professionalStatus || '');

    if (user.birthDate) {
      const d = new Date(user.birthDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        setBirthDate(`${day}/${month}/${year}`);
      } else {
        setBirthDate('');
      }
    } else {
      setBirthDate('');
    }
  }

  function handleCancel() {
    if (me) populateFields(me);
    setIsEditing(false);
    setMessage(null);
  }

  const handleBirthDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    let formatted = value;
    if (value.length > 2) formatted = `${value.slice(0, 2)}/${value.slice(2)}`;
    if (value.length > 4) formatted = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    setBirthDate(formatted);
  };

  const convertDateToISO = (dateStr: string): string | undefined => {
    if (!dateStr || dateStr.length !== 10) return undefined;
    const [day, month, year] = dateStr.split('/');
    const d = new Date(`${year}-${month}-${day}T00:00:00Z`);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  };

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const result = await api.uploadProfilePhoto(file);
      if (result?.user) setMe(result.user as FullUserProfile);
      setPhotoMessage({ text: 'Photo mise à jour.', ok: true });
    } catch (err) {
      setPhotoMessage({ text: err instanceof Error ? err.message : 'Erreur upload photo', ok: false });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleQuickPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    await handlePhotoUpload(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      const formattedDate = convertDateToISO(birthDate);

      const payload: Record<string, string | undefined> = {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        originSubPrefecture: originSubPrefecture.trim() || undefined,
        birthDate: formattedDate,
        placeOfBirth: placeOfBirth.trim() || undefined,
        countryOfBirth: birthCountry.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        function: associationRole || undefined,
        professionalStatus: profession || undefined,
      };
      
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

      const nextUser = await api.updateMyProfile(payload);
      setMe(nextUser as FullUserProfile);
      setIsEditing(false);
      setMessage({ text: 'Profil mis à jour avec succès.', ok: true });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur sauvegarde';
      setMessage({ text: `Erreur : ${errorMsg}`, ok: false });
    } finally {
      setSaving(false);
    }
  }

  const isLocked = me?.virtualCard?.isLocked ?? me?.isCardLocked ?? true;
  const isExpired = me?.virtualCard?.expiresAt
    ? new Date(me.virtualCard.expiresAt) < new Date()
    : false;
  const currentPhoto = photoPreviewUrl || me?.avatarUrl || me?.profilePhotoUrl || '';

  // Suppression de professionalStatus ici pour satisfaire le type VirtualCardData de api-client.ts
  const liveCardData: VirtualCardData | null = me ? {
    cardNumber: me.virtualCard?.cardNumber || me.cardNumber || 'EN ATTENTE',
    isLocked: isLocked,
    expiresAt: me.virtualCard?.expiresAt || me.cardExpiresAt || null,
    qrToken: me.virtualCard?.qrToken || me.qrToken || 'preview-token',
    antennaName: me.antenna?.name || me.antennaName || 'Antenne non assignée',
    user: {
      firstName,
      lastName,
      birthDate: convertDateToISO(birthDate) || null,
      placeOfBirth: placeOfBirth || null,
      birthCountry: birthCountry || null,
      originSubPrefecture: originSubPrefecture || null,
      originCommune: originSubPrefecture || null,
      originVillage: originSubPrefecture || null,
      country: country || null,
      city: city || null,
      postalCode: postalCode || null,
      profilePhotoUrl: currentPhoto,
      function: associationRole || profession || null,
    },
  } : null;

  const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();

  if (loading) {
    return (
      <AppShell title="Mon profil">
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid #E2E8F0', borderTopColor: '#2D6A4F',
            animation: 'mpr-spin 0.8s linear infinite', margin: '0 auto 1rem',
          }} />
          <p style={{ color: '#64748B', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.85rem' }}>
            Chargement de votre profil…
          </p>
          <style>{`@keyframes mpr-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Mon profil">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');

        .mpr-wrap { font-family: 'DM Sans', sans-serif; padding: 1.25rem 1rem 3rem; max-width: 680px; margin: 0 auto; }

        .mpr-hero {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #0f3d2e 0%, #1b5e42 55%, #c89f3d 130%);
          border-radius: 24px; padding: 2rem 1.75rem; margin-bottom: 1.25rem;
          display: flex; align-items: center; gap: 1.5rem;
          box-shadow: 0 20px 48px rgba(15,61,46,0.25), 0 0 0 1px rgba(200,159,61,0.15);
        }
        .mpr-hero::before {
          content: ''; position: absolute; inset: 0;
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200"><path fill="rgba(255,255,255,0.03)" d="M0,100 C150,160 350,40 600,100 L600,200 L0,200Z"/><path fill="rgba(255,255,255,0.03)" d="M0,130 C200,70 400,170 600,110 L600,200 L0,200Z"/></svg>') no-repeat bottom;
          background-size: cover; pointer-events: none;
        }
        .mpr-guinea-stripe {
          position: absolute; top: 0; right: 0; bottom: 0; width: 6px;
          display: flex; flex-direction: column;
        }
        .mpr-guinea-stripe span { flex: 1; }
        .mpr-guinea-stripe span:nth-child(1) { background: #CE1126; }
        .mpr-guinea-stripe span:nth-child(2) { background: #FCD116; }
        .mpr-guinea-stripe span:nth-child(3) { background: #009460; }

        .mpr-avatar-wrap { position: relative; flex-shrink: 0; }
        .mpr-avatar {
          width: 88px; height: 88px; border-radius: 20px;
          background: rgba(255,255,255,0.12); border: 2px solid rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center;
          color: white; font-family: 'Cormorant Garamond', serif;
          font-size: 2.2rem; font-weight: 700; overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        }
        .mpr-avatar-img { width: 100%; height: 100%; object-fit: cover; }
        .mpr-edit-photo {
          position: absolute; bottom: -8px; right: -8px;
          width: 32px; height: 32px; border-radius: 50%;
          border: 2.5px solid #0f3d2e; background: #FCD116;
          color: #0f3d2e; display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .mpr-edit-photo:hover { transform: scale(1.1); box-shadow: 0 6px 16px rgba(0,0,0,0.3); }

        .mpr-hero-info { flex: 1; min-width: 0; position: relative; z-index: 1; }
        .mpr-hero-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.85rem; font-weight: 700; line-height: 1;
          color: #fffdf6; margin-bottom: 0.15rem;
        }
        .mpr-hero-name em { font-style: normal; color: #FCD116; }
        
        .mpr-hero-id {
          font-family: 'DM Mono', monospace;
          font-size: 0.75rem;
          color: #FCD116;
          font-weight: 600;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }
        
        .mpr-hero-role {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.9); border-radius: 99px;
          font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; padding: 0.22rem 0.7rem; margin-bottom: 0.5rem;
        }
        .mpr-hero-email { font-size: 0.75rem; color: rgba(255,255,255,0.55); font-weight: 500; }

        .mpr-card-lock-banner {
          position: relative; overflow: hidden;
          background: #F8FAFC; border: 1px solid #E2E8F0;
          border-radius: 20px; margin-bottom: 1.25rem;
          box-shadow: 0 8px 24px rgba(15,23,42,0.06);
        }
        .mpr-lock-bg {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
          z-index: 0;
        }
        .mpr-lock-overlay {
          position: relative; z-index: 1;
          padding: 1.75rem 1.5rem;
          display: flex; flex-direction: column; align-items: center;
          gap: 0.75rem; text-align: center;
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        }
        .mpr-lock-icon-wrap {
          width: 56px; height: 56px; border-radius: 50%;
          background: #FFFFFF; border: 1px solid #E2E8F0;
          box-shadow: 0 8px 20px rgba(0,0,0,0.06);
          display: flex; align-items: center; justify-content: center;
        }
        .mpr-lock-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 600; color: #0F172A; line-height: 1.2;
        }
        .mpr-lock-sub {
          max-width: 280px; font-size: 0.76rem;
          line-height: 1.55; color: #475569; font-weight: 500;
        }
        .mpr-lock-cta {
          display: inline-flex; align-items: center; gap: 0.5rem;
          padding: 0.72rem 1.4rem; border-radius: 12px;
          background: #0F172A; color: #FFFFFF; text-decoration: none;
          font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em;
          box-shadow: 0 4px 14px rgba(15,23,42,0.35);
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .mpr-lock-cta:hover {
          transform: translateY(-2px); background: #1E293B;
          box-shadow: 0 8px 24px rgba(15,23,42,0.45);
        }

        .mpr-card-btn {
          display: flex; align-items: center; justify-content: center; gap: 0.55rem;
          width: 100%; padding: 0.9rem; border: none; cursor: pointer;
          border-radius: 16px; font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 700; margin-bottom: 1.25rem;
          background: linear-gradient(135deg, #0f3d2e 0%, #1b5e42 50%, #c89f3d 100%);
          color: #fffdf6; box-shadow: 0 8px 24px rgba(15,61,46,0.25);
          transition: transform 0.2s ease, box-shadow 0.2s ease; position: relative; overflow: hidden;
        }
        .mpr-card-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
          transform: translateX(-100%); transition: transform 0.5s ease;
        }
        .mpr-card-btn:hover::before { transform: translateX(100%); }
        .mpr-card-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(15,61,46,0.3); }

        .mpr-panel {
          background: white; border-radius: 20px; padding: 1.5rem;
          box-shadow: 0 2px 16px rgba(15,23,42,0.05); margin-bottom: 1rem;
          border: 1px solid rgba(226,232,240,0.8);
          transition: box-shadow 0.2s ease;
        }
        .mpr-panel:hover { box-shadow: 0 4px 24px rgba(15,23,42,0.08); }

        .mpr-section-title {
          font-size: 0.65rem; font-weight: 800; color: #1D4ED8;
          text-transform: uppercase; letter-spacing: 0.1em;
          margin-bottom: 1.1rem;
          display: flex; align-items: center; gap: 0.6rem;
        }
        .mpr-section-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: #EFF6FF; display: flex; align-items: center; justify-content: center;
          color: #1D4ED8; flex-shrink: 0;
        }
        .mpr-section-title::after { content: ''; flex: 1; height: 1px; background: #DBEAFE; }

        .mpr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 0.85rem; }
        .mpr-grid-1 { display: grid; grid-template-columns: 1fr; gap: 0.85rem; margin-bottom: 0.85rem; }
        .mpr-grid-num { display: grid; grid-template-columns: 90px 1fr; gap: 0.85rem; margin-bottom: 0.85rem; }
        .mpr-field { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
        .mpr-label {
          font-size: 0.63rem; font-weight: 700; color: #94A3B8;
          text-transform: uppercase; letter-spacing: 0.06em;
        }
        .mpr-input, .mpr-select {
          width: 100%; height: 44px; border-radius: 12px;
          border: 1.5px solid #E2E8F0; padding: 0 0.85rem;
          font-size: 0.875rem; font-family: 'DM Sans', sans-serif;
          color: #0F172A; outline: none; background: #FAFAFA;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
          -webkit-appearance: none; appearance: none;
        }
        .mpr-input:focus, .mpr-select:focus {
          border-color: #2D6A4F; background: white;
          box-shadow: 0 0 0 3px rgba(45,106,79,0.1);
        }
        .mpr-input:disabled, .mpr-select:disabled {
          background: #F8FAFC; color: #94A3B8;
          cursor: not-allowed; border-color: #F1F5F9;
        }
        .mpr-select { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'><path d='m6 9 6 6 6-6'/></svg>"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2.5rem; }

        .mpr-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
        .mpr-btn-primary {
          flex: 1; height: 48px;
          background: linear-gradient(135deg, #1A4731, #2D6A4F);
          color: white; border: none; border-radius: 14px;
          font-weight: 700; font-size: 0.9rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          box-shadow: 0 4px 14px rgba(26,71,49,0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .mpr-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(26,71,49,0.35); }
        .mpr-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .mpr-btn-cancel {
          flex: 1; height: 48px;
          background: #F1F5F9; color: #475569; border: none; border-radius: 14px;
          font-weight: 700; font-size: 0.9rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s ease;
        }
        .mpr-btn-cancel:hover { background: #E2E8F0; }

        .mpr-flash {
          margin-top: 1rem; padding: 0.9rem 1rem; border-radius: 14px;
          font-weight: 700; font-size: 0.8rem; text-align: center;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          animation: mpr-fadein 0.25s ease;
        }
        .mpr-flash.ok { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .mpr-flash.err { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
        @keyframes mpr-fadein { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

        @media (max-width: 520px) {
          .mpr-hero { gap: 1rem; padding: 1.5rem 1.25rem; }
          .mpr-avatar { width: 72px; height: 72px; border-radius: 16px; font-size: 1.8rem; }
          .mpr-hero-name { font-size: 1.45rem; }
          .mpr-panel { padding: 1.25rem; }
          .mpr-lock-overlay { padding: 1.5rem 1.25rem; }
          .mpr-grid-2 { gap: 0.55rem; }
          .mpr-grid-num { gap: 0.55rem; }
        }
      `}</style>

      <div className="mpr-wrap">

        {/* ── HERO ── */}
        <div className="mpr-hero">
          <div className="mpr-guinea-stripe">
            <span /><span /><span />
          </div>

          <div className="mpr-avatar-wrap">
            <div className="mpr-avatar">
              {currentPhoto ? (
                <Image src={currentPhoto} alt="Profil" width={88} height={88} className="mpr-avatar-img" unoptimized />
              ) : initials}
            </div>
            <label className="mpr-edit-photo" title="Changer la photo">
              <input
                type="file" ref={fileInputRef} hidden accept="image/*"
                onChange={handleQuickPhotoChange} disabled={uploadingPhoto}
              />
              {uploadingPhoto ? (
                <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" style={{ animation: 'mpr-spin 0.8s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </label>
          </div>

          <div className="mpr-hero-info">
            <div className="mpr-hero-role">
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Membre Officiel
            </div>
            <h2 className="mpr-hero-name">
              {firstName} <em>{lastName}</em>
            </h2>
            
            <div className="mpr-hero-id">
              ID: {me?.id ? me.id.substring(0, 8) : '—'}
            </div>

            <p className="mpr-hero-email">{me?.email}</p>
          </div>
        </div>

        {/* ── CARTE VERROUILLÉE ── */}
        {(isLocked || isExpired) && (
          <div className="mpr-card-lock-banner">
            <div className="mpr-lock-bg" />
            <div className="mpr-lock-overlay">
              <div className="mpr-lock-icon-wrap">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0F172A" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="mpr-lock-title">Carte verrouillée</div>
              <p className="mpr-lock-sub">
                {isExpired
                  ? "Votre carte a expiré. Veuillez la renouveler pour continuer à l'utiliser."
                  : "Réglez votre adhésion annuelle pour débloquer votre carte membre."}
              </p>
              <Link href="/member/contributions/new" className="mpr-lock-cta">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {isExpired ? 'Renouveler ma carte' : 'Régulariser ma cotisation'}
              </Link>
            </div>
          </div>
        )}

        {/* ── TOGGLE CARTE ── */}
        {!isLocked && !isExpired && (
          <button
            type="button"
            className="mpr-card-btn"
            onClick={() => setCardVisible(!cardVisible)}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            {cardVisible ? 'Masquer ma carte' : 'Afficher ma carte membre'}
          </button>
        )}

        {cardVisible && !isLocked && !isExpired && (
          <div style={{ marginBottom: '1.5rem' }}>
            <VirtualCardWidget card={liveCardData} />
          </div>
        )}

        {/* ── FORMULAIRE ── */}
        <form onSubmit={handleSubmit}>

          {/* IDENTITÉ & CONTACT */}
          <div className="mpr-panel">
            <h3 className="mpr-section-title">
              <span className="mpr-section-icon">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" /></svg>
              </span>
              Identité &amp; Contact
            </h3>
            <div className="mpr-grid-2">
              <div className="mpr-field">
                <label className="mpr-label">Prénom</label>
                <input className="mpr-input" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={!isEditing} required />
              </div>
              <div className="mpr-field">
                <label className="mpr-label">Nom</label>
                <input className="mpr-input" value={lastName} onChange={e => setLastName(e.target.value)} disabled={!isEditing} required />
              </div>
            </div>
            <div className="mpr-grid-2" style={{ marginBottom: 0 }}>
              <div className="mpr-field">
                <label className="mpr-label">Téléphone</label>
                <input className="mpr-input" value={phone} onChange={e => setPhone(e.target.value)} disabled={!isEditing} />
              </div>
              <div className="mpr-field">
                <label className="mpr-label">Email (fixe)</label>
                <input className="mpr-input" value={me?.email || ''} disabled />
              </div>
            </div>
          </div>

          {/* NAISSANCE & ORIGINE */}
          <div className="mpr-panel">
            <h3 className="mpr-section-title">
              <span className="mpr-section-icon">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM2 12h20" /></svg>
              </span>
              Naissance &amp; Origine
            </h3>
            <div className="mpr-grid-2">
              <div className="mpr-field">
                <label className="mpr-label">Date (JJ/MM/AAAA)</label>
                <input className="mpr-input" value={birthDate} onChange={handleBirthDateChange} disabled={!isEditing} placeholder="01/01/1990" />
              </div>
              <div className="mpr-field">
                <label className="mpr-label">Lieu de naissance</label>
                <input className="mpr-input" value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} disabled={!isEditing} />
              </div>
            </div>
            <div className="mpr-grid-2" style={{ marginBottom: 0 }}>
              <div className="mpr-field">
                <label className="mpr-label">Commune d&apos;origine</label>
                <select className="mpr-select" value={originSubPrefecture} onChange={e => setOriginSubPrefecture(e.target.value)} disabled={!isEditing}>
                  <option value="">Sélectionnez votre commune...</option>
                  {COMMUNES_ORIGINE.map(commune => (
                    <option key={commune} value={commune}>{commune}</option>
                  ))}
                </select>
              </div>
              <div className="mpr-field">
                <label className="mpr-label">Pays de naissance</label>
                <select className="mpr-select" value={birthCountry} onChange={e => setBirthCountry(e.target.value)} disabled={!isEditing}>
                  <option value="">Sélectionnez un pays...</option>
                  {COUNTRIES.map(c => (
                    <option key={`birth-${c.code}`} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* POSTE & PROFESSION */}
          <div className="mpr-panel">
            <h3 className="mpr-section-title">
              <span className="mpr-section-icon">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </span>
              Poste &amp; Profession
            </h3>
            <div className="mpr-grid-2" style={{ marginBottom: 0 }}>
              <div className="mpr-field">
                <label className="mpr-label">Poste dans l&apos;association</label>
                <select className="mpr-select" value={associationRole} onChange={e => setAssociationRole(e.target.value)} disabled={!isEditing}>
                  <option value="">Sélectionnez un poste…</option>
                  {ASSOCIATION_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="mpr-field">
                <label className="mpr-label">Profession / Situation</label>
                <select className="mpr-select" value={profession} onChange={e => setProfession(e.target.value)} disabled={!isEditing}>
                  <option value="">Sélectionnez une profession…</option>
                  {PROFESSION_LIST.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ADRESSE DE RÉSIDENCE */}
          <div className="mpr-panel">
            <h3 className="mpr-section-title">
              <span className="mpr-section-icon">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </span>
              Adresse de résidence
            </h3>
            <div className="mpr-grid-num">
              <div className="mpr-field">
                <label className="mpr-label">N° de rue</label>
                <input className="mpr-input" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} disabled={!isEditing} placeholder="N°" />
              </div>
              <div className="mpr-field">
                <label className="mpr-label">Libellé de voie</label>
                <input className="mpr-input" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} disabled={!isEditing} placeholder="Rue, Avenue…" />
              </div>
            </div>
            <div className="mpr-grid-2">
              <div className="mpr-field">
                <label className="mpr-label">Code postal</label>
                <input className="mpr-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} disabled={!isEditing} />
              </div>
              <div className="mpr-field">
                <label className="mpr-label">Ville</label>
                <input className="mpr-input" value={city} onChange={e => setCity(e.target.value)} disabled={!isEditing} />
              </div>
            </div>
            <div className="mpr-grid-1" style={{ marginBottom: 0 }}>
              <div className="mpr-field">
                <label className="mpr-label">Pays</label>
                <select className="mpr-select" value={country} onChange={e => setCountry(e.target.value)} disabled={!isEditing}>
                  <option value="">Sélectionnez un pays...</option>
                  {COUNTRIES.map(c => (
                    <option key={`res-${c.code}`} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mpr-actions">
            {!isEditing ? (
              <button type="button" className="mpr-btn-primary" onClick={() => setIsEditing(true)}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier mes informations
              </button>
            ) : (
              <>
                <button type="button" className="mpr-btn-cancel" onClick={handleCancel}>
                  Annuler
                </button>
                <button type="submit" className="mpr-btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" style={{ animation: 'mpr-spin 0.8s linear infinite' }}>
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                      </svg>
                      Sauvegarde…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      Enregistrer
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* MESSAGES */}
          {(message || photoMessage) && (
            <div className={`mpr-flash ${(message?.ok || photoMessage?.ok) ? 'ok' : 'err'}`}>
              {(message?.ok || photoMessage?.ok) ? (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" /></svg>
              )}
              {message?.text || photoMessage?.text}
            </div>
          )}
        </form>
      </div>
    </AppShell>
  );
}