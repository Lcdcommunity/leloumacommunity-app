'use client';
// web/components/admin/AdminContributionCreateForm.tsx
//
// v3.0 — 🔥 CORRIGÉ (ESLint react-hooks/set-state-in-effect) : l'effet de
// recherche appelait setResults([]) de façon synchrone dans son corps.
// Réécrit sur le même principe que ContributionCreateForm.tsx (membre) :
// l'effet ne fait plus que déclencher la recherche debouncée, jamais de
// setState synchrone ; la liste affichée ("visibleResults") est dérivée
// via useMemo à partir de searchQuery/member/results.
// 🔥 AJOUT : option "Carte membre annuelle" désactivée si le membre
// sélectionné a déjà une carte valide (member.hasValidMembershipCard,
// renvoyé par searchTargetMembersAdmin) — empêche de sélectionner ce motif
// pour un membre déjà couvert, en plus du blocage serveur.

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api-client';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const PURPOSES = [
  { value: 'REGULAR_QUOTA', label: 'Cotisation régulière', icon: '📅', desc: 'Mois en cours' },
  { value: 'LATE_QUOTA', label: 'Paiement retards', icon: '⏳', desc: 'Rattrapage des mois non payés' },
  { value: 'MEMBERSHIP_CARD', label: 'Carte membre annuelle', icon: '💳', desc: 'Règlement de la carte' },
  { value: 'DONATION', label: 'Don libre', icon: '🤝', desc: 'Contribution volontaire' },
];

const METHODS = [
  {
    value: 'CASH', label: 'Espèces', colorClass: 'cash',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    value: 'BANK_TRANSFER', label: 'Virement', colorClass: 'bank',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    value: 'MOBILE_MONEY', label: 'Mobile Money', colorClass: 'mobile',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    value: 'CARD', label: 'Carte Bancaire', colorClass: 'card',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="5" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="2" y1="10" x2="22" y2="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function getCurrencyMeta(currency: string) {
  switch (currency) {
    case 'GNF': return { prefix: 'FG', label: 'Franc guinéen (GNF)' };
    case 'XOF': return { prefix: 'F CFA', label: 'Franc CFA (XOF)' };
    case 'USD': return { prefix: '$', label: 'Dollar américain (USD)' };
    case 'EUR': return { prefix: '€', label: 'Euro (EUR)' };
    case 'GBP': return { prefix: '£', label: 'Livre sterling (GBP)' };
    case 'CHF': return { prefix: 'CHF', label: 'Franc suisse (CHF)' };
    case 'CAD': return { prefix: 'CA$', label: 'Dollar canadien (CAD)' };
    default: return { prefix: '', label: 'Devise' };
  }
}

export interface AdminTargetMemberResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  antennaId?: string | null;
  antennaName?: string | null;
  currency?: string | null;
  monthlyQuota?: number | null;
  membershipCardPrice?: number | null;
  hasValidMembershipCard?: boolean;
  membershipCardExpiresAt?: string | null;
  lateMonths?: number;
  earliestUnpaidMonth?: number | null;
  earliestUnpaidYear?: number | null;
}

export interface AdminContributionValues {
  memberId: string;
  amount: number;
  currency: string;
  method: string;
  depositedAt: string;
  note: string;
  purpose: string;
  monthReference?: number;
  yearReference?: number;
}

interface Props {
  onSubmit: (values: AdminContributionValues) => Promise<void>;
  isSubmitting?: boolean;
}

export function AdminContributionCreateForm({ onSubmit, isSubmitting }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<AdminTargetMemberResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [member, setMember] = useState<AdminTargetMemberResult | null>(null);

  const [purpose, setPurpose] = useState('REGULAR_QUOTA');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [depositedAt, setDepositedAt] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const now = new Date();
  const [refMonth, setRefMonth] = useState(now.getMonth() + 1);
  const [refYear, setRefYear] = useState(now.getFullYear());

  // 🔥 CORRIGÉ : plus de setState synchrone dans le corps de l'effet — il
  // ne fait que lancer la recherche debouncée. La liste affichée est
  // dérivée ci-dessous via useMemo (même pattern que ContributionCreateForm.tsx).
  useEffect(() => {
    if (!searchQuery || member) return;
    const t = setTimeout(() => {
      setSearching(true);
      api.searchTargetMembersAdmin(searchQuery)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, member]);

  const visibleResults = useMemo(
    () => (searchQuery && !member ? results : []),
    [searchQuery, member, results],
  );

  const selectMember = (m: AdminTargetMemberResult) => {
    setMember(m);
    setResults([]);
    setSearchQuery('');
    if (m.earliestUnpaidMonth && m.earliestUnpaidYear) {
      setRefMonth(m.earliestUnpaidMonth);
      setRefYear(m.earliestUnpaidYear);
    }
    if (purpose === 'MEMBERSHIP_CARD') {
      if (m.hasValidMembershipCard) {
        // Ce membre a déjà une carte valide : on ne laisse pas ce motif
        // pré-sélectionné, retour sur la cotisation régulière.
        setPurpose('REGULAR_QUOTA');
        setAmount('');
      } else if (m.membershipCardPrice) {
        setAmount(String(m.membershipCardPrice));
      }
    }
  };

  const handlePurposeSelect = (p: string) => {
    if (p === 'MEMBERSHIP_CARD' && member?.hasValidMembershipCard) return;
    setPurpose(p);
    if (p === 'MEMBERSHIP_CARD' && member?.membershipCardPrice) {
      setAmount(String(member.membershipCardPrice));
    }
  };

  const isQuota = purpose === 'REGULAR_QUOTA' || purpose === 'LATE_QUOTA';
  const isMembershipCard = purpose === 'MEMBERSHIP_CARD';
  const currency = member?.currency || '';
  const currencyMeta = useMemo(() => getCurrencyMeta(currency), [currency]);
  const amountNum = Number(amount);
  const cardPrice = member?.membershipCardPrice || 0;
  const isCardPriceLocked = isMembershipCard && cardPrice > 0;
  const isCardAmountTooLow = isMembershipCard && cardPrice > 0 && amountNum > 0 && amountNum < cardPrice;
  const cardBlocked = !!member?.hasValidMembershipCard;
  const cardExpiryLabel = member?.membershipCardExpiresAt
    ? new Date(member.membershipCardExpiresAt).toLocaleDateString('fr-FR')
    : null;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  const isSubmitDisabled =
    isSubmitting ||
    !member ||
    !amountNum ||
    amountNum <= 0 ||
    isCardAmountTooLow ||
    (isMembershipCard && cardBlocked);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled || !member) return;
    await onSubmit({
      memberId: member.id,
      amount: amountNum,
      currency,
      method,
      depositedAt,
      note,
      purpose,
      monthReference: isQuota ? refMonth : undefined,
      yearReference: isQuota ? refYear : undefined,
    });
  };

  const paddingLeftAmount = currencyMeta.prefix
    ? (currencyMeta.prefix.length > 2 ? '4.2rem' : '2.5rem')
    : '1rem';

  return (
    <>
      <style>{`
        .acf-form, .acf-form *, .acf-form *::before, .acf-form *::after {
          box-sizing: border-box;
        }
        .acf-form { display: flex; flex-direction: column; gap: 1.25rem; font-family: 'DM Sans', sans-serif; width: 100%; }

        .acf-search-box { position: relative; width: 100%; }
        .acf-search-input {
          width: 100%; height: 48px; border-radius: 12px;
          border: 1px solid rgba(5,150,105,0.25);
          background: rgba(255,255,255,0.9);
          padding: 0 1rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; color: #111827; outline: none; font-weight: 600;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .acf-search-input:focus { border-color: #059669; background: white; box-shadow: 0 0 0 3px rgba(5,150,105,0.15); }
        .acf-search-input::placeholder { color: rgba(107,114,128,0.45); font-weight: 500; }
        .acf-search-results {
          position: absolute; top: calc(100% + 5px); left: 0; right: 0; background: white; z-index: 20;
          border-radius: 12px; border: 1px solid #E5E7EB; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          max-height: 220px; overflow-y: auto; padding: 0.5rem;
        }
        .acf-search-item {
          padding: 0.6rem 0.8rem; border-radius: 8px; cursor: pointer; transition: background 0.15s;
          display: flex; flex-direction: column; gap: 0.2rem;
        }
        .acf-search-item:hover { background: #F3F4F6; }
        .acf-search-name { font-size: 0.82rem; font-weight: 700; color: #111827; }
        .acf-search-meta { font-size: 0.7rem; color: #6B7280; }
        .acf-search-empty {
          padding: 1rem; text-align: center; color: #6B7280; font-size: 0.8rem;
        }
        .acf-selected-member {
          background: #ECFDF5; border: 1px solid #A7F3D0; padding: 0.85rem 1rem; border-radius: 12px;
          display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
        }
        .acf-selected-member-info { min-width: 0; }
        .acf-selected-member-name { font-size: 0.82rem; font-weight: 700; color: #065F46; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .acf-selected-member-meta { font-size: 0.7rem; color: #047857; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .acf-selected-member-sub { font-size: 0.68rem; color: #059669; margin-top: 0.15rem; }
        .acf-change-btn {
          flex-shrink: 0; background: white; border: 1px solid #A7F3D0; padding: 0.4rem 0.7rem;
          border-radius: 8px; font-size: 0.7rem; font-weight: 700; color: #059669; cursor: pointer;
        }

        .acf-purpose-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.55rem; }
        .acf-purpose-pill {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.3rem; padding: 0.75rem 0.5rem;
          border-radius: 12px; border: 1.5px solid rgba(5,150,105,0.15);
          background: rgba(255,255,255,0.7); cursor: pointer;
          transition: all 0.2s; text-align: center;
          font-family: 'DM Sans', sans-serif;
        }
        .acf-purpose-pill:hover { border-color: rgba(5,150,105,0.4); background: #ECFDF5; }
        .acf-purpose-pill.active {
          border-color: #059669; background: #ECFDF5;
          box-shadow: 0 0 0 3px rgba(5,150,105,0.1);
        }
        .acf-purpose-pill.disabled { opacity: 0.45; cursor: not-allowed; border-color: rgba(0,0,0,0.08); }
        .acf-purpose-emoji { font-size: 1.3rem; line-height: 1; }
        .acf-purpose-label { font-size: 0.72rem; font-weight: 700; color: #1E293B; line-height: 1.2; }
        .acf-purpose-desc { font-size: 0.62rem; color: #94A3B8; }
        .acf-purpose-blocked { font-size: 0.58rem; color: #DC2626; font-weight: 700; margin-top: 0.1rem; }

        .acf-field { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; min-width: 0; }
        .acf-label {
          font-size: 0.7rem; font-weight: 800;
          letter-spacing: 0.08em; text-transform: uppercase; color: #059669;
          display: flex; align-items: center; justify-content: space-between; gap: 0.4rem;
        }
        .acf-label .acf-opt {
          font-weight: 500; color: #94A3B8; text-transform: none;
          letter-spacing: 0; font-size: 0.65rem; margin-left: 0.3rem;
        }
        .acf-label-badge {
          background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857;
          font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 99px;
          letter-spacing: 0; text-transform: none; white-space: nowrap;
        }

        .acf-input {
          height: 48px; border-radius: 12px;
          border: 1px solid rgba(5,150,105,0.25);
          background: rgba(255,255,255,0.9);
          padding: 0 1rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; color: #111827; outline: none; font-weight: 600;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          width: 100%; -webkit-appearance: none;
        }
        .acf-input:focus { border-color: #059669; background: white; box-shadow: 0 0 0 3px rgba(5,150,105,0.15); }
        .acf-input:disabled { background: #F3F4F6; color: #6B7280; cursor: not-allowed; }

        .acf-month-picker { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
        .acf-select {
          width: 100%; height: 48px; border-radius: 12px;
          border: 1px solid rgba(5,150,105,0.25);
          background: rgba(255,255,255,0.9);
          padding: 0 2.5rem 0 1rem;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; font-weight: 600; color: #111827;
          outline: none; cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          appearance: none;
        }
        .acf-month-ref-section {
          background: rgba(5,150,105,0.04); border: 1px solid rgba(5,150,105,0.15);
          border-radius: 12px; padding: 0.9rem 1rem;
        }
        .acf-month-hint { margin-top: 0.5rem; font-size: 0.7rem; color: #D97706; line-height: 1.5; font-weight: 700; }

        .acf-row-montant-devise {
          display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; align-items: start; width: 100%;
        }
        @media (max-width: 480px) {
          .acf-row-montant-devise { grid-template-columns: 1fr; }
        }

        .acf-amount-wrap { position: relative; width: 100%; }
        .acf-amount-prefix {
          position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%);
          font-family: 'Cormorant Garamond', serif; font-size: 1.1rem; color: #059669; font-weight: 700;
          pointer-events: none; white-space: nowrap;
        }
        .acf-amount-input { font-family: 'Cormorant Garamond', serif !important; font-size: 1.1rem !important; font-weight: 700 !important; }

        .acf-price-lock {
          background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: 10px;
          padding: 0.7rem 0.9rem; height: 48px;
          display: flex; align-items: center; gap: 0.55rem;
          font-size: 0.78rem; color: #047857; font-weight: 700; width: 100%;
        }
        .acf-price-lock-icon {
          width: 26px; height: 26px; border-radius: 8px; background: #D1FAE5;
          display: flex; align-items: center; justify-content: center; color: #059669; flex-shrink: 0;
        }
        .acf-price-lock-main { min-width: 0; overflow: hidden; }
        .acf-price-lock-title { font-family: 'Cormorant Garamond', serif; font-size: 0.98rem; font-weight: 700; color: #065F46; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .acf-price-lock-sub { font-size: 0.63rem; color: #059669; margin-top: 0.05rem; white-space: normal; line-height: 1.3; }
        .acf-currency-empty {
          height: 48px; border-radius: 12px; border: 1px solid #E2E8F0;
          display: flex; align-items: center; padding: 0 1rem;
          font-size: 0.76rem; color: #9CA3AF; font-weight: 500; width: 100%;
        }

        .acf-blocked-box {
          background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;
          padding: 0.85rem 1rem; display: flex; gap: 0.6rem; align-items: flex-start;
          font-size: 0.78rem; color: #991B1B; line-height: 1.55;
        }

        .acf-method-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; width: 100%; }
        @media (max-width: 480px) { .acf-method-row { grid-template-columns: repeat(2, 1fr); } }
        .acf-method-btn {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 0.35rem; padding: 0.75rem 0.3rem; min-height: 65px; width: 100%;
          border-radius: 14px; border: 1.5px solid #E2E8F0;
          background: white; color: #64748B; font-weight: 700; font-size: 0.7rem;
          cursor: pointer; transition: all 0.2s ease;
        }
        .acf-method-btn svg { width: 22px; height: 22px; stroke-width: 2; }
        .acf-method-btn.cash.active { border-color: #10B981; background: rgba(16,185,129,0.08); color: #047857; box-shadow: 0 0 0 3px rgba(16,185,129,0.15); }
        .acf-method-btn.bank.active { border-color: #3B82F6; background: rgba(59,130,246,0.08); color: #1D4ED8; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .acf-method-btn.mobile.active { border-color: #F59E0B; background: rgba(245,158,11,0.08); color: #B45309; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
        .acf-method-btn.card.active { border-color: #14B8A6; background: rgba(20,184,166,0.08); color: #0F766E; box-shadow: 0 0 0 3px rgba(20,184,166,0.15); }

        .acf-warning {
          font-size: 0.7rem; color: #DC2626; font-weight: 700; margin-top: 0.3rem;
        }

        .acf-submit {
          width: 100%; height: 52px;
          background: linear-gradient(135deg, #047857, #059669, #10B981);
          border: none; border-radius: 13px; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 800;
          letter-spacing: 0.05em; text-transform: uppercase;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          box-shadow: 0 4px 18px rgba(5,150,105,0.3);
          transition: box-shadow 0.3s, transform 0.15s;
        }
        .acf-submit:hover:not(:disabled) { box-shadow: 0 8px 26px rgba(5,150,105,0.42); transform: translateY(-1px); }
        .acf-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .acf-spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: acfspin 0.7s linear infinite; }
        @keyframes acfspin { to { transform: rotate(360deg); } }
      `}</style>

      <form className="acf-form" onSubmit={handleSubmit}>

        {/* ── Membre bénéficiaire ── */}
        <div className="acf-field">
          <span className="acf-label">Membre bénéficiaire</span>
          {member ? (
            <div className="acf-selected-member">
              <div className="acf-selected-member-info">
                <div className="acf-selected-member-name">{member.firstName} {member.lastName}</div>
                <div className="acf-selected-member-meta">{member.email || member.phone}</div>
                {(member.antennaName || member.currency || (member.lateMonths ?? 0) > 0) && (
                  <div className="acf-selected-member-sub">
                    {member.antennaName ? `Antenne ${member.antennaName}` : ''}
                    {member.currency ? ` · devise ${member.currency}` : ''}
                    {(member.lateMonths ?? 0) > 0 ? ` · ${member.lateMonths} mois de retard` : ''}
                  </div>
                )}
              </div>
              <button type="button" className="acf-change-btn" onClick={() => setMember(null)}>
                Changer
              </button>
            </div>
          ) : (
            <div className="acf-search-box">
              <input
                type="text"
                className="acf-search-input"
                placeholder="Chercher par nom, prénom, email ou téléphone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && visibleResults.length > 0 && (
                <div className="acf-search-results">
                  {visibleResults.map((m) => (
                    <div key={m.id} className="acf-search-item" onClick={() => selectMember(m)}>
                      <span className="acf-search-name">{m.firstName} {m.lastName}</span>
                      <span className="acf-search-meta">
                        {[m.antennaName, m.email, m.phone].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery && !searching && visibleResults.length === 0 && (
                <div className="acf-search-results">
                  <div className="acf-search-empty">Aucun membre actif trouvé dans votre périmètre.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Motif ── */}
        <div className="acf-field">
          <span className="acf-label">Motif du versement</span>
          <div className="acf-purpose-grid">
            {PURPOSES.map((p) => {
              const isCardDisabled = p.value === 'MEMBERSHIP_CARD' && cardBlocked;
              return (
                <button
                  key={p.value}
                  type="button"
                  className={`acf-purpose-pill${purpose === p.value ? ' active' : ''}${isCardDisabled ? ' disabled' : ''}`}
                  onClick={() => handlePurposeSelect(p.value)}
                  title={isCardDisabled ? `Carte déjà valide${cardExpiryLabel ? ` jusqu'au ${cardExpiryLabel}` : ''}` : undefined}
                >
                  <span className="acf-purpose-emoji">{p.icon}</span>
                  <span className="acf-purpose-label">{p.label}</span>
                  <span className="acf-purpose-desc">{p.desc}</span>
                  {isCardDisabled && <span className="acf-purpose-blocked">Déjà valide</span>}
                </button>
              );
            })}
          </div>
          {isMembershipCard && cardBlocked && (
            <div className="acf-blocked-box">
              ⚠️ {member?.firstName} {member?.lastName} a déjà une carte membre valide
              {cardExpiryLabel ? ` jusqu'au ${cardExpiryLabel}` : ''}. Choisissez un autre motif.
            </div>
          )}
        </div>

        {/* ── Mois de référence ── */}
        {isQuota && (
          <div className="acf-field">
            <span className="acf-label">
              Mois de référence
              <span className="acf-label-badge">Mois concerné</span>
            </span>
            <div className="acf-month-ref-section">
              <div className="acf-month-picker">
                <select className="acf-select" value={refMonth} onChange={(e) => setRefMonth(Number(e.target.value))}>
                  {MONTHS_FR.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <select className="acf-select" value={refYear} onChange={(e) => setRefYear(Number(e.target.value))}>
                  {years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {member?.earliestUnpaidMonth && refMonth === member.earliestUnpaidMonth && refYear === member.earliestUnpaidYear && (
                <p className="acf-month-hint">
                  💡 Pré-rempli sur le plus ancien mois impayé de ce membre ({MONTHS_FR[member.earliestUnpaidMonth - 1]} {member.earliestUnpaidYear}), pour rattraper son retard en premier. Changez-le si besoin.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Montant + Devise ── */}
        <div className="acf-row-montant-devise">
          <div className="acf-field">
            <span className="acf-label">
              Montant
              {isCardPriceLocked && <span className="acf-label-badge">🔒 Prix fixé</span>}
            </span>
            <div className="acf-amount-wrap">
              {currencyMeta.prefix && <span className="acf-amount-prefix">{currencyMeta.prefix}</span>}
              <input
                type="number"
                className="acf-input acf-amount-input"
                style={{ paddingLeft: paddingLeftAmount }}
                placeholder="0"
                value={amount}
                min={0}
                step="any"
                required
                disabled={isMembershipCard && cardBlocked}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {isCardPriceLocked && !cardBlocked && (
              <span style={{ fontSize: '0.65rem', color: '#059669' }}>
                Prix fixé par l&apos;administrateur : {cardPrice.toLocaleString('fr-FR')} {currency}
              </span>
            )}
            {isCardAmountTooLow && (
              <span className="acf-warning">Le montant minimum pour la carte membre est {cardPrice.toLocaleString('fr-FR')} {currency}.</span>
            )}
          </div>

          <div className="acf-field">
            <span className="acf-label">Devise</span>
            {currency ? (
              <div className="acf-price-lock">
                <div className="acf-price-lock-icon">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="acf-price-lock-main">
                  <div className="acf-price-lock-title">{currencyMeta.label}</div>
                  <div className="acf-price-lock-sub">Antenne {member?.antennaName || 'du membre'}</div>
                </div>
              </div>
            ) : (
              <div className="acf-currency-empty">Sélectionnez un membre</div>
            )}
          </div>
        </div>

        {/* ── Date ── */}
        <div className="acf-field">
          <span className="acf-label">Date du paiement</span>
          <input type="date" className="acf-input" value={depositedAt} onChange={(e) => setDepositedAt(e.target.value)} />
        </div>

        {/* ── Méthode ── */}
        <div className="acf-field">
          <span className="acf-label">Mode de paiement</span>
          <div className="acf-method-row">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`acf-method-btn ${m.colorClass}${method === m.value ? ' active' : ''}`}
                onClick={() => setMethod(m.value)}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Note ── */}
        <div className="acf-field">
          <span className="acf-label">
            Note <span className="acf-opt">(optionnel)</span>
          </span>
          <input
            type="text"
            className="acf-input"
            placeholder="Ex: reçu en espèces le 12/09 lors de la réunion d'antenne"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* ── Submit ── */}
        <button type="submit" className="acf-submit" disabled={isSubmitDisabled}>
          {isSubmitting ? (
            <>
              <div className="acf-spinner" />
              Enregistrement…
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Enregistrer et valider la cotisation
            </>
          )}
        </button>
      </form>
    </>
  );
}