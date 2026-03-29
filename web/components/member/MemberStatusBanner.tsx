// web/components/member/MemberStatusBanner.tsx
'use client';

import type { UserSummary } from '../../types/user';

type StatusConfig = {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
  message: string;
};

function getConfig(status: string): StatusConfig {
  const icons = {
    warning: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    ),
    success: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    danger: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    info: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
  };

  const map: Record<string, StatusConfig> = {
    // FIX: EMAIL_UNVERIFIED remplace PENDING_EMAIL_VERIFICATION
    EMAIL_UNVERIFIED: {
      color: '#92400E', bg: '#FFFBEB', border: '#FDE68A',
      icon: icons.warning, label: 'Email non vérifié',
      message: 'Vérifiez votre boîte mail et cliquez sur le lien d\'activation pour continuer.',
    },
    PENDING_APPROVAL: {
      color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
      icon: icons.info, label: 'En attente de validation',
      message: 'Votre email est confirmé. Votre compte attend la validation par l\'administrateur de votre antenne.',
    },
    ACTIVE: {
      color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0',
      icon: icons.success, label: 'Compte actif',
      message: 'Votre compte est actif. Toutes les fonctionnalités membres sont disponibles.',
    },
    SUSPENDED: {
      color: '#7C2D12', bg: '#FFF7ED', border: '#FDBA74',
      icon: icons.danger, label: 'Compte suspendu',
      message: 'Votre compte est temporairement suspendu. Contactez l\'administrateur de votre antenne.',
    },
    REJECTED: {
      color: '#991B1B', bg: '#FEF2F2', border: '#FECACA',
      icon: icons.danger, label: 'Demande rejetée',
      message: 'Votre demande d\'adhésion a été rejetée. Contactez l\'administrateur de votre antenne pour plus d\'informations.',
    },
  };

  return map[status] ?? {
    color: '#374151', bg: '#F9FAFB', border: '#E5E7EB',
    icon: icons.info, label: status,
    message: 'Statut de votre compte en cours de traitement.',
  };
}

export function MemberStatusBanner({ me }: { me: UserSummary }) {
  const cfg = getConfig(me.status);

  return (
    <>
      <style>{`
        .msb-wrap {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.85rem 1.1rem;
          border-radius: 14px;
          border: 1px solid;
          margin-bottom: 1.25rem;
          font-family: 'DM Sans', sans-serif;
          animation: msbfade 0.4s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes msbfade {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msb-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: 1px;
        }
        .msb-body { flex: 1; min-width: 0; }
        .msb-label {
          font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.07em; text-transform: uppercase;
          margin-bottom: 0.22rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .msb-dot {
          width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
          animation: msbpulse 2.5s ease-in-out infinite;
        }
        @keyframes msbpulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        .msb-msg {
          font-size: 0.78rem; line-height: 1.55;
          opacity: 0.85;
        }
      `}</style>

      <div
        className="msb-wrap"
        style={{
          background: cfg.bg,
          borderColor: cfg.border,
          color: cfg.color,
        }}
      >
        <div className="msb-icon" style={{ background: `${cfg.border}80` }}>
          {cfg.icon}
        </div>
        <div className="msb-body">
          <div className="msb-label">
            <span className="msb-dot" style={{ background: cfg.color }} />
            {cfg.label}
          </div>
          <p className="msb-msg">{cfg.message}</p>
        </div>

        {/* FIX: EMAIL_UNVERIFIED pour la condition d'affichage du bouton */}
        {me.status === 'EMAIL_UNVERIFIED' && (
          <button
            type="button"
            style={{
              flexShrink: 0, alignSelf: 'center',
              background: 'none', border: `1px solid ${cfg.border}`,
              borderRadius: 8, padding: '0.3rem 0.7rem',
              fontSize: '0.7rem', fontWeight: 700,
              color: cfg.color, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s',
            }}
            onClick={() => window.location.href = '/verify-email'}
          >
            Vérifier →
          </button>
        )}
      </div>
    </>
  );
}