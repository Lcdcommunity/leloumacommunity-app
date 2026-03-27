// web/components/super-admin/ContributionsTable.tsx
'use client';

import { useState } from 'react';
import type { Contribution, ContributionStatus } from '../../types/contribution';
import { formatCurrency, formatDate } from '../../lib/format';

const statusLabels: Record<ContributionStatus, string> = {
  PENDING: 'En attente',
  PENDING_VALIDATION: 'En validation',
  VALIDATED: 'Validée',
  REJECTED: 'Rejetée',
  CANCELLED: 'Annulée',
};

const methodLabels: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte',
  OTHER: 'Autre',
};

export function ContributionsTable({ items }: { items: Contribution[] }) {
  const [selectedItem, setSelectedItem] = useState<Contribution | null>(null);

  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '2rem 1.25rem', color: '#6B7280', fontWeight: 600 }}>
        Aucune cotisation trouvée.
      </div>
    );
  }

  return (
    <>
      <style>{`
        .sct-wrap {
          width: 100%;
        }

        .sct-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'DM Sans', sans-serif;
        }

        .sct-table thead tr {
          border-bottom: 1px solid rgba(220,38,38,.08);
        }

        .sct-table thead th {
          padding: .85rem 1.1rem;
          text-align: left;
          font-size: .66rem;
          font-weight: 900;
          letter-spacing: .09em;
          text-transform: uppercase;
          color: #6B7280;
          background: rgba(254,242,242,.22);
          white-space: nowrap;
        }

        .sct-row {
          border-bottom: 1px solid rgba(220,38,38,.06);
          transition: background .15s ease;
          cursor: pointer;
        }

        .sct-row:hover {
          background: rgba(220,38,38,.03);
        }

        .sct-row:last-child {
          border-bottom: none;
        }

        .sct-table td {
          padding: .9rem 1.1rem;
          font-size: .82rem;
          color: #374151;
          vertical-align: middle;
        }

        .sct-member { display: flex; flex-direction: column; gap: .18rem; }
        .sct-member-name { font-size: .87rem; font-weight: 800; color: #111827; }
        .sct-member-email { font-size: .72rem; color: #9CA3AF; font-weight: 500; }
        .sct-amount { font-family: 'DM Mono', monospace; font-size: .84rem; font-weight: 800; color: #111827; white-space: nowrap; }
        
        .sct-method {
          display: inline-flex; align-items: center; gap: .28rem; font-size: .7rem;
          font-weight: 700; color: #374151; background: #F9FAFB; border: 1px solid #E5E7EB;
          border-radius: 999px; padding: .24rem .58rem; white-space: nowrap;
        }

        .sct-date { white-space: nowrap; font-size: .78rem; font-weight: 600; color: #374151; }

        .sct-status {
          display: inline-flex; align-items: center; gap: .32rem; padding: .25rem .62rem;
          border-radius: 999px; font-size: .7rem; font-weight: 800; white-space: nowrap;
        }
        .sct-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        /* ── RESPONSIVE: Masquer les colonnes secondaires sur mobile ── */
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .sct-table td, .sct-table th { padding: 0.75rem 0.6rem; }
        }

        /* ── MODAL STYLES ── */
        .sct-modal-overlay {
          position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px);
          z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem;
          animation: sctFadeIn 0.2s ease-out;
        }
        .sct-modal {
          background: white; width: 100%; max-width: 500px; border-radius: 20px;
          box-shadow: 0 10px 30px rgba(220,38,38,0.1); overflow: hidden;
          animation: sctSlideUp 0.3s cubic-bezier(.22,1,.36,1);
        }
        .sct-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 1.25rem 1.5rem; background: rgba(254,242,242,0.6); border-bottom: 1px solid rgba(220,38,38,0.1);
        }
        .sct-modal-title {
          font-weight: 900; font-size: 0.85rem; color: #DC2626; text-transform: uppercase; letter-spacing: 0.08em;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .sct-modal-close {
          background: white; border: 1px solid #E5E7EB; width: 32px; height: 32px; border-radius: 50%;
          display: flex; justify-content: center; align-items: center; cursor: pointer; color: #6B7280;
          transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .sct-modal-close:hover { background: #FEF2F2; color: #DC2626; border-color: #FECACA; }
        
        .sct-modal-body { padding: 1.5rem; }
        .sct-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        
        /* Sur très petits écrans, le modal passe en 1 colonne */
        @media (max-width: 480px) { .sct-grid { grid-template-columns: 1fr; gap: 1rem; } }

        .sct-field { display: flex; flex-direction: column; gap: 0.25rem; }
        .sct-field label { font-size: 0.65rem; font-weight: 800; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; }
        .sct-field span { font-size: 0.9rem; font-weight: 700; color: #111827; word-break: break-word; }
        .sct-field .mono { font-family: 'DM Mono', monospace; color: #DC2626; }

        @keyframes sctFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sctSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="sct-wrap">
        <table className="sct-table">
          <thead>
            <tr>
              <th>Membre</th>
              <th className="hide-mobile">Antenne</th>
              <th>Montant</th>
              <th className="hide-mobile">Méthode</th>
              <th className="hide-mobile">Date</th>
              <th>Statut</th>
            </tr>
          </thead>

          <tbody>
            {items.map((contribution) => {
              const statusStyles = getStatusStyles(contribution.status);
              const memberName = `${contribution.member?.firstName ?? ''} ${contribution.member?.lastName ?? ''}`.trim() || '—';

              return (
                <tr 
                  key={contribution.id} 
                  className="sct-row" 
                  onClick={() => setSelectedItem(contribution)}
                  title="Cliquer pour voir les détails"
                >
                  <td>
                    <div className="sct-member">
                      <span className="sct-member-name">{memberName}</span>
                      <span className="sct-member-email hide-mobile">{contribution.member?.email ?? '—'}</span>
                    </div>
                  </td>

                  <td className="hide-mobile">{contribution.antenna?.name || '-'}</td>

                  <td className="sct-amount">
                    {formatCurrency(contribution.amount, contribution.currency || 'EUR')}
                  </td>

                  <td className="hide-mobile">
                    <span className="sct-method">
                      {methodLabels[contribution.method ?? ''] ?? contribution.method ?? '-'}
                    </span>
                  </td>

                  <td className="sct-date hide-mobile">
                    {formatDate(contribution.depositedAt || contribution.createdAt)}
                  </td>

                  <td>
                    <span
                      className="sct-status"
                      style={{ color: statusStyles.color, background: statusStyles.bg, border: `1px solid ${statusStyles.border}` }}
                    >
                      <span className="sct-status-dot" style={{ background: statusStyles.color }} />
                      {statusLabels[contribution.status] ?? contribution.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MODAL DE DÉTAILS ── */}
      {selectedItem && (
        <div className="sct-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="sct-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sct-modal-header">
              <div className="sct-modal-title">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Détails de la cotisation
              </div>
              <button className="sct-modal-close" onClick={() => setSelectedItem(null)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="sct-modal-body">
              <div className="sct-grid">
                <div className="sct-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Membre</label>
                  <span>
                    {`${selectedItem.member?.firstName ?? ''} ${selectedItem.member?.lastName ?? ''}`.trim() || '—'}
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500, marginTop: '2px' }}>
                      {selectedItem.member?.email ?? '—'}
                    </div>
                  </span>
                </div>

                <div className="sct-field">
                  <label>Montant</label>
                  <span className="mono" style={{ fontSize: '1.1rem' }}>
                    {formatCurrency(selectedItem.amount, selectedItem.currency || 'EUR')}
                  </span>
                </div>

                <div className="sct-field">
                  <label>Statut</label>
                  <div>
                    <span 
                      className="sct-status" 
                      style={{ 
                        color: getStatusStyles(selectedItem.status).color, 
                        background: getStatusStyles(selectedItem.status).bg, 
                        border: `1px solid ${getStatusStyles(selectedItem.status).border}` 
                      }}
                    >
                      <span className="sct-status-dot" style={{ background: getStatusStyles(selectedItem.status).color }} />
                      {statusLabels[selectedItem.status] ?? selectedItem.status}
                    </span>
                  </div>
                </div>

                <div className="sct-field">
                  <label>Antenne affiliée</label>
                  <span>{selectedItem.antenna?.name || '—'}</span>
                </div>

                <div className="sct-field">
                  <label>Méthode de paiement</label>
                  <span>{methodLabels[selectedItem.method ?? ''] ?? selectedItem.method ?? '—'}</span>
                </div>

                <div className="sct-field">
                  <label>Date de dépôt</label>
                  <span>{formatDate(selectedItem.depositedAt || selectedItem.createdAt)}</span>
                </div>

                <div className="sct-field">
                  <label>Référence de transaction</label>
                  <span className="mono" style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    {selectedItem.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper pour éviter la répétition du style de statut
function getStatusStyles(status: ContributionStatus) {
  if (status === 'VALIDATED') return { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
  if (status === 'REJECTED') return { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  if (status === 'CANCELLED') return { color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
}