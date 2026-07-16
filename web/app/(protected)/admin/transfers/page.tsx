// web/app/(protected)/admin/transfers/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, type MyTransferAntenna } from '@/lib/api-client';

type Transfer = {
  id: string;
  status: string;
  sendAmount: number;
  sendCurrency: string;
  receiveAmount: number;
  receiveCurrency: string;
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  validatedAt?: string | null;
  senderAntenna?: { name: string; city?: string | null } | null;
  receiverAntenna?: { name: string; city?: string | null } | null;
  initiatedBy?: string | null;
};

const STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING_VALIDATION: { label: 'En attente', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  VALIDATED:          { label: 'Validé',      color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7' },
  REJECTED:           { label: 'Refusé',      color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5' },
  CANCELLED:          { label: 'Annulé',      color: '#374151', bg: '#F9FAFB', border: '#D1D5DB' },
};

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: c,
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n);

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E2E8F0', borderRadius: 10,
  padding: '.7rem .9rem', fontSize: '.9rem', color: '#0F172A',
  boxSizing: 'border-box', fontFamily: 'inherit',
  background: '#fff', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '.72rem', fontWeight: 700, color: '#374151',
  display: 'block', marginBottom: 6, letterSpacing: '.03em',
};

// ─────────────────────────────────────────────────────────────────────────
// MODALE DE DÉTAILS / ACTIONS
// Reçus : Valider / Refuser · Envoyés : Modifier le montant / Supprimer
// ─────────────────────────────────────────────────────────────────────────
function TransferDetailModal({
  transfer,
  tab,
  hasMultipleAntennas,
  onClose,
  onValidate,
  onReject,
  onCancel,
  onUpdate,
}: {
  transfer: Transfer;
  tab: 'received' | 'sent';
  hasMultipleAntennas: boolean;
  onClose: () => void;
  onValidate: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onUpdate: (id: string, body: { sendAmount?: number; receiveAmount?: number }) => Promise<void>;
}) {
  const st = STATUS[transfer.status] ?? { label: transfer.status, color: '#374151', bg: '#F9FAFB', border: '#D1D5DB' };
  const isPending = transfer.status === 'PENDING_VALIDATION';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editSendAmount, setEditSendAmount] = useState(String(transfer.sendAmount));
  const [editReceiveAmount, setEditReceiveAmount] = useState(String(transfer.receiveAmount));

  const runAction = async (fn: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await fn();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
      setBusy(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 100, padding: '1rem' }}
         onClick={() => !busy && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440,
                    maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 25px 60px rgba(0,0,0,.2)' }}
           onClick={e => e.stopPropagation()}>

        {/* En-tête */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '.2rem .65rem',
                           borderRadius: 99, background: st.bg, color: st.color,
                           border: `1px solid ${st.border}` }}>
              {st.label}
            </span>
            <button onClick={onClose} disabled={busy}
                    style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6B7280',
                             width: 30, height: 30, borderRadius: '50%', display: 'flex',
                             alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
              {fmt(transfer.sendAmount, transfer.sendCurrency)}
            </span>
            <span style={{ color: '#CBD5E1' }}>→</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563EB' }}>
              {fmt(transfer.receiveAmount, transfer.receiveCurrency)}
            </span>
          </div>
          <p style={{ fontSize: '.8rem', color: '#64748B', margin: '6px 0 0' }}>
            {hasMultipleAntennas
              ? (tab === 'sent'
                  ? <>De <strong>{transfer.senderAntenna?.name ?? 'mon antenne'}</strong> vers : {transfer.receiverAntenna?.name ?? '—'}</>
                  : <>De : {transfer.senderAntenna?.name ?? '—'} vers <strong>{transfer.receiverAntenna?.name ?? 'mon antenne'}</strong></>)
              : (tab === 'sent'
                  ? `Vers : ${transfer.receiverAntenna?.name ?? '—'}`
                  : `De : ${transfer.senderAntenna?.name ?? '—'}`)}
            {transfer.initiatedBy ? ` · ${transfer.initiatedBy}` : ''}
          </p>
        </div>

        {/* Corps */}
        <div style={{ padding: '1.5rem' }}>
          {transfer.notes && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ ...labelStyle, marginBottom: 4 }}>NOTE</span>
              <p style={{ margin: 0, fontSize: '.85rem', color: '#374151', lineHeight: 1.5 }}>{transfer.notes}</p>
            </div>
          )}
          {transfer.rejectionReason && (
            <div style={{ marginBottom: 12, background: '#FEF2F2', border: '1px solid #FECACA',
                          borderRadius: 10, padding: '.75rem 1rem' }}>
              <span style={{ ...labelStyle, color: '#991B1B', marginBottom: 4 }}>MOTIF DU REFUS</span>
              <p style={{ margin: 0, fontSize: '.85rem', color: '#991B1B' }}>{transfer.rejectionReason}</p>
            </div>
          )}
          <p style={{ fontSize: '.75rem', color: '#94A3B8', margin: '0 0 1.25rem' }}>
            Créé le {new Date(transfer.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10,
                          padding: '.75rem 1rem', fontSize: '.85rem', color: '#DC2626', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* ── Reçus, en attente : Valider / Refuser ── */}
          {tab === 'received' && isPending && !isRejecting && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => runAction(() => onValidate(transfer.id))}
                disabled={busy}
                style={{ flex: 1, padding: '.8rem', borderRadius: 12, border: 'none',
                         background: '#059669', color: '#fff', fontSize: '.88rem', fontWeight: 700,
                         cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .7 : 1 }}
              >
                ✔ Valider
              </button>
              <button
                onClick={() => setIsRejecting(true)}
                disabled={busy}
                style={{ flex: 1, padding: '.8rem', borderRadius: 12, border: '1px solid #FECACA',
                         background: '#FEF2F2', color: '#991B1B', fontSize: '.88rem', fontWeight: 700,
                         cursor: busy ? 'not-allowed' : 'pointer' }}
              >
                ✖ Refuser
              </button>
            </div>
          )}

          {tab === 'received' && isPending && isRejecting && (
            <div>
              <label style={labelStyle}>MOTIF DU REFUS <span style={{ color: '#EF4444' }}>*</span></label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Expliquer la raison du refus…"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setIsRejecting(false); setRejectReason(''); }}
                  disabled={busy}
                  style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: '1px solid #E2E8F0',
                           background: '#fff', color: '#374151', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => rejectReason.trim() && runAction(() => onReject(transfer.id, rejectReason.trim()))}
                  disabled={busy || !rejectReason.trim()}
                  style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: 'none',
                           background: rejectReason.trim() ? '#DC2626' : '#FCA5A5', color: '#fff',
                           fontSize: '.85rem', fontWeight: 700,
                           cursor: rejectReason.trim() && !busy ? 'pointer' : 'not-allowed' }}
                >
                  Confirmer le refus
                </button>
              </div>
            </div>
          )}

          {/* ── Envoyés, en attente : Modifier le montant / Supprimer ── */}
          {tab === 'sent' && isPending && !isEditing && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setIsEditing(true)}
                disabled={busy}
                style={{ flex: 1, padding: '.8rem', borderRadius: 12, border: '1px solid #BFDBFE',
                         background: '#EFF6FF', color: '#1D4ED8', fontSize: '.88rem', fontWeight: 700,
                         cursor: busy ? 'not-allowed' : 'pointer' }}
              >
                ✎ Modifier le montant
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Supprimer ce virement ? Cette action est irréversible.')) {
                    void runAction(() => onCancel(transfer.id));
                  }
                }}
                disabled={busy}
                style={{ flex: 1, padding: '.8rem', borderRadius: 12, border: '1px solid #FECACA',
                         background: '#FEF2F2', color: '#991B1B', fontSize: '.88rem', fontWeight: 700,
                         cursor: busy ? 'not-allowed' : 'pointer' }}
              >
                🗑 Supprimer
              </button>
            </div>
          )}

          {tab === 'sent' && isPending && isEditing && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>MONTANT D&apos;ENVOI ({transfer.sendCurrency})</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={editSendAmount}
                    onChange={e => setEditSendAmount(e.target.value)}
                    style={{ ...inputStyle, fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>MONTANT REÇU ({transfer.receiveCurrency})</label>
                  <input
                    type="number" min="0.01" step="0.01"
                    value={editReceiveAmount}
                    onChange={e => setEditReceiveAmount(e.target.value)}
                    style={{ ...inputStyle, fontWeight: 700 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditSendAmount(String(transfer.sendAmount));
                    setEditReceiveAmount(String(transfer.receiveAmount));
                  }}
                  disabled={busy}
                  style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: '1px solid #E2E8F0',
                           background: '#fff', color: '#374151', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const s = Number(editSendAmount);
                    const r = Number(editReceiveAmount);
                    if (!(s > 0) || !(r > 0)) { setError('Les montants doivent être positifs.'); return; }
                    void runAction(() => onUpdate(transfer.id, { sendAmount: s, receiveAmount: r }));
                  }}
                  disabled={busy}
                  style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: 'none',
                           background: '#2563EB', color: '#fff', fontSize: '.85rem', fontWeight: 700,
                           cursor: busy ? 'not-allowed' : 'pointer' }}
                >
                  {busy ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {!isPending && (
            <p style={{ fontSize: '.8rem', color: '#94A3B8', margin: 0, textAlign: 'center' }}>
              Ce virement a déjà été traité — aucune action possible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TransfersPage() {
  const [tab, setTab]              = useState<'received' | 'sent'>('received');
  const [items, setItems]          = useState<Transfer[]>([]);
  const [loading, setLoading]      = useState(true);
  const [pendingCount, setPending] = useState(0);
  const [validatedCount, setValidated] = useState(0);
  const [refresh, setRefresh]      = useState(0);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);

  // Antennes gérées — active le filtre uniquement si l'admin en a plusieurs
  const [myAntennas, setMyAntennas]       = useState<MyTransferAntenna[]>([]);
  const [antennaFilter, setAntennaFilter] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const antennas = await api.getMyTransferAntennas();
        setMyAntennas(antennas);
      } catch { /* silence */ }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const res = tab === 'sent'
          ? await api.getTransfersSent({ antennaId: antennaFilter || undefined })
          : await api.getTransfersReceived({ antennaId: antennaFilter || undefined });
        if (!cancelled) setItems((res.items ?? []) as Transfer[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, [tab, refresh, antennaFilter]);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const [pending, validated] = await Promise.all([
          api.getTransfersReceived({ status: 'PENDING_VALIDATION', antennaId: antennaFilter || undefined }),
          api.getTransfersReceived({ status: 'VALIDATED', antennaId: antennaFilter || undefined }),
        ]);
        if (!cancelled) {
          setPending(pending.total ?? 0);
          setValidated(validated.total ?? 0);
        }
      } catch { /* silence */ }
    };
    void fetchStats();
    return () => { cancelled = true; };
  }, [refresh, antennaFilter]);

  const triggerRefresh = () => setRefresh(v => v + 1);
  const hasMultipleAntennas = myAntennas.length > 1;

  const handleValidate = async (id: string) => {
    await api.validateTransfer(id);
    setSelectedTransfer(null);
    triggerRefresh();
  };

  const handleReject = async (id: string, reason: string) => {
    await api.rejectTransfer(id, reason);
    setSelectedTransfer(null);
    triggerRefresh();
  };

  const handleCancel = async (id: string) => {
    await api.cancelTransfer(id);
    setSelectedTransfer(null);
    triggerRefresh();
  };

  const handleUpdate = async (id: string, body: { sendAmount?: number; receiveAmount?: number }) => {
    await api.updateTransfer(id, body);
    setSelectedTransfer(null);
    triggerRefresh();
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 860, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                      color: '#2563EB', marginBottom: 4 }}>ADMIN ANTENNE</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
            Virements <span style={{ color: '#2563EB' }}>Inter-antennes</span>
          </h1>
        </div>
        <Link
          href="/admin/transfers/new"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                   background: '#2563EB', color: '#fff', padding: '.6rem 1.2rem',
                   borderRadius: 12, fontSize: '.875rem', fontWeight: 600,
                   textDecoration: 'none', whiteSpace: 'nowrap',
                   boxShadow: '0 4px 14px rgba(37,99,235,.3)' }}
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Nouveau virement
        </Link>
      </div>

      {/* ── Filtre antenne (uniquement si plusieurs antennes gérées) ── */}
      {hasMultipleAntennas && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '.72rem', fontWeight: 700, color: '#374151',
                          display: 'block', marginBottom: 6, letterSpacing: '.03em' }}>
            ANTENNE
          </label>
          <select
            value={antennaFilter}
            onChange={e => setAntennaFilter(e.target.value)}
            style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 10,
                     padding: '.6rem .85rem', fontSize: '.875rem', fontWeight: 600, color: '#0F172A',
                     background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <option value="">Toutes mes antennes ({myAntennas.length})</option>
            {myAntennas.map(a => (
              <option key={a.id} value={a.id}>{a.name}{a.city ? ` — ${a.city}` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {[
          { label: 'En attente',  value: pendingCount,   accent: '#F59E0B' },
          { label: 'Validés',     value: validatedCount, accent: '#10B981' },
          { label: 'Reçus total', value: pendingCount + validatedCount, accent: '#2563EB' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '1rem',
                                      boxShadow: '0 1px 6px rgba(0,0,0,.06)',
                                      borderBottom: `3px solid ${s.accent}` }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: '.72rem', fontWeight: 600, color: '#64748B',
                        textTransform: 'uppercase', letterSpacing: '.06em', margin: '4px 0 0' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Card liste ── */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>

        {/* Header section */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EFF6FF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </div>
            <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#1E293B', letterSpacing: '.05em', textTransform: 'uppercase' }}>
              HISTORIQUE
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#F8FAFC', borderRadius: 10, padding: 3, gap: 2 }}>
            {([
              ['received', `Reçus${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
              ['sent', 'Envoyés'],
            ] as [string, string][]).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k as 'received' | 'sent')}
                style={{
                  padding: '.35rem .85rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: '.8rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s',
                  background: tab === k ? '#2563EB' : 'transparent',
                  color: tab === k ? '#fff' : '#64748B',
                  boxShadow: tab === k ? '0 2px 8px rgba(37,99,235,.3)' : 'none',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        <div style={{ padding: '1rem' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8', fontSize: '.875rem' }}>
              Chargement…
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
                </svg>
              </div>
              <p style={{ color: '#94A3B8', fontSize: '.875rem', margin: 0 }}>
                Aucun virement {tab === 'sent' ? 'envoyé' : 'reçu'} pour le moment
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(t => {
                const st = STATUS[t.status] ?? { label: t.status, color: '#374151', bg: '#F9FAFB', border: '#D1D5DB' };
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTransfer(t)}
                    style={{ background: '#FAFAFA', border: '1px solid #F1F5F9',
                             borderRadius: 12, padding: '1rem', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Montants */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                            {fmt(t.sendAmount, t.sendCurrency)}
                          </span>
                          <span style={{ color: '#CBD5E1', fontSize: '.8rem' }}>→</span>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#2563EB' }}>
                            {fmt(t.receiveAmount, t.receiveCurrency)}
                          </span>
                        </div>
                        {/* Meta */}
                        <p style={{ fontSize: '.78rem', color: '#64748B', margin: '0 0 2px' }}>
                          {hasMultipleAntennas
                            ? (tab === 'sent'
                                ? <>De <strong>{t.senderAntenna?.name ?? 'mon antenne'}</strong> vers : {t.receiverAntenna?.name ?? '—'}</>
                                : <>De : {t.senderAntenna?.name ?? '—'} vers <strong>{t.receiverAntenna?.name ?? 'mon antenne'}</strong></>)
                            : (tab === 'sent'
                                ? `Vers : ${t.receiverAntenna?.name ?? '—'}`
                                : `De : ${t.senderAntenna?.name ?? '—'}`)}
                          {t.initiatedBy ? ` · ${t.initiatedBy}` : ''}
                        </p>
                        {t.notes && (
                          <p style={{ fontSize: '.75rem', color: '#94A3B8', margin: '2px 0 0' }}>
                            Note : {t.notes}
                          </p>
                        )}
                        {t.rejectionReason && (
                          <p style={{ fontSize: '.75rem', color: '#EF4444', margin: '2px 0 0' }}>
                            Motif : {t.rejectionReason}
                          </p>
                        )}
                        <p style={{ fontSize: '.7rem', color: '#CBD5E1', margin: '4px 0 0' }}>
                          {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>

                      {/* Droite : statut, les actions sont désormais dans la modale */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '.2rem .65rem',
                                       borderRadius: 99, background: st.bg, color: st.color,
                                       border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                        {t.status === 'PENDING_VALIDATION' && (
                          <span style={{ fontSize: '.68rem', color: '#94A3B8', fontWeight: 600 }}>
                            Voir les actions →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedTransfer && (
        <TransferDetailModal
          transfer={selectedTransfer}
          tab={tab}
          hasMultipleAntennas={hasMultipleAntennas}
          onClose={() => setSelectedTransfer(null)}
          onValidate={handleValidate}
          onReject={handleReject}
          onCancel={handleCancel}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}