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

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '',                    label: 'Tous les statuts' },
  { value: 'PENDING_VALIDATION',  label: 'En attente' },
  { value: 'VALIDATED',           label: 'Validés' },
  { value: 'REJECTED',            label: 'Refusés' },
  { value: 'CANCELLED',           label: 'Annulés' },
];

const DELETE_KEYWORD = 'SUPPRIMER';

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

const detailRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
  padding: '.7rem 0', borderBottom: '1px solid #F3F4F6',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '.68rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase',
  color: '#9CA3AF', flexShrink: 0, paddingTop: 2,
};

const detailValueStyle: React.CSSProperties = {
  fontSize: '.85rem', fontWeight: 600, color: '#1F2937', textAlign: 'right',
};

type DetailRow = { label: string; content: React.ReactNode };

function ChevronRight() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function SuperAdminTransfersPage() {
  const router = useRouter();

  const [status, setStatus]         = useState('');
  const [page, setPage]             = useState(1);
  const [items, setItems]           = useState<SuperAdminTransferItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats]           = useState({ pending: 0, validated: 0, rejected: 0, total: 0 });
  const [loading, setLoading]       = useState(true);
  const [refresh, setRefresh]       = useState(0);

  // ── Modal détail (lecture) ──────────────────────────────────────────────
  const [viewingTransfer, setViewingTransfer] = useState<SuperAdminTransferItem | null>(null);

  // ── Modal modification ──────────────────────────────────────────────────
  const [editingTransfer, setEditingTransfer]     = useState<SuperAdminTransferItem | null>(null);
  const [editSendAmount, setEditSendAmount]       = useState('');
  const [editReceiveAmount, setEditReceiveAmount] = useState('');
  const [editNotes, setEditNotes]                 = useState('');
  const [editSubmitting, setEditSubmitting]       = useState(false);
  const [editError, setEditError]                 = useState('');

  // ── Modal suppression (confirmation par saisie) ─────────────────────────
  const [deletingTransfer, setDeletingTransfer]   = useState<SuperAdminTransferItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteSubmitting, setDeleteSubmitting]   = useState(false);
  const [deleteError, setDeleteError]             = useState('');

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

  // ── Détail ───────────────────────────────────────────────────────────────
  const openView = (t: SuperAdminTransferItem) => setViewingTransfer(t);
  const closeView = () => setViewingTransfer(null);

  // ── Édition ──────────────────────────────────────────────────────────────
  const openEdit = (t: SuperAdminTransferItem) => {
    setEditingTransfer(t);
    setEditSendAmount(String(t.sendAmount));
    setEditReceiveAmount(String(t.receiveAmount));
    setEditNotes(t.notes ?? '');
    setEditError('');
  };
  const startEditFromView = (t: SuperAdminTransferItem) => { setViewingTransfer(null); openEdit(t); };

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

  // ── Suppression ──────────────────────────────────────────────────────────
  const openDeleteConfirm = (t: SuperAdminTransferItem) => {
    setViewingTransfer(null);
    setDeletingTransfer(t);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const closeDeleteConfirm = () => {
    setDeletingTransfer(null);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const deleteConfirmMatches = deleteConfirmText.trim().toUpperCase() === DELETE_KEYWORD;

  const handleConfirmDelete = async () => {
    if (!deletingTransfer || !deleteConfirmMatches) return;
    setDeleteSubmitting(true);
    setDeleteError('');
    try {
      await api.deleteTransferSuperAdmin(deletingTransfer.id);
      const wasLastOnPage = items.length === 1 && page > 1;
      closeDeleteConfirm();
      if (wasLastOnPage) setPage(p => p - 1);
      else triggerRefresh();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const editBtnEnabled = !editSubmitting && !!editSendAmount && !!editReceiveAmount && +editSendAmount > 0 && +editReceiveAmount > 0;

  const buildDetailRows = (t: SuperAdminTransferItem): DetailRow[] => {
    const st = STATUS[t.status] ?? { label: t.status, color: '#374151', bg: '#F9FAFB', border: '#D1D5DB' };
    const rows: (DetailRow | false | null | undefined)[] = [
      {
        label: 'Antenne expéditrice',
        content: `${t.senderAntenna?.name ?? '—'}${t.senderAntenna?.city ? ` — ${t.senderAntenna.city}` : ''}`,
      },
      {
        label: 'Antenne destinataire',
        content: `${t.receiverAntenna?.name ?? '—'}${t.receiverAntenna?.city ? ` — ${t.receiverAntenna.city}` : ''}`,
      },
      {
        label: 'Statut',
        content: (
          <span style={{ fontSize: '.7rem', fontWeight: 700, padding: '.2rem .6rem',
                         borderRadius: 99, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
            {st.label}
          </span>
        ),
      },
      {
        label: 'Initié par',
        content: `${t.initiatedBy ?? 'Inconnu'} · ${fmtDateTime(t.createdAt)}`,
      },
      t.notes ? { label: 'Note', content: t.notes } : null,
      t.status === 'VALIDATED' && t.validatedBy
        ? { label: 'Validé par', content: `${t.validatedBy}${t.validatedAt ? ` · ${fmtDateTime(t.validatedAt)}` : ''}` }
        : null,
      t.status === 'REJECTED' && t.rejectionReason
        ? { label: 'Motif du refus', content: t.rejectionReason }
        : null,
      t.status === 'REJECTED' && t.rejectedBy
        ? { label: 'Refusé par', content: `${t.rejectedBy}${t.rejectedAt ? ` · ${fmtDateTime(t.rejectedAt)}` : ''}` }
        : null,
    ];
    return rows.filter((r): r is DetailRow => Boolean(r));
  };

  return (
    <div className="sat-wrap">
      <style>{`
        .sat-wrap { padding: 1.5rem; max-width: 960px; margin: 0 auto; font-family: 'DM Sans', sans-serif; }
        @media (max-width: 560px) { .sat-wrap { padding: 1rem; } }

        .sat-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 1.5rem; }
        .sat-stat-card { background: #fff; border-radius: 14px; padding: 1rem; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
        .sat-stat-value { font-size: 1.4rem; font-weight: 800; color: #0F172A; margin: 0; }
        .sat-stat-label { font-size: .68rem; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: .06em; margin: 4px 0 0; }

        .sat-list-head {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
          padding: 1rem 1.25rem; border-bottom: 1px solid #F1F5F9;
        }
        .sat-list-head-left { display: flex; align-items: center; gap: 10px; }

        .sat-select-wrap { position: relative; }
        .sat-select {
          appearance: none; -webkit-appearance: none; -moz-appearance: none;
          border: 1px solid #E2E8F0; border-radius: 10px;
          padding: .55rem 2.1rem .55rem .9rem;
          font-size: .8rem; font-weight: 700; color: #334155;
          background: #fff; cursor: pointer; font-family: inherit; min-width: 168px;
        }
        .sat-select:focus-visible { outline: 2px solid #DC2626; outline-offset: 1px; }
        .sat-select-chevron { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94A3B8; }

        .sat-row {
          display: flex; align-items: center; gap: 12px; width: 100%;
          text-align: left; font-family: inherit; color: inherit;
          background: #FAFAFA; border: 1px solid #F1F5F9; border-radius: 12px;
          padding: 14px 16px; cursor: pointer;
          transition: background .15s, border-color .15s;
        }
        .sat-row:hover { background: #F8FAFC; border-color: #E2E8F0; }
        .sat-row:focus-visible { outline: 2px solid #DC2626; outline-offset: 2px; }
        .sat-row-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .sat-row-amounts { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 1rem; font-weight: 800; color: #0F172A; }
        .sat-row-antennas { font-size: .78rem; font-weight: 600; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sat-row-meta { font-size: .72rem; color: #94A3B8; }
        .sat-row-side { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .sat-chevron { color: #CBD5E1; flex-shrink: 0; }

        .sat-modal-overlay {
          position: fixed; inset: 0; z-index: 200; background: rgba(15,23,42,.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; padding: 1rem;
        }
        .sat-modal {
          background: #fff; border-radius: 20px; width: 100%; max-width: 440px;
          max-height: 88vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,.2);
        }
        .sat-modal-head {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 10px;
          padding: 1.25rem 1.25rem .75rem;
        }
        .sat-modal-close {
          background: #F3F4F6; border: none; cursor: pointer; color: #6B7280;
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .sat-modal-body { padding: 0 1.25rem 1.25rem; }
        .sat-modal-actions { display: flex; gap: 10px; padding: 0 1.25rem 1.25rem; }
      `}</style>

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
      <div className="sat-stats">
        {[
          { label: 'En attente', value: stats.pending,   accent: '#F59E0B' },
          { label: 'Validés',    value: stats.validated, accent: '#10B981' },
          { label: 'Refusés',    value: stats.rejected,  accent: '#EF4444' },
          { label: 'Total',      value: stats.total,     accent: '#DC2626' },
        ].map(s => (
          <div key={s.label} className="sat-stat-card" style={{ borderBottom: `3px solid ${s.accent}` }}>
            <p className="sat-stat-value">{s.value}</p>
            <p className="sat-stat-label">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Card liste ── */}
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,.06)', overflow: 'hidden' }}>

        <div className="sat-list-head">
          <div className="sat-list-head-left">
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

          <div className="sat-select-wrap">
            <select
              className="sat-select"
              value={status}
              onChange={e => changeStatus(e.target.value)}
              aria-label="Filtrer par statut"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value || 'all'} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="sat-select-chevron">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
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
                  <button key={t.id} className="sat-row" onClick={() => openView(t)}>
                    <div className="sat-row-main">
                      <div className="sat-row-amounts">
                        <span>{fmt(t.sendAmount, t.sendCurrency)}</span>
                        <span style={{ color: '#CBD5E1', fontSize: '.8rem', fontWeight: 400 }}>→</span>
                        <span style={{ color: '#DC2626' }}>{fmt(t.receiveAmount, t.receiveCurrency)}</span>
                      </div>
                      <p className="sat-row-antennas">
                        {t.senderAntenna?.name ?? '—'} → {t.receiverAntenna?.name ?? '—'}
                      </p>
                      <p className="sat-row-meta">{fmtDateTime(t.createdAt)}</p>
                    </div>
                    <div className="sat-row-side">
                      <span style={{ fontSize: '.66rem', fontWeight: 700, padding: '.18rem .55rem',
                                     borderRadius: 99, background: st.bg, color: st.color,
                                     border: `1px solid ${st.border}`, whiteSpace: 'nowrap' }}>
                        {st.label}
                      </span>
                      <span className="sat-chevron"><ChevronRight /></span>
                    </div>
                  </button>
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

      {/* ══ Modal Détail ══ */}
      {viewingTransfer && (
        <div className="sat-modal-overlay" onClick={closeView}>
          <div className="sat-modal" onClick={e => e.stopPropagation()}>
            <div className="sat-modal-head">
              <div>
                <p style={{ margin: '0 0 6px', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.06em',
                            textTransform: 'uppercase', color: '#DC2626' }}>Détail du virement</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>
                    {fmt(viewingTransfer.sendAmount, viewingTransfer.sendCurrency)}
                  </span>
                  <span style={{ color: '#CBD5E1' }}>→</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#DC2626' }}>
                    {fmt(viewingTransfer.receiveAmount, viewingTransfer.receiveCurrency)}
                  </span>
                </div>
              </div>
              <button className="sat-modal-close" onClick={closeView} aria-label="Fermer">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="sat-modal-body">
              {buildDetailRows(viewingTransfer).map((row, i) => (
                <div key={i} style={detailRowStyle}>
                  <span style={detailLabelStyle}>{row.label}</span>
                  <span style={detailValueStyle}>{row.content}</span>
                </div>
              ))}
            </div>

            <div className="sat-modal-actions">
              <button
                onClick={() => startEditFromView(viewingTransfer)}
                style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: '1px solid #E2E8F0',
                         background: '#F1F5F9', color: '#334155', fontSize: '.85rem', fontWeight: 700,
                         cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Modifier
              </button>
              <button
                onClick={() => openDeleteConfirm(viewingTransfer)}
                style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: 'none',
                         background: '#FEF2F2', color: '#991B1B', fontSize: '.85rem', fontWeight: 700,
                         cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Modifier ══ */}
      {editingTransfer && (
        <div className="sat-modal-overlay">
          <div className="sat-modal" style={{ maxWidth: 420 }}>
            <div style={{ padding: '1.25rem 1.25rem 0' }}>
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
            </div>

            <div className="sat-modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                onClick={closeEdit}
                style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: '1px solid #E2E8F0',
                         background: '#fff', color: '#374151', fontSize: '.85rem',
                         cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                Annuler
              </button>
              <button
                disabled={!editBtnEnabled}
                onClick={handleSaveEdit}
                style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: 'none',
                         color: '#fff', fontSize: '.85rem', fontWeight: 700,
                         fontFamily: 'inherit', cursor: editBtnEnabled ? 'pointer' : 'not-allowed',
                         background: editBtnEnabled ? '#DC2626' : '#FCA5A5' }}
              >
                {editSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal Suppression (confirmation par saisie) ══ */}
      {deletingTransfer && (
        <div className="sat-modal-overlay">
          <div className="sat-modal" style={{ maxWidth: 420 }}>
            <div style={{ padding: '1.25rem 1.25rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF2F2',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                  Supprimer ce virement ?
                </h3>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
                            padding: '.85rem 1rem', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: '.9rem', fontWeight: 700, color: '#0F172A' }}>
                  {fmt(deletingTransfer.sendAmount, deletingTransfer.sendCurrency)} → {fmt(deletingTransfer.receiveAmount, deletingTransfer.receiveCurrency)}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '.78rem', color: '#64748B' }}>
                  {deletingTransfer.senderAntenna?.name ?? '—'} → {deletingTransfer.receiverAntenna?.name ?? '—'}
                </p>
              </div>

              {deletingTransfer.status === 'VALIDATED' && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
                              padding: '.7rem .85rem', marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: '.78rem', color: '#92400E', lineHeight: 1.5 }}>
                    Ce virement est <strong>validé</strong>. Le supprimer annule aussi son effet sur le solde des 2 antennes. Cette action est irréversible.
                  </p>
                </div>
              )}

              <label style={labelStyle}>
                TAPE <strong>{DELETE_KEYWORD}</strong> POUR CONFIRMER
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={DELETE_KEYWORD}
                autoComplete="off"
                style={inputStyle}
              />

              {deleteError && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10,
                              padding: '.6rem .85rem', fontSize: '.8rem', color: '#DC2626', marginTop: 10 }}>
                  {deleteError}
                </div>
              )}
            </div>

            <div className="sat-modal-actions" style={{ marginTop: '1.25rem' }}>
              <button
                onClick={closeDeleteConfirm}
                style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: '1px solid #E2E8F0',
                         background: '#fff', color: '#374151', fontSize: '.85rem',
                         cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
              >
                Annuler
              </button>
              <button
                disabled={!deleteConfirmMatches || deleteSubmitting}
                onClick={handleConfirmDelete}
                style={{ flex: 1, padding: '.7rem', borderRadius: 10, border: 'none',
                         color: '#fff', fontSize: '.85rem', fontWeight: 700, fontFamily: 'inherit',
                         cursor: deleteConfirmMatches && !deleteSubmitting ? 'pointer' : 'not-allowed',
                         background: deleteConfirmMatches ? '#DC2626' : '#FCA5A5' }}
              >
                {deleteSubmitting ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}