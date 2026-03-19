// web/components/member/ContributionCreateForm.tsx
'use client';

import { useMemo, useState } from 'react';

type SupportedCurrency = 'GNF' | 'EUR' | 'USD' | 'XOF';

interface ContributionValues {
  amount: number;
  currency: SupportedCurrency;
  depositedAt: string;
  method: string;
  note: string;
  purpose: string;
}

interface Props {
  onSubmit: (values: ContributionValues) => Promise<void>;
  isSubmitting?: boolean;
  defaultPurpose?: string;
  defaultCurrency?: SupportedCurrency;
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
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    value: 'BANK_TRANSFER',
    label: 'Virement',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    ),
  },
  {
    value: 'MOBILE_MONEY',
    label: 'Mobile Money',
    icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

function getCurrencyMeta(currency: SupportedCurrency) {
  switch (currency) {
    case 'GNF':
      return { prefix: 'FG', label: 'Franc guinéen (GNF)' };
    case 'USD':
      return { prefix: '$', label: 'Dollar américain (USD)' };
    case 'XOF':
      return { prefix: 'F CFA', label: 'Franc CFA (XOF)' };
    case 'EUR':
    default:
      return { prefix: '€', label: 'Euro (EUR)' };
  }
}

export function ContributionCreateForm({
  onSubmit,
  isSubmitting,
  defaultPurpose,
  defaultCurrency = 'EUR',
  pricing,
}: Props) {
  // L'initialisation se fait directement ici grâce à une fonction fléchée
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

  const currencyMeta = useMemo(() => getCurrencyMeta(defaultCurrency), [defaultCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit({
      amount: Number(values.amount),
      currency: defaultCurrency,
      depositedAt: values.depositedAt,
      method: values.method,
      note: values.note,
      purpose: values.purpose,
    });
  };

  const amountNum = Number(values.amount);
  const monthlyPrice = pricing?.monthlyQuota ?? 0;
  const isQuota = values.purpose === 'REGULAR_QUOTA' || values.purpose === 'LATE_QUOTA';
  
  // Affiche le message de division (Split) des mois payés en avance
  const showAdvanceNotice = isQuota && monthlyPrice > 0 && amountNum > monthlyPrice;
  const monthsCovered = monthlyPrice > 0 ? Math.floor(amountNum / monthlyPrice) : 0;

  return (
    <>
      <style>{`
        .ccf-form { display: flex; flex-direction: column; gap: 1.25rem; font-family: 'DM Sans', sans-serif; }

        .ccf-purpose-grid {
          display: flex;
          flex-direction: row;
          gap: 0.55rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-snap-type: x mandatory;
          padding-bottom: 4px;
          scrollbar-width: none;
        }
        .ccf-purpose-grid::-webkit-scrollbar { display: none; }

        .ccf-purpose-pill {
          flex: 0 0 110px;
          scroll-snap-align: start;
          display: flex; flex-direction: column; align-items: center;
          gap: 0.3rem; padding: 0.75rem 0.5rem;
          border-radius: 12px; border: 1.5px solid rgba(5,150,105,0.15);
          background: rgba(255,255,255,0.7); cursor: pointer;
          transition: all 0.2s; text-align: center;
          font-family: 'DM Sans', sans-serif;
          box-sizing: border-box;
        }

        @media (min-width: 640px) {
          .ccf-purpose-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            overflow-x: visible;
            padding-bottom: 0;
          }
          .ccf-purpose-pill { flex: unset; scroll-snap-align: unset; }
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
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase; color: #059669;
          display: flex; align-items: center; justify-content: space-between;
        }
        .ccf-label .ccf-opt {
          font-weight: 400; color: #94A3B8; text-transform: none;
          letter-spacing: 0; font-size: 0.65rem; margin-left: 0.3rem;
        }
        .ccf-label-badge {
          background: #ECFDF5; border: 1px solid #A7F3D0; color: #047857;
          font-size: 0.62rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: 99px;
          letter-spacing: 0; text-transform: none;
        }

        .ccf-input {
          height: 48px; border-radius: 12px;
          border: 1px solid rgba(5,150,105,0.15);
          background: rgba(255,255,255,0.8);
          padding: 0 1rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; color: #111827; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          width: 100%; box-sizing: border-box;
          -webkit-appearance: none;
        }
        .ccf-input:focus {
          border-color: rgba(5,150,105,0.55);
          background: white;
          box-shadow: 0 0 0 3px rgba(5,150,105,0.09);
        }
        .ccf-input::placeholder { color: rgba(107,114,128,0.4); }

        .ccf-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.65rem;
          align-items: start;
        }

        @media (max-width: 560px) {
          .ccf-row-2 {
            grid-template-columns: 1fr;
          }
        }

        .ccf-amount-wrap { position: relative; }
        .ccf-amount-prefix {
          position: absolute; left: 0.75rem; top: 50%;
          transform: translateY(-50%);
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem; color: #059669; font-weight: 600;
          pointer-events: none;
          white-space: nowrap;
        }
        .ccf-amount-input {
          padding-left: 2.7rem !important;
          font-family: 'Cormorant Garamond', serif !important;
          font-size: 1.05rem !important;
          font-weight: 600 !important;
        }

        .ccf-info-box {
          margin-top: 0.5rem;
          padding: 0.85rem 1rem;
          background: #EFF6FF;
          border: 1px solid #BFDBFE;
          border-radius: 12px;
          display: flex;
          gap: 0.65rem;
          align-items: flex-start;
          font-size: 0.76rem;
          color: #1D4ED8;
          line-height: 1.5;
        }

        .ccf-readonly {
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(5,150,105,0.15);
          background: rgba(236,253,245,0.7);
          padding: 0 1rem;
          display: flex;
          align-items: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.86rem;
          font-weight: 700;
          color: #065F46;
        }

        .ccf-method-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.45rem;
        }

        .ccf-method-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.28rem;
          padding: 0.65rem 0.3rem;
          min-height: 60px;
          border-radius: 11px;
          border: 1.5px solid rgba(5,150,105,0.15);
          background: rgba(255,255,255,0.7);
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.68rem;
          font-weight: 600;
          color: #374151;
          transition: all 0.2s;
          text-align: center;
          box-sizing: border-box;
          line-height: 1.3;
          word-break: break-word;
        }
        .ccf-method-btn svg { flex-shrink: 0; }

        @media (min-width: 640px) {
          .ccf-method-btn {
            flex-direction: row;
            padding: 0 0.75rem;
            height: 44px;
            min-height: unset;
            font-size: 0.75rem;
            gap: 0.4rem;
            word-break: unset;
          }
        }

        .ccf-method-btn:hover { border-color: rgba(5,150,105,0.35); background: #ECFDF5; }
        .ccf-method-btn.active {
          border-color: #059669; background: #ECFDF5; color: #047857;
          box-shadow: 0 0 0 3px rgba(5,150,105,0.1);
        }

        .ccf-submit {
          width: 100%; height: 52px;
          background: linear-gradient(135deg, #047857, #059669, #10B981);
          background-size: 200%; background-position: 0%;
          border: none; border-radius: 13px; color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 0.5rem;
          box-shadow: 0 4px 18px rgba(5,150,105,0.3);
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.3s;
        }
        .ccf-submit:hover:not(:disabled) {
          background-position: 100%;
          box-shadow: 0 8px 26px rgba(5,150,105,0.42);
          transform: translateY(-1px);
        }
        .ccf-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .ccf-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: ccfspin 0.7s linear infinite;
        }
        @keyframes ccfspin { to { transform: rotate(360deg); } }
      `}</style>

      <form className="ccf-form" onSubmit={handleSubmit}>
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
                  // Auto-remplissage au clic uniquement si c'est la carte et que le champ est vide
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

        <div className="ccf-row-2">
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
                onChange={(e) => setValues((v) => ({ ...v, amount: e.target.value }))}
              />
            </div>
            
            {/* Message de split intelligent */}
            {showAdvanceNotice && (
              <div className="ccf-info-box">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 2 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Information :</strong> Votre versement de {amountNum}{currencyMeta.prefix} couvre l&apos;équivalent de <strong>{monthsCovered} mois</strong> de cotisation. Les excédents seront automatiquement enregistrés comme une avance pour les mois suivants.
                </span>
              </div>
            )}
          </div>

          <div className="ccf-field">
            <span className="ccf-label">Devise de l’antenne</span>
            <div className="ccf-readonly">{currencyMeta.label}</div>
          </div>
        </div>

        <div className="ccf-row-2">
          <div className="ccf-field">
            <span className="ccf-label">Date</span>
            <input
              className="ccf-input"
              type="date"
              required
              value={values.depositedAt}
              onChange={(e) => setValues((v) => ({ ...v, depositedAt: e.target.value }))}
            />
          </div>

          <div />
        </div>

        <div className="ccf-field">
          <span className="ccf-label">Mode de paiement</span>
          <div className="ccf-method-row">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`ccf-method-btn${values.method === m.value ? ' active' : ''}`}
                onClick={() => setValues((v) => ({ ...v, method: m.value }))}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="ccf-field">
          <span className="ccf-label">
            Commentaire <span className="ccf-opt">(optionnel)</span>
          </span>
          <input
            className="ccf-input"
            type="text"
            placeholder="Ex : Cotisation mars 2025"
            value={values.note}
            onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))}
          />
        </div>

        <button type="submit" className="ccf-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="ccf-spinner" />
              Envoi en cours…
            </>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Déclarer la cotisation
            </>
          )}
        </button>
      </form>
    </>
  );
}