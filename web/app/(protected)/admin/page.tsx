// web/app/(protected)/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { api } from '../../../lib/api-client';
import { formatCurrency } from '../../../lib/format';

interface PendingAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

interface DashboardData {
  antennaName: string;
  stats: {
    members: number;
    pendingApprovals: number;
    pendingContributions: number;
    activeProjects: number;
    totalValidatedAmount: number;
    currency?: string;
  };
  antennaBalances?: {
    id: string;
    name: string;
    balance: number;
    currency: string;
  }[];
  recentPendingAccounts: PendingAccount[];
}

type StatCard = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  sub: string;
  spanClass: string;
  trendUp?: boolean | null;
  urgent?: boolean;
  clickable?: boolean;
  wide?: boolean;
  onClick?: () => void;
};

function getInitials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ══════════════════════════════════════════════════════ BALANCES MODAL */
function BalancesModal({
  balances, onClose
}: {
  balances?: { id: string; name: string; balance: number; currency: string }[];
  onClose: () => void;
}) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }}
        onClick={onClose}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 101, background: 'rgba(253,253,255,.98)', backdropFilter: 'blur(18px)',
        borderRadius: 22, padding: 'clamp(1.5rem,4vw,2rem)',
        width: 'min(480px,calc(100vw - 2rem))',
        border: '1px solid rgba(37,99,235,.15)',
        boxShadow: '0 24px 60px rgba(37,99,235,.12)',
        maxHeight: '85vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            Soldes par antenne
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {!balances || balances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280', fontSize: '0.85rem' }}>
              Aucune donnée de solde disponible.
            </div>
          ) : (
            balances.map((b) => (
              <div key={b.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.9rem 1.1rem', background: '#F9FAFB', borderRadius: 14,
                border: '1px solid #F3F4F6'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{b.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.95rem', fontWeight: 800, color: '#1D4ED8' }}>
                  {formatCurrency(b.balance, b.currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function AntennaAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null); // <-- AJOUT DE LA VARIABLE D'ERREUR
  const [showBalancesModal, setShowBalancesModal] = useState(false);

  useEffect(() => {
    // <-- AJOUT DU TRY/CATCH POUR GÉRER L'ERREUR PROPREMENT
    void (async () => {
      try {
        const res = await api.dashboardAntennaAdmin();
        setData(res as unknown as DashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement dashboard');
      }
    })();
  }, []);

  const cur = data?.stats?.currency || 'EUR';

  const stats: StatCard[] = data ? [
    {
      label: 'Membres actifs',
      value: data.stats.members,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: '#2563EB', bg: '#EFF6FF',
      sub: '+3 ce mois',
      trendUp: true,
      spanClass: 'ad-span-1'
    },
    {
      label: 'Adhésions en attente',
      value: data.stats.pendingApprovals,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: '#D97706', bg: '#FFFBEB',
      sub: 'À traiter',
      urgent: data.stats.pendingApprovals > 0,
      spanClass: 'ad-span-1'
    },
    {
      label: 'Cotisations à valider',
      value: data.stats.pendingContributions,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      color: '#7C3AED', bg: '#F5F3FF',
      sub: 'En attente',
      spanClass: 'ad-span-1'
    },
    {
      label: 'Total récolté',
      value: formatCurrency(data.stats.totalValidatedAmount, cur),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: '#059669', bg: '#ECFDF5',
      sub: '+12% vs mois dernier',
      trendUp: true,
      spanClass: 'ad-span-1'
    },
    {
      label: 'Projets actifs',
      value: data.stats.activeProjects,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: '#0891B2', bg: '#ECFEFF',
      sub: 'En cours',
      spanClass: 'ad-span-1'
    },
    {
      label: 'Taux de cotisation',
      value: data.stats.members > 0
        ? `${Math.round(((data.stats.members - (data.stats.pendingApprovals ?? 0)) / data.stats.members) * 100)}%`
        : '—',
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      color: '#BE185D', bg: '#FDF2F8',
      sub: 'Membres à jour',
      spanClass: 'ad-span-1'
    },
    {
      label: 'Autres soldes',
      value: 'Voir détails',
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
      ),
      color: '#2563EB', bg: '#EFF6FF', sub: 'Détails par antenne',
      clickable: true,
      wide: true,
      onClick: () => setShowBalancesModal(true),
      spanClass: 'ad-span-6'
    },
  ] : [];

  return (
    <AppShell title="Tableau de bord">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        .ad-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1280px;
          margin: 0 auto;
        }

        /* ── Page header ── */
        .ad-page-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(37,99,235,0.10);
          opacity: 0;
          transform: translateY(12px);
          animation: fadein 0.5s 0.05s cubic-bezier(.22,1,.36,1) forwards;
        }
        .ad-eyebrow {
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #2563EB;
          margin-bottom: 0.35rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .ad-eyebrow-dot {
          width: 6px; height: 6px;
          background: #3B82F6;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        .ad-page-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.55rem, 3vw, 2rem);
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .ad-page-title span {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .ad-date {
          font-size: 0.78rem;
          font-weight: 600;
          color: #6B7280;
          background: rgba(37,99,235,0.05);
          border: 1px solid rgba(37,99,235,0.12);
          border-radius: 8px;
          padding: 0.45rem 0.85rem;
          white-space: nowrap;
        }

        /* ── Stats grid ── */
        .ad-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.75rem;
        }
        .ad-span-1 { grid-column: span 1; }
        .ad-span-6 { grid-column: span 6; }

        @media (max-width: 1100px) {
          .ad-stats { grid-template-columns: repeat(3, 1fr); }
          .ad-span-6 { grid-column: span 3; }
        }

        @media (max-width: 768px) {
          .ad-stats { grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
          .ad-span-6 { grid-column: span 3; }

          .ad-stat-card {
            padding: 0.6rem 0.5rem !important;
            border-radius: 12px !important;
          }
          .ad-stat-value { font-size: 1.1rem !important; word-break: break-word; }
          .ad-stat-label { font-size: 0.52rem !important; }
          .ad-stat-sub   { font-size: 0.5rem !important; }
          .ad-stat-icon  { width: 24px !important; height: 24px !important; border-radius: 6px !important; }
          .ad-stat-icon svg { width: 12px; height: 12px; }
          .ad-stat-top { flex-direction: column-reverse !important; gap: 0.2rem !important; margin-bottom: 0.4rem !important; }
          
          .ad-stat-card.wide { padding: 0.8rem !important; gap: 0.6rem !important; flex-direction: column !important; align-items: flex-start !important; }
          .ad-stat-card.wide .ad-stat-value { font-size: 1.4rem !important; margin-bottom: 0 !important; }
        }

        .ad-stat-card {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          padding: 1.1rem 1.15rem;
          border: 1px solid rgba(37,99,235,0.10);
          box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset;
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(16px);
          animation: fadein 0.5s cubic-bezier(.22,1,.36,1) forwards;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .ad-stat-clickable { cursor: pointer; }
        .ad-stat-clickable:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 12px 24px rgba(37,99,235,0.12), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        .ad-stat-card:not(.ad-stat-clickable):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37,99,235,0.10), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        .ad-stat-card.wide {
          display: flex; align-items: center;
          gap: 1.25rem; padding: 1rem 1.4rem;
        }
        .ad-stat-card.urgent::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 18px;
          border: 1.5px solid currentColor;
          pointer-events: none;
          animation: urgentborder 2s ease-in-out infinite;
        }
        @keyframes urgentborder {
          0%,100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        .ad-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.7rem;
        }
        .ad-stat-label {
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6B7280;
          line-height: 1.4;
          max-width: 90px;
        }
        .ad-stat-icon {
          width: 32px; height: 32px;
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .ad-stat-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.9rem;
          font-weight: 700;
          color: #111827;
          letter-spacing: -0.03em;
          line-height: 1;
          margin-bottom: 0.35rem;
          word-break: break-word;
        }
        .ad-stat-card.wide .ad-stat-value { font-size: 2.2rem; margin-bottom: 0.2rem; }
        .ad-stat-sub {
          font-size: 0.66rem;
          font-weight: 600;
          color: #6B7280;
          display: flex; align-items: center; gap: 0.25rem;
        }
        .ad-stat-sub.up { color: #059669; }

        /* ── Bottom grid ── */
        .ad-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 768px) { .ad-bottom { grid-template-columns: 1fr; } }

        .ad-panel {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.10);
          box-shadow: 0 2px 12px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden;
          opacity: 0;
          animation: fadein 0.5s 0.3s cubic-bezier(.22,1,.36,1) forwards;
        }

        .ad-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.15rem 1.4rem;
          border-bottom: 1px solid rgba(37,99,235,0.08);
        }
        .ad-panel-title {
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #374151;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .ad-panel-icon {
          width: 28px; height: 28px;
          background: #EFF6FF;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #2563EB;
        }
        .ad-panel-badge {
          font-size: 0.68rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
          border-radius: 99px;
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FDE68A;
        }
        .ad-panel-body { padding: 0.5rem 0; }

        /* Member rows */
        .ad-member-row {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.75rem 1.4rem;
          transition: background 0.18s;
          cursor: default;
        }
        .ad-member-row:hover { background: rgba(37,99,235,0.03); }
        .ad-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
          background: linear-gradient(135deg, #2563EB, #3B82F6);
        }
        .ad-member-info { flex: 1; min-width: 0; }
        .ad-member-name {
          font-size: 0.84rem;
          font-weight: 700;
          color: #111827;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ad-member-email {
          font-size: 0.72rem;
          color: #9CA3AF;
          font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ad-member-date {
          font-size: 0.7rem;
          font-weight: 700;
          color: #6B7280;
          background: #F3F4F6;
          border-radius: 6px;
          padding: 0.2rem 0.55rem;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .ad-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1rem;
          gap: 0.6rem;
          color: #9CA3AF;
        }
        .ad-empty-icon {
          width: 44px; height: 44px;
          background: #F9FAFB;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 0.25rem;
        }
        .ad-empty p { font-size: 0.82rem; font-weight: 600; }

        /* Alerts panel */
        .ad-alert-item {
          display: flex;
          gap: 0.85rem;
          align-items: flex-start;
          padding: 1rem 1.4rem;
          border-bottom: 1px solid rgba(37,99,235,0.06);
          transition: background 0.18s;
        }
        .ad-alert-item:last-child { border-bottom: none; }
        .ad-alert-item:hover { background: rgba(37,99,235,0.02); }
        .ad-alert-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .ad-alert-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.2rem;
        }
        .ad-alert-desc {
          font-size: 0.76rem;
          color: #6B7280;
          line-height: 1.55;
          font-weight: 500;
        }
        .ad-alert-action {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          margin-top: 0.5rem;
          font-size: 0.73rem;
          font-weight: 800;
          color: #2563EB;
          cursor: pointer;
          transition: gap 0.2s;
          background: none; border: none; padding: 0;
          font-family: 'DM Sans', sans-serif;
        }
        .ad-alert-action:hover { gap: 0.5rem; }

        /* Loader & Error */
        .ad-loader {
          display: flex; flex-direction: column;
          align-items: center; gap: 1rem;
          color: #6B7280; font-size: 0.82rem; font-weight: 600;
        }
        .ad-loader-ring {
          width: 40px; height: 40px;
          border: 3px solid rgba(37,99,235,0.1);
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .ad-error {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 1rem 1.25rem;
          background: rgba(185,28,28,0.06);
          border: 1px solid rgba(185,28,28,0.18);
          border-radius: 14px; color: #B91C1C;
          font-size: 0.82rem; font-weight: 700; margin-bottom: 1.5rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadein { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Affichage des erreurs éventuelles (ex: Aucune antenne assignée) */}
      {error && (
        <div className="ad-wrap" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="ad-error">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Affichage du loader */}
      {!data && !error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="ad-loader">
            <div className="ad-loader-ring" />
            <span>Chargement…</span>
          </div>
        </div>
      )}

      {/* Affichage du dashboard */}
      {data && (
        <div className="ad-wrap">

          {/* Page header */}
          <div className="ad-page-header">
            <div>
              <div className="ad-eyebrow">
                <div className="ad-eyebrow-dot" />
                Espace administrateur
              </div>
              <h1 className="ad-page-title">
                Tableau de bord · <span>{data.antennaName}</span>
              </h1>
            </div>
            <div className="ad-date">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Stats — 6 cartes normales + 1 wide, 3 par ligne sur mobile */}
          <div className="ad-stats">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`ad-stat-card ${s.spanClass} ${s.urgent ? ' urgent' : ''} ${s.clickable ? ' ad-stat-clickable' : ''} ${s.wide ? 'wide' : ''}`}
                style={{ animationDelay: `${0.08 + i * 0.06}s` }}
                onClick={s.onClick}
              >
                {/* accent bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: `linear-gradient(${s.wide ? '180deg' : '90deg'}, ${s.color}, ${s.color}55)`,
                  borderRadius: '18px 18px 0 0',
                }} />

                {s.wide ? (
                  <>
                    <div className="ad-stat-icon" style={{ background: s.bg, color: s.color, width: 44, height: 44, borderRadius: 13 }}>
                      {s.icon}
                    </div>
                    <div>
                      <div className="ad-stat-label" style={{ marginBottom: '0.3rem' }}>{s.label}</div>
                      <div className="ad-stat-value" style={{ color: s.urgent ? s.color : (s.clickable ? s.color : '#111827') }}>{String(s.value)}</div>
                      <div className="ad-stat-sub">{s.sub}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ad-stat-top">
                      <span className="ad-stat-label">{s.label}</span>
                      <div className="ad-stat-icon" style={{ background: s.bg, color: s.color }}>
                        {s.icon}
                      </div>
                    </div>
                    <div className="ad-stat-value" style={{ color: s.urgent ? s.color : '#111827' }}>
                      {s.value}
                    </div>
                    <div className={`ad-stat-sub${s.trendUp === true ? ' up' : ''}`}>
                      {s.trendUp === true && (
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                        </svg>
                      )}
                      {s.sub}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Bottom panels */}
          <div className="ad-bottom">

            {/* Pending accounts */}
            <div className="ad-panel">
              <div className="ad-panel-header">
                <div className="ad-panel-title">
                  <div className="ad-panel-icon">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                  </div>
                  Demandes d&apos;adhésion
                </div>
                {data.recentPendingAccounts.length > 0 && (
                  <span className="ad-panel-badge">{data.recentPendingAccounts.length} en attente</span>
                )}
              </div>
              <div className="ad-panel-body">
                {data.recentPendingAccounts.length > 0 ? (
                  data.recentPendingAccounts.map((acc) => (
                    <div key={acc.id} className="ad-member-row">
                      <div className="ad-avatar">{getInitials(acc.firstName, acc.lastName)}</div>
                      <div className="ad-member-info">
                        <div className="ad-member-name">{acc.firstName} {acc.lastName}</div>
                        <div className="ad-member-email">{acc.email}</div>
                      </div>
                      <div className="ad-member-date">{timeAgo(acc.createdAt)}</div>
                    </div>
                  ))
                ) : (
                  <div className="ad-empty">
                    <div className="ad-empty-icon">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <p>Aucune demande en attente</p>
                  </div>
                )}
              </div>
            </div>

            {/* Alerts */}
            <div className="ad-panel" style={{ animationDelay: '0.35s' }}>
              <div className="ad-panel-header">
                <div className="ad-panel-title">
                  <div className="ad-panel-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                  </div>
                  Alertes &amp; Rappels
                </div>
              </div>
              <div>
                <div className="ad-alert-item">
                  <div className="ad-alert-dot" style={{ background: '#F59E0B' }} />
                  <div>
                    <div className="ad-alert-title">Membres en retard de cotisation</div>
                    <div className="ad-alert-desc">
                      Certains membres n&apos;ont pas cotisé depuis plus de 3 mois. Un rappel automatique peut être envoyé.
                    </div>
                    <button className="ad-alert-action">
                      Voir la liste
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {data.stats.pendingContributions > 0 && (
                  <div className="ad-alert-item">
                    <div className="ad-alert-dot" style={{ background: '#7C3AED' }} />
                    <div>
                      <div className="ad-alert-title">{data.stats.pendingContributions} cotisation{data.stats.pendingContributions > 1 ? 's' : ''} à valider</div>
                      <div className="ad-alert-desc">
                        Des paiements soumis par les membres attendent votre validation.
                      </div>
                      <button className="ad-alert-action" style={{ color: '#7C3AED' }}>
                        Valider maintenant
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                <div className="ad-alert-item">
                  <div className="ad-alert-dot" style={{ background: '#059669' }} />
                  <div>
                    <div className="ad-alert-title">Projets actifs</div>
                    <div className="ad-alert-desc">
                      {data.stats.activeProjects} projet{data.stats.activeProjects !== 1 ? 's' : ''} en cours nécessite{data.stats.activeProjects === 1 ? '' : 'nt'} un suivi régulier.
                    </div>
                    <button className="ad-alert-action" style={{ color: '#059669' }}>
                      Suivre les projets
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modale des autres soldes */}
      {showBalancesModal && (
        <BalancesModal
          balances={data?.antennaBalances}
          onClose={() => setShowBalancesModal(false)}
        />
      )}
    </AppShell>
  );
}