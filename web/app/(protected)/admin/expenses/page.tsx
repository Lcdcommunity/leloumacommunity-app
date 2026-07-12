// web/app/(protected)/admin/expenses/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type Expense } from '../../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ CONSTANTES & TRADUCTIONS */

const CATEGORY_MAP: Record<string, string> = {
  BILL: 'Factures',
  OFFICE_SUPPLIES: 'Fournitures de bureau',
  TRAVEL: 'Frais de déplacement',
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

const METHOD_MAP: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte bancaire',
  OTHER: 'Autre',
};

/* ══════════════════════════════════════════════════════ MODALE DE CRÉATION */

function CreateExpenseModal({ onClose, onSuccess, availableBalance }: { onClose: () => void; onSuccess: () => void; availableBalance: number }) {
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<string>('OTHER');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const expenseAmount = Number(amount);

    // Vérification stricte du solde
    if (expenseAmount > availableBalance) {
      setError(`Transaction impossible : Le montant (${formatCurrency(expenseAmount, 'EUR')}) excède le solde disponible de l'antenne (${formatCurrency(availableBalance, 'EUR')}).`);
      setSaving(false);
      return;
    }

    try {
      const payload = {
        amount: expenseAmount,
        category,
        title,
        description: description || undefined,
        expenseDate: new Date(expenseDate).toISOString(),
        paymentMethod: paymentMethod || 'OTHER',
      };

      // Typage strict pour éviter les erreurs ESLint (au lieu de `as any`)
      await api.createAntennaExpense(payload as Parameters<typeof api.createAntennaExpense>[0]); 

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la dépense.');
      setSaving(false);
    }
  }

  return (
    <div className="ae-modal-overlay" onClick={onClose}>
      <div className="ae-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ae-modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Nouvelle Dépense
            </h2>
          </div>
          <button className="ae-modal-close" onClick={onClose} disabled={saving}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ae-modal-body">
          {error && (
            <div className="ae-error">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              <span>{error}</span>
            </div>
          )}

          <div className="ae-grid-2">
            <div className="ae-field">
              <label>Titre de la dépense <span>*</span></label>
              <input className="ae-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Achat fournitures" required />
            </div>
            <div className="ae-field">
              <label>Montant <span>*</span></label>
              <input type="number" step="0.01" min="0.01" className="ae-input mono" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
            </div>
          </div>

          <div className="ae-grid-2">
            <div className="ae-field">
              <label>Catégorie <span>*</span></label>
              <select className="ae-select" value={category} onChange={(e) => setCategory(e.target.value)} required>
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="ae-field">
              <label>Date de la dépense <span>*</span></label>
              <input type="date" className="ae-input" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
            </div>
          </div>

          <div className="ae-grid-2">
            <div className="ae-field">
              <label>Méthode de paiement</label>
              <select className="ae-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {Object.entries(METHOD_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ae-field">
            <label>Description / Justificatif <span>(Optionnel)</span></label>
            <textarea className="ae-input" style={{ minHeight: '80px', padding: '0.75rem 1rem', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails supplémentaires..." />
          </div>

          <div className="ae-modal-footer">
            <button type="button" className="ae-btn-cancel" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="ae-btn-submit" disabled={saving}>
              {saving ? <><div className="ae-spinner" />Création...</> : 'Enregistrer la dépense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ MODALE DE DÉTAILS (LECTURE SEULE) */

function ExpenseDetailModal({ expense, onClose }: { expense: Expense; onClose: () => void; }) {
  const s = STATUS_MAP[expense.status] || { label: expense.status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };

  return (
    <div className="ae-modal-overlay" onClick={onClose}>
      <div className="ae-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ height: 5, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)` }} />

        {/* Entête avec statut centré */}
        <div className="ae-modal-head" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '0.3rem 0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />{s.label}
          </span>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 700, color: '#0F172A', marginTop: '0.75rem', marginBottom: 0, lineHeight: 1.2 }}>{expense.title}</h2>

          <button className="ae-modal-close" onClick={onClose} style={{ position: 'absolute', right: '1.25rem', top: '1.25rem' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="ae-modal-body">
          {expense.rejectionReason && (
            <div className="ae-error" style={{ marginBottom: '1.25rem' }}>
              <strong>Motif du rejet :</strong> {expense.rejectionReason}
            </div>
          )}

          <div className="ae-details-sections">
            <div className="ae-grid-2">
              <div className="ae-detail-block">
                <span className="ae-label">Montant</span>
                <span className="ae-value mono" style={{ fontSize: '1.2rem', color: s.color }}>{formatCurrency(expense.amount, expense.currency)}</span>
              </div>
              <div className="ae-detail-block">
                <span className="ae-label">Date de la dépense</span>
                <span className="ae-value">{formatDate(expense.expenseDate)}</span>
              </div>
              <div className="ae-detail-block">
                <span className="ae-label">Catégorie</span>
                <span className="ae-value">{CATEGORY_MAP[expense.category] ?? expense.category}</span>
              </div>
              <div className="ae-detail-block">
                <span className="ae-label">Méthode de paiement</span>
                <span className="ae-value">{METHOD_MAP[expense.paymentMethod] ?? expense.paymentMethod}</span>
              </div>
            </div>

            <div className="ae-detail-block full-width">
              <span className="ae-label">Description / Justificatif</span>
              <span className="ae-value" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {expense.description || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Aucune description fournie.</span>}
              </span>
            </div>

            <div className="ae-grid-2">
              <div className="ae-detail-block">
                <span className="ae-label">Engagée par</span>
                <span className="ae-value">{expense.engagedByUser ? `${expense.engagedByUser.firstName} ${expense.engagedByUser.lastName}` : '—'}</span>
              </div>
              <div className="ae-detail-block">
                <span className="ae-label">ID Dépense</span>
                <span className="ae-value mono" style={{ fontSize: '0.75rem', color: '#64748B', wordBreak: 'break-all' }}>{expense.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE PRINCIPALE */

export default function AntennaAdminExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Calcule le solde disponible (Entrées validées - Sorties validées)
  const fetchBalance = async () => {
    try {
      const [contribsRes, expensesRes] = await Promise.all([
        api.listAntennaContributions({ page: 1, pageSize: 1000, status: 'VALIDATED' }),
        api.listAntennaExpenses({ page: 1, pageSize: 1000, status: 'VALIDATED' })
      ]);

      // Utilisation d'un type local pour corriger l'erreur "any"
      type ApiItem = { amount: number | string };
      type ApiResponse = { items?: ApiItem[] };

      const incomeList = Array.isArray(contribsRes) ? contribsRes : (contribsRes as unknown as ApiResponse)?.items ?? [];
      const expenseList = Array.isArray(expensesRes) ? expensesRes : (expensesRes as unknown as ApiResponse)?.items ?? [];

      const totalIncome = incomeList.reduce((acc, curr) => acc + Number(curr.amount), 0);
      const totalSpent = expenseList.reduce((acc, curr) => acc + Number(curr.amount), 0);

      setAvailableBalance(totalIncome - totalSpent);
    } catch (err) {
      console.error('Erreur lors du calcul du solde:', err);
    }
  };

  const load = useCallback(async (search = q, st = status, cat = category) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAntennaExpenses({ page: 1, pageSize: 100, q: search, status: st, category: cat });
      setItems(res.items);
      await fetchBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des dépenses.');
    } finally {
      setLoading(false);
    }
  }, [q, status, category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des données au montage : setLoading/setError sont déclenchés de façon synchrone au début de load() avant le premier "await" ; pattern standard de data-fetching, faux positif connu de la règle (cf. react/react#34743).
    void load();
  }, [load]);

  const totalAmount = items.reduce((acc, curr) => acc + (curr.status === 'VALIDATED' ? Number(curr.amount) : 0), 0);
  const pendingCount = items.filter(i => i.status === 'PENDING_VALIDATION').length;

  return (
    <AppShell title="Dépenses de l'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&family=Inter:wght@400;500;600;700&display=swap');

        .ae-wrap { font-family: 'DM Sans', 'Inter', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; }
        
        /* ── HEADER MODIFIÉ ── */
        .ae-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: aein 0.5s cubic-bezier(.22,1,.36,1) forwards; }
        .ae-header-text { display: flex; flex-direction: column; }
        .ae-eyebrow { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem; }
        .ae-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; }
        .ae-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.6rem, 4vw, 2.2rem); font-weight: 700; color: #0F172A; letter-spacing: -0.02em; line-height: 1.15; margin: 0; }
        .ae-title span { color: #2563EB; }        .ae-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; opacity: 0; transform: translateY(10px); animation: aein 0.5s 0.05s cubic-bezier(.22,1,.36,1) forwards; }
        .ae-stat { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 1.25rem 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: center; }
        .ae-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; line-height: 1; margin-bottom: 0.4rem; color: #0F172A; }
        .ae-stat-lbl { font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }

        .ae-panel { background: white; border-radius: 20px; border: 1px solid #E2E8F0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); overflow: hidden; opacity: 0; transform: translateY(10px); animation: aein 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards; }
        
        .ae-panel-head { padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; background: #F8FAFC; }
        .ae-panel-titlerow { display: flex; align-items: center; gap: 0.6rem; }
        .ae-panel-ico { width: 36px; height: 36px; border-radius: 10px; background: #2563EB; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(37,99,235,0.2); }
        .ae-panel-title { font-size: 0.9rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #0F172A; }

        .ae-new-btn { height: 42px; padding: 0 1.25rem; border-radius: 10px; background: #2563EB; border: none; color: white; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 12px rgba(37,99,235,0.2); transition: all 0.2s; }
        .ae-new-btn:hover { background: #1D4ED8; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(37,99,235,0.3); }

        .ae-toolbar { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; }
        .ae-filter-field { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 180px; }
        .ae-filter-lbl { font-size: 0.65rem; font-weight: 800; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; }
        .ae-filter-input, .ae-filter-select { height: 44px; border-radius: 10px; border: 1px solid #CBD5E1; background: white; padding: 0 1rem; font-family: 'Inter', sans-serif; font-size: 0.85rem; font-weight: 500; color: #0F172A; outline: none; transition: border-color 0.2s, box-shadow 0.2s; width: 100%; box-sizing: border-box; }
        .ae-filter-input:focus, .ae-filter-select:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .ae-filter-select { appearance: none; padding-right: 2.2rem; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.8rem center; cursor: pointer; }

        /* Styles Tableau Bureau (Desktop) */
        .ae-table { width: 100%; border-collapse: collapse; }
        .ae-table thead tr { border-bottom: 1px solid #E2E8F0; }
        .ae-table th { padding: 1rem 1.5rem; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #64748B; background: #F8FAFC; text-align: left; white-space: nowrap; }
        .ae-row { border-bottom: 1px solid #F1F5F9; transition: background 0.15s; cursor: pointer; }
        .ae-row:hover { background: #F8FAFC; }
        .ae-row:last-child { border-bottom: none; }
        .ae-table td { padding: 1rem 1.5rem; font-size: 0.85rem; color: #1E293B; vertical-align: middle; }
        .ae-td-title { font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 350px; font-size: 0.95rem; }
        .ae-td-cat { font-size: 0.75rem; color: #64748B; font-weight: 500; margin-top: 0.2rem; }
        .ae-td-amount { font-family: 'DM Mono', monospace; font-weight: 700; font-size: 1rem; }
        .ae-td-date { font-size: 0.8rem; font-weight: 500; color: #475569; }

        /* ── CORRECTIONS MOBILE ── */
        .ae-cards-mobile { display: none; }

        @media (max-width: 768px) {
            .hide-mobile { display: none !important; }
            .ae-table { display: none; } 
            
            /* Ajustement de l'entête sur mobile pour garder le bouton visible */
            .ae-header { align-items: center; }
            .ae-title { font-size: 1.25rem !important; }
            .ae-new-btn { padding: 0 0.8rem; height: 36px; font-size: 0.8rem; border-radius: 8px; }
            .btn-text { display: none; } /* Cache le texte du bouton sur très petits écrans pour gagner de la place */
            
            /* Ajustement des stats pour qu'elles soient sur une seule ligne */
            .ae-stats { 
              grid-template-columns: repeat(3, 1fr); 
              gap: 0.5rem; 
              margin-bottom: 1rem; 
            }
            .ae-stat { 
              padding: 0.5rem; 
              flex-direction: column; 
              justify-content: center; 
              align-items: center; 
              border-top: none; 
              border-left: 0; 
              border-bottom: 3px solid; 
              text-align: center;
              border-radius: 12px;
            }
            .ae-stat-val { font-size: 1rem !important; margin-bottom: 0.2rem; }
            .ae-stat-lbl { font-size: 0.5rem !important; }

            .ae-cards-mobile { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; background: #F8FAFC; }

            .ae-m-card { display: flex; align-items: center; gap: 1rem; background: white; padding: 1rem; border-radius: 16px; border: 1px solid #E2E8F0; box-shadow: 0 2px 4px rgba(0,0,0,0.02); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
            .ae-m-card:active { transform: scale(0.98); }
            
            .ae-m-icon { width: 44px; height: 44px; border-radius: 12px; background: #F1F5F9; color: #64748B; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            
            .ae-m-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
            .ae-m-title { font-weight: 700; font-size: 0.95rem; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .ae-m-date { font-size: 0.75rem; font-weight: 500; color: #64748B; }
            
            .ae-m-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem; flex-shrink: 0; }
            .ae-m-amount { font-family: 'DM Mono', monospace; font-weight: 700; font-size: 1rem; color: #0F172A; }

            .ae-toolbar { flex-wrap: nowrap; gap: 0.5rem; padding: 1rem; overflow-x: auto; scrollbar-width: none; }
            .ae-toolbar::-webkit-scrollbar { display: none; }
            .ae-filter-field { min-width: 0; flex: 1; }
            .ae-filter-lbl { font-size: 0.55rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .ae-filter-input, .ae-filter-select { height: 40px; font-size: 0.8rem; padding: 0 0.75rem; }
            .ae-filter-select { padding-right: 1.8rem; background-position: right 0.5rem center; background-size: 10px; }
        }

        /* ── MODALES (Correction fusion textes) ── */
        .ae-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1rem; animation: aefade 0.2s ease; }
        .ae-modal { background: white; width: 100%; max-width: 520px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); overflow: hidden; animation: aescale 0.3s cubic-bezier(.22,1,.36,1); display: flex; flex-direction: column; max-height: calc(100vh - 2rem); position: relative; }
        
        .ae-modal-head { padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; background: white; }
        .ae-modal-close { background: white; border: 1px solid #E2E8F0; width: 34px; height: 34px; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #64748B; transition: all 0.2s; }
        .ae-modal-close:hover { background: #F1F5F9; color: #0F172A; }
        
        .ae-modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
        
        .ae-details-sections { display: flex; flex-direction: column; gap: 0.75rem; }
        .ae-detail-block { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
        .ae-label { font-size: 0.65rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; display: block; }
        .ae-value { font-size: 0.9rem; font-weight: 600; color: #0F172A; display: block; }

        .ae-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
        .full-width { grid-column: 1 / -1; }

        .ae-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .ae-field label { font-size: 0.75rem; font-weight: 700; color: #1E293B; }
        .ae-field label span { color: #DC2626; margin-left: 0.2rem; }
        .ae-input, .ae-select { width: 100%; min-height: 44px; border-radius: 10px; border: 1px solid #CBD5E1; background: white; padding: 0 1rem; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 500; color: #0F172A; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .ae-input:focus, .ae-select:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .ae-input.mono { font-family: 'DM Mono', monospace; font-size: 1rem; font-weight: 600; }
        .ae-select { appearance: none; padding-right: 2.2rem; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.8rem center; cursor: pointer; }

        .ae-modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid #F1F5F9; display: flex; justify-content: flex-end; gap: 0.75rem; background: white; }
        
        .ae-btn-submit { height: 44px; padding: 0 1.5rem; border-radius: 10px; background: #2563EB; border: none; color: white; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; box-shadow: 0 4px 12px rgba(37,99,235,0.2); display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s; }
        .ae-btn-submit:hover:not(:disabled) { background: #1D4ED8; }
        .ae-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
        
        .ae-btn-cancel { height: 44px; padding: 0 1.25rem; border-radius: 10px; background: white; border: 1px solid #CBD5E1; color: #475569; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; transition: background 0.2s; }
        .ae-btn-cancel:hover:not(:disabled) { background: #F8FAFC; color: #0F172A; }
        .ae-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: aespin 0.8s linear infinite; }
        .ae-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; color: #B91C1C; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
        .ae-loader { display: flex; align-items: center; justify-content: center; padding: 4rem; gap: 0.75rem; color: #64748B; font-size: 0.9rem; font-weight: 600; }
        .ae-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.2); border-top-color: #2563EB; border-radius: 50%; animation: aespin 0.8s linear infinite; }

        @keyframes aein { to { opacity: 1; transform: translateY(0); } }
        @keyframes aefade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aescale { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes aespin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ae-wrap">
        <div className="ae-header">
          <div className="ae-header-text">
            <div className="ae-eyebrow"><div className="ae-eyebrow-dot" />Admin Antenne</div>
            <h1 className="ae-title">Gestion des <span>Dépenses</span></h1>
          </div>
          <button className="ae-new-btn" onClick={() => setIsCreateOpen(true)}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span className="btn-text hide-mobile">Nouvelle dépense</span>
          </button>
        </div>

        <div className="ae-stats">
          <div className="ae-stat" style={{ borderBottomColor: '#2563EB' }}>
            <div className="ae-stat-val" style={{ color: '#1E3A8A' }}>{items.length}</div>
            <div className="ae-stat-lbl">Enregistrées</div>
          </div>
          <div className="ae-stat" style={{ borderBottomColor: '#059669' }}>
            <div className="ae-stat-val" style={{ color: '#047857' }}>{formatCurrency(totalAmount, items[0]?.currency || 'EUR')}</div>
            <div className="ae-stat-lbl">Total Validé</div>
          </div>
          <div className="ae-stat" style={{ borderBottomColor: '#D97706' }}>
            <div className="ae-stat-val" style={{ color: '#B45309' }}>{pendingCount}</div>
            <div className="ae-stat-lbl">En attente</div>
          </div>
        </div>

        <div className="ae-panel">
          <div className="ae-panel-head">
            <div className="ae-panel-titlerow">
              <div className="ae-panel-ico">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              </div>
              <span className="ae-panel-title">Historique</span>
            </div>
          </div>

          <div className="ae-toolbar">
            <div className="ae-filter-field">
              <label className="ae-filter-lbl">Recherche</label>
              <input className="ae-filter-input" type="text" placeholder="Motif..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load(q, status, category)} />
            </div>
            <div className="ae-filter-field">
              <label className="ae-filter-lbl">Statut</label>
              <select className="ae-filter-select" value={status} onChange={(e) => { const v = e.target.value; setStatus(v); void load(q, v, category); }}>
                <option value="">Tous</option>
                <option value="PENDING_VALIDATION">En attente</option>
                <option value="VALIDATED">Validées</option>
                <option value="REJECTED">Rejetées</option>
              </select>
            </div>
            <div className="ae-filter-field">
              <label className="ae-filter-lbl">Catégorie</label>
              <select className="ae-filter-select" value={category} onChange={(e) => { const v = e.target.value; setCategory(v); void load(q, status, v); }}>
                <option value="">Toutes</option>
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="ae-error" style={{ margin: '1rem 1.5rem' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="ae-loader"><div className="ae-ring" />Chargement...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#9CA3AF' }}>
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748B' }}>Aucune dépense trouvée</div>
            </div>
          ) : (
            <>
              {/* Tableau Bureau */}
              <table className="ae-table">
                <thead>
                  <tr>
                    <th>Motif / Catégorie</th>
                    <th className="hide-mobile">Date</th>
                    <th>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((expense) => {
                    const s = STATUS_MAP[expense.status] || { label: expense.status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
                    return (
                      <tr key={expense.id} className="ae-row" onClick={() => setSelectedExpense(expense)}>
                        <td>
                          <div className="ae-td-title">{expense.title}</div>
                          <div className="ae-td-cat">{CATEGORY_MAP[expense.category] ?? expense.category}</div>
                        </td>
                        <td className="hide-mobile"><span className="ae-td-date">{formatDate(expense.expenseDate)}</span></td>
                        <td><span className="ae-td-amount" style={{ color: s.color }}>{formatCurrency(expense.amount, expense.currency)}</span></td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '0.2rem 0.6rem', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Design Mobile Fintech Épuré */}
              <div className="ae-cards-mobile">
                {items.map((expense) => {
                  const s = STATUS_MAP[expense.status] || { label: expense.status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
                  return (
                    <div key={expense.id} className="ae-m-card" onClick={() => setSelectedExpense(expense)}>
                      <div className="ae-m-icon">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                      </div>
                      <div className="ae-m-body">
                        <div className="ae-m-title">{expense.title}</div>
                        <div className="ae-m-date">{formatDate(expense.expenseDate)}</div>
                      </div>
                      <div className="ae-m-right">
                        <div className="ae-m-amount" style={{ color: s.color }}>{formatCurrency(expense.amount, expense.currency)}</div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.55rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '0.15rem 0.4rem', textTransform: 'uppercase' }}>
                          <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color }} />
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gestion des modales */}
      {isCreateOpen && (
        <CreateExpenseModal
          availableBalance={availableBalance}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => { setIsCreateOpen(false); void load(); }}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
        />
      )}
    </AppShell>
  );
}