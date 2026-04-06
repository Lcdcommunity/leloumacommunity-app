// web/app/login/page.tsx
'use client';

import { FormEvent, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { login } from '../../lib/auth';
import { api } from '../../lib/api-client';
import { useTranslation } from 'react-i18next';

// Liste des langues
const LANGUAGES = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
  { code: 'ff', flag: '🇬🇳', label: 'Pulaar' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
];

export default function LoginPage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const currentLang = useMemo(
    () => i18n.resolvedLanguage || i18n.language || 'fr',
    [i18n.language, i18n.resolvedLanguage]
  );

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
   // ✅ APRÈS — guillemet fermant manquant ajouté
   fontFamily: "'DM Sans', sans-serif",
  });

  useEffect(() => {
    setMounted(true);

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
        console.warn(
          'Thème personnalisé non trouvé.',
          err
        );
      }
    };

    fetchTheme();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      const role = res.user?.role;

      if (role === 'SYSTEM_ADMIN') {
        router.replace('/system-admin');
      } else if (role === 'SUPER_ADMIN') {
        router.replace('/super-admin');
      } else if (role === 'ANTENNA_ADMIN') {
        router.replace('/admin');
      } else if (role === 'MEMBER') {
        router.replace('/member');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'login.error',
              'Identifiants incorrects.'
            )
      );
    } finally {
      setLoading(false);
    }
  }

  const getLightColor = (
    hex: string,
    opacity: number
  ) => {
    hex = hex.replace('#', '');

    const r =
      parseInt(hex.substring(0, 2), 16) || 5;
    const g =
      parseInt(hex.substring(2, 4), 16) || 150;
    const b =
      parseInt(hex.substring(4, 6), 16) || 105;

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

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

          /* Couleurs exactes capture 2 */
          --text-deep: #0F5C4D;
          --text-muted: #6B7280;
          --error: #DC2626;
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
        }
      `}</style>

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
          <div className="lp-lang-corner">
            <select
              className="lp-lang-select"
              value={currentLang}
              onChange={(e) => {
                const lang = e.target.value;
                i18n.changeLanguage(lang);
                document.documentElement.lang = lang;
              }}
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

          {error && (
            <div className="lp-error">
              {error}
            </div>
          )}

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
                    showPassword
                      ? 'text'
                      : 'password'
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
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword ? '🙈' : '👁'}
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