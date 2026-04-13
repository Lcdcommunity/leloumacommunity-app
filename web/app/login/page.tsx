// web/app/login/page.tsx
'use client';

import { FormEvent, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { login } from '../../lib/auth';
import { api } from '../../lib/api-client';
import { useTranslation } from 'react-i18next';
import i18n from '../../lib/i18n'; // 🔥 Importe l'instance i18n directement

// Force le rendu côté client pour éviter le flash de langue
export const dynamic = 'force-dynamic';

// Liste des langues
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
  const { t } = useTranslation(); // 🔥 Retiré i18n d'ici

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- ÉTAT DU RIDEAU THÉÂTRAL ---
  const [showCurtain, setShowCurtain] = useState(false);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  // 🔥 Gestion robuste de la langue
  const [currentLang, setCurrentLang] = useState('fr');

  const isRTL = currentLang === 'ar';

  // --- ÉTAT DU THÈME DYNAMIQUE (Marque Blanche) ---
  const [theme, setTheme] = useState<{
    name: string;
    logoUrl: string | null;
    primary: string;
    secondary: string;
    fontFamily: string;
  }>({
    name: 'LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT',
    logoUrl: '/assets/images/logolcd.jpg',
    primary: '#059669',
    secondary: '#064E3B',
    fontFamily: "'DM Sans', sans-serif",
  });

  // 🔥 Fonction de mise à jour de la langue (useCallback pour stabilité)
  const handleLanguageChanged = useCallback((lng: string) => {
    setCurrentLang(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
  }, []);

  // --- EFFET DE MONTAGE ET SYNCHRONISATION LANGUE ---
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    // Synchronise la langue avec i18n
    if (i18n.isInitialized) {
      const detectedLang =
        i18n.language ||
        localStorage.getItem('i18nextLng') ||
        'fr';
      setCurrentLang(detectedLang);
    }

    // Écoute les changements de langue sur l'instance globale
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleLanguageChanged]); // 🔥 Dépendance stable

  // --- RÉCUPÉRATION DU THÈME ---
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeParam = urlParams.get('code') || undefined;
        const domainParam = urlParams.get('domain') || undefined;

        const currentDomain =
          !codeParam && !domainParam
            ? window.location.hostname
            : undefined;

        if (
          currentDomain === 'localhost' ||
          currentDomain === 'votre-domaine-principal.com'
        ) {
          return;
        }

        const data = await api.getPublicTheme(
          domainParam || currentDomain,
          codeParam
        );

        if (data) {
          setTheme({
            name: data.name,
            logoUrl:
              data.logoUrl || '/assets/images/logolcd.jpg',
            primary:
              data.themeColors?.primary || '#059669',
            secondary:
              data.themeColors?.secondary || '#064E3B',
            fontFamily:
              data.fontFamily || "'DM Sans', sans-serif",
          });
        }
      } catch (err) {
        console.warn('Thème personnalisé non trouvé.', err);
      }
    };

    fetchTheme();
  }, []);

  // --- SYNCHRONISATION HTML GLOBALE ---
  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = currentLang;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [currentLang, isRTL, mounted]);

  // --- GESTION DU CHANGEMENT DE LANGUE ---
  const handleLanguageChange = async (lang: string) => {
    if (!i18n || typeof i18n.changeLanguage !== 'function')
      return;

    try {
      await i18n.changeLanguage(lang);
      // Pas besoin de setCurrentLang ici, l'event listener s'en charge
      localStorage.setItem('i18nextLng', lang);
    } catch (err) {
      console.error('Erreur changement langue:', err);
    }
  };

  // --- SOUMISSION DU FORMULAIRE ---
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      const role = res.user?.role;

      // 1. Déclenchement du Rideau de Théâtre (fermé par défaut)
      setShowCurtain(true);
      setCurtainOpen(false);

      // 2. Détermination de la route
      let target = '/dashboard';
      if (role === 'SYSTEM_ADMIN') target = '/system-admin';
      else if (role === 'SUPER_ADMIN') target = '/super-admin';
      else if (role === 'ANTENNA_ADMIN') target = '/admin';
      else if (role === 'MEMBER') target = '/member';

      // 3. Pause 1.5s (lecture "Bienvenue"), puis ouverture
      timerRef.current = window.setTimeout(() => setCurtainOpen(true), 1500) as unknown as number;
      
      // 4. Redirection une fois le rideau bien ouvert (après 4.5s)
      timerRef.current = window.setTimeout(() => router.replace(target), 4500) as unknown as number;

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('login.error', 'Identifiants incorrects.')
      );
      setLoading(false);
    }
  }

  // --- UTILITAIRE COULEUR ---
  const getLightColor = (hex: string, opacity: number) => {
    hex = hex.replace('#', '');

    const r = parseInt(hex.substring(0, 2), 16) || 5;
    const g = parseInt(hex.substring(2, 4), 16) || 150;
    const b = parseInt(hex.substring(4, 6), 16) || 105;

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  // Préparation des plis du rideau pour le JSX
  const curtainFolds = Array.from({ length: FOLDS_TOTAL }, (_, i) => {
    const goLeft = i < FOLDS_TOTAL / 2;
    const distCenter = Math.abs(i - (FOLDS_TOTAL / 2 - 0.5));
    const openDelay = distCenter * 0.12;
    return { id: i, goLeft, openDelay };
  });

  // Empêche le flash de contenu avant hydratation
  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        :root {
          --primary: ${theme.primary};
          --secondary: ${theme.secondary};
          --font-main: ${theme.fontFamily};

          /* Couleurs exactes */
          --text-deep: #0F5C4D;
          --text-muted: #6B7280;
          --error: #DC2626;
          --gold-accent: #D4AF37;
        }

        .lp-root {
          font-family: var(--font-main);
          min-height: 100svh;
          background: radial-gradient(
            circle at top left,
            ${getLightColor(theme.primary, 0.05)},
            ${getLightColor(theme.secondary, 0.15)}
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
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.5;
        }

        .lp-orb-1 {
          width: 450px;
          height: 450px;
          background: radial-gradient(
            circle,
            ${getLightColor(theme.primary, 0.25)} 0%,
            transparent 70%
          );
          top: -150px;
          right: -100px;
        }

        .lp-orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(
            circle,
            ${getLightColor(theme.secondary, 0.15)} 0%,
            transparent 70%
          );
          bottom: -100px;
          left: -50px;
        }

        .lp-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(24px);
          border-radius: 32px;
          padding: clamp(2rem, 5vw, 3.5rem);
          box-shadow: 0 25px 50px -12px
            ${getLightColor(theme.secondary, 0.15)};
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.8s ease;
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
          background: white;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 12px;
          padding: 0.45rem 1.8rem 0.45rem 0.6rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-deep);
          cursor: pointer;
          direction: ltr;
        }

        .lp-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1.5rem;
        }

        .lp-logo-box {
          width: 88px;
          height: 88px;
          padding: 4px;
          background: linear-gradient(
            135deg,
            var(--primary),
            var(--secondary)
          );
          border-radius: 50%;
        }

        .lp-logo-inner {
          width: 100%;
          height: 100%;
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
          color: var(--primary);
          font-size: 0.9em;
          margin-top: 0.4rem;
          font-weight: 600;
          font-family: var(--font-main);
        }

        .lp-field {
          margin-bottom: 1.25rem;
        }

        .lp-label {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-deep);
          margin-bottom: 0.5rem;
          text-align: ${isRTL ? 'right' : 'left'};
        }

        .lp-input-wrap {
          position: relative;
        }

        .lp-input {
          width: 100%;
          height: 54px;
          background: white;
          border: 1.5px solid rgba(15,92,77,0.12);
          border-radius: 14px;
          padding: 0 1.25rem;
          font-size: 0.95rem;
          color: var(--text-deep);
          outline: none;
          text-align: ${isRTL ? 'right' : 'left'};
          direction: ${isRTL ? 'rtl' : 'ltr'};
        }

        .lp-input::placeholder {
          color: #9CA3AF;
          opacity: 1;
        }

        .lp-toggle-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          ${isRTL ? 'left: 1rem;' : 'right: 1rem;'}
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1.2rem;
        }

        .lp-forgot {
          text-align: ${isRTL ? 'left' : 'right'};
          margin-top: 0.5rem;
        }

        .lp-forgot a {
          font-size: 0.75rem;
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
        }

        .lp-btn {
          width: 100%;
          height: 54px;
          background: var(--secondary);
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
        }

        .lp-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

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
          border-top: 1px dotted rgba(15,92,77,0.15);
          text-align: center;
        }

        .lp-footer p {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 0.8rem;
        }

        .lp-signup-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-deep);
          font-weight: 700;
          text-decoration: none;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ════════════════════════════════════════════════
           RIDEAU DE THÉÂTRE (OUVERTURE)
        ════════════════════════════════════════════════ */
        .tc-container {
          position: fixed; inset: 0; z-index: 9999;
          pointer-events: none; overflow: hidden;
        }

        /* ── Emblème central au dessus du rideau ── */
        .tc-emblem {
          position: fixed; inset: 0; z-index: 10000;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem;
          opacity: 1; transform: scale(1); transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .tc-emblem--fade { opacity: 0; transform: scale(1.15); }
        .tc-logo-wrap {
          width: 140px; height: 140px; background: white; border-radius: 50%; padding: 12px;
          box-shadow: 0 15px 40px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.1);
          border: 4px solid var(--gold-accent); position: relative;
        }
        .tc-text {
          font-family: 'Cormorant Garamond', serif; font-size: 3rem; font-weight: 700;
          color: var(--gold-accent); letter-spacing: 0.18em; text-transform: uppercase;
          text-shadow: 0 4px 15px rgba(0,0,0,0.6);
          animation: tc-pulse 2s ease-in-out infinite alternate;
        }
        @keyframes tc-pulse { from { opacity: 0.85; text-shadow: 0 4px 10px rgba(0,0,0,0.4); } to { opacity: 1; text-shadow: 0 6px 20px rgba(0,0,0,0.7); } }

        /* ── Plis du velours ── */
        .tc-fold {
          position: absolute; top: -10px; bottom: 0;
          transform-origin: top center; box-shadow: 4px 0 20px rgba(0,0,0,0.4);
          will-change: transform, opacity;
        }
        .tc-fabric {
          position: absolute; inset: 0;
          background: linear-gradient(90deg, 
            var(--secondary) 0%, 
            var(--primary) 30%, 
            var(--primary) 65%, 
            var(--secondary) 100%
          );
          box-shadow: inset 5px 0 15px rgba(0,0,0,0.4), inset -5px 0 15px rgba(0,0,0,0.4);
          border-bottom: 15px solid var(--gold-accent);
        }
        .tc-fabric::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
        }

        /* Animations d'ouverture (Effet rideau tiré vers les côtés) */
        .tc-fold--open[data-go="left"] { animation: tc-open-left 2.6s cubic-bezier(0.65, 0, 0.25, 1) both; }
        @keyframes tc-open-left {
          0% { transform: scaleX(1) translateX(0) skewX(0); opacity: 1; }
          15% { transform: scaleX(1.03) translateX(2px) skewX(0); opacity: 1; }
          45% { transform: scaleX(0.4) translateX(-15vw) skewX(8deg); opacity: 0.9; }
          100% { transform: scaleX(0.04) translateX(-120vw) skewX(15deg); opacity: 0; }
        }

        .tc-fold--open[data-go="right"] { animation: tc-open-right 2.6s cubic-bezier(0.65, 0, 0.25, 1) both; }
        @keyframes tc-open-right {
          0% { transform: scaleX(1) translateX(0) skewX(0); opacity: 1; }
          15% { transform: scaleX(1.03) translateX(-2px) skewX(0); opacity: 1; }
          45% { transform: scaleX(0.4) translateX(15vw) skewX(-8deg); opacity: 0.9; }
          100% { transform: scaleX(0.04) translateX(120vw) skewX(-15deg); opacity: 0; }
        }

        @media (max-width: 480px) {
          .lp-root {
            padding: 0;
            background: white;
          }

          .lp-card {
            border-radius: 0;
            min-height: 100svh;
            box-shadow: none;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .lp-orb {
            display: none;
          }
          
          .tc-logo-wrap { width: 110px; height: 110px; }
          .tc-text { font-size: 2.2rem; }
        }
      `}</style>

      {/* RIDEAU D'OUVERTURE */}
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

      <div
        className="lp-root"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />

        <div
          className={`lp-card ${
            mounted ? 'visible' : ''
          }`}
        >
          {/* Sélecteur de langue */}
          <div className="lp-lang-corner">
            <select
              className="lp-lang-select"
              value={currentLang}
              onChange={(e) =>
                handleLanguageChange(e.target.value)
              }
            >
              {LANGUAGES.map((lang) => (
                <option
                  key={lang.code}
                  value={lang.code}
                >
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
                    style={{
                      objectFit: 'contain',
                      padding: '5px',
                    }}
                    unoptimized
                  />
                )}
              </div>
            </div>            
            <h1 className="lp-title">
              {t(
                'login.welcome',
                'Bienvenue dans votre'
              )}
              <span>
                {t(
                  'login.secureSpace',
                  'Espace sécurisé'
                )}
              </span>

              <small
                style={{
                  display: 'block',
                  fontSize: '0.6em',
                  marginTop: '0.5rem',
                  fontWeight: 500,
                  opacity: 0.8,
                  color: 'var(--text-muted)',
                }}
              >
                {theme.name.toUpperCase()}
              </small>
            </h1>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="lp-error">{error}</div>
          )}

          {/* Formulaire */}
          <form onSubmit={onSubmit}>
            <div className="lp-field">
              <label className="lp-label">
                {t(
                  'login.emailLabel',
                  'Adresse email'
                )}
              </label>

              <div className="lp-input-wrap">
                <input
                  className="lp-input"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder={t(
                    'login.emailPlaceholder',
                    'votre@email.com'
                  )}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="lp-field">
              <label className="lp-label">
                {t(
                  'login.passwordLabel',
                  'Mot de passe'
                )}
              </label>

              <div className="lp-input-wrap">
                <input
                  className="lp-input"
                  type={
                    showPassword ? 'text' : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="lp-toggle-btn"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              <div className="lp-forgot">
                <Link href="/forgot-password">
                  {t(
                    'login.forgotPassword',
                    'Mot de passe oublié ?'
                  )}
                </Link>
              </div>
            </div>

            <button
              type="submit"
              className="lp-btn"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" />
              ) : (
                t(
                  'login.submitBtn',
                  'Accéder à mon espace'
                )
              )}
            </button>
          </form>

          {/* Footer */}
          <footer className="lp-footer">
            <p>
              {t(
                'login.notMember',
                'Pas encore membre ?'
              )}
            </p>

            <Link
              href="/signup"
              className="lp-signup-link"
            >
              {t(
                'login.joinCommunity',
                'Rejoindre la communauté'
              )}
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}