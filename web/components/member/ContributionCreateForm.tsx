// web/components/member/ContributionCreateForm.tsx
'use client';

import { useState } from 'react';

interface ContributionValues {
  amount: number;
  depositedAt: string;
  method: string;
  note: string;
  purpose: string;
}

interface Props {
  onSubmit: (values: ContributionValues) => Promise<void>;
  isSubmitting?: boolean;
  defaultPurpose?: string;
}

const PURPOSES = [
  { value: 'REGULAR_QUOTA', label: 'Cotisation régulière', icon: '📅', desc: 'Mensuelle, trimestrielle…' },
  { value: 'MEMBERSHIP_CARD', label: 'Carte membre annuelle', icon: '💳', desc: 'Règlement de la carte' },
  { value: 'DONATION', label: 'Don libre', icon: '🤝', desc: 'Contribution volontaire' },
];

const METHODS = [
  { value: 'CASH', label: 'Espèces', icon: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
    </svg>
  )},
  { value: 'BANK_TRANSFER', label: 'Virement bancaire', icon: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
    </svg>
  )},
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
    </svg>
  )},
];

export function ContributionCreateForm({ onSubmit, isSubmitting, defaultPurpose }: Props) {
  const [values, setValues] = useState({
    amount: '',
    depositedAt: new Date().toISOString().split('T')[0],
    method: 'CASH',
    note: '',
    purpose: defaultPurpose ?? 'REGULAR_QUOTA',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ ...values, amount: Number(values.amount) });
  };

  return (
    <>
      <style>{`
        .ccf-form { display: flex; flex-direction: column; gap: 1.25rem; font-family: 'DM Sans', sans-serif; }

        /* Purpose pills */
        .ccf-purpose-grid {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 0.6rem;
        }
        @media (max-width: 480px) { .ccf-purpose-grid { grid-template-columns: 1fr; } }

        .ccf-purpose-pill {
          display: flex; flex-direction: column; align-items: center;
          gap: 0.3rem; padding: 0.75rem 0.5rem;
          border-radius: 12px; border: 1.5px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.7); cursor: pointer;
          transition: all 0.2s; text-align: center;
          font-family: 'DM Sans', sans-serif;
        }
        .ccf-purpose-pill:hover { border-color: rgba(37,99,235,0.4); background: #EFF6FF; }
        .ccf-purpose-pill.active {
          border-color: #2563EB; background: #EFF6FF;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .ccf-purpose-emoji { font-size: 1.3rem; line-height: 1; }
        .ccf-purpose-label { font-size: 0.72rem; font-weight: 700; color: #1E293B; line-height: 1.2; }
        .ccf-purpose-desc { font-size: 0.62rem; color: #94A3B8; }

        /* Field */
        .ccf-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .ccf-label {
          font-size: 0.7rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase; color: #2563EB;
        }
        .ccf-label .ccf-opt { font-weight: 400; color: #94A3B8; text-transform: none; letter-spacing: 0; font-size: 0.65rem; margin-left: 0.3rem; }

        .ccf-input {
          height: 48px; border-radius: 12px;
          border: 1px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.8);
          padding: 0 1rem; font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem; color: #111827; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          width: 100%;
          -webkit-appearance: none;
        }
        .ccf-input:focus {
          border-color: rgba(37,99,235,0.55);
          background: white;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.09);
        }
        .ccf-input::placeholder { color: rgba(107,114,128,0.4); }

        /* Amount special */
        .ccf-amount-wrap { position: relative; }
        .ccf-amount-prefix {
          position: absolute; left: 1rem; top: 50%;
          transform: translateY(-50%);
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem; color: #2563EB; font-weight: 600;
          pointer-events: none;
        }
        .ccf-amount-input { padding-left: 2rem !important; font-family: 'Cormorant Garamond', serif !important; font-size: 1.1rem !important; font-weight: 600 !important; }

        /* Method selector */
        .ccf-method-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .ccf-method-btn {
          flex: 1; min-width: 90px;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          height: 44px; border-radius: 11px;
          border: 1.5px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.7); cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.75rem; font-weight: 600; color: #374151;
          transition: all 0.2s; white-space: nowrap;
        }
        .ccf-method-btn:hover { border-color: rgba(37,99,235,0.35); background: #EFF6FF; }
        .ccf-method-btn.active {
          border-color: #2563EB; background: #EFF6FF; color: #1D4ED8;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }

        /* Section sep */
        .ccf-sep {
          font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #2563EB;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .ccf-sep::after { content:''; flex:1; height:1px; background: linear-gradient(90deg, rgba(37,99,235,0.2), transparent); }

        /* Submit */
        .ccf-submit {
          width: 100%; height: 52px;
          background: linear-gradient(135deg, #1D4ED8, #2563EB, #3B82F6);
          background-size: 200%; background-position: 0%;
          border: none; border-radius: 13px; color: white;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem; font-weight: 700;
          letter-spacing: 0.05em; text-transform: uppercase;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 0.5rem;
          box-shadow: 0 4px 18px rgba(37,99,235,0.3);
          transition: background-position 0.4s, transform 0.15s, box-shadow 0.3s;
        }
        .ccf-submit:hover:not(:disabled) {
          background-position: 100%;
          box-shadow: 0 8px 26px rgba(37,99,235,0.42);
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

        {/* Purpose */}
        <div className="ccf-field">
          <span className="ccf-label">Motif du versement</span>
          <div className="ccf-purpose-grid">
            {PURPOSES.map(p => (
              <button
                key={p.value} type="button"
                className={`ccf-purpose-pill${values.purpose === p.value ? ' active' : ''}`}
                onClick={() => setValues(v => ({ ...v, purpose: p.value }))}
              >
                <span className="ccf-purpose-emoji">{p.icon}</span>
                <span className="ccf-purpose-label">{p.label}</span>
                <span className="ccf-purpose-desc">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="ccf-field">
          <span className="ccf-label">Montant</span>
          <div className="ccf-amount-wrap">
            <span className="ccf-amount-prefix">€</span>
            <input
              className="ccf-input ccf-amount-input"
              type="number" min="0" step="0.01" required
              placeholder="0,00"
              value={values.amount}
              onChange={e => setValues(v => ({ ...v, amount: e.target.value }))}
            />
          </div>
        </div>

        {/* Date */}
        <div className="ccf-field">
          <span className="ccf-label">Date du versement</span>
          <input
            className="ccf-input"
            type="date" required
            value={values.depositedAt}
            onChange={e => setValues(v => ({ ...v, depositedAt: e.target.value }))}
          />
        </div>

        {/* Method */}
        <div className="ccf-field">
          <span className="ccf-label">Mode de paiement</span>
          <div className="ccf-method-row">
            {METHODS.map(m => (
              <button
                key={m.value} type="button"
                className={`ccf-method-btn${values.method === m.value ? ' active' : ''}`}
                onClick={() => setValues(v => ({ ...v, method: m.value }))}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="ccf-field">
          <span className="ccf-label">Commentaire <span className="ccf-opt">(optionnel)</span></span>
          <input
            className="ccf-input"
            type="text"
            placeholder="Ex : Cotisation mars 2025"
            value={values.note}
            onChange={e => setValues(v => ({ ...v, note: e.target.value }))}
          />
        </div>

        <button type="submit" className="ccf-submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <><div className="ccf-spinner" />Envoi en cours…</>
          ) : (
            <>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Déclarer la cotisation
            </>
          )}
        </button>
      </form>
    </>
  );
}