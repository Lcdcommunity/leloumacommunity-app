// web/app/(public)/signup/page.tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '../../../lib/api-client';

type PublicAntenna = {
  id: string;
  code: string;
  name: string;
  city?: string;
  country?: string;
};

const STEPS = ['Identité', 'Contact', 'Photo', 'Sécurité'];

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
  { name: 'Guinée', code: 'GN', dial: '+224', phoneLength: 9 },
  { name: 'France', code: 'FR', dial: '+33', phoneLength: 9 },
  { name: 'Sénégal', code: 'SN', dial: '+221', phoneLength: 9 },
  { name: 'Côte d\'Ivoire', code: 'CI', dial: '+225', phoneLength: 10 },
  { name: 'Mali', code: 'ML', dial: '+223', phoneLength: 8 },
  { name: 'Maroc', code: 'MA', dial: '+212', phoneLength: 9 },
  { name: 'Canada', code: 'CA', dial: '+1', phoneLength: 10 },
  { name: 'États-Unis', code: 'US', dial: '+1', phoneLength: 10 },
  { name: 'Belgique', code: 'BE', dial: '+32', phoneLength: 9 },
  { name: 'Suisse', code: 'CH', dial: '+41', phoneLength: 9 },
  { name: 'Allemagne', code: 'DE', dial: '+49', phoneLength: 10 },
  { name: 'Royaume-Uni', code: 'GB', dial: '+44', phoneLength: 10 },
  { name: 'Espagne', code: 'ES', dial: '+34', phoneLength: 9 },
  { name: 'Italie', code: 'IT', dial: '+39', phoneLength: 10 },
  { name: 'Sierra Leone', code: 'SL', dial: '+232', phoneLength: 8 },
  { name: 'Libéria', code: 'LR', dial: '+231', phoneLength: 8 },
  { name: 'Guinée-Bissau', code: 'GW', dial: '+245', phoneLength: 9 },
  { name: 'Gambie', code: 'GM', dial: '+220', phoneLength: 7 },
  { name: 'Angola', code: 'AO', dial: '+244', phoneLength: 9 },
  { name: 'Cameroun', code: 'CM', dial: '+237', phoneLength: 9 },
  { name: 'Niger', code: 'NE', dial: '+227', phoneLength: 8 },
  { name: 'Afrique du Sud', code: 'ZA', dial: '+27', phoneLength: 9 },
  { name: 'Mozambique', code: 'MZ', dial: '+258', phoneLength: 9 },
  { name: 'Portugal', code: 'PT', dial: '+351', phoneLength: 9 },
  { name: 'Autre (Non listé)', code: 'OTHER', dial: '+', phoneLength: 0 }
].sort((a, b) => a.name.localeCompare(b.name));

export default function MemberSignupPage() {
  const [antennas, setAntennas] = useState<PublicAntenna[]>([]);
  const [loadingAntennas, setLoadingAntennas] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  // ── Étape 0 : Identité ──
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [antennaId, setAntennaId] = useState('');

  // ── Étape 1 : Contact & Origine ──
  const [email, setEmail] = useState('');
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

  // ── Étape 2 : Photo ──
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // ── Étape 3 : Sécurité ──
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  useEffect(() => {
    setMounted(true);
    void (async () => {
      try {
        const items = await api.listPublicAntennasForSignup();
        setAntennas(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement antennes');
      } finally {
        setLoadingAntennas(false);
      }
    })();
  }, []);

  useEffect(() => {
    return () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); };
  }, [photoPreviewUrl]);

  // Logique de mise à jour dynamique de l'indicatif téléphonique
  useEffect(() => {
    if (country) {
      const selectedCountry = COUNTRIES.find(c => c.name === country);
      if (selectedCountry) {
        if (!phone || phone.trim() === '' || !phone.includes(' ')) {
          setPhone(`${selectedCountry.dial} `);
        } else {
          const phoneParts = phone.split(' ');
          if (phoneParts.length > 1) {
            phoneParts[0] = selectedCountry.dial;
            setPhone(phoneParts.join(' '));
          }
        }
      }
    }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

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
    return `${year}-${month}-${day}`;
  };

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoError(null);
    if (!file) { setSelectedPhotoFile(null); setPhotoPreviewUrl(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Formats autorisés : JPG, PNG, WEBP.');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('La photo ne doit pas dépasser 5 Mo.');
      e.target.value = '';
      return;
    }
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!firstName.trim()) return 'Le prénom est requis.';
      if (!lastName.trim()) return 'Le nom est requis.';
      if (!antennaId) return 'Veuillez sélectionner une antenne.';
    }
    if (s === 1) {
      if (!email.trim()) return "L'email est requis.";
      if (!/\S+@\S+\.\S+/.test(email)) return "Format d'email invalide.";
      if (!originSubPrefecture) return "La commune d'origine est requise.";
      if (birthDate && birthDate.length < 10) return "La date de naissance doit être complète (JJ/MM/AAAA).";
      
      // Validation dynamique du téléphone
      if (phone && country) {
        const selectedCountry = COUNTRIES.find(c => c.name === country);
        if (selectedCountry && selectedCountry.phoneLength > 0) {
          const numberPart = phone.split(' ')[1] ? phone.split(' ')[1].replace(/\D/g, '') : '';
          if (numberPart.length !== selectedCountry.phoneLength) {
             return `Pour ${selectedCountry.name}, le numéro (sans l'indicatif) doit faire exactement ${selectedCountry.phoneLength} chiffres.`;
          }
        }
      }
    }
    if (s === 3) {
      if (!password) return 'Le mot de passe est requis.';
      if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.';
      if (password !== passwordConfirm) return 'Les mots de passe ne correspondent pas.';
      if (!termsAccepted) return 'Vous devez accepter les Mentions Légales et la Politique de Confidentialité pour continuer.';
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setError(null);
    setStep(s => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const err = validateStep(3);
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);

    try {
      await api.memberSignup({
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password,
        antennaId,
        originSubPrefecture,
        birthDate: convertDateToISO(birthDate),
        placeOfBirth: placeOfBirth || undefined,
        birthCountry: birthCountry || undefined,
        city: city || undefined,
        country: country || undefined,
        postalCode: postalCode || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        function: associationRole || profession || undefined,
        termsAccepted,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any); 

      if (selectedPhotoFile) {
        const formData = new FormData();
        formData.append('avatar', selectedPhotoFile);
        try { await api.uploadAvatar(formData); } catch { /* ignore */ }
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inscription');
    } finally {
      setSubmitting(false);
    }
  }

  const pwdStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Faible', 'Moyen', 'Bon', 'Fort'][pwdStrength];
  const strengthColor = ['', '#E05050', '#E09030', '#059669', '#047857'][pwdStrength];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --theme-blue: #2563EB;
          --theme-blue-dark: #1D4ED8;
          --theme-green: #059669;
          --theme-green-light: #10B981;
          --bg-color: #F8FAFC;
          --err: #B91C1C;
        }

        .sp-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100svh;
          background: linear-gradient(150deg, #F0F4F8 0%, #E2E8F0 40%, #DBEAFE 100%);
          display: flex; align-items: flex-start; justify-content: center;
          position: relative; overflow: hidden;
          padding: 2rem 1.25rem 3rem;
        }
        .sp-orb { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none; }
        .sp-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%); top: -150px; right: -100px; animation: oa 16s ease-in-out infinite alternate; }
        .sp-orb-2 { width: 360px; height: 360px; background: radial-gradient(circle, rgba(5,150,105,0.12) 0%, transparent 70%); bottom: -80px; left: -80px; animation: ob 20s ease-in-out infinite alternate; }
        @keyframes oa { from{transform:translate(0,0)} to{transform:translate(-40px,40px)} }
        @keyframes ob { from{transform:translate(0,0)} to{transform:translate(30px,-30px)} }
        .sp-bg-grid { position: fixed; inset: 0; background-image: linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px); background-size: 56px 56px; pointer-events: none; }

        .sp-card { position: relative; z-index: 10; width: 100%; max-width: 600px; background: rgba(255,255,255,0.95); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(37,99,235,0.1); border-radius: 28px; padding: clamp(1.5rem, 5vw, 2.75rem); box-shadow: 0 0 0 1px rgba(255,255,255,0.85) inset, 0 24px 64px rgba(37,99,235,0.08), 0 4px 16px rgba(37,99,235,0.05); opacity: 0; transform: translateY(28px); transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1); margin-top: 0.5rem; }
        .sp-card.visible { opacity: 1; transform: translateY(0); }

        .sp-header { text-align: center; margin-bottom: 1.75rem; }
        .sp-badge { display: inline-flex; align-items: center; gap: 0.4rem; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 99px; padding: 0.3rem 0.85rem; font-size: 0.72rem; font-weight: 700; color: var(--theme-blue-dark); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.9rem; }
        .sp-badge-dot { width: 6px; height: 6px; background: var(--theme-blue); border-radius: 50%; animation: blink 2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .sp-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.6rem, 4.5vw, 2.3rem); font-weight: 600; color: #1E3A8A; letter-spacing: -0.02em; line-height: 1.15; }
        .sp-title span { background: linear-gradient(135deg, var(--theme-blue-dark), var(--theme-blue)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .sp-subtitle { font-size: 0.82rem; color: #64748B; margin-top: 0.45rem; line-height: 1.6; font-weight: 500; }

        .sp-stepper { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 1.75rem; }
        .sp-step-item { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; position: relative; flex: 1; }
        .sp-step-item:not(:last-child)::after { content: ''; position: absolute; top: 13px; left: calc(50% + 14px); width: calc(100% - 28px); height: 1px; background: #E2E8F0; transition: background 0.4s; }
        .sp-step-item.done:not(:last-child)::after { background: var(--theme-green); }
        .sp-step-circle { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #CBD5E1; background: white; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; color: #94A3B8; transition: all 0.3s cubic-bezier(.22,1,.36,1); position: relative; z-index: 1; }
        .sp-step-item.active .sp-step-circle { border-color: var(--theme-blue); background: var(--theme-blue); color: white; box-shadow: 0 0 0 4px rgba(37,99,235,0.15); }
        .sp-step-item.done .sp-step-circle { border-color: var(--theme-green); background: #ECFDF5; color: var(--theme-green); }
        .sp-step-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #94A3B8; transition: color 0.3s; }
        .sp-step-item.active .sp-step-label { color: var(--theme-blue-dark); }
        .sp-step-item.done .sp-step-label { color: var(--theme-green); }

        .sp-section-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--theme-green); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .sp-section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, #A7F3D0, transparent); }

        .sp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
        .sp-stack { display: flex; flex-direction: column; gap: 0.2rem; }
        .sp-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }
        .sp-label { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--theme-green); }
        .sp-label .sp-opt { font-weight: 500; color: #94A3B8; text-transform: none; letter-spacing: 0; font-size: 0.65rem; margin-left: 0.3rem; }
        .sp-input-wrap { position: relative; }
        .sp-input, .sp-select { width: 100%; min-height: 48px; border-radius: 12px; border: 1.5px solid #E2E8F0; background: #FFFFFF; padding: 0 1rem; color: #111827; font-weight: 500; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .sp-input:focus, .sp-select:focus { border-color: var(--theme-blue); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .sp-input.has-icon { padding-right: 2.8rem; }
        .sp-select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; appearance: none; }
        .sp-eye-btn { position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94A3B8; cursor: pointer; padding: 4px; display: flex; align-items: center; }
        .sp-pwd-strength { display: flex; gap: 4px; margin-top: 0.4rem; align-items: center; }
        .sp-pwd-bar { flex: 1; height: 4px; border-radius: 99px; background: #E2E8F0; overflow: hidden; }
        .sp-pwd-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s, background 0.4s; }
        .sp-pwd-label { font-size: 0.65rem; font-weight: 700; margin-left: 0.4rem; min-width: 36px; }

        .sp-notice { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.78rem; color: var(--theme-blue-dark); font-weight: 500; line-height: 1.5; margin-bottom: 1.2rem; display: flex; gap: 0.6rem; align-items: flex-start; }
        .sp-error { display: flex; align-items: center; gap: 0.55rem; padding: 0.8rem 1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: var(--err); font-size: 0.8rem; font-weight: 600; }
        .sp-toast-ok { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.45rem 1rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .sp-success { text-align: center; padding: 1rem 0; }
        .sp-success-icon { width: 64px; height: 64px; background: linear-gradient(135deg, #DCFCE7, #86EFAC); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0.75rem auto 1.2rem; box-shadow: 0 0 0 6px rgba(21,128,61,0.08); }
        .sp-success-title { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
        .sp-success-text { font-size: 0.85rem; color: #64748B; line-height: 1.6; font-weight: 500; }

        .sp-nav { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
        .sp-btn-back { flex: 0 0 auto; min-height: 48px; padding: 0 1.25rem; background: white; border: 1.5px solid #CBD5E1; border-radius: 12px; color: #475569; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; }
        .sp-btn-next, .sp-btn-submit { flex: 1; min-height: 48px; background: linear-gradient(135deg, var(--theme-blue-dark), var(--theme-blue)); border: none; border-radius: 12px; color: white; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.45rem; box-shadow: 0 4px 14px rgba(37,99,235,0.25); }
        .sp-btn-next:disabled, .sp-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .sp-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .sp-footer { margin-top: 1.5rem; padding-top: 1.2rem; border-top: 1px solid #E2E8F0; text-align: center; font-size: 0.8rem; color: #64748B; font-weight: 500; display: flex; flex-direction: column; gap: 0.6rem; }
        .sp-footer a { color: var(--theme-blue); font-weight: 700; text-decoration: none; }
        .sp-footer-sublink { font-size: 0.75rem; font-weight: 500; color: #94A3B8; }

        .sp-photo-avatar { width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 1.2rem; background: linear-gradient(135deg, var(--theme-blue-dark), var(--theme-blue)); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 700; color: white; box-shadow: 0 6px 20px rgba(37,99,235,0.25); overflow: hidden; }
        .sp-photo-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .sp-photo-box { border: 1.5px dashed #CBD5E1; border-radius: 16px; padding: 1.5rem 1rem; background: #F8FAFC; text-align: center; }
        .sp-file-label { min-height: 46px; padding: 0 1.25rem; border-radius: 12px; border: 1.5px solid #CBD5E1; background: white; color: var(--theme-blue-dark); font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.45rem; cursor: pointer; }
        .sp-file-input { display: none; }
        .sp-photo-remove-btn { min-height: 46px; padding: 0 1rem; border-radius: 12px; border: 1.5px solid rgba(220,38,38,0.2); background: rgba(254,242,242,0.6); color: #DC2626; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; }

        /* ── Highlight du champ Poste occupé ── */
        .sp-role-select {
          width: 100%; min-height: 48px; border-radius: 12px;
          border: 1.5px solid #A7F3D0;
          background: linear-gradient(135deg, #F0FDF9, #ECFDF5);
          padding: 0 2rem 0 1rem; color: #134E4A; font-weight: 600;
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 1rem center;
        }
        .sp-role-select:focus {
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5,150,105,0.15);
        }
        .sp-role-label {
          font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #059669, #10B981);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          display: flex; align-items: center; gap: 0.4rem;
        }
        
        /* ── Case à cocher Légale ── */
        .sp-checkbox-wrapper {
          display: flex; align-items: flex-start; gap: 0.75rem;
          margin-top: 1.5rem; padding: 1rem; background: #F8FAFC;
          border: 1px solid #E2E8F0; border-radius: 12px;
        }
        .sp-checkbox {
          appearance: none; width: 20px; height: 20px;
          border: 2px solid #CBD5E1; border-radius: 6px;
          background-color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 0.1rem; transition: all 0.2s;
        }
        .sp-checkbox:checked {
          background-color: var(--theme-blue); border-color: var(--theme-blue);
        }
        .sp-checkbox:checked::after {
          content: ''; width: 5px; height: 10px;
          border: solid white; border-width: 0 2px 2px 0;
          transform: rotate(45deg); margin-bottom: 2px;
        }
        .sp-checkbox:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.15); outline: none; }
        .sp-legal-label {
          font-size: 0.8rem; color: #475569; line-height: 1.5; cursor: pointer;
        }
        .sp-legal-link {
          color: var(--theme-blue); font-weight: 700; text-decoration: underline;
        }

        @media (max-width: 540px) {
          .sp-grid-2 { grid-template-columns: 1fr; gap: 0.85rem; }
          .sp-root { padding: 1rem 0.5rem 2rem; }
          .sp-card { border-radius: 20px; padding: 1.5rem; }
        }
      `}</style>

      <div className="sp-root">
        <div className="sp-bg-grid" />
        <div className="sp-orb sp-orb-1" />
        <div className="sp-orb sp-orb-2" />

        <div className={`sp-card ${mounted ? 'visible' : ''}`}>

          {/* Header */}
          <div className="sp-header">
            <div className="sp-badge">
              <div className="sp-badge-dot" />
              Nouveau membre
            </div>
            <h1 className="sp-title">Rejoindre <span>Lélouma</span></h1>
            <p className="sp-subtitle">Créez votre compte en 4 étapes · Validation par votre antenne</p>
          </div>

          {/* Stepper */}
          {!success && (
            <div className="sp-stepper">
              {STEPS.map((label, i) => (
                <div key={label} className={`sp-step-item ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                  <div className="sp-step-circle">
                    {i < step ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (i + 1)}
                  </div>
                  <span className="sp-step-label">{label}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── SUCCESS ── */}
          {success ? (
            <div className="sp-success sp-panel">
              <div className="sp-photo-avatar" style={{ width: '88px', height: '88px', fontSize: '1.8rem' }}>
                {photoPreviewUrl
                  ? <Image src={photoPreviewUrl} alt="Photo profil" width={88} height={88} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} unoptimized />
                  : (initials || '?')}
              </div>
              <div className="sp-success-icon">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="sp-success-title">Inscription enregistrée !</p>
              <p className="sp-success-text">
                Vérifiez votre email pour activer votre compte,<br />
                puis attendez la validation par l&apos;administrateur<br />de votre antenne.
              </p>
              <div style={{ marginTop: '1.75rem' }}>
                <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--theme-blue-dark)', fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none' }}>
                  Se connecter
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>

              {/* ── STEP 0 : Identité ── */}
              {step === 0 && (
                <div className="sp-panel sp-stack">
                  <div className="sp-notice">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                    </svg>
                    Le compte sera activé après vérification email et validation par l&apos;administrateur de votre antenne.
                  </div>
                  <p className="sp-section-title">Informations personnelles</p>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Prénom</label>
                      <input className="sp-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Mamadou" required />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Nom</label>
                      <input className="sp-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Diallo" required />
                    </div>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Antenne de rattachement</label>
                    <select className="sp-select" value={antennaId} onChange={e => setAntennaId(e.target.value)} required>
                      <option value="">{loadingAntennas ? 'Chargement...' : 'Sélectionnez une antenne'}</option>
                      {antennas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}{a.city ? ` (${a.city})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ── STEP 1 : Contact, Origine & Naissance ── */}
              {step === 1 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">Identité communautaire</p>

                  <div className="sp-field">
                    <label className="sp-label">Commune d&apos;origine</label>
                    {/* Transformation en SELECT */}
                    <select className="sp-select" value={originSubPrefecture} onChange={e => setOriginSubPrefecture(e.target.value)} required>
                      <option value="">Sélectionnez votre commune...</option>
                      {COMMUNES_ORIGINE.map(commune => (
                        <option key={commune} value={commune}>{commune}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sp-field">
                    <label className="sp-role-label">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Poste occupé dans l&apos;association
                      <span style={{ fontWeight: 500, color: '#94A3B8', textTransform: 'none', letterSpacing: 0, fontSize: '0.65rem', WebkitTextFillColor: '#94A3B8' }}>(optionnel)</span>
                    </label>
                    <select
                      className="sp-role-select"
                      value={associationRole}
                      onChange={e => setAssociationRole(e.target.value)}
                    >
                      <option value="">Sélectionnez un poste…</option>
                      {ASSOCIATION_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {associationRole && associationRole !== 'Membre (simple)' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.3rem', fontSize: '.68rem', fontWeight: 700, color: '#059669' }}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {associationRole} sélectionné(e)
                      </div>
                    )}
                  </div>

                  <p className="sp-section-title" style={{ marginTop: '0.25rem' }}>Naissance &amp; Origine</p>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Date de naissance <span className="sp-opt">(JJ/MM/AAAA)</span></label>
                      <input className="sp-input" type="text" value={birthDate} onChange={handleBirthDateChange} placeholder="12/05/1990" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Lieu de naissance <span className="sp-opt">(optionnel)</span></label>
                      <input className="sp-input" value={placeOfBirth} onChange={e => setPlaceOfBirth(e.target.value)} placeholder="Ex : Lélouma" />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">Pays de naissance <span className="sp-opt">(optionnel)</span></label>
                    {/* Transformation en SELECT avec liste des pays */}
                    <select className="sp-select" value={birthCountry} onChange={e => setBirthCountry(e.target.value)}>
                      <option value="">Sélectionnez un pays...</option>
                      {COUNTRIES.map(c => (
                        <option key={`birth-${c.code}`} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <p className="sp-section-title">Coordonnées &amp; Profession</p>
                  
                  {/* Le choix du pays de résidence vient AVANT le téléphone pour injecter l'indicatif */}
                  <div className="sp-field">
                    <label className="sp-label">Pays de résidence</label>
                    <select className="sp-select" value={country} onChange={e => setCountry(e.target.value)} required>
                      <option value="">Sélectionnez votre pays actuel...</option>
                      {COUNTRIES.map(c => (
                        <option key={`res-${c.code}`} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Email</label>
                      <input className="sp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" required />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Téléphone <span className="sp-opt">(optionnel)</span></label>
                      <input 
                        className="sp-input" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        placeholder={country ? "Entrez le numéro" : "Sélectionnez un pays d'abord"} 
                      />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">Profession / Situation <span className="sp-opt">(optionnel)</span></label>
                    <select className="sp-select" value={profession} onChange={e => setProfession(e.target.value)}>
                      <option value="">Sélectionnez une profession</option>
                      {PROFESSION_LIST.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <p className="sp-section-title">Adresse (Optionnelle)</p>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Ville</label>
                      <input className="sp-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Ex: Paris, Conakry" />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Code postal</label>
                      {/* Ajout du maxLength=5 */}
                      <input className="sp-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="Ex: 75001" maxLength={5} />
                    </div>
                  </div>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">Adresse 1</label>
                      <input className="sp-input" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="12 rue..." />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">Adresse 2</label>
                      <input className="sp-input" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Apt 3B" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2 : Photo ── */}
              {step === 2 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">Photo de profil</p>
                  <div className="sp-photo-box">
                    <div className="sp-photo-avatar">
                      {photoPreviewUrl
                        ? <Image src={photoPreviewUrl} alt="Aperçu" width={100} height={100} unoptimized />
                        : (initials || '?')}
                    </div>
                    <div className="sp-photo-actions">
                      <label className="sp-file-label" htmlFor="signup-photo-input">
                        {photoPreviewUrl ? 'Changer la photo' : 'Choisir une photo'}
                      </label>
                      <input ref={photoInputRef} id="signup-photo-input" className="sp-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
                      {photoPreviewUrl && (
                        <button type="button" className="sp-photo-remove-btn" onClick={removePhoto}>Supprimer</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3 : Sécurité ── */}
              {step === 3 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">Mot de passe</p>
                  <div className="sp-field">
                    <label className="sp-label">Mot de passe</label>
                    <div className="sp-input-wrap">
                      <input className="sp-input has-icon" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum" required />
                      <button type="button" className="sp-eye-btn" onClick={() => setShowPwd(v => !v)}>{showPwd ? 'Cacher' : 'Voir'}</button>
                    </div>
                    {password && (
                      <div className="sp-pwd-strength">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="sp-pwd-bar">
                            <div className="sp-pwd-bar-fill" style={{ width: pwdStrength >= i ? '100%' : '0%', background: strengthColor }} />
                          </div>
                        ))}
                        <span className="sp-pwd-label" style={{ color: strengthColor }}>{strengthLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">Confirmer le mot de passe</label>
                    <div className="sp-input-wrap">
                      <input className="sp-input has-icon" type={showPwd2 ? 'text' : 'password'} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="Répétez le mot de passe" required />
                      <button type="button" className="sp-eye-btn" onClick={() => setShowPwd2(v => !v)}>{showPwd2 ? 'Cacher' : 'Voir'}</button>
                    </div>
                  </div>

                  <div className="sp-checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      id="legal-accept" 
                      className="sp-checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      required 
                    />
                    <label htmlFor="legal-accept" className="sp-legal-label">
                      J&apos;ai lu et j&apos;accepte sans réserve les <Link href="/mentions-legales" className="sp-legal-link" target="_blank">Mentions Légales</Link> ainsi que la <Link href="/confidentialite" className="sp-legal-link" target="_blank">Politique de Confidentialité</Link> de l&apos;association LCD.
                    </label>
                  </div>

                </div>
              )}

              {/* Error */}
              {error && <div className="sp-error" style={{ marginTop: '1.25rem' }}>{error}</div>}

              {/* Navigation */}
              <div className="sp-nav">
                {step > 0 && <button type="button" className="sp-btn-back" onClick={prevStep}>Retour</button>}
                {step < STEPS.length - 1 ? (
                  <button type="button" className="sp-btn-next" onClick={nextStep} disabled={step === 2 && !!photoError}>Continuer</button>
                ) : (
                  <button type="submit" className="sp-btn-submit" disabled={submitting || !termsAccepted}>
                    {submitting ? <div className="sp-spinner" /> : 'Créer mon compte'}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Footer */}
          {!success && (
            <div className="sp-footer">
              <div>Déjà membre ? <Link href="/login">Se connecter</Link></div>
              <Link href="/forgot-password" className="sp-footer-sublink">Mot de passe oublié ?</Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
}