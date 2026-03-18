'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api-client';

function Spinner() {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        border: '3px solid rgba(37,99,235,0.12)',
        borderTopColor: '#2563EB',
        animation: 'vespin 0.8s linear infinite',
        margin: '0 auto',
      }}
    />
  );
}

function SuccessIcon() {
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #059669, #10B981)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        boxShadow: '0 8px 24px rgba(5,150,105,0.35)',
        animation: 'vepop 0.45s cubic-bezier(.22,1,.36,1)',
      }}
    >
      <svg
        width="32"
        height="32"
        fill="none"
        viewBox="0 0 24 24"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

function ErrorIcon() {
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #DC2626, #EF4444)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        boxShadow: '0 8px 24px rgba(220,38,38,0.35)',
        animation: 'vepop 0.45s cubic-bezier(.22,1,.36,1)',
      }}
    >
      <svg
        width="32"
        height="32"
        fill="none"
        viewBox="0 0 24 24"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = useMemo(() => params.get('token')?.trim() ?? '', [params]);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');

  const verify = useCallback(async () => {
    if (!token) {
      setSuccess(false);
      setMessage(
        'Le lien de vérification est incomplet. Veuillez utiliser le lien reçu par e-mail.',
      );
      setLoading(false);
      return;
    }

    try {
      const res = await api.verifyEmailToken({ token });

      if (res.emailVerified) {
        setSuccess(true);
        setMessage(
          'Votre adresse e-mail a été vérifiée avec succès. Votre compte est maintenant en attente de validation par l’administrateur de votre antenne.',
        );
      } else {
        setSuccess(false);
        setMessage(
          'La vérification n’a pas pu être finalisée. Le lien est peut-être expiré.',
        );
      }
    } catch (error: unknown) {
      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Erreur lors de la vérification de l’e-mail.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void verify();
  }, [verify]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        {loading && <Spinner />}
        {!loading && success === true && <SuccessIcon />}
        {!loading && success === false && <ErrorIcon />}
      </div>

      <h1
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(1.5rem, 4vw, 2rem)',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: '#111827',
          marginBottom: '0.75rem',
          lineHeight: 1.2,
        }}
      >
        {loading
          ? 'Vérification en cours…'
          : success
            ? 'E-mail vérifié ✓'
            : 'Lien invalide'}
      </h1>

      {message ? (
        <p
          style={{
            fontSize: '0.88rem',
            color: '#4B5563',
            lineHeight: 1.7,
            maxWidth: 340,
            margin: '0 auto 1.75rem',
            fontWeight: 500,
          }}
        >
          {message}
        </p>
      ) : null}

      {loading ? (
        <p
          style={{
            fontSize: '0.82rem',
            color: '#9CA3AF',
            marginTop: '1rem',
            fontWeight: 500,
          }}
        >
          Veuillez patienter quelques secondes…
        </p>
      ) : null}

      {!loading && success === true ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.75rem',
            flexWrap: 'wrap',
          }}
        >
          {[
            { step: 1, label: 'E-mail vérifié', done: true },
            { step: 2, label: 'Validation admin', done: false },
          ].map((stepItem, index) => (
            <div
              key={stepItem.step}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: stepItem.done ? '#ECFDF5' : '#F3F4F6',
                  border: `1px solid ${stepItem.done ? '#A7F3D0' : '#E5E7EB'}`,
                  borderRadius: 99,
                  padding: '0.28rem 0.7rem',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: stepItem.done ? '#059669' : '#D1D5DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stepItem.done ? (
                    <svg
                      width="10"
                      height="10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="white"
                      strokeWidth="3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <span
                      style={{
                        color: '#6B7280',
                        fontSize: '0.55rem',
                        fontWeight: 800,
                      }}
                    >
                      {stepItem.step}
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: stepItem.done ? '#065F46' : '#6B7280',
                  }}
                >
                  {stepItem.label}
                </span>
              </div>

              {index === 0 ? (
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="#D1D5DB"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {!loading ? (
        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <button
              type="button"
              style={{
                height: 46,
                padding: '0 1.5rem',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #1D4ED8, #2563EB, #3B82F6)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                boxShadow: '0 4px 16px rgba(37,99,235,0.32)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
              }}
            >
              <svg
                width="15"
                height="15"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              Se connecter
            </button>
          </Link>

          {success === false ? (
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <button
                type="button"
                style={{
                  height: 46,
                  padding: '0 1.5rem',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.85)',
                  border: '1.5px solid rgba(37,99,235,0.2)',
                  color: '#374151',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 17l-5-5m0 0l5-5m-5 5h12"
                  />
                </svg>
                Retour inscription
              </button>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        .ve-page {
          min-height: 100vh;
          background: linear-gradient(150deg, #EEF2F8 0%, #F0F4FC 50%, #E4ECF7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .ve-orb {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.12), transparent 70%);
          pointer-events: none;
        }

        .ve-card {
          background: rgba(253,253,255,0.92);
          backdrop-filter: blur(18px);
          border-radius: 24px;
          border: 1px solid rgba(37,99,235,0.1);
          box-shadow:
            0 4px 24px rgba(37,99,235,0.08),
            0 0 0 1px rgba(255,255,255,0.9) inset;
          padding: clamp(2rem, 5vw, 3rem) clamp(1.5rem, 4vw, 2.5rem);
          width: 100%;
          max-width: 440px;
          animation: vein 0.5s cubic-bezier(.22,1,.36,1);
          position: relative;
          z-index: 1;
        }

        .ve-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          margin-bottom: 2rem;
        }

        .ve-logo-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }

        .ve-logo-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #111827;
          letter-spacing: -0.01em;
        }

        @keyframes vein {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes vespin {
          to { transform: rotate(360deg); }
        }

        @keyframes vepop {
          from { opacity: 0; transform: scale(0.4); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="ve-page">
        <div
          className="ve-orb"
          style={{ width: 400, height: 400, top: -100, left: -100 }}
        />
        <div
          className="ve-orb"
          style={{ width: 300, height: 300, bottom: -80, right: -80 }}
        />

        <div className="ve-card">
          <div className="ve-logo">
            <div className="ve-logo-badge">L</div>
            <span className="ve-logo-name">Lélouma Communauté</span>
          </div>

          <Suspense
            fallback={
              <div style={{ textAlign: 'center' }}>
                <Spinner />
                <p
                  style={{
                    marginTop: '1rem',
                    fontSize: '0.82rem',
                    color: '#9CA3AF',
                    fontWeight: 500,
                  }}
                >
                  Chargement…
                </p>
              </div>
            }
          >
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </>
  );
}