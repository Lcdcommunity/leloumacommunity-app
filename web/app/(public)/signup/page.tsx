//web/app/(public)/signup/page.tsx
'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '../../../lib/api-client';
import { useTranslation } from 'react-i18next';
import i18n from '../../../lib/i18n';

type PublicAntenna = {
  id: string;
  code: string;
  name: string;
  city?: string;
  country?: string;
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
  'Parawol', 'Sagalé', 'Hérico', 'Diountou', 'Korbé', 'Linsan', 'Autre'
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
  { name: 'Autre', code: 'OTHER', dial: '+', phoneLength: 0 }
].sort((a, b) => a.name.localeCompare(b.name));

export default function MemberSignupPage() {
  const { t } = useTranslation();

  const [currentLang, setCurrentLang] = useState('fr');
  const isRTL = currentLang === 'ar';

  const STEPS = [
    t('signup.step0', 'Identité'), 
    t('signup.step1', 'Contact'), 
    t('signup.step2', 'Photo'), 
    t('signup.step3', 'Sécurité')
  ];

  const [antennas, setAntennas] = useState<PublicAntenna[]>([]);
  const [loadingAntennas, setLoadingAntennas] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);

  const [theme, setTheme] = useState<{
    name: string;
    logoUrl: string | null;
    primary: string;
    secondary: string;
    fontFamily: string;
  }>({
    name: 'Lélouma',
    logoUrl: null,
    primary: '#2563EB',
    secondary: '#059669',
    fontFamily: "'DM Sans', sans-serif",
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [antennaId, setAntennaId] = useState('');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [originSubPrefecture, setOriginSubPrefecture] = useState('');
  const [customOriginSubPrefecture, setCustomOriginSubPrefecture] = useState('');

  const [birthDate, setBirthDate] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');

  const [birthCountry, setBirthCountry] = useState('');
  const [customBirthCountry, setCustomBirthCountry] = useState('');

  const [city, setCity] = useState('');

  const [country, setCountry] = useState('');
  const [customCountry, setCustomCountry] = useState('');

  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [profession, setProfession] = useState('');
  
  const [associationRole, setAssociationRole] = useState('');
  const [customAssociationRole, setCustomAssociationRole] = useState('');

  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  const handleLanguageChanged = useCallback((lng: string) => {
    setCurrentLang(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    const savedData = sessionStorage.getItem('signupFormState');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed.step !== undefined) setStep(parsed.step);
        if (parsed.firstName) setFirstName(parsed.firstName);
        if (parsed.lastName) setLastName(parsed.lastName);
        if (parsed.antennaId) setAntennaId(parsed.antennaId);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.originSubPrefecture) setOriginSubPrefecture(parsed.originSubPrefecture);
        if (parsed.customOriginSubPrefecture) setCustomOriginSubPrefecture(parsed.customOriginSubPrefecture);
        if (parsed.birthDate) setBirthDate(parsed.birthDate);
        if (parsed.placeOfBirth) setPlaceOfBirth(parsed.placeOfBirth);
        if (parsed.birthCountry) setBirthCountry(parsed.birthCountry);
        if (parsed.customBirthCountry) setCustomBirthCountry(parsed.customBirthCountry);
        if (parsed.city) setCity(parsed.city);
        if (parsed.country) setCountry(parsed.country);
        if (parsed.customCountry) setCustomCountry(parsed.customCountry);
        if (parsed.postalCode) setPostalCode(parsed.postalCode);
        if (parsed.addressLine1) setAddressLine1(parsed.addressLine1);
        if (parsed.profession) setProfession(parsed.profession);
        if (parsed.associationRole) setAssociationRole(parsed.associationRole);
        if (parsed.customAssociationRole) setCustomAssociationRole(parsed.customAssociationRole);
        if (parsed.termsAccepted) setTermsAccepted(parsed.termsAccepted);
      } catch (e) {
        console.error("Erreur lors de la restauration du formulaire", e);
      }
    }

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

    if (i18n.isInitialized) {
      const detectedLang = i18n.language || localStorage.getItem('i18nextLng') || 'fr';
      setCurrentLang(detectedLang);
    }
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [handleLanguageChanged]);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code') || undefined;
        const domainParam = urlParams.get('domain') || undefined;

        const currentDomain = !codeParam && !domainParam ? window.location.hostname : undefined;

        if (currentDomain === 'localhost' || currentDomain === 'votre-domaine-principal.com') {
          return;
        }

        const data = await api.getPublicTheme(domainParam || currentDomain, codeParam);

        if (data) {
          setTheme({
            name: data.name,
            logoUrl: data.logoUrl || null,
            primary: data.themeColors?.primary || '#2563EB',
            secondary: data.themeColors?.secondary || '#059669',
            fontFamily: data.fontFamily || "'DM Sans', sans-serif",
          });
        }
      } catch (err) {
        console.warn('Thème personnalisé non trouvé.', err);
      }
    };

    fetchTheme();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const dataToSave = {
      step, firstName, lastName, antennaId, email, phone, originSubPrefecture, customOriginSubPrefecture,
      birthDate, placeOfBirth, birthCountry, customBirthCountry, city, country,
      customCountry, postalCode, addressLine1, profession, associationRole, customAssociationRole,
      termsAccepted
    };
    sessionStorage.setItem('signupFormState', JSON.stringify(dataToSave));
  }, [mounted, step, firstName, lastName, antennaId, email, phone, originSubPrefecture, customOriginSubPrefecture, birthDate, placeOfBirth, birthCountry, customBirthCountry, city, country, customCountry, postalCode, addressLine1, profession, associationRole, customAssociationRole, termsAccepted]);

  useEffect(() => {
    return () => { if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl); };
  }, [photoPreviewUrl]);

  useEffect(() => {
    if (country && country !== 'Autre') {
      const selectedCountry = COUNTRIES.find(c => c.name === country);
      if (selectedCountry) {
        setPhone(prevPhone => {
          if (!prevPhone || prevPhone.trim() === '' || !prevPhone.includes(' ')) {
            return `${selectedCountry.dial} `;
          } else {
            const phoneParts = prevPhone.split(' ');
            if (phoneParts.length > 1) {
              phoneParts[0] = selectedCountry.dial;
              return phoneParts.join(' ');            
            }
            return prevPhone;
          }
        });
      }
    }
  }, [country]);

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
      setPhotoError(t('signup.errorFormat', 'Formats autorisés : JPG, PNG, WEBP.'));
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(t('signup.errorSize', 'La photo ne doit pas dépasser 5 Mo.'));
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
      if (!firstName.trim()) return t('signup.errFirstName', 'Le prénom est requis.');
      if (!lastName.trim()) return t('signup.errLastName', 'Le nom est requis.');
      if (!antennaId) return t('signup.errAntenna', 'Veuillez sélectionner une antenne.');
    }
    if (s === 1) {
      if (!associationRole) return t('signup.errRole', 'Le poste occupé est requis.');
      if (associationRole === 'Autre' && !customAssociationRole.trim()) return t('signup.errRoleOther', 'Veuillez préciser le poste occupé.');

      if (!originSubPrefecture) return t('signup.errCommune', 'La commune d\'origine est requise.');
      if (originSubPrefecture === 'Autre' && !customOriginSubPrefecture.trim()) return t('signup.errCommuneOther', 'Veuillez préciser la commune d\'origine.');

      if (!birthDate || birthDate.length < 10) return t('signup.errBirthdateReq', 'La date de naissance est requise (JJ/MM/AAAA).');
      const parts = birthDate.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const bDate = new Date(year, month, day);
        const today = new Date();
        let age = today.getFullYear() - bDate.getFullYear();
        const m = today.getMonth() - bDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
          age--;
        }
        if (age < 16) return t('signup.errAgeMin', 'Vous devez avoir au moins 16 ans pour vous inscrire.');
        if (age > 80) return t('signup.errAgeMax', 'L\'âge maximum autorisé est de 80 ans.');
      } else {
        return t('signup.errBirthdateFmt', 'Format de date de naissance invalide.');
      }

      if (!placeOfBirth.trim()) return t('signup.errBirthplace', 'Le lieu de naissance est requis.');
      if (!birthCountry) return t('signup.errBirthCountry', 'Le pays de naissance est requis.');
      if (birthCountry === 'Autre' && !customBirthCountry.trim()) return t('signup.errBirthCountryOther', 'Veuillez préciser votre pays de naissance.');

      if (!country) return t('signup.errCountry', 'Le pays de résidence est requis.');
      if (country === 'Autre' && !customCountry.trim()) return t('signup.errCountryOther', 'Veuillez préciser votre pays de résidence.');

      if (!email.trim()) return t('signup.errEmailReq', 'L\'email est requis.');
      if (!/\S+@\S+\.\S+/.test(email)) return t('signup.errEmailFmt', 'Format d\'email invalide.');

      if (!phone.trim()) return t('signup.errPhoneReq', 'Le téléphone est requis.');
      if (phone && country && country !== 'Autre') {
        const selectedCountry = COUNTRIES.find(c => c.name === country);
        if (selectedCountry) {
          let phoneWithoutDial = phone;
          if (phone.startsWith(selectedCountry.dial)) {
            phoneWithoutDial = phone.substring(selectedCountry.dial.length);
          }
          const numberPart = phoneWithoutDial.replace(/\D/g, '');
          if (numberPart.length < 7 || numberPart.length > 11) {
             return t('signup.errPhoneLen', 'Le numéro de téléphone (sans l\'indicatif) doit faire entre 7 et 11 chiffres.');
          }
        }
      }

      if (!profession) return t('signup.errProfession', 'La profession / situation est requise.');
      if (!city.trim()) return t('signup.errCity', 'La ville de résidence est requise.');
      if (!addressLine1.trim()) return t('signup.errAddress', 'L\'adresse de résidence est requise.');
    }
    if (s === 3) {
      if (!password) return t('signup.errPwdReq', 'Le mot de passe est requis.');
      if (password.length < 8) return t('signup.errPwdLen', 'Le mot de passe doit contenir au moins 8 caractères.');
      if (password !== passwordConfirm) return t('signup.errPwdMatch', 'Les mots de passe ne correspondent pas.');
      if (!termsAccepted) return t('signup.errTerms', 'Vous devez accepter les Mentions Légales et la Politique de Confidentialité pour continuer.');
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
      const finalBirthCountry = birthCountry === 'Autre' ? customBirthCountry : birthCountry;
      const finalCountry = country === 'Autre' ? customCountry : country;
      const finalOrigin = originSubPrefecture === 'Autre' ? customOriginSubPrefecture : originSubPrefecture;
      const finalRole = associationRole === 'Autre' ? customAssociationRole : associationRole;
      const formattedBirthDate = convertDateToISO(birthDate);

      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('antennaId', antennaId);

      if (phone) formData.append('phone', phone.trim());
      if (finalOrigin) formData.append('originSubPrefecture', finalOrigin.trim());
      if (formattedBirthDate) formData.append('birthDate', formattedBirthDate);
      if (placeOfBirth) formData.append('placeOfBirth', placeOfBirth.trim());
      if (finalBirthCountry) formData.append('birthCountry', finalBirthCountry.trim());
      if (city) formData.append('city', city.trim());
      if (finalCountry) formData.append('country', finalCountry.trim());
      if (postalCode) formData.append('postalCode', postalCode.trim());
      if (addressLine1) formData.append('addressLine1', addressLine1.trim());
      if (finalRole) formData.append('function', finalRole.trim());
      if (profession) formData.append('professionalStatus', profession.trim());
      formData.append('termsAccepted', String(termsAccepted));

      if (selectedPhotoFile) {
        formData.append('avatar', selectedPhotoFile);
      }

      await api.memberSignup(formData);

      setSuccess(true);
      sessionStorage.removeItem('signupFormState'); 
    } catch (err) {
      setError(err instanceof Error ? err.message : t('signup.errGlobal', 'Erreur inscription'));
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

  const strengthLabel = ['', t('signup.pwdWeak', 'Faible'), t('signup.pwdFair', 'Moyen'), t('signup.pwdGood', 'Bon'), t('signup.pwdStrong', 'Fort')][pwdStrength];
  const strengthColor = ['', '#E05050', '#E09030', '#059669', '#047857'][pwdStrength];

  const getLightColor = (hex: string, opacity: number) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 5;
    const g = parseInt(hex.substring(2, 4), 16) || 150;
    const b = parseInt(hex.substring(4, 6), 16) || 105;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  if (!mounted) return null;

  // ── Required star component ──────────────────────────────────────────────
  const Req = () => (
    <span style={{ color: '#DC2626', marginLeft: '0.2rem', fontWeight: 900, fontSize: '0.75rem' }} aria-label="Champ obligatoire">*</span>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          var(--theme-blue): ${theme.primary};
          var(--theme-blue-dark): ${theme.primary};
          var(--theme-green): ${theme.secondary};
          var(--theme-green-light): ${theme.secondary};
          var(--font-main): ${theme.fontFamily};
          var(--bg-color): #F8FAFC;
          var(--err): #B91C1C;
        }

        .sp-root {
          font-family: var(--font-main);
          min-height: 100svh;
          background: linear-gradient(150deg, #F0F4F8 0%, #E2E8F0 40%, ${getLightColor(theme.primary, 0.15)} 100%);
          display: flex; align-items: flex-start; justify-content: center;
          position: relative; overflow: hidden;
          padding: 2rem 1.25rem 3rem;
        }        .sp-orb { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none; }
        .sp-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, ${getLightColor(theme.primary, 0.15)} 0%, transparent 70%); top: -150px; right: -100px; animation: oa 16s ease-in-out infinite alternate; }
        .sp-orb-2 { width: 360px; height: 360px; background: radial-gradient(circle, ${getLightColor(theme.secondary, 0.12)} 0%, transparent 70%); bottom: -80px; left: -80px; animation: ob 20s ease-in-out infinite alternate; }
        @keyframes oa { from{transform:translate(0,0)} to{transform:translate(-40px,40px)} }
        @keyframes ob { from{transform:translate(0,0)} to{transform:translate(30px,-30px)} }
        .sp-bg-grid { position: fixed; inset: 0; background-image: linear-gradient(${getLightColor(theme.primary, 0.03)} 1px, transparent 1px), linear-gradient(90deg, ${getLightColor(theme.primary, 0.03)} 1px, transparent 1px); background-size: 56px 56px; pointer-events: none; }

        .sp-card { position: relative; z-index: 10; width: 100%; max-width: 600px; background: rgba(255,255,255,0.95); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid ${getLightColor(theme.primary, 0.1)}; border-radius: 28px; padding: clamp(1.5rem, 5vw, 2.75rem); box-shadow: 0 0 0 1px rgba(255,255,255,0.85) inset, 0 24px 64px ${getLightColor(theme.primary, 0.08)}, 0 4px 16px ${getLightColor(theme.primary, 0.05)}; opacity: 0; transform: translateY(28px); transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1); margin-top: 0.5rem; }
        .sp-card.visible { opacity: 1; transform: translateY(0); }

        .sp-header { text-align: center; margin-bottom: 1.75rem; }
        .sp-badge { display: inline-flex; align-items: center; gap: 0.4rem; background: ${getLightColor(theme.primary, 0.1)}; border: 1px solid ${getLightColor(theme.primary, 0.2)}; border-radius: 99px; padding: 0.3rem 0.85rem; font-size: 0.72rem; font-weight: 700; color: #1E40AF; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 0.9rem; }
        .sp-badge-dot { width: 6px; height: 6px; background: var(--theme-blue); border-radius: 50%; animation: blink 2s ease-in-out infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .sp-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.6rem, 4.5vw, 2.3rem); font-weight: 600; color: #1E293B; letter-spacing: -0.02em; line-height: 1.15; }
        .sp-title span { background: linear-gradient(135deg, ${theme.primary}, #3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .sp-subtitle { font-size: 0.82rem; color: #64748B; margin-top: 0.45rem; line-height: 1.6; font-weight: 500; }

        .sp-stepper { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 1.75rem; }
        .sp-step-item { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; position: relative; flex: 1; }
        .sp-step-item:not(:last-child)::after { content: ''; position: absolute; top: 13px; left: calc(50% + 14px); width: calc(100% - 28px); height: 1px; background: #E2E8F0; transition: background 0.4s; }
        .sp-step-item.done:not(:last-child)::after { background: ${theme.secondary}; }
        .sp-step-circle { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #CBD5E1; background: white; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; color: #94A3B8; transition: all 0.3s cubic-bezier(.22,1,.36,1); position: relative; z-index: 1; }
        .sp-step-item.active .sp-step-circle { border-color: ${theme.primary}; background: ${theme.primary}; color: white; box-shadow: 0 0 0 4px ${getLightColor(theme.primary, 0.15)}; }
        .sp-step-item.done .sp-step-circle { border-color: ${theme.secondary}; background: ${getLightColor(theme.secondary, 0.1)}; color: ${theme.secondary}; }

        .sp-step-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #94A3B8; transition: color 0.3s; }
        .sp-step-item.active .sp-step-label { color: #1E40AF; }
        .sp-step-item.done .sp-step-label { color: #047857; }

        .sp-section-title { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #475569; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .sp-section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, #CBD5E1, transparent); }

        .sp-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
        .sp-stack { display: flex; flex-direction: column; gap: 0.2rem; }
        .sp-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }

        .sp-label { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; }
        .sp-label .sp-opt { font-weight: 500; color: #94A3B8; text-transform: none; letter-spacing: 0; font-size: 0.65rem; margin-left: 0.3rem; }

        /* ── Helper hint text under fields ── */
        .sp-hint { font-size: 0.67rem; font-weight: 500; color: #94A3B8; margin-top: 0.2rem; line-height: 1.45; display: flex; align-items: flex-start; gap: 0.3rem; }
        .sp-hint svg { flex-shrink: 0; margin-top: 1px; }

        /* ── Required legend ── */
        .sp-required-legend { font-size: 0.68rem; color: #94A3B8; font-weight: 500; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.3rem; }
        .sp-required-legend span { color: #DC2626; font-weight: 900; font-size: 0.75rem; }

        .sp-input-wrap { position: relative; }
        .sp-input, .sp-select { width: 100%; min-height: 48px; border-radius: 12px; border: 1.5px solid #E2E8F0; background: #FFFFFF; padding: 0 1rem; color: #111827; font-weight: 500; font-family: var(--font-main); font-size: 0.88rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .sp-input:focus, .sp-select:focus { border-color: ${theme.primary}; box-shadow: 0 0 0 3px ${getLightColor(theme.primary, 0.12)}; }
        .sp-input.has-icon { padding-right: 2.8rem; padding-left: ${isRTL ? '2.8rem' : '1rem'}; }
        .sp-select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: ${isRTL ? 'left 1rem center' : 'right 1rem center'}; appearance: none; }
        .sp-eye-btn { position: absolute; right: ${isRTL ? 'auto' : '0.85rem'}; left: ${isRTL ? '0.85rem' : 'auto'}; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94A3B8; cursor: pointer; padding: 4px; display: flex; align-items: center; }
        .sp-pwd-strength { display: flex; gap: 4px; margin-top: 0.4rem; align-items: center; }
        .sp-pwd-bar { flex: 1; height: 4px; border-radius: 99px; background: #E2E8F0; overflow: hidden; }
        .sp-pwd-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s, background 0.4s; }
        .sp-pwd-label { font-size: 0.65rem; font-weight: 700; margin-left: 0.4rem; min-width: 36px; }
        .sp-notice { background: ${getLightColor(theme.primary, 0.07)}; border: 1px solid ${getLightColor(theme.primary, 0.15)}; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.78rem; color: #1E40AF; font-weight: 500; line-height: 1.5; margin-bottom: 1.2rem; display: flex; gap: 0.6rem; align-items: flex-start; }
        .sp-error { display: flex; align-items: center; gap: 0.55rem; padding: 0.8rem 1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: var(--err); font-size: 0.8rem; font-weight: 600; }
        .sp-toast-ok { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.45rem 1rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .sp-success { text-align: center; padding: 1rem 0; }
        .sp-success-icon { width: 64px; height: 64px; background: linear-gradient(135deg, #DCFCE7, #86EFAC); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0.75rem auto 1.2rem; box-shadow: 0 0 0 6px rgba(21,128,61,0.08); }
        .sp-success-title { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem; }
        .sp-success-text { font-size: 0.85rem; color: #64748B; line-height: 1.6; font-weight: 500; }

        .sp-nav { display: flex; gap: 0.75rem; margin-top: 1.5rem; }

        .sp-btn-back { flex: 0 0 auto; min-height: 48px; padding: 0 1.25rem; background: white; border: 1.5px solid #94A3B8; border-radius: 12px; color: #334155; font-family: var(--font-main); font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: border-color 0.2s, background 0.2s; }
        .sp-btn-back:hover { border-color: #64748B; background: #F8FAFC; }

        .sp-btn-next, .sp-btn-submit { flex: 1; min-height: 48px; background: linear-gradient(135deg, #047857, #059669); border: none; border-radius: 12px; color: white; font-family: var(--font-main); font-size: 0.85rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.45rem; box-shadow: 0 4px 14px rgba(5,150,105,0.28); transition: opacity 0.2s, box-shadow 0.2s; }
        .sp-btn-next:hover, .sp-btn-submit:hover { box-shadow: 0 6px 20px rgba(5,150,105,0.38); }
        .sp-btn-next:disabled, .sp-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .sp-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sp-footer { margin-top: 1.5rem; padding-top: 1.2rem; border-top: 1px solid #E2E8F0; text-align: center; font-size: 0.8rem; color: #64748B; font-weight: 500; display: flex; flex-direction: column; gap: 0.6rem; }
        .sp-footer a { color: ${theme.primary}; font-weight: 700; text-decoration: none; }
        .sp-footer-sublink { font-size: 0.75rem; font-weight: 500; color: #94A3B8; }

        .sp-photo-avatar { width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 1.2rem; background: linear-gradient(135deg, ${theme.primary}, #3B82F6); display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 2.2rem; font-weight: 700; color: white; box-shadow: 0 6px 20px ${getLightColor(theme.primary, 0.25)}; overflow: hidden; }
        .sp-photo-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .sp-photo-box { border: 1.5px dashed #CBD5E1; border-radius: 16px; padding: 1.5rem 1rem; background: #F8FAFC; text-align: center; }

        .sp-file-label { min-height: 46px; padding: 0 1.25rem; border-radius: 12px; border: 1.5px solid #93C5FD; background: #EFF6FF; color: #1D4ED8; font-family: var(--font-main); font-size: 0.85rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.45rem; cursor: pointer; transition: background 0.2s, border-color 0.2s; }
        .sp-file-label:hover { background: #DBEAFE; border-color: #60A5FA; }
        .sp-file-input { display: none; }
        .sp-photo-remove-btn { min-height: 46px; padding: 0 1rem; border-radius: 12px; border: 1.5px solid rgba(220,38,38,0.2); background: rgba(254,242,242,0.6); color: #DC2626; font-family: var(--font-main); font-size: 0.85rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; }

        .sp-role-select {
          width: 100%; min-height: 48px; border-radius: 12px;
          border: 1.5px solid ${getLightColor(theme.secondary, 0.3)};
          background: ${getLightColor(theme.secondary, 0.03)};
          padding: 0 2rem 0 1rem; color: #134E4A; font-weight: 600;
          font-family: var(--font-main); font-size: 0.88rem; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: ${isRTL ? 'left 1rem center' : 'right 1rem center'};
        }
        .sp-role-select:focus {
          border-color: ${theme.secondary};
          box-shadow: 0 0 0 3px ${getLightColor(theme.secondary, 0.15)};
        }

        .sp-role-label {
          font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: #047857;
          display: flex; align-items: center; gap: 0.4rem;
        }
        
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
          background-color: ${theme.primary}; border-color: ${theme.primary};
        }
        .sp-checkbox:checked::after {
          content: ''; width: 5px; height: 10px;
          border: solid white; border-width: 0 2px 2px 0;
          transform: rotate(45deg); margin-bottom: 2px;
        }
        .sp-checkbox:focus { box-shadow: 0 0 0 3px ${getLightColor(theme.primary, 0.15)}; outline: none; }
        .sp-legal-label {
          font-size: 0.8rem; color: #475569; line-height: 1.5; cursor: pointer;
        }
        .sp-legal-link {
          color: ${theme.primary}; font-weight: 700; text-decoration: underline;
        }

        @media (max-width: 540px) {
          .sp-grid-2 { grid-template-columns: 1fr; gap: 0.85rem; }
          .sp-root { padding: 1rem 0.5rem 2rem; }
          .sp-card { border-radius: 20px; padding: 1.5rem; }
        }
      `}</style>

      <div className="sp-root" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="sp-bg-grid" />
        <div className="sp-orb sp-orb-1" />
        <div className="sp-orb sp-orb-2" />

        <div className={`sp-card ${mounted ? 'visible' : ''}`}>

          {/* Header */}
          <div className="sp-header">
            {theme.logoUrl && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <Image src={theme.logoUrl} alt={`Logo ${theme.name}`} width={60} height={60} style={{ objectFit: 'contain', borderRadius: '50%' }} unoptimized />
              </div>
            )}
            <div className="sp-badge">
              <div className="sp-badge-dot" />
              {t('signup.newMember', 'Nouveau membre')}
            </div>
            <h1 className="sp-title">{t('signup.join', 'Rejoindre')} <span>{theme.name}</span></h1>
            <p className="sp-subtitle">{t('signup.subtitle', 'Créez votre compte en 4 étapes · Validation par votre antenne')}</p>
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
              <p className="sp-success-title">{t('signup.successTitle', 'Inscription enregistrée !')}</p>
              <p className="sp-success-text">
                {t('signup.successText1', 'Vérifiez votre email pour activer votre compte,')}<br />
                {t('signup.successText2', 'puis attendez la validation par l\'administrateur')}<br />{t('signup.successText3', 'de votre antenne.')}
              </p>
              <div style={{ marginTop: '1.75rem' }}>
                <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: theme.primary, fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none' }}>
                  {t('signup.login', 'Se connecter')}
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
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
                    {t('signup.activationNotice', 'Le compte sera activé après vérification email et validation par l\'administrateur de votre antenne.')}
                  </div>

                  {/* Required legend */}
                  <p className="sp-required-legend">
                    <span>*</span> Les champs marqués d&apos;une étoile sont obligatoires.
                  </p>

                  <p className="sp-section-title">{t('signup.personalInfo', 'Informations personnelles')}</p>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">
                        {t('signup.firstName', 'Prénom')}<Req />
                      </label>
                      <input
                        className="sp-input"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Ex : Mamadou"
                        required
                      />
                      <span className="sp-hint">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        Tel qu&apos;il apparaîtra sur votre carte membre.
                      </span>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">
                        {t('signup.lastName', 'Nom')}<Req />
                      </label>
                      <input
                        className="sp-input"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Ex : Diallo"
                        required
                      />
                      <span className="sp-hint">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        Votre nom de famille officiel.
                      </span>
                    </div>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">
                      {t('signup.antenna', 'Antenne de rattachement')}<Req />
                    </label>
                    <select
                      className="sp-select"
                      value={antennaId}
                      onChange={e => setAntennaId(e.target.value)}
                      required
                    >
                      <option value="">{loadingAntennas ? t('signup.loading', 'Chargement...') : t('signup.selectAntenna', 'Sélectionnez une antenne')}</option>
                      {antennas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}{a.city ? ` (${a.city})` : ''}</option>
                      ))}
                    </select>
                    <span className="sp-hint">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                      Choisissez l&apos;antenne la plus proche de votre lieu de résidence.
                    </span>
                  </div>
                </div>
              )}

              {/* ── STEP 1 : Contact, Origine & Naissance ── */}
              {step === 1 && (
                <div className="sp-panel sp-stack">

                  {/* Required legend */}
                  <p className="sp-required-legend">
                    <span>*</span> Les champs marqués d&apos;une étoile sont obligatoires.
                  </p>

                  <p className="sp-section-title">{t('signup.communityIdentity', 'Identité communautaire')}</p>

                  <div className="sp-field">
                    <label className="sp-label">
                      {t('signup.originCommune', 'Commune d\'origine')}<Req />
                    </label>
                    <select
                      className="sp-select"
                      value={originSubPrefecture}
                      onChange={e => { setOriginSubPrefecture(e.target.value); if(e.target.value !== 'Autre') setCustomOriginSubPrefecture(''); }}
                      required
                    >
                      <option value="">{t('signup.selectCommune', 'Sélectionnez votre commune...')}</option>
                      {COMMUNES_ORIGINE.map(commune => (
                        <option key={commune} value={commune}>{commune}</option>
                      ))}
                    </select>
                    {originSubPrefecture === 'Autre' && (
                      <input
                        className="sp-input"
                        value={customOriginSubPrefecture}
                        onChange={e => setCustomOriginSubPrefecture(e.target.value)}
                        placeholder={t('signup.specifyCommune', 'Précisez votre commune')}
                        required
                        style={{ marginTop: '0.4rem' }}
                      />
                    )}
                    <span className="sp-hint">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                      La commune de votre famille ou de votre village d&apos;origine en Guinée.
                    </span>
                  </div>

                  <div className="sp-field">
                    <label className="sp-role-label">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      {t('signup.associationRole', 'Poste occupé dans l\'association')}<Req />
                    </label>
                    <select
                      className="sp-role-select"
                      value={associationRole}
                      onChange={e => { setAssociationRole(e.target.value); if(e.target.value !== 'Autre') setCustomAssociationRole(''); }}
                      required
                    >
                      <option value="">{t('signup.selectRole', 'Sélectionnez un poste…')}</option>
                      {ASSOCIATION_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    {associationRole === 'Autre' && (
                      <input
                        className="sp-input"
                        value={customAssociationRole}
                        onChange={e => setCustomAssociationRole(e.target.value)}
                        placeholder={t('signup.specifyRole', 'Précisez le poste occupé')}
                        required
                        style={{ marginTop: '0.4rem' }}
                      />
                    )}
                    {associationRole && associationRole !== 'Membre (simple)' && associationRole !== 'Autre' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.3rem', fontSize: '.68rem', fontWeight: 700, color: '#047857' }}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {associationRole} {t('signup.selected', 'sélectionné(e)')}
                      </div>
                    )}
                    <span className="sp-hint">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                      Si vous n&apos;avez pas de poste particulier, choisissez &quot;Membre (simple)&quot;.
                    </span>
                  </div>

                  <p className="sp-section-title" style={{ marginTop: '0.25rem' }}>{t('signup.birthOrigin', 'Naissance & Origine')}</p>
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">
                        {t('signup.birthDate', 'Date de naissance')}<Req />
                        <span className="sp-opt">(JJ/MM/AAAA)</span>
                      </label>
                      <input
                        className="sp-input"
                        type="text"
                        value={birthDate}
                        onChange={handleBirthDateChange}
                        placeholder="12/05/1990"
                        required
                      />
                      <span className="sp-hint">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        Format : jour/mois/année. Âge minimum requis : 16 ans.
                      </span>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">
                        {t('signup.birthPlace', 'Lieu de naissance')}<Req />
                      </label>
                      <input
                        className="sp-input"
                        value={placeOfBirth}
                        onChange={e => setPlaceOfBirth(e.target.value)}
                        placeholder="Ex : Pita, Lélouma"
                        required
                      />
                      <span className="sp-hint">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        Ville ou préfecture de naissance.
                      </span>
                    </div>
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">
                      {t('signup.birthCountry', 'Pays de naissance')}<Req />
                    </label>
                    <select
                      className="sp-select"
                      value={birthCountry}
                      onChange={e => { setBirthCountry(e.target.value); if (e.target.value !== 'Autre') setCustomBirthCountry(''); }}
                      required
                    >
                      <option value="">{t('signup.selectCountry', 'Sélectionnez un pays...')}</option>
                      {COUNTRIES.map(c => (
                        <option key={`birth-${c.code}`} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    {birthCountry === 'Autre' && (
                      <input
                        className="sp-input"
                        value={customBirthCountry}
                        onChange={e => setCustomBirthCountry(e.target.value)}
                        placeholder={t('signup.specifyCountry', 'Précisez votre pays')}
                        required
                        style={{ marginTop: '0.4rem' }}
                      />
                    )}
                  </div>

                  <p className="sp-section-title">{t('signup.contactProfession', 'Coordonnées & Profession')}</p>

                  <div className="sp-field">
                    <label className="sp-label">
                      {t('signup.residenceCountry', 'Pays de résidence')}<Req />
                    </label>
                    <select
                      className="sp-select"
                      value={country}
                      onChange={e => { setCountry(e.target.value); if (e.target.value !== 'Autre') setCustomCountry(''); }}
                      required
                    >
                      <option value="">{t('signup.selectCountry', 'Sélectionnez votre pays...')}</option>
                      {COUNTRIES.map(c => (
                        <option key={`res-${c.code}`} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    {country === 'Autre' && (
                      <input
                        className="sp-input"
                        value={customCountry}
                        onChange={e => setCustomCountry(e.target.value)}
                        placeholder={t('signup.specifyCountry', 'Précisez votre pays')}
                        required
                        style={{ marginTop: '0.4rem' }}
                      />
                    )}
                    <span className="sp-hint">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                      Sélectionnez d&apos;abord votre pays pour que l&apos;indicatif téléphonique se mette à jour automatiquement.
                    </span>
                  </div>

                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">
                        Email<Req />
                      </label>
                      <input
                        className="sp-input"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="vous@exemple.com"
                        required
                      />
                      <span className="sp-hint">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        Un email de vérification vous sera envoyé ici.
                      </span>
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">
                        {t('signup.phone', 'Téléphone')}<Req />
                      </label>
                      <input
                        className="sp-input"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder={country ? t('signup.enterPhone', "Entrez le numéro") : t('signup.phoneHint', "Sélectionnez un pays d'abord")}
                        required
                      />
                      <span className="sp-hint">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        Indicatif + numéro. Ex : +224 621 00 00 00
                      </span>
                    </div>
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">
                      {t('signup.profession', 'Profession / Situation')}<Req />
                    </label>
                    <select
                      className="sp-select"
                      value={profession}
                      onChange={e => setProfession(e.target.value)}
                      required
                    >
                      <option value="">{t('signup.selectProfession', 'Sélectionnez une profession')}</option>
                      {PROFESSION_LIST.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <p className="sp-section-title">{t('signup.residenceAddress', 'Adresse de résidence')}</p>
                  
                  <div className="sp-grid-2">
                    <div className="sp-field">
                      <label className="sp-label">
                        {t('signup.city', 'Ville')}<Req />
                      </label>
                      <input
                        className="sp-input"
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="Ex : Paris, Conakry"
                        required
                      />
                    </div>
                    <div className="sp-field">
                      <label className="sp-label">
                        {t('signup.postalCode', 'Code postal')}
                        <span className="sp-opt">({t('signup.optional', 'optionnel')})</span>
                      </label>
                      <input
                        className="sp-input"
                        value={postalCode}
                        onChange={e => setPostalCode(e.target.value)}
                        placeholder="Ex : 75001"
                        maxLength={5}
                      />
                    </div>
                  </div>

                  <div className="sp-field">
                    <label className="sp-label">
                      {t('signup.address1', 'Adresse de résidence')}<Req />
                    </label>
                    <input
                      className="sp-input"
                      value={addressLine1}
                      onChange={e => setAddressLine1(e.target.value)}
                      placeholder="Ex : 12 rue des Fleurs, Apt 3"
                      required
                    />
                    <span className="sp-hint">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                      Numéro, rue, bâtiment ou quartier.
                    </span>
                  </div>
                </div>
              )}

              {/* ── STEP 2 : Photo ── */}
              {step === 2 && (
                <div className="sp-panel sp-stack">
                  <p className="sp-section-title">{t('signup.profilePhoto', 'Photo de profil')}</p>

                  <div className="sp-notice">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                    </svg>
                    La photo est <strong>facultative</strong> mais recommandée — elle apparaîtra sur votre carte membre et facilitera votre identification par l&apos;administrateur.
                  </div>

                  <div className="sp-photo-box">
                    <div className="sp-photo-avatar">
                      {photoPreviewUrl
                        ? <Image src={photoPreviewUrl} alt="Aperçu" width={100} height={100} unoptimized />
                        : (initials || '?')}
                    </div>

                    {photoError && (
                      <div className="sp-error" style={{ marginBottom: '0.75rem', justifyContent: 'center' }}>
                        {photoError}
                      </div>
                    )}

                    <div className="sp-photo-actions" style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <label className="sp-file-label" htmlFor="signup-photo-input">
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {photoPreviewUrl ? t('signup.changePhoto', 'Changer la photo') : t('signup.choosePhoto', 'Choisir une photo')}
                      </label>
                      <input
                        ref={photoInputRef}
                        id="signup-photo-input"
                        className="sp-file-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                      />
                      {photoPreviewUrl && (
                        <button type="button" className="sp-photo-remove-btn" onClick={removePhoto}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {t('signup.delete', 'Supprimer')}
                        </button>
                      )}
                    </div>

                    <p style={{ marginTop: '0.85rem', fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>
                      Formats acceptés : JPG, PNG, WEBP · Taille max : 5 Mo
                    </p>
                  </div>
                </div>
              )}

              {/* ── STEP 3 : Sécurité ── */}
              {step === 3 && (
                <div className="sp-panel sp-stack">
                  {/* Required legend */}
                  <p className="sp-required-legend">
                    <span>*</span> Les champs marqués d&apos;une étoile sont obligatoires.
                  </p>

                  <p className="sp-section-title">{t('signup.passwordTitle', 'Mot de passe')}</p>
                  <div className="sp-field">
                    <label className="sp-label">
                      {t('signup.passwordTitle', 'Mot de passe')}<Req />
                    </label>
                    <div className="sp-input-wrap">
                      <input
                        className="sp-input has-icon"
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder={t('signup.pwdMin', '8 caractères minimum')}
                        required
                      />
                      <button type="button" className="sp-eye-btn" onClick={() => setShowPwd(v => !v)}>
                        {showPwd ? (
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
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
                    <span className="sp-hint">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                      Pour un mot de passe fort : mélangez majuscules, chiffres et symboles.
                    </span>
                  </div>
                  <div className="sp-field">
                    <label className="sp-label">
                      {t('signup.confirmPwd', 'Confirmer le mot de passe')}<Req />
                    </label>
                    <div className="sp-input-wrap">
                      <input
                        className="sp-input has-icon"
                        type={showPwd2 ? 'text' : 'password'}
                        value={passwordConfirm}
                        onChange={e => setPasswordConfirm(e.target.value)}
                        placeholder={t('signup.retypePwd', 'Répétez le mot de passe')}
                        required
                      />
                      <button type="button" className="sp-eye-btn" onClick={() => setShowPwd2(v => !v)}>
                        {showPwd2 ? (
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                    {passwordConfirm && password !== passwordConfirm && (
                      <span className="sp-hint" style={{ color: '#DC2626' }}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                        Les mots de passe ne correspondent pas encore.
                      </span>
                    )}
                    {passwordConfirm && password === passwordConfirm && (
                      <span className="sp-hint" style={{ color: '#047857' }}>
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Les mots de passe correspondent.
                      </span>
                    )}
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
                      {t('signup.acceptLegal1', 'J\'ai lu et j\'accepte sans réserve les')} <Link href="/mentions-legales" className="sp-legal-link" target="_blank">{t('signup.legalMentions', 'Mentions Légales')}</Link> {t('signup.acceptLegal2', 'ainsi que la')} <Link href="/confidentialite" className="sp-legal-link" target="_blank">{t('signup.privacyPolicy', 'Politique de Confidentialité')}</Link> {t('signup.acceptLegal3', `de l'association ${theme.name}.`)}
                      <span style={{ color: '#DC2626', marginLeft: '0.2rem', fontWeight: 900 }}>*</span>
                    </label>
                  </div>

                </div>
              )}

              {/* Error */}
              {error && (
                <div className="sp-error" style={{ marginTop: '1.25rem' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="sp-nav">
                {step > 0 && (
                  <button type="button" className="sp-btn-back" onClick={prevStep}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    {t('signup.back', 'Retour')}
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button type="button" className="sp-btn-next" onClick={nextStep} disabled={step === 2 && !!photoError}>
                    {t('signup.continue', 'Continuer')}
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button type="submit" className="sp-btn-submit" disabled={submitting || !termsAccepted}>
                    {submitting ? (
                      <><div className="sp-spinner" /> {t('signup.submitting', 'Envoi en cours…')}</>
                    ) : (
                      <>{t('signup.createAccount', 'Créer mon compte')}</>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Footer */}
          {!success && (
            <div className="sp-footer">
              <div>{t('signup.alreadyMember', 'Déjà membre ?')} <Link href="/login">{t('signup.login', 'Se connecter')}</Link></div>
              <Link href="/forgot-password" className="sp-footer-sublink">{t('signup.forgotPwd', 'Mot de passe oublié ?')}</Link>
            </div>
          )}

        </div>
      </div>
    </>
  );
}