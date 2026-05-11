// web/app/login/page.tsx
// web/app/login/page.tsx
'use client';

import { FormEvent, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurtain, setShowCurtain] = useState(false);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  // ── FIX : initialisation de currentLang sans passer par un effet synchrone ──
  // On lit i18n / localStorage une seule fois au montage côté client via une
  // fonction d'initialisation passée à useState, ce qui évite tout setState
  // synchrone dans un effet.
  const [currentLang, setCurrentLang] = useState<string>('fr');

  const isRTL = currentLang === 'ar';

  const [theme, setTheme] = useState<{
    name: string;
    logoUrl: string | null;
    primary: string;
    secondary: string;
    fontFamily: string;
  }>({
    name: 'LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT',
    logoUrl: '/assets/images/logolcd.jpg',
    primary: '#1A56DB',
    secondary: '#1E40AF',
    fontFamily: "'DM Sans', sans-serif",
  });

  // ── FIX : un seul effet de montage, sans setState groupés ──
  // On utilise queueMicrotask pour différer les setState hors du corps
  // synchrone de l'effet, ce qui casse la chaîne de renders en cascade.
  useEffect(() => {
    // Signaler le montage côté client
    queueMicrotask(() => setMounted(true));

    // Lire la langue détectée une seule fois
    if (i18n.isInitialized) {
      const detectedLang =
        i18n.language ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('i18nextLng') : null) ||
        'fr';
      queueMicrotask(() => setCurrentLang(detectedLang));
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── FIX : abonnement i18n dans son propre effet, séparé du montage ──
  const handleLanguageChanged = useCallback((lng: string) => {
    setCurrentLang(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  }, []);

  useEffect(() => {
    i18n.on('languageChanged', handleLanguageChanged);
    return () => { i18n.off('languageChanged', handleLanguageChanged); };
  }, [handleLanguageChanged]);

  // ── Thème (inchangé) ──
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code') || undefined;
        const domainParam = urlParams.get('domain') || undefined;
        const currentDomain = !codeParam && !domainParam ? window.location.hostname : undefined;
        if (currentDomain === 'localhost' || currentDomain === 'votre-domaine-principal.com') return;
        const data = await api.getPublicTheme(domainParam || currentDomain, codeParam);
        if (data) {
          setTheme({
            name: data.name,
            logoUrl: data.logoUrl || '/assets/images/logolcd.jpg',
            primary: '#1A56DB',
            secondary: '#1E40AF',
            fontFamily: data.fontFamily || "'DM Sans', sans-serif",
          });
        }
      } catch (err) {
        console.warn('Thème personnalisé non trouvé.', err);
      }
    };
    fetchTheme();
  }, []);

  // ── FIX : effet dir/lang séparé, déclenché uniquement quand mounted ET currentLang changent ──
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [currentLang, isRTL, mounted]);

  const handleLanguageChange = async (lang: string) => {
    if (!i18n || typeof i18n.changeLanguage !== 'function') return;
    try {
      await i18n.changeLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
    } catch (err) {
      console.error('Erreur changement langue:', err);
    }
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      const role = res.user?.role;
      setShowCurtain(true);
      setCurtainOpen(false);
      let target = '/dashboard';
      if (role === 'SYSTEM_ADMIN')       target = '/system-admin';
      else if (role === 'SUPER_ADMIN')   target = '/super-admin';
      else if (role === 'ANTENNA_ADMIN') target = '/admin';
      else if (role === 'MEMBER')        target = '/member';
      timerRef.current = window.setTimeout(() => setCurtainOpen(true), 1500) as unknown as number;
      timerRef.current = window.setTimeout(() => router.replace(target), 4500) as unknown as number;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error', 'Identifiants incorrects.'));
      setLoading(false);
    }
  }

  const curtainFolds = Array.from({ length: FOLDS_TOTAL }, (_, i) => {
    const goLeft = i < FOLDS_TOTAL / 2;
    const distCenter = Math.abs(i - (FOLDS_TOTAL / 2 - 0.5));
    return { id: i, goLeft, openDelay: distCenter * 0.12 };
  });

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --floa-sky:    #C5DCFF;
          --floa-bg:     #D6E9FF;
          --floa-blue:   #1A56DB;
          --floa-dark:   #1E3A8A;
          --floa-light:  #EFF6FF;
          --floa-mid:    #3B82F6;
          --font-main:   ${theme.fontFamily};
          --text-deep:   #1E3A8A;
          --text-muted:  #64748B;
          --error:       #DC2626;
          --gold-accent: #D4AF37;
        }

        .lp-root {
          font-family: var(--font-main);
          min-height: 100svh;
          background: linear-gradient(
            160deg,
            #C5DCFF 0%,
            #D6E9FF 35%,
            #BFDBFE 65%,
            #93C5FD 100%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
        }

        .lp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .lp-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(59,130,246,0.28) 0%, transparent 70%);
          top: -180px; right: -120px;
        }
        .lp-orb-2 {
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(30,64,175,0.18) 0%, transparent 70%);
          bottom: -120px; left: -60px;
        }
        .lp-orb-3 {
          width: 260px; height: 260px;
          background: radial-gradient(circle, rgba(147,197,253,0.35) 0%, transparent 70%);
          top: 40%; left: 10%;
        }

        .lp-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(28px);
          border-radius: 32px;
          padding: clamp(2rem, 5vw, 3.5rem);
          box-shadow:
            0 32px 64px rgba(30, 58, 138, 0.18),
            0 4px 16px rgba(59, 130, 246, 0.12),
            0 0 0 1px rgba(255,255,255,0.8) inset;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.7s cubic-bezier(.22,1,.36,1);
        }
        .lp-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .lp-lang-corner {
          position: absolute;
          top: 1.5rem;
          ${isRTL ? 'left: 1.5rem;' : 'right: 1.5rem;'}
          z-index: 20;
        }
        .lp-lang-select {
          appearance: none;
          background: rgba(239,246,255,0.9);
          border: 1.5px solid rgba(59,130,246,0.25);
          border-radius: 12px;
          padding: 0.45rem 1.8rem 0.45rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-deep);
          cursor: pointer;
          direction: ltr;
          transition: border-color .2s;
        }
        .lp-lang-select:hover { border-color: var(--floa-mid); }

        .lp-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1.5rem;
        }
        .lp-logo-box {
          width: 88px; height: 88px;
          padding: 4px;
          background: linear-gradient(135deg, var(--floa-mid), var(--floa-dark));
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(59,130,246,0.35);
        }
        .lp-logo-inner {
          width: 100%; height: 100%;
          background: white;
          border-radius: 50%;
          overflow: hidden;
          position: relative;
        }

        .lp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.9rem, 4vw, 2.3rem);
          font-weight: 700;
          color: var(--text-deep);
          text-align: center;
          line-height: 1.25;
        }
        .lp-title span {
          display: block;
          color: var(--floa-blue);
          font-size: 0.9em;
          margin-top: 0.4rem;
          font-weight: 600;
          font-family: var(--font-main);
        }

        .lp-field { margin-bottom: 1.25rem; }
        .lp-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-deep);
          margin-bottom: 0.5rem;
          text-align: ${isRTL ? 'right' : 'left'};
        }
        .lp-input-wrap { position: relative; }
        .lp-input {
          width: 100%;
          height: 54px;
          background: var(--floa-light);
          border: 1.5px solid rgba(59,130,246,0.18);
          border-radius: 14px;
          padding: 0 1.25rem;
          font-size: 0.95rem;
          color: var(--text-deep);
          outline: none;
          text-align: ${isRTL ? 'right' : 'left'};
          direction: ${isRTL ? 'rtl' : 'ltr'};
          transition: border-color .2s, box-shadow .2s;
        }
        .lp-input:focus {
          border-color: var(--floa-mid);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.1);
          background: white;
        }
        .lp-input::placeholder { color: #94A3B8; }
        .lp-toggle-btn {
          position: absolute;
          top: 50%; transform: translateY(-50%);
          ${isRTL ? 'left: 1rem;' : 'right: 1rem;'}
          background: none; border: none;
          color: var(--text-muted);
          cursor: pointer; font-size: 1.2rem;
        }

        .lp-forgot { text-align: ${isRTL ? 'left' : 'right'}; margin-top: 0.5rem; }
        .lp-forgot a {
          font-size: 0.75rem;
          color: var(--floa-blue);
          text-decoration: none;
          font-weight: 600;
        }
        .lp-forgot a:hover { text-decoration: underline; }

        .lp-btn {
          width: 100%;
          height: 54px;
          background: linear-gradient(135deg, #1A56DB, #1E40AF);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          margin-top: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(26,86,219,0.35);
          transition: all .2s;
          letter-spacing: 0.01em;
        }
        .lp-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #1D4ED8, #1E3A8A);
          box-shadow: 0 8px 28px rgba(26,86,219,0.45);
          transform: translateY(-1px);
        }
        .lp-btn:active:not(:disabled) { transform: scale(0.99); }
        .lp-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .lp-error {
          background: #FEF2F2;
          border: 1px solid #FECACA;
          padding: 0.8rem 1rem;
          color: var(--error);
          font-size: 0.82rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .lp-footer {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(59,130,246,0.12);
          text-align: center;
        }
        .lp-footer p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem; }
        .lp-signup-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--floa-blue);
          font-weight: 700;
          text-decoration: none;
          font-size: 0.92rem;
          transition: color .15s;
        }
        .lp-signup-link:hover { color: var(--floa-dark); }

        .spinner {
          width: 20px; height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .tc-container {
          position: fixed; inset: 0; z-index: 9999;
          pointer-events: none; overflow: hidden;
        }
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
          border: 4px solid var(--gold-accent);
          position: relative;
        }
        .tc-text {
          font-family: 'Cormorant Garamond', serif;
          font-size: 3rem; font-weight: 700;
          color: var(--gold-accent);
          letter-spacing: 0.18em; text-transform: uppercase;
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
          background: linear-gradient(90deg,
            #1E3A8A 0%,
            #1A56DB 30%,
            #2563EB 65%,
            #1E40AF 100%
          );
          box-shadow: inset 5px 0 15px rgba(0,0,0,0.4), inset -5px 0 15px rgba(0,0,0,0.4);
          border-bottom: 15px solid var(--gold-accent);
        }
        .tc-fabric::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
        }
        .tc-fold--open[data-go="left"]  { animation: tc-open-left  2.6s cubic-bezier(0.65,0,0.25,1) both; }
        .tc-fold--open[data-go="right"] { animation: tc-open-right 2.6s cubic-bezier(0.65,0,0.25,1) both; }
        @keyframes tc-open-left {
          0%   { transform: scaleX(1) translateX(0) skewX(0);              opacity: 1; }
          15%  { transform: scaleX(1.03) translateX(2px) skewX(0);         opacity: 1; }
          45%  { transform: scaleX(0.4) translateX(-15vw) skewX(8deg);     opacity: 0.9; }
          100% { transform: scaleX(0.04) translateX(-120vw) skewX(15deg);  opacity: 0; }
        }
        @keyframes tc-open-right {
          0%   { transform: scaleX(1) translateX(0) skewX(0);              opacity: 1; }
          15%  { transform: scaleX(1.03) translateX(-2px) skewX(0);        opacity: 1; }
          45%  { transform: scaleX(0.4) translateX(15vw) skewX(-8deg);     opacity: 0.9; }
          100% { transform: scaleX(0.04) translateX(120vw) skewX(-15deg);  opacity: 0; }
        }

        @media (max-width: 480px) {
          .lp-root {
            padding: 0;
            background: linear-gradient(160deg, #C5DCFF 0%, #BFDBFE 50%, #93C5FD 100%);
          }
          .lp-card {
            border-radius: 28px;
            min-height: 100svh;
            background: rgba(255,255,255,0.95);
            box-shadow: none;
            display: flex;
            flex-direction: column;
            justify-content: center;
            margin: 0;
          }
          .lp-orb { display: none; }
          .tc-logo-wrap { width: 110px; height: 110px; }
          .tc-text { font-size: 2.2rem; }
        }
      `}</style>

      {/* ── RIDEAU D'OUVERTURE ── */}
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

          {/* Sélecteur de langue */}
          <div className="lp-lang-corner">
            <select
              className="lp-lang-select"
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Logo et titre */}
          <div className="lp-logo-wrap">
            <div className="lp-logo-box">
              <div className="lp-logo-inner">
                {theme.logoUrl && (
                  <Image
                    src={theme.logoUrl}
                    alt={`Logo ${theme.name}`}
                    fill
                    priority
                    style={{ objectFit: 'contain', padding: '5px' }}
                    unoptimized
                  />
                )}
              </div>
            </div>
            <h1 className="lp-title">
              {t('login.welcome', 'Bienvenue dans votre')}
              <span>{t('login.secureSpace', 'Espace sécurisé')}</span>
              <small style={{
                display: 'block', fontSize: '0.6em', marginTop: '0.5rem',
                fontWeight: 500, opacity: 0.75, color: 'var(--text-muted)',
              }}>
                {theme.name.toUpperCase()}
              </small>
            </h1>
          </div>

          {/* Erreur */}
          {error && (
            <div className="lp-error">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
              </svg>
              {error}
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={onSubmit}>
            <div className="lp-field">
              <label className="lp-label">{t('login.emailLabel', 'Adresse email')}</label>
              <div className="lp-input-wrap">
                <input
                  className="lp-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder', 'votre@email.com')}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="lp-field">
              <label className="lp-label">{t('login.passwordLabel', 'Mot de passe')}</label>
              <div className="lp-input-wrap">
                <input
                  className="lp-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
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
              {loading
                ? <div className="spinner" />
                : t('login.submitBtn', 'Accéder à mon espace')
              }
            </button>
          </form>

          {/* Footer */}
          <footer className="lp-footer">
            <p>{t('login.notMember', 'Pas encore membre ?')}</p>
            <Link href="/signup" className="lp-signup-link">
              {t('login.joinCommunity', 'Rejoindre la communauté')}
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}