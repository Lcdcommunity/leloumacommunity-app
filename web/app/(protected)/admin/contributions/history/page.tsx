// web/app/(protected)/admin/contributions/history/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import type { Contribution, ContributionStatus } from '../../../../../types/contribution';
import { formatDate } from '../../../../../lib/format';

/* ══════════════════════════════════════════════════════ TYPES & EXTRACTEURS */

type ModalMode = 'view' | 'edit' | 'delete';

interface ModalState { 
  mode: ModalMode | null; 
  contribution: Contribution | null; 
}

const getMember = (c: Contribution) => 
  c.member || (c as unknown as Record<string, Contribution['member']>).user || null;

const getMethod = (c: Contribution) => 
  c.paymentMethod || (c as unknown as Record<string, string>).method || 'OTHER';

const getDate = (c: Contribution) => 
  c.contributionDate || (c as unknown as Record<string, string>).depositedAt || c.createdAt || new Date().toISOString();

const getNote = (c: Contribution) => 
  c.memberComment || (c as unknown as Record<string, string>).note || '';

const PURPOSE_MAP: Record<string, string> = {
  REGULAR_QUOTA: 'Cotisation régulière',
  LATE_QUOTA: 'Cotisation en retard',
  MEMBERSHIP_CARD: 'Carte de membre',
  DONATION: 'Don / Soutien',
};

const METHOD_MAP: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'M-Money',
  CARD: 'Carte Bancaire',
  OTHER: 'Autre',
};

function StatusBadge({ status }: { status: ContributionStatus | string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED: { label: 'Validée',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    REJECTED:  { label: 'Rejetée', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    CANCELLED: { label: 'Annulée', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    SUBMITTED: { label: 'Soumise', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    DRAFT:     { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  const s = map[status] || { label: String(status), color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', fontSize:'0.65rem', fontWeight:800, color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:99, padding:'0.25rem 0.6rem', textTransform:'uppercase', letterSpacing:'0.03em' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color }} />{s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ MODAL COMPONENT */
function ContributionDetailModal({ 
  state, onClose, onConfirm, busy 
}: { 
  state: ModalState; 
  onClose: () => void; 
  onConfirm: (mode: ModalMode, val: string) => void; 
  busy: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [prevState, setPrevState] = useState<ModalState>({ mode: null, contribution: null });

  if (state.mode !== prevState.mode || state.contribution?.id !== prevState.contribution?.id) {
    setPrevState(state);
    setInputValue(state.mode === 'edit' ? String(state.contribution?.amount ?? '') : '');
  }

  const { mode, contribution: c } = state;

  if (!mode || !c) return null;

  const isView = mode === 'view';
  const member = getMember(c);
  const method = getMethod(c);
  const note = getNote(c);

  return (
    <div className="ach-modal-overlay" onClick={onClose}>
      <div className="ach-modal" onClick={e => e.stopPropagation()}>
        <div className="ach-modal-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center', width: '100%' }}>
            <StatusBadge status={c.status} />
            <h2 className="ach-modal-title" style={{ marginTop: '0.4rem', textAlign: 'center' }}>
              Détails de la transaction
            </h2>
          </div>
          <button className="ach-modal-close" onClick={onClose} aria-label="Fermer" style={{ position: 'absolute', right: '1.25rem', top: '1.25rem' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="ach-modal-body">
          <div className="ach-detail-section">
            <h3 className="ach-section-title">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Informations du Membre
            </h3>

            <div className="ach-grid-2">
              <div className="ach-info-box">
                <label>Prénom</label>
                <span>{member?.firstName || '—'}</span>
              </div>
              <div className="ach-info-box">
                <label>Nom</label>
                <span className="ach-text-primary">{member?.lastName || '—'}</span>
              </div>
            </div>

            <div className="ach-grid-2">
              <div className="ach-info-box" style={{ overflow: 'hidden' }}>
                <label>Email</label>
                <span title={member?.email || ''} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  {member?.email || '—'}
                </span>
              </div>
              <div className="ach-info-box">
                <label>Téléphone</label>
                <span className="ach-text-mono">{member?.phone || '—'}</span>
              </div>
            </div>
          </div>

          <div className="ach-detail-section">
            <h3 className="ach-section-title">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Détails du versement
            </h3>

            <div className="ach-grid-2">
              <div className="ach-info-box ach-box-highlight">
                <label>Montant</label>
                <span className="ach-amt-big">{Number(c.amount).toLocaleString('fr-FR')} {c.currency || 'EUR'}</span>
              </div>
              <div className="ach-info-box">
                <label>Méthode de paiement</label>
                <span>{METHOD_MAP[method] || method}</span>
              </div>
            </div>

            <div className="ach-grid-2">
              <div className="ach-info-box">
                <label>Motif / Type</label>
                <span>{PURPOSE_MAP[c.purpose] || c.purpose}</span>
              </div>
              <div className="ach-info-box">
                <label>Date de dépôt</label>
                <span>{formatDate(getDate(c))}</span>
              </div>
            </div>

            <div className="ach-info-box full" style={{ marginTop: '0.75rem', gridColumn: '1 / -1' }}>
              <label>Référence Interne</label>
              <span className="ach-text-mono" style={{ fontSize: '0.75rem', color: '#64748B' }}>{c.id}</span>
            </div>

            {note && (
              <div className="ach-info-box" style={{ marginTop: '0.75rem' }}>
                <label>Note du membre</label>
                <p className="ach-note-text">{note}</p>
              </div>
            )}

            {(c.adminComment || c.rejectionReason) && (
              <div className="ach-info-box" style={{ marginTop: '0.75rem', borderColor: c.status === 'REJECTED' ? '#FECACA' : '#A7F3D0', background: c.status === 'REJECTED' ? '#FEF2F2' : '#ECFDF5' }}>
                <label style={{ color: c.status === 'REJECTED' ? '#DC2626' : '#059669' }}>Note Administrative</label>
                <p className="ach-note-text" style={{ color: c.status === 'REJECTED' ? '#B91C1C' : '#065F46' }}>
                  {c.adminComment || c.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {!isView && (
            <div className="ach-action-form">
              <label className="ach-form-lbl">
                {mode === 'delete' ? 'Confirmation de sécurité (Obligatoire)' : 'Nouveau montant'}
              </label>
              {mode === 'edit' ? (
                <input 
                  type="number" 
                  className="ach-input" 
                  value={inputValue} 
                  onChange={e => setInputValue(e.target.value)} 
                  placeholder="Ex: 150" 
                />
              ) : (
                <>
                  <input 
                    type="text" 
                    className="ach-input" 
                    value={inputValue} 
                    onChange={e => setInputValue(e.target.value)} 
                    placeholder="Tapez SUPPRIMER pour confirmer" 
                  />
                  {/* 🔥 FIX: Remplacement de "SUPPRIMER" par &quot;SUPPRIMER&quot; pour ESLint */}
                  {inputValue !== 'SUPPRIMER' && inputValue.length > 0 && (
                    <p style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '0.4rem', fontWeight: 600 }}>
                      Veuillez taper exactement &quot;SUPPRIMER&quot;.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="ach-modal-footer">
          {!isView && <button className="ach-btn-sec" onClick={() => onConfirm('view', '')}>Annuler</button>}

          <div className="ach-footer-actions">
            {isView ? (
              <>
                <button className="ach-btn ach-btn-red" onClick={() => onConfirm('delete', '')}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Supprimer
                </button>
                <button className="ach-btn ach-btn-blue" onClick={() => onConfirm('edit', '')}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Modifier
                </button>
              </>
            ) : (
              <button 
                className={`ach-btn ${mode === 'delete' ? 'ach-btn-red' : 'ach-btn-blue'}`}
                style={{ flex: 1 }}
                disabled={busy || (mode === 'delete' && inputValue !== 'SUPPRIMER') || (mode === 'edit' && !inputValue)}
                onClick={() => onConfirm(mode, inputValue)}
              >
                {busy ? <div className="ach-spinner" /> : mode === 'delete' ? 'Supprimer définitivement' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ MAIN PAGE */
export default function AdminContributionsHistoryPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ mode: null, contribution: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listAntennaContributions({ 
        page: 1, pageSize: 100, status: status || undefined, q: q || undefined 
      });
      const data = Array.isArray(res) ? res : (res as unknown as { items?: Contribution[] })?.items ?? [];
      setItems(data as Contribution[]);
    } finally { setLoading(false); }
  }, [status, q]);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(mode: ModalMode, value: string) {
    if (mode !== 'view' && modal.mode === 'view') {
      setModal(prev => ({ ...prev, mode }));
      return;
    }

    const c = modal.contribution;
    if (!c || mode === 'view') return;

    setBusyId(c.id);
    try {
      if (mode === 'edit') {
        await api.updateContributionAntenna(c.id, { amount: parseFloat(value.replace(',', '.')) });
      }
      if (mode === 'delete') {
        const apiClient = api as unknown as { deleteContributionAntenna?: (id: string) => Promise<void> };
        if (apiClient.deleteContributionAntenna) {
          await apiClient.deleteContributionAntenna(c.id);
        }
      }
      setModal({ mode: null, contribution: null });
      await load();
    } finally { setBusyId(null); }
  }

  const isPendingStatus = (s: string) => s === 'PENDING' || s === 'SUBMITTED' || s === 'PENDING_VALIDATION';
  const validated = items.filter((i) => i.status === 'VALIDATED').length;
  const pending   = items.filter((i) => isPendingStatus(i.status)).length;
  const rejected  = items.filter((i) => i.status === 'REJECTED').length;
  const total     = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const mainCurrency = items[0]?.currency || 'EUR';

  return (
    <AppShell title="Historique cotisations">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        
        .ach-wrap { font-family: 'DM Sans', 'Inter', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 900px; margin: 0 auto; }
        
        /* Header & Stats */
        .ach-header { margin-bottom: 1.5rem; }
        .ach-eyebrow { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .ach-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; }
        .ach-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.6rem, 6vw, 2.2rem); font-weight: 700; color: #0F172A; line-height: 1.2; letter-spacing: -0.02em; margin: 0; }
        .ach-title span { color: #2563EB; }        
        .ach-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem; }
        @media(max-width: 640px) { .ach-stats { grid-template-columns: repeat(2, 1fr); } }
        .ach-stat { background: white; border-radius: 14px; border: 1px solid #E2E8F0; padding: 0.9rem 1rem; border-top: 3px solid; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .ach-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; font-weight: 700; line-height: 1; margin-bottom: 0.3rem; }
        .ach-stat-lbl { font-size: 0.65rem; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }

        /* Toolbar - AJUSTÉ SUR UNE SEULE LIGNE */
        .ach-toolbar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: nowrap; width: 100%; box-sizing: border-box; align-items: center; }
        .ach-select, .ach-search { height: 40px; border-radius: 10px; border: 1px solid #CBD5E1; padding: 0 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500; color: #1E293B; outline: none; background: white; transition: border-color 0.2s, box-shadow 0.2s; }
        .ach-select:focus, .ach-search:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        
        .ach-select { flex: 0 1 auto; min-width: 0; padding-right: 1.8rem; appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.6rem center; }
        .ach-search { flex: 1 1 auto; min-width: 0; }
        
        @media(max-width: 480px) {
          .ach-toolbar { gap: 0.3rem; }
          .ach-select, .ach-search { height: 36px; font-size: 0.75rem; padding: 0 0.5rem; }
          .ach-select { padding-right: 1.4rem; background-position: right 0.4rem center; }
        }
        
        /* Cartes (Liste principale) */
        .ach-card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 1.25rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); position: relative; }
        .ach-card:hover { border-color: #93C5FD; transform: translateY(-2px); box-shadow: 0 12px 24px -10px rgba(37,99,235,0.15); }
        
        .ach-card-inner { display: flex; gap: 1rem; align-items: center; }
        .ach-avatar { width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #DBEAFE, #EFF6FF); color: #1D4ED8; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; border: 1px solid #BFDBFE; }
        
        .ach-card-content { flex: 1; min-width: 0; }
        .ach-card-name { font-weight: 700; font-size: 1.05rem; color: #0F172A; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
        .ach-card-ref { font-family: 'DM Mono', monospace; font-size: 0.65rem; color: #94A3B8; font-weight: 600; margin-bottom: 4px; }
        .ach-card-purpose { color: #64748B; font-size: 0.8rem; font-weight: 500; }
        
        .ach-card-right { text-align: right; flex-shrink: 0; }
        .ach-card-amount { font-family: 'DM Mono', monospace; font-weight: 700; color: #0F172A; font-size: 1.15rem; margin-bottom: 6px; }
        
        .ach-card-footer { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed #E2E8F0; display: flex; justify-content: space-between; align-items: center; }
        .ach-card-method { font-size: 0.7rem; font-weight: 700; color: #64748B; text-transform: uppercase; display: flex; align-items: center; gap: 5px; letter-spacing: 0.03em; }

        /* Modale (Refonte Mobile-First avec wrapper flex pour corriger le z-index) */
        .ach-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); z-index: 1000; animation: fadeIn 0.2s ease-out; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .ach-modal { width: 100%; max-width: 480px; background: #FFFFFF; border-radius: 20px; display: flex; flex-direction: column; max-height: calc(100vh - 2rem); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1); position: relative; }
        
        .ach-modal-head { padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: flex-start; background: #FAFAFA; border-radius: 20px 20px 0 0; }
        .ach-modal-title { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; font-weight: 700; color: #0F172A; line-height: 1.2; letter-spacing: -0.02em; }
        .ach-modal-close { background: white; border: 1px solid #E2E8F0; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; color: #64748B; display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .ach-modal-close:hover { background: #F1F5F9; color: #0F172A; transform: scale(1.05); }
        
        .ach-modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; }
        
        .ach-section-title { font-size: 0.65rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 0.85rem; letter-spacing: 0.06em; display: flex; align-items: center; gap: 0.4rem; }
        .ach-detail-section { margin-bottom: 1.5rem; }
        
        .ach-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
        
        .ach-info-box { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 10px; padding: 0.65rem 0.85rem; display: flex; flex-direction: column; justify-content: center; }
        .ach-box-highlight { background: #EFF6FF; border-color: #DBEAFE; }
        
        .ach-info-box label { font-size: 0.6rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.25rem; }
        .ach-info-box span { font-size: 0.85rem; font-weight: 600; color: #1E293B; line-height: 1.3; }
        
        .ach-text-primary { color: #2563EB !important; }
        .ach-text-mono { font-family: 'DM Mono', monospace; font-size: 0.85rem !important; font-weight: 600 !important; }
        
        .ach-amt-big { font-family: 'DM Mono', monospace; color: #1D4ED8 !important; font-size: 1.15rem !important; font-weight: 700 !important; }
        
        .ach-note-text { margin: 0; font-size: 0.85rem; font-weight: 500; color: #475569; line-height: 1.4; font-style: italic; }
        
        .ach-modal-footer { padding: 1.25rem 1.5rem; background: white; border-top: 1px solid #F1F5F9; border-radius: 0 0 20px 20px; display: flex; gap: 0.75rem; align-items: center; justify-content: space-between; }
        
        .ach-footer-actions { display: flex; gap: 0.5rem; flex: 1; justify-content: flex-end; }
        
        .ach-btn { padding: 0.75rem 0.5rem; border-radius: 10px; font-family: 'Inter', sans-serif; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; transition: all 0.2s; flex: 1; display: flex; align-items: center; justify-content: center; letter-spacing: -0.01em; gap: 0.4rem; }
        
        .ach-btn-red { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        .ach-btn-red:hover { background: #FEE2E2; }
        
        .ach-btn-blue { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
        .ach-btn-blue:hover { background: #DBEAFE; }
        
        .ach-btn-sec { background: transparent; color: #64748B; font-weight: 600; border: none; font-size: 0.85rem; cursor: pointer; padding: 0.5rem; }
        .ach-btn-sec:hover { color: #0F172A; }
        
        .ach-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
        
        .ach-action-form { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 1rem; margin-top: 1.5rem; }
        .ach-form-lbl { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #0F172A; margin-bottom: 0.5rem; display: block; letter-spacing: 0.02em; }
        .ach-input { width: 100%; border-radius: 8px; border: 1px solid #CBD5E1; padding: 0.75rem; font-family: 'Inter', sans-serif; font-size: 0.85rem; outline: none; transition: border-color 0.2s; }
        .ach-input:focus { border-color: #3B82F6; }
        
        .ach-spinner { width: 18px; height: 18px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ach-wrap">
        <div className="ach-header">
          <div className="ach-eyebrow"><div className="ach-dot" />Archives antenne</div>
          <h1 className="ach-title">Historique des <span>cotisations</span></h1>
        </div>

        <div className="ach-stats">
          {([
            { label: 'Total reçu', value: `${total.toLocaleString('fr-FR')} ${mainCurrency}`, color: '#2563EB' },
            { label: 'Validées',   value: validated, color: '#059669' },
            { label: 'En attente', value: pending,   color: '#D97706' },
            { label: 'Rejetées',   value: rejected,  color: '#DC2626' },
          ] as const).map((s) => (
            <div key={s.label} className="ach-stat" style={{ borderTopColor: s.color }}>
              <div className="ach-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="ach-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        {/* TOOLBAR MODIFIÉE ICI */}
        <div className="ach-toolbar">
          <select className="ach-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SUBMITTED">Soumise</option>
            <option value="PENDING_VALIDATION">En attente</option>
            <option value="VALIDATED">Validée</option>
            <option value="REJECTED">Rejetée</option>
            <option value="CANCELLED">Annulée</option>
          </select>
          <input 
            type="text" 
            className="ach-search" 
            placeholder="Rechercher membre / référence..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'4rem', color:'#64748B', fontWeight: 600}}>
            <div className="ach-spinner" style={{borderColor: 'rgba(37,99,235,0.2)', borderTopColor: '#2563EB', margin: '0 auto 1rem', width: '24px', height: '24px'}} />
            Chargement des données...
          </div>
        ) : items.length === 0 ? (
          <div style={{textAlign:'center', padding:'5rem 2rem', color:'#94A3B8', fontWeight: 600}}>
            Aucune cotisation trouvée pour ces critères.
          </div>
        ) : items.map((c) => {
          const member = getMember(c);
          const method = getMethod(c);
          const name = member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : 'Membre inconnu';
          const initials = name !== 'Membre inconnu' ? `${name.charAt(0)}${name.split(' ')[1]?.charAt(0) || ''}`.toUpperCase() : '?';

          return (
            <div key={c.id} className="ach-card" onClick={() => setModal({ mode: 'view', contribution: c })}>
              <div className="ach-card-inner">
                <div className="ach-avatar">{initials}</div>
                <div className="ach-card-content">
                  <div className="ach-card-name">{name}</div>
                  <div className="ach-card-ref">{c.id.slice(0, 8)}</div>
                  <div className="ach-card-purpose">{PURPOSE_MAP[c.purpose] || c.purpose}</div>
                </div>
                <div className="ach-card-right">
                  <div className="ach-card-amount">{Number(c.amount).toLocaleString('fr-FR')} {c.currency || 'EUR'}</div>
                  <StatusBadge status={c.status} />
                </div>
              </div>

              <div className="ach-card-footer">
                <div className="ach-card-method">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                  {METHOD_MAP[method] || method}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                  Déposé le {formatDate(getDate(c))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ContributionDetailModal 
        state={modal} 
        onClose={() => setModal({ mode:null, contribution:null })}
        busy={busyId !== null}
        onConfirm={(mode, val) => {
          if (mode === 'view') setModal({ mode:null, contribution:null });
          else handleAction(mode, val);
        }}
      />
    </AppShell>
  );
}