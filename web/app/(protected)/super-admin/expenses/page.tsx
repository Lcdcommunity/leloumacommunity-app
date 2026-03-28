// web/app/(protected)/super-admin/expenses/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type Expense } from '../../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../../lib/format';

const CATEGORY_MAP: Record<string, string> = {
  BILL: 'Factures',
  OFFICE_SUPPLIES: 'Fournitures de bureau',
  TRAVEL: 'Déplacement',
  HOTEL: 'Hébergement',
  MEALS: 'Restauration',
  PROJECT_FUNDING: 'Financement projet',
  OTHER: 'Frais divers',
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  VALIDATED:          { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  REJECTED:           { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  CANCELLED:          { label: 'Annulée',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

function SuperAdminExpenseModal({ expense, onClose, onSuccess }: { expense: Expense; onClose: () => void; onSuccess: () => void }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = STATUS_MAP[expense.status] || STATUS_MAP.PENDING_VALIDATION;

  async function handleValidate() {
    if (!confirm('Valider cette dépense ? Elle sera définitivement débitée du solde de l\'antenne.')) return;
    setSaving(true); setError(null);
    try {
      await api.validateExpenseSuperAdmin(expense.id);
      onSuccess();
    } catch (err) { 
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erreur'); 
      setSaving(false); 
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectionReason.trim()) { setError('Veuillez préciser le motif du rejet.'); return; }
    setSaving(true); setError(null);
    try {
      await api.rejectExpenseSuperAdmin(expense.id, { rejectionReason });
      onSuccess();
    } catch (err) { 
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erreur'); 
      setSaving(false); 
    }
  }

  return (
    <div className="sae-modal-overlay" onClick={onClose}>
      <div className="sae-modal" onClick={e => e.stopPropagation()}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}66)` }} />
        <div className="sae-modal-head">
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.65rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '0.2rem 0.6rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />{s.label}
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>{expense.title}</h2>
          </div>
          <button className="sae-modal-close" onClick={onClose}><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>

        <div className="sae-modal-body">
          {error && <div className="sae-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div className="sae-grid-2">
            <div className="sae-info-box">
              <span className="sae-info-lbl">Montant réclamé</span>
              <span className="sae-info-val mono" style={{ fontSize: '1.2rem', color: '#DC2626' }}>{formatCurrency(expense.amount, expense.currency)}</span>
            </div>
            <div className="sae-info-box">
              <span className="sae-info-lbl">Antenne</span>
              <span className="sae-info-val">{expense.antenna?.name || '—'}</span>
            </div>
            <div className="sae-info-box">
              <span className="sae-info-lbl">Catégorie</span>
              <span className="sae-info-val">{CATEGORY_MAP[expense.category] ?? expense.category}</span>
            </div>
            <div className="sae-info-box">
              <span className="sae-info-lbl">Saisie par</span>
              <span className="sae-info-val">{expense.engagedByUser ? `${expense.engagedByUser.firstName} ${expense.engagedByUser.lastName}` : '—'}</span>
            </div>
          </div>

          <div className="sae-info-box" style={{ marginTop: '0.75rem' }}>
            <span className="sae-info-lbl">Justification</span>
            <span className="sae-info-val" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{expense.description || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Aucune description fournie.</span>}</span>
          </div>

          {expense.status === 'PENDING_VALIDATION' && !isRejecting && (
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button className="sae-btn-validate" onClick={handleValidate} disabled={saving}>✔ Approuver la dépense</button>
              <button className="sae-btn-reject" onClick={() => setIsRejecting(true)} disabled={saving}>✖ Refuser</button>
            </div>
          )}

          {isRejecting && (
            <form onSubmit={handleReject} style={{ marginTop: '1.5rem', background: '#FEF2F2', border: '1px solid #FECACA', padding: '1rem', borderRadius: 12 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Motif du refus *</label>
              <textarea className="sae-input" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} required style={{ minHeight: '60px', padding: '0.6rem 0.9rem', marginBottom: '0.75rem', borderColor: '#FECACA' }} placeholder="Expliquez pourquoi..." />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="sae-btn-cancel" onClick={() => setIsRejecting(false)}>Annuler</button>
                <button type="submit" className="sae-btn-reject" disabled={saving}>Confirmer le rejet</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('PENDING_VALIDATION'); // Par défaut, on regarde ce qui attend
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const load = useCallback(async (st = status) => {
    setLoading(true);
    try { 
      const res = await api.listSuperAdminExpenses({ page: 1, pageSize: 100, status: st }); 
      setItems(res.items); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, [status]);
  
  useEffect(() => { void load(); }, [load]);

  const pendingCount = items.filter(i => i.status === 'PENDING_VALIDATION').length;

  return (
    <AppShell title="Contrôle des dépenses">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        .sae-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; }
        .sae-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem; }
        .sae-title span { color: #DC2626; }
        .sae-panel { background: white; border-radius: 20px; border: 1px solid rgba(220,38,38,0.15); box-shadow: 0 4px 20px rgba(220,38,38,0.05); overflow: hidden; }
        .sae-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid rgba(220,38,38,0.1); background: rgba(254,242,242,0.4); display: flex; gap: 1rem; align-items: center; }
        .sae-filter-select { height: 40px; border-radius: 10px; border: 1px solid #D1D5DB; padding: 0 1rem; font-family: 'DM Sans'; font-size: 0.85rem; font-weight: 600; outline: none; appearance: none; padding-right: 2.2rem; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.8rem center; cursor: pointer; }
        
        .sae-table { width: 100%; border-collapse: collapse; }
        .sae-table th { padding: 0.85rem 1.4rem; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; color: #6B7280; text-align: left; background: #F9FAFB; }
        .sae-row { border-top: 1px solid #F3F4F6; cursor: pointer; transition: background 0.15s; } .sae-row:hover { background: #FEF2F2; }
        .sae-table td { padding: 1rem 1.4rem; font-size: 0.85rem; font-weight: 600; color: #111827; }
        
        .sae-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .sae-modal { background: white; width: 100%; max-width: 500px; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
        .sae-modal-head { padding: 1.25rem 1.5rem; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; }
        .sae-modal-body { padding: 1.5rem; overflow-y: auto; }
        .sae-modal-close { background: white; border: 1px solid #E5E7EB; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .sae-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .sae-info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.8rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .sae-info-lbl { font-size: 0.62rem; font-weight: 800; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; }
        .sae-info-val { font-size: 0.88rem; font-weight: 700; color: #111827; }
        .sae-input { width: 100%; border-radius: 10px; border: 1px solid #D1D5DB; font-family: 'DM Sans'; font-size: 0.88rem; outline: none; box-sizing: border-box; }
        .sae-btn-validate { flex: 1; background: linear-gradient(135deg, #059669, #10B981); color: white; border: none; padding: 0.9rem; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .sae-btn-reject { flex: 1; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 0.9rem; border-radius: 12px; font-weight: 800; cursor: pointer; }
        .sae-btn-cancel { background: white; color: #4B5563; border: 1px solid #D1D5DB; padding: 0.7rem 1.2rem; border-radius: 10px; font-weight: 700; cursor: pointer; }
        @media (max-width: 600px) { .sae-grid-2 { grid-template-columns: 1fr; } .hide-mobile { display: none; } }
      `}</style>
      <div className="sae-wrap">
        <h1 className="sae-title">Contrôle des <span>Dépenses</span></h1>
        
        <div className="sae-panel">
          <div className="sae-panel-head">
            <select className="sae-filter-select" value={status} onChange={e => { const v = e.target.value; setStatus(v); void load(v); }}>
              <option value="">Toutes les dépenses</option>
              <option value="PENDING_VALIDATION">En attente de validation ({pendingCount})</option>
              <option value="VALIDATED">Dépenses validées</option>
              <option value="REJECTED">Dépenses refusées</option>
            </select>
          </div>
          
          <table className="sae-table">
            <thead>
              <tr><th>Motif</th><th className="hide-mobile">Antenne</th><th className="hide-mobile">Date</th><th>Montant</th></tr>
            </thead>
            <tbody>
              {items.map(e => {
                const s = STATUS_MAP[e.status] || STATUS_MAP.PENDING_VALIDATION;
                return (
                  <tr key={e.id} className="sae-row" onClick={() => setSelectedExpense(e)}>
                    <td>{e.title} <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2 }}>
                      <span style={{ color: s.color }}>●</span> {s.label}
                    </div></td>
                    <td className="hide-mobile">{e.antenna?.name || '—'}</td>
                    <td className="hide-mobile">{formatDate(e.expenseDate)}</td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 800, color: s.color }}>{formatCurrency(e.amount, e.currency)}</td>
                  </tr>
                );
              })}
              {items.length === 0 && !loading && (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>Aucune dépense trouvée pour ce statut.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedExpense && <SuperAdminExpenseModal expense={selectedExpense} onClose={() => setSelectedExpense(null)} onSuccess={() => { setSelectedExpense(null); void load(); }} />}
    </AppShell>
  );
}