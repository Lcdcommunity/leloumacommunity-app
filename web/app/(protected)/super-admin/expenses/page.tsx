// web/app/(protected)/super-admin/expenses/page.tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type Expense } from '../../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../../lib/format';

interface SuperAdminExtendedApi {
  listSuperAdminExpenses(params: Record<string, unknown>): Promise<{ items: Expense[] }>;
  updateExpenseSuperAdmin(id: string, payload: Record<string, unknown>): Promise<void>;
  deleteExpenseSuperAdmin(id: string): Promise<void>;
}
const adminApi = api as unknown as SuperAdminExtendedApi;

const CATEGORY_MAP: Record<string, string> = {
  BILL: 'Factures',
  OFFICE_SUPPLIES: 'Fournitures de bureau',
  TRAVEL: 'Déplacement',
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

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  VALIDATED:          { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  REJECTED:           { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  CANCELLED:          { label: 'Annulée',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
};

/* ══════════════════════════════════════════════════════ MODALE VALIDATION / DÉTAILS */
function SuperAdminExpenseModal({ 
  expense, 
  onClose, 
  onSuccess,
  onEdit,
  onDelete
}: { 
  expense: Expense; 
  onClose: () => void; 
  onSuccess: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = STATUS_MAP[expense.status] || STATUS_MAP.PENDING_VALIDATION;

  async function handleValidate() {
    if (!window.confirm('Valider cette dépense ? Elle sera définitivement débitée du solde de l\'antenne.')) return;
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
          <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.28rem', fontSize: '0.65rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '0.2rem 0.6rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />{s.label}
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {CATEGORY_MAP[expense.category] ?? expense.category}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
            <button className="sae-action-btn sae-action-edit" onClick={onEdit} title="Modifier" disabled={saving}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            <button className="sae-action-btn sae-action-del" onClick={onDelete} title="Supprimer" disabled={saving}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
            <div style={{ width: 1, height: 24, background: '#E2E8F0', margin: '0 0.15rem' }} />
            <button className="sae-modal-close" onClick={onClose} disabled={saving}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
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
            <div className="sae-info-box" style={{ gridColumn: '1 / -1' }}>
              <span className="sae-info-lbl">Motif de la dépense</span>
              <span className="sae-info-val">{expense.title}</span>
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
              <button className="sae-btn-validate" onClick={() => void handleValidate()} disabled={saving}>✔ Approuver</button>
              <button className="sae-btn-reject" onClick={() => setIsRejecting(true)} disabled={saving}>✖ Refuser</button>
            </div>
          )}

          {isRejecting && (
            <form onSubmit={(e) => void handleReject(e)} style={{ marginTop: '1.5rem', background: '#FEF2F2', border: '1px solid #FECACA', padding: '1rem', borderRadius: 12 }}>
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

/* ══════════════════════════════════════════════════════ MODALE ÉDITION (SUPER ADMIN) */
function EditExpenseModal({ expense, onClose, onSuccess }: { expense: Expense; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(expense.title);
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState(expense.category);
  const [expenseDate, setExpenseDate] = useState(expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : '');
  const [paymentMethod, setPaymentMethod] = useState(expense.paymentMethod || 'OTHER');
  const [description, setDescription] = useState(expense.description || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title,
        amount: Number(amount),
        category,
        expenseDate: new Date(expenseDate).toISOString(),
        paymentMethod,
        description: description || undefined,
      };

      await adminApi.updateExpenseSuperAdmin(expense.id, payload);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification.');
      setSaving(false);
    }
  }

  return (
    <div className="sae-modal-overlay" onClick={onClose}>
      <div className="sae-modal" onClick={e => e.stopPropagation()}>
        <div className="sae-modal-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Modifier la dépense</h2>
          </div>
          <button className="sae-modal-close" onClick={onClose} disabled={saving}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="sae-modal-body">
          {error && (
            <div className="sae-error">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              <span>{error}</span>
            </div>
          )}

          <div className="sae-grid-2">
            <div className="sae-field">
              <label>Motif de la dépense <span>*</span></label>
              <input className="sae-input" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="sae-field">
              <label>Montant <span>*</span></label>
              <input type="number" step="0.01" min="0.01" className="sae-input mono" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
          </div>

          <div className="sae-grid-2" style={{ marginTop: '1rem' }}>
            <div className="sae-field">
              <label>Catégorie <span>*</span></label>
              <select className="sae-filter-select" value={category} onChange={(e) => setCategory(e.target.value)} required style={{ paddingLeft: '1rem' }}>
                {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="sae-field">
              <label>Date de la dépense <span>*</span></label>
              <input type="date" className="sae-input" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
            </div>
          </div>

          <div className="sae-grid-2" style={{ marginTop: '1rem' }}>
            <div className="sae-field">
              <label>Méthode de paiement</label>
              <select className="sae-filter-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ paddingLeft: '1rem' }}>
                {Object.entries(METHOD_MAP).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="sae-field" style={{ marginTop: '1rem' }}>
            <label>Description / Justificatif <span>(Optionnel)</span></label>
            <textarea className="sae-input" style={{ minHeight: '80px', padding: '0.75rem 1rem', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="sae-btn-cancel" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="submit" className="sae-btn-submit" disabled={saving}>
              {saving ? <><div className="spinner" style={{ width: 16, height: 16, margin: 0, borderWidth: 2 }} />Enregistrement...</> : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE PRINCIPALE */
export default function SuperAdminExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [status, setStatus] = useState(''); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  // État de suppression
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ⚡ NOUVEAUX ÉTATS POUR L'EXPORTATION
  const [antennas, setAntennas] = useState<{ id: string, name: string }[]>([]);
  const [exportModalType, setExportModalType] = useState<'PDF' | 'EXCEL' | null>(null);
  const [exportAntenna, setExportAntenna] = useState('');
  const [exportStartMonth, setExportStartMonth] = useState('');
  const [exportEndMonth, setExportEndMonth] = useState('');
  const [pdfData, setPdfData] = useState<Expense[] | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(async (st = status, start = startDate, end = endDate) => {
    setLoading(true);
    try { 
      const res = await adminApi.listSuperAdminExpenses({ page: 1, pageSize: 100, status: st, startDate: start, endDate: end }); 
      setItems(res.items); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  }, [status, startDate, endDate]);

  useEffect(() => { 
    void load();
    const initAntennas = async () => {
      try {
        const res = await api.listAntennas({ pageSize: 100 });
        setAntennas(res.items);
      } catch (e) { console.error(e); }
    };
    void initAntennas();
  }, [load]);

  const handleDeleteRequest = (expense: Expense) => {
    setExpenseToDelete(expense);
  };

  const confirmDelete = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await adminApi.deleteExpenseSuperAdmin(expenseToDelete.id);
      setExpenseToDelete(null);
      setSelectedExpense(null);
      void load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  // ⚡ FONCTION D'EXPORTATION
  const executeExport = async () => {
    try {
      setActionBusy(true);
      const fetchRes = await adminApi.listSuperAdminExpenses({
        page: 1, 
        pageSize: 10000,
        antennaId: exportAntenna || undefined
      });
      
      let exportData = fetchRes.items as Expense[];

      if (exportAntenna) {
        exportData = exportData.filter(e => {
          const exp = e as Expense & { antennaId?: string; antenna?: { id: string; name: string } };
          return exp.antennaId === exportAntenna || exp.antenna?.id === exportAntenna;
        });
      }
      if (exportStartMonth) {
        const start = new Date(`${exportStartMonth}-01T00:00:00Z`);
        exportData = exportData.filter(e => new Date(e.expenseDate) >= start);
      }
      if (exportEndMonth) {
        const end = new Date(`${exportEndMonth}-01T00:00:00Z`);
        end.setMonth(end.getMonth() + 1); 
        exportData = exportData.filter(e => new Date(e.expenseDate) < end);
      }

      if (exportData.length === 0) {
        alert("Aucune dépense ne correspond à ces critères d'exportation.");
        return;
      }

      if (exportModalType === 'EXCEL') {
        let csv = "Categorie;Motif;Antenne;Saisie par;Montant;Date;Methode;Statut\n";
        exportData.forEach(e => {
          const cat = CATEGORY_MAP[e.category] || e.category;
          const motif = e.title || '';
          const ant = e.antenna?.name || '';
          const saisie = e.engagedByUser ? `${e.engagedByUser.firstName} ${e.engagedByUser.lastName}` : '';
          const montant = `${e.amount} ${e.currency || 'EUR'}`;
          const date = formatDate(e.expenseDate);
          const methode = METHOD_MAP[e.paymentMethod || ''] || e.paymentMethod || '';
          const statut = STATUS_MAP[e.status]?.label || e.status;

          csv += `"${cat}";"${motif}";"${ant}";"${saisie}";"${montant}";"${date}";"${methode}";"${statut}"\n`;
        });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Export_Depenses_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        setExportModalType(null);
      } else if (exportModalType === 'PDF') {
        setPdfData(exportData);
        setTimeout(() => {
          window.print();
          setPdfData(null);
          setExportModalType(null);
        }, 300);
      }

    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'exportation des données.");
    } finally {
      setActionBusy(false);
    }
  };

  const totalAmount = items.reduce((acc, curr) => acc + (curr.status === 'VALIDATED' ? Number(curr.amount) : 0), 0);
  const pendingCount = items.filter(i => i.status === 'PENDING_VALIDATION').length;

  return (
    <AppShell title="Contrôle des dépenses">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        
        .sae-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1000px; margin: 0 auto; box-sizing: border-box; }
        
        .sae-header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .sae-header { text-align: left; }
        .sae-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.8rem, 5vw, 2.4rem); font-weight: 700; color: #111827; margin: 0; line-height: 1.1; }
        .sae-title span { color: #DC2626; }
        
        .sae-export-group { display: flex; gap: 0.5rem; }
        .btn-export { height: 38px; padding: 0 1.2rem; border-radius: 12px; border: none; color: white; font-weight: 800; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s; }
        .btn-export:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-pdf { background: linear-gradient(135deg, #991B1B, #DC2626); box-shadow: 0 4px 12px rgba(220,38,38,0.2); }
        .btn-excel { background: linear-gradient(135deg, #059669, #10B981); box-shadow: 0 4px 12px rgba(16,185,129,0.2); }
        
        .sae-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; opacity: 0; transform: translateY(10px); animation: saeFade 0.5s 0.05s cubic-bezier(.22,1,.36,1) forwards; }
        .sae-stat { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 1.25rem 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02); display: flex; flex-direction: column; justify-content: center; }
        .sae-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 2rem; font-weight: 700; line-height: 1; margin-bottom: 0.4rem; color: #0F172A; }
        .sae-stat-lbl { font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }

        .sae-panel { background: white; border-radius: 24px; border: 1px solid rgba(220,38,38,0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.04); overflow: hidden; opacity: 0; transform: translateY(10px); animation: saeFade 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards; }
        .sae-panel-head { padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; background: #FAFBFD; display: flex; align-items: center; gap: 0.75rem; }
        
        .sae-toolbar { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem 1.5rem; border-bottom: 1px solid #F1F5F9; background: white; }
        
        /* ⚡ CORRECTION DU CHAMP DATE POUR MOBILE */
        .sae-dates-row { display: flex; flex-direction: row; flex-wrap: wrap; gap: 0.5rem; width: 100%; }
        .sae-date-wrapper { flex: 1 1 calc(50% - 0.25rem); min-width: 140px; display: flex; align-items: center; gap: 0.4rem; height: 42px; border-radius: 12px; border: 1.5px solid #E2E8F0; padding: 0 0.5rem; background: white; transition: all 0.2s; box-sizing: border-box; }
        .sae-date-wrapper:focus-within { border-color: #DC2626; box-shadow: 0 0 0 4px rgba(220,38,38,0.1); }
        .sae-date-lbl { font-size: 0.65rem; font-weight: 800; color: #475569; text-transform: uppercase; white-space: nowrap; flex-shrink: 0; }
        .sae-date-input { flex: 1; width: 100%; min-width: 90px; border: none; background: transparent; outline: none; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 600; color: #1E293B; padding: 0; }

        .sae-filter-field { display: flex; flex-direction: column; gap: 0.4rem; width: 100%; }
        .sae-filter-lbl { font-size: 0.65rem; font-weight: 800; color: #475569; letter-spacing: 0.05em; text-transform: uppercase; }
        
        .sae-select-wrapper { position: relative; width: 100%; }
        .sae-select-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748B; pointer-events: none; display: flex; }
        
        .sae-filter-select { width: 100%; height: 42px; border-radius: 12px; border: 1.5px solid #E2E8F0; padding: 0 1rem; font-family: 'DM Sans'; font-size: 0.85rem; font-weight: 600; color: #1E293B; outline: none; transition: all 0.2s; box-sizing: border-box; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 1rem center; cursor: pointer; background-color: white; }
        .sae-filter-select.with-icon { padding-left: 2.3rem; }
        .sae-filter-select:focus { border-color: #DC2626; box-shadow: 0 0 0 4px rgba(220,38,38,0.1); }
        
        @media (min-width: 768px) {
          .sae-toolbar { flex-direction: row; align-items: flex-end; }
          .sae-dates-row { flex: 2; width: auto; }
          .sae-filter-field { flex: 1.5; min-width: 140px; }
        }
        
        .sae-table-wrap { display: none; }
        
        .sae-action-btn { width: 34px; height: 34px; border-radius: 8px; border: none; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
        .sae-action-edit { background: #EFF6FF; color: #2563EB; }
        .sae-action-edit:hover { background: #DBEAFE; color: #1D4ED8; }
        .sae-action-del { background: #FEF2F2; color: #DC2626; }
        .sae-action-del:hover { background: #FECACA; color: #B91C1C; }

        .sae-cards-list { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; background: #F8FAFC; }
        .sae-expense-card { background: rgba(250, 204, 21, 0.08); border: 1px solid rgba(250, 204, 21, 0.2); border-radius: 16px; padding: 1rem; transition: all 0.2s; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .sae-expense-card:active { transform: scale(0.98); background: rgba(250, 204, 21, 0.15); border-color: rgba(250, 204, 21, 0.3); }
        .sae-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem; }
        .sae-card-title { font-weight: 800; color: #0F172A; font-size: 0.95rem; line-height: 1.2; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sae-card-amount { font-family: 'DM Mono', monospace; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
        .sae-card-meta { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
        .sae-tag { background: white; color: #475569; padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.65rem; font-weight: 700; border: 1px solid #E2E8F0; }
        .sae-tag-motif { color: #475569; font-size: 0.75rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .sae-card-date { font-size: 0.7rem; color: #94A3B8; font-weight: 700; text-align: right; margin-top: 0.6rem; }

        @media (min-width: 768px) {
          .sae-cards-list { display: none; }
          .sae-table-wrap { display: block; overflow-x: auto; }
          .sae-table { width: 100%; border-collapse: collapse; }
          .sae-table th { padding: 1rem 1.5rem; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #64748B; text-align: left; letter-spacing: 0.05em; border-bottom: 1.5px solid #F1F5F9; }
          .sae-table td { padding: 1rem 1.5rem; font-size: 0.9rem; font-weight: 600; color: #1E293B; border-bottom: 1px solid #F8FAFC; vertical-align: middle; }
          .sae-row { background: rgba(250, 204, 21, 0.05); cursor: pointer; transition: background 0.15s; }
          .sae-row:hover { background: rgba(250, 204, 21, 0.12); }
        }

        .sae-modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; flex-direction: column; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 1rem; animation: saeFade 0.2s ease; }
        .sae-modal-overlay::before, .sae-modal-overlay::after { content: ''; flex: 1 0 auto; }
        .sae-modal { background: white; width: 100%; max-width: 500px; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); margin: 2rem auto; flex-shrink: 0; overflow: hidden; display: flex; flex-direction: column; }
        
        .sae-modal-head { padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; border-bottom: 1px solid #F1F5F9; background: #FAFBFD; }
        .sae-modal-body { padding: 1.5rem; }
        .sae-modal-close { background: white; border: 1px solid #E2E8F0; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748B; flex-shrink: 0; transition: all 0.2s; }
        .sae-modal-close:hover { background: #F8FAFC; color: #0F172A; }
        
        .sae-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 480px) { .sae-grid-2 { grid-template-columns: 1fr; } }
        
        .sae-info-box { background: white; border: 1.5px solid #F1F5F9; border-radius: 16px; padding: 1rem; display: flex; flex-direction: column; gap: 0.3rem; box-shadow: 0 2px 4px rgba(0,0,0,0.01); }
        .sae-info-lbl { font-size: 0.65rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; }
        .sae-info-val { font-size: 0.95rem; font-weight: 700; color: #1E293B; }
        
        .sae-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .sae-field label { font-size: 0.75rem; font-weight: 700; color: #1E293B; }
        .sae-field label span { color: #DC2626; margin-left: 0.2rem; }
        .sae-input { width: 100%; min-height: 44px; border-radius: 10px; border: 1.5px solid #E2E8F0; background: white; padding: 0 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 600; color: #0F172A; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .sae-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }

        .sae-btn-submit { flex: 1; background: #2563EB; color: white; border: none; padding: 0.9rem; border-radius: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(37,99,235,0.2); }
        .sae-btn-submit:hover:not(:disabled) { background: #1D4ED8; }
        .sae-btn-validate { flex: 1; background: #059669; color: white; border: none; padding: 1rem; border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(5,150,105,0.2); }
        .sae-btn-reject { flex: 1; background: #FEF2F2; color: #DC2626; border: 1.5px solid #FECACA; padding: 1rem; border-radius: 16px; font-weight: 800; cursor: pointer; }
        .sae-btn-cancel { background: white; color: #475569; border: 1.5px solid #E2E8F0; padding: 0.8rem 1.2rem; border-radius: 12px; font-weight: 700; cursor: pointer; }
        
        .mono { font-family: 'DM Mono', monospace; }
        .spinner { width: 32px; height: 32px; border: 3.5px solid rgba(220,38,38,0.1); border-top-color: #DC2626; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 4rem auto; }
        
        @media (max-width: 768px) {
            .sae-stats { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-bottom: 1rem; }
            .sae-stat { padding: 0.5rem; flex-direction: column; justify-content: center; align-items: center; border-top: none; border-left: 0; border-bottom: 3px solid; text-align: center; border-radius: 12px; }
            .sae-stat-val { font-size: 1.1rem !important; margin-bottom: 0.2rem; }
            .sae-stat-lbl { font-size: 0.55rem !important; }
        }

        /* ⚡ CSS D'EXPORTATION ET IMPRESSION */
        .export-flex-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .export-flex-item { flex: 1 1 calc(50% - 0.5rem); min-width: 140px; }
        .export-flex-item.full { flex: 1 1 100%; }

        @media print {
          body * { visibility: hidden; }
          .printable-export-area, .printable-export-area * { visibility: visible; }
          .printable-export-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
          .sae-wrap, .sae-modal-overlay { display: none !important; }
        }
        .printable-export-area { display: none; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes saeFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ⚡ LA ZONE IMPRIMABLE CACHÉE POUR LE PDF */}
      {pdfData && (
        <div className="printable-export-area">
          <h2 style={{ textAlign: 'center', marginBottom: '20px', fontFamily: "'Cormorant Garamond', serif" }}>Rapport des Dépenses</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "'DM Sans', sans-serif" }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Catégorie / Motif</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Antenne</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Saisie par</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Montant</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Date</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Méthode</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {pdfData.map(e => (
                <tr key={e.id}>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>
                    <div style={{ fontWeight: 'bold' }}>{CATEGORY_MAP[e.category] || e.category}</div>
                    <div style={{ color: '#64748b' }}>{e.title}</div>
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{e.antenna?.name || '—'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{e.engagedByUser ? `${e.engagedByUser.firstName} ${e.engagedByUser.lastName}` : '—'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontFamily: "'DM Mono', monospace", fontWeight: 'bold' }}>{formatCurrency(e.amount, e.currency || 'EUR')}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{formatDate(e.expenseDate)}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{METHOD_MAP[e.paymentMethod || ''] || e.paymentMethod || '—'}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{STATUS_MAP[e.status]?.label || e.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sae-wrap">
        <div className="sae-header-row">
          <header className="sae-header" style={{ marginBottom: 0 }}>
            <h1 className="sae-title">Contrôle des <span>Dépenses</span></h1>
          </header>
          
          <div className="sae-export-group">
            <button className="btn-export btn-pdf" onClick={() => setExportModalType('PDF')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm9-9h-6v2h4v10H5V9h4V7H3v14h18V7z"/></svg>
              PDF
            </button>
            <button className="btn-export btn-excel" onClick={() => setExportModalType('EXCEL')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              EXCEL
            </button>
          </div>
        </div>

        <div className="sae-stats">
          <div className="sae-stat" style={{ borderBottomColor: '#2563EB' }}>
            <div className="sae-stat-val" style={{ color: '#1E3A8A' }}>{items.length}</div>
            <div className="sae-stat-lbl">Enregistrées</div>
          </div>
          <div className="sae-stat" style={{ borderBottomColor: '#059669' }}>
            <div className="sae-stat-val" style={{ color: '#047857' }}>{formatCurrency(totalAmount, items[0]?.currency || 'EUR')}</div>
            <div className="sae-stat-lbl">Total Validé</div>
          </div>
          <div className="sae-stat" style={{ borderBottomColor: '#D97706' }}>
            <div className="sae-stat-val" style={{ color: '#B45309' }}>{pendingCount}</div>
            <div className="sae-stat-lbl">En attente</div>
          </div>
        </div>

        <div className="sae-panel">
          <div className="sae-panel-head">
            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E293B' }}>Validation globale</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Toutes les antennes</div>
            </div>
          </div>

          <div className="sae-toolbar">
            <div className="sae-filter-field" style={{ flex: 1.5 }}>
              <label className="sae-filter-lbl">Statut</label>
              <div className="sae-select-wrapper">
                <div className="sae-select-icon">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                </div>
                <select className="sae-filter-select with-icon" value={status} onChange={e => { const v = e.target.value; setStatus(v); void load(v, startDate, endDate); }}>
                  <option value="">Toutes les dépenses</option>
                  <option value="PENDING_VALIDATION">⏳ En attente</option>
                  <option value="VALIDATED">✅ Validées</option>
                  <option value="REJECTED">❌ Rejetées</option>
                </select>
              </div>
            </div>

            <div className="sae-dates-row">
              <div className="sae-date-wrapper">
                <label className="sae-date-lbl">Du</label>
                <input type="date" className="sae-date-input" value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); void load(status, v, endDate); }} />
              </div>
              <div className="sae-date-wrapper">
                <label className="sae-date-lbl">Au</label>
                <input type="date" className="sae-date-input" value={endDate} onChange={e => { const v = e.target.value; setEndDate(v); void load(status, startDate, v); }} />
              </div>
            </div>

            {(startDate || endDate || status) && (
              <div className="sae-filter-field" style={{ flex: '0 0 auto', justifyContent: 'flex-end', width: 'auto' }}>
                <button className="sae-btn-cancel" style={{ height: 42, width: '100%', background: '#F8FAFC' }} onClick={() => { setStatus(''); setStartDate(''); setEndDate(''); void load('', '', ''); }}>
                  Réinitialiser
                </button>
              </div>
            )}
          </div>
          {loading ? (
            <div className="spinner" />
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 1.5rem', color: '#94A3B8' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🍃</div>
              <div style={{ fontWeight: 700, color: '#475569' }}>Aucune dépense trouvée</div>
              <div style={{ fontSize: '0.85rem' }}>Aucun résultat pour cette période.</div>
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
                        <div className="sae-card-title" title={CATEGORY_MAP[e.category] || e.category}>
                          {CATEGORY_MAP[e.category] || e.category}
                        </div>
                        <div className="sae-card-amount" style={{ color: s.color }}>{formatCurrency(e.amount, e.currency)}</div>
                      </div>
                      <div className="sae-card-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: s.color, background: 'white', padding: '0.15rem 0.5rem', borderRadius: '6px', border: `1px solid ${s.border}` }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }} />
                          {s.label}
                        </span>
                        <span className="sae-tag">{e.antenna?.name || 'Assoc.'}</span>
                        <span className="sae-tag-motif" title={e.title}>{e.title}</span>
                      </div>
                      <div className="sae-card-date">
                        {formatDate(e.expenseDate)}
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
                      <th>Catégorie & Motif</th>
                      <th>Antenne</th>
                      <th>Date</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(e => {
                      const s = STATUS_MAP[e.status] || STATUS_MAP.PENDING_VALIDATION;
                      return (
                        <tr key={e.id} className="sae-row" onClick={() => setSelectedExpense(e)}>
                          <td>
                            <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }} title={CATEGORY_MAP[e.category] || e.category}>
                              {CATEGORY_MAP[e.category] || e.category}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4, display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }} title={e.title}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                              {s.label} • {e.title}
                            </div>
                          </td>
                          <td>
                            <span style={{ background: 'white', border: '1px solid #E2E8F0', padding: '0.35rem 0.75rem', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>{e.antenna?.name || '—'}</span>
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

      {/* ⚡ MODALE D'EXPORTATION */}
      {exportModalType && (
        <div className="sae-modal-overlay" onClick={() => !actionBusy && setExportModalType(null)}>
          <div className="sae-modal" onClick={e => e.stopPropagation()} style={{ padding: '2rem', maxWidth: '500px', margin: 'auto' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.8rem', fontWeight: 700, color: '#111827', margin: '0 0 1.5rem 0' }}>
              Exporter en <span style={{ color: exportModalType === 'EXCEL' ? '#10B981' : '#DC2626' }}>{exportModalType === 'EXCEL' ? 'Excel' : 'PDF'}</span>
            </h2>
            
            <div className="export-flex-row">
              <div className="export-flex-item full">
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Filtrer par Antenne</label>
                <select className="sae-filter-select" value={exportAntenna} onChange={e => setExportAntenna(e.target.value)} style={{ width: '100%', height: '42px', background: '#F8FAFC' }}>
                  <option value="">Toutes les antennes (Global)</option>
                  {antennas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="export-flex-item">
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Période (Début)</label>
                <input type="month" className="sae-input" value={exportStartMonth} onChange={e => setExportStartMonth(e.target.value)} style={{ width: '100%', height: '42px', background: '#F8FAFC' }} />
              </div>
              <div className="export-flex-item">
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Période (Fin)</label>
                <input type="month" className="sae-input" value={exportEndMonth} onChange={e => setExportEndMonth(e.target.value)} style={{ width: '100%', height: '42px', background: '#F8FAFC' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="sae-btn-cancel" style={{ flex: 1 }} onClick={() => setExportModalType(null)} disabled={actionBusy}>Annuler</button>
              <button 
                className="sae-btn-submit" 
                style={{ flex: 1.5, background: exportModalType === 'EXCEL' ? '#10B981' : '#DC2626', boxShadow: 'none' }} 
                onClick={() => void executeExport()} 
                disabled={actionBusy}
              >
                {actionBusy ? 'Génération...' : 'Télécharger'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedExpense && (
        <SuperAdminExpenseModal 
          expense={selectedExpense} 
          onClose={() => setSelectedExpense(null)} 
          onSuccess={() => { setSelectedExpense(null); void load(); }} 
          onEdit={() => { setSelectedExpense(null); setExpenseToEdit(selectedExpense); }}
          onDelete={() => handleDeleteRequest(selectedExpense)}
        />
      )}

      {expenseToEdit && (
        <EditExpenseModal
          expense={expenseToEdit}
          onClose={() => setExpenseToEdit(null)}
          onSuccess={() => { setExpenseToEdit(null); void load(); }}
        />
      )}

      {/* 🔥 MODALE DE CONFIRMATION DE SUPPRESSION */}
      {expenseToDelete && (
        <div className="sae-modal-overlay" onClick={() => !isDeleting && setExpenseToDelete(null)} style={{ zIndex: 10000 }}>
          <div className="sae-modal" style={{ maxWidth: 400, margin: 'auto', textAlign: 'center', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 60, height: 60, background: '#FEF2F2', color: '#DC2626', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem', marginTop: 0 }}>Supprimer la dépense ?</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Êtes-vous sûr de vouloir supprimer définitivement la dépense <strong>&quot;{expenseToDelete.title}&quot;</strong> ? Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="sae-btn-cancel" onClick={() => setExpenseToDelete(null)} disabled={isDeleting} style={{ flex: 1 }}>Annuler</button>
              <button className="sae-btn-reject" onClick={() => void confirmDelete()} disabled={isDeleting} style={{ flex: 1, border: 'none', background: '#DC2626', color: 'white' }}>
                {isDeleting ? 'Suppression...' : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}