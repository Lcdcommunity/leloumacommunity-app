// web/app/(protected)/super-admin/contributions/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Contribution, ContributionStatus } from '../../../../types/contribution';
import { formatCurrency, formatDate } from '../../../../lib/format';

type CurrencyBucket = Record<string, number>;

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  VALIDATED: { label: 'Validée', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  REJECTED: { label: 'Rejetée', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  CANCELLED: { label: 'Annulée', color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
  DRAFT: { label: 'Brouillon', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  SUBMITTED: { label: 'Soumise', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Carte',
  OTHER: 'Autre',
};

const formatContributionType = (type?: string) => {
  switch (type) {
    case 'MEMBERSHIP': return 'Carte de membre';
    case 'REGULAR': return 'Cotisation régulière';
    case 'DONATION': return 'Don';
    case 'LATE_FEE': return 'Retard';
    default: return type || 'Cotisation régulière';
  }
};

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  const initials = parts.map((part) => part[0]).join('');
  return initials.slice(0, 2).toUpperCase();
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div className="stat-val" style={{ color }}>{value}</div>
        <div className="stat-lbl">{label}</div>
      </div>
      <div className="stat-ico" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
    </div>
  );
}

function sumAmountsByCurrency(entries: Contribution[]): CurrencyBucket {
  return entries.reduce<CurrencyBucket>((acc, item) => {
    const currency = item.currency || 'EUR';
    acc[currency] = (acc[currency] ?? 0) + Number(item.amount ?? 0);
    return acc;
  }, {});
}

export default function SuperAdminContributionsPage() {
  const [items, setItems] = useState<Contribution[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Contribution | null>(null);

  // ⚡ ÉTATS D'EXPORTATION
  const [antennas, setAntennas] = useState<{ id: string, name: string }[]>([]);
  const [exportModalType, setExportModalType] = useState<'PDF' | 'EXCEL' | null>(null);
  const [exportAntenna, setExportAntenna] = useState('');
  const [exportStartMonth, setExportStartMonth] = useState('');
  const [exportEndMonth, setExportEndMonth] = useState('');
  const [pdfData, setPdfData] = useState<Contribution[] | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const load = useCallback(
    async (statusVal?: string) => {
      setError(null);
      setLoading(true);

      try {
        const res = await api.listContributions({
          page: 1,
          pageSize: 100,
          status: (statusVal ?? status) || undefined,
        });
        setItems(res.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des cotisations');
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    void load('');
    // Charger les antennes pour le filtre d'exportation
    const initAntennas = async () => {
      try {
        const res = await api.listAntennas({ pageSize: 100 });
        setAntennas(res.items);
      } catch (e) { console.error(e); }
    };
    void initAntennas();
  }, [load]);

  useEffect(() => {
    if (selectedItem) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedItem]);

  // ⚡ FONCTION D'EXPORTATION CHIRURGICALE
  const executeExport = async () => {
    try {
      setActionBusy(true);
      const fetchRes = await api.listContributions({
        page: 1, 
        pageSize: 10000, // On récupère tout pour l'export
        antennaId: exportAntenna || undefined
      });
      
      let exportData = fetchRes.items as Contribution[];

      // Filtrage local supplémentaire si l'API ne le gère pas
      if (exportAntenna) {
        exportData = exportData.filter(c => c.antennaId === exportAntenna || c.antenna?.id === exportAntenna);
      }

      if (exportStartMonth) {
        const start = new Date(`${exportStartMonth}-01T00:00:00Z`);
        exportData = exportData.filter(c => new Date(c.contributionDate || c.createdAt) >= start);
      }
      if (exportEndMonth) {
        const end = new Date(`${exportEndMonth}-01T00:00:00Z`);
        end.setMonth(end.getMonth() + 1); // Inclut tout le mois de fin
        exportData = exportData.filter(c => new Date(c.contributionDate || c.createdAt) < end);
      }

      if (exportData.length === 0) {
        alert("Aucune cotisation ne correspond à ces critères de filtrage.");
        return;
      }

      if (exportModalType === 'EXCEL') {
        let csv = "Nom;Prenom;Email;Antenne;Montant;Mois Cotise;Type;Statut\n";
        exportData.forEach(c => {
          const nom = c.member?.lastName || '';
          const prenom = c.member?.firstName || '';
          const email = c.member?.email || '';
          const antenne = c.antenna?.name || '';
          const montant = `${c.amount} ${c.currency || 'EUR'}`;
          const date = formatDate(c.contributionDate || c.createdAt);
          const type = formatContributionType((c as any).type);
          const statut = STATUS_MAP[c.status]?.label || c.status;

          csv += `"${nom}";"${prenom}";"${email}";"${antenne}";"${montant}";"${date}";"${type}";"${statut}"\n`;
        });
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Export_Cotisations_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
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

  const displayedItems = useMemo(() => {
    if (!status) return items;
    return items.filter((c) => {
      if (status === 'PENDING_VALIDATION' || status === 'PENDING') {
        return c.status === 'PENDING_VALIDATION' || c.status === 'PENDING';
      }
      return c.status === status;
    });
  }, [items, status]);

  const total = items.length;
  const pending = items.filter((c) => c.status === 'PENDING' || c.status === 'PENDING_VALIDATION').length;
  const validated = items.filter((c) => c.status === 'VALIDATED').length;

  const pendingItems = useMemo(
    () => items.filter((c) => c.status === 'PENDING' || c.status === 'PENDING_VALIDATION'),
    [items],
  );

  const _pendingByCurrency = useMemo(
    () => sumAmountsByCurrency(pendingItems),
    [pendingItems],
  );
  void _pendingByCurrency;

  const hasPending = pending > 0;

  return (
    <AppShell title="Cotisations globales">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@500;600&display=swap');
        
        .sc-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; box-sizing: border-box; overflow-x: hidden; }
        
        .sm-header-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .sm-export-group { display: flex; gap: .5rem; }
        .btn-export { height: 38px; padding: 0 1.2rem; border-radius: 12px; border: none; color: white; font-weight: 800; font-size: .75rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s; }
        .btn-export:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .btn-pdf { background: linear-gradient(135deg, #991B1B, #DC2626); box-shadow: 0 4px 12px rgba(220,38,38,0.2); }
        .btn-excel { background: linear-gradient(135deg, #059669, #10B981); box-shadow: 0 4px 12px rgba(16,185,129,0.2); }

        .sc-header { opacity: 0; transform: translateY(10px); animation: scin .5s .04s cubic-bezier(.22,1,.36,1) forwards; }
        .sc-eyebrow { font-size: .67rem; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; color: #DC2626; margin-bottom: .35rem; display: flex; align-items: center; gap: .4rem; }
        .sc-dot { width: 6px; height: 6px; background: #EF4444; border-radius: 50%; animation: scpulse 2s ease-in-out infinite; }
        @keyframes scpulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
        .sc-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.9rem); font-weight: 700; color: #111827; letter-spacing: -.02em; line-height: 1.15; margin: 0; }
        .sc-title span { background: linear-gradient(135deg, #991B1B, #EF4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        .sc-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; margin-bottom: 1.4rem; opacity: 0; transform: translateY(10px); animation: scin 0.5s 0.08s cubic-bezier(.22,1,.36,1) forwards; }
        .stat-card { background: rgba(253,253,255,.93); border-radius: 14px; border: 1px solid rgba(220,38,38,.09); box-shadow: 0 2px 8px rgba(220,38,38,.04); padding: 0.8rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .stat-val { font-family: 'Cormorant Garamond',serif; font-size: 1.55rem; font-weight: 700; line-height: 1; margin-bottom: 0.3rem; }
        .stat-lbl { font-size: 0.64rem; font-weight: 900; color: #6B7280; text-transform: uppercase; letter-spacing: 0.07em; line-height: 1.2; }
        .stat-ico { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        @media(max-width: 600px) {
            .sc-stats { gap: 0.4rem; }
            .stat-card { padding: 0.6rem 0.4rem; gap: 0.25rem; flex-direction: column-reverse; justify-content: center; }
            .stat-val { font-size: 1.3rem; margin-bottom: 0.1rem; }
            .stat-lbl { font-size: 0.55rem; letter-spacing: 0; text-align: center; }
            .stat-ico { width: 26px; height: 26px; margin-bottom: 0.2rem; }
            .stat-ico svg { width: 14px; height: 14px; }
        }

        .sc-urgent { display: flex; align-items: center; gap: .75rem; padding: .85rem 1.1rem; background: linear-gradient(135deg,rgba(217,119,6,.07),rgba(245,158,11,.04)); border: 1px solid rgba(217,119,6,.2); border-radius: 13px; margin-bottom: 1.25rem; opacity: 0; transform: translateY(8px); animation: scin .5s .12s cubic-bezier(.22,1,.36,1) forwards; }
        .sc-urgent-ico { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg,#92400E,#D97706); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 3px 8px rgba(217,119,6,.3); }
        .sc-urgent-text { display: flex; flex-direction: column; gap: .2rem; }
        .sc-urgent-text strong { font-size: .85rem; font-weight: 800; color: #111827; }
        .sc-urgent-text span { font-size: .75rem; font-weight: 600; color: #6B7280; }

        .sc-panel { background: rgba(253,253,255,.94); backdrop-filter: blur(14px); border-radius: 22px; border: 1px solid rgba(220,38,38,.09); box-shadow: 0 2px 18px rgba(220,38,38,.06), 0 0 0 1px rgba(255,255,255,.9) inset; overflow: hidden; opacity: 0; transform: translateY(10px); animation: scin .5s .16s cubic-bezier(.22,1,.36,1) forwards; }
        .sc-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid rgba(220,38,38,.07); display: flex; align-items: center; justify-content: space-between; gap: .75rem; flex-wrap: nowrap; overflow: hidden; }
        .sc-panel-titlerow { display: flex; align-items: center; gap: .55rem; min-width: 0; }
        .sc-panel-ico { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg,#991B1B,#DC2626); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(220,38,38,.3); }
        
        .sc-panel-title { font-size: clamp(0.7rem, 2.5vw, 0.75rem); font-weight: 900; letter-spacing: .05em; text-transform: uppercase; color: #1F2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sc-count-chip { font-size: .68rem; font-weight: 900; padding: .2rem .6rem; border-radius: 99px; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; flex-shrink: 0; }

        .sc-toolbar { display: flex; flex-direction: row; gap: 0.6rem; align-items: center; flex-wrap: nowrap; padding: 0.9rem 1.4rem; border-bottom: 1px solid rgba(220,38,38,.07); }
        .sc-field { display: flex; flex-direction: row; align-items: center; gap: 0.5rem; flex: 1; min-width: 0; }
        .sc-label { font-size: 0.7rem; font-weight: 900; color: #374151; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
        .sc-select { flex: 1; height: 40px; border-radius: 11px; border: 1px solid rgba(220,38,38,.18); background: rgba(255,255,255,.9); padding: 0 1.8rem 0 .85rem; font-family: 'DM Sans',sans-serif; font-size: .84rem; font-weight: 700; color: #111827; outline: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .65rem center; transition: border-color .2s,box-shadow .2s; min-width: 0; text-overflow: ellipsis; }
        .sc-select:focus { border-color: rgba(220,38,38,.42); box-shadow: 0 0 0 3px rgba(220,38,38,.09); }
        
        .sc-filter-btn { height: 40px; padding: 0 1.2rem; border-radius: 11px; background: linear-gradient(135deg,#991B1B,#DC2626); border: none; color: white; cursor: pointer; font-family: 'DM Sans',sans-serif; font-size: .84rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: .45rem; box-shadow: 0 3px 10px rgba(220,38,38,.3); transition: all .18s; white-space: nowrap; flex-shrink: 0; }
        .sc-filter-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(220,38,38,.42); }
        .sc-filter-btn:disabled { opacity: .6; cursor: not-allowed; }
        
        @media(max-width: 500px) {
            .sc-toolbar { padding: 0.7rem 0.8rem; gap: 0.4rem; }
            .sc-field { gap: 0.35rem; }
            .sc-label { font-size: 0.6rem; letter-spacing: 0; }
            .sc-select { padding: 0 1.2rem 0 0.5rem; font-size: 0.75rem; background-position: right 0.4rem center; }
            .sc-filter-btn { padding: 0 0.8rem; font-size: 0.75rem; }
        }

        .sc-status-chips { display: flex; flex-wrap: nowrap; align-items: center; justify-content: center; gap: clamp(0.2rem, 1.5vw, 0.6rem); padding: 0.75rem clamp(0.3rem, 2vw, 1.4rem); border-bottom: 1px solid rgba(220,38,38,.06); background: rgba(254,242,242,.18); width: 100%; overflow: hidden; }
        .sc-chip { display: inline-flex; align-items: center; gap: 0.15rem; font-size: clamp(0.5rem, 2.5vw, 0.68rem); font-weight: 800; border-radius: 99px; padding: 0.15rem clamp(0.25rem, 1.5vw, 0.6rem); border: 1px solid; cursor: pointer; transition: all 0.15s; white-space: nowrap; flex-shrink: 1; min-width: 0; }
        .sc-chip span:last-child { font-family: 'DM Mono', monospace; font-size: clamp(0.5rem, 2.5vw, 0.68rem); margin-left: 0.1rem; }

        .sc-error { display: flex; align-items: center; gap: .65rem; padding: .9rem 1.2rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: .82rem; font-weight: 800; margin: 1rem; }
        .sc-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: .75rem; color: #6B7280; font-size: .84rem; font-weight: 700; }
        .sc-ring { width: 24px; height: 24px; border: 2.5px solid rgba(220,38,38,.12); border-top-color: #DC2626; border-radius: 50%; animation: scspin .8s linear infinite; }
        .sc-empty { display: flex; flex-direction: column; align-items: center; padding: 3.5rem 1rem; gap: .75rem; color: #9CA3AF; }
        .sc-empty-title { font-size: .9rem; font-weight: 800; color: #374151; }
        .sc-empty-sub { font-size: .78rem; font-weight: 600; }

        @keyframes scin { to { opacity: 1; transform: translateY(0); } }
        @keyframes scspin { to { transform: rotate(360deg); } }

        /* ─── STYLES DU TABLEAU INTÉGRÉ ─── */
        .sct-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .sct-table thead tr { border-bottom: 1px solid rgba(220,38,38,.08); }
        .sct-table thead th { padding: .85rem 1.1rem; text-align: left; font-size: .66rem; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; color: #6B7280; background: rgba(254,242,242,.22); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .sct-row { border-bottom: 1px solid rgba(220,38,38,.06); transition: background .15s ease; cursor: pointer; }
        .sct-row:hover { background: rgba(220,38,38,.03); }
        .sct-row:last-child { border-bottom: none; }
        .sct-table td { padding: .9rem 1.1rem; font-size: .82rem; color: #374151; vertical-align: middle; overflow: hidden; text-overflow: ellipsis; }

        .sct-member-cell { display: flex; align-items: center; gap: 0.75rem; }
        .sct-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #DC2626, #991B1B); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 900; color: white; flex-shrink: 0; }
        .sct-member { display: flex; flex-direction: column; gap: .18rem; min-width: 0; }
        .sct-member-name { font-size: .87rem; font-weight: 800; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sct-member-email { font-size: .72rem; color: #9CA3AF; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .sct-amount { font-family: 'DM Mono', monospace; font-size: .84rem; font-weight: 800; color: #111827; white-space: nowrap; }
        .sct-date { white-space: nowrap; font-size: .78rem; font-weight: 600; color: #374151; }
        .sct-status { display: inline-flex; align-items: center; gap: .32rem; padding: .25rem .62rem; border-radius: 999px; font-size: .7rem; font-weight: 800; white-space: nowrap; }
        .sct-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        /* ── CARTES MOBILE ── */
        .sct-cards { display: none; }

        @media (max-width: 768px) {
          .sct-table { display: none; } 
          
          .sct-cards { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.8rem 1rem; }
          .sct-card { background: white; border-radius: 16px; border: 1px solid rgba(220,38,38,.08); padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: transform 0.1s, background 0.15s; }
          .sct-card:active { transform: scale(0.98); background: #FDF2F2; }
          .sct-card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
          .sct-card-member { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
          .sct-card-member .sct-avatar { width: 28px; height: 28px; font-size: 0.6rem; }
          .sct-card-member .sct-member-name { font-size: 0.8rem; }
          
          .sct-card-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 0.6rem; border-top: 1px solid rgba(0,0,0,0.04); }
          .sct-card-date { font-size: 0.7rem; color: #9CA3AF; font-weight: 600; }
        }

        /* ── STYLES D'EXPORTATION ── */
        .export-flex-row { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .export-flex-item { flex: 1 1 calc(50% - 0.5rem); min-width: 140px; }
        .export-flex-item.full { flex: 1 1 100%; }

        .btn-cancel { height: 42px; padding: 0 1.2rem; border: 1.5px solid #e2e8f0; border-radius: 12px; font-weight: 700; cursor: pointer; background: white; color: #475569; transition: all 0.2s; }
        .btn-cancel:hover { background: #F8FAFC; border-color: #CBD5E1; color: #0F172A; }
        .btn-save { height: 42px; color: white; border: none; border-radius: 12px; font-weight: 800; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .btn-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.15); filter: brightness(1.1); }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

        @media print {
          body * { visibility: hidden; }
          .printable-export-area, .printable-export-area * { visibility: visible; }
          .printable-export-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
          .sc-wrap, .modal-overlay { display: none !important; }
        }
        .printable-export-area { display: none; }

        /* ── MODAL (Détails et Export) ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; animation: fadeIn 0.25s ease-out forwards; }
        .modal-content { background: white; width: 100%; max-width: 500px; border-radius: 24px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .modal-header { padding: 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; }
        .modal-title { font-family: 'Cormorant Garamond',serif; font-size: 1.6rem; font-weight: 700; color: #111827; margin: 0; letter-spacing: -0.02em; }
        .modal-close { width: 34px; height: 34px; border-radius: 50%; border: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: center; cursor: pointer; background: white; color: #64748b; transition: all 0.2s; }
        .modal-close:hover { background: #f8fafc; color: #0F172A; border-color: #CBD5E1; }
        
        .modal-body { padding: 1.5rem; }

        .sc-modal-hero { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; background: linear-gradient(to bottom, #ECFDF5, #F0FDF4); border-radius: 16px; border: 1px dashed #A7F3D0; margin-bottom: 1.5rem; }
        .sc-modal-hero-label { font-size: 0.7rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.4rem; }
        .sc-modal-hero-amount { font-family: 'DM Mono', monospace; font-size: clamp(2rem, 6vw, 2.8rem); font-weight: 800; color: #047857; line-height: 1; text-align: center; word-break: break-word; }

        .sm-section-divider { font-size: 0.75rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #A7F3D0; padding-bottom: 0.5rem; margin: 0 0 1rem 0; }
        .sm-dp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem; }
        .sm-dp-field { display: flex; flex-direction: column; gap: 6px; }
        .sm-dp-field.full { grid-column: span 2; }
        .sm-dp-field label { font-size: .7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .sm-dp-value { font-size: .95rem; font-weight: 600; color: #1e293b; word-break: break-word; }

        .sc-modal-user { display: flex; align-items: center; gap: 0.8rem; }
        .sc-modal-avatar { width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg,#059669,#047857); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: 900; color: white; flex-shrink: 0; box-shadow: 0 4px 10px rgba(5,150,105,0.2); }
      `}</style>

      {/* ⚡ LA ZONE IMPRIMABLE CACHÉE POUR LE PDF */}
      {pdfData && (
        <div className="printable-export-area">
          <h2 style={{ textAlign: 'center', marginBottom: '20px', fontFamily: "'Cormorant Garamond', serif" }}>Rapport des Cotisations</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "'DM Sans', sans-serif" }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Nom & Prénom</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Email</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Antenne</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Montant</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Date / Mois</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Type</th>
                <th style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {pdfData.map(c => {
                const nom = c.member?.lastName || '';
                const prenom = c.member?.firstName || '';
                const email = c.member?.email || '';
                const antenne = c.antenna?.name || '';
                const montant = `${c.amount} ${c.currency || 'EUR'}`;
                const date = formatDate(c.contributionDate || c.createdAt);
                const type = formatContributionType((c as any).type);
                const statut = STATUS_MAP[c.status]?.label || c.status;
                
                return (
                  <tr key={c.id}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontWeight: 'bold' }}>{prenom} {nom}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{email}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{antenne}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '8px', fontFamily: "'DM Mono', monospace" }}>{montant}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{date}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{type}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '8px' }}>{statut}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="sc-wrap">
        <div className="sm-header-row">
          <div className="sc-header" style={{ marginBottom: 0 }}>
            <div className="sc-eyebrow"><div className="sc-dot" />Super Admin</div>
            <h1 className="sc-title">Cotisations <span>globales</span></h1>
          </div>
          
          <div className="sm-export-group">
            <button className="btn-export btn-pdf" onClick={() => setExportModalType('PDF')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-5-5h3V4h4v7h3l-5 5zm9-9h-6v2h4v10H5V9h4V7H3v14h18V7z"/></svg>
              PDF
            </button>
            <button className="btn-export btn-excel" onClick={() => setExportModalType('EXCEL')}>
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              EXCEL
            </button>
          </div>
        </div>

        <div className="sc-stats">
          <StatCard
            label="Total cotisations"
            value={total}
            color="#DC2626"
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
          />
          <StatCard
            label="Validées"
            value={validated}
            color="#059669"
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="En attente"
            value={pending}
            color="#D97706"
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {hasPending && (
          <div className="sc-urgent">
            <div className="sc-urgent-ico">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.2"><path strokeLinecap="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            </div>
            <div className="sc-urgent-text">
              <strong>{pending} cotisation{pending > 1 ? 's' : ''} en attente de validation</strong>
              <span>Ces cotisations n&apos;ont pas encore été validées par les administrateurs d&apos;antenne.</span>
            </div>
          </div>
        )}

        <div className="sc-panel">
          <div className="sc-panel-head">
            <div className="sc-panel-titlerow">
              <div className="sc-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3"><path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              <span className="sc-panel-title">Suivi des cotisations</span>
              {displayedItems.length > 0 && <span className="sc-count-chip">{displayedItems.length}</span>}
            </div>
          </div>

          <div className="sc-toolbar">
            <div className="sc-field">
              <label className="sc-label">Statut</label>
              <select className="sc-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tous les statuts</option>
                <option value="PENDING_VALIDATION">En attente</option>
                <option value="VALIDATED">Validées</option>
                <option value="REJECTED">Rejetées</option>
                <option value="CANCELLED">Annulées</option>
              </select>
            </div>

            <button className="sc-filter-btn" disabled={loading} onClick={() => void load(status)}>
              {loading ? (
                <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'scspin .7s linear infinite' }} /> Chargement…</>
              ) : (
                <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg> Actualiser</>
              )}
            </button>
          </div>

          {!loading && items.length > 0 && (
            <div className="sc-status-chips">
              {(Object.entries(STATUS_MAP) as [ContributionStatus, typeof STATUS_MAP[ContributionStatus]][]).map(([key, s]) => {
                const count = items.filter((c) => c.status === key).length;
                if (count === 0) return null;
                return (
                  <button key={key} className="sc-chip" style={{ color: s.color, background: s.bg, borderColor: s.border }} onClick={() => { setStatus(key); void load(key); }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    {s.label} <span>{count}</span>
                  </button>
                );
              })}
              {status && (
                <button className="sc-chip" style={{ color: '#6B7280', background: '#F9FAFB', borderColor: '#E5E7EB' }} onClick={() => { setStatus(''); void load(''); }}>
                  <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg> Réinitialiser
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="sc-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" /></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="sc-loader"><div className="sc-ring" />Chargement…</div>
          ) : !error && displayedItems.length === 0 ? (
            <div className="sc-empty">
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.3"><path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              <div className="sc-empty-title">Aucune cotisation trouvée pour ce statut</div>
              <div className="sc-empty-sub">Essayez de modifier le filtre ou de réinitialiser.</div>
            </div>
          ) : !error ? (
            <>
              <table className="sct-table">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Membre</th>
                    <th style={{ width: '20%' }}>Antenne</th>
                    <th style={{ width: '15%' }}>Montant</th>
                    <th style={{ width: '15%' }}>Date</th>
                    <th style={{ width: '15%' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedItems.map((contribution) => {
                    const statusStyles = STATUS_MAP[contribution.status] || STATUS_MAP.PENDING;
                    const memberName = `${contribution.member?.firstName ?? ''} ${contribution.member?.lastName ?? ''}`.trim() || '—';

                    return (
                      <tr key={contribution.id} className="sct-row" onClick={() => setSelectedItem(contribution)} title="Cliquer pour voir les détails">
                        <td>
                          <div className="sct-member-cell">
                            <div className="sct-avatar">{getInitials(memberName)}</div>
                            <div className="sct-member">
                              <span className="sct-member-name">{memberName}</span>
                              <span className="sct-member-email">{contribution.member?.email ?? '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td>{contribution.antenna?.name || '-'}</td>
                        <td className="sct-amount">{formatCurrency(contribution.amount, contribution.currency || 'EUR')}</td>
                        <td className="sct-date">{formatDate(contribution.contributionDate || contribution.createdAt)}</td>
                        <td>
                          <span className="sct-status" style={{ color: statusStyles.color, background: statusStyles.bg, border: `1px solid ${statusStyles.border}` }}>
                            <span className="sct-status-dot" style={{ background: statusStyles.color }} />
                            {statusStyles.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="sct-cards">
                {displayedItems.map((contribution) => {
                  const statusStyles = STATUS_MAP[contribution.status] || STATUS_MAP.PENDING;
                  const memberName = `${contribution.member?.firstName ?? ''} ${contribution.member?.lastName ?? ''}`.trim() || '—';

                  return (
                    <div key={contribution.id} className="sct-card" onClick={() => setSelectedItem(contribution)}>
                      <div className="sct-card-head">
                        <div className="sct-card-member">
                          <div className="sct-avatar">{getInitials(memberName)}</div>
                          <span className="sct-member-name">{memberName}</span>
                        </div>
                        <span className="sct-status" style={{ color: statusStyles.color, background: statusStyles.bg, border: `1px solid ${statusStyles.border}` }}>
                          <span className="sct-status-dot" style={{ background: statusStyles.color }} />
                          {statusStyles.label}
                        </span>
                      </div>
                      <div className="sct-card-foot">
                        <span className="sct-card-date">Le {formatDate(contribution.contributionDate || contribution.createdAt)}</span>
                        <span style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 600 }}>Détails ➔</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* ⚡ MODALE D'EXPORTATION SANS SURCHARGER LA PAGE */}
      {exportModalType && (
        <div className="modal-overlay" onClick={() => !actionBusy && setExportModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: '2.5rem', maxWidth: '540px' }}>
            <div className="modal-header" style={{ padding: 0, border: 'none', position: 'relative', marginBottom: '2rem' }}>
              <h2 className="modal-title" style={{ fontSize: '2rem' }}>
                Exporter en <span style={{ color: exportModalType === 'EXCEL' ? '#10B981' : '#DC2626' }}>{exportModalType === 'EXCEL' ? 'Excel' : 'PDF'}</span>
              </h2>
              <button className="modal-close" onClick={() => setExportModalType(null)} style={{ position: 'absolute', right: 0, top: 0 }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="export-flex-row">
              <div className="export-flex-item full">
                <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '.5rem', textTransform: 'uppercase' }}>Filtrer par Antenne</label>
                <select className="sc-select" value={exportAntenna} onChange={e => setExportAntenna(e.target.value)} style={{ width: '100%', height: '46px', background: '#f8fafc', paddingRight: '0.85rem', backgroundImage: 'none' }}>
                  <option value="">Toutes les antennes (Global)</option>
                  {antennas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="export-flex-item">
                <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '.5rem', textTransform: 'uppercase' }}>Période (Début)</label>
                <input type="month" className="sc-select" value={exportStartMonth} onChange={e => setExportStartMonth(e.target.value)} style={{ width: '100%', height: '46px', background: '#f8fafc', paddingRight: '0.85rem', backgroundImage: 'none' }} />
              </div>
              <div className="export-flex-item">
                <label style={{ fontSize: '.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '.5rem', textTransform: 'uppercase' }}>Période (Fin)</label>
                <input type="month" className="sc-select" value={exportEndMonth} onChange={e => setExportEndMonth(e.target.value)} style={{ width: '100%', height: '46px', background: '#f8fafc', paddingRight: '0.85rem', backgroundImage: 'none' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button className="btn-cancel" style={{ flex: 1 }} onClick={() => setExportModalType(null)} disabled={actionBusy}>Annuler</button>
              <button 
                className="btn-save" 
                style={{ flex: 1.5, background: exportModalType === 'EXCEL' ? '#10B981' : '#DC2626' }} 
                onClick={() => void executeExport()} 
                disabled={actionBusy}
              >
                {actionBusy ? 'Génération...' : 'Télécharger le document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DÉTAILS DE LA COTISATION ── */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h2 className="modal-title">Détails de la cotisation</h2>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="modal-body">
              <div className="sc-modal-hero">
                <span className="sc-modal-hero-label">Montant de la cotisation</span>
                <span className="sc-modal-hero-amount">
                  {formatCurrency(selectedItem.amount, selectedItem.currency || 'EUR')}
                </span>
              </div>

              <div className="sm-section-divider">Informations Membre</div>
              <div className="sm-dp-grid" style={{ marginBottom: '1rem', gridTemplateColumns: '1fr' }}>
                <div className="sm-dp-field full">
                  <div className="sc-modal-user">
                    <div className="sc-modal-avatar">
                      {getInitials(`${selectedItem.member?.firstName ?? ''} ${selectedItem.member?.lastName ?? ''}`.trim() || '—')}
                    </div>
                    <div>
                      <div className="sm-dp-value" style={{ padding: 0 }}>
                        {`${selectedItem.member?.firstName ?? ''} ${selectedItem.member?.lastName ?? ''}`.trim() || '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
                        {selectedItem.member?.email ?? 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="sm-section-divider">Détails de la transaction</div>
              <div className="sm-dp-grid">
                <div className="sm-dp-field">
                  <label>Type</label>
                  <div className="sm-dp-value" style={{ fontWeight: 800 }}>{formatContributionType((selectedItem as any).type)}</div>
                </div>
                <div className="sm-dp-field">
                  <label>Statut</label>
                  <div className="sm-dp-value">
                    <span className="sct-status" style={{ color: (STATUS_MAP[selectedItem.status] || STATUS_MAP.PENDING).color, background: (STATUS_MAP[selectedItem.status] || STATUS_MAP.PENDING).bg, border: `1px solid ${(STATUS_MAP[selectedItem.status] || STATUS_MAP.PENDING).border}` }}>
                      <span className="sct-status-dot" style={{ background: (STATUS_MAP[selectedItem.status] || STATUS_MAP.PENDING).color }} />
                      {(STATUS_MAP[selectedItem.status] || STATUS_MAP.PENDING).label}
                    </span>
                  </div>
                </div>
                <div className="sm-dp-field">
                  <label>Mois / Date</label>
                  <div className="sm-dp-value">{formatDate(selectedItem.contributionDate || selectedItem.createdAt)}</div>
                </div>
                <div className="sm-dp-field">
                  <label>Antenne</label>
                  <div className="sm-dp-value">{selectedItem.antenna?.name || '—'}</div>
                </div>
                <div className="sm-dp-field">
                  <label>Méthode</label>
                  <div className="sm-dp-value">{METHOD_LABELS[selectedItem.paymentMethod || ''] || selectedItem.paymentMethod || '—'}</div>
                </div>
                <div className="sm-dp-field full">
                  <label>Référence Interne</label>
                  <div className="sm-dp-value" style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', color: '#6B7280' }}>
                    {selectedItem.id}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </AppShell>
  );
}