//web/components/member/ContributionCreateForm.tsx
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api-client';

type SupportedCurrency = 'GNF' | 'EUR' | 'USD' | 'XOF' | '';

export interface SearchMemberResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

interface ContributionValues {
  amount: number;
  currency: SupportedCurrency;
  depositedAt: string;
  method: string;
  note: string;
  purpose: string;
  targetMemberId?: string;
  monthReference?: number;
  yearReference?: number;
}

interface Props {
  onSubmit: (values: ContributionValues) => Promise<void>;
  isSubmitting?: boolean;
  defaultPurpose?: string;
  pricing?: { monthlyQuota: number; membershipCard: number };
}

const PURPOSES = [
  { value: 'REGULAR_QUOTA', label: 'Cotisation régulière', icon: '📅', desc: 'Mois en cours' },
  { value: 'LATE_QUOTA', label: 'Paiement retards', icon: '⏳', desc: 'Rattrapage des mois non payés' },
  { value: 'MEMBERSHIP_CARD', label: 'Carte membre annuelle', icon: '💳', desc: 'Règlement de la carte' },
  { value: 'DONATION', label: 'Don libre', icon: '🤝', desc: 'Contribution volontaire' },
];

const METHODS = [
  {
    value: 'CASH',
    label: 'Espèces',
    colorClass: 'cash',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Virement',
    colorClass: 'bank',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    value: 'MOBILE_MONEY',
    label: 'Mobile Money',
    colorClass: 'mobile',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'CARD',
    label: 'Carte Bancaire',
    colorClass: 'card',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="2" y1="10" x2="22" y2="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getCurrencyMeta(currency: SupportedCurrency) {
  switch (currency) {
    case 'GNF': return { prefix: 'FG', label: 'Franc guinéen (GNF)' };
    case 'XOF': return { prefix: 'F CFA', label: 'Franc CFA (XOF)' };
    case 'USD': return { prefix: '$', label: 'Dollar américain (USD)' };
    case 'EUR': return { prefix: '€', label: 'Euro (EUR)' };
    default: return { prefix: '', label: 'Devise' };
  }
}

// ─── Smart Modal ──────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  type: 'info' | 'warning' | 'confirm';
  title: string;
  body: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

function SmartModal({ open, onClose, onConfirm, type, title, body, confirmLabel = 'OK', cancelLabel = 'Annuler' }: ModalProps) {
  if (!open) return null;

  const colors = {
    info: { bg: '#EFF6FF', border: '#BFDBFE', icon: '#2563EB', btn: 'linear-gradient(135deg,#1D4ED8,#3B82F6)' },
    warning: { bg: '#FEF3C7', border: '#FDE68A', icon: '#D97706', btn: 'linear-gradient(135deg,#B45309,#F59E0B)' },
    confirm: { bg: '#ECFDF5', border: '#A7F3D0', icon: '#059669', btn: 'linear-gradient(135deg,#047857,#10B981)' },
  }[type];

  const icons = {
    info: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    confirm: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }[type];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'smOverlayIn 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white', borderRadius: '20px', padding: '1.75rem',
        maxWidth: '400px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        animation: 'smPanelIn 0.25s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* Icon badge */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: colors.bg, border: `2px solid ${colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: colors.icon, marginBottom: '1rem',
        }}>
          {icons}
        </div>

        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '0.6rem', lineHeight: 1.3 }}>
          {title}
        </h3>
        <div style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.65, marginBottom: '1.5rem' }}>
          {body}
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          {onConfirm && (
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, height: 42, borderRadius: 10, border: '1.5px solid #E5E7EB',
                background: 'white', color: '#374151', fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => { if (onConfirm) { onConfirm(); } else { onClose(); } }}
            style={{
              flex: 1, height: 42, borderRadius: 10, border: 'none',
              background: colors.btn, color: 'white',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Month/Year Picker ────────────────────────────────────────────────────────
interface MonthYearPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}

function MonthYearPicker({ month, year, onChange }: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
      <div>
        <select
          value={month}
          onChange={(e) => onChange(Number(e.target.value), year)}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            border: '1px solid rgba(5,150,105,0.25)',
            background: 'rgba(255,255,255,0.9)',
            padding: '0 2.5rem 0 1rem',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.88rem', fontWeight: 600, color: '#111827',
            outline: 'none', cursor: 'pointer',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            appearance: 'none',
          }}
        >
          {MONTHS_FR.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>
      <div>
        <select
          value={year}
          onChange={(e) => onChange(month, Number(e.target.value))}
          style={{
            width: '100%', height: 48, borderRadius: 12,
            border: '1px solid rgba(5,150,105,0.25)',
            background: 'rgba(255,255,255,0.9)',
            padding: '0 2.5rem 0 1rem',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.88rem', fontWeight: 600, color: '#111827',
            outline: 'none', cursor: 'pointer',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center',
            appearance: 'none',
          }}
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Types for api responses ───────────────────────────────────────────────────
interface ContributionItem {
  status: string;
  validatedAt?: string;
  createdAt: string;
}

interface ContributionsResponse {
  items?: ContributionItem[];
}


// ─── Celebration Overlay ─────────────────────────────────────────────────────

interface CelebrationConfig {
  emoji: string[];
  title: string;
  message: string;
  colors: string[];
  gradient: string;
  titleColor: string;
}

function getCelebrationConfig(purpose: string): CelebrationConfig {
  switch (purpose) {
    case 'LATE_QUOTA':
      return {
        emoji: ['🎉', '💪', '🏆', '⭐', '✨', '🎊', '🌟'],
        title: 'Retard rattrapé !',
        message: 'Félicitations ! Vous avez régularisé votre situation. Chaque pas vers la ponctualité renforce notre communauté. Encourageons-nous mutuellement à rester à jour — ensemble, Lelouma grandit !',
        colors: ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#F97316'],
        gradient: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
        titleColor: '#D97706',
      };
    case 'DONATION':
      return {
        emoji: ['💝', '🤝', '🌱', '💫', '🏡', '❤️', '🌍'],
        title: 'Don reçu avec gratitude !',
        message: "Votre geste témoigne d'une générosité rare et d'une volonté sincère d'œuvrer pour le développement de nos localités. Vous êtes la preuve vivante que l'amour de la patrie se manifeste par des actes. Merci du fond du cœur !",
        colors: ['#EC4899', '#F43F5E', '#10B981', '#8B5CF6', '#F97316', '#3B82F6'],
        gradient: 'linear-gradient(135deg, #FFF0F6, #FCE7F3)',
        titleColor: '#DB2777',
      };
    case 'MEMBERSHIP_CARD':
      return {
        emoji: ['💳', '🏅', '🎖️', '⭐', '✨', '🎊', '🌟'],
        title: 'Carte membre activée !',
        message: 'Votre carte membre est en cours de validation. Elle symbolise votre appartenance officielle à la famille Lelouma. Portez-la avec fierté — vous êtes désormais un membre à part entière de notre belle communauté !',
        colors: ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#EC4899', '#14B8A6'],
        gradient: 'linear-gradient(135deg, #EFF6FF, #E0E7FF)',
        titleColor: '#1D4ED8',
      };
    default: // REGULAR_QUOTA
      return {
        emoji: ['🎯', '✅', '🌿', '💚', '🎉', '🏆', '⭐'],
        title: 'Cotisation enregistrée !',
        message: 'Excellent ! Votre cotisation du mois a bien été enregistrée. Votre régularité est un exemple pour tous. En contribuant chaque mois, vous participez activement au développement de Lelouma. Continuez ainsi !',
        colors: ['#10B981', '#059669', '#3B82F6', '#F59E0B', '#8B5CF6', '#F97316'],
        gradient: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
        titleColor: '#047857',
      };
  }
}

// Particule individuelle
interface ParticleProps {
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  rotation: number;
  shape: 'circle' | 'rect' | 'triangle';
  delay: number;
}

function CelebrationOverlay({ purpose, onClose }: { purpose: string; onClose: () => void }) {
  const config = getCelebrationConfig(purpose);
  const [particles, setParticles] = React.useState<ParticleProps[]>([]);
  const [visible, setVisible] = React.useState(false);
  const [closing, setClosing] = React.useState(false);

  React.useEffect(() => {
    // Générer les particules
    const generated: ParticleProps[] = Array.from({ length: 60 }, (_, i) => ({
      x: 10 + Math.random() * 80,
      y: -10,
      color: config.colors[i % config.colors.length],
      size: 6 + Math.random() * 10,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 5,
      rotation: Math.random() * 360,
      shape: (['circle', 'rect', 'triangle'] as const)[Math.floor(Math.random() * 3)],
      delay: Math.random() * 0.8,
    }));
    setParticles(generated);
    // Apparition avec léger délai
    const t = setTimeout(() => setVisible(true), 80);
    // Fermeture automatique après 5s
    const t2 = setTimeout(() => handleClose(), 5200);
    return () => { clearTimeout(t); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 400);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        opacity: closing ? 0 : visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
      onClick={handleClose}
    >
      {/* Particules confettis */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: '-20px',
              width: p.size,
              height: p.shape === 'rect' ? p.size * 0.5 : p.size,
              background: p.shape === 'triangle' ? 'transparent' : p.color,
              borderLeft: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
              borderRight: p.shape === 'triangle' ? `${p.size / 2}px solid transparent` : undefined,
              borderBottom: p.shape === 'triangle' ? `${p.size}px solid ${p.color}` : undefined,
              borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : undefined,
              animation: `ccf-fall-${i % 6} ${1.8 + p.vy * 0.3}s ${p.delay}s ease-in forwards`,
              transform: `rotate(${p.rotation}deg)`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      {/* Card centrale */}
      <div
        style={{
          background: config.gradient,
          borderRadius: 28,
          padding: 'clamp(1.5rem, 5vw, 2.5rem)',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.6)',
          transform: closing ? 'scale(0.92)' : visible ? 'scale(1)' : 'scale(0.85)',
          transition: 'transform 0.4s cubic-bezier(.22,1,.36,1)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Emojis qui tombent en arc */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {config.emoji.map((e, i) => (
            <span
              key={i}
              style={{
                fontSize: i === 0 ? '2.8rem' : '1.6rem',
                display: 'inline-block',
                animation: `ccf-emoji-bounce ${0.5 + i * 0.1}s ${0.1 + i * 0.08}s cubic-bezier(.22,1,.36,1) both`,
              }}
            >
              {e}
            </span>
          ))}
        </div>

        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(1.5rem, 5vw, 1.85rem)',
          fontWeight: 700,
          color: config.titleColor,
          marginBottom: '0.85rem',
          lineHeight: 1.2,
        }}>
          {config.title}
        </h2>

        <p style={{
          fontSize: '0.84rem',
          color: '#374151',
          lineHeight: 1.65,
          marginBottom: '1.5rem',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {config.message}
        </p>

        <button
          onClick={handleClose}
          style={{
            width: '100%', height: 46, borderRadius: 13, border: 'none',
            background: config.titleColor,
            color: 'white', fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.88rem', fontWeight: 800,
            cursor: 'pointer', letterSpacing: '0.04em',
            boxShadow: `0 6px 20px ${config.titleColor}55`,
            transition: 'all .2s',
          }}
        >
          Parfait, merci ! 🙏
        </button>

        {/* Petites étincelles décoratives aux coins */}
        {['top:0;left:0', 'top:0;right:0', 'bottom:0;left:0', 'bottom:0;right:0'].map((pos, i) => (
          <div key={i} style={{
            position: 'absolute',
            ...Object.fromEntries(pos.split(';').map(p => p.split(':'))),
            fontSize: '1.2rem',
            animation: `ccf-sparkle ${0.8 + i * 0.2}s ${0.3 + i * 0.15}s ease-in-out infinite alternate`,
            pointerEvents: 'none',
          }}>
            ✨
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ContributionCreateForm({
  onSubmit,
  isSubmitting,
  defaultPurpose,
  pricing,
}: Props) {

  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('');

  // Tiers payment
  const [paymentTarget, setPaymentTarget] = useState<'ME' | 'OTHER'>('ME');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMemberResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SearchMemberResult | null>(null);

  // Month reference (NEW)
  const now = new Date();
  const [refMonth, setRefMonth] = useState<number>(now.getMonth() + 1);
  const [refYear, setRefYear] = useState<number>(now.getFullYear());

  // Modal state
  const [modal, setModal] = useState<{
    open: boolean;
    type: 'info' | 'warning' | 'confirm';
    title: string;
    body: string | React.ReactNode;
    onConfirm?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({ open: false, type: 'info', title: '', body: '' });

  // Late check
  const [hasLateMonths, setHasLateMonths] = useState<boolean | null>(null);

  const [values, setValues] = useState<{
    amount: string;
    depositedAt: string;
    method: string;
    note: string;
    purpose: string;
  }>(() => {
    const initialPurpose = defaultPurpose ?? 'REGULAR_QUOTA';
    return {
      amount: '',
      depositedAt: new Date().toISOString().split('T')[0],
      method: 'CASH',
      note: '',
      purpose: initialPurpose,
    };
  });

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // ── Celebration state ─────────────────────────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPurpose, setCelebrationPurpose] = useState('REGULAR_QUOTA');
  const [pendingPayload, setPendingPayload] = useState<ContributionValues | null>(null);

  const currencyMeta = useMemo(() => getCurrencyMeta(selectedCurrency), [selectedCurrency]);

  // ── Pricing for the selected currency ─────────────────────────────────────
  const currentPricing = useMemo(() => {
    return pricing ?? { monthlyQuota: 0, membershipCard: 0 };
  }, [pricing]);

  // ── Check if user has late months on mount ─────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function checkLate() {
      try {
        const apiAny = api as Record<string, unknown>;
        const listFn = apiAny['listMyContributions'];
        if (typeof listFn !== 'function') {
          if (mounted) setHasLateMonths(true);
          return;
        }

        let contributions: ContributionsResponse | ContributionItem[] | null = null;
        try {
          contributions = await (listFn as (opts: { pageSize: number }) => Promise<ContributionsResponse | ContributionItem[]>)({ pageSize: 50 });
        } catch {
          contributions = null;
        }

        if (!mounted) return;

        if (!contributions) {
          setHasLateMonths(true);
          return;
        }

        const items: ContributionItem[] = Array.isArray(contributions)
          ? contributions
          : (contributions.items ?? []);

        const validated = items.filter((c) => c.status === 'VALIDATED');

        if (validated.length === 0) {
          setHasLateMonths(false);
          return;
        }

        validated.sort((a, b) =>
          new Date(b.validatedAt ?? b.createdAt).getTime() - new Date(a.validatedAt ?? a.createdAt).getTime()
        );

        const lastValidated = new Date(validated[0].validatedAt ?? validated[0].createdAt);
        const monthsAgo = (Date.now() - lastValidated.getTime()) / (1000 * 60 * 60 * 24 * 30);
        setHasLateMonths(monthsAgo > 1);
      } catch {
        if (mounted) setHasLateMonths(true);
      }
    }
    void checkLate();
    return () => { mounted = false; };
  }, []);

  // ── Visible results: derived, no setState in effect ──────────────────────
  const visibleResults = useMemo(
    () => (paymentTarget === 'OTHER' && searchQuery && !selectedMember ? searchResults : []),
    [paymentTarget, searchQuery, selectedMember, searchResults],
  );

  // ── Debounced member search ────────────────────────────────────────────────
  useEffect(() => {
    if (paymentTarget === 'ME' || !searchQuery || selectedMember) return;
    const timer = setTimeout(() => {
      setIsSearching(true);
      api.searchMembers(searchQuery)
        .then((results) => { setSearchResults(results); })
        .catch((err: unknown) => { console.error('Search error', err); })
        .finally(() => { setIsSearching(false); });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, paymentTarget, selectedMember]);

  // ── Purpose selection with smart guards ───────────────────────────────────
  const handlePurposeSelect = useCallback((purposeValue: string) => {
    if (purposeValue === 'MEMBERSHIP_CARD') {
      const cardPrice = currentPricing.membershipCard;
      if (cardPrice > 0 && selectedCurrency) {
        setModal({
          open: true,
          type: 'info',
          title: 'Prix de la carte membre',
          body: (
            <span>
              Le prix de la carte membre est fixé à{' '}
              <strong style={{ color: '#059669', fontSize: '1rem' }}>
                {cardPrice.toLocaleString('fr-FR')} {selectedCurrency}
              </strong>{' '}
              par l&apos;administrateur. Ce montant sera automatiquement appliqué.
            </span>
          ),
          confirmLabel: 'Compris',
          onConfirm: undefined,
        });
        setValues(prev => ({ ...prev, purpose: purposeValue, amount: cardPrice.toString() }));
        return;
      }
    }

    if (purposeValue === 'LATE_QUOTA') {
      if (hasLateMonths === false) {
        setModal({
          open: true,
          type: 'warning',
          title: 'Aucun retard détecté',
          body: 'Votre historique de cotisations ne présente pas de retard de paiement. Vous ne pouvez pas sélectionner ce motif. Choisissez &quot;Cotisation régulière&quot; pour payer le mois en cours.',
          confirmLabel: 'Compris',
          onConfirm: undefined,
        });
        return;
      }
    }

    if (purposeValue === 'DONATION') {
      setModal({
        open: true,
        type: 'confirm',
        title: 'Confirmer votre don',
        body: (
          <span>
            Vous êtes sur le point d&apos;effectuer un <strong>don libre</strong>, et non une cotisation mensuelle.{' '}
            Ce montant <strong>ne sera pas compté</strong> comme paiement de vos cotisations régulières.
            <br /><br />
            Confirmez-vous ce don ?
          </span>
        ),
        confirmLabel: 'Oui, faire un don',
        cancelLabel: 'Non, annuler',
        onConfirm: () => {
          setValues(prev => ({ ...prev, purpose: purposeValue }));
          setModal(m => ({ ...m, open: false }));
        },
      });
      return;
    }

    setValues(prev => ({ ...prev, purpose: purposeValue }));
  }, [currentPricing, selectedCurrency, hasLateMonths]);

  // ── Amount derived data ────────────────────────────────────────────────────
  const amountNum = Number(values.amount);
  const monthlyPrice = currentPricing.monthlyQuota;
  const isQuota = values.purpose === 'REGULAR_QUOTA' || values.purpose === 'LATE_QUOTA';
  const isMembershipCard = values.purpose === 'MEMBERSHIP_CARD';
  const cardPrice = currentPricing.membershipCard;

  const showAdvanceNotice = isQuota && monthlyPrice > 0 && amountNum > monthlyPrice;
  const monthsCovered = monthlyPrice > 0 && amountNum > 0 ? Math.floor(amountNum / monthlyPrice) : 0;

  const anticipatedMonths = useMemo(() => {
    if (!showAdvanceNotice || monthsCovered <= 0) return [];
    const months: string[] = [];
    let m = refMonth;
    let y = refYear;
    for (let i = 0; i < monthsCovered && i < 12; i++) {
      months.push(`${MONTHS_FR[m - 1]} ${y}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return months;
  }, [showAdvanceNotice, monthsCovered, refMonth, refYear]);

  const isMembershipCardPriceLocked = isMembershipCard && cardPrice > 0 && !!selectedCurrency;

  // ── Handle currency change ─────────────────────────────────────────────────
  const handleCurrencyChange = useCallback((currency: SupportedCurrency) => {
    setSelectedCurrency(currency);
    if (values.purpose === 'MEMBERSHIP_CARD' && cardPrice > 0) {
      setValues(prev => ({ ...prev, amount: cardPrice.toString() }));
    }
  }, [values.purpose, cardPrice]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isMembershipCardPriceLocked && amountNum !== cardPrice) {
      setModal({
        open: true,
        type: 'warning',
        title: 'Montant incorrect',
        body: (
          <span>
            Le montant de la carte membre doit être exactement{' '}
            <strong>{cardPrice.toLocaleString('fr-FR')} {selectedCurrency}</strong>.
            Veuillez corriger le montant.
          </span>
        ),
        confirmLabel: 'Corriger',
        onConfirm: () => {
          setValues(prev => ({ ...prev, amount: cardPrice.toString() }));
          setModal(m => ({ ...m, open: false }));
        },
      });
      return;
    }

    // 🎉 Capturer le motif et le payload AVANT l'appel async
    // (le parent peut démonter ce composant après onSubmit, la célébration ne s'afficherait jamais)
    const purposeSnapshot = values.purpose;
    const payload = {
      amount: amountNum,
      currency: selectedCurrency,
      depositedAt: values.depositedAt,
      method: values.method,
      note: values.note,
      purpose: purposeSnapshot,
      targetMemberId: paymentTarget === 'OTHER' && selectedMember ? selectedMember.id : undefined,
      monthReference: isQuota ? refMonth : undefined,
      yearReference: isQuota ? refYear : undefined,
    };

    // 🎉 Afficher la célébration IMMÉDIATEMENT, soumettre en arrière-plan depuis onClose
    setCelebrationPurpose(purposeSnapshot);
    setPendingPayload(payload);
    setShowCelebration(true);
  };

  const paddingLeftAmount = currencyMeta.prefix
    ? (currencyMeta.prefix.length > 2 ? '4.2rem' : '2.5rem')
    : '1rem';

  const isSubmitDisabled = isSubmitting || (paymentTarget === 'OTHER' && !selectedMember);

  return (
    <>
      <style>{`
        @keyframes smOverlayIn { from{opacity:0} to{opacity:1} }
        @keyframes smPanelIn { from{opacity:0;transform:scale(.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }

        .ccf-form { display: flex; flex-direction: column; gap: 1.25rem; font-family: 'DM Sans', sans-serif; }

        /* Tiers search */
        .ccf-target-tabs {
          display: flex; gap: 0.5rem; background: #F3F4F6; padding: 0.35rem; border-radius: 12px; margin-bottom: 0.5rem;
        }
        .ccf-target-tab {
          flex: 1; padding: 0.6rem; text-align: center; border-radius: 8px; border: none; background: transparent;
          font-size: 0.8rem; font-weight: 700; color: #6B7280; cursor: pointer; transition: all 0.2s;
        }
        .ccf-target-tab.active { background: white; color: #059669; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
        .ccf-search-box { position: relative; }
        .ccf-search-results {
          position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: white; z-index: 20;
          border-radius: 12px; border: 1px solid #E5E7EB; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          max-height: 220px; overflow-y: auto; padding: 0.5rem;
        }
        .ccf-search-item {
          padding: 0.6rem 0.8rem; border-radius: 8px; cursor: pointer; transition: background 0.15s;
          display: flex; flex-direction: column; gap: 0.2rem;
        }
        .ccf-search-item:hover { background: #F3F4F6; }
        .ccf-search-name { font-size: 0.82rem; font-weight: 700; color: #111827; }
        .ccf-search-meta { font-size: 0.7rem; color: #6B7280; }
        .ccf-selected-member {
          background: #ECFDF5; border: 1px solid #A7F3D0; padding: 0.85rem 1rem; border-radius: 12px;
          display: flex; justify-content: space-between; align-items: center;
        }

        .ccf-purpose-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.55rem;
        }

        .ccf-purpose-pill {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.3rem; padding: 0.75rem 0.5rem;
          border-radius: 12px; border: 1.5px solid rgba(5,150,105,0.15);
          background: rgba(255,255,255,0.7); cursor: pointer;
          transition: all 0.2s; text-align: center;
          font-family: 'DM Sans', sans-serif; box-sizing: border-box;
        }

        .ccf-purpose-pill:hover { border-color: rgba(5,150,105,0.4); background: #ECFDF5; }
        .ccf-purpose-pill.active {
          border-color: #059669; background: #ECFDF5;
          box-shadow: 0 0 0 3px rgba(5,150,105,0.1);
        }
        .ccf-purpose-pill.disabled {
          opacity: 0.45; cursor: not-allowed;
          border-color: rgba(0,0,0,0.08);
        }
        .ccf-purpose-emoji { font-size: 1.3rem; line-height: 1; }
        .ccf-purpose-label { font-size: 0.72rem; font-weight: 700; color: #1E293B; line-height: 1.2; }
        .ccf-purpose-desc { font-size: 0.62rem; color: #94A3B8; }

        .ccf-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .ccf-label {
          font-size: 0.7rem; font-weight: 800;
          letter-spacing: 0.08em; text-transform: uppercase; color: #059669;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ccf-label .ccf-opt {
          font-weight: 500; color: #94A3B8; text-transform: none;
          letter-spacing: 0; font-size: 0.65rem; margin-left: 0.3rem;
        }
        .ccf-label-badge {
          background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857;
          font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 99px;
          letter-spacing: 0; text-transform: none;
        }

        .ccf-input {
          height: 48px; border-radius: 12px;
          border: 1px solid rgba(5,150,105,0.25);
          background: rgba(255,255,255,0.9);
          padding: 0 1rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; color: #111827; outline: none; font-weight: 600;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          width: 100%; box-sizing: border-box; -webkit-appearance: none;
        }
        .ccf-input:focus { border-color: #059669; background: white; box-shadow: 0 0 0 3px rgba(5,150,105,0.15); }
        .ccf-input::placeholder { color: rgba(107,114,128,0.45); font-weight: 500; }
        .ccf-input:disabled { background: #F3F4F6; color: #6B7280; cursor: not-allowed; border-color: rgba(0,0,0,0.08); }

        .ccf-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
          appearance: none;
        }

        .ccf-row-montant-devise {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
          align-items: start;
        }
        @media (max-width: 560px) {
          .ccf-row-montant-devise { gap: 0.5rem; }
        }

        .ccf-amount-wrap { position: relative; }
        .ccf-amount-prefix {
          position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%);
          font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; color: #059669; font-weight: 700;
          pointer-events: none; white-space: nowrap;
        }
        .ccf-amount-input { font-family: 'Cormorant Garamond', serif !important; font-size: 1.1rem !important; font-weight: 700 !important; }

        /* Card price lock badge */
        .ccf-price-lock {
          background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: 10px;
          padding: 0.7rem 1rem;
          display: flex; align-items: center; gap: 0.6rem;
          font-size: 0.78rem; color: #047857; font-weight: 700;
        }
        .ccf-price-lock-icon {
          width: 28px; height: 28px; border-radius: 8px; background: #D1FAE5;
          display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0;
        }

        /* Anticipation info box */
        .ccf-anticipation-box {
          margin-top: 0.5rem; padding: 0.9rem 1rem; background: #EFF6FF; border: 1px solid #BFDBFE;
          border-radius: 12px; font-size: 0.76rem; color: #1D4ED8; line-height: 1.6;
        }
        .ccf-anticipation-months {
          display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.6rem;
        }
        .ccf-month-pill {
          background: #DBEAFE; border: 1px solid #BFDBFE; border-radius: 99px;
          padding: 0.2rem 0.6rem; font-size: 0.68rem; font-weight: 800; color: #1D4ED8;
        }

        /* Month ref section */
        .ccf-month-ref-section {
          background: rgba(5,150,105,0.04); border: 1px solid rgba(5,150,105,0.15);
          border-radius: 12px; padding: 0.9rem 1rem;
        }

        .ccf-info-box {
          margin-top: 0.5rem; padding: 0.85rem 1rem; background: #EFF6FF; border: 1px solid #BFDBFE;
          border-radius: 12px; display: flex; gap: 0.65rem; align-items: flex-start;
          font-size: 0.76rem; color: #1D4ED8; line-height: 1.5;
        }

        .ccf-method-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
        @media (max-width: 640px) { .ccf-method-row { grid-template-columns: repeat(2, 1fr); } }

        .ccf-method-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.35rem; padding: 0.75rem 0.3rem; min-height: 65px;
          border-radius: 14px; border: 1.5px solid #E2E8F0;
          background: white; color: #64748B; font-weight: 700; font-size: 0.7rem;
          cursor: pointer; transition: all 0.2s ease;
        }
        .ccf-method-btn svg { width: 22px; height: 22px; transition: transform 0.2s ease; stroke-width: 2; }

        .ccf-method-btn.cash:hover { border-color: #A7F3D0; background: #ECFDF5; color: #059669; }
        .ccf-method-btn.cash.active { border-color: #10B981; background: rgba(16,185,129,0.08); color: #047857; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
        .ccf-method-btn.cash.active svg { transform: scale(1.1); color: #10B981; }

        .ccf-method-btn.bank:hover { border-color: #BFDBFE; background: #EFF6FF; color: #2563EB; }
        .ccf-method-btn.bank.active { border-color: #3B82F6; background: rgba(59,130,246,0.08); color: #1D4ED8; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .ccf-method-btn.bank.active svg { transform: scale(1.1); color: #3B82F6; }

        .ccf-method-btn.mobile:hover { border-color: #FDE68A; background: #FFFBEB; color: #D97706; }
        .ccf-method-btn.mobile.active { border-color: #F59E0B; background: rgba(245,158,11,0.08); color: #B45309; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
        .ccf-method-btn.mobile.active svg { transform: scale(1.1); color: #F59E0B; }

        .ccf-method-btn.card:hover { border-color: #99F6E4; background: #F0FDFA; color: #0D9488; }
        .ccf-method-btn.card.active { border-color: #14B8A6; background: rgba(20,184,166,0.08); color: #0F766E; box-shadow: 0 0 0 3px rgba(20,184,166,0.15); }
        .ccf-method-btn.card.active svg { transform: scale(1.1); color: #14B8A6; }

        .ccf-card-payment-section { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; padding: 1.25rem; margin-top: 0.5rem; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .ccf-wallet-row { display: flex; gap: 0.75rem; margin-bottom: 1.25rem; }
        .ccf-wallet-btn { flex: 1; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; cursor: pointer; transition: opacity 0.2s, transform 0.1s; border: none; font-size: 0.9rem; font-weight: 600; }
        .ccf-wallet-btn:active { transform: scale(0.98); }
        .ccf-wallet-btn.apple { background: #000; color: #fff; }
        .ccf-wallet-btn.google { background: #fff; color: #3c4043; border: 1px solid #dadce0; box-shadow: 0 1px 2px 0 rgba(60,64,67,0.3); }
        .ccf-wallet-btn:hover { opacity: 0.85; }
        .ccf-divider { display: flex; align-items: center; text-align: center; margin: 1rem 0; color: #9CA3AF; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .ccf-divider::before, .ccf-divider::after { content: ''; flex: 1; border-bottom: 1px solid #E2E8F0; }
        .ccf-divider:not(:empty)::before { margin-right: .75em; }
        .ccf-divider:not(:empty)::after { margin-left: .75em; }
        .ccf-card-input-group { position: relative; margin-bottom: 0.75rem; }
        .ccf-card-input-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; }
        .ccf-card-input { width: 100%; height: 46px; border-radius: 10px; border: 1px solid #CBD5E1; padding: 0 1rem 0 2.8rem; font-size: 0.9rem; font-family: 'DM Mono', monospace; outline: none; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box; }
        .ccf-card-input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5,150,105,0.1); }
        .ccf-card-input.no-icon { padding-left: 1rem; font-family: 'DM Sans', sans-serif; }

        .ccf-submit {
          width: 100%; height: 52px;
          background: linear-gradient(135deg, #047857, #059669, #10B981);
          background-size: 200%; background-position: 0%;
          border: none; border-radius: 13px; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 800;
          letter-spacing: 0.05em; text-transform: uppercase;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          box-shadow: 0 4px 18px rgba(5,150,105,0.3);
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.3s;
        }
        .ccf-submit:hover:not(:disabled) { background-position: 100%; box-shadow: 0 8px 26px rgba(5,150,105,0.42); transform: translateY(-1px); }
        .ccf-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .ccf-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: ccfspin 0.7s linear infinite; }
        @keyframes ccfspin { to { transform: rotate(360deg); } }

        /* ── Célébration ── */
        @keyframes ccf-emoji-bounce {
          from { opacity: 0; transform: scale(0) translateY(20px) rotate(-15deg); }
          to   { opacity: 1; transform: scale(1) translateY(0)     rotate(0deg); }
        }
        @keyframes ccf-sparkle {
          from { opacity: 0.4; transform: scale(0.8) rotate(-10deg); }
          to   { opacity: 1;   transform: scale(1.2) rotate(10deg);  }
        }
        @keyframes ccf-fall-0 { 0%{transform:translateY(0) rotate(0deg) scaleX(1)} 100%{transform:translateY(110vh) rotate(720deg) scaleX(0.5);opacity:0} }
        @keyframes ccf-fall-1 { 0%{transform:translateY(0) rotate(0deg)} 100%{transform:translateY(110vh) rotate(-540deg) translateX(40px);opacity:0} }
        @keyframes ccf-fall-2 { 0%{transform:translateY(0) scaleY(1)} 100%{transform:translateY(110vh) scaleY(0.3) translateX(-30px) rotate(360deg);opacity:0} }
        @keyframes ccf-fall-3 { 0%{transform:translateY(0) rotate(45deg)} 100%{transform:translateY(110vh) rotate(900deg) translateX(20px);opacity:0} }
        @keyframes ccf-fall-4 { 0%{transform:translateY(0)} 100%{transform:translateY(110vh) rotate(-720deg) scaleX(0.4);opacity:0} }
        @keyframes ccf-fall-5 { 0%{transform:translateY(0) rotate(-45deg)} 100%{transform:translateY(110vh) rotate(540deg) translateX(-20px);opacity:0} }
      `}</style>

      {/* Smart Modal */}
      <SmartModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        body={modal.body}
        confirmLabel={modal.confirmLabel}
        cancelLabel={modal.cancelLabel}
        onConfirm={modal.onConfirm}
        onClose={() => setModal(m => ({ ...m, open: false }))}
      />

      <form className="ccf-form" onSubmit={handleSubmit}>

        {/* ── Pour qui ? ── */}
        <div className="ccf-field">
          <span className="ccf-label">Pour qui effectuez-vous ce versement ?</span>
          <div className="ccf-target-tabs">
            <button type="button" className={`ccf-target-tab ${paymentTarget === 'ME' ? 'active' : ''}`} onClick={() => { setPaymentTarget('ME'); setSelectedMember(null); setSearchQuery(''); setSearchResults([]); }}>
              Pour moi-même
            </button>
            <button type="button" className={`ccf-target-tab ${paymentTarget === 'OTHER' ? 'active' : ''}`} onClick={() => setPaymentTarget('OTHER')}>
              Pour un autre membre
            </button>
          </div>

          {paymentTarget === 'OTHER' && (
            <div className="ccf-search-box">
              {selectedMember ? (
                <div className="ccf-selected-member">
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065F46' }}>{selectedMember.firstName} {selectedMember.lastName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#047857' }}>{selectedMember.email || selectedMember.phone}</div>
                  </div>
                  <button type="button" onClick={() => { setSelectedMember(null); setSearchQuery(''); setSearchResults([]); }} style={{ background: 'white', border: '1px solid #A7F3D0', padding: '0.4rem 0.7rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, color: '#059669', cursor: 'pointer' }}>
                    Changer
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    className="ccf-input"
                    placeholder="Chercher par nom, prénom, email ou téléphone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && visibleResults.length > 0 && (
                    <div className="ccf-search-results">
                      {visibleResults.map(m => (
                        <div key={m.id} className="ccf-search-item" onClick={() => setSelectedMember(m)}>
                          <span className="ccf-search-name">{m.firstName} {m.lastName}</span>
                          <span className="ccf-search-meta">{[m.email, m.phone].filter(Boolean).join(' • ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery && visibleResults.length === 0 && !isSearching && (
                    <div className="ccf-search-results" style={{ padding: '1rem', textAlign: 'center', color: '#6B7280', fontSize: '0.8rem' }}>
                      Aucun membre actif trouvé
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Motif ── */}
        <div className="ccf-field">
          <span className="ccf-label">Motif du versement</span>
          <div className="ccf-purpose-grid">
            {PURPOSES.map((p) => {
              const isLateDisabled = p.value === 'LATE_QUOTA' && hasLateMonths === false;
              return (
                <button
                  key={p.value}
                  type="button"
                  className={`ccf-purpose-pill${values.purpose === p.value ? ' active' : ''}${isLateDisabled ? ' disabled' : ''}`}
                  onClick={() => !isLateDisabled && handlePurposeSelect(p.value)}
                  title={isLateDisabled ? 'Aucun retard détecté sur votre compte' : undefined}
                >
                  <span className="ccf-purpose-emoji">{p.icon}</span>
                  <span className="ccf-purpose-label">{p.label}</span>
                  <span className="ccf-purpose-desc">{p.desc}</span>
                  {isLateDisabled && (
                    <span style={{ fontSize: '0.58rem', color: '#EF4444', fontWeight: 700, marginTop: '0.1rem' }}>Aucun retard</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Mois de référence ── */}
        {isQuota && (
          <div className="ccf-field">
            <span className="ccf-label">
              Mois de référence
              <span className="ccf-label-badge">Mois concerné</span>
            </span>
            <div className="ccf-month-ref-section">
              <MonthYearPicker
                month={refMonth}
                year={refYear}
                onChange={(m, y) => { setRefMonth(m); setRefYear(y); }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#6B7280', lineHeight: 1.5 }}>
                Sélectionnez le mois pour lequel ce paiement est effectué.
                {showAdvanceNotice && monthsCovered > 1 && (
                  <> Le paiement sera automatiquement réparti sur <strong>{monthsCovered} mois</strong> à partir de ce mois.</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Montant + Devise ── */}
        <div className="ccf-row-montant-devise">
          {/* Montant */}
          <div className="ccf-field">
            <span className="ccf-label">
              Montant
              {isMembershipCardPriceLocked && (
                <span className="ccf-label-badge">🔒 Prix fixé</span>
              )}
            </span>

            {isMembershipCardPriceLocked ? (
              <div className="ccf-price-lock">
                <div className="ccf-price-lock-icon">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: '#065F46' }}>
                    {cardPrice.toLocaleString('fr-FR')} {selectedCurrency}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '0.1rem' }}>
                    Montant fixé par l&apos;administrateur
                  </div>
                </div>
              </div>
            ) : (
              <div className="ccf-amount-wrap">
                {currencyMeta.prefix && (
                  <span className="ccf-amount-prefix">{currencyMeta.prefix}</span>
                )}
                <input
                  type="number"
                  className="ccf-input ccf-amount-input"
                  style={{ paddingLeft: paddingLeftAmount }}
                  placeholder="0"
                  value={values.amount}
                  min={0}
                  step="any"
                  required
                  onChange={(e) => setValues(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            )}
          </div>

          {/* Devise */}
          <div className="ccf-field">
            <span className="ccf-label">Devise</span>
            <select
              className="ccf-input ccf-select"
              value={selectedCurrency}
              required
              onChange={(e) => handleCurrencyChange(e.target.value as SupportedCurrency)}
            >
              <option value="" disabled>Choisir…</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GNF">Franc guinéen (GNF)</option>
              <option value="USD">Dollar (USD)</option>
              <option value="XOF">Franc CFA (XOF)</option>
            </select>
          </div>
        </div>

        {/* ── Anticipation notice ── */}
        {showAdvanceNotice && monthsCovered > 0 && (
          <div className="ccf-anticipation-box">
            <div style={{ fontWeight: 800, marginBottom: '0.3rem' }}>
              💡 Paiement anticipé détecté — {monthsCovered} mois couverts
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              Votre paiement de <strong>{amountNum.toLocaleString('fr-FR')} {selectedCurrency}</strong> sera
              automatiquement réparti sur <strong>{monthsCovered} mois</strong> à raison de{' '}
              <strong>{monthlyPrice.toLocaleString('fr-FR')} {selectedCurrency}</strong>/mois :
            </div>
            <div className="ccf-anticipation-months">
              {anticipatedMonths.map((m) => (
                <span key={m} className="ccf-month-pill">{m}</span>
              ))}
              {amountNum % monthlyPrice !== 0 && (
                <span className="ccf-month-pill" style={{ background: '#FEF3C7', borderColor: '#FDE68A', color: '#B45309' }}>
                  + reste de {(amountNum % monthlyPrice).toLocaleString('fr-FR')} {selectedCurrency}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Date de paiement ── */}
        <div className="ccf-field">
          <span className="ccf-label">Date du paiement</span>
          <input
            type="date"
            className="ccf-input"
            value={values.depositedAt}
            onChange={(e) => setValues(prev => ({ ...prev, depositedAt: e.target.value }))}
          />
        </div>

        {/* ── Méthode de paiement ── */}
        <div className="ccf-field">
          <span className="ccf-label">Mode de paiement</span>
          <div className="ccf-method-row">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`ccf-method-btn ${m.colorClass}${values.method === m.value ? ' active' : ''}`}
                onClick={() => setValues(prev => ({ ...prev, method: m.value }))}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card details ── */}
        {values.method === 'CARD' && (
          <div className="ccf-card-payment-section">
            <div className="ccf-wallet-row">
              <button type="button" className="ccf-wallet-btn apple">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                Apple Pay
              </button>
              <button type="button" className="ccf-wallet-btn google">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google Pay
              </button>
            </div>
            <div className="ccf-divider">ou payer par carte</div>
            <div className="ccf-card-input-group">
              <span className="ccf-card-input-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </span>
              <input type="text" className="ccf-card-input" placeholder="Nom sur la carte" value={cardName} onChange={e => setCardName(e.target.value)} />
            </div>
            <div className="ccf-card-input-group">
              <span className="ccf-card-input-icon">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </span>
              <input type="text" className="ccf-card-input" placeholder="1234 5678 9012 3456" maxLength={19} value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="ccf-card-input-group" style={{ marginBottom: 0 }}>
                <input type="text" className="ccf-card-input no-icon" placeholder="MM/AA" maxLength={5} value={cardExpiry} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setCardExpiry(v.length >= 2 ? v.slice(0,2) + '/' + v.slice(2) : v); }} />
              </div>
              <div className="ccf-card-input-group" style={{ marginBottom: 0 }}>
                <input type="text" className="ccf-card-input no-icon" placeholder="CVV" maxLength={4} value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          </div>
        )}

        {/* ── Note ── */}
        <div className="ccf-field">
          <span className="ccf-label">
            Note <span className="ccf-opt">(optionnel)</span>
          </span>
          <input
            type="text"
            className="ccf-input"
            placeholder="Commentaire libre pour l'administrateur…"
            value={values.note}
            onChange={(e) => setValues(prev => ({ ...prev, note: e.target.value }))}
          />
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          className="ccf-submit"
          disabled={isSubmitDisabled}
        >
          {isSubmitting ? (
            <>
              <div className="ccf-spinner" />
              Envoi en cours…
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Soumettre le versement
            </>
          )}
        </button>
      </form>

      {/* 🎉 Célébration post-soumission */}
      {showCelebration && (
        <CelebrationOverlay
          purpose={celebrationPurpose}
          onClose={() => {
            setShowCelebration(false);
            // Soumettre le payload au parent une fois la célébration fermée
            if (pendingPayload) {
              void onSubmit(pendingPayload);
              setPendingPayload(null);
            }
          }}
        />
      )}
    </>
  );
}