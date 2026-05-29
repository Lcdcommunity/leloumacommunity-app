// web/app/(protected)/admin/contributions/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Contribution, ContributionStatus } from '../../../../types/contribution';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ TYPES */

type ModalMode = 'view' | 'validate' | 'reject' | 'edit' | 'delete';

interface ModalState {
  mode: ModalMode | null;
  contribution: Contribution & {
    submitter?: { firstName: string; lastName: string } | null;
  } | null;
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
  REGULAR_QUOTA:   'Cotisation régulière',
  LATE_QUOTA:      'Cotisation en retard',
  MEMBERSHIP_CARD: 'Carte de membre',
  DONATION:        'Don / Soutien',
};

const METHOD_MAP: Record<string, string> = {
  CASH:          'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY:  'M-Money',
  CARD:          'Carte Bancaire',
  OTHER:         'Autre',
};

function StatusBadge({ status }: { status: ContributionStatus | string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED:          { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    REJECTED:           { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING:            { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    CANCELLED:          { label: 'Annulée',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  const s = map[status] || map['PENDING_VALIDATION'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'.3rem', fontSize:'.6rem', fontWeight:900, color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:99, padding:'.15rem .5rem', textTransform:'uppercase', letterSpacing:'.02em' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color }} />
      {s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ MODAL */
function ContributionDetailModal({
  state, onClose, onConfirm, busy,
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

  const isView    = mode === 'view';
  const isPending = c.status === 'PENDING_VALIDATION' || c.status === 'PENDING';
  const member    = getMember(c);
  const method    = getMethod(c);
  const note      = getNote(c);

  return (
    <>
      <div className="acv-modal-overlay" onClick={onClose} />
      <div className="acv-modal">
        <div className="acv-modal-head">
          <div>
            <StatusBadge status={c.status} />
            <h2 className="acv-modal-title">Détails de la cotisation</h2>
          </div>
          <button className="acv-modal-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="acv-modal-body">
          {/* Membre */}
          <div className="acv-detail-section">
            <h3 className="acv-section-title"><span style={{ marginRight:6 }}>👤</span>Informations du Membre</h3>
            <div className="acv-detail-grid">
              <div className="acv-info-box">
                <label>Bénéficiaire</label>
                <span style={{ color:'#2563EB', fontWeight:800 }}>
                  {member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Nom manquant' : 'Information introuvable'}
                </span>
              </div>
              <div className="acv-info-box">
                <label>Email</label>
                <span>{member?.email || '—'}</span>
              </div>
              <div className="acv-info-box" style={{ gridColumn:'1 / -1' }}>
                <label>Téléphone</label>
                <span>{member?.phone || '—'}</span>
              </div>
            </div>
            {c.submitter && (
              <div className="acv-info-box" style={{ marginTop:'.75rem', background:'#ECFDF5', borderColor:'#A7F3D0' }}>
                <label style={{ color:'#047857' }}>Déclaré / Payé par</label>
                <span style={{ color:'#065F46', display:'flex', alignItems:'center', gap:'.4rem' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {c.submitter.firstName} {c.submitter.lastName}
                </span>
              </div>
            )}
          </div>

          {/* Versement */}
          <div className="acv-detail-section">
            <h3 className="acv-section-title"><span style={{ marginRight:6 }}>💰</span>Détails du versement</h3>
            <div className="acv-detail-grid">
              <div className="acv-info-box">
                <label>Montant</label>
                <span className="acv-amt-big">{Number(c.amount).toLocaleString('fr-FR')} {c.currency || 'EUR'}</span>
              </div>
              <div className="acv-info-box">
                <label>Méthode de paiement</label>
                <span>{METHOD_MAP[method] || method}</span>
              </div>
              <div className="acv-info-box">
                <label>Motif / Type</label>
                <span>{PURPOSE_MAP[c.purpose] || c.purpose}</span>
              </div>
              <div className="acv-info-box">
                <label>Date de dépôt</label>
                <span>{formatDate(getDate(c))}</span>
              </div>
            </div>
            {note && (
              <div className="acv-info-box" style={{ marginTop:'.75rem', gridColumn:'1 / -1' }}>
                <label>Note du membre</label>
                <p style={{ margin:0, fontSize:'.85rem', fontWeight:500, color:'#475569' }}>{note}</p>
              </div>
            )}
          </div>

          {/* Formulaire action */}
          {!isView && (
            <div className="acv-action-form">
              <label className="acv-form-lbl">
                {mode === 'delete'
                  ? 'Confirmation de sécurité (tapez SUPPRIMER)'
                  : mode === 'reject'
                  ? 'Motif du rejet (obligatoire)'
                  : mode === 'edit'
                  ? 'Nouveau montant'
                  : 'Note interne (optionnel)'}
              </label>
              {mode === 'delete' ? (
                <>
                  <input
                    type="text"
                    className="acv-input"
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder='Tapez "SUPPRIMER" pour confirmer'
                  />
                  {inputValue.length > 0 && inputValue !== 'SUPPRIMER' && (
                    <p style={{ fontSize:'.7rem', color:'#DC2626', marginTop:'.4rem', fontWeight:600 }}>
                      Veuillez taper exactement &quot;SUPPRIMER&quot;.
                    </p>
                  )}
                </>
              ) : mode === 'edit' ? (
                <input
                  type="number"
                  className="acv-input"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Ex: 150"
                />
              ) : (
                <textarea className="acv-input" value={inputValue} onChange={e => setInputValue(e.target.value)} rows={2} />
              )}
            </div>
          )}
        </div>

        <div className="acv-modal-footer">
          <div className="acv-footer-btns">
            {!isView && (
              <button className="acv-btn-sec" onClick={() => onConfirm('view', '')}>← Retour</button>
            )}
            <div style={{ marginLeft:'auto', display:'flex', gap:'.6rem', flex:1 }}>
              {isView ? (
                isPending ? (
                  // 🔥 Transactions EN ATTENTE : Modifier + Rejeter + Valider + Supprimer
                  <>
                    <button className="acv-btn acv-btn-red" style={{ flex:0, padding:'0 .75rem' }} title="Supprimer" onClick={() => onConfirm('delete', '')}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                    <button className="acv-btn acv-btn-blue" style={{ flex:1 }} onClick={() => onConfirm('edit', '')}>Modifier</button>
                    <button className="acv-btn acv-btn-red" style={{ flex:1 }} onClick={() => onConfirm('reject', '')}>Rejeter</button>
                    <button className="acv-btn acv-btn-green" style={{ flex:2 }} onClick={() => onConfirm('validate', '')}>Valider</button>
                  </>
                ) : (
                  // 🔥 Transactions VALIDÉES/REJETÉES : Modifier + Supprimer (toujours disponibles)
                  <>
                    <button className="acv-btn acv-btn-blue" style={{ flex:1 }} onClick={() => onConfirm('edit', '')}>Modifier</button>
                    <button className="acv-btn acv-btn-red" style={{ flex:1 }} onClick={() => onConfirm('delete', '')}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ marginRight:'.3rem' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      Supprimer
                    </button>
                  </>
                )
              ) : (
                <button
                  className={`acv-btn ${mode === 'reject' || mode === 'delete' ? 'acv-btn-red' : mode === 'edit' ? 'acv-btn-blue' : 'acv-btn-green'}`}
                  style={{ width:'100%' }}
                  disabled={
                    busy ||
                    (mode === 'reject' && !inputValue.trim()) ||
                    (mode === 'delete' && inputValue !== 'SUPPRIMER')
                  }
                  onClick={() => onConfirm(mode, inputValue)}
                >
                  {busy
                    ? <div className="acv-spinner" />
                    : mode === 'delete'
                    ? 'Supprimer définitivement'
                    : 'Confirmer'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ MAIN PAGE */
export default function AdminContributionsPage() {
  const [items, setItems]   = useState<(Contribution & { submitter?: { firstName: string; lastName: string } | null })[]>([]);
  const [status, setStatus] = useState('PENDING_VALIDATION');
  const [q, setQ]           = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId]   = useState<string | null>(null);
  const [modal, setModal]     = useState<ModalState>({ mode: null, contribution: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listAntennaContributions({
        page: 1, pageSize: 100,
        status: status || undefined,
        q: q || undefined,
      });
      const data = Array.isArray(res) ? res : (res as unknown as { items?: Contribution[] })?.items ?? [];
      setItems(data as Contribution[]);
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(mode: ModalMode, value: string) {
    // Transition vers un mode d'action depuis la vue
    if (mode !== 'view' && modal.mode === 'view') {
      setModal(prev => ({ ...prev, mode }));
      return;
    }

    const c = modal.contribution;
    if (!c || mode === 'view') return;

    setBusyId(c.id);
    try {
      if (mode === 'validate') await api.validateContributionAntenna(c.id, { note: value });
      if (mode === 'reject')   await api.rejectContributionAntenna(c.id, { reason: value });
      if (mode === 'edit')     await api.updateContributionAntenna(c.id, { amount: parseFloat(value.replace(',', '.')) });
      // 🔥 FIX : deleteContributionAntenna appelé directement — plus de cast as unknown
      if (mode === 'delete')   await api.deleteContributionAntenna(c.id);

      setModal({ mode: null, contribution: null });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const memberName = (c: Contribution) => {
    const m = getMember(c);
    return m ? `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Inconnu' : 'Inconnu';
  };

  const initials = (name: string) => {
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
  };

  return (
    <AppShell title="Validation cotisations">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;700&display=swap');

        .acv-wrap { font-family:'DM Sans',sans-serif; padding:clamp(1rem,3vw,2rem); max-width:800px; margin:0 auto; }
        .acv-title { font-family:'Cormorant Garamond',serif; font-size:clamp(1.5rem,6vw,2rem); font-weight:700; color:#111827; margin-bottom:1.5rem; }
        .acv-title span { color:#2563EB; }

        .acv-toolbar { display:flex; flex-direction:row; gap:.5rem; margin-bottom:1.5rem; width:100%; box-sizing:border-box; align-items:center; flex-wrap:nowrap; }
        .acv-select { flex:0 0 auto; max-width:45%; height:42px; border-radius:12px; border:1px solid #E2E8F0; padding:0 1.8rem 0 .8rem; font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:600; color:#1E293B; outline:none; background:white; appearance:none; background-image:url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right .6rem center; }
        .acv-search { flex:1 1 auto; min-width:0; height:42px; border-radius:12px; border:1px solid #E2E8F0; padding:0 1rem; font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:600; color:#1E293B; outline:none; background:white; }
        .acv-select:focus,.acv-search:focus { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }

        @media(max-width:480px) {
          .acv-toolbar { gap:.4rem; }
          .acv-select,.acv-search { height:40px; font-size:.8rem; border-radius:10px; }
          .acv-select { max-width:50%; }
        }

        .acv-card { background:white; border-radius:20px; border:1px solid #E2E8F0; padding:1.25rem; margin-bottom:1rem; cursor:pointer; transition:all .2s; position:relative; box-shadow:0 4px 6px -1px rgba(0,0,0,.02); }
        .acv-card:hover { border-color:#2563EB; transform:translateY(-2px); box-shadow:0 10px 20px -5px rgba(37,99,235,.1); }
        .acv-card-inner { display:flex; gap:1rem; align-items:center; }
        .acv-avatar { width:48px; height:48px; border-radius:14px; background:#EFF6FF; color:#2563EB; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1.1rem; flex-shrink:0; border:1px solid #DBEAFE; }
        .acv-card-content { flex:1; min-width:0; }
        .acv-card-name { font-weight:800; font-size:1.05rem; color:#1E293B; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .acv-card-purpose { color:#64748B; font-size:.8rem; font-weight:600; }
        .acv-card-right { text-align:right; flex-shrink:0; }
        .acv-card-amount { font-family:'DM Mono',monospace; font-weight:800; color:#1E293B; font-size:1.15rem; margin-bottom:4px; }
        .acv-card-footer { margin-top:1rem; padding-top:.75rem; border-top:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center; }
        .acv-card-method { font-size:.7rem; font-weight:700; color:#94A3B8; text-transform:uppercase; display:flex; align-items:center; gap:5px; }

        .acv-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.6); backdrop-filter:blur(4px); z-index:1000; animation:fadeIn .2s ease-out; }
        .acv-modal { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:min(500px,95vw); background:white; border-radius:24px; z-index:1001; display:flex; flex-direction:column; max-height:90vh; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,.3); animation:slideUp .3s cubic-bezier(.16,1,.3,1); }
        .acv-modal-head { padding:1.25rem 1.5rem; border-bottom:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:flex-start; }
        .acv-modal-title { font-family:'Cormorant Garamond',serif; font-size:1.5rem; font-weight:700; color:#1E293B; margin-top:.4rem; }
        .acv-modal-close { background:#F1F5F9; border:none; width:32px; height:32px; border-radius:50%; cursor:pointer; color:#64748B; display:flex; align-items:center; justify-content:center; transition:background .2s; }
        .acv-modal-close:hover { background:#E2E8F0; color:#1E293B; }
        .acv-modal-body { padding:1.5rem; overflow-y:auto; flex:1; }
        .acv-section-title { font-size:.7rem; font-weight:800; color:#94A3B8; text-transform:uppercase; margin-bottom:.75rem; letter-spacing:.05em; display:flex; align-items:center; }
        .acv-detail-section { margin-bottom:1.5rem; }
        .acv-detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
        .acv-info-box { background:#F8FAFC; border:1px solid #F1F5F9; border-radius:12px; padding:.7rem .9rem; }
        .acv-info-box label { display:block; font-size:.6rem; font-weight:800; color:#94A3B8; text-transform:uppercase; letter-spacing:.02em; margin-bottom:.2rem; }
        .acv-info-box span { font-size:.85rem; font-weight:700; color:#1E293B; word-break:break-word; }
        .acv-amt-big { font-family:'DM Mono',monospace; color:#2563EB !important; font-size:1.2rem !important; font-weight:700 !important; }
        .acv-modal-footer { padding:1.25rem; background:#F8FAFC; border-top:1px solid #F1F5F9; }
        .acv-footer-btns { display:flex; gap:.5rem; align-items:center; }
        .acv-btn { padding:.8rem 1rem; border-radius:12px; font-weight:800; font-size:.8rem; border:none; cursor:pointer; transition:all .2s; white-space:nowrap; display:flex; align-items:center; justify-content:center; }
        .acv-btn-green { background:#059669; color:white; } .acv-btn-green:hover { background:#047857; }
        .acv-btn-red { background:#FEF2F2; color:#DC2626; border:1px solid #FECACA; } .acv-btn-red:hover { background:#FEE2E2; }
        .acv-btn-blue { background:#EFF6FF; color:#2563EB; border:1px solid #BFDBFE; } .acv-btn-blue:hover { background:#DBEAFE; }
        .acv-btn-sec { background:transparent; color:#64748B; font-weight:700; border:none; font-size:.85rem; cursor:pointer; padding:0 .5rem; }
        .acv-btn:disabled { opacity:.5; cursor:not-allowed; }
        .acv-action-form { background:#F8FAFC; border-radius:14px; padding:1rem; margin-top:.5rem; }
        .acv-form-lbl { display:block; font-size:.72rem; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:.05em; margin-bottom:.5rem; }
        .acv-input { width:100%; padding:.7rem .9rem; border-radius:10px; border:1.5px solid #E2E8F0; font-family:'DM Sans',sans-serif; font-size:.9rem; font-weight:600; color:#111827; outline:none; resize:vertical; background:white; box-sizing:border-box; }
        .acv-input:focus { border-color:#3B82F6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
        .acv-spinner { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.3); border-top-color:white; border-radius:50%; animation:spin .7s linear infinite; }
        .acv-empty { padding:3rem; text-align:center; color:#94A3B8; font-size:.9rem; }

        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translate(-50%,-45%)} to{opacity:1;transform:translate(-50%,-50%)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div className="acv-wrap">
        <h1 className="acv-title">Cotisations — <span>Validation</span></h1>

        <div className="acv-toolbar">
          <select
            className="acv-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">Tous statuts</option>
            <option value="PENDING_VALIDATION">En attente</option>
            <option value="VALIDATED">Validées</option>
            <option value="REJECTED">Rejetées</option>
            <option value="CANCELLED">Annulées</option>
          </select>
          <input
            className="acv-search"
            placeholder="Rechercher un membre…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void load()}
          />
        </div>

        {loading ? (
          <div className="acv-empty">
            <div style={{ width:28, height:28, border:'2.5px solid #E2E8F0', borderTopColor:'#2563EB', borderRadius:'50%', animation:'spin .8s linear infinite', margin:'0 auto 1rem' }} />
            Chargement…
          </div>
        ) : items.length === 0 ? (
          <div className="acv-empty">Aucune cotisation trouvée.</div>
        ) : (
          items.map(c => {
            const member = getMember(c);
            const method = getMethod(c);
            const name   = memberName(c);
            return (
              <div
                key={c.id}
                className="acv-card"
                onClick={() => setModal({ mode: 'view', contribution: c })}
              >
                <div className="acv-card-inner">
                  <div className="acv-avatar">{initials(name)}</div>
                  <div className="acv-card-content">
                    <div className="acv-card-name">{name}</div>
                    <div className="acv-card-purpose">{PURPOSE_MAP[c.purpose] || c.purpose || '—'}</div>
                  </div>
                  <div className="acv-card-right">
                    <div className="acv-card-amount">{Number(c.amount).toLocaleString('fr-FR')} {c.currency || 'EUR'}</div>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <div className="acv-card-footer">
                  <div className="acv-card-method">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                    {METHOD_MAP[method] || method}
                  </div>
                  <div style={{ fontSize:'.72rem', color:'#94A3B8', fontWeight:600 }}>
                    {formatDate(getDate(c))}
                  </div>
                  {(member as unknown as { antennaName?: string })?.antennaName && (
                    <div style={{ fontSize:'.68rem', color:'#94A3B8', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
                      {(member as unknown as { antennaName?: string })?.antennaName}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <ContributionDetailModal
        state={modal}
        onClose={() => setModal({ mode: null, contribution: null })}
        onConfirm={(mode, val) => void handleAction(mode, val)}
        busy={!!busyId}
      />
    </AppShell>
  );
}