// web/app/reset-password/page.tsx
'use client';

import { FormEvent, useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { http } from '../../lib/http';

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Le lien de réinitialisation est invalide ou manquant.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      await http('/auth/reset-password', {
        method: 'POST',
        auth: false,
        body: { token, newPassword: password },
      });
      setSuccess(true);
      // Redirection automatique de votre logique (ajustée à 3s pour laisser lire le message)
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le lien est expiré ou invalide.');
    } finally {
      setLoading(false);
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
  const strengthColor = ['', '#E05050', '#E09030', '#4A9E6A', '#1E7A4E'][pwdStrength];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --blue: #2563EB; --blue-light: #3B82F6; --blue-pale: #DBEAFE; --blue-faint: #EFF6FF; --bg: #EEF2F8; --surface: rgba(253,253,255,0.88); --text: #111827; --mist: #6B7280; --error-c: #B91C1C; }
        .sp-root { font-family: 'DM Sans', sans-serif; min-height: 100svh; background: linear-gradient(150deg, #E8EEF8 0%, #F0F4FC 40%, #E4ECF7 100%); display: flex; align-items: flex-start; justify-content: center; position: relative; overflow: hidden; padding: 2rem 1.25rem; }
        .sp-orb { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none; }
        .sp-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 70%); top: -150px; right: -100px; animation: oa 16s ease-in-out infinite alternate; }
        .sp-orb-2 { width: 360px; height: 360px; background: radial-gradient(circle, rgba(100,180,255,0.10) 0%, transparent 70%); bottom: -80px; left: -80px; animation: ob 20s ease-in-out infinite alternate; }
        @keyframes oa { from { transform: translate(0,0); } to { transform: translate(-40px, 40px); } }
        @keyframes ob { from { transform: translate(0,0); } to { transform: translate(30px, -30px); } }
        .sp-grid { position: fixed; inset: 0; background-image: linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px); background-size: 56px 56px; pointer-events: none; }
        .sp-card { position: relative; z-index: 10; width: 100%; max-width: 480px; background: var(--surface); backdrop-filter: blur(24px); border: 1px solid rgba(37,99,235,0.13); border-radius: 28px; padding: clamp(1.75rem, 5vw, 2.75rem); box-shadow: 0 0 0 1px rgba(255,255,255,0.85) inset, 0 24px 64px rgba(37,99,235,0.10), 0 4px 16px rgba(37,99,235,0.06); opacity: 0; transform: translateY(28px); transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1); margin-top: 2rem; }
        .sp-card.visible { opacity: 1; transform: translateY(0); }
        .sp-header { text-align: center; margin-bottom: 2rem; }
        .sp-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 500; color: var(--text); letter-spacing: -0.02em; line-height: 1.15; }
        .sp-subtitle { font-size: 0.85rem; color: var(--mist); margin-top: 0.6rem; line-height: 1.6; }
        .sp-field { display: flex; flex-direction: column; gap: 0.38rem; margin-bottom: 1.2rem; }
        .sp-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--blue); }
        .sp-input-wrap { position: relative; }
        .sp-input { width: 100%; height: 48px; background: rgba(255,255,255,0.75); border: 1px solid rgba(37,99,235,0.15); border-radius: 13px; padding: 0 1rem; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 0.88rem; outline: none; transition: all 0.22s; padding-right: 2.8rem;}
        .sp-input:focus { border-color: rgba(37,99,235,0.55); background: rgba(255,255,255,0.98); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); }
        .sp-eye-btn { position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--mist); cursor: pointer; padding: 4px; display: flex; align-items: center; transition: color 0.2s; }
        .sp-eye-btn:hover { color: var(--blue); }
        .sp-pwd-strength { display: flex; gap: 3px; margin-top: 0.4rem; align-items: center; }
        .sp-pwd-bar { flex: 1; height: 3px; border-radius: 99px; background: rgba(37,99,235,0.1); transition: background 0.3s; overflow: hidden; }
        .sp-pwd-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s, background 0.4s; }
        .sp-pwd-label { font-size: 0.68rem; font-weight: 600; margin-left: 0.4rem; transition: color 0.3s; min-width: 32px; }
        .sp-btn-submit { width: 100%; height: 50px; background: linear-gradient(135deg, #1D4ED8 0%, var(--blue) 50%, var(--blue-light) 100%); background-size: 200% 100%; border: none; border-radius: 13px; color: white; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 700; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.45rem; transition: all 0.4s; box-shadow: 0 4px 18px rgba(37,99,235,0.28); margin-top: 1.5rem; }
        .sp-btn-submit:hover:not(:disabled) { background-position: 100% 0%; box-shadow: 0 8px 26px rgba(37,99,235,0.4); transform: translateY(-1px); }
        .sp-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .sp-error { display: flex; align-items: center; gap: 0.55rem; padding: 0.8rem 1rem; background: rgba(185,28,28,0.06); border: 1px solid rgba(185,28,28,0.18); border-radius: 12px; color: var(--error-c); font-size: 0.8rem; margin-bottom: 1.5rem; }
        .sp-success-box { padding: 1.5rem; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 16px; text-align: center; color: #065F46; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
      `}</style>

      <div className="sp-root">
        <div className="sp-grid" />
        <div className="sp-orb sp-orb-1" />
        <div className="sp-orb sp-orb-2" />

        <div className={`sp-card ${mounted ? 'visible' : ''}`}>
          <div className="sp-header">
            <h1 className="sp-title">Nouveau mot de passe</h1>
            <p className="sp-subtitle">Définissez un mot de passe fort pour sécuriser votre compte.</p>
          </div>

          {success ? (
            <div className="sp-success-box">
              <strong>Mot de passe modifié !</strong><br /><br />
              Vous allez être redirigé vers la page de connexion dans quelques instants...
              <br /><br />
              <Link href="/login" style={{ color: '#047857', fontWeight: 700, textDecoration: 'underline' }}>
                Aller à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="sp-field">
                <label className="sp-label">Nouveau mot de passe</label>
                <div className="sp-input-wrap">
                  <input
                    className="sp-input"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    required
                  />
                  <button type="button" className="sp-eye-btn" onClick={() => setShowPwd(v => !v)}>
                    <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </button>
                </div>
                {password && (
                  <div className="sp-pwd-strength">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="sp-pwd-bar">
                        <div className="sp-pwd-bar-fill" style={{ width: pwdStrength >= i ? '100%' : '0%', background: strengthColor }}/>
                      </div>
                    ))}
                    <span className="sp-pwd-label" style={{color: strengthColor}}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              <div className="sp-field">
                <label className="sp-label">Confirmer le mot de passe</label>
                <div className="sp-input-wrap">
                  <input
                    className="sp-input"
                    type={showPwd ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    required
                  />
                </div>
                {confirm && (
                  <p style={{fontSize:'0.7rem', marginTop:'0.3rem', color: password === confirm ? '#15803D' : '#B91C1C', fontWeight:600}}>
                    {password === confirm ? '✓ Correspond' : '✗ Ne correspond pas'}
                  </p>
                )}
              </div>

              {error && (
                <div className="sp-error">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                  {error}
                </div>
              )}

              <button type="submit" className="sp-btn-submit" disabled={loading}>
                {loading ? 'Validation...' : 'Réinitialiser mon mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="sp-root" style={{alignItems: 'center'}}>
        <p style={{color: 'var(--blue)', fontWeight: 600}}>Chargement sécurisé...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}