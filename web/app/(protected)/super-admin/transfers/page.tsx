// web/app/(protected)/super-admin/transfers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type SuperAdminTransferItem } from '@/lib/api-client';

const STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING_VALIDATION: { label: 'En attente', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  VALIDATED:          { label: 'Validé',      color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7' },
  REJECTED:           { label: 'Refusé',      color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5' },
  CANCELLED:          { label: 'Annulé',      color: '#374151', bg: '#F9FAFB', border: '#D1D5DB' },
};

const TABS: { key: string; label: string }[] = [
  { key: '',                   label: 'Tous' },
  { key: 'PENDING_VALIDATION', label: 'En attente' },
  { key: 'VALIDATED',          label: 'Validés' },
  { key: 'REJECTED',           label: 'Refusés' },
  { key: 'CANCELLED',          label: 'Annulés' },
];

const fmt = (n: number, c: string) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: c,
    minimumFractionDigits: 0, maximumFractionDigits: 2,
  }).format(n);

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const PAGE_SIZE = 20;

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E2E8F0', borderRadius: 10,
  padding: '.65rem .85rem', fontSize: '.875rem', color: '#0F172A',
  boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff', outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontSize: '.72rem', fontWeight: 700, color: '#374151',
  display: 'block', marginBottom: 5, marginTop: 12, letterSpacing: '.03em',
};

export default function SuperAdminTransfersPage() {
  const router = useRouter();

  const [status, setStatus]         = useState('');
  const [page, setPage]             = useState(1);
  const [items, setItems]           = useState<SuperAdminTransferItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats]           = useState({ pending: 0, validated: 0, rejected: 0, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [refresh, setRefresh]       = useState(0);

  const [editingTransfer, setEditingTransfer]     = useState<SuperAdminTransferItem | null>(null);
  const [editSendAmount, setEditSendAmount]       = useState('');
  const [editReceiveAmount, setEditReceiveAmount] = useState('');
  const [editNotes, setEditNotes]                 = useState('');
  const [editSubmitting, setEditSubmitting]       = useState(false);
  const [editError, setEditError]                 = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.getAllTransfersSuperAdmin({
          page, pageSize: PAGE_SIZE, status: status || undefined,
        });
        if (cancelled) return;
        setItems(res.items ?? []);
        setTotalPages(res.totalPages ?? 1);
        setStats(res.stats ?? { pending: 0, validated: 0, rejected: 0, total: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [status, page, refresh]);

  const changeStatus = (k: string) => { setStatus(k); setPage(1); };
  const triggerRefresh = () => setRefresh(v => v + 1);

  const openEdit = (t: SuperAdminTransferItem) => {
    setEditingTransfer(t);
    setEditSendAmount(String(t.sendAmount));
    setEditReceiveAmount(String(t.receiveAmount));
    setEditNotes(t.notes ?? '');
    setEditError('');
  };

  const closeEdit = () => {
    setEditingTransfer(null);
    setEditSendAmount('');
    setEditReceiveAmount('');
    setEditNotes('');
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingTransfer) return;
    if (!editSendAmount || !editReceiveAmount || +editSendAmount <= 0 || +editReceiveAmount <= 0) {
      setEditError('Les 2 montants doivent être des nombres positifs.');
      return;
    }
    setEditSubmitting(true);
    setEditError('');
    try {
      await api.updateTransferSuperAdmin(editingTransfer.id, {
        sendAmount: +editSendAmount,
        receiveAmount: +editReceiveAmount,
        notes: editNotes.trim() || undefined,
      });
      closeEdit();
      triggerRefresh();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (t: SuperAdminTransferItem) => {
    const amountsLabel = `${fmt(t.sendAmount, t.sendCurrency)} → ${fmt(t.receiveAmount, t.receiveCurrency)}`;
    const message = t.status === 'VALIDATED'
      ? `Ce virement est VALIDÉ. Le supprimer annulera aussi son effet sur le solde des 2 antennes (${amountsLabel}). Cette action est irréversible. Continuer ?`
      : `Supprimer ce virement (${amountsLabel}) ? Cette action est irréversible.`;
    if (!confirm(message)) return;
    await api.deleteTransferSuperAdmin(t.id);
    if (items.length === 1 && page > 1) setPage(p => p - 1);
    else triggerRefresh();
  };

  const editBtnEnabled = !editSubmitting && !!editSendAmount && !!editReceiveAmount && +editSendAmount > 0 && +editReceiveAmount > 0;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>

      {/* ── Retour ── */}
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B',
                 fontSize: '.875rem', padding: 0, marginBottom: 16, fontFamily: 'inherit',
                 display: 'flex', alignItems: 'center', gap: 4 }}
      >
        ← Retour
      </button>

      {/* ── En-tête ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
                    color: '#DC2626', marginBottom: 4 }}>SUPER ADMIN · VUE GLOBALE</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', margin: 0, lineHeight: 1.2 }}>
          Virements <span style={{ color: '#DC2626' }}>Inter-antennes</span>
        </h1>
        <p style={{ fontSize: '.82rem', color: '#64748B', margin: '4px 0 0' }}>
          Toutes les antennes — modification et suppression possibles à tout moment
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {[
          { label: 'En attente', value: stats.pending,   accent: '#F59E0B' },
          { label: 'Validés',    value: stats.validated, accent: '#10B981' },
          { label: 'Refusés',    value: stats.rejected,  accent: '#EF4444' },
          { label: 'Total',      value: stats.total,     accent: '#DC2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '1rem',
                                      boxShadow: '0 1px 6px rgba(0,0,0,.06)',
                                      borderBottom: `3px solid ${s.accent}` }}>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: '.68rem', fontWeight: 600, color: '#64748B',
                        textTransform: 'uppercase', letterSpacing: '.06em', margin: '4px 0 0' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Card liste ── */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>

        {/* Header + Tabs */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#FEF2F2',
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
              </svg>
            </div>
            <span style={{ fontSize: '.85rem', fontWeight: 700, color: '#1E293B', letterSpacing: '.05em', textTransform: 'uppercase' }}>
              HISTORIQUE COMPLET
            </span>
          </div>

          <div style={{ display: 'flex', background: '#F8FAFC', borderRadius: 10, padding: 3, gap: 2, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button
                key={t.key || 'all'}
                onClick={() => changeStatus(t.key)}
                style={{
                  padding: '.35rem .75rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: '.78rem', fontWeight: 700, fontFamily: 'inherit', transition: 'all .15s',
                  background: status === t.key ? '#DC2626' : 'transparent',
                  color: status === t.key ? '#fff' : '#64748B',
                  boxShadow: status === t.key ? '0 2px 8px rgba(220,38,38,.3)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
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
                Aucun virement {status ? 'avec ce statut ' : ''}pour le moment
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
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#DC2626' }}>
                            {fmt(t.receiveAmount, t.receiveCurrency)}
                          </span>
                        </div>

                        {/* Antennes (vue globale : les deux côtés) */}
                        <p style={{ fontSize: '.78rem', color: '#334155', margin: '0 0 2px', fontWeight: 600 }}>
                          {t.senderAntenna?.name ?? '—'} <span style={{ color: '#CBD5E1', fontWeight: 400 }}>→</span> {t.receiverAntenna?.name ?? '—'}
                        </p>

                        {/* Initiateur + date */}
                        <p style={{ fontSize: '.75rem', color: '#94A3B8', margin: '0 0 2px' }}>
                          {t.initiatedBy ? `Initié par ${t.initiatedBy}` : 'Initiateur inconnu'} · {fmtDateTime(t.createdAt)}
                        </p>

                        {t.notes && (
                          <p style={{ fontSize: '.75rem', color: '#94A3B8', margin: '2px 0 0' }}>
                            Note : {t.notes}
                          </p>
                        )}

                        {t.status === 'VALIDATED' && t.validatedBy && (
                          <p style={{ fontSize: '.72rem', color: '#059669', margin: '2px 0 0' }}>
                            Validé par {t.validatedBy}{t.validatedAt ? ` · ${fmtDateTime(t.validatedAt)}` : ''}
                          </p>
                        )}

                        {t.status === 'REJECTED' && (
                          <>
                            {t.rejectionReason && (
                              <p style={{ fontSize: '.75rem', color: '#EF4444', margin: '2px 0 0' }}>
                                Motif : {t.rejectionReason}
                              </p>
                            )}
                            {t.rejectedBy && (
                              <p style={{ fontSize: '.72rem', color: '#94A3B8', margin: '2px 0 0' }}>
                                Refusé par {t.rejectedBy}{t.rejectedAt ? ` · ${fmtDateTime(t.rejectedAt)}` : ''}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* Badge statut + actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '.2rem .65rem',
                                       borderRadius: 99, background: st.bg, color: st.color,
                                       border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => openEdit(t)}
                            style={{ padding: '.3rem .65rem', borderRadius: 8, border: 'none',
                                     background: '#F1F5F9', color: '#334155',
                                     fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            style={{ padding: '.3rem .65rem', borderRadius: 8, border: 'none',
                                     background: '#FEF2F2', color: '#991B1B',
                                     fontSize: '.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && items.length > 0 && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: '1.25rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid #E2E8F0',
                         background: '#fff', color: page <= 1 ? '#CBD5E1' : '#374151',
                         fontSize: '.8rem', fontWeight: 600, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                         fontFamily: 'inherit' }}
              >
                ← Précédent
              </button>
              <span style={{ fontSize: '.78rem', color: '#64748B', fontWeight: 600 }}>
                Page {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: '.45rem 1rem', borderRadius: 8, border: '1px solid #E2E8F0',
                         background: '#fff', color: page >= totalPages ? '#CBD5E1' : '#374151',
                         fontSize: '.8rem', fontWeight: 600, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                         fontFamily: 'inherit' }}
              >
                Suivant →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Modifier */}
      {editingTransfer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 100, padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem',
                        width: '100%', maxWidth: 420, boxShadow: '0 25px 60px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF2F2',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                  Modifier le virement
                </h3>
                {editingTransfer.status === 'VALIDATED' && (
                  <p style={{ margin: '2px 0 0', fontSize: '.72rem', color: '#B45309', fontWeight: 600 }}>
                    ⚠️ Déjà validé — le solde des 2 antennes sera réajusté automatiquement
                  </p>
                )}
              </div>
            </div>

            <p style={{ fontSize: '.78rem', color: '#64748B', margin: '0 0 4px' }}>
              {editingTransfer.senderAntenna?.name ?? '—'} → {editingTransfer.receiverAntenna?.name ?? '—'}
            </p>

            <label style={labelStyle}>
              MONTANT ENVOYÉ ({editingTransfer.sendCurrency}) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="number" min="0.01" step="0.01"
              value={editSendAmount}
              onChange={e => setEditSendAmount(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>
              MONTANT REÇU ({editingTransfer.receiveCurrency}) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="number" min="0.01" step="0.01"
              value={editReceiveAmount}
              onChange={e => setEditReceiveAmount(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>NOTE</label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />

            {editError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10,
                            padding: '.6rem .85rem', fontSize: '.8rem', color: '#DC2626', marginTop: 10 }}>
                {editError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                onClick={closeEdit}
                style={{ padding: '.55rem 1.2rem', borderRadius: 10, border: '1px solid #E2E8F0',
                         background: '#fff', color: '#374151', fontSize: '.875rem',
                         cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                Annuler
              </button>
              <button
                disabled={!editBtnEnabled}
                onClick={handleSaveEdit}
                style={{ padding: '.55rem 1.2rem', borderRadius: 10, border: 'none',
                         color: '#fff', fontSize: '.875rem', fontWeight: 700,
                         fontFamily: 'inherit', cursor: editBtnEnabled ? 'pointer' : 'not-allowed',
                         background: editBtnEnabled ? '#DC2626' : '#FCA5A5',
                         transition: 'background .15s' }}
              >
                {editSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}