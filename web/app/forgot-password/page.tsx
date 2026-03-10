'use client';

import { FormEvent, useState, useEffect } from 'react';
import Link from 'next/link';
import { http } from '../../lib/http';

export default function ForgotPasswordPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pour éviter les erreurs d'hydratation avec les animations
  useEffect(() => { setMounted(true); }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await http<{ message: string }, { email: string }>('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: { email },
      });
      setMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue lors de la demande.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
        
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        :root { 
          --blue: #2563EB; 
          --blue-light: #3B82F6; 
          --blue-pale: #DBEAFE; 
          --blue-faint: #EFF6FF; 
          --surface: rgba(253,253,255,0.88); 
          --text: #111827; 
          --mist: #6B7280; 
          --error-c: #B91C1C; 
        }

        .sp-root { 
          font-family: 'DM Sans', sans-serif; 
          min-height: 100svh; 
          background: linear-gradient(150deg, #E8EEF8 0%, #F0F4FC 40%, #E4ECF7 100%); 
          display: flex; 
          align-items: flex-start; 
          justify-content: center; 
          position: relative; 
          overflow: hidden; 
          padding: 2rem 1.25rem; 
        }

        .sp-orb { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none; }
        .sp-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 70%); top: -150px; right: -100px; animation: oa 16s ease-in-out infinite alternate; }
        .sp-orb-2 { width: 360px; height: 360px; background: radial-gradient(circle, rgba(100,180,255,0.10) 0%, transparent 70%); bottom: -80px; left: -80px; animation: ob 20s ease-in-out infinite alternate; }
        @keyframes oa { from { transform: translate(0,0); } to { transform: translate(-40px, 40px); } }
        @keyframes ob { from { transform: translate(0,0); } to { transform: translate(30px, -30px); } }
        
        .sp-grid { position: fixed; inset: 0; background-image: linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px); background-size: 56px 56px; pointer-events: none; }
        
        .sp-card { 
          position: relative; z-index: 10; width: 100%; max-width: 480px; 
          background: var(--surface); backdrop-filter: blur(24px); 
          border: 1px solid rgba(37,99,235,0.13); border-radius: 28px; 
          padding: clamp(1.75rem, 5vw, 2.75rem); 
          box-shadow: 0 0 0 1px rgba(255,255,255,0.85) inset, 0 24px 64px rgba(37,99,235,0.10), 0 4px 16px rgba(37,99,235,0.06); 
          opacity: 0; transform: translateY(28px); 
          transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1); 
          margin-top: 4vh; 
        }
        .sp-card.visible { opacity: 1; transform: translateY(0); }
        
        .sp-header { text-align: center; margin-bottom: 2rem; }
        .sp-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 500; color: var(--text); letter-spacing: -0.02em; line-height: 1.15; }
        .sp-subtitle { font-size: 0.85rem; color: var(--mist); margin-top: 0.6rem; line-height: 1.6; }
        
        .sp-field { display: flex; flex-direction: column; gap: 0.38rem; margin-bottom: 1.5rem; }
        .sp-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--blue); }
        
        .sp-input { 
          width: 100%; height: 48px; background: rgba(255,255,255,0.75); 
          border: 1px solid rgba(37,99,235,0.15); border-radius: 13px; 
          padding: 0 1rem; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 0.88rem; 
          outline: none; transition: all 0.22s; 
        }
        .sp-input:focus { border-color: rgba(37,99,235,0.55); background: rgba(255,255,255,0.98); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); }
        
        .sp-btn-submit { 
          width: 100%; height: 50px; 
          background: linear-gradient(135deg, #1D4ED8 0%, var(--blue) 50%, var(--blue-light) 100%); 
          background-size: 200% 100%; border: none; border-radius: 13px; color: white; 
          font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 700; text-transform: uppercase; 
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.45rem; 
          transition: all 0.4s; box-shadow: 0 4px 18px rgba(37,99,235,0.28); 
        }
        .sp-btn-submit:hover:not(:disabled) { background-position: 100% 0%; box-shadow: 0 8px 26px rgba(37,99,235,0.4); transform: translateY(-1px); }
        .sp-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .sp-error { display: flex; align-items: center; gap: 0.55rem; padding: 0.8rem 1rem; background: rgba(185,28,28,0.06); border: 1px solid rgba(185,28,28,0.18); border-radius: 12px; color: var(--error-c); font-size: 0.8rem; margin-bottom: 1.5rem; }
        .sp-success-box { padding: 1.5rem; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 16px; text-align: center; color: #065F46; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.5rem; }
        
        .sp-footer { margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid rgba(37,99,235,0.09); text-align: center; font-size: 0.8rem; color: var(--mist); }
        .sp-footer a { color: var(--blue); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 0.3rem; transition: color 0.2s; }
        .sp-footer a:hover { color: var(--blue-light); }
      `}</style>

      <div className="sp-root">
        <div className="sp-grid" />
        <div className="sp-orb sp-orb-1" />
        <div className="sp-orb sp-orb-2" />

        <div className={`sp-card ${mounted ? 'visible' : ''}`}>
          <div className="sp-header">
            <h1 className="sp-title">Mot de passe oublié</h1>
            <p className="sp-subtitle">Entrez votre adresse email pour recevoir un lien de réinitialisation sécurisé.</p>
          </div>

          {message ? (
            <div className="sp-success-box">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 0.5rem' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <br />
              <strong>Lien envoyé !</strong><br /><br />
              {message}
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="sp-field">
                <label className="sp-label">Adresse Email</label>
                <input
                  className="sp-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                />
              </div>

              {error && (
                <div className="sp-error">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                  {error}
                </div>
              )}

              <button type="submit" className="sp-btn-submit" disabled={loading}>
                {loading ? (
                  <>Patientez...</>
                ) : (
                  <>
                    Envoyer le lien
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="sp-footer">
            <Link href="/login">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}