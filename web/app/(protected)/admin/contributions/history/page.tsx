// web/app/(protected)/admin/contributions/history/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import type { Contribution, ContributionStatus } from '../../../../../types/contribution';
import { formatDate } from '../../../../../lib/format';

type ModalType = 'validate' | 'reject' | 'edit' | 'delete' | 'detail' | null;

interface ModalState {
  type: ModalType;
  contribution: Contribution | null;
}

type StatusMeta = {
  label: string;
  color: string;
  bg: string;
  border: string;
};

type ExtendedContribution = Contribution & {
  currency?: string;
  paymentMethod?: string;
  method?: string;
  note?: string;
  memberComment?: string;
  adminComment?: string;
  rejectionReason?: string;
  member?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

function memberName(c: Contribution): string {
  if (c.member) {
    const firstName =
      'firstName' in c.member && typeof c.member.firstName === 'string'
        ? c.member.firstName
        : '';
    const lastName =
      'lastName' in c.member && typeof c.member.lastName === 'string'
        ? c.member.lastName
        : '';
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
  }
  if ('memberId' in c && typeof c.memberId === 'string') return c.memberId;
  if ('memberUserId' in c && typeof c.memberUserId === 'string') return c.memberUserId;
  return c.id;
}

function getStatusMeta(status: ContributionStatus | string): StatusMeta {
  const map: Partial<Record<ContributionStatus | string, StatusMeta>> = {
    DRAFT:              { label: 'Brouillon',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    SUBMITTED:          { label: 'Soumise',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING:            { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    VALIDATED:          { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    REJECTED:           { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    CANCELLED:          { label: 'Annulée',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  return map[status] ?? { label: String(status ?? 'Inconnu'), color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
}

function StatusBadge({ status }: { status: ContributionStatus | string }) {
  const s = getStatusMeta(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
      fontSize: '0.69rem', fontWeight: 800, letterSpacing: '0.03em',
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 99, padding: '0.22rem 0.6rem', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function AmountPill({ amount, currency = 'EURO' }: { amount: number; currency?: string }) {
  return (
    <span style={{
      display: 'inline-block', fontFamily: "'DM Mono', monospace",
      fontSize: '0.84rem', fontWeight: 700, color: '#0F172A',
      background: '#F0F9FF', border: '1px solid #BAE6FD',
      borderRadius: 8, padding: '0.18rem 0.55rem',
    }}>
      {amount.toLocaleString('fr-FR', { minimumFractionDigits: 0 })}{' '}
      <span style={{ fontSize: '0.7rem', color: '#0369A1', fontWeight: 600 }}>{currency}</span>
    </span>
  );
}

const InfoField = ({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) => (
  <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined, background: '#F8FAFC', padding: '0.8rem 1rem', borderRadius: 10, border: '1px solid #E2E8F0' }}>
    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{label}</div>
    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{children}</div>
  </div>
);

function Modal({
  modal, onClose, onConfirm, busy, setModal,
}: {
  modal: ModalState;
  onClose: () => void;
  onConfirm: (v: string) => void;
  busy: boolean;
  setModal: (m: ModalState) => void;
}) {
  const getInitial = useCallback(
    (m: ModalState) => (m.type === 'edit' ? String(m.contribution?.amount ?? '') : ''),
    [],
  );

  const [value, setValue] = useState(() => getInitial(modal));

  useEffect(() => { setValue(getInitial(modal)); }, [modal, getInitial]);

  if (!modal.type || !modal.contribution) return null;

  if (modal.type === 'detail') {
    const extC = modal.contribution as ExtendedContribution;
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={onClose} />
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(18px)', borderRadius: 20, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(600px,calc(100vw - 2rem))', border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 24px 60px rgba(37,99,235,0.14)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 600, color: '#111827' }}>Détails de la transaction</h2>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <InfoField label="Membre" fullWidth>
              {memberName(modal.contribution)}{' '}
              <span style={{ color: '#6B7280', fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: 500 }}>
                ({extC.member?.email || 'Aucun email'})
              </span>
            </InfoField>
            <InfoField label="Montant"><AmountPill amount={extC.amount} currency={extC.currency} /></InfoField>
            <InfoField label="Statut"><StatusBadge status={extC.status} /></InfoField>
            <InfoField label="Méthode de paiement">{extC.paymentMethod || extC.method || 'Non précisé'}</InfoField>
            <InfoField label="Date de dépôt">{formatDate(extC.depositedAt || extC.createdAt)}</InfoField>
            <InfoField label="Identifiant Transaction" fullWidth>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem' }}>{extC.id}</span>
            </InfoField>
            <InfoField label="Note du membre" fullWidth>
              {extC.note || extC.memberComment || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Aucune note laissée par le membre.</span>}
            </InfoField>
            {(extC.adminComment || extC.rejectionReason) && (
              <InfoField label="Note Administrative" fullWidth>
                <span style={{ color: extC.status === 'REJECTED' ? '#DC2626' : '#059669' }}>
                  {extC.adminComment || extC.rejectionReason}
                </span>
              </InfoField>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <button onClick={() => setModal({ type: 'delete', contribution: modal.contribution })} className="ach-btn ach-btn-red" style={{ height: 40, padding: '0 1rem' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Supprimer
            </button>
            <button onClick={() => setModal({ type: 'edit', contribution: modal.contribution })} className="ach-btn ach-btn-blue" style={{ height: 40, padding: '0 1.2rem' }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Modifier
            </button>
          </div>
        </div>
      </>
    );
  }

  const configs = {
    validate: {
      title: 'Valider la cotisation',
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
      iconBg: '#ECFDF5',
      label: 'Note interne',
      placeholder: 'Note de validation (optionnel)…',
      cta: 'Confirmer la validation',
      ctaGrad: 'linear-gradient(135deg,#059669,#10B981)',
      ctaShadow: 'rgba(5,150,105,0.3)',
      ib: 'rgba(5,150,105,0.25)',
      ibg: 'rgba(236,253,245,0.5)',
    },
    reject: {
      title: 'Rejeter la cotisation',
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
      iconBg: '#FEF2F2',
      label: 'Motif du rejet',
      placeholder: 'Motif du rejet (obligatoire)…',
      cta: 'Confirmer le rejet',
      ctaGrad: 'linear-gradient(135deg,#B91C1C,#DC2626)',
      ctaShadow: 'rgba(220,38,38,0.3)',
      ib: 'rgba(220,38,38,0.25)',
      ibg: 'rgba(254,242,242,0.5)',
    },
    edit: {
      title: 'Modifier le montant',
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
      iconBg: '#EFF6FF',
      label: `Nouveau montant (${(modal.contribution as ExtendedContribution)?.currency || 'EURO'})`,
      placeholder: '',
      cta: 'Enregistrer',
      ctaGrad: 'linear-gradient(135deg,#1D4ED8,#2563EB)',
      ctaShadow: 'rgba(37,99,235,0.3)',
      ib: 'rgba(37,99,235,0.25)',
      ibg: 'rgba(239,246,255,0.5)',
    },
    delete: {
      title: 'Supprimer la cotisation',
      icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
      iconBg: '#FEF2F2',
      label: 'Confirmation de sécurité',
      placeholder: 'Tapez SUPPRIMER pour confirmer',
      cta: 'Supprimer définitivement',
      ctaGrad: 'linear-gradient(135deg,#991B1B,#DC2626)',
      ctaShadow: 'rgba(220,38,38,0.3)',
      ib: 'rgba(220,38,38,0.25)',
      ibg: 'rgba(254,242,242,0.5)',
    },
  } as const;

  type ConfigType = 'validate' | 'reject' | 'edit' | 'delete';
  const cfg = configs[modal.type as ConfigType];
  const canConfirm = modal.type === 'reject' ? value.trim().length > 0 : modal.type === 'delete' ? value === 'SUPPRIMER' : true;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', zIndex: 100 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 101, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(18px)', borderRadius: 20, padding: 'clamp(1.5rem,4vw,2rem)', width: 'min(460px,calc(100vw - 2rem))', border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 24px 60px rgba(37,99,235,0.14)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {cfg.icon}
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 600, color: '#111827' }}>
            {cfg.title}
          </h2>
        </div>

        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '0.65rem 0.9rem', marginBottom: '1.1rem', border: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280' }}>Membre :</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', marginLeft: '0.4rem' }}>
            {memberName(modal.contribution)}
          </span>
          <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280' }}>Montant :</span>
          <span style={{ marginLeft: '0.4rem' }}>
            <AmountPill amount={modal.contribution.amount} currency={(modal.contribution as ExtendedContribution).currency} />
          </span>
        </div>

        <label style={{ fontSize: '0.73rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {cfg.label}
        </label>

        {modal.type === 'edit' ? (
          <div style={{ position: 'relative' }}>
            <input
              type="number" min="1" value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{ width: '100%', height: 44, borderRadius: 11, padding: '0 3.5rem 0 1rem', border: `1px solid ${cfg.ib}`, background: cfg.ibg, fontFamily: "'DM Mono',monospace", fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', outline: 'none' }}
            />
            <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6B7280', fontSize: '0.8rem', fontWeight: 700 }}>
              {(modal.contribution as ExtendedContribution).currency || 'EURO'}
            </span>
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={cfg.placeholder}
            rows={3}
            style={{ width: '100%', borderRadius: 11, padding: '0.7rem 1rem', border: `1px solid ${cfg.ib}`, background: cfg.ibg, fontFamily: "'DM Sans',sans-serif", fontSize: '0.84rem', color: '#111827', outline: 'none', resize: 'vertical' }}
          />
        )}

        {modal.type === 'reject' && !value.trim() && (
          <p style={{ fontSize: '0.69rem', color: '#DC2626', fontWeight: 600, marginTop: '0.3rem' }}>
            Le motif est obligatoire pour rejeter.
          </p>
        )}
        {modal.type === 'delete' && value !== 'SUPPRIMER' && (
          <p style={{ fontSize: '0.69rem', color: '#DC2626', fontWeight: 600, marginTop: '0.3rem' }}>
            Veuillez taper &ldquo;SUPPRIMER&rdquo; pour confirmer.
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{ height: 42, padding: '0 1.1rem', borderRadius: 10, border: '1px solid rgba(37,99,235,0.15)', background: 'rgba(249,250,251,0.9)', fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            Annuler
          </button>
          <button onClick={() => onConfirm(value)} disabled={busy || !canConfirm} style={{ height: 42, padding: '0 1.25rem', borderRadius: 10, border: 'none', background: cfg.ctaGrad, fontFamily: "'DM Sans',sans-serif", fontSize: '0.8rem', fontWeight: 700, color: 'white', cursor: 'pointer', boxShadow: `0 4px 12px ${cfg.ctaShadow}`, opacity: busy || !canConfirm ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {busy && <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'achspin 0.7s linear infinite' }} />}
            {cfg.cta}
          </button>
        </div>
      </div>
    </>
  );
}

export default function AdminContributionsHistoryPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: null, contribution: null });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listAntennaContributions({
        page: 1, pageSize: 100,
        status: status || undefined,
        q: q || undefined,
      });
      setItems(res?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => { void load(); }, [load]);

  async function handleConfirm(value: string) {
    if (!modal.contribution) return;
    const id = modal.contribution.id;
    setBusyId(id);
    try {
      if (modal.type === 'validate') {
        await api.validateContributionAntenna(id, { note: value || undefined });
      } else if (modal.type === 'reject') {
        await api.rejectContributionAntenna(id, { reason: value });
      } else if (modal.type === 'edit') {
        const amount = parseFloat(value.replace(',', '.'));
        if (!Number.isNaN(amount) && amount > 0) {
          await api.updateContributionAntenna(id, { amount });
        }
      } else if (modal.type === 'delete') {
        const apiClient = api as unknown as { deleteContributionAntenna: (id: string) => Promise<void> };
        if (apiClient.deleteContributionAntenna) await apiClient.deleteContributionAntenna(id);
      }
      setModal({ type: null, contribution: null });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const isPendingStatus = (s: string) => s === 'PENDING' || s === 'SUBMITTED' || s === 'PENDING_VALIDATION';
  const canReviewStatus = (s: string) => s === 'PENDING' || s === 'SUBMITTED' || s === 'PENDING_VALIDATION';

  const validated = items.filter((i) => i.status === 'VALIDATED').length;
  const pending   = items.filter((i) => isPendingStatus(i.status)).length;
  const rejected  = items.filter((i) => i.status === 'REJECTED').length;
  const total     = items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const mainCurrency = (items[0] as ExtendedContribution)?.currency || 'EURO';

  const BtnIcon = ({ d }: { d: string }) => (
    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );

  const Spinner = () => (
    <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'achspin 0.7s linear infinite' }} />
  );

  const methodLabel = (c: Contribution) => {
    const m = (c as ExtendedContribution).paymentMethod || (c as ExtendedContribution).method;
    const map: Record<string, string> = {
      CASH: 'Espèces', BANK_TRANSFER: 'Virement bancaire', MOBILE_MONEY: 'Mobile Money',
      CARD: 'Carte bancaire', OTHER: 'Autre',
    };
    return m ? (map[m] ?? m) : '—';
  };

  const ActionButtons = ({ c, flex }: { c: Contribution; flex?: boolean }) => (
    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: flex ? undefined : 'flex-end', flexWrap: 'wrap' }}>
      {canReviewStatus(c.status) && (
        <>
          <button className="ach-btn ach-btn-green" style={flex ? { flex: 1, justifyContent: 'center' } : undefined} disabled={busyId === c.id} onClick={(e) => { e.stopPropagation(); setModal({ type: 'validate', contribution: c }); }}>
            {busyId === c.id ? <Spinner /> : <BtnIcon d="M5 13l4 4L19 7" />} Valider
          </button>
          <button className="ach-btn ach-btn-red" style={flex ? { flex: 1, justifyContent: 'center' } : undefined} disabled={busyId === c.id} onClick={(e) => { e.stopPropagation(); setModal({ type: 'reject', contribution: c }); }}>
            <BtnIcon d="M6 18L18 6M6 6l12 12" /> Rejeter
          </button>
        </>
      )}
    </div>
  );

  return (
    <AppShell title="Cotisations">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap');
        .ach-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1100px;margin:0 auto}
        .ach-header{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:achin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .ach-eyebrow{font-size:.67rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ach-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:achpulse 2s ease-in-out infinite}
        @keyframes achpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ach-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.85rem);font-weight:600;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ach-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .ach-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:achin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:640px){.ach-stats{grid-template-columns:repeat(2,1fr)}}
        .ach-stat{background:rgba(253,253,255,.92);backdrop-filter:blur(10px);border-radius:14px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 10px rgba(37,99,235,.05);padding:.9rem 1rem;border-top:3px solid}
        .ach-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.55rem;font-weight:600;line-height:1;margin-bottom:.25rem}
        .ach-stat-lbl{font-size:.69rem;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:.06em}
        .ach-toolbar{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem;opacity:0;transform:translateY(10px);animation:achin .5s .12s cubic-bezier(.22,1,.36,1) forwards}
        .ach-sw{position:relative;flex:1;min-width:200px}
        .ach-si{position:absolute;left:.85rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .ach-search{width:100%;height:44px;border-radius:12px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.88);padding:0 1rem 0 2.5rem;font-family:'DM Sans',sans-serif;font-size:.84rem;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .ach-search:focus{border-color:rgba(37,99,235,.45);box-shadow:0 0 0 3px rgba(37,99,235,.09);background:white}
        .ach-search::placeholder{color:rgba(107,114,128,.45)}
        .ach-select{height:44px;border-radius:12px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.88);padding:0 2rem 0 .9rem;font-family:'DM Sans',sans-serif;font-size:.82rem;color:#374151;font-weight:600;outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24' stroke='%236B7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .75rem center;min-width:160px}
        .ach-fbtn{height:44px;padding:0 1.25rem;border-radius:12px;background:linear-gradient(135deg,#1D4ED8,#2563EB);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:700;display:flex;align-items:center;gap:.4rem;box-shadow:0 4px 14px rgba(37,99,235,.28);transition:all .18s;white-space:nowrap}
        .ach-fbtn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,.38)}
        .ach-panel{background:rgba(253,253,255,.93);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 14px rgba(37,99,235,.05),0 0 0 1px rgba(255,255,255,.85) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:achin .5s .16s cubic-bezier(.22,1,.36,1) forwards}
        .ach-tw{overflow-x:auto}
        .ach-table{width:100%;border-collapse:collapse;min-width:700px}
        .ach-table thead tr{border-bottom:1px solid rgba(37,99,235,.09)}
        .ach-table thead th{padding:.8rem 1.1rem;font-size:.66rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#374151;text-align:left;background:rgba(248,250,252,.7);white-space:nowrap}
        .ach-table tbody tr{border-bottom:1px solid rgba(37,99,235,.055);transition:background .15s;animation:achin .4s cubic-bezier(.22,1,.36,1) both;cursor:pointer}
        .ach-table tbody tr:last-child{border-bottom:none}
        .ach-table tbody tr:hover{background:rgba(37,99,235,.04)}
        .ach-table td{padding:.85rem 1.1rem;vertical-align:middle}
        .ach-name{font-size:.87rem;font-weight:800;color:#0F172A}
        .ach-ref{font-family:'DM Mono',monospace;font-size:.68rem;color:#6B7280;font-weight:500}
        .ach-date{font-size:.78rem;color:#374151;font-weight:600;white-space:nowrap}
        .ach-note{font-size:.75rem;color:#4B5563;font-weight:500;max-width:180px}
        .ach-method{display:inline-flex;align-items:center;font-size:.72rem;font-weight:600;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:7px;padding:.18rem .55rem;color:#374151;white-space:nowrap}
        .ach-btn{height:33px;padding:0 .8rem;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:.3rem;transition:all .15s;white-space:nowrap;border:none}
        .ach-btn-green{background:linear-gradient(135deg,#059669,#10B981);color:white;box-shadow:0 2px 6px rgba(5,150,105,.28)}
        .ach-btn-green:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(5,150,105,.38)}
        .ach-btn-red{border:1.5px solid rgba(220,38,38,.25) !important;background:rgba(254,242,242,.7);color:#DC2626}
        .ach-btn-red:hover:not(:disabled){background:#FEE2E2;border-color:rgba(220,38,38,.45) !important}
        .ach-btn-blue{border:1.5px solid rgba(37,99,235,.2) !important;background:rgba(239,246,255,.7);color:#1D4ED8}
        .ach-btn-blue:hover:not(:disabled){background:#DBEAFE;border-color:rgba(37,99,235,.4) !important}
        .ach-btn:disabled{opacity:.5;cursor:not-allowed}
        .ach-mob{display:none}
        @media(max-width:680px){.ach-tw{display:none}.ach-mob{display:flex;flex-direction:column}}
        .ach-mc{padding:1rem 1.1rem;border-bottom:1px solid rgba(37,99,235,.07);animation:achin .4s cubic-bezier(.22,1,.36,1) both;cursor:pointer}
        .ach-mc:last-child{border-bottom:none}
        .ach-mc-row{display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem;margin-bottom:.55rem}
        .ach-mc-meta{font-size:.71rem;color:#6B7280;font-weight:500;display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:.65rem;align-items:center}
        .ach-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.82rem;font-weight:600}
        .ach-ring{width:24px;height:24px;border:2.5px solid rgba(37,99,235,.1);border-top-color:#2563EB;border-radius:50%;animation:achspin .8s linear infinite}
        .ach-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3.5rem 1rem;gap:.75rem;color:#9CA3AF}
        .ach-empty-ico{width:52px;height:52px;border-radius:50%;background:#F3F4F6;border:1px solid #E5E7EB;display:flex;align-items:center;justify-content:center}
        .ach-empty p{font-size:.82rem;font-weight:700}
        .ach-err{display:flex;align-items:center;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.8rem;font-weight:700;margin-bottom:1rem}
        @keyframes achin{to{opacity:1;transform:translateY(0)}}
        @keyframes achspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ach-wrap">
        <div className="ach-header">
          <div>
            <div className="ach-eyebrow"><div className="ach-dot" />Archives antenne</div>
            <h1 className="ach-title">Historique des <span>cotisations</span></h1>
          </div>
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

        {error && (
          <div className="ach-err">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        <div className="ach-toolbar">
          <div className="ach-sw">
            <span className="ach-si">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            </span>
            <input className="ach-search" type="text" placeholder="Recherche membre / référence…" value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load()} />
          </div>

          <select className="ach-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tous statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="SUBMITTED">Soumise</option>
            <option value="PENDING_VALIDATION">En attente</option>
            <option value="VALIDATED">Validée</option>
            <option value="REJECTED">Rejetée</option>
            <option value="CANCELLED">Annulée</option>
          </select>

          <button className="ach-fbtn" onClick={() => void load()}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            Filtrer
          </button>
        </div>

        <div className="ach-panel">
          {loading ? (
            <div className="ach-loader"><div className="ach-ring" />Chargement&#8230;</div>
          ) : items.length === 0 ? (
            <div className="ach-empty">
              <div className="ach-empty-ico">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
              </div>
              <p>Aucune cotisation trouvée</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="ach-tw">
                <table className="ach-table">
                  <thead>
                    <tr>
                      <th>Membre</th><th>Montant</th><th>Méthode</th><th>Statut</th>
                      <th>Note</th><th>Date</th><th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c, i) => (
                      <tr key={c.id} style={{ animationDelay: `${i * 0.03}s` }}
                        onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setModal({ type: 'detail', contribution: c }); }}>
                        <td>
                          <div className="ach-name">{memberName(c)}</div>
                          <div className="ach-ref">{c.id.slice(0, 8)}</div>
                        </td>
                        <td><AmountPill amount={c.amount} currency={(c as ExtendedContribution).currency} /></td>
                        <td>
                          <span className="ach-method">{methodLabel(c)}</span>
                        </td>
                        <td><StatusBadge status={c.status} /></td>
                        <td>
                          <span className="ach-note">
                            {(c as ExtendedContribution).note ?? <span style={{ color: '#D1D5DB' }}>—</span>}
                          </span>
                        </td>
                        <td><span className="ach-date">{formatDate(c.createdAt)}</span></td>
                        <td><ActionButtons c={c} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="ach-mob">
                {items.map((c, i) => (
                  <div key={c.id} className="ach-mc" style={{ animationDelay: `${i * 0.03}s` }}
                    onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setModal({ type: 'detail', contribution: c }); }}>
                    <div className="ach-mc-row">
                      <div>
                        <div className="ach-name">{memberName(c)}</div>
                        <div className="ach-ref">{c.id.slice(0, 8)}</div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="ach-mc-meta">
                      <AmountPill amount={c.amount} currency={(c as ExtendedContribution).currency} />
                      <span className="ach-method">{methodLabel(c)}</span>
                      <span>{formatDate(c.createdAt)}</span>
                    </div>
                    {(c as ExtendedContribution).note && (
                      <p className="ach-note" style={{ marginBottom: '.6rem' }}>{(c as ExtendedContribution).note}</p>
                    )}
                    <ActionButtons c={c} flex />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        modal={modal} setModal={setModal}
        onClose={() => setModal({ type: null, contribution: null })}
        onConfirm={(v) => void handleConfirm(v)}
        busy={busyId !== null}
      />
    </AppShell>
  );
}