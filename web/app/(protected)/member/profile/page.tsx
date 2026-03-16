//////// web/app/(protected)/member/profile/page.tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type VirtualCardData, type FullUserProfile } from '../../../../lib/api-client';
import { VirtualCardWidget } from '../../../../components/member/VirtualCardWidget';

type FlashMessage = { text: string; ok: boolean } | null;

function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:3001/api`;
  }
  return 'http://localhost:3001/api';
}

function Avatar({
  firstName, lastName, profilePhotoUrl, size = 86,
}: {
  firstName: string; lastName: string;
  profilePhotoUrl?: string | null; size?: number;
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  if (profilePhotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={profilePhotoUrl} alt="Photo de profil" style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        boxShadow: '0 6px 20px rgba(26,71,49,0.20)',
        border: '3px solid rgba(255,255,255,0.95)', flexShrink: 0,
        background: '#ECFDF5',
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1A4731, #2D6A4F)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white',
      fontFamily: "'Cormorant Garamond', serif",
      fontSize: size >= 80 ? '1.9rem' : '1.45rem',
      fontWeight: 600, letterSpacing: '0.04em',
      boxShadow: '0 6px 20px rgba(26,71,49,0.25)',
      flexShrink: 0,
    }}>
      {initials || '?'}
    </div>
  );
}

export default function MemberProfilePage() {
  const [me, setMe] = useState<FullUserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
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
    if (photoPreviewUrl) return photoPreviewUrl;
    if (!me?.profilePhotoUrl) return null;
    if (/^https?:\/\//i.test(me.profilePhotoUrl)) return me.profilePhotoUrl;
    if (me.profilePhotoUrl.startsWith('/')) return `${apiBaseUrl.replace(/\/api$/, '')}${me.profilePhotoUrl}`;
    return me.profilePhotoUrl;
  }, [apiBaseUrl, me?.profilePhotoUrl, photoPreviewUrl]);

  const liveCardData: VirtualCardData | null = me ? {
    cardNumber: me.virtualCard?.cardNumber || me.cardNumber || 'EN ATTENTE',
    isLocked: me.virtualCard?.isLocked ?? me.isCardLocked ?? false,
    expiresAt: me.virtualCard?.expiresAt || me.cardExpiresAt || null,
    qrToken: me.virtualCard?.qrToken || me.qrToken || 'preview-token',
    antennaName: me.antenna?.name || me.antennaName || 'Antenne non assignée',
    user: {
      firstName, lastName, birthDate, placeOfBirth,
      originVillage: originVillage || 'Non renseignée',
      originSubPrefecture: originVillage || 'Non renseignée',
      country, city, profilePhotoUrl: currentPhotoUrl,
    },
  } : null;

  // Récupération correcte du numéro adhérent selon le payload du backend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMemberNumber = me?.virtualCard?.cardNumber || (me as any)?.cardNumber;
  const displayMemberNumber = rawMemberNumber ? rawMemberNumber.replace(/-/g, '') : null;

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const user = await api.getMyProfile();
        if (!isMounted) return;
        setMe(user);
        populateFields(user);
      } catch (err) {
        if (isMounted) setMessage({ text: err instanceof Error ? err.message : 'Erreur chargement profil', ok: false });
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    return () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); };
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
    if (me) populateFields(me);
    setIsEditing(false);
    setMessage(null);
  }

  function handlePhotoInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoMessage(null);
    if (!file) {
      setSelectedPhotoFile(null);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
      return;
    }
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      e.target.value = '';
      setSelectedPhotoFile(null);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
      setPhotoMessage({ text: 'Formats autorisés : JPG, PNG, WEBP.', ok: false });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      e.target.value = '';
      setSelectedPhotoFile(null);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
      setPhotoMessage({ text: 'La photo ne doit pas dépasser 5 Mo.', ok: false });
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    const nextPreview = URL.createObjectURL(file);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(nextPreview);
  }

  async function handlePhotoUpload() {
    if (!selectedPhotoFile) {
      setPhotoMessage({ text: "Sélectionnez d'abord une photo.", ok: false });
      return;
    }
    setUploadingPhoto(true);
    setPhotoMessage(null);
    try {
      const result = await api.uploadProfilePhoto(selectedPhotoFile);
      const nextUser = result?.user ?? null;
      if (nextUser) { setMe(nextUser); populateFields(nextUser); }
      else if (result?.profilePhotoUrl && me) setMe({ ...me, profilePhotoUrl: result.profilePhotoUrl });
      setSelectedPhotoFile(null);
      setPhotoMessage({ text: result?.message || 'Photo mise à jour avec succès.', ok: true });
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(null);
      const input = document.getElementById('member-profile-photo-input') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (err) {
      setPhotoMessage({ text: err instanceof Error ? err.message : 'Erreur upload photo', ok: false });
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
      setMessage({ text: 'Profil mis à jour avec succès.', ok: true });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Erreur sauvegarde profil', ok: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Mon profil">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ── Variables palette — vert forêt + ambre chaud + ardoise ── */
        :root {
          --g-deep:    #1A4731;
          --g-mid:     #2D6A4F;
          --g-light:   #D1EAD9;
          --g-pale:    #ECFDF5;
          --g-border:  rgba(45,106,79,0.14);
          --g-accent:  rgba(45,106,79,0.08);
          /* Ambre — touches chaleureuses */
          --a-deep:    #92400E;
          --a-mid:     #B45309;
          --a-pale:    #FEF3C7;
          --a-border:  #FDE68A;
          /* Ardoise — textes neutres */
          --s-dark:    #0F2318;
          --s-mid:     #2D4A3A;
          --s-muted:   #52796A;
          --shadow-sm: 0 2px 10px rgba(26,71,49,0.07);
          --shadow-md: 0 4px 20px rgba(26,71,49,0.10);
        }

        .mpr-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(0.85rem, 2.5vw, 2rem);
          max-width: 1100px;
          margin: 0 auto;
        }

        /* ── Layout héro desktop ── */
        .mpr-hero {
          display: grid;
          grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
          gap: 1rem;
          align-items: start;
          margin-bottom: 1rem;
        }

        /* ── Cards communes ── */
        .mpr-hero-card,
        .mpr-panel {
          background: rgba(247,253,249,0.95);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid var(--g-border);
          box-shadow: var(--shadow-sm), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          opacity: 0;
          transform: translateY(10px);
          animation: mprin 0.45s cubic-bezier(.22,1,.36,1) forwards;
        }

        .mpr-hero-card {
          padding: 1.1rem;
          animation-delay: 0.03s;
          /* Dégradé subtil vert → blanc pour la carte héro */
          background: linear-gradient(160deg, rgba(209,234,217,0.45) 0%, rgba(247,253,249,0.98) 55%);
        }

        .mpr-panel { animation-delay: 0.08s; }

        .mpr-card-panel {
          padding: 1.75rem 1rem;
          margin-bottom: 1rem;
          background: linear-gradient(180deg, rgba(209,234,217,0.35) 0%, rgba(247,253,249,0.9) 100%);
        }

        /* ── Header profil ── */
        .mpr-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.1rem;
        }
        .mpr-header-text { min-width: 0; overflow: hidden; }

        /* Wrapper Avatar pour pouvoir le forcer à rétrécir en CSS pur */
        .mpr-avatar-wrapper { width: 80px; height: 80px; flex-shrink: 0; }
        .mpr-avatar-wrapper > div, .mpr-avatar-wrapper > img { width: 100% !important; height: 100% !important; }

        .mpr-eyebrow {
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.13em; text-transform: uppercase;
          color: var(--g-mid);
          margin-bottom: 0.28rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .mpr-eyebrow-dot {
          width: 6px; height: 6px;
          background: var(--g-mid); border-radius: 50%;
          animation: mprpulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes mprpulse { 0%,100%{opacity:1} 50%{opacity:.3} }

        .mpr-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.35rem, 3vw, 1.85rem);
          font-weight: 600; color: #0F1F16;
          letter-spacing: -0.02em; line-height: 1.15;
          word-break: break-word;
        }
        .mpr-subtitle {
          font-size: 0.78rem; color: #52796A;
          margin-top: 0.25rem; overflow-wrap: anywhere;
        }

        /* ── Photo card ── */
        .mpr-hero-photo-card {
          border-radius: 16px;
          background: linear-gradient(180deg, var(--g-pale) 0%, rgba(255,255,255,0.98) 100%);
          border: 1px solid var(--g-border);
          padding: 1rem;
        }
        .mpr-photo-top {
          display: flex; align-items: center; gap: 0.85rem;
          margin-bottom: 1rem;
        }
        .mpr-photo-top-meta { min-width: 0; }
        .mpr-photo-top-name {
          font-size: 0.92rem; font-weight: 700; color: #0F1F16;
          line-height: 1.25; word-break: break-word;
        }
        .mpr-photo-top-role { margin-top: 0.18rem; font-size: 0.7rem; color: #52796A; }

        .mpr-photo-box {
          border: 1.5px dashed rgba(45,106,79,0.22);
          border-radius: 16px; padding: 0.9rem;
          background: rgba(255,255,255,0.75);
        }
        .mpr-photo-preview {
          width: 100%; min-height: 200px;
          border-radius: 12px;
          border: 1px solid var(--g-border);
          background: var(--g-pale);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; margin-bottom: 0.85rem;
        }
        .mpr-photo-preview img {
          width: 100%; height: 100%; max-height: 320px;
          object-fit: cover; display: block;
        }
        .mpr-photo-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 0.6rem; text-align: center; color: #52796A; padding: 1rem;
        }
        .mpr-photo-empty-badge {
          width: 52px; height: 52px; border-radius: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          background: var(--g-pale); color: var(--g-mid);
        }
        .mpr-photo-empty-title { font-size: 0.86rem; font-weight: 700; color: #0F1F16; }
        .mpr-photo-empty-sub { font-size: 0.74rem; line-height: 1.5; max-width: 240px; }

        .mpr-photo-help {
          margin-top: 0.55rem; font-size: 0.7rem;
          color: #52796A; line-height: 1.5;
        }
        .mpr-photo-actions {
          display: flex; flex-wrap: wrap;
          gap: 0.65rem; align-items: center;
        }
        .mpr-file-label {
          min-height: 44px; padding: 0.65rem 0.95rem;
          border-radius: 11px;
          border: 1px solid var(--g-border);
          background: white; color: var(--g-deep);
          font-size: 0.82rem; font-weight: 700;
          display: inline-flex; align-items: center; justify-content: center;
          gap: 0.45rem; cursor: pointer; transition: all 0.18s;
        }
        .mpr-file-label:hover { border-color: var(--g-mid); box-shadow: 0 0 0 3px var(--g-accent); }
        .mpr-file-input { display: none; }

        .mpr-upload-btn {
          min-height: 44px; padding: 0.65rem 1.05rem;
          background: linear-gradient(135deg, var(--g-deep), var(--g-mid));
          border: none; border-radius: 11px; color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem; font-weight: 700;
          cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem;
          box-shadow: 0 4px 14px rgba(26,71,49,0.22);
          transition: transform 0.15s, box-shadow 0.2s, opacity 0.2s;
        }
        .mpr-upload-btn:hover:not(:disabled) {
          transform: translateY(-1px); box-shadow: 0 6px 18px rgba(26,71,49,0.28);
        }
        .mpr-upload-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .mpr-file-name { font-size: 0.73rem; color: #52796A; word-break: break-word; }

        /* ── Sections formulaire ── */
        .mpr-section {
          padding: clamp(1rem, 3%, 1.35rem) clamp(0.9rem, 4%, 1.4rem);
          border-bottom: 1px solid rgba(45,106,79,0.07);
        }
        .mpr-section:last-of-type { border-bottom: none; }

        .mpr-section-head {
          display: flex; align-items: center; gap: 0.55rem;
          flex-wrap: wrap; margin-bottom: 1rem;
        }
        .mpr-section-ico {
          width: 28px; height: 28px; border-radius: 8px;
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        }
        .mpr-section-title {
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: #1A3328;
        }
        .mpr-section-hint {
          font-size: 0.67rem; color: #B45309;
          background: #FEF3C7; border: 1px solid #FDE68A;
          border-radius: 99px; padding: 0.1rem 0.5rem;
          margin-left: auto; font-style: normal; font-weight: 600;
        }

        /* ── Grilles ── */
        .mpr-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
        }
        .mpr-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.85rem;
        }

        /* ── Champs ── */
        .mpr-field { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
        .mpr-label {
          font-size: 0.66rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--g-mid);    /* vert au lieu de bleu */
        }
        .mpr-label .mpr-opt {
          font-weight: 400; color: #94A3B8;
          text-transform: none; letter-spacing: 0;
          font-size: 0.61rem; margin-left: 0.28rem;
        }
        .mpr-input {
          min-height: 46px; border-radius: 11px;
          border: 1px solid rgba(45,106,79,0.16);
          background: rgba(255,255,255,0.88);
          padding: 0 0.9rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; color: #0F1F16;
          outline: none; width: 100%; -webkit-appearance: none;
          transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
        }
        .mpr-input:focus {
          border-color: var(--g-mid);
          background: white;
          box-shadow: 0 0 0 3px rgba(45,106,79,0.10);
        }
        .mpr-input:disabled {
          background: rgba(236,253,245,0.6);
          color: #2D4A3A; cursor: default;
          border-color: rgba(45,106,79,0.10);
          font-weight: 500;
        }
        .mpr-input::placeholder { color: rgba(82,121,106,0.4); }

        .mpr-email-wrap { position: relative; }
        .mpr-email-lock {
          position: absolute; right: 0.8rem; top: 50%;
          transform: translateY(-50%);
          color: rgba(45,106,79,0.35); pointer-events: none;
        }
        .mpr-email-input { padding-right: 2.2rem !important; }

        /* ── Footer boutons ── */
        .mpr-footer {
          padding: clamp(0.9rem, 3%, 1.3rem) clamp(0.9rem, 4%, 1.4rem);
          border-top: 1px solid rgba(45,106,79,0.08);
          display: flex; align-items: center;
          gap: 0.8rem; flex-wrap: wrap;
        }
        .mpr-submit-btn {
          min-height: 48px; padding: 0 1.25rem;
          background: linear-gradient(135deg, var(--g-deep), var(--g-mid));
          border: none; border-radius: 12px; color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.86rem; font-weight: 700; letter-spacing: 0.04em;
          cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem;
          box-shadow: 0 4px 16px rgba(26,71,49,0.25);
          transition: transform 0.15s, box-shadow 0.25s;
          white-space: nowrap;
        }
        .mpr-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px); box-shadow: 0 8px 22px rgba(26,71,49,0.35);
        }
        .mpr-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .mpr-cancel-btn {
          min-height: 48px; padding: 0 1.25rem;
          background: rgba(236,253,245,0.9);
          border: 1px solid rgba(45,106,79,0.18);
          border-radius: 12px; color: var(--g-mid);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.86rem; font-weight: 700;
          cursor: pointer; transition: all 0.18s;
        }
        .mpr-cancel-btn:hover:not(:disabled) {
          background: #D1EAD9; color: var(--g-deep);
        }
        .mpr-cancel-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Spinner ── */
        .mpr-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: mprspin 0.7s linear infinite;
        }
        @keyframes mprspin { to { transform: rotate(360deg); } }

        /* ── Toasts ── */
        .mpr-toast {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.68rem 0.9rem; border-radius: 10px;
          font-size: 0.77rem; font-weight: 600; border: 1px solid;
          animation: mprin 0.3s cubic-bezier(.22,1,.36,1);
        }
        .mpr-toast.ok  { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
        .mpr-toast.err { background: #FEF2F2; color: #B91C1C; border-color: #FECACA; }

        /* ── Loader ── */
        .mpr-loader {
          display: flex; align-items: center; justify-content: center;
          padding: 3rem; gap: 0.75rem; color: #52796A; font-size: 0.82rem;
        }
        .mpr-loader-ring {
          width: 22px; height: 22px;
          border: 2.5px solid rgba(45,106,79,0.12);
          border-top-color: var(--g-mid);
          border-radius: 50%; animation: mprspin 0.8s linear infinite;
        }

        /* ── Numéro adhérent ── */
        .mpr-member-number {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-top: 0.3rem; /* Espace après le nom */
          margin-bottom: 0.1rem; /* Espace avant l'email */
          max-width: 100%;
        }
        .mpr-member-number-label {
          font-size: 0.6rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #92400E; /* Ambre chaud profond */
          background: #FEF3C7; /* Ambre chaud pâle */
          border: 1px solid #FDE68A; /* Bordure ambre */
          border-radius: 99px;
          padding: 0.12rem 0.5rem;
          white-space: nowrap; /* Empêche le retour à la ligne du label */
          flex-shrink: 0;
        }
        .mpr-member-number-value {
          font-size: 0.8rem;
          font-weight: 700;
          color: #78350F; /* Couleur de texte ambre sombre */
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.06em;
          white-space: nowrap; /* Force sur une ligne */
        }

        @keyframes mprin { to { opacity:1; transform:translateY(0); } }

        /* ── FAB Carte ── */
        .mpr-card-fab {
          display: flex; align-items: center; gap: 0.55rem;
          margin-bottom: 1rem;
          padding: 0.75rem 1.4rem;
          background: linear-gradient(135deg, var(--g-deep), var(--g-mid));
          border: none; border-radius: 50px; color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(26,71,49,0.28);
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .mpr-card-fab:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(26,71,49,0.35); }
        .mpr-card-fab:active { transform: scale(0.97); }

        /* ── Modale carte ── */
        .mpr-card-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
          animation: mprfadein 0.22s ease forwards;
        }
        @keyframes mprfadein { from { opacity:0 } to { opacity:1 } }
        .mpr-card-modal {
          position: relative; width: 100%; max-width: 420px;
          animation: mprscalein 0.28s cubic-bezier(.22,1,.36,1) forwards;
        }
        @keyframes mprscalein {
          from { opacity:0; transform: scale(0.88) translateY(18px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        .mpr-card-modal-close {
          position: absolute; top: -0.7rem; right: -0.7rem; z-index: 10;
          width: 32px; height: 32px;
          background: white; border: 1px solid rgba(0,0,0,0.10);
          border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.14); color: #374151;
          transition: background 0.15s, transform 0.15s;
        }
        .mpr-card-modal-close:hover { background: #F3F4F6; transform: scale(1.1); }

        /* ══════════════════════════════════════
           RESPONSIVE
        ══════════════════════════════════════ */

        /* Tablette */
        @media (max-width: 980px) {
          .mpr-hero { grid-template-columns: 1fr; }
        }
        @media (max-width: 820px) {
          .mpr-grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        /* ── MOBILE ── */
        @media (max-width: 640px) {
          .mpr-wrap { padding: 0.65rem 0.65rem 5rem; }

          /* Hero photo card plus compacte */
          .mpr-hero-card { padding: 0.85rem; }

          /* Entête en 2 colonnes sur mobile */
          .mpr-header {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: 0.75rem;
          }

          /* Réduction de la taille de l'avatar pour gagner de la place */
          .mpr-avatar-wrapper { width: 62px; height: 62px; }
          .mpr-avatar-wrapper > div { font-size: 1.15rem !important; }

          /* Ajustement chirurgical du numéro adhérent pour éviter qu'il ne coupe */
          .mpr-member-number { gap: 0.3rem; }
          .mpr-member-number-label {
            font-size: 0.5rem;
            padding: 0.1rem 0.35rem;
            letter-spacing: 0.08em;
          }
          .mpr-member-number-value {
            font-size: 0.72rem;
            letter-spacing: 0.02em;
          }

          /* Coupe propre de l'email s'il est trop long au lieu de casser la grille */
          .mpr-subtitle { 
            font-size: 0.75rem; 
            white-space: nowrap; 
            overflow: hidden; 
            text-overflow: ellipsis; 
          }

          /* Avatar plus petit sur mobile */
          .mpr-card-panel { padding: 1.25rem 0.65rem; }

          /* Photo preview moins haute */
          .mpr-photo-preview { min-height: 160px; }

          /* Sections : padding réduit */
          .mpr-section {
            padding: 0.9rem 0.75rem;
          }

          /* Grilles → 2 colonnes maintenues pour grid-2 sur mobile */
          .mpr-grid-2 { gap: 0.7rem; }

          /* Labels un peu moins hauts */
          .mpr-input { min-height: 44px; font-size: 0.86rem; }

          /* Section hint passe en dessous du titre */
          .mpr-section-hint { margin-left: 0; width: 100%; }

          /* Footer : boutons pleine largeur, empilés */
          .mpr-footer {
            flex-direction: column; align-items: stretch; gap: 0.6rem;
            padding: 0.85rem 0.75rem;
          }
          .mpr-submit-btn,
          .mpr-cancel-btn,
          .mpr-upload-btn,
          .mpr-file-label {
            width: 100%; justify-content: center;
            min-height: 50px;
          }
          .mpr-toast { width: 100%; }

          /* Photo actions empilées */
          .mpr-photo-actions { flex-direction: column; }
          .mpr-photo-top { align-items: flex-start; }

          /* Titre profil plus petit */
          .mpr-title { font-size: 1.3rem; }

          /* Toast photo */
          .mpr-photo-help { font-size: 0.68rem; }
        }

        /* Très petit mobile */
        @media (max-width: 380px) {
          .mpr-wrap { padding: 0.5rem 0.5rem 5rem; }
          .mpr-section-title { font-size: 0.63rem; }
          .mpr-label { font-size: 0.62rem; }
        }
      `}</style>

      <div className="mpr-wrap">
        <div className="mpr-hero">
          {/* ── Colonne gauche : avatar + photo ── */}
          <div className="mpr-hero-card">
            <div className="mpr-header">
              <div className="mpr-avatar-wrapper">
                <Avatar firstName={firstName} lastName={lastName} profilePhotoUrl={currentPhotoUrl} size={80} />
              </div>
              <div className="mpr-header-text">
                <div className="mpr-eyebrow">
                  <div className="mpr-eyebrow-dot" />
                  Espace membre
                </div>
                <h1 className="mpr-title">
                  {firstName || lastName ? (
                    <>{firstName}{' '}
                      <span style={{ fontStyle: 'italic', color: 'var(--g-mid)' }}>{lastName}</span>
                    </>
                  ) : 'Mon profil'}
                </h1>
                {displayMemberNumber && (
                  <p className="mpr-member-number">
                    <span className="mpr-member-number-label">N° adhérent</span>
                    <span className="mpr-member-number-value">{displayMemberNumber}</span>
                  </p>
                )}
                {me?.email && <p className="mpr-subtitle">{me.email}</p>}
              </div>
            </div>

            <div className="mpr-hero-photo-card">
              <div className="mpr-photo-box">
                <div className="mpr-photo-actions">
                  <label className="mpr-file-label" htmlFor="member-profile-photo-input">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                    </svg>
                    Choisir une photo
                  </label>
                  <input id="member-profile-photo-input" className="mpr-file-input" type="file"
                    accept="image/jpeg,image/png,image/webp" onChange={handlePhotoInputChange} />

                  <button type="button" className="mpr-upload-btn"
                    onClick={handlePhotoUpload} disabled={uploadingPhoto || !selectedPhotoFile}>
                    {uploadingPhoto ? (
                      <><div className="mpr-spinner" />Upload…</>
                    ) : (
                      <><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M16 8l-4-4m0 0L8 8m4-4v12"/>
                      </svg>Enregistrer</>
                    )}
                  </button>
                </div>

                {selectedPhotoFile && (
                  <div className="mpr-file-name" style={{ marginTop: '0.6rem' }}>
                    Fichier : <strong>{selectedPhotoFile.name}</strong>
                  </div>
                )}
                <div className="mpr-photo-help">Max 5 Mo · JPG, PNG, WEBP</div>

                {photoMessage && (
                  <div className={`mpr-toast${photoMessage.ok ? ' ok' : ' err'}`} style={{ marginTop: '0.8rem' }}>
                    {photoMessage.ok
                      ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                    }
                    {photoMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Colonne droite : carte + formulaire ── */}
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
                {/* ── Bouton FAB carte ── */}
                {me && (
                  <button
                    type="button"
                    className="mpr-card-fab"
                    onClick={() => setCardVisible(v => !v)}
                  >
                    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                    </svg>
                    {cardVisible ? 'Masquer ma carte' : 'Ma carte'}
                  </button>
                )}

                {/* ── Modale carte ── */}
                {cardVisible && (
                  <div className="mpr-card-overlay" onClick={() => setCardVisible(false)}>
                    <div className="mpr-card-modal" onClick={e => e.stopPropagation()}>
                      <button className="mpr-card-modal-close" onClick={() => setCardVisible(false)} aria-label="Fermer">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                      <VirtualCardWidget card={liveCardData} />
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mpr-panel">

                    {/* ── Identité ── */}
                    <div className="mpr-section">
                      <div className="mpr-section-head">
                        <div className="mpr-section-ico" style={{ background: '#ECFDF5', color: 'var(--g-mid)' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                          </svg>
                        </div>
                        <span className="mpr-section-title">Identité</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">Prénom</label>
                            <input className="mpr-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Votre prénom" disabled={!isEditing} />
                          </div>
                          <div className="mpr-field">
                            <label className="mpr-label">Nom</label>
                            <input className="mpr-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Votre nom" disabled={!isEditing} />
                          </div>
                        </div>
                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">Email <span className="mpr-opt">(identifiant)</span></label>
                            <div className="mpr-email-wrap">
                              <input className="mpr-input mpr-email-input" disabled value={me?.email || ''} />
                              <span className="mpr-email-lock">
                                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                                </svg>
                              </span>
                            </div>
                          </div>
                          <div className="mpr-field">
                            <label className="mpr-label">Téléphone</label>
                            <input className="mpr-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+33 6 xx xx xx xx" disabled={!isEditing} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Naissance & Origine ── */}
                    <div className="mpr-section">
                      <div className="mpr-section-head">
                        <div className="mpr-section-ico" style={{ background: '#FEF3C7', color: '#B45309' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                        </div>
                        <span className="mpr-section-title">Naissance & Origine</span>
                        <span className="mpr-section-hint">Requis pour la carte membre</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">Date de naissance</label>
                            <input className="mpr-input" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} disabled={!isEditing} />
                          </div>
                          <div className="mpr-field">
                            <label className="mpr-label">Lieu de naissance</label>
                            <input className="mpr-input" value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} placeholder="Ville" disabled={!isEditing} />
                          </div>
                        </div>
                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">Pays de naissance</label>
                            <input className="mpr-input" value={countryOfBirth} onChange={e => setCountryOfBirth(e.target.value)} placeholder="Pays" disabled={!isEditing} />
                          </div>
                          <div className="mpr-field">
                            <label className="mpr-label">Commune d&apos;origine</label>
                            <input className="mpr-input" value={originVillage} onChange={e => setOriginVillage(e.target.value)} placeholder="Ex: Korbé" disabled={!isEditing} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Adresse ── */}
                    <div className="mpr-section">
                      <div className="mpr-section-head">
                        <div className="mpr-section-ico" style={{ background: '#F0FDFA', color: '#0F766E' }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                        </div>
                        <span className="mpr-section-title">Adresse de résidence</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div className="mpr-field">
                          <label className="mpr-label">Ligne 1</label>
                          <input className="mpr-input" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="N° et nom de rue" disabled={!isEditing} />
                        </div>
                        <div className="mpr-field">
                          <label className="mpr-label">Ligne 2 <span className="mpr-opt">(optionnel)</span></label>
                          <input className="mpr-input" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Appartement, bâtiment…" disabled={!isEditing} />
                        </div>
                        {/* Grille CP/Ville sur une ligne, Pays sur une autre, pour 2 colonnes propres sur mobile */}
                        <div className="mpr-grid-2">
                          <div className="mpr-field">
                            <label className="mpr-label">Code postal</label>
                            <input className="mpr-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" disabled={!isEditing} />
                          </div>
                          <div className="mpr-field">
                            <label className="mpr-label">Ville</label>
                            <input className="mpr-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" disabled={!isEditing} />
                          </div>
                        </div>
                        <div className="mpr-field">
                          <label className="mpr-label">Pays</label>
                          <input className="mpr-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="France" disabled={!isEditing} />
                        </div>
                      </div>
                    </div>

                    {/* ── Footer boutons ── */}
                    <div className="mpr-footer">
                      {!isEditing ? (
                        <button type="button" className="mpr-submit-btn" onClick={() => setIsEditing(true)}>
                          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                          </svg>
                          Modifier mes informations
                        </button>
                      ) : (
                        <>
                          <button type="button" className="mpr-cancel-btn" onClick={handleCancel} disabled={saving}>Annuler</button>
                          <button type="submit" className="mpr-submit-btn" disabled={saving}>
                            {saving
                              ? <><div className="mpr-spinner" />Enregistrement…</>
                              : <><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Mettre à jour</>
                            }
                          </button>
                        </>
                      )}
                      {message && (
                        <div className={`mpr-toast${message.ok ? ' ok' : ' err'}`}>
                          {message.ok
                            ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            : <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                          }
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