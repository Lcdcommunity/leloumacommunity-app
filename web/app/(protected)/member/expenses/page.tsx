// web/app/(protected)/member/expenses/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type Expense } from '../../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ CONSTANTES */

const CATEGORY_MAP: Record<string, string> = {
  BILL: 'Factures',
  OFFICE_SUPPLIES: 'Fournitures de bureau',
  TRAVEL: 'Frais de déplacement',
  HOTEL: 'Hébergement',
  MEALS: 'Restauration',
  PROJECT_FUNDING: 'Financement projet',
  OTHER: 'Frais divers',
};

const METHOD_MAP: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte bancaire',
  OTHER: 'Autre',
};

/* ══════════════════════════════════════════════════════ MODALE DE DÉTAILS */

function ExpenseDetailModal({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  return (
    <div className="me-modal-overlay" onClick={onClose}>
      <div className="me-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ height: 4, background: 'linear-gradient(90deg, #059669, #10B981)' }} />
        <div className="me-modal-head">
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.65rem', fontWeight: 800, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 99, padding: '0.2rem 0.6rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669' }} /> Validée
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>{expense.title}</h2>
          </div>
          <button className="me-modal-close" onClick={onClose}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="me-modal-body">
          <div className="me-grid-2">
            <div className="me-info-box">
              <span className="me-info-lbl">Montant</span>
              <span className="me-info-val mono" style={{ fontSize: '1.1rem', color: '#059669' }}>{formatCurrency(expense.amount, expense.currency)}</span>
            </div>
            <div className="me-info-box">
              <span className="me-info-lbl">Date</span>
              <span className="me-info-val">{formatDate(expense.expenseDate)}</span>
            </div>
            <div className="me-info-box">
              <span className="me-info-lbl">Catégorie</span>
              <span className="me-info-val">{CATEGORY_MAP[expense.category] ?? expense.category}</span>
            </div>
            <div className="me-info-box">
              <span className="me-info-lbl">Antenne concernée</span>
              <span className="me-info-val">{expense.antenna?.name || '—'}</span>
            </div>
          </div>

          <div className="me-info-box" style={{ marginTop: '0.75rem' }}>
            <span className="me-info-lbl">Méthode de paiement</span>
            <span className="me-info-val">{METHOD_MAP[expense.paymentMethod] ?? expense.paymentMethod}</span>
          </div>

          <div className="me-info-box" style={{ marginTop: '0.75rem' }}>
            <span className="me-info-lbl">Description / Justificatif</span>
            <span className="me-info-val" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {expense.description || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Aucune description fournie.</span>}
            </span>
          </div>

          <div className="me-grid-2" style={{ marginTop: '0.75rem' }}>
            <div className="me-info-box">
              <span className="me-info-lbl">ID Dépense</span>
              <span className="me-info-val mono" style={{ fontSize: '0.75rem', color: '#6B7280' }}>{expense.id}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE PRINCIPALE */

export default function MemberExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const load = useCallback(async (cat = category) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listMemberExpenses({ page: 1, pageSize: 100, category: cat });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des dépenses.');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { void load(); }, [load]);

  const totalAmount = items.reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <AppShell title="Transparence financière">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');

        .me-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; }
        
        .me-header { margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: mein 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .me-eyebrow { font-size: 0.67rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #059669; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .me-eyebrow-dot { width: 6px; height: 6px; background: #10B981; border-radius: 50%; animation: mepulse 2s ease-in-out infinite; }
        @keyframes mepulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .me-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .me-title span { background: linear-gradient(135deg, #047857, #10B981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .me-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: mein 0.5s 0.08s cubic-bezier(.22,1,.36,1) forwards; }
        @media (max-width: 540px) { .me-stats { grid-template-columns: 1fr; } }
        .me-stat { background: rgba(253,253,255,0.9); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(5,150,105,0.09); border-top: 3px solid; padding: 1.1rem 1.25rem; box-shadow: 0 4px 12px rgba(5,150,105,0.04); }
        .me-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.85rem; font-weight: 700; line-height: 1; margin-bottom: 0.3rem; }
        .me-stat-lbl { font-size: 0.65rem; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 0.08em; }

        .me-panel { background: rgba(253,253,255,0.94); backdrop-filter: blur(14px); border-radius: 22px; border: 1px solid rgba(5,150,105,0.1); box-shadow: 0 4px 20px rgba(5,150,105,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset; overflow: hidden; opacity: 0; transform: translateY(10px); animation: mein 0.5s 0.12s cubic-bezier(.22,1,.36,1) forwards; }
        .me-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid rgba(5,150,105,0.08); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; background: rgba(236,253,245,0.4); }
        .me-panel-titlerow { display: flex; align-items: center; gap: 0.55rem; }
        .me-panel-ico { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, #047857, #10B981); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 3px 8px rgba(5,150,105,0.25); }
        .me-panel-title { font-size: 0.78rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #065F46; }

        .me-toolbar { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; padding: 1rem 1.4rem; border-bottom: 1px solid rgba(5,150,105,0.06); }
        .me-filter-field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 180px; }
        .me-filter-lbl { font-size: 0.68rem; font-weight: 800; color: #4B5563; letter-spacing: 0.06em; text-transform: uppercase; }
        .me-filter-select { height: 42px; border-radius: 10px; border: 1px solid rgba(5,150,105,0.15); background: white; padding: 0 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; color: #111827; outline: none; transition: border-color 0.2s, box-shadow 0.2s; width: 100%; box-sizing: border-box; appearance: none; padding-right: 2.2rem; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.8rem center; cursor: pointer; }
        .me-filter-select:focus { border-color: #10B981; box-shadow: 0 0 0 3px rgba(5,150,105,0.1); }

        .me-table { width: 100%; border-collapse: collapse; }
        .me-table thead tr { border-bottom: 1px solid rgba(5,150,105,0.1); }
        .me-table th { padding: 0.85rem 1.4rem; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #6B7280; background: rgba(236,253,245,0.3); text-align: left; white-space: nowrap; }
        .me-row { border-bottom: 1px solid rgba(5,150,105,0.06); transition: background 0.15s; cursor: pointer; }
        .me-row:hover { background: rgba(5,150,105,0.03); }
        .me-row:last-child { border-bottom: none; }
        .me-table td { padding: 0.95rem 1.4rem; font-size: 0.84rem; color: #1F2937; vertical-align: middle; }
        .me-td-title { font-weight: 800; color: #111827; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .me-td-cat { font-size: 0.72rem; color: #6B7280; font-weight: 600; margin-top: 0.2rem; }
        .me-td-amount { font-family: 'DM Mono', monospace; font-weight: 800; font-size: 0.9rem; color: #059669; }
        .me-td-date { font-size: 0.78rem; font-weight: 600; color: #6B7280; }

        /* ── MODALE STYLES ── */
        .me-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1rem; animation: mefade 0.2s ease; }
        .me-modal { background: white; width: 100%; max-width: 500px; border-radius: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.15); overflow: hidden; animation: mescale 0.3s cubic-bezier(.22,1,.36,1); display: flex; flex-direction: column; max-height: 90vh; }
        .me-modal-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.25rem 1.5rem; border-bottom: 1px solid #F3F4F6; background: rgba(248,250,252,0.5); }
        .me-modal-close { background: white; border: 1px solid #E5E7EB; width: 34px; height: 34px; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #6B7280; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .me-modal-close:hover { background: #F3F4F6; color: #111827; }
        .me-modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }

        .me-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-bottom: 1.25rem; }
        @media (max-width: 540px) { .me-grid-2 { grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1rem; } }

        .me-info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.8rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .me-info-lbl { font-size: 0.62rem; font-weight: 800; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; }
        .me-info-val { font-size: 0.88rem; font-weight: 700; color: #111827; }

        .me-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.8rem; font-weight: 700; margin: 1rem 1.4rem; }
        .me-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.85rem; font-weight: 700; }
        .me-ring { width: 24px; height: 24px; border: 2.5px solid rgba(5,150,105,0.12); border-top-color: #059669; border-radius: 50%; animation: mespin 0.8s linear infinite; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .me-table th, .me-table td { padding: 0.8rem 0.6rem; }
        }

        @keyframes mein { to { opacity: 1; transform: translateY(0); } }
        @keyframes mefade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mescale { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes mespin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="me-wrap">
        <div className="me-header">
          <div className="me-eyebrow"><div className="me-eyebrow-dot" />Transparence Associative</div>
          <h1 className="me-title">Historique des <span>Dépenses</span></h1>
        </div>

        <div className="me-stats">
          <div className="me-stat" style={{ borderTopColor: '#059669' }}>
            <div className="me-stat-val" style={{ color: '#047857' }}>{items.length}</div>
            <div className="me-stat-lbl">Dépenses validées</div>
          </div>
          <div className="me-stat" style={{ borderTopColor: '#10B981' }}>
            <div className="me-stat-val" style={{ color: '#065F46' }}>{formatCurrency(totalAmount, items[0]?.currency || 'EUR')}</div>
            <div className="me-stat-lbl">Total dépensé</div>
          </div>
        </div>

        <div className="me-panel">
          <div className="me-panel-head">
            <div className="me-panel-titlerow">
              <div className="me-panel-ico">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              </div>
              <span className="me-panel-title">Toutes les sorties d&apos;argent</span>
            </div>
          </div>

          <div className="me-toolbar">
            <div className="me-filter-field">
              <label className="me-filter-lbl">Filtrer par catégorie</label>
              <select className="me-filter-select" value={category} onChange={(e) => { const v = e.target.value; setCategory(v); void load(v); }}>
                <option value="">Toutes les catégories</option>
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="me-error">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="me-loader"><div className="me-ring" />Chargement...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9CA3AF' }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4B5563' }}>Aucune dépense enregistrée.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="me-table">
                <thead>
                  <tr>
                    <th>Motif</th>
                    <th className="hide-mobile">Antenne</th>
                    <th className="hide-mobile">Date</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((expense) => (
                    <tr key={expense.id} className="me-row" onClick={() => setSelectedExpense(expense)}>
                      <td>
                        <div className="me-td-title">{expense.title}</div>
                        <div className="me-td-cat">{CATEGORY_MAP[expense.category] ?? expense.category}</div>
                      </td>
                      <td className="hide-mobile"><span style={{ fontWeight: 600, color: '#374151' }}>{expense.antenna?.name || '—'}</span></td>
                      <td className="hide-mobile"><span className="me-td-date">{formatDate(expense.expenseDate)}</span></td>
                      <td><span className="me-td-amount">{formatCurrency(expense.amount, expense.currency)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
        />
      )}
    </AppShell>
  );
}