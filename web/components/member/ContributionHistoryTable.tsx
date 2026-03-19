// web/components/member/ContributionHistoryTable.tsx
'use client';

import { useState } from 'react';
import type { Contribution } from '../../types/contribution';
import { formatCurrency, formatDate } from '../../lib/format';

type ExtendedContribution = Contribution & {
  reference?: string | null;
  validatedAt?: string | null;
  purpose?: string | null;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  };
  return method ? (map[method] ?? method) : '—';
}

function getMethodLabelShort(method?: string | null) {
  const map: Record<string, string> = {
    CASH: 'Espèces',
    BANK_TRANSFER: 'Virement',
    MOBILE_MONEY: 'Mobile',
  };
  return method ? (map[method] ?? method) : '—';
}

function getPurposeConfig(purpose?: string | null) {
  const map: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    REGULAR_QUOTA:   { label: 'Cotisation régulière', icon: '📅', color: '#059669', bg: '#ECFDF5' },
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

// ─── Detail Panel (mobile) ───────────────────────────────────────────────────

function DetailPanel({
  item,
  onClose,
}: {
  item: ExtendedContribution;
  onClose: () => void;
}) {
  const purposeCfg = getPurposeConfig(item.purpose);
  const statusCfg = getStatusConfig(item.status);

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
          padding: 0 0 1.25rem;
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

        .dp-body { padding: 1rem 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0; }

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
          margin-top: 0.25rem;
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

          {/* Montant en grand */}
          <div className="dp-amount-block">
            <span className="dp-amount">{formatCurrency(item.amount, item.currency)}</span>
            <StatusBadge status={item.status} />
          </div>

          <div className="dp-body">
            {/* Motif */}
            {purposeCfg && (
              <div className="dp-row">
                <span className="dp-row-label">Motif</span>
                <span
                  className="dp-purpose-tag"
                  style={{ background: purposeCfg.bg, color: purposeCfg.color }}
                >
                  {purposeCfg.icon} {purposeCfg.label}
                </span>
              </div>
            )}

            {/* Méthode */}
            <div className="dp-row">
              <span className="dp-row-label">Méthode</span>
              <span className="dp-row-value">{getMethodLabel(item.method)}</span>
            </div>

            {/* Date de dépôt */}
            <div className="dp-row">
              <span className="dp-row-label">Date du dépôt</span>
              <span className="dp-row-value">{formatDate(item.depositedAt || item.createdAt)}</span>
            </div>

            {/* Date de validation */}
            <div className="dp-row">
              <span className="dp-row-label">Validation</span>
              <span className={`dp-row-value${item.validatedAt ? '' : ' muted'}`}>
                {item.validatedAt ? formatDate(item.validatedAt) : 'En attente'}
              </span>
            </div>

            {/* Référence */}
            <div className="dp-row">
              <span className="dp-row-label">Référence</span>
              <span className={`dp-row-value${item.reference ? '' : ' muted'}`} style={{ fontFamily: item.reference ? 'monospace' : 'inherit', fontSize: item.reference ? '0.78rem' : '0.83rem' }}>
                {item.reference ?? '—'}
              </span>
            </div>

            {/* Antenne */}
            {item.antenna && (
              <div className="dp-row">
                <span className="dp-row-label">Antenne</span>
                <span className="dp-row-value">{item.antenna.name}</span>
              </div>
            )}

            {/* Statut détaillé */}
            <div className="dp-row">
              <span className="dp-row-label">Statut</span>
              <span className="dp-row-value" style={{ color: statusCfg.color, fontWeight: 700 }}>
                {statusCfg.label}
              </span>
            </div>

            {/* Commentaire */}
            {item.note && (
              <div style={{ paddingTop: '0.75rem' }}>
                <div className="dp-row-label" style={{ marginBottom: '0.4rem' }}>Commentaire</div>
                <div className="dp-note-box">&ldquo;{item.note}&rdquo;</div>
              </div>
            )}
          </div>
        </div>
      </div>
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
          padding: 0.85rem 1rem;
          gap: 0.75rem;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          cursor: pointer;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .ml-row:last-child { border-bottom: none; }
        .ml-row:active { background: #F9FAFB; }

        .ml-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.18rem; }

        .ml-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem; font-weight: 600; color: #111827;
        }
        .ml-meta {
          font-size: 0.72rem; color: #6B7280;
          display: flex; align-items: center; gap: 0.35rem;
          flex-wrap: wrap;
        }
        .ml-meta-sep { color: #D1D5DB; }
        .ml-method-chip {
          display: inline-flex; align-items: center;
          font-size: 0.68rem; font-weight: 600;
          background: #F3F4F6; color: #374151;
          border: 1px solid #E5E7EB;
          border-radius: 6px; padding: 0.1rem 0.45rem;
        }

        .ml-right {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 0.3rem; flex-shrink: 0;
        }
        .ml-chevron { color: #D1D5DB; }
      `}</style>

      <div className="ml-list">
        {items.map(item => (
          <div key={item.id} className="ml-row" onClick={() => onSelect(item)} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onSelect(item)}>
            <div className="ml-left">
              <span className="ml-amount">{formatCurrency(item.amount, item.currency)}</span>
              <div className="ml-meta">
                <span>{formatDate(item.depositedAt || item.createdAt)}</span>
                <span className="ml-meta-sep">·</span>
                <span className="ml-method-chip">{getMethodLabelShort(item.method)}</span>
              </div>
            </div>
            <div className="ml-right">
              <StatusBadge status={item.status} />
              <svg className="ml-chevron" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Desktop table ───────────────────────────────────────────────────────────

function DesktopTable({ items }: { items: ExtendedContribution[] }) {
  const purposeCfgOf = (p?: string | null) => getPurposeConfig(p);

  return (
    <>
      <style>{`
        .cht-wrap { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .cht-table { width: 100%; border-collapse: collapse; font-family: 'DM Sans', sans-serif; min-width: 580px; }
        .cht-table thead tr { border-bottom: 1px solid rgba(5,150,105,0.08); }
        .cht-table thead th {
          padding: 0.6rem 1rem;
          font-size: 0.63rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase;
          color: #9CA3AF; text-align: left; white-space: nowrap;
        }
        .cht-table tbody tr {
          border-bottom: 1px solid rgba(5,150,105,0.05);
          transition: background 0.15s;
        }
        .cht-table tbody tr:last-child { border-bottom: none; }
        .cht-table tbody tr:hover { background: rgba(5,150,105,0.025); }
        .cht-table td {
          padding: 0.72rem 1rem;
          font-size: 0.8rem; color: #374151;
          vertical-align: middle;
        }
        .cht-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.98rem; font-weight: 600; color: #111827;
        }
        .cht-muted { color: #9CA3AF; font-size: 0.73rem; }
        .cht-method-chip {
          display: inline-flex; align-items: center; gap: 0.28rem;
          font-size: 0.7rem; font-weight: 600;
          background: #F3F4F6; color: #374151;
          border: 1px solid #E5E7EB;
          border-radius: 7px; padding: 0.18rem 0.55rem;
        }
        .cht-purpose-pill {
          display: inline-flex; align-items: center; gap: 0.35rem;
          font-size: 0.73rem; font-weight: 600;
          padding: 0.2rem 0.6rem; border-radius: 99px;
        }
        .cht-ref { font-family: monospace; font-size: 0.72rem; color: #6B7280; }
      `}</style>

      <div className="cht-wrap">
        <table className="cht-table">
          <thead>
            <tr>
              <th>Montant</th>
              <th>Motif</th>
              <th>Méthode</th>
              <th>Référence</th>
              <th>Statut</th>
              <th>Date dépôt</th>
              <th>Validation</th>
            </tr>
          </thead>
          <tbody>
            {items.map(c => {
              const pc = purposeCfgOf(c.purpose);
              return (
                <tr key={c.id}>
                  <td className="cht-amount">{formatCurrency(c.amount, c.currency)}</td>
                  <td>
                    {pc ? (
                      <span
                        className="cht-purpose-pill"
                        style={{ background: pc.bg, color: pc.color }}
                      >
                        {pc.icon} {pc.label}
                      </span>
                    ) : (
                      <span className="cht-muted">—</span>
                    )}
                  </td>
                  <td>
                    <span className="cht-method-chip">{getMethodLabel(c.method)}</span>
                  </td>
                  <td>
                    {c.reference
                      ? <span className="cht-ref">{c.reference}</span>
                      : <span className="cht-muted">—</span>}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="cht-muted">{formatDate(c.depositedAt || c.createdAt)}</td>
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

export function ContributionHistoryTable({ items }: { items: ExtendedContribution[] }) {
  const [selected, setSelected] = useState<ExtendedContribution | null>(null);

  if (items.length === 0) return <EmptyState />;

  return (
    <>
      <style>{`
        /* Mobile : liste cliquable */
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
        <DesktopTable items={items} />
      </div>

      {/* Detail panel (mobile bottom sheet) */}
      {selected && (
        <DetailPanel item={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}