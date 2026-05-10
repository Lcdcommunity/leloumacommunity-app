// web/components/member/WelcomePopup.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

type PopupMode = 'loading' | 'late' | 'regular' | 'card' | 'upToDate';

interface WelcomePopupProps {
  firstName: string;
  lateMonths: number;          // mois de retard de cotisation
  hasRegularPending: boolean;  // cotisation du mois en cours non payée
  hasCardPending: boolean;     // carte membre annuelle non payée / expirée
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
  body: (params: { lateMonths?: number; regularAmount?: number | null; cardAmount?: number | null; currency?: string }) => string;
  ctaLabel: string;
  ctaHref: string;
  ctaColor: string;
  ctaShadow: string;
  showSkip: boolean;
}> = {
  loading: {
    emoji: '⏳',
    gradient: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
    accentColor: '#2563EB',
    title: () => 'Chargement…',
    subtitle: '',
    body: () => '',
    ctaLabel: '',
    ctaHref: '',
    ctaColor: '#2563EB',
    ctaShadow: 'rgba(37,99,235,0.3)',
    showSkip: false,
  },
  late: {
    emoji: '🙏',
    gradient: 'linear-gradient(135deg, #FFF7ED 0%, #FEF2F2 50%, #FFFBEB 100%)',
    accentColor: '#DC2626',
    title: (name) => `Cher(e) ${name},`,
    subtitle: 'Une demande de votre association',
    body: ({ lateMonths, regularAmount, currency }) =>
      `Nous espérons que vous vous portez bien. En tant que membre actif de notre communauté Lelouma, votre soutien est précieux et fondamental pour la réalisation de nos projets communs.\n\nNous constatons que vous avez ${lateMonths} mois de cotisation${lateMonths && lateMonths > 1 ? 's' : ''} en attente${regularAmount ? ` (${regularAmount} ${currency} / mois)` : ''}. Nous vous prions humblement de régulariser votre situation dès que possible.\n\nChaque contribution, aussi modeste soit-elle, contribue à bâtir un avenir meilleur pour notre terre natale. Votre engagement fait la force de Lelouma.`,
    ctaLabel: '💳 Régulariser mes cotisations',
    ctaHref: '/member/contributions/new',
    ctaColor: '#DC2626',
    ctaShadow: 'rgba(220,38,38,0.35)',
    showSkip: true,
  },
  regular: {
    emoji: '📅',
    gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #ECFDF5 100%)',
    accentColor: '#D97706',
    title: (name) => `Bonjour ${name},`,
    subtitle: 'Cotisation du mois',
    body: ({ regularAmount, currency }) =>
      `Félicitations, vous êtes à jour sur vos retards ! C'est un beau geste pour la communauté.\n\nCependant, la cotisation du mois en cours${regularAmount ? ` (${regularAmount} ${currency})` : ''} n'a pas encore été enregistrée.\n\nN'attendez pas la fin du mois — un bon citoyen anticipe ses engagements. Votre ponctualité est une marque de respect envers tous les membres de Lelouma.`,
    ctaLabel: '✅ Payer ma cotisation du mois',
    ctaHref: '/member/contributions/new',
    ctaColor: '#D97706',
    ctaShadow: 'rgba(217,119,6,0.35)',
    showSkip: true,
  },
  card: {
    emoji: '💳',
    gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #E0E7FF 100%)',
    accentColor: '#2563EB',
    title: (name) => `Bravo ${name} !`,
    subtitle: 'Carte membre annuelle',
    body: ({ cardAmount, currency }) =>
      `Vos cotisations régulières sont en ordre — votre sérieux force l'admiration !\n\nIl reste une dernière étape : votre carte de membre annuelle${cardAmount ? ` (${cardAmount} ${currency})` : ''} n'est pas encore réglée pour cette année.\n\nLa carte membre est votre titre de citoyenneté dans notre communauté. Elle vous donne accès à tous les droits et privilèges des membres en règle de Lelouma.`,
    ctaLabel: '🎫 Obtenir ma carte membre',
    ctaHref: '/member/contributions/new',
    ctaColor: '#2563EB',
    ctaShadow: 'rgba(37,99,235,0.35)',
    showSkip: true,
  },
  upToDate: {
    emoji: '🌟',
    gradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 40%, #F0FDF4 100%)',
    accentColor: '#059669',
    title: (name) => `Bravo ${name} !`,
    subtitle: 'Membre exemplaire',
    body: () =>
      `Vous êtes pleinement en règle — cotisations à jour, carte membre active. Vous êtes un exemple pour notre communauté !\n\nContinuez sur cette lancée. Votre engagement constant pour Lelouma est une source d'inspiration pour tous les membres.\n\n« Le bon citoyen n'attend pas d'être rappelé à ses devoirs — il les assume avec fierté et constance. »\n\nMerci d'être ce pilier sur lequel repose l'avenir de Lelouma. Bienvenue !`,
    ctaLabel: '🏠 Accéder à mon espace',
    ctaHref: '',
    ctaColor: '#059669',
    ctaShadow: 'rgba(5,150,105,0.35)',
    showSkip: false,
  },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export function WelcomePopup({
  firstName,
  lateMonths,
  hasRegularPending,
  hasCardPending,
  currency,
  regularAmount,
  cardAmount,
  onClose,
}: WelcomePopupProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Déterminer le mode
  const mode: PopupMode =
    lateMonths > 0
      ? 'late'
      : hasRegularPending
      ? 'regular'
      : hasCardPending
      ? 'card'
      : 'upToDate';

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

  const bodyText = c.body({ lateMonths, regularAmount, cardAmount, currency });
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
        @keyframes wp-pulse       { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes wp-shimmer     { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

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

        /* Bande drapeau Guinée en haut */
        .wp-guinea-bar {
          height: 7px; width: 100%;
          background: linear-gradient(90deg, #CE1126 0% 33.33%, #FCD116 33.33% 66.66%, #009460 66.66% 100%);
          flex-shrink: 0;
        }

        /* Zone hero colorée */
        .wp-hero {
          padding: 2rem 1.75rem 1.5rem;
          display: flex; flex-direction: column; align-items: center;
          gap: 0.75rem; position: relative; flex-shrink: 0;
        }

        .wp-emoji-wrap {
          width: 80px; height: 80px; border-radius: 50%;
          background: white; display: flex; align-items: center; justify-content: center;
          font-size: 2.4rem; line-height: 1;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12), 0 0 0 6px rgba(255,255,255,0.25);
          animation: wp-emoji-in 0.5s 0.15s cubic-bezier(.22,1,.36,1) both;
          flex-shrink: 0;
        }

        .wp-subtitle {
          font-size: 0.65rem; font-weight: 900; letter-spacing: 0.14em;
          text-transform: uppercase; opacity: 0.65; text-align: center;
        }

        .wp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.55rem, 5vw, 1.85rem);
          font-weight: 700; text-align: center;
          line-height: 1.2; margin: 0;
        }

        /* Ligne décorative animée */
        .wp-accent-line {
          height: 3px; border-radius: 99px;
          animation: wp-line-in 0.6s 0.3s ease both;
          flex-shrink: 0; align-self: stretch;
        }

        /* Corps blanc scrollable */
        .wp-body {
          background: #FFFFFF;
          padding: 1.5rem 1.75rem 1.75rem;
          overflow-y: auto; flex: 1;
          display: flex; flex-direction: column; gap: 1.25rem;
        }

        .wp-text {
          font-size: 0.88rem; color: #374151;
          line-height: 1.75; font-weight: 500;
          white-space: pre-wrap;
          font-family: 'DM Sans', sans-serif;
        }

        /* Citation pour upToDate */
        .wp-quote {
          background: #F0FDF4; border-left: 4px solid #10B981;
          border-radius: 0 12px 12px 0;
          padding: 0.85rem 1rem;
          font-size: 0.82rem; color: #065F46;
          font-style: italic; line-height: 1.6;
          font-family: 'Cormorant Garamond', serif;
          font-weight: 600;
        }

        /* Badge mois de retard */
        .wp-late-badge {
          display: inline-flex; align-items: center; gap: 0.45rem;
          background: #FEF2F2; border: 1.5px solid #FECACA;
          border-radius: 99px; padding: 0.45rem 1rem;
          font-size: 0.82rem; font-weight: 800; color: #DC2626;
          align-self: flex-start;
        }

        /* Bouton CTA principal */
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

        /* Shimmer effect sur CTA */
        .wp-cta::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
          background-size: 200% 100%;
          animation: wp-shimmer 2.5s linear infinite;
        }

        /* Bouton passer */
        .wp-skip {
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
          font-weight: 600; color: #9CA3AF;
          padding: 0.35rem 0.5rem; border-radius: 8px;
          transition: color 0.15s; text-align: center; align-self: center;
        }
        .wp-skip:hover { color: #6B7280; }

        /* Petite signature */
        .wp-signature {
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          font-size: 0.68rem; color: #D1D5DB; font-weight: 600;
          padding-top: 0.5rem; border-top: 1px solid #F3F4F6;
        }
        .wp-flag-mini {
          display: inline-flex; height: 10px; width: 18px;
          border-radius: 2px; overflow: hidden; flex-shrink: 0;
        }
        .wp-flag-stripe { flex: 1; height: 100%; }

        @media (max-width: 440px) {
          .wp-modal { border-radius: 22px; }
          .wp-hero { padding: 1.5rem 1.25rem 1.25rem; }
          .wp-body { padding: 1.25rem 1.25rem 1.5rem; }
          .wp-emoji-wrap { width: 64px; height: 64px; font-size: 1.9rem; }
        }
      `}</style>

      <div className="wp-overlay" onClick={mode === 'upToDate' ? handleClose : undefined}>
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

          {/* Corps */}
          <div className="wp-body">

            {/* Badge retard */}
            {mode === 'late' && lateMonths > 0 && (
              <div className="wp-late-badge">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                {lateMonths} mois de retard
              </div>
            )}

            {/* Texte principal — on sépare la citation si upToDate */}
            {mode === 'upToDate' ? (
              <>
                {bodyText.split('\n\n').map((para, i) =>
                  para.startsWith('«') ? (
                    <div key={i} className="wp-quote">{para}</div>
                  ) : (
                    <p key={i} className="wp-text" style={{ margin: 0 }}>{para}</p>
                  )
                )}
              </>
            ) : (
              <p className="wp-text" style={{ margin: 0 }}>{bodyText}</p>
            )}

            {/* CTA */}
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

            {/* Passer */}
            {c.showSkip && (
              <button className="wp-skip" onClick={handleClose}>
                Passer pour l&apos;instant →
              </button>
            )}

            {/* Signature */}
            <div className="wp-signature">
              <span className="wp-flag-mini">
                <span className="wp-flag-stripe" style={{ background: '#CE1126' }} />
                <span className="wp-flag-stripe" style={{ background: '#FCD116' }} />
                <span className="wp-flag-stripe" style={{ background: '#009460' }} />
              </span>
              Association Lelouma — Espace membre
            </div>
          </div>
        </div>
      </div>
    </>
  );
}