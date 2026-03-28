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
  PENDING_VALIDATION: { label: 'En attente (Super Admin)', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  VALIDATED:          { label: 'Validée (Débitée)',        color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  REJECTED:           { label: 'Rejetée',                  color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  CANCELLED:          { label: 'Annulée',                  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

const METHOD_MAP: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte bancaire',
  OTHER: 'Autre',
};

/* ══════════════════════════════════════════════════════ MODALE DE CRÉATION */

function CreateExpenseModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createAntennaExpense({
        amount: Number(amount),
        category,
        title,
        description: description || undefined,
        expenseDate: new Date(expenseDate).toISOString(),
        paymentMethod: paymentMethod || 'OTHER',
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la dépense.');
      setSaving(false);
    }
  }

  return (
    <div className="ae-modal-overlay" onClick={onClose}>
      <div className="ae-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ae-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            </div>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Nouvelle Dépense</h2>
          </div>
          <button className="ae-modal-close" onClick={onClose} disabled={saving}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="ae-modal-body">
          {error && (
            <div className="ae-error" style={{ marginBottom: '1rem' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              {error}
            </div>
          )}

          <div className="ae-grid-2">
            <div className="ae-field">
              <label>Titre de la dépense <span>*</span></label>
              <input className="ae-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Achat cartouches d'encre" required />
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
                <option value="" disabled>Sélectionnez une catégorie</option>
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
                <option value="">Sélectionnez une méthode</option>
                {Object.entries(METHOD_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="ae-field">
            <label>Description / Justification <span>(Optionnel)</span></label>
            <textarea className="ae-input" style={{ minHeight: '80px', padding: '0.6rem 0.9rem', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails supplémentaires..." />
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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

/* ══════════════════════════════════════════════════════ MODALE DE DÉTAILS */

function ExpenseDetailModal({ expense, onClose, onDeleted }: { expense: Expense; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const s = STATUS_MAP[expense.status] || { label: expense.status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };

  async function handleDelete() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) return;
    setDeleting(true);
    try {
      await api.deleteAntennaExpense(expense.id);
      onDeleted();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      setDeleting(false);
    }
  }

  return (
    <div className="ae-modal-overlay" onClick={onClose}>
      <div className="ae-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ height: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}66)` }} />
        <div className="ae-modal-head">
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.65rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '0.2rem 0.6rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />{s.label}
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>{expense.title}</h2>
          </div>
          <button className="ae-modal-close" onClick={onClose}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="ae-modal-body">
          {expense.rejectionReason && (
            <div className="ae-error" style={{ marginBottom: '1.25rem' }}>
              <strong>Motif du rejet :</strong> {expense.rejectionReason}
            </div>
          )}

          <div className="ae-grid-2">
            <div className="ae-info-box">
              <span className="ae-info-lbl">Montant</span>
              <span className="ae-info-val mono" style={{ fontSize: '1.1rem', color: s.color }}>{formatCurrency(expense.amount, expense.currency)}</span>
            </div>
            <div className="ae-info-box">
              <span className="ae-info-lbl">Date de la dépense</span>
              <span className="ae-info-val">{formatDate(expense.expenseDate)}</span>
            </div>
            <div className="ae-info-box">
              <span className="ae-info-lbl">Catégorie</span>
              <span className="ae-info-val">{CATEGORY_MAP[expense.category] ?? expense.category}</span>
            </div>
            <div className="ae-info-box">
              <span className="ae-info-lbl">Méthode de paiement</span>
              <span className="ae-info-val">{METHOD_MAP[expense.paymentMethod] ?? expense.paymentMethod}</span>
            </div>
          </div>

          <div className="ae-info-box" style={{ marginTop: '0.75rem' }}>
            <span className="ae-info-lbl">Description / Justificatif</span>
            <span className="ae-info-val" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{expense.description || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Aucune description fournie.</span>}</span>
          </div>

          <div className="ae-grid-2" style={{ marginTop: '0.75rem' }}>
            <div className="ae-info-box">
              <span className="ae-info-lbl">Engagée par</span>
              <span className="ae-info-val">{expense.engagedByUser ? `${expense.engagedByUser.firstName} ${expense.engagedByUser.lastName}` : '—'}</span>
            </div>
            <div className="ae-info-box">
              <span className="ae-info-lbl">ID Dépense</span>
              <span className="ae-info-val mono" style={{ fontSize: '0.75rem', color: '#6B7280' }}>{expense.id}</span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            {expense.status !== 'VALIDATED' && (
              <button className="ae-btn-del" disabled={deleting} onClick={handleDelete}>
                {deleting ? 'Suppression...' : 'Supprimer cette dépense'}
              </button>
            )}
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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const load = useCallback(async (search = q, st = status, cat = category) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAntennaExpenses({ page: 1, pageSize: 100, q: search, status: st, category: cat });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des dépenses.');
    } finally {
      setLoading(false);
    }
  }, [q, status, category]);

  useEffect(() => { void load(); }, [load]);

  const totalAmount = items.reduce((acc, curr) => acc + (curr.status === 'VALIDATED' ? Number(curr.amount) : 0), 0);
  const pendingCount = items.filter(i => i.status === 'PENDING_VALIDATION').length;

  return (
    <AppShell title="Dépenses de l'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');

        .ae-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; }
        
        .ae-header { margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: aein 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .ae-eyebrow { font-size: 0.67rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .ae-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: aepulse 2s ease-in-out infinite; }
        @keyframes aepulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .ae-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .ae-title span { background: linear-gradient(135deg, #1D4ED8, #3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .ae-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: aein 0.5s 0.08s cubic-bezier(.22,1,.36,1) forwards; }
        @media (max-width: 768px) { .ae-stats { grid-template-columns: 1fr; } }
        .ae-stat { background: rgba(253,253,255,0.9); backdrop-filter: blur(12px); border-radius: 16px; border: 1px solid rgba(37,99,235,0.09); border-top: 3px solid; padding: 1.1rem 1.25rem; box-shadow: 0 4px 12px rgba(37,99,235,0.04); }
        .ae-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.85rem; font-weight: 700; line-height: 1; margin-bottom: 0.3rem; }
        .ae-stat-lbl { font-size: 0.65rem; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: 0.08em; }

        .ae-panel { background: rgba(253,253,255,0.94); backdrop-filter: blur(14px); border-radius: 22px; border: 1px solid rgba(37,99,235,0.1); box-shadow: 0 4px 20px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset; overflow: hidden; opacity: 0; transform: translateY(10px); animation: aein 0.5s 0.12s cubic-bezier(.22,1,.36,1) forwards; }
        .ae-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.08); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; background: rgba(239,246,255,0.3); }
        .ae-panel-titlerow { display: flex; align-items: center; gap: 0.55rem; }
        .ae-panel-ico { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg, #1D4ED8, #2563EB); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 3px 8px rgba(37,99,235,0.25); }
        .ae-panel-title { font-size: 0.78rem; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #1E3A8A; }

        .ae-new-btn { height: 40px; padding: 0 1.25rem; border-radius: 11px; background: linear-gradient(135deg, #1D4ED8, #3B82F6); border: none; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.84rem; font-weight: 800; display: flex; align-items: center; gap: 0.45rem; box-shadow: 0 4px 14px rgba(37,99,235,0.25); transition: all 0.2s; white-space: nowrap; }
        .ae-new-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.35); }

        .ae-toolbar { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; padding: 1rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.06); }
        .ae-filter-field { display: flex; flex-direction: column; gap: 0.35rem; flex: 1; min-width: 180px; }
        .ae-filter-lbl { font-size: 0.68rem; font-weight: 800; color: #4B5563; letter-spacing: 0.06em; text-transform: uppercase; }
        .ae-filter-input, .ae-filter-select { height: 42px; border-radius: 10px; border: 1px solid rgba(37,99,235,0.15); background: white; padding: 0 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; color: #111827; outline: none; transition: border-color 0.2s, box-shadow 0.2s; width: 100%; box-sizing: border-box; }
        .ae-filter-input:focus, .ae-filter-select:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .ae-filter-select { appearance: none; padding-right: 2.2rem; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.8rem center; cursor: pointer; }

        .ae-table { width: 100%; border-collapse: collapse; }
        .ae-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.1); }
        .ae-table th { padding: 0.85rem 1.4rem; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: #6B7280; background: rgba(239,246,255,0.2); text-align: left; white-space: nowrap; }
        .ae-row { border-bottom: 1px solid rgba(37,99,235,0.06); transition: background 0.15s; cursor: pointer; }
        .ae-row:hover { background: rgba(37,99,235,0.03); }
        .ae-row:last-child { border-bottom: none; }
        .ae-table td { padding: 0.95rem 1.4rem; font-size: 0.84rem; color: #1F2937; vertical-align: middle; }
        .ae-td-title { font-weight: 800; color: #111827; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ae-td-cat { font-size: 0.72rem; color: #6B7280; font-weight: 600; margin-top: 0.2rem; }
        .ae-td-amount { font-family: 'DM Mono', monospace; font-weight: 800; font-size: 0.9rem; }
        .ae-td-date { font-size: 0.78rem; font-weight: 600; color: #6B7280; }

        /* ── MODALE STYLES ── */
        .ae-modal-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 1rem; animation: aefade 0.2s ease; }
        .ae-modal { background: white; width: 100%; max-width: 540px; border-radius: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.15); overflow: hidden; animation: aescale 0.3s cubic-bezier(.22,1,.36,1); display: flex; flex-direction: column; max-height: 90vh; }
        .ae-modal-head { display: flex; justify-content: space-between; align-items: flex-start; padding: 1.25rem 1.5rem; border-bottom: 1px solid #F3F4F6; background: rgba(248,250,252,0.5); }
        .ae-modal-close { background: white; border: 1px solid #E5E7EB; width: 34px; height: 34px; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #6B7280; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .ae-modal-close:hover { background: #F3F4F6; color: #111827; }
        .ae-modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }

        .ae-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-bottom: 1.25rem; }
        @media (max-width: 540px) { .ae-grid-2 { grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1rem; } }

        .ae-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .ae-field label { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #1D4ED8; }
        .ae-field label span { color: #9CA3AF; text-transform: none; font-weight: 500; font-size: 0.6rem; margin-left: 0.2rem; }
        .ae-input, .ae-select { width: 100%; min-height: 44px; border-radius: 10px; border: 1px solid #D1D5DB; background: #F9FAFB; padding: 0 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 600; color: #111827; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .ae-input:focus, .ae-select:focus { border-color: #2563EB; background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        .ae-input.mono { font-family: 'DM Mono', monospace; font-size: 0.95rem; }
        .ae-select { appearance: none; padding-right: 2.2rem; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.8rem center; cursor: pointer; }

        .ae-info-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 0.8rem 1rem; display: flex; flex-direction: column; gap: 0.2rem; }
        .ae-info-lbl { font-size: 0.62rem; font-weight: 800; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.08em; }
        .ae-info-val { font-size: 0.88rem; font-weight: 700; color: #111827; }

        .ae-btn-submit { height: 44px; padding: 0 1.4rem; border-radius: 11px; background: linear-gradient(135deg, #1D4ED8, #2563EB); border: none; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 800; box-shadow: 0 4px 14px rgba(37,99,235,0.25); display: flex; align-items: center; gap: 0.5rem; transition: transform 0.15s; }
        .ae-btn-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .ae-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .ae-btn-cancel { height: 44px; padding: 0 1.25rem; border-radius: 11px; background: white; border: 1px solid #D1D5DB; color: #4B5563; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; transition: background 0.15s; }
        .ae-btn-cancel:hover:not(:disabled) { background: #F3F4F6; }
        .ae-btn-del { height: 44px; padding: 0 1.25rem; border-radius: 11px; background: rgba(254,242,242,0.6); border: 1px solid rgba(220,38,38,0.2); color: #DC2626; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; transition: background 0.15s; }
        .ae-btn-del:hover:not(:disabled) { background: #FEE2E2; }

        .ae-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: aespin 0.7s linear infinite; }
        .ae-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.8rem; font-weight: 700; }
        .ae-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.85rem; font-weight: 700; }
        .ae-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.12); border-top-color: #2563EB; border-radius: 50%; animation: aespin 0.8s linear infinite; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .ae-table th, .ae-table td { padding: 0.8rem 0.6rem; }
        }

        @keyframes aein { to { opacity: 1; transform: translateY(0); } }
        @keyframes aefade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes aescale { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes aespin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ae-wrap">
        <div className="ae-header">
          <div className="ae-eyebrow"><div className="ae-eyebrow-dot" />Admin Antenne</div>
          <h1 className="ae-title">Gestion des <span>Dépenses</span></h1>
        </div>

        <div className="ae-stats">
          <div className="ae-stat" style={{ borderTopColor: '#2563EB' }}>
            <div className="ae-stat-val" style={{ color: '#1E3A8A' }}>{items.length}</div>
            <div className="ae-stat-lbl">Dépenses enregistrées</div>
          </div>
          <div className="ae-stat" style={{ borderTopColor: '#059669' }}>
            <div className="ae-stat-val" style={{ color: '#047857' }}>{formatCurrency(totalAmount, items[0]?.currency || 'EUR')}</div>
            <div className="ae-stat-lbl">Total Validé (Débité)</div>
          </div>
          <div className="ae-stat" style={{ borderTopColor: '#D97706' }}>
            <div className="ae-stat-val" style={{ color: '#B45309' }}>{pendingCount}</div>
            <div className="ae-stat-lbl">En attente (Super Admin)</div>
          </div>
        </div>

        <div className="ae-panel">
          <div className="ae-panel-head">
            <div className="ae-panel-titlerow">
              <div className="ae-panel-ico">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              </div>
              <span className="ae-panel-title">Historique des dépenses</span>
            </div>
            <button className="ae-new-btn" onClick={() => setIsCreateOpen(true)}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Nouvelle dépense
            </button>
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
            <div className="ae-error" style={{ margin: '1rem 1.4rem' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="ae-loader"><div className="ae-ring" />Chargement des dépenses...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9CA3AF' }}>
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#4B5563' }}>Aucune dépense trouvée</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ae-table">
                <thead>
                  <tr>
                    <th>Motif</th>
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.62rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '0.15rem 0.5rem', whiteSpace: 'nowrap' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
                            {s.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isCreateOpen && (
        <CreateExpenseModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => { setIsCreateOpen(false); void load(); }}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onDeleted={() => { setSelectedExpense(null); void load(); }}
        />
      )}
    </AppShell>
  );
}