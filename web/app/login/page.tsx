// web/app/login/page.tsx
'use client';

import { FormEvent, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { AdaptiveLogo } from '../../components/AdaptiveLogo';
import { login } from '../../lib/auth';
import { api } from '../../lib/api-client';
import { useTranslation } from 'react-i18next';
import i18n from '../../lib/i18n';

export const dynamic = 'force-dynamic';

const LANGUAGES = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
  { code: 'ff', flag: '🇬🇳', label: 'Pulaar' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
];

const FOLDS_TOTAL = 14;

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);
  const [mounted, setMounted]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurtain, setShowCurtain]   = useState(false);
  const [curtainOpen, setCurtainOpen]   = useState(false);
  const [helpOpen, setHelpOpen]     = useState(false);
  const timerRef = useRef<number | null>(null);

  const [currentLang, setCurrentLang] = useState<string>('fr');
  const isRTL = currentLang === 'ar';

  const [theme, setTheme] = useState<{
    name: string; logoUrl: string | null;
    primary: string; secondary: string; fontFamily: string;
    phone: string | null; email: string | null; city: string | null; country: string | null;
  }>({
    name: 'Console Grand Chef',
    logoUrl: null,
    primary: '#1A56DB', secondary: '#1E40AF',
    fontFamily: "'DM Sans', sans-serif",
    phone: null, email: null, city: null, country: null,
  });

  const [docs, setDocs] = useState<Array<{ id: string; title: string; url: string }>>([]);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    if (i18n.isInitialized) {
      const detectedLang =
        i18n.language ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null) ||
        'fr';
      queueMicrotask(() => setCurrentLang(detectedLang));
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleLanguageChanged = useCallback((lng: string) => {
    setCurrentLang(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    i18n.on('languageChanged', handleLanguageChanged);
    return () => { i18n.off('languageChanged', handleLanguageChanged); };
  }, [handleLanguageChanged]);

  useEffect(() => {
    const fetchThemeAndDocs = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const codeParam   = urlParams.get('code')   || undefined;
      const domainParam = urlParams.get('domain') || undefined;
      const currentDomain = !codeParam && !domainParam ? window.location.hostname : undefined;
      if (currentDomain === 'localhost' || currentDomain === 'votre-domaine-principal.com') return;

      try {
        const data = await api.getPublicTheme(domainParam || currentDomain, codeParam);
        if (data) {
          setTheme({
            name: data.name,
            logoUrl: data.logoUrl || null,
            primary: data.themeColors?.primary || '#1A56DB',
            secondary: data.themeColors?.secondary || '#1E40AF',
            fontFamily: data.fontFamily || "'DM Sans', sans-serif",
            phone: data.phone,
            email: data.email,
            city: data.city,
            country: data.country,
          });
        }
      } catch (err) {
        // Aucune association ne correspond à ce domaine (Grand Chef, ou
        // instance sans domaine configuré) — identité neutre conservée.
        console.warn('Thème personnalisé non trouvé.', err);
      }

      try {
        const publicDocs = await api.getPublicDocuments(domainParam || currentDomain, codeParam);
        setDocs(publicDocs || []);
      } catch (err) {
        console.warn('Documents publics non trouvés.', err);
      }
    };
    fetchThemeAndDocs();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = currentLang;
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
  }, [currentLang, isRTL, mounted]);

  const handleLanguageChange = async (lang: string) => {
    if (!i18n || typeof i18n.changeLanguage !== 'function') return;
    try {
      await i18n.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
    } catch (err) { console.error('Erreur changement langue:', err); }
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res  = await login(email, password);
      const role = res.user?.role;
      setShowCurtain(true);
      setCurtainOpen(false);
      let target = '/dashboard';
      if      (role === 'SYSTEM_ADMIN')  target = '/system-admin';
      else if (role === 'SUPER_ADMIN')   target = '/super-admin';
      else if (role === 'ANTENNA_ADMIN') target = '/admin';
      else if (role === 'MEMBER')        target = '/member';
      timerRef.current = window.setTimeout(() => setCurtainOpen(true),        1500) as unknown as number;
      timerRef.current = window.setTimeout(() => router.replace(target),      4500) as unknown as number;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error', 'Identifiants incorrects.'));
      setLoading(false);
    }
  }

  const curtainFolds = Array.from({ length: FOLDS_TOTAL }, (_, i) => {
    const goLeft     = i < FOLDS_TOTAL / 2;
    const distCenter = Math.abs(i - (FOLDS_TOTAL / 2 - 0.5));
    return { id: i, goLeft, openDelay: distCenter * 0.12 };
  });

  const hasContactInfo = Boolean(theme.email || theme.phone || theme.city || theme.country);
  const hasDocs = docs.length > 0;

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --floa-blue:   ${theme.primary};
          --floa-dark:   ${theme.secondary};
          --floa-mid:    color-mix(in srgb, ${theme.primary} 70%, white);
          --floa-sky:    color-mix(in srgb, ${theme.primary} 25%, white);
          --floa-bg:     color-mix(in srgb, ${theme.primary} 18%, white);
          --floa-light:  color-mix(in srgb, ${theme.primary} 8%, white);
          --font-main:   ${theme.fontFamily};
          --text-deep:   #1E3A8A;
          --text-muted:  #64748B;
          --error:       #DC2626;
          --gold-accent: #D4AF37;
        }

        .lp-root {
          font-family: var(--font-main);
          min-height: 100svh;
          background: linear-gradient(160deg, var(--floa-sky) 0%, var(--floa-bg) 35%, #BFDBFE 65%, #93C5FD 100%);
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden; padding: 1.5rem;
        }

        .lp-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
        .lp-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 70%); top: -180px; right: -120px; }
        .lp-orb-2 { width: 380px; height: 380px; background: radial-gradient(circle, rgba(30,64,175,0.18) 0%, transparent 70%); bottom: -120px; left: -60px; }
        .lp-orb-3 { width: 260px; height: 260px; background: radial-gradient(circle, rgba(147,197,253,0.35) 0%, transparent 70%); top: 40%; left: 10%; }

        .lp-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 480px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(28px);
          border-radius: 32px;
          padding: clamp(2rem, 5vw, 3.5rem);
          box-shadow: 0 32px 64px rgba(30,58,138,0.18), 0 4px 16px rgba(59,130,246,0.12), 0 0 0 1px rgba(255,255,255,0.8) inset;
          opacity: 0; transform: translateY(20px);
          transition: all 0.7s cubic-bezier(.22,1,.36,1);
        }
        .lp-card.visible { opacity: 1; transform: translateY(0); }

        .lp-lang-corner {
          position: absolute; top: 1.5rem;
          ${isRTL ? 'left: 1.5rem;' : 'right: 1.5rem;'}
          z-index: 20;
        }
        .lp-lang-select {
          appearance: none;
          background: rgba(239,246,255,0.9);
          border: 1.5px solid rgba(59,130,246,0.25);
          border-radius: 12px;
          padding: 0.45rem 1.8rem 0.45rem 0.6rem;
          font-size: 0.75rem; font-weight: 700; color: var(--text-deep);
          cursor: pointer; direction: ltr; transition: border-color .2s;
        }
        .lp-lang-select:hover { border-color: var(--floa-mid); }

        .lp-logo-wrap { display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem; gap: 1.5rem; }
        .lp-logo-box {
          width: 88px; height: 88px; padding: 4px;
          background: linear-gradient(135deg, var(--floa-mid), var(--floa-dark));
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(59,130,246,0.35);
        }
        .lp-logo-inner { width: 100%; height: 100%; background: white; border-radius: 50%; overflow: hidden; position: relative; }

        .lp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.9rem, 4vw, 2.3rem);
          font-weight: 700; color: var(--text-deep); text-align: center; line-height: 1.25;
        }
        .lp-title span { display: block; color: var(--floa-blue); font-size: 0.9em; margin-top: 0.4rem; font-weight: 600; font-family: var(--font-main); }

        .lp-field { margin-bottom: 1.25rem; }
        .lp-label {
          display: block; font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--text-deep); margin-bottom: 0.5rem;
          text-align: ${isRTL ? 'right' : 'left'};
        }
        .lp-input-wrap { position: relative; }
        .lp-input {
          width: 100%; height: 54px;
          background: var(--floa-light);
          border: 1.5px solid rgba(59,130,246,0.18);
          border-radius: 14px; padding: 0 1.25rem;
          font-size: 0.95rem; color: var(--text-deep); outline: none;
          text-align: ${isRTL ? 'right' : 'left'};
          direction: ${isRTL ? 'rtl' : 'ltr'};
          transition: border-color .2s, box-shadow .2s;
        }
        .lp-input:focus { border-color: var(--floa-mid); box-shadow: 0 0 0 4px rgba(59,130,246,0.1); background: white; }
        .lp-input::placeholder { color: #94A3B8; }
        .lp-toggle-btn {
          position: absolute; top: 50%; transform: translateY(-50%);
          ${isRTL ? 'left: 1rem;' : 'right: 1rem;'}
          background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem;
        }

        .lp-forgot { text-align: ${isRTL ? 'left' : 'right'}; margin-top: 0.5rem; }
        .lp-forgot a { font-size: 0.75rem; color: var(--floa-blue); text-decoration: none; font-weight: 600; }
        .lp-forgot a:hover { text-decoration: underline; }

        .lp-btn {
          width: 100%; height: 54px;
          background: linear-gradient(135deg, var(--floa-blue), var(--floa-dark));
          color: white; border: none; border-radius: 14px;
          font-size: 1rem; font-weight: 700; cursor: pointer; margin-top: 1.5rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 20px rgba(26,86,219,0.35);
          transition: all .2s; letter-spacing: 0.01em;
        }
        .lp-btn:hover:not(:disabled) { filter: brightness(0.92); box-shadow: 0 8px 28px rgba(26,86,219,0.45); transform: translateY(-1px); }
        .lp-btn:active:not(:disabled) { transform: scale(0.99); }
        .lp-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .lp-error {
          background: #FEF2F2; border: 1px solid #FECACA; padding: 0.8rem 1rem;
          color: var(--error); font-size: 0.82rem; border-radius: 12px; margin-bottom: 1.5rem;
          display: flex; align-items: center; gap: 0.6rem;
        }

        .lp-footer {
          margin-top: 2rem; padding-top: 1.5rem;
          border-top: 1px solid rgba(59,130,246,0.12);
          text-align: center;
        }
        .lp-footer p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem; }
        .lp-signup-link {
          display: inline-flex; align-items: center; gap: 0.5rem;
          color: var(--floa-blue); font-weight: 700; text-decoration: none;
          font-size: 0.92rem; transition: color .15s;
        }
        .lp-signup-link:hover { color: var(--floa-dark); }

        .lp-help-section {
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(59,130,246,0.07);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.85rem;
        }

        .lp-help-toggle {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 0.5rem 1rem; border-radius: 99px;
          background: rgba(59,130,246,0.06);
          border: 1px solid rgba(59,130,246,0.15);
          color: var(--text-deep);
          font-family: var(--font-main); font-size: 0.78rem; font-weight: 700;
          cursor: pointer; transition: background .15s, border-color .15s, box-shadow .15s;
          outline: none;
        }
        .lp-help-toggle:hover {
          background: rgba(59,130,246,0.1);
          border-color: rgba(59,130,246,0.3);
          box-shadow: 0 2px 10px rgba(59,130,246,0.12);
        }
        .lp-help-toggle.open {
          background: rgba(59,130,246,0.1);
          border-color: rgba(59,130,246,0.3);
          color: var(--floa-blue);
        }
        .lp-help-chevron {
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        .lp-help-toggle.open .lp-help-chevron {
          transform: rotate(180deg);
        }

        .lp-help-panel {
          width: 100%;
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height 0.3s ease, opacity 0.25s ease;
        }
        .lp-help-panel.open {
          max-height: 200px;
          opacity: 1;
        }
        .lp-help-panel-inner {
          display: flex; flex-direction: column; gap: 6px;
          background: rgba(59,130,246,0.04);
          border: 1px solid rgba(59,130,246,0.1);
          border-radius: 16px;
          padding: 0.9rem 1rem;
        }
        .lp-contact-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.78rem; color: var(--text-muted);
        }
        .lp-contact-icon {
          width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
          background: rgba(59,130,246,0.1);
          display: flex; align-items: center; justify-content: center;
          color: var(--floa-blue);
        }
        .lp-contact-link {
          color: var(--text-deep); font-weight: 600; text-decoration: none;
          font-size: 0.78rem;
          transition: color .15s;
        }
        .lp-contact-link:hover { color: var(--floa-blue); }

        .lp-help-docs {
          display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;
        }
        .lp-doc-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 0.4rem 0.85rem; border-radius: 10px;
          font-family: var(--font-main); font-size: 0.72rem; font-weight: 700;
          text-decoration: none; transition: background .15s;
          background: rgba(30,58,138,0.06); border: 1px solid rgba(30,58,138,0.15); color: #1E3A8A;
        }
        .lp-doc-btn:hover { background: rgba(30,58,138,0.1); }

        .spinner {
          width: 20px; height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .tc-container { position: fixed; inset: 0; z-index: 9999; pointer-events: none; overflow: hidden; }
        .tc-emblem {
          position: fixed; inset: 0; z-index: 10000;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;
          opacity: 1; transform: scale(1);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .tc-emblem--fade { opacity: 0; transform: scale(1.15); }
        .tc-logo-wrap {
          width: 140px; height: 140px;
          background: white; border-radius: 50%; padding: 12px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.1);
          border: 4px solid var(--gold-accent); position: relative;
        }
        .tc-text {
          font-family: 'Cormorant Garamond', serif; font-size: 3rem; font-weight: 700;
          color: var(--gold-accent); letter-spacing: 0.18em; text-transform: uppercase;
          text-shadow: 0 4px 15px rgba(0,0,0,0.6);
          animation: tc-pulse 2s ease-in-out infinite alternate;
        }
        @keyframes tc-pulse {
          from { opacity: 0.85; text-shadow: 0 4px 10px rgba(0,0,0,0.4); }
          to   { opacity: 1;    text-shadow: 0 6px 20px rgba(0,0,0,0.7); }
        }
        .tc-fold {
          position: absolute; top: -10px; bottom: 0;
          transform-origin: top center;
          box-shadow: 4px 0 20px rgba(0,0,0,0.4);
          will-change: transform, opacity;
        }
        .tc-fabric {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, var(--floa-dark) 0%, var(--floa-blue) 30%, var(--floa-mid) 65%, var(--floa-dark) 100%);
          box-shadow: inset 5px 0 15px rgba(0,0,0,0.4), inset -5px 0 15px rgba(0,0,0,0.4);
          border-bottom: 15px solid var(--gold-accent);
        }
        .tc-fabric::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%); }
        .tc-fold--open[data-go="left"]  { animation: tc-open-left  2.6s cubic-bezier(0.65,0,0.25,1) both; }
        .tc-fold--open[data-go="right"] { animation: tc-open-right 2.6s cubic-bezier(0.65,0,0.25,1) both; }
        @keyframes tc-open-left {
          0%   { transform: scaleX(1) translateX(0) skewX(0);             opacity: 1; }
          15%  { transform: scaleX(1.03) translateX(2px) skewX(0);        opacity: 1; }
          45%  { transform: scaleX(0.4) translateX(-15vw) skewX(8deg);    opacity: 0.9; }
          100% { transform: scaleX(0.04) translateX(-120vw) skewX(15deg); opacity: 0; }
        }
        @keyframes tc-open-right {
          0%   { transform: scaleX(1) translateX(0) skewX(0);             opacity: 1; }
          15%  { transform: scaleX(1.03) translateX(-2px) skewX(0);       opacity: 1; }
          45%  { transform: scaleX(0.4) translateX(15vw) skewX(-8deg);    opacity: 0.9; }
          100% { transform: scaleX(0.04) translateX(120vw) skewX(-15deg); opacity: 0; }
        }

        @media (max-width: 480px) {
          .lp-root { padding: 0; background: linear-gradient(160deg, var(--floa-sky) 0%, #BFDBFE 50%, #93C5FD 100%); }
          .lp-card { border-radius: 28px; min-height: 100svh; background: rgba(255,255,255,0.95); box-shadow: none; display: flex; flex-direction: column; justify-content: center; margin: 0; }
          .lp-orb { display: none; }
          .tc-logo-wrap { width: 110px; height: 110px; }
          .tc-text { font-size: 2.2rem; }
        }
      `}</style>

      {showCurtain && (
        <div className="tc-container" aria-hidden>
          <div className={`tc-emblem ${curtainOpen ? 'tc-emblem--fade' : ''}`}>
            {theme.logoUrl && (
              <div className="tc-logo-wrap">
                <Image src={theme.logoUrl} alt="Emblème" fill style={{ objectFit: 'contain', padding: '8px' }} unoptimized />
              </div>
            )}
            <div className="tc-text">BIENVENUE</div>
          </div>
          {curtainFolds.map((fold) => (
            <div
              key={fold.id}
              className={`tc-fold ${curtainOpen ? 'tc-fold--open' : ''}`}
              data-go={fold.goLeft ? 'left' : 'right'}
              style={{
                left: `${(fold.id / FOLDS_TOTAL) * 100}%`,
                width: `${100 / FOLDS_TOTAL + 0.5}%`,
                animationDelay: curtainOpen ? `${fold.openDelay}s` : '0s',
              }}
            >
              <div className="tc-fabric" />
            </div>
          ))}
        </div>
      )}

      <div className="lp-root" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />

        <div className={`lp-card ${mounted ? 'visible' : ''}`}>

          <div className="lp-lang-corner">
            <select className="lp-lang-select" value={currentLang} onChange={(e) => handleLanguageChange(e.target.value)}>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
              ))}
            </select>
          </div>

          <div className="lp-logo-wrap">
  <AdaptiveLogo src={theme.logoUrl} alt={`Logo ${theme.name}`} size={88} />
  <h1 className="lp-title">
    {t('login.welcome', 'Bienvenue dans votre')}
    <span>{t('login.secureSpace', 'Espace sécurisé')}</span>
    <small style={{ display: 'block', fontSize: '0.6em', marginTop: '0.5rem', fontWeight: 500, opacity: 0.75, color: 'var(--text-muted)' }}>
      {theme.name.toUpperCase()}
    </small>
  </h1>
</div>

          {error && (
            <div className="lp-error">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="lp-field">
              <label className="lp-label">{t('login.emailLabel', 'Adresse email')}</label>
              <div className="lp-input-wrap">
                <input
                  className="lp-input" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder', 'votre@email.com')}
                  required autoComplete="email"
                />
              </div>
            </div>
            <div className="lp-field">
              <label className="lp-label">{t('login.passwordLabel', 'Mot de passe')}</label>
              <div className="lp-input-wrap">
                <input
                  className="lp-input" type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••" required autoComplete="current-password"
                />
                <button type="button" className="lp-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="lp-forgot">
                <Link href="/forgot-password">{t('login.forgotPassword', 'Mot de passe oublié ?')}</Link>
              </div>
            </div>
            <button type="submit" className="lp-btn" disabled={loading}>
              {loading ? <div className="spinner" /> : t('login.submitBtn', 'Accéder à mon espace')}
            </button>
          </form>

          <footer className="lp-footer">
            <p>{t('login.notMember', 'Pas encore membre ?')}</p>
            <Link href="/signup" className="lp-signup-link">
              {t('login.joinCommunity', 'Rejoindre la communauté')}
            </Link>
          </footer>

          {(hasContactInfo || hasDocs) && (
            <div className="lp-help-section">

              {hasContactInfo && (
                <>
                  <button
                    className={`lp-help-toggle ${helpOpen ? 'open' : ''}`}
                    onClick={() => setHelpOpen(v => !v)}
                    aria-expanded={helpOpen}
                    aria-label="Aide et assistance"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
                    </svg>
                    {t('login.helpBtn', 'Aide & Assistance')}
                    <svg className="lp-help-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>

                  <div className={`lp-help-panel ${helpOpen ? 'open' : ''}`} aria-hidden={!helpOpen}>
                    <div className="lp-help-panel-inner">

                      {theme.email && (
                        <div className="lp-contact-row">
                          <span className="lp-contact-icon">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                          </span>
                          <a href={`mailto:${theme.email}`} className="lp-contact-link">{theme.email}</a>
                        </div>
                      )}

                      {theme.phone && (
                        <div className="lp-contact-row">
                          <span className="lp-contact-icon">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 15.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                          </span>
                          <a href={`tel:${theme.phone}`} className="lp-contact-link">{theme.phone}</a>
                        </div>
                      )}

                      {(theme.city || theme.country) && (
                        <div className="lp-contact-row">
                          <span className="lp-contact-icon">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                          </span>
                          <span style={{ color: 'var(--text-deep)', fontWeight: 500 }}>
                            {[theme.city, theme.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}

                    </div>
                  </div>
                </>
              )}

              {hasDocs && (
                <div className="lp-help-docs">
                  {docs.map((doc) => (
                    <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="lp-doc-btn">
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      {doc.title}
                    </a>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>
      </div>
    </>
  );
}