'use client';

import { useMemo, useState, useEffect } from 'react';
import { api } from '../../lib/api-client';

type SupportedCurrency = 'GNF' | 'EUR' | 'USD' | 'XOF' | '';

// 🔥 NOUVELLE INTERFACE POUR RÉSOUDRE L'ERREUR "any"
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

function getCurrencyMeta(currency: SupportedCurrency) {
  switch (currency) {
    case 'GNF': return { prefix: 'FG', label: 'Franc guinéen (GNF)' };
    case 'XOF': return { prefix: 'F CFA', label: 'Franc CFA (XOF)' };
    case 'USD': return { prefix: '$', label: 'Dollar américain (USD)' };
    case 'EUR': return { prefix: '€', label: 'Euro (EUR)' };
    default: return { prefix: '', label: 'Devise' };
  }
}

export function ContributionCreateForm({
  onSubmit,
  isSubmitting,
  defaultPurpose,
  pricing,
}: Props) {

  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>('');

  // 🔥 NOUVEAUX ETATS POUR LE PAIEMENT TIERS AVEC LES BONS TYPES !
  const [paymentTarget, setPaymentTarget] = useState<'ME' | 'OTHER'>('ME');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMemberResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<SearchMemberResult | null>(null);

  const [values, setValues] = useState<{
    amount: string;
    depositedAt: string;
    method: string;
    note: string;
    purpose: string;
  }>(() => {
    const initialPurpose = defaultPurpose ?? 'REGULAR_QUOTA';
    const initialAmount = (initialPurpose === 'MEMBERSHIP_CARD' && pricing?.membershipCard)
      ? pricing.membershipCard.toString()
      : '';

    return {
      amount: initialAmount,
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

  const currencyMeta = useMemo(() => getCurrencyMeta(selectedCurrency), [selectedCurrency]);

  // 🔥 DEBOUNCE POUR LA RECHERCHE DE MEMBRES
  useEffect(() => {
    if (paymentTarget === 'ME' || !searchQuery || selectedMember) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.searchMembers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery, paymentTarget, selectedMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit({
      amount: Number(values.amount),
      currency: selectedCurrency,
      depositedAt: values.depositedAt,
      method: values.method,
      note: values.note,
      purpose: values.purpose,
      targetMemberId: paymentTarget === 'OTHER' && selectedMember ? selectedMember.id : undefined,
    });
  };

  const amountNum = Number(values.amount);
  const monthlyPrice = pricing?.monthlyQuota ?? 0;
  const isQuota = values.purpose === 'REGULAR_QUOTA' || values.purpose === 'LATE_QUOTA';

  const showAdvanceNotice = isQuota && monthlyPrice > 0 && amountNum > monthlyPrice;
  const monthsCovered = monthlyPrice > 0 ? Math.floor(amountNum / monthlyPrice) : 0;

  const paddingLeftAmount = currencyMeta.prefix 
    ? (currencyMeta.prefix.length > 2 ? '4.2rem' : '2.5rem') 
    : '1rem';

  // Sécurité: Si "OTHER" est coché mais qu'aucun membre n'est sélectionné, on bloque le bouton
  const isSubmitDisabled = isSubmitting || (paymentTarget === 'OTHER' && !selectedMember);

  return (
    <>
      <style>{`
        .ccf-form { display: flex; flex-direction: column; gap: 1.25rem; font-family: 'DM Sans', sans-serif; }

        /* 🔥 AJOUT POUR LA RECHERCHE TIERS */
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

        .ccf-select {
          cursor: pointer;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 7L11 1' stroke='%23059669' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
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
        .ccf-card-input { width: 100%; height: 46px; border-radius: 10px; border: 1px solid #CBD5E1; padding: 0 1rem 0 2.8rem; font-size: 0.9rem; font-family: 'DM Mono', monospace; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
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
      `}</style>

      <form className="ccf-form" onSubmit={handleSubmit}>
        
        {/* 🔥 NOUVEAU BLOC : POUR QUI ? */}
        <div className="ccf-field">
          <span className="ccf-label">Pour qui effectuez-vous ce versement ?</span>
          <div className="ccf-target-tabs">
            <button type="button" className={`ccf-target-tab ${paymentTarget === 'ME' ? 'active' : ''}`} onClick={() => { setPaymentTarget('ME'); setSelectedMember(null); setSearchQuery(''); }}>
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
                  <button type="button" onClick={() => { setSelectedMember(null); setSearchQuery(''); }} style={{ background: 'white', border: '1px solid #A7F3D0', padding: '0.4rem 0.7rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, color: '#059669', cursor: 'pointer' }}>
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
                  {searchQuery && searchResults.length > 0 && (
                    <div className="ccf-search-results">
                      {searchResults.map(m => (
                        <div key={m.id} className="ccf-search-item" onClick={() => setSelectedMember(m)}>
                          <span className="ccf-search-name">{m.firstName} {m.lastName}</span>
                          <span className="ccf-search-meta">{[m.email, m.phone].filter(Boolean).join(' • ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && !isSearching && (
                    <div className="ccf-search-results" style={{ padding: '1rem', textAlign: 'center', color: '#6B7280', fontSize: '0.8rem' }}>
                      Aucun membre actif trouvé
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="ccf-field">
          <span className="ccf-label">Motif du versement</span>
          <div className="ccf-purpose-grid">
            {PURPOSES.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`ccf-purpose-pill${values.purpose === p.value ? ' active' : ''}`}
                onClick={() => setValues((v) => {
                  const nextValues = { ...v, purpose: p.value };
                  if (p.value === 'MEMBERSHIP_CARD' && pricing?.membershipCard && !v.amount) {
                    nextValues.amount = pricing.membershipCard.toString();
                  }
                  return nextValues;
                })}
              >
                <span className="ccf-purpose-emoji">{p.icon}</span>
                <span className="ccf-purpose-label">{p.label}</span>
                <span className="ccf-purpose-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ccf-row-montant-devise">
          <div className="ccf-field">
            <span className="ccf-label">
              Montant
              {isQuota && monthlyPrice > 0 && (
                <span className="ccf-label-badge">Prix : {monthlyPrice}{currencyMeta.prefix} / mois</span>
              )}
            </span>
            <div className="ccf-amount-wrap">
              <span className="ccf-amount-prefix">{currencyMeta.prefix}</span>
              <input
                className="ccf-input ccf-amount-input"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0,00"
                value={values.amount}
                style={{ paddingLeft: paddingLeftAmount }}
                onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
              />
            </div>
          </div>

          <div className="ccf-field">
            <span className="ccf-label">Devise</span>
            <select
              className="ccf-input ccf-select"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as SupportedCurrency)}
              required
            >
              <option value="">Sélectionnez...</option>
              <option value="GNF">Franc guinéen (GNF)</option>
              <option value="XOF">Franc CFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </div>
        </div>

        {showAdvanceNotice && (
          <div className="ccf-info-box">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Information :</strong> Votre versement de {amountNum} {selectedCurrency} couvre l&apos;équivalent de <strong>{monthsCovered} mois</strong> de cotisation. Les excédents seront automatiquement enregistrés comme une avance pour les mois suivants.
            </span>
          </div>
        )}

        <div className="ccf-field">
          <span className="ccf-label">Date de paiement</span>
          <input
            className="ccf-input"
            type="date"
            required
            value={values.depositedAt}
            onChange={(e) => setValues((v) => ({ ...v, depositedAt: e.target.value }))}
          />
        </div>

        <div className="ccf-field">
          <span className="ccf-label">Mode de paiement</span>
          <div className="ccf-method-row">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`ccf-method-btn ${m.colorClass}${values.method === m.value ? ' active' : ''}`}
                onClick={() => setValues((v) => ({ ...v, method: m.value }))}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {values.method === 'CARD' && (
            <div className="ccf-card-payment-section">
              <div className="ccf-wallet-row">
                <button type="button" className="ccf-wallet-btn apple">
                  <svg width="36" height="20" viewBox="0 0 40 16" fill="white" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.8 7.3C17.8 5 18.9 3.9 20.4 3.1C19.5 2 17.8 1.8 17.1 1.8C14.9 1.5 12.8 3.1 11.7 3.1C10.5 3.1 8.8 1.8 7.1 1.9C4.9 2 2.9 3.2 1.8 5.1C-0.5 8.9 1.2 14.6 3.4 17.8C4.5 19.4 5.8 21.2 7.5 21.1C9.2 21 9.8 19.9 11.8 19.9C13.8 19.9 14.3 21.1 16.2 21.1C18 21.1 19.1 19.5 20.1 17.9C21.4 16 21.9 14 22 13.9C21.8 13.8 17.8 12.2 17.8 7.3ZM14.8 1.2C15.7 0.1 17 0 17 0C16.8 1.4 16 2.8 15 3.7C14.1 4.7 12.8 5.1 12.8 5.1C12.6 3.9 13.6 2.3 14.8 1.2Z" />
                    <text x="25" y="15" fontSize="16" fontFamily="Arial" fontWeight="bold">Pay</text>
                  </svg>
                </button>
                <button type="button" className="ccf-wallet-btn google">
                  <svg width="45" height="20" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.1 13.9c0-1.2.4-2.3 1.2-3.1.8-.8 1.8-1.2 3.1-1.2 1.4 0 2.5.5 3.3 1.4L16.2 12c-.6-.7-1.3-1-2.2-1-1.3 0-2.4.9-2.4 2.2 0 1.2 1 2.2 2.4 2.2 1 0 1.7-.4 2-1h-2v-1.7h4.1c.1.3.1.6.1 1 0 1.3-.4 2.4-1.2 3.2-.8.8-1.9 1.2-3.2 1.2-1.7 0-3.1-.6-4.1-1.8-.7-.9-1-2.1-1-3.4z" fill="#4285F4"/>
                    <text x="21" y="16" fontSize="17" fill="#3c4043" fontFamily="Arial">Pay</text>
                  </svg>
                </button>
              </div>

              <div className="ccf-divider">Ou payez par carte</div>

              <div className="ccf-card-input-group">
                <span className="ccf-card-input-icon">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input 
                  type="text" 
                  className="ccf-card-input" 
                  placeholder="Nom sur la carte"
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  required={values.method === 'CARD'}
                />
              </div>

              <div className="ccf-card-input-group">
                <span className="ccf-card-input-icon">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </span>
                <input 
                  type="text" 
                  className="ccf-card-input" 
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  value={cardNumber}
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 16) v = v.substring(0, 16);
                    const formatted = v.match(/.{1,4}/g)?.join(' ') || v;
                    setCardNumber(formatted);
                  }}
                  required={values.method === 'CARD'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="ccf-card-input-group">
                  <span className="ccf-card-input-icon">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input 
                    type="text" 
                    className="ccf-card-input" 
                    placeholder="MM/AA"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, '');
                      if (v.length > 4) v = v.substring(0, 4);
                      if (v.length > 2) v = `${v.substring(0, 2)}/${v.substring(2)}`;
                      setCardExpiry(v);
                    }}
                    required={values.method === 'CARD'}
                  />
                </div>
                <div className="ccf-card-input-group">
                  <span className="ccf-card-input-icon">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input 
                    type="password" 
                    className="ccf-card-input" 
                    placeholder="CVC"
                    maxLength={3}
                    value={cardCvc}
                    onChange={e => setCardCvc(e.target.value.replace(/\D/g, ''))}
                    required={values.method === 'CARD'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ccf-field">
          <span className="ccf-label">
            Commentaire <span className="ccf-opt">(optionnel)</span>
          </span>
          <input
            className="ccf-input"
            type="text"
            placeholder="Ex : Cotisation mars 2026"
            value={values.note}
            onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
          />
        </div>

        <button type="submit" className="ccf-submit" disabled={isSubmitDisabled}>
          {isSubmitting ? (
            <>
              <div className="ccf-spinner" />
              Traitement en cours…
            </>
          ) : (
            <>
              {values.method === 'CARD' ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {values.method === 'CARD' ? 'Payer la cotisation' : 'Déclarer la cotisation'}
            </>
          )}
        </button>
      </form>
    </>
  );
}