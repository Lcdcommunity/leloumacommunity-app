// web/components/super-admin/ContributionDetailsModal.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Contribution } from '../../types/contribution';
import { formatDate, formatCurrency } from '../../lib/format';

const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: 'En attente',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  PENDING_VALIDATION: {
    label: 'En attente',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  VALIDATED: {
    label: 'Validée',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  REJECTED: {
    label: 'Rejetée',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  CANCELLED: {
    label: 'Annulée',
    color: '#9CA3AF',
    bg: '#F9FAFB',
    border: '#E5E7EB',
  },
};

function getInitials(name: string) {
  const safeName = name.trim() || 'NA';
  return safeName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? {
    label: status,
    color: '#6B7280',
    bg: '#F3F4F6',
    border: '#E5E7EB',
  };

  return (
    <span
      className="sa-dm-status"
      style={{
        color: s.color,
        background: s.bg,
        borderColor: s.border,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: s.color,
          flexShrink: 0,
        }}
      />
      {s.label}
    </span>
  );
}

type Props = {
  isOpen: boolean;
  item: Contribution | null;
  onClose: () => void;
};

export function ContributionDetailsModal({
  isOpen,
  item,
  onClose,
}: Props) {
  const [animOpen, setAnimOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        setAnimOpen(true);
      }, 10);

      return () => clearTimeout(timer);
    }

    document.body.style.overflow = '';

    const timer = setTimeout(() => {
      setAnimOpen(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!isOpen || !item) return null;

  const memberName = `${item.member?.firstName ?? ''} ${
    item.member?.lastName ?? ''
  }`.trim();

  return (
    <div
      className={`sa-dm-overlay ${animOpen ? 'open' : ''}`}
      onClick={onClose}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&display=swap');

        .sa-dm-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0);
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s ease;
          backdrop-filter: blur(0px);
        }

        .sa-dm-overlay.open {
          background: rgba(15, 23, 42, 0.55);
          opacity: 1;
          pointer-events: auto;
          backdrop-filter: blur(4px);
        }

        .sa-dm-sheet {
          position: fixed;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%) translateY(100%);
          width: min(520px, 92vw);
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(16px);
          border-radius: 24px 24px 0 0;
          box-shadow:
            0 -12px 40px rgba(15, 23, 42, 0.18),
            0 0 0 1px rgba(255,255,255,0.8) inset;
          padding: 1.2rem 1.4rem 1.6rem;
          max-height: 80vh;
          overflow-y: auto;
          transition: transform 0.35s cubic-bezier(.22,1,.36,1);
        }

        .sa-dm-overlay.open .sa-dm-sheet {
          transform: translateX(-50%) translateY(0);
        }

        /* Desktop : modal vraiment remonté */
        @media (min-width: 768px) {
          .sa-dm-sheet {
            top: 4rem;
            bottom: auto;
            transform: translateX(-50%) translateY(-30px);
            border-radius: 24px;
            max-height: calc(100vh - 8rem);
          }

          .sa-dm-overlay.open .sa-dm-sheet {
            transform: translateX(-50%) translateY(0);
          }
        }

        .sa-dm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.8rem;
          border-bottom: 1px solid rgba(220, 38, 38, 0.08);
        }

        .sa-dm-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #DC2626;
          margin: 0;
        }

        .sa-dm-close {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid #FECACA;
          background: #FEF2F2;
          color: #DC2626;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sa-dm-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sa-dm-section {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .sa-dm-section-label {
          font-size: 0.64rem;
          font-weight: 900;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .sa-dm-user {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.8rem;
          background: #F9FAFB;
          border-radius: 13px;
          border: 1px solid #F3F4F6;
        }

        .sa-dm-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg,#DC2626,#991B1B);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          font-weight: 900;
          color: white;
          flex-shrink: 0;
        }

        .sa-dm-username {
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
        }

        .sa-dm-useremail {
          font-size: 0.78rem;
          color: #6B7280;
          font-weight: 500;
          word-break: break-all;
        }

        .sa-dm-amount {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.4rem;
          font-weight: 700;
          color: #DC2626;
          text-align: center;
        }

        .sa-dm-status-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .sa-dm-status {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          font-weight: 800;
          border-radius: 99px;
          padding: 0.25rem 0.7rem;
          border: 1px solid;
        }

        .sa-dm-date {
          font-size: 0.82rem;
          font-weight: 600;
          color: #111827;
        }
      `}</style>

      <div
        className="sa-dm-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sa-dm-header">
          <h2 className="sa-dm-title">Détails de la cotisation</h2>

          <button className="sa-dm-close" onClick={onClose}>
            <svg
              width="14"
              height="14"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.8"
            >
              <path
                strokeLinecap="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="sa-dm-body">
          <div className="sa-dm-section">
            <label className="sa-dm-section-label">Membre</label>

            <div className="sa-dm-user">
              <div className="sa-dm-avatar">
                {getInitials(memberName)}
              </div>

              <div>
                <div className="sa-dm-username">{memberName}</div>
                <div className="sa-dm-useremail">
                  {item.member?.email ?? 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <div
            className="sa-dm-section"
            style={{ alignItems: 'center' }}
          >
            <label className="sa-dm-section-label">Montant</label>

            <div className="sa-dm-amount">
              {formatCurrency(item.amount, item.currency)}
            </div>
          </div>

          <div className="sa-dm-status-row">
            <div className="sa-dm-section">
              <label className="sa-dm-section-label">Statut</label>
              <StatusBadge status={item.status} />
            </div>

            <div
              className="sa-dm-section"
              style={{ textAlign: 'right' }}
            >
              <label className="sa-dm-section-label">Créée le</label>

              <span className="sa-dm-date">
                {formatDate(item.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}