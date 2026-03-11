// web/app/(protected)/admin/contributions/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Contribution, ContributionStatus } from '../../../../types/contribution';
import { formatDate } from '../../../../lib/format';

type ModalType = 'validate' | 'reject' | 'edit' | null;
interface ModalState { type: ModalType; contribution: Contribution | null }

function memberName(c: Contribution): string {
  return c.member ? `${c.member.firstName} ${c.member.lastName}`.trim() : c.memberId;
}

function StatusBadge({ status }: { status: ContributionStatus | string }) {
  // 👇 AJOUT CHIRURGICAL : 'PENDING_VALIDATION' (le vrai statut en base)
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED: { label: 'Valid\u00e9e',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    REJECTED:  { label: 'Rejet\u00e9e', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING:   { label: 'En attente',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' }, // Conservé au cas où
    CANCELLED: { label: 'Annul\u00e9e', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  
  // Sécurité supplémentaire : valeur par défaut si le statut est inconnu
  const s = map[status] || map['PENDING_VALIDATION'];
  
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'0.28rem', fontSize:'0.69rem', fontWeight:800, letterSpacing:'0.03em', color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:99, padding:'0.22rem 0.6rem', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.color, flexShrink:0 }} />{s.label}
    </span>
  );
}

function AmountPill({ amount }: { amount: number }) {
  return (
    <span style={{ display:'inline-block', fontFamily:"'DM Mono',monospace", fontSize:'0.84rem', fontWeight:700, color:'#0F172A', background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:8, padding:'0.18rem 0.55rem' }}>
      {amount.toLocaleString('fr-FR', { minimumFractionDigits:0 })}{' '}<span style={{ fontSize:'0.7rem', color:'#0369A1', fontWeight:600 }}>GNF</span>
    </span>
  );
}

function Modal({ modal, onClose, onConfirm, busy }: { modal: ModalState; onClose: () => void; onConfirm: (v: string) => void; busy: boolean }) {
  const getInitial = useCallback((m: ModalState) => m.type === 'edit' ? String(m.contribution?.amount ?? '') : '', []);
  const [value, setValue] = useState(() => getInitial(modal));
  useEffect(() => { setValue(getInitial(modal)); }, [modal, getInitial]);

  if (!modal.type || !modal.contribution) return null;

  const configs = {
    validate: { title:'Valider la cotisation', icon:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>, iconBg:'#ECFDF5', label:'Note interne', placeholder:'Note de validation (optionnel)\u2026', cta:'Confirmer la validation', ctaGrad:'linear-gradient(135deg,#059669,#10B981)', ctaShadow:'rgba(5,150,105,0.3)', ib:'rgba(5,150,105,0.25)', ibg:'rgba(236,253,245,0.5)' },
    reject:   { title:'Rejeter la cotisation',  icon:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>, iconBg:'#FEF2F2', label:'Motif du rejet', placeholder:'Motif du rejet (obligatoire)\u2026', cta:'Confirmer le rejet', ctaGrad:'linear-gradient(135deg,#B91C1C,#DC2626)', ctaShadow:'rgba(220,38,38,0.3)', ib:'rgba(220,38,38,0.25)', ibg:'rgba(254,242,242,0.5)' },
    edit:     { title:'Modifier le montant',    icon:<svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>, iconBg:'#EFF6FF', label:'Nouveau montant (GNF)', placeholder:'', cta:'Enregistrer', ctaGrad:'linear-gradient(135deg,#1D4ED8,#2563EB)', ctaShadow:'rgba(37,99,235,0.3)', ib:'rgba(37,99,235,0.25)', ibg:'rgba(239,246,255,0.5)' },
  } as const;

  const cfg = configs[modal.type];
  const canConfirm = modal.type === 'reject' ? value.trim().length > 0 : true;

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', zIndex:100 }} onClick={onClose} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:101, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(18px)', borderRadius:20, padding:'clamp(1.5rem,4vw,2rem)', width:'min(460px,calc(100vw - 2rem))', border:'1px solid rgba(37,99,235,0.1)', boxShadow:'0 24px 60px rgba(37,99,235,0.14)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.4rem' }}>
          <div style={{ width:42, height:42, borderRadius:12, background:cfg.iconBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{cfg.icon}</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:600, color:'#111827' }}>{cfg.title}</h2>
        </div>
        <div style={{ background:'#F8FAFC', borderRadius:10, padding:'0.65rem 0.9rem', marginBottom:'1.1rem', border:'1px solid #E2E8F0' }}>
          <span style={{ fontSize:'0.75rem', fontWeight:700, color:'#6B7280' }}>Membre :</span>
          <span style={{ fontSize:'0.82rem', fontWeight:700, color:'#111827', marginLeft:'0.4rem' }}>{memberName(modal.contribution)}</span>
          <span style={{ marginLeft:'0.75rem', fontSize:'0.75rem', fontWeight:700, color:'#6B7280' }}>Montant :</span>
          <span style={{ marginLeft:'0.4rem' }}><AmountPill amount={modal.contribution.amount} /></span>
        </div>
        <label style={{ fontSize:'0.73rem', fontWeight:700, color:'#374151', display:'block', marginBottom:'0.35rem', letterSpacing:'0.04em', textTransform:'uppercase' }}>{cfg.label}</label>
        {modal.type === 'edit'
          ? <input type="number" min="1" value={value} onChange={e => setValue(e.target.value)} style={{ width:'100%', height:44, borderRadius:11, padding:'0 1rem', border:`1px solid ${cfg.ib}`, background:cfg.ibg, fontFamily:"'DM Mono',monospace", fontSize:'0.9rem', fontWeight:600, color:'#0F172A', outline:'none' }} />
          : <textarea value={value} onChange={e => setValue(e.target.value)} placeholder={cfg.placeholder} rows={3} style={{ width:'100%', borderRadius:11, padding:'0.7rem 1rem', border:`1px solid ${cfg.ib}`, background:cfg.ibg, fontFamily:"'DM Sans',sans-serif", fontSize:'0.84rem', color:'#111827', outline:'none', resize:'vertical' }} />
        }
        {modal.type === 'reject' && !value.trim() && <p style={{ fontSize:'0.69rem', color:'#DC2626', fontWeight:600, marginTop:'0.3rem' }}>Le motif est obligatoire pour rejeter.</p>}
        <div style={{ display:'flex', gap:'0.6rem', marginTop:'1.1rem', justifyContent:'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{ height:42, padding:'0 1.1rem', borderRadius:10, border:'1px solid rgba(37,99,235,0.15)', background:'rgba(249,250,251,0.9)', fontFamily:"'DM Sans',sans-serif", fontSize:'0.8rem', fontWeight:600, color:'#374151', cursor:'pointer' }}>Annuler</button>
          <button onClick={() => onConfirm(value)} disabled={busy || !canConfirm} style={{ height:42, padding:'0 1.25rem', borderRadius:10, border:'none', background:cfg.ctaGrad, fontFamily:"'DM Sans',sans-serif", fontSize:'0.8rem', fontWeight:700, color:'white', cursor:'pointer', boxShadow:`0 4px 12px ${cfg.ctaShadow}`, opacity:(busy||!canConfirm)?0.6:1, display:'flex', alignItems:'center', gap:'0.4rem' }}>
            {busy && <div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'acvspin 0.7s linear infinite' }} />}
            {cfg.cta}
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminContributionsPage() {
  const [items,   setItems]   = useState<Contribution[]>([]);
  // 👇 AJOUT CHIRURGICAL : Sélectionner le bon filtre par défaut 'PENDING_VALIDATION'
  const [status,  setStatus]  = useState('PENDING_VALIDATION');
  const [q,       setQ]       = useState('');
  const [busyId,  setBusyId]  = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState<ModalState>({ type: null, contribution: null });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await api.listAntennaContributions({ page:1, pageSize:100, status: status || undefined, q: q || undefined });
      setItems(res?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally { setLoading(false); }
  }, [status, q]);

  useEffect(() => { void load(); }, [load]);

  async function handleConfirm(value: string) {
    if (!modal.contribution) return;
    const id = modal.contribution.id;
    setBusyId(id);
    try {
      if (modal.type === 'validate')    await api.validateContributionAntenna(id, { note: value || undefined });
      else if (modal.type === 'reject') await api.rejectContributionAntenna(id, { reason: value });
      else if (modal.type === 'edit') {
        const amount = parseFloat(value.replace(',', '.'));
        if (!isNaN(amount) && amount > 0) await api.updateContributionAntenna(id, { amount });
      }
      setModal({ type:null, contribution:null });
      await load();
    } finally { setBusyId(null); }
  }

  // 👇 AJOUT CHIRURGICAL : Compter les "PENDING_VALIDATION"
  const pendingCount = items.filter(i => i.status === 'PENDING_VALIDATION' || i.status === 'PENDING').length;
  const totalPending = items.filter(i => i.status === 'PENDING_VALIDATION' || i.status === 'PENDING').reduce((s, i) => s + (i.amount ?? 0), 0);

  const BtnIcon = ({ d }: { d: string }) => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d={d}/></svg>;
  const Spinner = () => <div style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'acvspin 0.7s linear infinite' }} />;

  const ActionButtons = ({ c, flex }: { c: Contribution; flex?: boolean }) => (
    <div style={{ display:'flex', gap:'0.35rem', justifyContent: flex ? undefined : 'flex-end', flexWrap:'wrap' }}>
      {/* 👇 AJOUT CHIRURGICAL : Afficher les boutons pour PENDING_VALIDATION */}
      {(c.status === 'PENDING_VALIDATION' || c.status === 'PENDING') && (
        <>
          <button className="acv-btn acv-btn-green" style={ flex ? { flex:1, justifyContent:'center' } : undefined } disabled={busyId===c.id} onClick={() => setModal({ type:'validate', contribution:c })}>
            {busyId===c.id ? <Spinner /> : <BtnIcon d="M5 13l4 4L19 7" />}Valider
          </button>
          <button className="acv-btn acv-btn-red" style={ flex ? { flex:1, justifyContent:'center' } : undefined } disabled={busyId===c.id} onClick={() => setModal({ type:'reject', contribution:c })}>
            <BtnIcon d="M6 18L18 6M6 6l12 12" />Rejeter
          </button>
        </>
      )}
      <button className="acv-btn acv-btn-blue" style={ flex ? { flex:1, justifyContent:'center' } : undefined } disabled={busyId===c.id} onClick={() => setModal({ type:'edit', contribution:c })}>
        <BtnIcon d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />Modifier
      </button>
    </div>
  );

  return (
    <AppShell title="Validation cotisations">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap');
        .acv-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1100px;margin:0 auto}
        .acv-header{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:acvin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .acv-eyebrow{font-size:.67rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .acv-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:acvpulse 2s ease-in-out infinite}
        @keyframes acvpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .acv-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.85rem);font-weight:600;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .acv-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .acv-banner{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap;justify-content:space-between;padding:.85rem 1.1rem;border-radius:14px;margin-bottom:1.25rem;background:linear-gradient(135deg,rgba(251,191,36,.12),rgba(245,158,11,.08));border:1px solid rgba(245,158,11,.3);opacity:0;transform:translateY(8px);animation:acvin .5s .07s cubic-bezier(.22,1,.36,1) forwards}
        .acv-banner-left{display:flex;align-items:center;gap:.6rem}
        .acv-banner-ico{width:34px;height:34px;border-radius:10px;background:rgba(245,158,11,.15);display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .acv-banner-title{font-size:.82rem;font-weight:800;color:#92400E}
        .acv-banner-sub{font-size:.72rem;font-weight:600;color:#B45309}
        .acv-banner-amt{font-family:'DM Mono',monospace;font-size:.82rem;font-weight:700;color:#92400E;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:.2rem .6rem}
        .acv-toolbar{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem;opacity:0;transform:translateY(10px);animation:acvin .5s .11s cubic-bezier(.22,1,.36,1) forwards}
        .acv-sw{position:relative;flex:1;min-width:200px}
        .acv-si{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .acv-search{width:100%;height:44px;border-radius:12px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.88);padding:0 1rem 0 2.5rem;font-family:'DM Sans',sans-serif;font-size:.84rem;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .acv-search:focus{border-color:rgba(37,99,235,.45);box-shadow:0 0 0 3px rgba(37,99,235,.09);background:white}
        .acv-search::placeholder{color:rgba(107,114,128,.45)}
        .acv-select{height:44px;border-radius:12px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.88);padding:0 2rem 0 .9rem;font-family:'DM Sans',sans-serif;font-size:.82rem;color:#374151;font-weight:600;outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%236B7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .75rem center;min-width:160px}
        .acv-fbtn{height:44px;padding:0 1.25rem;border-radius:12px;background:linear-gradient(135deg,#1D4ED8,#2563EB);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;display:flex;align-items:center;gap:.4rem;box-shadow:0 4px 14px rgba(37,99,235,.28);transition:all .18s;white-space:nowrap}
        .acv-fbtn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,.38)}
        .acv-panel{background:rgba(253,253,255,.93);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 14px rgba(37,99,235,.05),0 0 0 1px rgba(255,255,255,.85) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:acvin .5s .16s cubic-bezier(.22,1,.36,1) forwards}
        .acv-tw{overflow-x:auto}
        .acv-table{width:100%;border-collapse:collapse;min-width:700px}
        .acv-table thead tr{border-bottom:1px solid rgba(37,99,235,.09)}
        .acv-table thead th{padding:.8rem 1.1rem;font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#374151;text-align:left;background:rgba(248,250,252,.7);white-space:nowrap}
        .acv-table tbody tr{border-bottom:1px solid rgba(37,99,235,.055);transition:background .15s;animation:acvin .4s cubic-bezier(.22,1,.36,1) both}
        .acv-table tbody tr:last-child{border-bottom:none}
        .acv-table tbody tr:hover{background:rgba(37,99,235,.025)}
        .acv-table td{padding:.85rem 1.1rem;vertical-align:middle}
        .acv-name{font-size:.87rem;font-weight:800;color:#0F172A}
        .acv-ref{font-family:'DM Mono',monospace;font-size:.68rem;color:#6B7280;font-weight:500}
        .acv-date{font-size:.78rem;color:#374151;font-weight:600;white-space:nowrap}
        .acv-note{font-size:.75rem;color:#4B5563;font-weight:500;max-width:180px}
        .acv-btn{height:33px;padding:0 .8rem;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.3rem;transition:all .15s;white-space:nowrap;border:none}
        .acv-btn-green{background:linear-gradient(135deg,#059669,#10B981);color:white;box-shadow:0 2px 6px rgba(5,150,105,.28)}
        .acv-btn-green:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(5,150,105,.38)}
        .acv-btn-red{border:1.5px solid rgba(220,38,38,.25) !important;background:rgba(254,242,242,.7);color:#DC2626}
        .acv-btn-red:hover:not(:disabled){background:#FEE2E2;border-color:rgba(220,38,38,.45) !important}
        .acv-btn-blue{border:1.5px solid rgba(37,99,235,.2) !important;background:rgba(239,246,255,.7);color:#1D4ED8}
        .acv-btn-blue:hover:not(:disabled){background:#DBEAFE;border-color:rgba(37,99,235,.4) !important}
        .acv-btn:disabled{opacity:.5;cursor:not-allowed}
        .acv-mob{display:none}
        @media(max-width:680px){.acv-tw{display:none}.acv-mob{display:flex;flex-direction:column}}
        .acv-mc{padding:1rem 1.1rem;border-bottom:1px solid rgba(37,99,235,.07);animation:acvin .4s cubic-bezier(.22,1,.36,1) both}
        .acv-mc:last-child{border-bottom:none}
        .acv-mc-row{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.55rem}
        .acv-mc-meta{font-size:.71rem;color:#6B7280;font-weight:500;display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:.65rem;align-items:center}
        .acv-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.82rem;font-weight:600}
        .acv-ring{width:24px;height:24px;border:2.5px solid rgba(37,99,235,.1);border-top-color:#2563EB;border-radius:50%;animation:acvspin .8s linear infinite}
        .acv-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .acv-empty-ico{width:52px;height:52px;border-radius:50%;background:#ECFDF5;border:1px solid #A7F3D0;display:flex;align-items:center;justify-content:center}
        .acv-empty p{font-size:.82rem;font-weight:700}
        .acv-err{display:flex;align-items:center;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.8rem;font-weight:700;margin-bottom:1rem}
        @keyframes acvin{to{opacity:1;transform:translateY(0)}}
        @keyframes acvspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="acv-wrap">
        <div className="acv-header">
          <div>
            <div className="acv-eyebrow"><div className="acv-dot" />Admin antenne</div>
            <h1 className="acv-title">Validation des <span>cotisations</span></h1>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="acv-banner">
            <div className="acv-banner-left">
              <div className="acv-banner-ico"><svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#D97706" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg></div>
              <div>
                <div className="acv-banner-title">{pendingCount} cotisation{pendingCount > 1 ? 's' : ''} en attente de validation</div>
                <div className="acv-banner-sub">Action requise &mdash; ces membres attendent votre confirmation</div>
              </div>
            </div>
            <span className="acv-banner-amt">{totalPending.toLocaleString('fr-FR')} GNF</span>
          </div>
        )}

        {error && <div className="acv-err"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>{error}</div>}

        <div className="acv-toolbar">
          <div className="acv-sw">
            <span className="acv-si"><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg></span>
            <input className="acv-search" type="text" placeholder="Recherche membre / r\u00e9f\u00e9rence\u2026" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && void load()} />
          </div>
          {/* 👇 AJOUT CHIRURGICAL : 'PENDING_VALIDATION' */}
          <select className="acv-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="PENDING_VALIDATION">En attente</option>
            <option value="">Tous statuts</option>
            <option value="VALIDATED">Valid\u00e9e</option>
            <option value="REJECTED">Rejet\u00e9e</option>
            <option value="CANCELLED">Annul\u00e9e</option>
          </select>
          <button className="acv-fbtn" onClick={() => void load()}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>Filtrer
          </button>
        </div>

        <div className="acv-panel">
          {loading ? (
            <div className="acv-loader"><div className="acv-ring" />Chargement&#8230;</div>
          ) : items.length === 0 ? (
            <div className="acv-empty">
              <div className="acv-empty-ico"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="1.5"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
              <p>Aucune cotisation en attente &mdash; tout est trait&eacute;&nbsp;!</p>
            </div>
          ) : (
            <>
              <div className="acv-tw">
                <table className="acv-table">
                  <thead><tr><th>Membre</th><th>Montant</th><th>Statut</th><th>Note</th><th>Date</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {items.map((c, i) => (
                      <tr key={c.id} style={{ animationDelay:`${i * 0.03}s` }}>
                        <td><div className="acv-name">{memberName(c)}</div><div className="acv-ref">{c.id.slice(0,8)}</div></td>
                        <td><AmountPill amount={c.amount} /></td>
                        <td><StatusBadge status={c.status} /></td>
                        <td><span className="acv-note">{c.note ?? <span style={{ color:'#D1D5DB' }}>—</span>}</span></td>
                        <td><span className="acv-date">{formatDate(c.createdAt)}</span></td>
                        <td><ActionButtons c={c} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="acv-mob">
                {items.map((c, i) => (
                  <div key={c.id} className="acv-mc" style={{ animationDelay:`${i * 0.03}s` }}>
                    <div className="acv-mc-row"><div><div className="acv-name">{memberName(c)}</div><div className="acv-ref">{c.id.slice(0,8)}</div></div><StatusBadge status={c.status} /></div>
                    <div className="acv-mc-meta"><AmountPill amount={c.amount} /><span>{formatDate(c.createdAt)}</span></div>
                    {c.note && <p className="acv-note" style={{ marginBottom:'.6rem' }}>{c.note}</p>}
                    <ActionButtons c={c} flex />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal modal={modal} onClose={() => setModal({ type:null, contribution:null })} onConfirm={v => void handleConfirm(v)} busy={busyId !== null} />
    </AppShell>
  );
}