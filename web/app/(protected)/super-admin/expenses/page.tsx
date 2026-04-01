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
  VALIDATED:           { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  REJECTED:            { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  CANCELLED:           { label: 'Annulée',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
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
      setError(err instanceof Error ? err.message : 'Erreur'); 
      setSaving(false); 
    }
  }

  return (
    <div className="sae-modal-overlay" onClick={onClose}>
      <div className="sae-modal" onClick={e => e.stopPropagation()}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}66)` }} />
        <div className="sae-modal-head">
          <div style={{ flex: 1 }}>
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
              <button className="sae-btn-validate" onClick={handleValidate} disabled={saving}>✔ Approuver</button>
              <button className="sae-btn-reject" onClick={() => setIsRejecting(true)} disabled={saving}>✖ Refuser</button>
            </div>
          )}

          {isRejecting && (
            <form onSubmit={handleReject} style={{ marginTop: '1.5rem', background: '#FEF2F2', border: '1px solid #FECACA', padding: '1rem', borderRadius: 12 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Motif du refus *</label>
              <textarea className="sae-input" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} required style={{ minHeight: '60px', padding: '0.6rem 0.9rem', marginBottom: '0.75rem', borderColor: '#FECACA' }} placeholder="Expliquez pourquoi..." />
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" className="sae-btn-cancel" onClick={() => setIsRejecting(false)}>Annuler</button>
                <button type="submit" className="sae-btn-reject" disabled={saving}>Confirmer</button>
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
  const [status, setStatus] = useState('PENDING_VALIDATION');
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

  return (
    <AppShell title="Contrôle des dépenses">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        
        .sae-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1000px; margin: 0 auto; box-sizing: border-box; }
        .sae-header { margin-bottom: 1.5rem; text-align: left; }
        .sae-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 5vw, 2.4rem); font-weight: 700; color: #111827; margin: 0; line-height: 1.1; }
        .sae-title span { color: #DC2626; }
        
        .sae-panel { background: white; border-radius: 24px; border: 1px solid rgba(220,38,38,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.04); overflow: hidden; }
        .sae-panel-head { padding: 1.25rem; border-bottom: 1px solid #F1F5F9; background: #FAFBFD; display: flex; flex-direction: column; gap: 1rem; }
        
        .sae-filter-select { 
          width: 100%; height: 48px; border-radius: 14px; border: 1.5px solid #E2E8F0; padding: 0 1.25rem; 
          font-family: 'DM Sans'; font-size: 0.9rem; font-weight: 700; color: #1E293B; outline: none; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); 
          background-repeat: no-repeat; background-position: right 1rem center; cursor: pointer; background-color: white; transition: all 0.2s; 
        }
        .sae-filter-select:focus { border-color: #DC2626; box-shadow: 0 0 0 4px rgba(220,38,38,0.1); }
        
        /* TABLEAU DESKTOP */
        .sae-table-wrap { display: none; }
        
        /* CARTES MOBILE (Par défaut) */
        .sae-cards-list { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; }
        .sae-expense-card { 
          background: white; border: 1.5px solid #F1F5F9; border-radius: 18px; padding: 1.25rem; 
          transition: all 0.2s; cursor: pointer; position: relative; overflow: hidden;
        }
        .sae-expense-card:active { transform: scale(0.98); background: #FAFBFD; }
        .sae-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
        .sae-card-title { font-weight: 800; color: #1E293B; font-size: 1rem; flex: 1; padding-right: 0.5rem; }
        .sae-card-amount { font-family: 'DM Mono', monospace; font-weight: 800; font-size: 1.1rem; }
        .sae-card-meta { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; font-size: 0.75rem; color: #64748B; font-weight: 600; }
        .sae-tag { background: #F1F5F9; padding: 0.25rem 0.6rem; border-radius: 8px; }

        /* RESPONSIVE DESKTOP */
        @media (min-width: 768px) {
          .sae-panel-head { flex-direction: row; justify-content: space-between; align-items: center; }
          .sae-filter-select { width: 300px; }
          .sae-cards-list { display: none; }
          .sae-table-wrap { display: block; overflow-x: auto; }
          .sae-table { width: 100%; border-collapse: collapse; }
          .sae-table th { padding: 1.25rem; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #64748B; text-align: left; letter-spacing: 0.05em; border-bottom: 1.5px solid #F1F5F9; }
          .sae-table td { padding: 1.25rem; font-size: 0.9rem; font-weight: 600; color: #1E293B; border-bottom: 1px solid #F8FAFC; }
          .sae-row:hover { background: #FEF2F2; }
        }

        .sae-modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(15,23,42,0.6); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1rem; animation: saeFade 0.3s ease; }
        .sae-modal { background: white; width: 100%; max-width: 500px; border-radius: 28px; overflow: hidden; display: flex; flex-direction: column; max-height: 92vh; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); }
        .sae-modal-head { padding: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; border-bottom: 1px solid #F1F5F9; background: white; }
        .sae-modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; -webkit-overflow-scrolling: touch; }
        .sae-modal-close { background: #F1F5F9; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748B; flex-shrink: 0; }
        
        .sae-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 480px) { .sae-grid-2 { grid-template-columns: 1fr; } }
        
        .sae-info-box { background: #F8FAFC; border: 1.5px solid #F1F5F9; border-radius: 18px; padding: 1rem; display: flex; flex-direction: column; gap: 0.3rem; }
        .sae-info-lbl { font-size: 0.65rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; }
        .sae-info-val { font-size: 0.95rem; font-weight: 700; color: #1E293B; }
        
        .sae-btn-validate { flex: 1; background: #059669; color: white; border: none; padding: 1rem; border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(5,150,105,0.2); }
        .sae-btn-reject { flex: 1; background: #FEF2F2; color: #DC2626; border: 1.5px solid #FECACA; padding: 1rem; border-radius: 16px; font-weight: 800; cursor: pointer; }
        .sae-btn-cancel { background: white; color: #475569; border: 1.5px solid #E2E8F0; padding: 0.8rem 1.2rem; border-radius: 14px; font-weight: 700; cursor: pointer; }
        
        .mono { font-family: 'DM Mono', monospace; }
        .spinner { width: 32px; height: 32px; border: 3.5px solid rgba(220,38,38,0.1); border-top-color: #DC2626; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 4rem auto; }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes saeFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="sae-wrap">
        <header className="sae-header">
          <h1 className="sae-title">Contrôle des <span>Dépenses</span></h1>
        </header>
        
        <div className="sae-panel">
          <div className="sae-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E293B' }}>Validation globale</div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Toutes les antennes</div>
              </div>
            </div>

            <select className="sae-filter-select" value={status} onChange={e => { const v = e.target.value; setStatus(v); void load(v); }}>
              <option value="">Toutes les dépenses</option>
              <option value="PENDING_VALIDATION">⏳ En attente de validation</option>
              <option value="VALIDATED">✅ Dépenses validées</option>
              <option value="REJECTED">❌ Dépenses refusées</option>
            </select>
          </div>
          
          {loading ? (
            <div className="spinner" />
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 1.5rem', color: '#94A3B8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍃</div>
              <div style={{ fontWeight: 700, color: '#475569' }}>Aucune dépense trouvée</div>
              <div style={{ fontSize: '0.85rem' }}>Tout est à jour pour ce statut.</div>
            </div>
          ) : (
            <>
              {/* VUE CARTES (MOBILE) */}
              <div className="sae-cards-list">
                {items.map(e => {
                  const s = STATUS_MAP[e.status] || STATUS_MAP.PENDING_VALIDATION;
                  return (
                    <div key={e.id} className="sae-expense-card" onClick={() => setSelectedExpense(e)}>
                      <div className="sae-card-header">
                        <div className="sae-card-title">{e.title}</div>
                        <div className="sae-card-amount" style={{ color: s.color }}>{formatCurrency(e.amount, e.currency)}</div>
                      </div>
                      <div className="sae-card-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: s.color }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                          {s.label}
                        </span>
                        <span className="sae-tag">{e.antenna?.name || 'Assoc.'}</span>
                        <span className="sae-tag">{CATEGORY_MAP[e.category] || e.category}</span>
                        <span style={{ marginLeft: 'auto' }}>{formatDate(e.expenseDate)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VUE TABLEAU (DESKTOP) */}
              <div className="sae-table-wrap">
                <table className="sae-table">
                  <thead>
                    <tr>
                      <th>Détails & Motif</th>
                      <th>Antenne</th>
                      <th>Date</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(e => {
                      const s = STATUS_MAP[e.status] || STATUS_MAP.PENDING_VALIDATION;
                      return (
                        <tr key={e.id} className="sae-row" onClick={() => setSelectedExpense(e)} style={{ cursor: 'pointer' }}>
                          <td>
                            <div style={{ fontWeight: 800 }}>{e.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                              {s.label} • {CATEGORY_MAP[e.category] || e.category}
                            </div>
                          </td>
                          <td>
                            <span style={{ background: '#F1F5F9', padding: '0.35rem 0.75rem', borderRadius: 10, fontSize: '0.8rem' }}>{e.antenna?.name || '—'}</span>
                          </td>
                          <td style={{ color: '#64748B' }}>{formatDate(e.expenseDate)}</td>
                          <td className="mono" style={{ fontWeight: 800, color: s.color, fontSize: '1.05rem' }}>{formatCurrency(e.amount, e.currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      
      {selectedExpense && (
        <SuperAdminExpenseModal 
          expense={selectedExpense} 
          onClose={() => setSelectedExpense(null)} 
          onSuccess={() => { setSelectedExpense(null); void load(); }} 
        />
      )}
    </AppShell>
  );
}