// web/app/login/page.tsx
'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { login } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      const role = res.user?.role;
      if (role === 'SUPER_ADMIN') router.replace('/super-admin');
      else if (role === 'ANTENNA_ADMIN') router.replace('/admin');
      else if (role === 'MEMBER') router.replace('/member');
      else router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects ou erreur de connexion.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --gold: #A8782A;
          --gold-light: #C9952E;
          --gold-pale: #F5E6C0;
          --bg: #F2EDE6;
          --bg-2: #EDE6DC;
          --surface: #FDFAF6;
          --border: rgba(168,120,42,0.18);
          --text: #1A1510;
          --text-2: #3D3020;
          --mist: #8A7A60;
          --error: #C0392B;
        }

        .lp-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100svh;
          background: linear-gradient(145deg, #EDE6DC 0%, #F5EFE6 50%, #E8E0D4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
        }

        /* ── Orbs ── */
        .lp-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          will-change: transform;
        }
        .lp-orb-1 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(201,168,76,0.22) 0%, transparent 70%);
          top: -120px; left: -120px;
          animation: drift1 14s ease-in-out infinite alternate;
        }
        .lp-orb-2 {
          width: 340px; height: 340px;
          background: radial-gradient(circle, rgba(100,140,200,0.12) 0%, transparent 70%);
          bottom: -80px; right: -80px;
          animation: drift2 18s ease-in-out infinite alternate;
        }
        .lp-orb-3 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 70%);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 8s ease-in-out infinite;
        }

        @keyframes drift1 {
          from { transform: translate(0, 0); }
          to   { transform: translate(40px, 40px); }
        }
        @keyframes drift2 {
          from { transform: translate(0, 0); }
          to   { transform: translate(-30px, -30px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
        }

        /* ── Grid lines ── */
        .lp-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(168,120,42,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,120,42,0.07) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* ── Card ── */
        .lp-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 440px;
          background: rgba(253,250,246,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(168,120,42,0.15);
          border-radius: 28px;
          padding: clamp(2rem, 6vw, 3rem);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.8) inset,
            0 32px 80px rgba(100,80,40,0.12),
            0 4px 16px rgba(168,120,42,0.08);
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(.22,1,.36,1), transform 0.7s cubic-bezier(.22,1,.36,1);
        }
        .lp-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Logo ── */
        .lp-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2.25rem;
          gap: 1.25rem;
        }

        .lp-logo-ring {
          position: relative;
          width: 80px; height: 80px;
        }
        .lp-logo-ring::before {
          content: '';
          position: absolute; inset: -3px;
          border-radius: 50%;
          background: conic-gradient(var(--gold), var(--gold-light), transparent 60%, var(--gold));
          animation: spin 8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .lp-logo-inner {
          position: relative; z-index: 1;
          width: 80px; height: 80px;
          background: var(--surface);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          border: 2px solid rgba(168,120,42,0.2);
        }

        .lp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.8rem, 5vw, 2.25rem);
          font-weight: 500;
          color: var(--text);
          letter-spacing: -0.02em;
          text-align: center;
          line-height: 1.1;
        }
        .lp-title span {
          background: linear-gradient(135deg, var(--gold), var(--gold-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-subtitle {
          font-size: 0.82rem;
          color: var(--mist);
          text-align: center;
          letter-spacing: 0.03em;
          margin-top: 0.4rem;
          font-weight: 400;
        }

        /* ── Divider ── */
        .lp-divider {
          width: 40px; height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold), transparent);
          margin: 0 auto 1.75rem;
        }

        /* ── Fields ── */
        .lp-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          margin-bottom: 1.1rem;
        }

        .lp-label {
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--gold);
        }

        .lp-input-wrap {
          position: relative;
        }

        .lp-input {
          width: 100%;
          height: 52px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(168,120,42,0.18);
          border-radius: 14px;
          padding: 0 1.1rem;
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
          -webkit-appearance: none;
        }
        .lp-input::placeholder { color: rgba(138,122,96,0.45); }
        .lp-input:focus {
          border-color: rgba(168,120,42,0.55);
          background: rgba(255,255,255,0.95);
          box-shadow: 0 0 0 3px rgba(168,120,42,0.10), inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .lp-input.has-toggle { padding-right: 3rem; }

        .lp-toggle-btn {
          position: absolute;
          right: 0.9rem; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: var(--mist);
          cursor: pointer;
          padding: 4px;
          display: flex; align-items: center;
          transition: color 0.2s;
        }
        .lp-toggle-btn:hover { color: var(--gold); }

        /* ── Forgot ── */
        .lp-forgot {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .lp-forgot a {
          font-size: 0.76rem;
          color: var(--mist);
          text-decoration: none;
          letter-spacing: 0.02em;
          transition: color 0.2s;
        }
        .lp-forgot a:hover { color: var(--gold); }

        /* ── Error ── */
        .lp-error {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.85rem 1rem;
          background: rgba(192,57,43,0.06);
          border: 1px solid rgba(192,57,43,0.2);
          border-radius: 12px;
          color: #A02020;
          font-size: 0.82rem;
          margin-bottom: 1.1rem;
          line-height: 1.45;
        }

        /* ── Submit ── */
        .lp-btn {
          width: 100%;
          height: 52px;
          background: linear-gradient(135deg, #8A6018 0%, var(--gold) 50%, var(--gold-light) 100%);
          background-size: 200% 100%;
          background-position: 0% 0%;
          border: none;
          border-radius: 14px;
          color: #FDFAF6;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.92rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background-position 0.4s ease, transform 0.15s, box-shadow 0.3s;
          box-shadow: 0 4px 20px rgba(168,120,42,0.3);
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          margin-top: 1.5rem;
        }
        .lp-btn:hover:not(:disabled) {
          background-position: 100% 0%;
          box-shadow: 0 8px 28px rgba(168,120,42,0.45);
          transform: translateY(-1px);
        }
        .lp-btn:active:not(:disabled) { transform: translateY(0); }
        .lp-btn:disabled {
          opacity: 0.65; cursor: not-allowed;
        }

        .lp-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(253,250,246,0.3);
          border-top-color: #FDFAF6;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Footer ── */
        .lp-footer {
          margin-top: 1.75rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(168,120,42,0.12);
          text-align: center;
        }
        .lp-footer p {
          font-size: 0.8rem;
          color: var(--mist);
          margin-bottom: 1rem;
        }
        .lp-enroll-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          height: 50px;
          background: transparent;
          border: 1px solid rgba(168,120,42,0.3);
          border-radius: 14px;
          color: var(--gold);
          font-family: 'DM Sans', sans-serif;
          font-size: 0.86rem;
          font-weight: 600;
          text-decoration: none;
          letter-spacing: 0.04em;
          transition: background 0.25s, border-color 0.25s, transform 0.15s;
        }
        .lp-enroll-btn:hover {
          background: rgba(168,120,42,0.07);
          border-color: rgba(168,120,42,0.5);
          transform: translateY(-1px);
        }
        .lp-enroll-btn svg {
          transition: transform 0.25s;
        }
        .lp-enroll-btn:hover svg {
          transform: translateX(4px);
        }

        /* ── Mobile tweaks ── */
        @media (max-width: 480px) {
          .lp-root { padding: 1rem; }
          .lp-card { border-radius: 22px; }
        }
      `}</style>

      <div className="lp-root">
        <div className="lp-grid" />
        <div className="lp-orb lp-orb-1" />
        <div className="lp-orb lp-orb-2" />
        <div className="lp-orb lp-orb-3" />

        <div className={`lp-card ${mounted ? 'visible' : ''}`}>

          {/* Logo + Titre */}
          <div className="lp-logo-wrap">
            <div className="lp-logo-ring">
              <div className="lp-logo-inner">
                <Image
                  src="/assets/images/logolcd.jpg"
                  alt="Logo Lélouma Communauté"
                  width={64}
                  height={64}
                  style={{ objectFit: 'contain', borderRadius: '50%' }}
                  priority
                />
              </div>
            </div>
            <div>
              <h1 className="lp-title">
                Bon <span>retour</span>
              </h1>
              <p className="lp-subtitle">Espace membres · Lélouma Communauté</p>
            </div>
          </div>

          <div className="lp-divider" />

          {/* Formulaire */}
          <form onSubmit={onSubmit}>

            {/* Email */}
            <div className="lp-field">
              <label className="lp-label">Adresse email</label>
              <div className="lp-input-wrap">
                <input
                  className="lp-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="lp-field">
              <label className="lp-label">Mot de passe</label>
              <div className="lp-input-wrap">
                <input
                  className="lp-input has-toggle"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="lp-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  )}
                </button>
              </div>
              <div className="lp-forgot">
                <Link href="/forgot-password">Mot de passe oublié ?</Link>
              </div>
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

            {/* Bouton */}
            <button type="submit" className="lp-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="lp-spinner" />
                  Connexion…
                </>
              ) : 'Se connecter'}
            </button>
          </form>

          {/* Footer inscription */}
          <div className="lp-footer">
            <p>Pas encore de compte ?</p>
            <Link href="/signup" className="lp-enroll-btn">
              S&apos;enrôler · Devenir membre
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}