// web/app/(protected)/admin/transfers/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

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

export default function TransfersPage() {
  const [tab, setTab]              = useState<'received' | 'sent'>('received');
  const [items, setItems]          = useState<Transfer[]>([]);
  const [loading, setLoading]      = useState(true);
  const [pendingCount, setPending] = useState(0);
  const [validatedCount, setValidated] = useState(0);
  const [rejectId, setRejectId]    = useState<string | null>(null);
  const [rejectReason, setReason]  = useState('');
  const [refresh, setRefresh]      = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const res = tab === 'sent'
          ? await api.getTransfersSent()
          : await api.getTransfersReceived();
        if (!cancelled) setItems((res.items ?? []) as Transfer[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, [tab, refresh]);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      await Promise.resolve();
      if (cancelled) return;
      try {
        const [pending, validated] = await Promise.all([
          api.getTransfersReceived({ status: 'PENDING_VALIDATION' }),
          api.getTransfersReceived({ status: 'VALIDATED' }),
        ]);
        if (!cancelled) {
          setPending(pending.total ?? 0);
          setValidated(validated.total ?? 0);
        }
      } catch { /* silence */ }
    };
    void fetchStats();
    return () => { cancelled = true; };
  }, [refresh]);

  const triggerRefresh = () => setRefresh(v => v + 1);

  const handleValidate = async (id: string) => {
    await api.validateTransfer(id);
    triggerRefresh();
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    await api.rejectTransfer(rejectId, rejectReason.trim());
    setRejectId(null); setReason('');
    triggerRefresh();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Annuler ce virement ?')) return;
    await api.cancelTransfer(id);
    triggerRefresh();
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 860, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
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
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  <div key={t.id} style={{ background: '#FAFAFA', border: '1px solid #F1F5F9',
                                           borderRadius: 12, padding: '1rem' }}>
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
                          {tab === 'sent'
                            ? `Vers : ${t.receiverAntenna?.name ?? '—'}`
                            : `De : ${t.senderAntenna?.name ?? '—'}`}
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

                      {/* Droite */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '.2rem .65rem',
                                       borderRadius: 99, background: st.bg, color: st.color,
                                       border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                        {tab === 'received' && t.status === 'PENDING_VALIDATION' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleValidate(t.id)}
                              style={{ padding: '.3rem .75rem', borderRadius: 8, border: 'none',
                                       background: '#ECFDF5', color: '#065F46',
                                       fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Valider
                            </button>
                            <button
                              onClick={() => setRejectId(t.id)}
                              style={{ padding: '.3rem .75rem', borderRadius: 8, border: 'none',
                                       background: '#FEF2F2', color: '#991B1B',
                                       fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Refuser
                            </button>
                          </div>
                        )}
                        {tab === 'sent' && t.status === 'PENDING_VALIDATION' && (
                          <button
                            onClick={() => handleCancel(t.id)}
                            style={{ padding: '.3rem .75rem', borderRadius: 8, border: 'none',
                                     background: '#F1F5F9', color: '#64748B',
                                     fontSize: '.75rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Annuler
                          </button>
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

      {/* Modal refus */}
      {rejectId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem',
                        width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF2F2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                Motif du refus
              </h3>
            </div>
            <label style={{ fontSize: '.78rem', fontWeight: 700, color: '#374151',
                            display: 'block', marginBottom: 6, letterSpacing: '.03em' }}>
              EXPLICATION <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setReason(e.target.value)}
              placeholder="Expliquer la raison du refus…"
              rows={4}
              style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: 10,
                       padding: '.75rem', fontSize: '.875rem', resize: 'vertical',
                       boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                onClick={() => { setRejectId(null); setReason(''); }}
                style={{ padding: '.55rem 1.2rem', borderRadius: 10, border: '1px solid #E2E8F0',
                         background: '#fff', color: '#374151', fontSize: '.875rem',
                         cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                Annuler
              </button>
              <button
                disabled={!rejectReason.trim()}
                onClick={handleReject}
                style={{ padding: '.55rem 1.2rem', borderRadius: 10, border: 'none',
                         color: '#fff', fontSize: '.875rem', fontWeight: 700,
                         fontFamily: 'inherit', cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                         background: rejectReason.trim() ? '#DC2626' : '#FCA5A5',
                         transition: 'background .15s' }}
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}