// web/app/(protected)/member/contributions/history/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '../../../../../components/layout/AppShell';
import { api } from '../../../../../lib/api-client';
import type { Contribution } from '../../../../../types/contribution';
import { ContributionHistoryTable } from '../../../../../components/member/ContributionHistoryTable';
import { formatDate, formatCurrency } from '../../../../../lib/format';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'PENDING_VALIDATION', label: 'En attente' },
  { value: 'VALIDATED', label: 'Validées' },
  { value: 'REJECTED', label: 'Rejetées' },
  { value: 'CANCELLED', label: 'Annulées' },
] as const;

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

const STATUS_MAP: Record<string, string> = {
  VALIDATED:          'Validée',
  REJECTED:           'Rejetée',
  PENDING_VALIDATION: 'En attente',
  PENDING:            'En attente',
  CANCELLED:          'Annulée',
  SUBMITTED:          'Soumise',
  DRAFT:              'Brouillon',
};

export default function MemberContributionsHistoryPage() {
  const [items, setItems]           = useState<Contribution[]>([]);
  const [status, setStatus]         = useState('');
  const [q, setQ]                   = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  // États export
  const [exportModalType, setExportModalType]   = useState<'PDF' | 'EXCEL' | null>(null);
  const [exportStartMonth, setExportStartMonth] = useState('');
  const [exportEndMonth, setExportEndMonth]     = useState('');
  const [exportStatus, setExportStatus]         = useState('');
  const [pdfData, setPdfData]                   = useState<Contribution[] | null>(null);
  const [actionBusy, setActionBusy]             = useState(false);

  // 🔥 Prix fixé par l'admin pour la carte membre (récupéré depuis les settings)
  const [membershipCardPrice, setMembershipCardPrice] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listMyContributions({
        page: 1,
        pageSize: 200,
        status: status || undefined,
      });

      const contributions = (res?.items || []).map((c: Contribution) => ({
        ...c,
        paymentMethod: c.paymentMethod || (c as unknown as { method?: string }).method || '—',
      }));

      setItems(contributions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement historique');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  // 🔥 Récupérer le prix de la carte membre depuis les settings de l'antenne
  useEffect(() => {
    void (async () => {
      try {
        const settings = await (api as unknown as { getAntennaSettings?: () => Promise<{ membershipCardPrice?: number }> }).getAntennaSettings?.();
        if (settings?.membershipCardPrice) {
          setMembershipCardPrice(settings.membershipCardPrice);
        }
      } catch {
        // Si l'endpoint n'existe pas ou échoue, on ignore — la validation se fera côté backend
      }
    })();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((c) => {
      if (!q.trim()) return true;
      const query = q.toLowerCase();
      return (
        c.purpose?.toLowerCase().includes(query) ||
        c.paymentMethod?.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query)
      );
    });
  }, [items, q]);

  // ─── Handlers suppression / modification ────────────────────────────────

  /**
   * 🔥 Suppression d'une transaction en attente par le membre.
   * Le membre utilise le même endpoint que l'admin (ses propres contributions uniquement).
   */
  // 🔥 FIX : utilise la route membre /member/contributions/:id (DELETE)
  // et non plus /admin/contributions/:id qui nécessite le rôle ANTENNA_ADMIN
  const handleDelete = useCallback(async (id: string) => {
    await api.deleteMyContribution(id);
    await load();
  }, [load]);

  /**
   * 🔥 Modification du montant d'une transaction en attente.
   * Bloque la modification si le motif est MEMBERSHIP_CARD et que le prix est fixé.
   */
  // 🔥 FIX : utilise la route membre /member/contributions/:id (PATCH)
  // et non plus /admin/contributions/:id qui nécessite le rôle ANTENNA_ADMIN
  const handleEdit = useCallback(async (id: string, newAmount: number) => {
    const contribution = items.find(c => c.id === id);

    // 🔥 BLOCAGE CARTE MEMBRE : si le prix est fixé, on refuse toute modification
    if (contribution?.purpose === 'MEMBERSHIP_CARD' && membershipCardPrice !== null) {
      throw new Error(
        `Le montant de la carte membre est fixé à ${membershipCardPrice} ${contribution.currency || 'EUR'} et ne peut pas être modifié.`
      );
    }

    await api.updateMyContribution(id, newAmount);
    await load();
  }, [items, membershipCardPrice, load]);

  // ─── Export ──────────────────────────────────────────────────────────────

  const executeExport = async () => {
    try {
      setActionBusy(true);
      const fetchRes = await api.listMyContributions({
        page: 1,
        pageSize: 500,
        status: exportStatus || undefined,
      });

      let exportData = (fetchRes?.items || []).map((c: Contribution) => ({
        ...c,
        paymentMethod: c.paymentMethod || (c as unknown as { method?: string }).method || '—',
      })) as Contribution[];

      if (exportStartMonth) {
        const start = new Date(`${exportStartMonth}-01T00:00:00Z`);
        exportData = exportData.filter(c => new Date(c.contributionDate || c.createdAt) >= start);
      }
      if (exportEndMonth) {
        const end = new Date(`${exportEndMonth}-01T00:00:00Z`);
        end.setMonth(end.getMonth() + 1);
        exportData = exportData.filter(c => new Date(c.contributionDate || c.createdAt) < end);
      }

      if (exportData.length === 0) {
        alert("Aucune cotisation ne correspond à ces critères d'exportation.");
        return;
      }

      if (exportModalType === 'EXCEL') {
        let csv = "Date;Type;Mode de paiement;Montant;Statut\n";
        exportData.forEach(c => {
          const date    = formatDate(c.contributionDate || c.createdAt);
          const type    = PURPOSE_MAP[c.purpose] || c.purpose || 'Cotisation régulière';
          const methode = METHOD_MAP[c.paymentMethod || ''] || c.paymentMethod || '—';
          const montant = `${c.amount} ${c.currency || 'EUR'}`;
          const statut  = STATUS_MAP[c.status] || c.status;
          csv += `"${date}";"${type}";"${methode}";"${montant}";"${statut}"\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `Mes_Cotisations_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

  const validated = items.filter(i => (i.status as string) === 'VALIDATED').length;
  const pending   = items.filter(i => ['PENDING_VALIDATION', 'PENDING', 'SUBMITTED'].includes(i.status as string)).length;
  const rejected  = items.filter(i => (i.status as string) === 'REJECTED').length;

  return (
    <AppShell title="Mes cotisations">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .ch-wrap { font-family:'DM Sans',sans-serif; padding:clamp(0.75rem,3vw,2rem); max-width:1100px; margin:0 auto; box-sizing:border-box; width:100%; }

        .ch-header { display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; padding-bottom:1.25rem; border-bottom:1px solid rgba(37,99,235,0.1); }
        .ch-eyebrow { font-size:.65rem; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:#2563eb; margin-bottom:.35rem; display:flex; align-items:center; gap:.4rem; }
        .ch-eyebrow-dot { width:6px; height:6px; background:#3b82f6; border-radius:50%; }
        .ch-title { font-family:'Cormorant Garamond',serif; font-size:clamp(1.45rem,4vw,2rem); font-weight:700; color:#111827; line-height:1.15; margin:0; }
        .ch-title span { background:linear-gradient(135deg,#1d4ed8,#3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }

        .ch-actions-group { display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; }
        .btn-export { height:42px; padding:0 1.2rem; border-radius:12px; border:none; color:white; font-weight:800; font-size:.75rem; cursor:pointer; display:flex; align-items:center; gap:8px; transition:transform .2s,box-shadow .2s; }
        .btn-export:hover { transform:translateY(-2px); filter:brightness(1.1); }
        .btn-pdf   { background:linear-gradient(135deg,#991B1B,#DC2626); box-shadow:0 4px 12px rgba(220,38,38,.2); }
        .btn-excel { background:linear-gradient(135deg,#059669,#10B981); box-shadow:0 4px 12px rgba(16,185,129,.2); }
        .ch-new-btn { display:inline-flex; align-items:center; gap:.45rem; height:42px; padding:0 1rem; background:linear-gradient(135deg,#1d4ed8,#2563eb); color:white; border-radius:12px; text-decoration:none; font-size:.8rem; font-weight:700; box-shadow:0 4px 14px rgba(37,99,235,.28); transition:transform .2s; }
        .ch-new-btn:hover { transform:translateY(-2px); }

        .ch-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.75rem; margin-bottom:1.5rem; }
        .ch-stat-card { background:white; border-radius:16px; border:1px solid #e2e8f0; padding:1rem .75rem; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; border-bottom:4px solid; box-shadow:0 2px 8px rgba(0,0,0,.03); }
        .ch-stat-val { font-family:'Cormorant Garamond',serif; font-size:1.8rem; font-weight:700; }
        .ch-stat-lbl { font-size:.65rem; font-weight:800; text-transform:uppercase; color:#64748b; }

        .ch-toolbar { display:flex; gap:.6rem; align-items:center; width:100%; margin-bottom:1rem; }
        .ch-search-wrap { position:relative; flex:1; min-width:0; }
        .ch-search-icon { position:absolute; left:.8rem; top:50%; transform:translateY(-50%); color:#9ca3af; pointer-events:none; }
        .ch-search,.ch-select,.ch-reload-btn { height:42px; border-radius:10px; border:1px solid #cbd5e1; font-family:'DM Sans',sans-serif; font-size:.85rem; }
        .ch-search { width:100%; padding:0 .8rem 0 2.2rem; box-sizing:border-box; outline:none; }
        .ch-select { padding:0 .8rem; font-weight:600; background:white; outline:none; }
        .ch-reload-btn { padding:0 .9rem; background:white; display:flex; align-items:center; gap:.35rem; cursor:pointer; font-weight:700; }

        .ch-panel { background:rgba(253,253,255,.96); border-radius:18px; border:1px solid rgba(37,99,235,.09); overflow:visible; position:relative; z-index:1; box-shadow:0 8px 24px rgba(15,23,42,.04); }
        .ch-loader { display:flex; align-items:center; justify-content:center; padding:2rem; gap:.75rem; color:#64748b; font-weight:600; }
        .ch-ring { width:24px; height:24px; border:2.5px solid rgba(37,99,235,.1); border-top-color:#2563eb; border-radius:50%; animation:spin .8s linear infinite; }

        /* Modal export */
        .ch-modal-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(4px); z-index:10000; display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadeIn .2s ease-out; }
        .ch-modal { width:100%; max-width:480px; background:#FFF; border-radius:20px; display:flex; flex-direction:column; box-shadow:0 25px 50px -12px rgba(0,0,0,.25); animation:slideUp .3s cubic-bezier(.22,1,.36,1); overflow:hidden; }
        .ch-modal-head { padding:1.5rem; display:flex; justify-content:space-between; align-items:flex-start; }
        .ch-modal-title { font-family:'Cormorant Garamond',serif; font-size:1.8rem; font-weight:700; color:#0F172A; margin:0; }
        .ch-modal-close { background:white; border:1px solid #E2E8F0; width:34px; height:34px; border-radius:50%; cursor:pointer; color:#64748B; display:flex; align-items:center; justify-content:center; transition:all .2s; }
        .ch-modal-close:hover { background:#F1F5F9; color:#0F172A; }
        .ch-modal-body { padding:0 1.5rem 1.5rem; }
        .export-flex-row { display:flex; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
        .export-flex-item { flex:1 1 calc(50% - .5rem); min-width:140px; }
        .export-flex-item.full { flex:1 1 100%; }
        .export-label { font-size:.75rem; font-weight:800; color:#475569; display:block; margin-bottom:.4rem; text-transform:uppercase; letter-spacing:.05em; }
        .export-input { width:100%; height:44px; border-radius:12px; border:1px solid #CBD5E1; padding:0 1rem; font-family:'DM Sans',sans-serif; font-size:.85rem; outline:none; background:#F8FAFC; box-sizing:border-box; }
        .export-input:focus { border-color:#3B82F6; }
        .ch-btn { padding:.75rem .5rem; border-radius:12px; font-family:'DM Sans',sans-serif; font-weight:600; font-size:.85rem; border:none; cursor:pointer; transition:all .2s; flex:1; display:flex; align-items:center; justify-content:center; }
        .ch-btn-sec { background:transparent; color:#64748B; border:1px solid #E2E8F0; }

        @media print {
          body * { visibility:hidden; }
          .printable-export-area,.printable-export-area * { visibility:visible; }
          .printable-export-area { position:absolute; left:0; top:0; width:100%; display:block !important; }
          .ch-wrap,.ch-modal-overlay { display:none !important; }
        }
        .printable-export-area { display:none; }

        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

        @media(max-width:640px) {
          .ch-wrap { padding:.75rem; }
          .ch-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .ch-toolbar { gap:.4rem; }
          .ch-search,.ch-select,.ch-reload-btn { height:38px; font-size:.75rem; }
          .ch-panel { border-radius:14px; }
          .btn-export span { display:none; }
        }
      `}</style>

      {/* Zone imprimable PDF */}
      {pdfData && (
        <div className="printable-export-area">
          <h2 style={{ textAlign:'center', marginBottom:20, fontFamily:"'Cormorant Garamond',serif" }}>Mon Historique de Cotisations</h2>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ background:'#f1f5f9' }}>
                {['Date','Type','Mode de paiement','Montant','Statut'].map(h => (
                  <th key={h} style={{ border:'1px solid #cbd5e1', padding:8, textAlign:'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pdfData.map(c => (
                <tr key={c.id}>
                  <td style={{ border:'1px solid #cbd5e1', padding:8 }}>{formatDate(c.contributionDate || c.createdAt)}</td>
                  <td style={{ border:'1px solid #cbd5e1', padding:8 }}>{PURPOSE_MAP[c.purpose] || c.purpose || 'Cotisation régulière'}</td>
                  <td style={{ border:'1px solid #cbd5e1', padding:8 }}>{METHOD_MAP[c.paymentMethod || ''] || c.paymentMethod || '—'}</td>
                  <td style={{ border:'1px solid #cbd5e1', padding:8, fontFamily:"'DM Mono',monospace", fontWeight:'bold' }}>{formatCurrency(c.amount, c.currency || 'EUR')}</td>
                  <td style={{ border:'1px solid #cbd5e1', padding:8 }}>{STATUS_MAP[c.status] || c.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="ch-wrap">
        <div className="ch-header">
          <div>
            <div className="ch-eyebrow"><div className="ch-eyebrow-dot" />Espace membre</div>
            <h1 className="ch-title">Historique des <span>cotisations</span></h1>
          </div>
          <div className="ch-actions-group">
            <button className="btn-export btn-pdf" onClick={() => setExportModalType('PDF')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm9-9h-6v2h4v10H5V9h4V7H3v14h18V7z"/></svg>
              <span>PDF</span>
            </button>
            <button className="btn-export btn-excel" onClick={() => setExportModalType('EXCEL')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              <span>EXCEL</span>
            </button>
            <Link href="/member/contributions/new" className="ch-new-btn">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              <span>Nouveau dépôt</span>
            </Link>
          </div>
        </div>

        <div className="ch-stats">
          <div className="ch-stat-card" style={{ borderBottomColor:'#2563EB' }}>
            <span className="ch-stat-val" style={{ color:'#1D4ED8' }}>{items.length}</span>
            <span className="ch-stat-lbl">Total</span>
          </div>
          <div className="ch-stat-card" style={{ borderBottomColor:'#059669' }}>
            <span className="ch-stat-val" style={{ color:'#047857' }}>{validated}</span>
            <span className="ch-stat-lbl">Validées</span>
          </div>
          <div className="ch-stat-card" style={{ borderBottomColor:'#D97706' }}>
            <span className="ch-stat-val" style={{ color:'#B45309' }}>{pending}</span>
            <span className="ch-stat-lbl">En attente</span>
          </div>
          <div className="ch-stat-card" style={{ borderBottomColor:'#DC2626' }}>
            <span className="ch-stat-val" style={{ color:'#B91C1C' }}>{rejected}</span>
            <span className="ch-stat-lbl">Rejetées</span>
          </div>
        </div>

        <div className="ch-toolbar">
          <div className="ch-search-wrap">
            <svg className="ch-search-icon" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="ch-search"
              placeholder="Motif, méthode, référence…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>
          <select className="ch-select" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="ch-reload-btn" onClick={() => void load()}>
            {loading
              ? <div className="ch-ring" />
              : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            }
          </button>
        </div>

        {error && (
          <div style={{ background:'#FEF2F2', color:'#B91C1C', padding:'1rem', borderRadius:12, marginBottom:'1rem', border:'1px solid #FECACA', fontWeight:700 }}>
            {error}
          </div>
        )}

        <div className="ch-panel">
          {loading ? (
            <div className="ch-loader"><div className="ch-ring" />Chargement…</div>
          ) : (
            <ContributionHistoryTable
              items={filteredItems}
              // 🔥 onDelete : supprime la transaction si PENDING
              onDelete={handleDelete}
              // 🔥 onEdit : modifie le montant, bloqué si MEMBERSHIP_CARD avec prix fixé
              onEdit={handleEdit}
            />
          )}
        </div>
      </div>

      {/* Modal export */}
      {exportModalType && (
        <div className="ch-modal-overlay" onClick={() => setExportModalType(null)}>
          <div className="ch-modal" onClick={e => e.stopPropagation()}>
            <div className="ch-modal-head">
              <h2 className="ch-modal-title">Exporter en {exportModalType === 'EXCEL' ? 'Excel' : 'PDF'}</h2>
              <button className="ch-modal-close" onClick={() => setExportModalType(null)}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="ch-modal-body">
              <div className="export-flex-row">
                <div className="export-flex-item full">
                  <label className="export-label">Filtrer par statut</label>
                  <select className="export-input" value={exportStatus} onChange={e => setExportStatus(e.target.value)}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="export-flex-item">
                  <label className="export-label">Depuis</label>
                  <input type="month" className="export-input" value={exportStartMonth} onChange={e => setExportStartMonth(e.target.value)} />
                </div>
                <div className="export-flex-item">
                  <label className="export-label">Jusqu&apos;à</label>
                  <input type="month" className="export-input" value={exportEndMonth} onChange={e => setExportEndMonth(e.target.value)} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'.75rem' }}>
                <button className="ch-btn ch-btn-sec" onClick={() => setExportModalType(null)}>Annuler</button>
                <button
                  className="ch-btn"
                  style={{ background: exportModalType === 'EXCEL' ? '#10B981' : '#DC2626', color:'white', fontWeight:800 }}
                  onClick={() => void executeExport()}
                  disabled={actionBusy}
                >
                  {actionBusy ? 'Génération…' : 'Télécharger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}