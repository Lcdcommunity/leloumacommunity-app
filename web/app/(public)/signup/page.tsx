// web/app/(public)/signup/page.tsx
// v3.0.0 — Simplification radicale : 8 questions seulement (Prénom, Nom,
// Antenne, Pays de résidence, Email, Téléphone, Mot de passe, Acceptation
// des mentions légales). Tout le reste (poste, origine, naissance,
// profession, adresse, photo) retiré — à renseigner plus tard depuis
// member/profile. Confirmation de mot de passe retirée aussi (pas dans la
// liste demandée ; "mot de passe oublié" reste le filet de sécurité).
// v3.0.1 — Fix fuite d'antennes entre associations : listPublicAntennasForSignup
// reçoit désormais domain/code résolus (resolveTenant()), exactement comme
// getPublicTheme — avant, aucun paramètre n'était transmis et le backend
// renvoyait les antennes de toutes les associations actives mélangées.

'use client';

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AdaptiveLogo } from '../../../components/AdaptiveLogo';
import PageHero from '../../../components/PageHero';
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

type StepKey =
  | 'firstName' | 'lastName' | 'antenna'
  | 'country' | 'countryOther'
  | 'email' | 'phone'
  | 'password' | 'terms';

const STEP_KEYS: StepKey[] = [
  'firstName', 'lastName', 'antenna',
  'country', 'countryOther',
  'email', 'phone',
  'password', 'terms',
];

function QuestionHeader({ title, optional }: { title: string; optional?: string }) {
  return (
    <h2 className="sp-question-title">
      {title}
      {optional && <span className="sp-opt-tag">{optional}</span>}
    </h2>
  );
}

function Explain({ children }: { children: ReactNode }) {
  return (
    <div className="sp-explain">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sp-explain-icon">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
      </svg>
      <div className="sp-explain-text">{children}</div>
    </div>
  );
}

function Example({ children }: { children: ReactNode }) {
  return <span className="sp-explain-example">{children}</span>;
}

export default function MemberSignupPage() {
  const { t } = useTranslation();

  const [currentLang, setCurrentLang] = useState('fr');
  const isRTL = currentLang === 'ar';

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
    name: 'Console Grand Chef',
    logoUrl: 'https://res.cloudinary.com/gltn9eo4/image/upload/c_crop,g_north,w_700,h_700/v1787347750/logo.png',
    primary: '#2563EB',
    secondary: '#059669',
    fontFamily: "'DM Sans', sans-serif",
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [antennaId, setAntennaId] = useState('');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [country, setCountry] = useState('');
  const [customCountry, setCustomCountry] = useState('');

  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
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

  // Résolution domain/code centralisée — réutilisée pour le thème ET les
  // antennes (avant : seul le thème la faisait, d'où la fuite d'antennes).
  const resolveTenant = useCallback((): { domain?: string; code?: string } => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code') || undefined;
    const domainParam = urlParams.get('domain') || undefined;
    const currentDomain = !codeParam && !domainParam ? window.location.hostname : undefined;

    if (currentDomain === 'localhost' || currentDomain === 'votre-domaine-principal.com') {
      return { domain: undefined, code: codeParam };
    }
    return { domain: domainParam || currentDomain, code: codeParam };
  }, []);

  useEffect(() => {
    const savedData = sessionStorage.getItem('signupFormState');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        queueMicrotask(() => {
          if (parsed.step !== undefined) setStep(parsed.step);
          if (parsed.firstName) setFirstName(parsed.firstName);
          if (parsed.lastName) setLastName(parsed.lastName);
          if (parsed.antennaId) setAntennaId(parsed.antennaId);
          if (parsed.email) setEmail(parsed.email);
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.country) setCountry(parsed.country);
          if (parsed.customCountry) setCustomCountry(parsed.customCountry);
          if (parsed.termsAccepted) setTermsAccepted(parsed.termsAccepted);
        });
      } catch (e) {
        console.error("Erreur lors de la restauration du formulaire", e);
      }
    }

    queueMicrotask(() => setMounted(true));

    const { domain, code } = resolveTenant();
    void (async () => {
      try {
        const items = await api.listPublicAntennasForSignup(domain, code);
        setAntennas(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement antennes');
      } finally {
        setLoadingAntennas(false);
      }
    })();

    if (i18n.isInitialized) {
      const detectedLang = i18n.language || localStorage.getItem('i18nextLng') || 'fr';
      queueMicrotask(() => setCurrentLang(detectedLang));
    }
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [handleLanguageChanged, resolveTenant]);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const { domain, code } = resolveTenant();
        const data = await api.getPublicTheme(domain, code);
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
  }, [resolveTenant]);

  useEffect(() => {
    if (!mounted) return;
    const dataToSave = {
      step, firstName, lastName, antennaId, email, phone, country, customCountry, termsAccepted,
    };
    sessionStorage.setItem('signupFormState', JSON.stringify(dataToSave));
  }, [mounted, step, firstName, lastName, antennaId, email, phone, country, customCountry, termsAccepted]);

  useEffect(() => {
    if (country && country !== 'Autre') {
      const selectedCountry = COUNTRIES.find(c => c.name === country);
      if (selectedCountry) {
        queueMicrotask(() => {
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
        });
      }
    }
  }, [country]);

  useEffect(() => {
    if (!mounted) return;
    if (shouldSkip(STEP_KEYS[step])) {
      goToStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, step, country]);

  function validateField(key: StepKey): string | null {
    switch (key) {
      case 'firstName':
        if (!firstName.trim()) return t('signup.errFirstName', 'Le prénom est requis.');
        return null;
      case 'lastName':
        if (!lastName.trim()) return t('signup.errLastName', 'Le nom est requis.');
        return null;
      case 'antenna':
        if (!antennaId) return t('signup.errAntenna', 'Veuillez sélectionner une antenne.');
        return null;
      case 'country':
        if (!country) return t('signup.errCountry', 'Le pays de résidence est requis.');
        return null;
      case 'countryOther':
        if (!customCountry.trim()) return t('signup.errCountryOther', 'Veuillez préciser votre pays de résidence.');
        return null;
      case 'email':
        if (!email.trim()) return t('signup.errEmailReq', 'L\'email est requis.');
        if (!/\S+@\S+\.\S+/.test(email)) return t('signup.errEmailFmt', 'Format d\'email invalide.');
        return null;
      case 'phone': {
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
        return null;
      }
      case 'password':
        if (!password) return t('signup.errPwdReq', 'Le mot de passe est requis.');
        if (password.length < 8) return t('signup.errPwdLen', 'Le mot de passe doit contenir au moins 8 caractères.');
        return null;
      case 'terms':
        if (!termsAccepted) return t('signup.errTerms', 'Vous devez accepter les Mentions Légales et la Politique de Confidentialité pour continuer.');
        return null;
      default:
        return null;
    }
  }

  function shouldSkip(key: StepKey): boolean {
    if (key === 'countryOther') return country !== 'Autre';
    return false;
  }

  function goToStep(direction: 1 | -1) {
    let next = step + direction;
    while (next >= 0 && next < STEP_KEYS.length && shouldSkip(STEP_KEYS[next])) {
      next += direction;
    }
    if (next >= 0 && next < STEP_KEYS.length) {
      setStep(next);
    }
  }

  function nextStep() {
    const key = STEP_KEYS[step];
    const err = validateField(key);
    if (err) { setError(err); return; }
    setError(null);
    goToStep(1);
  }

  function prevStep() {
    setError(null);
    goToStep(-1);
  }

  function handleEnterAdvance(e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextStep();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const finalErr = validateField('password') || validateField('terms');
    if (finalErr) { setError(finalErr); return; }
    setError(null);
    setSubmitting(true);

    try {
      const finalCountry = country === 'Autre' ? customCountry : country;

      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('antennaId', antennaId);
      formData.append('phone', phone.trim());
      if (finalCountry) formData.append('country', finalCountry.trim());
      formData.append('termsAccepted', String(termsAccepted));

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

  const currentKey = STEP_KEYS[step];
  const visibleStepKeys = STEP_KEYS.filter(k => !shouldSkip(k));
  const progressTotal = visibleStepKeys.length;
  const progressIndex = Math.max(1, visibleStepKeys.indexOf(currentKey) + 1);
  const progressPercent = progressTotal > 0 ? Math.round((progressIndex / progressTotal) * 100) : 0;

  if (!mounted) return null;

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
          min-height: 60svh;
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

        .sp-progress-wrap { margin-bottom: 2rem; }
        .sp-progress-track { width: 100%; height: 8px; background: #E2E8F0; border-radius: 99px; overflow: hidden; }
        .sp-progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, ${theme.primary}, ${theme.secondary}); transition: width 0.4s cubic-bezier(.22,1,.36,1); }
        .sp-progress-label { margin-top: 0.5rem; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #64748B; text-align: center; }

        .sp-question-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.3rem, 4vw, 1.7rem); font-weight: 600; color: #1E293B; line-height: 1.3; margin-bottom: 1.1rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
        .sp-opt-tag { font-size: 0.62rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #92400E; background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 99px; padding: 0.18rem 0.6rem; vertical-align: middle; }

        .sp-explain { display: flex; gap: 0.65rem; align-items: flex-start; background: ${getLightColor(theme.secondary, 0.08)}; border: 1.5px solid ${getLightColor(theme.secondary, 0.25)}; border-radius: 14px; padding: 0.95rem 1.05rem; font-size: 0.83rem; color: #134E4A; font-weight: 600; line-height: 1.6; margin-bottom: 1.4rem; }
        .sp-explain-icon { flex-shrink: 0; margin-top: 2px; color: ${theme.secondary}; }
        .sp-explain-text { flex: 1; }
        .sp-explain-example { display: block; margin-top: 0.5rem; font-weight: 700; color: #047857; background: rgba(255,255,255,0.65); border-radius: 8px; padding: 0.45rem 0.65rem; }

        .sp-stack { display: flex; flex-direction: column; gap: 0.2rem; }
        .sp-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; }

        .sp-hint { font-size: 0.67rem; font-weight: 500; color: #94A3B8; margin-top: 0.2rem; line-height: 1.45; display: flex; align-items: flex-start; gap: 0.3rem; }
        .sp-hint svg { flex-shrink: 0; margin-top: 1px; }

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

        .sp-input-big, .sp-select-big { min-height: 56px; font-size: 1rem; padding: 0 1.1rem; }
        .sp-select-big { padding-right: 2.2rem; }

        .sp-notice { background: ${getLightColor(theme.primary, 0.07)}; border: 1px solid ${getLightColor(theme.primary, 0.15)}; border-radius: 12px; padding: 0.85rem 1rem; font-size: 0.78rem; color: #1E40AF; font-weight: 500; line-height: 1.5; margin-bottom: 1.2rem; display: flex; gap: 0.6rem; align-items: flex-start; }
        .sp-error { display: flex; align-items: center; gap: 0.55rem; padding: 0.8rem 1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: var(--err); font-size: 0.8rem; font-weight: 600; }
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

        .sp-question-anim { animation: spQuestionIn 0.4s cubic-bezier(.22,1,.36,1); }
        @keyframes spQuestionIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 540px) {
          .sp-root { padding: 1rem 0.5rem 2rem; }
          .sp-card { border-radius: 20px; padding: 1.5rem; }
          .sp-question-title { font-size: 1.25rem; }
        }
      `}</style>

      <PageHero
        crumbs={[{ label: 'Accueil', href: '/' }, { label: 'Créer un compte' }]}
        title={t('signup.heroTitle', 'Rejoindre')}
        description={t('signup.heroDesc', `Devenez membre de ${theme.name} en quelques questions simples.`)}
        primaryColor={theme.primary}
        secondaryColor={theme.secondary}
        waveColor="#F0F4F8"
        logoUrl={theme.logoUrl}
      />

      <div className="sp-root" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="sp-bg-grid" />
        <div className="sp-orb sp-orb-1" />
        <div className="sp-orb sp-orb-2" />

        <div className={`sp-card ${mounted ? 'visible' : ''}`}>

          <div className="sp-header">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <AdaptiveLogo src={theme.logoUrl} alt={`Logo ${theme.name}`} size={60} />
            </div>
            <div className="sp-badge">
              <div className="sp-badge-dot" />
              {t('signup.newMember', 'Nouveau membre')}
            </div>
            <h1 className="sp-title">{t('signup.join', 'Rejoindre')} <span>{theme.name}</span></h1>
            <p className="sp-subtitle">{t('signup.subtitleStepByStep', 'Répondez aux questions une par une · Validation par votre antenne')}</p>
          </div>

          {!success && (
            <div className="sp-progress-wrap">
              <div className="sp-progress-track">
                <div className="sp-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="sp-progress-label">
                {t('signup.questionLabel', 'Question')} {progressIndex} {t('signup.ofLabel', 'sur')} {progressTotal}
              </div>
            </div>
          )}

          {success ? (
            <div className="sp-success sp-panel">
              <div className="sp-photo-avatar" style={{ width: '88px', height: '88px', fontSize: '1.8rem' }}>
                {initials || '?'}
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

              {currentKey === 'firstName' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <div className="sp-notice">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                    </svg>
                    {t('signup.activationNotice', 'Le compte sera activé après vérification email et validation par l\'administrateur de votre antenne.')}
                  </div>
                  <QuestionHeader title={t('signup.q.firstName.title', 'Comment vous appelez-vous ?')} />
                  <Explain>
                    {t('signup.q.firstName.explain', "Écrivez votre prénom. C'est le premier nom qu'on vous a donné à la naissance, avant le nom de famille.")}
                    <Example>{t('signup.q.firstName.example', 'Exemple : si vous vous appelez Mamadou Diallo, écrivez seulement « Mamadou ».')}</Example>
                  </Explain>
                  <div className="sp-field">
                    <input
                      className="sp-input sp-input-big"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      onKeyDown={handleEnterAdvance}
                      placeholder="Ex : Mamadou"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              {currentKey === 'lastName' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <QuestionHeader title={t('signup.q.lastName.title', 'Quel est votre nom de famille ?')} />
                  <Explain>
                    {t('signup.q.lastName.explain', "C'est le nom que vous partagez avec votre famille, celui de votre père.")}
                    <Example>{t('signup.q.lastName.example', 'Exemple : si vous vous appelez Mamadou Diallo, écrivez « Diallo ».')}</Example>
                  </Explain>
                  <div className="sp-field">
                    <input
                      className="sp-input sp-input-big"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      onKeyDown={handleEnterAdvance}
                      placeholder="Ex : Diallo"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              {currentKey === 'antenna' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <QuestionHeader title={t('signup.q.antenna.title', 'À quelle antenne voulez-vous vous inscrire ?')} />
                  <Explain>
                    {t('signup.q.antenna.explain', "Une antenne est le groupe local de l'association le plus proche de chez vous. C'est elle qui validera votre inscription.")}
                    <Example>{t('signup.q.antenna.example', 'Si vous ne savez pas laquelle choisir, demandez à un responsable de l\'association près de chez vous.')}</Example>
                  </Explain>
                  <div className="sp-field">
                    <select
                      className="sp-select sp-select-big"
                      value={antennaId}
                      onChange={e => setAntennaId(e.target.value)}
                      onKeyDown={handleEnterAdvance}
                      autoFocus
                      required
                    >
                      <option value="">{loadingAntennas ? t('signup.loading', 'Chargement...') : t('signup.selectAntenna', 'Sélectionnez une antenne')}</option>
                      {antennas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}{a.city ? ` (${a.city})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {currentKey === 'country' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <QuestionHeader title={t('signup.q.residenceCountry.title', 'Dans quel pays habitez-vous actuellement ?')} />
                  <Explain>
                    {t('signup.q.residenceCountry.explain', "C'est le pays où vous vivez aujourd'hui.")}
                    <Example>{t('signup.q.residenceCountry.example', "L'indicatif téléphonique de votre numéro sera rempli automatiquement selon ce choix.")}</Example>
                  </Explain>
                  <div className="sp-field">
                    <select
                      className="sp-select sp-select-big"
                      value={country}
                      onChange={e => { setCountry(e.target.value); if (e.target.value !== 'Autre') setCustomCountry(''); }}
                      onKeyDown={handleEnterAdvance}
                      autoFocus
                      required
                    >
                      <option value="">{t('signup.selectCountry', 'Sélectionnez votre pays...')}</option>
                      {COUNTRIES.map(c => (
                        <option key={`res-${c.code}`} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {currentKey === 'countryOther' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <QuestionHeader title={t('signup.q.residenceCountryOther.title', 'Précisez votre pays de résidence')} />
                  <Explain>
                    {t('signup.q.residenceCountryOther.explain', 'Écrivez le nom du pays où vous vivez actuellement.')}
                  </Explain>
                  <div className="sp-field">
                    <input
                      className="sp-input sp-input-big"
                      value={customCountry}
                      onChange={e => setCustomCountry(e.target.value)}
                      onKeyDown={handleEnterAdvance}
                      placeholder={t('signup.specifyCountry', 'Précisez votre pays')}
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              {currentKey === 'email' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <QuestionHeader title={t('signup.q.email.title', 'Quelle est votre adresse email ?')} />
                  <Explain>
                    {t('signup.q.email.explain', 'Une adresse email ressemble à ceci : nom@gmail.com. Si vous n\'en avez pas, demandez à une personne de confiance de vous aider à en créer une avant de continuer.')}
                    <Example>{t('signup.q.email.example', 'Nous vous enverrons un message à cette adresse pour vérifier votre compte.')}</Example>
                  </Explain>
                  <div className="sp-field">
                    <input
                      className="sp-input sp-input-big"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={handleEnterAdvance}
                      placeholder="vous@exemple.com"
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              {currentKey === 'phone' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <QuestionHeader title={t('signup.q.phone.title', 'Quel est votre numéro de téléphone ?')} />
                  <Explain>
                    {t('signup.q.phone.explain', "L'indicatif de votre pays a déjà été ajouté automatiquement. Écrivez la suite : votre numéro, sans espace inutile.")}
                    <Example>{t('signup.q.phone.example', 'Exemple : +224 621 00 00 00')}</Example>
                  </Explain>
                  <div className="sp-field">
                    <input
                      className="sp-input sp-input-big"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onKeyDown={handleEnterAdvance}
                      placeholder={country ? t('signup.enterPhone', 'Entrez le numéro') : t('signup.phoneHint', "Sélectionnez d'abord votre pays de résidence")}
                      autoFocus
                      required
                    />
                  </div>
                </div>
              )}

              {currentKey === 'password' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <QuestionHeader title={t('signup.q.password.title', 'Choisissez un mot de passe')} />
                  <Explain>
                    {t('signup.q.password.explain', 'Le mot de passe protège votre compte, comme une clé. Il doit contenir au moins 8 caractères.')}
                    <Example>{t('signup.q.password.example', "Pour qu'il soit plus difficile à deviner, mélangez des lettres et des chiffres. Ne le donnez à personne et gardez-le en lieu sûr.")}</Example>
                  </Explain>
                  <div className="sp-field">
                    <div className="sp-input-wrap">
                      <input
                        className="sp-input sp-input-big has-icon"
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={handleEnterAdvance}
                        placeholder={t('signup.pwdMin', '8 caractères minimum')}
                        autoFocus
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
                  </div>
                </div>
              )}

              {currentKey === 'terms' && (
                <div className="sp-panel sp-stack sp-question-anim" key={step}>
                  <QuestionHeader title={t('signup.q.terms.title', 'Dernière étape !')} />
                  <Explain>
                    {t('signup.q.terms.explain', "Pour terminer votre inscription, merci de lire et d'accepter les règles de l'association.")}
                  </Explain>
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

              {error && (
                <div className="sp-error" style={{ marginTop: '1.25rem' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="sp-nav">
                {step > 0 && (
                  <button type="button" className="sp-btn-back" onClick={prevStep}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
                    </svg>
                    {t('signup.back', 'Retour')}
                  </button>
                )}

                {currentKey === 'terms' ? (
                  <button type="submit" className="sp-btn-submit" disabled={submitting || !termsAccepted}>
                    {submitting ? (
                      <><div className="sp-spinner" /> {t('signup.submitting', 'Envoi en cours…')}</>
                    ) : (
                      <>{t('signup.createAccount', 'Créer mon compte')}</>
                    )}
                  </button>
                ) : (
                  <button type="button" className="sp-btn-next" onClick={nextStep}>
                    {t('signup.continue', 'Continuer')}
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          )}

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