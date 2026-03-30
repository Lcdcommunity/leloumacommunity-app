// web/app/login/page.tsx
'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { login } from '../../lib/auth';
import { api } from '../../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- ÉTAT DU THÈME DYNAMIQUE (Marque Blanche) ---
  const [theme, setTheme] = useState<{
    name: string;
    logoUrl: string | null;
    primary: string;
    secondary: string;
    fontFamily: string;
  }>({
    name: "LELOUMA COMMUNAUTE POUR LE DEVELOPPEMENT",
    logoUrl: "/assets/images/logolcd.jpg",
    primary: "#059669", // Emerald par défaut
    secondary: "#064E3B", // Forest par défaut
    fontFamily: "'DM Sans', sans-serif"
  });

  useEffect(() => {
    setMounted(true);

    // --- LOGIQUE DE DÉTECTION DU SOUS-DOMAINE ---
    const fetchTheme = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        // On vérifie d'abord les paramètres d'URL (utile en local : localhost:3000/login?code=ASCOK)
        const codeParam = urlParams.get('code') || undefined;
        const domainParam = urlParams.get('domain') || undefined;
        
        // Si pas de paramètre, on prend le nom de domaine réel (ex: ajvk.lcd.com)
        const currentDomain = (!codeParam && !domainParam) ? window.location.hostname : undefined;

        // Si on est sur le domaine principal (ex: lcd.com) ou localhost pur, on ne fait rien (on garde Lélouma)
        if (currentDomain === 'localhost' || currentDomain === 'votre-domaine-principal.com') {
          return;
        }

        const data = await api.getPublicTheme(domainParam || currentDomain, codeParam);
        
        if (data) {
          setTheme({
            name: data.name,
            logoUrl: data.logoUrl || "/assets/images/logolcd.jpg",
            primary: data.themeColors?.primary || "#059669",
            secondary: data.themeColors?.secondary || "#064E3B",
            fontFamily: data.fontFamily || "'DM Sans', sans-serif"
          });
        }
      } catch (err) {
        // 🔥 CORRECTION ESLINT ICI : Utilisation de la variable 'err' dans le log
        console.warn("Thème personnalisé non trouvé, utilisation du thème par défaut.", err);
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
      
      // Routage selon le rôle
      if (role === 'SYSTEM_ADMIN') router.replace('/system-admin');
      else if (role === 'SUPER_ADMIN') router.replace('/super-admin');
      else if (role === 'ANTENNA_ADMIN') router.replace('/admin');
      else if (role === 'MEMBER') router.replace('/member');
      else router.replace('/dashboard');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects ou erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }

  // Fonction pour éclaircir une couleur HEX (pour les halos/hover dynamiques)
  const getLightColor = (hex: string, opacity: number) => {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 5;
    const g = parseInt(hex.substring(2, 4), 16) || 150;
    const b = parseInt(hex.substring(4, 6), 16) || 105;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&family=Inter:wght@400;500;700&family=Montserrat:wght@400;500;700&family=Playfair+Display:wght@700&family=Roboto:wght@400;500;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* INJECTION DYNAMIQUE DES VARIABLES CSS BASÉES SUR L'API */
        :root {
          --primary: ${theme.primary};
          --secondary: ${theme.secondary};
          --surface: #FFFFFF;
          --text-deep: ${theme.secondary};
          --text-muted: #6B7280;
          --error: #DC2626;
          --font-main: ${theme.fontFamily};
        }

        .lp-root {
          font-family: var(--font-main);
          min-height: 100svh;
          /* Dégradé de fond généré à partir de la couleur primaire */
          background: radial-gradient(circle at top left, ${getLightColor(theme.primary, 0.05)}, ${getLightColor(theme.secondary, 0.15)});
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
        }

        /* ── Animated Orbs ── */
        .lp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.5;
        }
        .lp-orb-1 {
          width: 450px; height: 450px;
          background: radial-gradient(circle, ${getLightColor(theme.primary, 0.25)} 0%, transparent 70%);
          top: -150px; right: -100px;
          animation: drift 15s ease-in-out infinite alternate;
        }
        .lp-orb-2 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, ${getLightColor(theme.secondary, 0.15)} 0%, transparent 70%);
          bottom: -100px; left: -50px;
          animation: drift 20s ease-in-out infinite alternate-reverse;
        }

        @keyframes drift {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(30px, 50px) scale(1.1); }
        }

        /* ── Login Card ── */
        .lp-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 480px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid ${getLightColor(theme.primary, 0.1)};
          border-radius: 32px;
          padding: clamp(2rem, 5vw, 3.5rem);
          box-shadow: 
            0 25px 50px -12px ${getLightColor(theme.secondary, 0.15)},
            0 0 0 1px rgba(255, 255, 255, 0.7) inset;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .lp-card.visible { opacity: 1; transform: translateY(0); }

        /* ── Logo Container ── */
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
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: 50%;
          box-shadow: 0 10px 20px ${getLightColor(theme.secondary, 0.2)};
        }
        .lp-logo-inner {
          width: 100%; height: 100%;
          background: white;
          border-radius: 50%;
          overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }

        .lp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.4rem, 4vw, 1.8rem);
          font-weight: 700;
          color: var(--text-deep);
          text-align: center;
          line-height: 1.2;
        }
        .lp-title span {
          display: block;
          color: var(--primary);
          font-size: 0.85em;
          margin-top: 0.4rem;
          font-weight: 500;
          font-family: var(--font-main);
        }

        /* ── Form Fields ── */
        .lp-field { margin-bottom: 1.25rem; }
        .lp-label {
          display: block; font-size: 0.72rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--secondary); margin-bottom: 0.5rem; margin-left: 0.2rem;
        }
        .lp-input-wrap { position: relative; }
        .lp-input {
          width: 100%; height: 54px;
          background: rgba(255, 255, 255, 0.9);
          border: 1.5px solid ${getLightColor(theme.primary, 0.1)};
          border-radius: 14px; padding: 0 1.25rem;
          font-family: var(--font-main);
          font-size: 0.95rem; color: var(--text-deep);
          transition: all 0.25s ease; outline: none;
        }
        .lp-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px ${getLightColor(theme.primary, 0.15)};
          background: white;
        }

        .lp-toggle-btn {
          position: absolute; right: 1rem; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; display: flex; padding: 4px;
        }

        .lp-forgot { text-align: right; margin-top: 0.5rem; }
        .lp-forgot a { font-size: 0.75rem; color: var(--primary); text-decoration: none; font-weight: 600; }

        /* ── Submit Button ── */
        .lp-btn {
          width: 100%; height: 54px;
          background: var(--secondary);
          color: white; border: none; border-radius: 14px;
          font-family: var(--font-main);
          font-size: 1rem; font-weight: 700; letter-spacing: 0.03em;
          cursor: pointer; margin-top: 1.5rem;
          transition: all 0.3s ease;
          display: flex; align-items: center; justify-content: center; gap: 0.75rem;
          box-shadow: 0 10px 25px ${getLightColor(theme.secondary, 0.25)};
        }
        .lp-btn:hover:not(:disabled) {
          background: var(--primary);
          transform: translateY(-2px);
          box-shadow: 0 15px 30px ${getLightColor(theme.secondary, 0.35)};
        }
        .lp-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .lp-error {
          background: #FEF2F2; border: 1px solid #FECACA;
          padding: 0.8rem 1rem; color: var(--error);
          font-size: 0.82rem; border-radius: 12px;
          margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.6rem;
        }

        .lp-footer {
          margin-top: 2rem; padding-top: 1.5rem;
          border-top: 1px dotted ${getLightColor(theme.primary, 0.2)};
          text-align: center;
        }
        .lp-footer p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem; }
        
        .lp-signup-link {
          display: inline-flex; align-items: center; gap: 0.5rem;
          color: var(--secondary); font-weight: 700;
          text-decoration: none; font-size: 0.9rem;
          transition: transform 0.2s ease;
        }
        .lp-signup-link:hover { transform: translateX(3px); color: var(--primary); }

        .spinner {
          width: 20px; height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .lp-root { padding: 0; background: white; }
          .lp-card { border-radius: 0; min-height: 100svh; border: none; box-shadow: none; display: flex; flex-direction: column; justify-content: center; }
          .lp-orb { display: none; }
        }
      `}</style>

      <div className="lp-root">
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />

        <div className={`lp-card ${mounted ? 'visible' : ''}`}>
          {/* Logo Section */}
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
              Bienvenue dans votre <span>Espace sécurisé</span>
              <small style={{ display: 'block', fontSize: '0.6em', marginTop: '0.5rem', fontWeight: 500, opacity: 0.8, color: 'var(--text-muted)' }}>
                {theme.name.toUpperCase()}
              </small>
            </h1>
          </div>

          {error && (
            <div className="lp-error">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="lp-field">
              <label className="lp-label">Adresse email</label>
              <div className="lp-input-wrap">
                <input
                  className="lp-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="lp-field">
              <label className="lp-label">Mot de passe</label>
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
                <button
                  type="button"
                  className="lp-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
              <div className="lp-forgot">
                <Link href="/forgot-password">Mot de passe oublié ?</Link>
              </div>
            </div>

            <button type="submit" className="lp-btn" disabled={loading}>
              {loading ? <div className="spinner" /> : 'Accéder à mon espace'}
            </button>
          </form>

          <footer className="lp-footer">
            <p>Pas encore membre ?</p>
            <Link href="/signup" className="lp-signup-link">
              Rejoindre la communauté
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </footer>
        </div>
      </div>
    </>
  );
}