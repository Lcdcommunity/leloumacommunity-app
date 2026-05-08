// web/components/member/ContributionHistoryTable.tsx
'use client';

import { useState } from 'react';
import type { Contribution } from '../../types/contribution';
import { formatCurrency, formatDate } from '../../lib/format';

type ExtendedContribution = Contribution & {
  reference?: string | null;
  validatedAt?: string | null;
  purpose?: string | null;
  monthReference?: number | null;
  yearReference?: number | null;
  submitter?: { firstName: string; lastName: string } | null;
  beneficiary?: { firstName: string; lastName: string } | null;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatMonthRef(month?: number | null, year?: number | null): string | null {
  if (!month || !year) return null;
  return `${MONTHS_FR[(month - 1) % 12]} ${year}`;
}

function getStatusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED:          { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    PENDING:            { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    REJECTED:           { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    CANCELLED:          { label: 'Annulée',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  return map[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
}

function getMethodLabel(method?: string | null) {
  const map: Record<string, string> = {
    CASH: 'Espèces',
    BANK_TRANSFER: 'Virement bancaire',
    MOBILE_MONEY: 'Mobile Money',
    CARD: 'Carte Bancaire',
    OTHER: 'Autre',
  };
  return method ? (map[method] ?? method) : '—';
}

function getMethodLabelShort(method?: string | null) {
  const map: Record<string, string> = {
    CASH: 'Espèces',
    BANK_TRANSFER: 'Virement',
    MOBILE_MONEY: 'Mobile',
    CARD: 'Carte',
    OTHER: 'Autre',
  };
  return method ? (map[method] ?? method) : '—';
}

function getPurposeConfig(purpose?: string | null) {
  const map: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    REGULAR_QUOTA:   { label: 'Cotisation régulière',  icon: '📅', color: '#059669', bg: '#ECFDF5' },
    LATE_QUOTA:      { label: 'Cotisation en retard',  icon: '⏳', color: '#D97706', bg: '#FFFBEB' },
    MEMBERSHIP_CARD: { label: 'Carte membre annuelle', icon: '💳', color: '#2563EB', bg: '#EFF6FF' },
    DONATION:        { label: 'Don libre',             icon: '🤝', color: '#D97706', bg: '#FFFBEB' },
  };
  return purpose
    ? (map[purpose] ?? { label: purpose, icon: '•', color: '#6B7280', bg: '#F3F4F6' })
    : null;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = getStatusConfig(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.68rem', fontWeight: 700,
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 99, padding: '0.18rem 0.58rem', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
      {cfg.label}
    </span>
  );
}

function MonthRefPill({ month, year }: { month?: number | null; year?: number | null }) {
  const label = formatMonthRef(month, year);
  if (!label) {
    return <span style={{ color: '#CBD5E1', fontSize: '0.72rem', fontStyle: 'italic' }}>—</span>;
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      background: '#EFF6FF', color: '#1D4ED8',
      fontSize: '0.7rem', fontWeight: 800,
      padding: '0.22rem 0.6rem', borderRadius: 99,
      border: '1px solid #BFDBFE', whiteSpace: 'nowrap',
    }}>
      <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      {label}
    </span>
  );
}

// ─── Edit Amount Modal ───────────────────────────────────────────────────────

function EditAmountModal({
  item,
  onClose,
  onConfirm,
}: {
  item: ExtendedContribution;
  onClose: () => void;
  onConfirm: (newAmount: number) => void;
}) {
  const [value, setValue] = useState(String(item.amount ?? ''));
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    const num = parseFloat(value.replace(',', '.'));
    if (!num || num <= 0) return;
    setBusy(true);
    try { onConfirm(num); } finally { setBusy(false); }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem', animation: 'dpfadein 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 360, background: '#fff',
          borderRadius: 20, padding: '1.5rem',
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
          animation: 'dppopin 0.25s cubic-bezier(.22,1,.36,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#EFF6FF', border: '2px solid #BFDBFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB',
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', fontWeight: 600, color: '#111827' }}>
              Modifier le montant
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.1rem' }}>
              Montant actuel : <strong>{formatCurrency(item.amount, item.currency)}</strong>
            </div>
          </div>
        </div>

        {/* Input */}
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.45rem' }}>
          Nouveau montant ({item.currency || 'EUR'})
        </label>
        <input
          type="number"
          value={value}
          min={0}
          step="any"
          onChange={e => setValue(e.target.value)}
          autoFocus
          style={{
            width: '100%', height: 48, borderRadius: 12,
            border: '1.5px solid #BFDBFE', background: 'white',
            padding: '0 1rem', fontFamily: "'Cormorant Garamond', serif",
            fontSize: '1.2rem', fontWeight: 700, color: '#111827',
            outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#BFDBFE'; e.currentTarget.style.boxShadow = 'none'; }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, height: 42, borderRadius: 10,
              border: '1.5px solid #E5E7EB', background: 'white',
              color: '#374151', fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={busy || !value || parseFloat(value) <= 0}
            style={{
              flex: 1, height: 42, borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
              color: 'white', fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
              opacity: busy ? 0.65 : 1,
            }}
          >
            {busy ? '…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ────────────────────────────────────────────────────────────

function DetailPanel({
  item,
  onClose,
  onCancel,
  onEdit,
}: {
  item: ExtendedContribution;
  onClose: () => void;
  onCancel?: (id: string) => void;
  onEdit?: (id: string, newAmount: number) => void;
}) {
  const purposeCfg = getPurposeConfig(item.purpose);
  const statusCfg = getStatusConfig(item.status);
  const isPending = item.status === 'PENDING_VALIDATION' || item.status === 'PENDING';
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  return (
    <>
      <style>{`
        .dp-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(3px);
          animation: dpfadein 0.2s ease;
          display: flex; align-items: center; justify-content: center;
          padding: 1.25rem;
        }
        @keyframes dpfadein { from { opacity: 0; } to { opacity: 1; } }

        .dp-sheet {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 22px;
          padding: 0 0 0;
          max-height: 88vh;
          overflow-y: auto;
          animation: dppopin 0.28s cubic-bezier(.22,1,.36,1);
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
        }
        @keyframes dppopin { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }

        .dp-header {
          padding: 1rem 1.25rem 0.75rem;
          border-bottom: 1px solid #F3F4F6;
          display: flex; justify-content: space-between; align-items: center;
        }
        .dp-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.25rem; font-weight: 500; color: #111827;
        }
        .dp-close {
          width: 32px; height: 32px; border-radius: 50%;
          background: #F3F4F6; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #6B7280;
        }

        .dp-amount-block {
          padding: 1.25rem 1.25rem 0;
          display: flex; align-items: baseline; gap: 0.5rem;
        }
        .dp-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2rem; font-weight: 600; color: #111827;
        }

        .dp-body { padding: 1rem 1.25rem 0; display: flex; flex-direction: column; gap: 0; }

        .dp-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          padding: 0.72rem 0;
          border-bottom: 1px solid #F9FAFB;
          gap: 1rem;
        }
        .dp-row:last-child { border-bottom: none; }
        .dp-row-label {
          font-size: 0.71rem; font-weight: 700; letter-spacing: 0.07em;
          text-transform: uppercase; color: #9CA3AF;
          flex-shrink: 0; padding-top: 1px;
        }
        .dp-row-value {
          font-size: 0.83rem; color: #1F2937; font-weight: 500;
          text-align: right; word-break: break-word;
        }
        .dp-row-value.muted { color: #9CA3AF; font-weight: 400; }

        .dp-purpose-tag {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.78rem; font-weight: 600;
          padding: 0.25rem 0.65rem; border-radius: 99px;
        }
        .dp-note-box {
          background: #F9FAFB; border: 1px solid #E5E7EB;
          border-radius: 10px; padding: 0.65rem 0.85rem;
          font-size: 0.8rem; color: #374151; line-height: 1.55;
          font-style: italic; text-align: left; width: 100%;
          margin-top: 0.25rem; box-sizing: border-box;
        }

        /* ← Member action footer */
        .dp-member-actions {
          padding: 1rem 1.25rem 1.25rem;
          display: flex; flex-direction: column; gap: 0.55rem;
          border-top: 1px solid #F3F4F6; margin-top: 0.5rem;
        }
        .dp-action-label {
          font-size: 0.62rem; font-weight: 900; color: #9CA3AF;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 0.1rem;
        }
        .dp-action-row { display: flex; gap: 0.55rem; }
        .dp-btn-edit {
          flex: 1; height: 42px; border-radius: 11px;
          border: 1.5px solid #BFDBFE; background: #EFF6FF;
          color: #1D4ED8; font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          transition: all 0.2s;
        }
        .dp-btn-edit:hover { background: #DBEAFE; border-color: #3B82F6; }
        .dp-btn-cancel {
          flex: 1; height: 42px; border-radius: 11px;
          border: 1.5px solid #FECACA; background: #FEF2F2;
          color: #DC2626; font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          transition: all 0.2s;
        }
        .dp-btn-cancel:hover { background: #FEE2E2; border-color: #EF4444; }
        .dp-confirm-cancel {
          background: #FEF2F2; border: 1.5px solid #FECACA;
          border-radius: 12px; padding: 0.85rem 1rem;
          display: flex; flex-direction: column; gap: 0.6rem;
        }
        .dp-confirm-text {
          font-size: 0.78rem; color: '#374151'; font-weight: 600; line-height: 1.5;
        }
        .dp-confirm-row { display: flex; gap: 0.5rem; }
        .dp-confirm-yes {
          flex: 1; height: 38px; border-radius: 9px;
          border: none; background: #DC2626; color: white;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
          font-weight: 800; cursor: pointer;
        }
        .dp-confirm-no {
          flex: 1; height: 38px; border-radius: 9px;
          border: 1.5px solid #E5E7EB; background: white; color: #374151;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem;
          font-weight: 700; cursor: pointer;
        }
      `}</style>

      <div className="dp-overlay" onClick={onClose}>
        <div className="dp-sheet" onClick={e => e.stopPropagation()}>
          <div className="dp-header">
            <span className="dp-title">Détail du versement</span>
            <button className="dp-close" onClick={onClose} aria-label="Fermer">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div className="dp-amount-block">
            <span className="dp-amount">{formatCurrency(item.amount, item.currency)}</span>
            <StatusBadge status={item.status} />
          </div>

          <div className="dp-body">
            {purposeCfg && (
              <div className="dp-row">
                <span className="dp-row-label">Motif</span>
                <span className="dp-purpose-tag" style={{ background: purposeCfg.bg, color: purposeCfg.color }}>
                  {purposeCfg.icon} {purposeCfg.label}
                </span>
              </div>
            )}

            {/* Mois concerné */}
            <div className="dp-row">
              <span className="dp-row-label">Mois concerné</span>
              <MonthRefPill month={item.monthReference} year={item.yearReference} />
            </div>

            <div className="dp-row">
              <span className="dp-row-label">Méthode</span>
              <span className="dp-row-value">{getMethodLabel(item.paymentMethod)}</span>
            </div>

            <div className="dp-row">
              <span className="dp-row-label">Date du dépôt</span>
              <span className="dp-row-value">{formatDate(item.contributionDate || item.createdAt)}</span>
            </div>

            <div className="dp-row">
              <span className="dp-row-label">Validation</span>
              <span className={`dp-row-value${item.validatedAt ? '' : ' muted'}`}>
                {item.validatedAt ? formatDate(item.validatedAt) : 'En attente'}
              </span>
            </div>

            <div className="dp-row">
              <span className="dp-row-label">Référence</span>
              <span className={`dp-row-value${item.reference ? '' : ' muted'}`}
                style={{ fontFamily: item.reference ? 'monospace' : 'inherit', fontSize: item.reference ? '0.78rem' : '0.83rem' }}>
                {item.reference ?? '—'}
              </span>
            </div>

            {item.antenna && (
              <div className="dp-row">
                <span className="dp-row-label">Antenne</span>
                <span className="dp-row-value">{item.antenna.name}</span>
              </div>
            )}

            <div className="dp-row">
              <span className="dp-row-label">Statut</span>
              <span className="dp-row-value" style={{ color: statusCfg.color, fontWeight: 700 }}>
                {statusCfg.label}
              </span>
            </div>

            {item.memberComment && (
              <div style={{ paddingTop: '0.75rem' }}>
                <div className="dp-row-label" style={{ marginBottom: '0.4rem' }}>Commentaire</div>
                <div className="dp-note-box">&ldquo;{item.memberComment}&rdquo;</div>
              </div>
            )}

            {item.submitter && item.beneficiary && (
              <div style={{ paddingTop: '0.75rem', borderTop: '1px dashed #E5E7EB', marginTop: '0.75rem' }}>
                <div className="dp-row-label" style={{ marginBottom: '0.4rem' }}>Informations complémentaires</div>
                <div className="dp-note-box" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46', fontStyle: 'normal', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span>Payé par : <strong>{item.submitter.firstName} {item.submitter.lastName}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Pour : <strong>{item.beneficiary.firstName} {item.beneficiary.lastName}</strong></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Member actions: visible only if PENDING ── */}
          {isPending && (onCancel || onEdit) && (
            <div className="dp-member-actions">
              <div className="dp-action-label">Actions disponibles</div>

              {!confirmCancel ? (
                <div className="dp-action-row">
                  {onEdit && (
                    <button
                      className="dp-btn-edit"
                      onClick={() => setShowEditModal(true)}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Modifier le montant
                    </button>
                  )}
                  {onCancel && (
                    <button
                      className="dp-btn-cancel"
                      onClick={() => setConfirmCancel(true)}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Annuler le dépôt
                    </button>
                  )}
                </div>
              ) : (
                <div className="dp-confirm-cancel">
                  <p className="dp-confirm-text" style={{ margin: 0, color: '#374151' }}>
                    Confirmer l&apos;annulation de ce dépôt de{' '}
                    <strong>{formatCurrency(item.amount, item.currency)}</strong> ?
                    Cette action est irréversible.
                  </p>
                  <div className="dp-confirm-row">
                    <button className="dp-confirm-no" onClick={() => setConfirmCancel(false)}>
                      Retour
                    </button>
                    <button
                      className="dp-confirm-yes"
                      onClick={() => { onCancel?.(item.id); onClose(); }}
                    >
                      Oui, annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit amount modal stacked above */}
      {showEditModal && (
        <EditAmountModal
          item={item}
          onClose={() => setShowEditModal(false)}
          onConfirm={(newAmount) => {
            onEdit?.(item.id, newAmount);
            setShowEditModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

// ─── Mobile card list ────────────────────────────────────────────────────────

function MobileList({
  items,
  onSelect,
}: {
  items: ExtendedContribution[];
  onSelect: (item: ExtendedContribution) => void;
}) {
  return (
    <>
      <style>{`
        .ml-list { display: flex; flex-direction: column; }
        .ml-row {
          display: flex; align-items: center;
          padding: 0.85rem 1rem; gap: 0.75rem;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          cursor: pointer; transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .ml-row:last-child { border-bottom: none; }
        .ml-row:active { background: #F9FAFB; }
        .ml-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.18rem; }
        .ml-amount { font-family: 'Cormorant Garamond', serif; font-size: 1.05rem; font-weight: 600; color: #111827; }
        .ml-meta {
          font-size: 0.72rem; color: #6B7280;
          display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;
        }
        .ml-meta-sep { color: #D1D5DB; }
        .ml-meta-label { font-weight: 700; color: #9CA3AF; margin-right: -0.15rem; }
        .ml-method-chip {
          display: inline-flex; align-items: center;
          font-size: 0.68rem; font-weight: 600;
          background: #F3F4F6; color: #374151;
          border: 1px solid #E5E7EB; border-radius: 6px; padding: 0.1rem 0.45rem;
        }
        .ml-month-chip {
          display: inline-flex; align-items: center; gap: 0.25rem;
          font-size: 0.67rem; font-weight: 800;
          background: #EFF6FF; color: #1D4ED8;
          border: 1px solid #BFDBFE; border-radius: 6px; padding: 0.1rem 0.45rem;
        }
        .ml-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; flex-shrink: 0; }
        .ml-chevron { color: #D1D5DB; }
      `}</style>

      <div className="ml-list">
        {items.map(item => {
          const monthLabel = formatMonthRef(item.monthReference, item.yearReference);
          return (
            <div key={item.id} className="ml-row" onClick={() => onSelect(item)} role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onSelect(item)}>
              <div className="ml-left">
                <span className="ml-amount">{formatCurrency(item.amount, item.currency)}</span>
                <div className="ml-meta">
                  <span>{formatDate(item.contributionDate || item.createdAt)}</span>
                  {monthLabel && (
                    <>
                      <span className="ml-meta-sep">·</span>
                      <span className="ml-month-chip">
                        <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        {monthLabel}
                      </span>
                    </>
                  )}
                  <span className="ml-meta-sep">·</span>
                  <span className="ml-meta-label">Méthode :</span>
                  <span className="ml-method-chip">{getMethodLabelShort(item.paymentMethod)}</span>
                </div>
              </div>
              <div className="ml-right">
                <StatusBadge status={item.status} />
                <svg className="ml-chevron" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Desktop table ───────────────────────────────────────────────────────────

function DesktopTable({
  items,
  onSelect,
}: {
  items: ExtendedContribution[];
  onSelect: (item: ExtendedContribution) => void;
}) {
  const purposeCfgOf = (p?: string | null) => getPurposeConfig(p);

  return (
    <>
      <style>{`
        .cht-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cht-table { width: 100%; border-collapse: collapse; font-family: 'DM Sans', sans-serif; min-width: 720px; }
        .cht-table thead tr { border-bottom: 1px solid rgba(5,150,105,0.08); }
        .cht-table thead th {
          padding: 0.6rem 1rem;
          font-size: 0.63rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase;
          color: #9CA3AF; text-align: left; white-space: nowrap;
        }
        .cht-table tbody tr {
          border-bottom: 1px solid rgba(5,150,105,0.05);
          transition: background 0.15s; cursor: pointer;
        }
        .cht-table tbody tr:last-child { border-bottom: none; }
        .cht-table tbody tr:hover { background: rgba(5,150,105,0.025); }
        .cht-table td { padding: 0.72rem 1rem; font-size: 0.8rem; color: #374151; vertical-align: middle; }
        .cht-amount { font-family: 'Cormorant Garamond', serif; font-size: 0.98rem; font-weight: 600; color: #111827; }
        .cht-muted { color: #9CA3AF; font-size: 0.73rem; }
        .cht-method-chip {
          display: inline-flex; align-items: center; gap: 0.28rem;
          font-size: 0.7rem; font-weight: 600;
          background: #F3F4F6; color: #374151;
          border: 1px solid #E5E7EB; border-radius: 7px; padding: 0.18rem 0.55rem;
        }
        .cht-purpose-pill {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.73rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 99px;
        }
        .cht-ref { font-family: monospace; font-size: 0.72rem; color: #6B7280; }
        .cht-submitter { font-size: 0.7rem; color: #059669; font-weight: 600; margin-top: 0.15rem; display: block; }
        /* Pending indicator dot in table row */
        .cht-pending-dot {
          display: inline-block; width: 6px; height: 6px;
          border-radius: 50%; background: #F59E0B; margin-right: 0.35rem;
          vertical-align: middle; flex-shrink: 0;
          animation: chtpulse 1.8s ease-in-out infinite;
        }
        @keyframes chtpulse { 0%,100%{opacity:1;} 50%{opacity:.35;} }
      `}</style>

      <div className="cht-wrap">
        <table className="cht-table">
          <thead>
            <tr>
              <th>Montant</th>
              <th>Motif</th>
              <th>Mois concerné</th>
              <th>Méthode de paiement</th>
              <th>Référence</th>
              <th>Statut</th>
              <th>Date dépôt</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => {
              const pc = purposeCfgOf(c.purpose);
              const isPending = c.status === 'PENDING_VALIDATION' || c.status === 'PENDING';
              return (
                <tr key={c.id} onClick={() => onSelect(c)} title={isPending ? 'Cliquez pour modifier ou annuler' : 'Voir les détails'}>
                  <td>
                    <span className="cht-amount">
                      {isPending && <span className="cht-pending-dot" />}
                      {formatCurrency(c.amount, c.currency)}
                    </span>
                  </td>
                  <td>
                    {pc ? (
                      <span className="cht-purpose-pill" style={{ background: pc.bg, color: pc.color }}>
                        {pc.icon} {pc.label}
                      </span>
                    ) : (
                      <span className="cht-muted">—</span>
                    )}
                    {c.submitter && c.beneficiary && (
                      <span className="cht-submitter">Par <strong>{c.submitter.firstName}</strong> pour <strong>{c.beneficiary.firstName}</strong></span>
                    )}
                  </td>
                  <td>
                    <MonthRefPill month={c.monthReference} year={c.yearReference} />
                  </td>
                  <td>
                    <span className="cht-method-chip">{getMethodLabel(c.paymentMethod)}</span>
                  </td>
                  <td>
                    {c.reference ? <span className="cht-ref">{c.reference}</span> : <span className="cht-muted">—</span>}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="cht-muted">{formatDate(c.contributionDate || c.createdAt)}</td>
                  <td className="cht-muted">{formatDate(c.validatedAt ?? null)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '2.5rem 1rem', gap: '0.75rem',
      color: '#9CA3AF',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: '#F9FAFB', border: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4m6 8l4-4-4-4"/>
        </svg>
      </div>
      <p style={{ fontSize: '0.82rem', fontWeight: 500 }}>Aucune cotisation trouvée</p>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function ContributionHistoryTable({
  items,
  onCancel,
  onEdit,
}: {
  items: ExtendedContribution[];
  onCancel?: (id: string) => void;
  onEdit?: (id: string, newAmount: number) => void;
}) {
  const [selected, setSelected] = useState<ExtendedContribution | null>(null);

  if (items.length === 0) return <EmptyState />;

  return (
    <>
      <style>{`
        .cht-mobile { display: block; }
        .cht-desktop { display: none; }
        @media (min-width: 640px) {
          .cht-mobile { display: none; }
          .cht-desktop { display: block; }
        }
      `}</style>

      {/* Mobile */}
      <div className="cht-mobile">
        <MobileList items={items} onSelect={setSelected} />
      </div>

      {/* Desktop */}
      <div className="cht-desktop">
        <DesktopTable items={items} onSelect={setSelected} />
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          item={selected}
          onClose={() => setSelected(null)}
          onCancel={onCancel ? (id) => { onCancel(id); setSelected(null); } : undefined}
          onEdit={onEdit ? (id, amount) => { onEdit(id, amount); setSelected(null); } : undefined}
        />
      )}
    </>
  );
}