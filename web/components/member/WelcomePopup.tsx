//web/components/member/WelcomePopup.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type PopupMode = 'regularPending' | 'cardPending';

interface WelcomePopupProps {
  firstName: string;
  hasPendingContribution?: boolean;  // REGULAR_QUOTA | LATE_QUOTA | DONATION en PENDING_VALIDATION
  hasPendingCard?: boolean;           // MEMBERSHIP_CARD en PENDING_VALIDATION
  currency: string;
  regularAmount?: number | null;
  cardAmount?: number | null;
  onClose: () => void;
}

// ─── Contenu par mode ─────────────────────────────────────────────────────────

const CONTENT: Record<PopupMode, {
  emoji: string;
  gradient: string;
  accentColor: string;
  title: (name: string) => string;
  subtitle: string;
  body: (params: { regularAmount?: number | null; cardAmount?: number | null; currency?: string }) => string;
  ctaLabel: string;
  ctaHref: string;
  ctaColor: string;
  ctaShadow: string;
}> = {

  // ─── COTISATION / DON soumis, en attente de validation ───────────────────
  regularPending: {
    emoji: '🕐',
    gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #ECFDF5 100%)',
    accentColor: '#D97706',
    title: (name) => `Merci ${name} !`,
    subtitle: 'Paiement en cours de validation',
    body: () =>
      `Nous avons bien reçu votre versement et nous vous en remercions chaleureusement.\n\nVotre contribution est actuellement en attente de validation par l'administration de LCD. Ce processus prend généralement peu de temps.\n\nVous recevrez une notification dès que votre paiement sera confirmé.\n\nVotre engagement pour la communauté est précieux. Merci de votre geste !`,
    ctaLabel: '🏠 Retour à mon espace',
    ctaHref: '',
    ctaColor: '#D97706',
    ctaShadow: 'rgba(217,119,6,0.35)',
  },

  // ─── CARTE MEMBRE soumise, en attente de validation ──────────────────────
  cardPending: {
    emoji: '🕐',
    gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #E0E7FF 100%)',
    accentColor: '#2563EB',
    title: (name) => `Merci ${name} !`,
    subtitle: 'Carte membre en cours de validation',
    body: () =>
      `Votre demande de carte de membre annuelle a bien été reçue. Merci pour cette démarche importante !\n\nVotre paiement est en cours d'examen par l'administration de LCD. Une fois validée, votre carte sera activée et vous aurez accès à tous les droits et privilèges des membres en règle.\n\nVous recevrez une notification dès que votre carte sera confirmée. Merci de votre confiance et de votre engagement !`,
    ctaLabel: '🏠 Retour à mon espace',
    ctaHref: '',
    ctaColor: '#2563EB',
    ctaShadow: 'rgba(37,99,235,0.35)',
  },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function WelcomePopup({
  firstName,
  hasPendingContribution = false,
  hasPendingCard = false,
  currency,
  regularAmount,
  cardAmount,
  onClose,
}: WelcomePopupProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // ─── Logique de priorité ──────────────────────────────────────────────────
  // Le popup n'est affiché que lorsqu'une contribution est en PENDING_VALIDATION.
  // Priorité : cotisation / don > carte membre.
  const mode: PopupMode = hasPendingContribution
    ? 'regularPending'
    : hasPendingCard
      ? 'cardPending'
      : 'regularPending';

  const c = CONTENT[mode];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 320);
  };

  const handleCta = () => {
    if (c.ctaHref) {
      handleClose();
      setTimeout(() => router.push(c.ctaHref), 320);
    } else {
      handleClose();
    }
  };

  if (!visible) return null;

  const bodyText = c.body({ regularAmount, cardAmount, currency });
  const titleText = c.title(firstName);

  return (
    <>
      <style>{`
        @keyframes wp-overlay-in  { from{opacity:0}         to{opacity:1} }
        @keyframes wp-overlay-out { from{opacity:1}         to{opacity:0} }
        @keyframes wp-modal-in    { from{opacity:0;transform:scale(.92) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes wp-modal-out   { from{opacity:1;transform:scale(1) translateY(0)} to{opacity:0;transform:scale(.94) translateY(12px)} }
        @keyframes wp-emoji-in    { from{opacity:0;transform:scale(.4) rotate(-15deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
        @keyframes wp-line-in     { from{width:0} to{width:100%} }
        @keyframes wp-shimmer     { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes wp-spin        { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes wp-pulse-ring  { 0%{box-shadow:0 0 0 0 rgba(217,119,6,0.4)} 70%{box-shadow:0 0 0 10px rgba(217,119,6,0)} 100%{box-shadow:0 0 0 0 rgba(217,119,6,0)} }

        .wp-overlay {
          position: fixed; inset: 0; z-index: 9000;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          background: rgba(10, 15, 30, 0.82);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          animation: ${closing ? 'wp-overlay-out' : 'wp-overlay-in'} 0.3s ease forwards;
        }

        .wp-modal {
          width: 100%; max-width: 420px;
          max-height: calc(100dvh - 2rem);
          border-radius: 28px;
          overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.12);
          animation: ${closing ? 'wp-modal-out' : 'wp-modal-in'} 0.35s cubic-bezier(.22,1,.36,1) forwards;
        }

        .wp-guinea-bar {
          height: 7px; width: 100%;
          background: linear-gradient(90deg, #CE1126 0% 33.33%, #FCD116 33.33% 66.66%, #009460 66.66% 100%);
          flex-shrink: 0;
        }

        .wp-hero {
          padding: 1.5rem 1.75rem 1.25rem;
          display: flex; flex-direction: column; align-items: center;
          gap: 0.6rem; position: relative; flex-shrink: 0;
        }

        .wp-emoji-wrap {
          width: 68px; height: 68px; border-radius: 50%;
          background: white; display: flex; align-items: center; justify-content: center;
          font-size: 2rem; line-height: 1;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 0 0 5px rgba(255,255,255,0.25);
          animation: wp-emoji-in 0.5s 0.15s cubic-bezier(.22,1,.36,1) both,
                     wp-pulse-ring 2s 0.7s ease infinite;
          flex-shrink: 0;
        }

        .wp-subtitle {
          font-size: 0.62rem; font-weight: 900; letter-spacing: 0.14em;
          text-transform: uppercase; opacity: 0.65; text-align: center;
        }

        .wp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.35rem, 5vw, 1.75rem);
          font-weight: 700; text-align: center;
          line-height: 1.2; margin: 0;
        }

        .wp-accent-line {
          height: 3px; border-radius: 99px;
          animation: wp-line-in 0.6s 0.3s ease both;
          flex-shrink: 0; align-self: stretch;
        }

        /* Corps scrollable */
        .wp-body {
          background: #FFFFFF;
          padding: 1.25rem 1.5rem 0;
          overflow-y: auto; flex: 1;
          display: flex; flex-direction: column; gap: 1rem;
          -webkit-overflow-scrolling: touch;
        }

        /* Zone CTA collée en bas */
        .wp-footer {
          background: #FFFFFF;
          padding: 1rem 1.5rem 1.25rem;
          display: flex; flex-direction: column; gap: 0.6rem;
          flex-shrink: 0;
          border-top: 1px solid #F3F4F6;
        }

        .wp-text {
          font-size: 0.88rem; color: #374151;
          line-height: 1.75; font-weight: 500;
          white-space: pre-wrap;
          font-family: 'DM Sans', sans-serif;
        }

        /* Bannière spinner "En attente de validation" */
        .wp-pending-banner {
          display: flex; align-items: center; gap: 0.65rem;
          background: linear-gradient(135deg, #FFFBEB, #FEF3C7);
          border: 1.5px solid #FCD34D;
          border-radius: 14px; padding: 0.85rem 1rem;
          font-size: 0.8rem; font-weight: 700; color: #92400E;
          line-height: 1.45;
        }

        .wp-pending-spinner {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2.5px solid #FCD34D;
          border-top-color: #D97706;
          animation: wp-spin 0.9s linear infinite;
          flex-shrink: 0;
        }

        .wp-cta {
          width: 100%; height: 52px; border: none; border-radius: 16px;
          font-family: 'DM Sans', sans-serif; font-size: 0.92rem; font-weight: 800;
          color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.55rem;
          transition: all 0.2s;
          position: relative; overflow: hidden;
        }
        .wp-cta:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .wp-cta:active { transform: scale(0.98); }
        .wp-cta::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: wp-shimmer 2.5s linear infinite;
        }

        .wp-signature {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          font-size: 0.68rem; color: #9CA3AF; font-weight: 600;
        }
        .wp-flag-mini {
          display: inline-flex; height: 10px; width: 18px;
          border-radius: 2px; overflow: hidden; flex-shrink: 0;
        }
        .wp-flag-stripe { flex: 1; height: 100%; }

        /* Dégradé de fondu en bas du corps */
        .wp-scroll-fade {
          height: 28px; flex-shrink: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0), #fff);
          margin-top: -28px; pointer-events: none;
          position: relative; z-index: 1;
        }

        @media (max-width: 440px) {
          .wp-modal { border-radius: 20px; }
          .wp-hero { padding: 1.1rem 1.1rem 1rem; gap: 0.45rem; }
          .wp-body { padding: 1rem 1.1rem 0; gap: 0.85rem; }
          .wp-footer { padding: 0.85rem 1.1rem 1rem; }
          .wp-emoji-wrap { width: 56px; height: 56px; font-size: 1.7rem; }
          .wp-title { font-size: 1.25rem; }
          .wp-cta { height: 48px; font-size: 0.88rem; }
        }

        @media (max-height: 680px) {
          .wp-hero { padding: 0.85rem 1rem 0.75rem; gap: 0.3rem; }
          .wp-emoji-wrap { width: 48px; height: 48px; font-size: 1.45rem; }
          .wp-title { font-size: 1.15rem; }
          .wp-subtitle { font-size: 0.57rem; }
          .wp-body { gap: 0.65rem; }
          .wp-text { font-size: 0.82rem; line-height: 1.58; }
          .wp-footer { padding: 0.7rem 1rem 0.85rem; gap: 0.45rem; }
          .wp-cta { height: 44px; }
        }
      `}</style>

      <div className="wp-overlay">
        <div className="wp-modal" onClick={e => e.stopPropagation()}>

          {/* Bande drapeau Guinée */}
          <div className="wp-guinea-bar" />

          {/* Hero coloré */}
          <div className="wp-hero" style={{ background: c.gradient }}>
            <div className="wp-emoji-wrap">{c.emoji}</div>
            <span className="wp-subtitle" style={{ color: c.accentColor }}>{c.subtitle}</span>
            <h2 className="wp-title" style={{ color: '#111827' }}>{titleText}</h2>
            <div className="wp-accent-line" style={{ background: `linear-gradient(90deg, ${c.accentColor}, ${c.accentColor}55)` }} />
          </div>

          {/* Corps scrollable */}
          <div className="wp-body">

            {/* Bannière spinner — toujours visible (les deux modes sont des états "pending") */}
            <div className="wp-pending-banner">
              <div className="wp-pending-spinner" />
              <span>
                Votre paiement a été soumis et est en attente de validation par l&apos;administration.
              </span>
            </div>

            {/* Texte principal */}
            <p className="wp-text" style={{ margin: 0 }}>{bodyText}</p>

            {/* Espace de respiration en bas du scroll */}
            <div style={{ height: '0.5rem', flexShrink: 0 }} />
          </div>

          {/* Dégradé de fondu signalant le scroll */}
          <div className="wp-scroll-fade" />

          {/* FOOTER STICKY */}
          <div className="wp-footer">
            <button
              className="wp-cta"
              style={{
                background: `linear-gradient(135deg, ${c.ctaColor}, ${c.ctaColor}CC)`,
                boxShadow: `0 6px 20px ${c.ctaShadow}`,
              }}
              onClick={handleCta}
            >
              {c.ctaLabel}
            </button>

            <div className="wp-signature">
              <span className="wp-flag-mini">
                <span className="wp-flag-stripe" style={{ background: '#CE1126' }} />
                <span className="wp-flag-stripe" style={{ background: '#FCD116' }} />
                <span className="wp-flag-stripe" style={{ background: '#009460' }} />
              </span>
              Association LCD — Espace membre
            </div>
          </div>

        </div>
      </div>
    </>
  );
}