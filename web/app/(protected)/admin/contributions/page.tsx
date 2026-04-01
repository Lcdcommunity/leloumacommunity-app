// web/app/(protected)/admin/contributions/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Contribution, ContributionStatus } from '../../../../types/contribution';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ TYPES & EXTRACTEURS */

type ModalMode = 'view' | 'validate' | 'reject' | 'edit';

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
  };
  const s = map[status] || map['PENDING_VALIDATION'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.3rem', fontSize:'0.6rem', fontWeight:900, color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:99, padding:'0.15rem 0.5rem', textTransform:'uppercase', letterSpacing:'0.02em' }}>
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
    <>
      <div className="acv-modal-overlay" onClick={onClose} />
      <div className="acv-modal">
        <div className="acv-modal-head">
          <div>
            <StatusBadge status={c.status} />
            <h2 className="acv-modal-title">Détails de la cotisation</h2>
          </div>
          <button className="acv-modal-close" onClick={onClose}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="acv-modal-body">
          <div className="acv-detail-section">
            <h3 className="acv-section-title">
              <span style={{marginRight: '6px'}}>👤</span> Informations du Membre
            </h3>
            <div className="acv-detail-grid">
              <div className="acv-info-box">
                <label>Nom complet</label>
                <span style={{color:'#2563EB', fontWeight:800}}>
                  {member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Nom manquant' : 'Information introuvable'}
                </span>
              </div>
              <div className="acv-info-box">
                <label>Email</label>
                <span>{member?.email || '—'}</span>
              </div>
              <div className="acv-info-box" style={{ gridColumn: '1 / -1' }}>
                <label>Téléphone</label>
                <span>{member?.phone || '—'}</span>
              </div>
            </div>
          </div>

          <div className="acv-detail-section">
            <h3 className="acv-section-title">
              <span style={{marginRight: '6px'}}>💰</span> Détails du versement
            </h3>
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
              <div className="acv-info-box full" style={{marginTop:'0.75rem', gridColumn: '1 / -1'}}>
                <label>Note du membre</label>
                <p style={{margin:0, fontSize:'0.85rem', fontWeight:500, color:'#475569'}}>{note}</p>
              </div>
            )}
          </div>

          {!isView && (
            <div className="acv-action-form">
              <label className="acv-form-lbl">
                {mode === 'reject' ? 'Motif du rejet (Obligatoire)' : mode === 'edit' ? 'Nouveau montant' : 'Note interne (Optionnel)'}
              </label>
              <textarea className="acv-input" value={inputValue} onChange={e => setInputValue(e.target.value)} rows={2} />
            </div>
          )}
        </div>

        <div className="acv-modal-footer">
          <div className="acv-footer-btns">
            {!isView && <button className="acv-btn-sec" onClick={() => onConfirm('view', '')}>← Retour</button>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.6rem', flex: 1 }}>
              {isView ? (
                <>
                  <button className="acv-btn acv-btn-blue" style={{flex:1}} onClick={() => onConfirm('edit', '')}>Modifier</button>
                  <button className="acv-btn acv-btn-red" style={{flex:1}} onClick={() => onConfirm('reject', '')}>Rejeter</button>
                  <button className="acv-btn acv-btn-green" style={{flex:2}} onClick={() => onConfirm('validate', '')}>Valider</button>
                </>
              ) : (
                <button 
                  className={`acv-btn ${mode === 'reject' ? 'acv-btn-red' : mode === 'edit' ? 'acv-btn-blue' : 'acv-btn-green'}`}
                  style={{width:'100%'}}
                  disabled={busy || (mode === 'reject' && !inputValue.trim())}
                  onClick={() => onConfirm(mode, inputValue)}
                >
                  {busy ? <div className="acv-spinner" /> : 'Confirmer'}
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
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('PENDING_VALIDATION');
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
      if (mode === 'validate') await api.validateContributionAntenna(c.id, { note: value });
      if (mode === 'reject') await api.rejectContributionAntenna(c.id, { reason: value });
      if (mode === 'edit') await api.updateContributionAntenna(c.id, { amount: parseFloat(value) });
      setModal({ mode: null, contribution: null });
      await load();
    } finally { setBusyId(null); }
  }

  return (
    <AppShell title="Validation cotisations">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;700&display=swap');
        
        .acv-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 800px; margin: 0 auto; }
        .acv-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 6vw, 2rem); font-weight: 700; color: #111827; margin-bottom: 1.5rem; white-space: nowrap; }
        .acv-title span { color: #2563EB; }
        
        .acv-toolbar { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .acv-select, .acv-search { height: 42px; border-radius: 12px; border: 1px solid #E2E8F0; padding: 0 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; color: #1E293B; outline: none; background: white; }
        .acv-search { flex: 1; min-width: 200px; }
        
        .acv-card { background: white; border-radius: 20px; border: 1px solid #E2E8F0; padding: 1.25rem; margin-bottom: 1rem; cursor: pointer; transition: all 0.2s; position: relative; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .acv-card:hover { border-color: #2563EB; transform: translateY(-2px); box-shadow: 0 10px 20px -5px rgba(37,99,235,0.1); }
        
        .acv-card-inner { display: flex; gap: 1rem; align-items: center; }
        .acv-avatar { width: 48px; height: 48px; border-radius: 14px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; border: 1px solid #DBEAFE; }
        
        .acv-card-content { flex: 1; min-width: 0; }
        .acv-card-name { font-weight: 800; font-size: 1.05rem; color: #1E293B; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .acv-card-purpose { color: #64748B; font-size: 0.8rem; font-weight: 600; }
        
        .acv-card-right { text-align: right; flex-shrink: 0; }
        .acv-card-amount { font-family: 'DM Mono', monospace; font-weight: 800; color: #1E293B; font-size: 1.15rem; margin-bottom: 4px; }
        
        .acv-card-footer { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center; }
        .acv-card-method { font-size: 0.7rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; display: flex; align-items: center; gap: 5px; }

        .acv-modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); z-index: 1000; animation: fadeIn 0.2s ease-out; }
        .acv-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: min(500px, 95vw); background: white; border-radius: 24px; z-index: 1001; display: flex; flex-direction: column; max-height: 90vh; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .acv-modal-head { padding: 1.25rem 1.5rem; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: flex-start; }
        .acv-modal-title { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; font-weight: 700; color: #1E293B; margin-top: 0.4rem; }
        .acv-modal-close { background: #F1F5F9; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: #64748B; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .acv-modal-close:hover { background: #E2E8F0; color: #1E293B; }
        .acv-modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
        .acv-section-title { font-size: 0.7rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; margin-bottom: 0.75rem; letter-spacing: 0.05em; display: flex; align-items: center; }
        .acv-detail-section { margin-bottom: 1.5rem; }
        .acv-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        .acv-info-box { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 0.7rem 0.9rem; }
        .acv-info-box label { display: block; font-size: 0.6rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 0.2rem; }
        .acv-info-box span { font-size: 0.85rem; font-weight: 700; color: #1E293B; word-break: break-word; }
        .acv-amt-big { font-family: 'DM Mono', monospace; color: #2563EB !important; font-size: 1.2rem !important; font-weight: 700 !important; }
        .acv-modal-footer { padding: 1.25rem; background: #F8FAFC; border-top: 1px solid #F1F5F9; }
        .acv-footer-btns { display: flex; gap: 0.5rem; align-items: center; }
        .acv-btn { padding: 0.8rem 1rem; border-radius: 12px; font-weight: 800; font-size: 0.8rem; border: none; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; justify-content: center; }
        .acv-btn-green { background: #059669; color: white; }
        .acv-btn-green:hover { background: #047857; }
        .acv-btn-red { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
        .acv-btn-red:hover { background: #FEE2E2; }
        .acv-btn-blue { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
        .acv-btn-blue:hover { background: #DBEAFE; }
        .acv-btn-sec { background: transparent; color: #64748B; font-weight: 700; border: none; font-size: 0.85rem; cursor: pointer; }
        .acv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .acv-action-form { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 16px; padding: 1rem; margin-top: 1rem; }
        .acv-form-lbl { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #B91C1C; margin-bottom: 0.4rem; display: block; }
        .acv-input { width: 100%; border-radius: 10px; border: 1.5px solid #E2E8F0; padding: 0.6rem; font-size: 0.85rem; outline: none; }
        .acv-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="acv-wrap">
        <h1 className="acv-title">Validation des <span>cotisations</span></h1>
        
        <div className="acv-toolbar">
          <select className="acv-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="PENDING_VALIDATION">En attente de validation</option>
            <option value="VALIDATED">Validées</option>
            <option value="REJECTED">Rejetées</option>
            <option value="CANCELLED">Annulées</option>
          </select>
          <input 
            type="text" 
            className="acv-search" 
            placeholder="Rechercher par nom..." 
            value={q} 
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'4rem', color:'#64748B', fontWeight: 600}}>
            <div className="acv-spinner" style={{borderColor: 'rgba(37,99,235,0.2)', borderTopColor: '#2563EB', margin: '0 auto 1rem', width: '24px', height: '24px'}} />
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
            <div key={c.id} className="acv-card" onClick={() => {
              console.log("DONNÉES REÇUES PAR LE FRONTEND :", c);
              setModal({ mode: 'view', contribution: c });
            }}>
              <div className="acv-card-inner">
                <div className="acv-avatar">{initials}</div>
                <div className="acv-card-content">
                  <div className="acv-card-name">{name}</div>
                  <div className="acv-card-purpose">{PURPOSE_MAP[c.purpose] || c.purpose}</div>
                </div>
                <div className="acv-card-right">
                  <div className="acv-card-amount">{Number(c.amount).toLocaleString('fr-FR')} {c.currency || 'EUR'}</div>
                  <StatusBadge status={c.status} />
                </div>
              </div>
              
              <div className="acv-card-footer">
                <div className="acv-card-method">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                  {METHOD_MAP[method] || method}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
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