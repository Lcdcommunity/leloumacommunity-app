// web/app/(protected)/admin/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
    totalValidatedAmount?: number;
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
  onClick?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days} jours`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// 4 devises fixes — toujours affichées même si solde = 0
const FIXED_CURRENCIES = [
  { cur: "GNF", label: "Solde antennes (GNF)",    color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { cur: "EUR", label: "Solde antennes (Euro)",    color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  { cur: "USD", label: "Solde antennes (Dollar)",  color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  { cur: "XOF", label: "Solde antennes (XOF)",     color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PENDING: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  };
  const s = map[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.68rem', fontWeight: 700,
      color: s.color, background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 99, padding: '0.18rem 0.58rem', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9CA3AF', fontSize: '0.78rem' }}>
        {label}
      </td>
    </tr>
  );
}

// ─── Modals ──────────────────────────────────────────────────────────────────

function BalancesModal({
  currency,
  balances,
  onClose
}: {
  currency: string;
  balances?: { id: string; name: string; balance: number; currency: string }[];
  onClose: () => void;
}) {
  const label = FIXED_CURRENCIES.find(c => c.cur === currency)?.label ?? `Soldes — ${currency}`;
  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", backdropFilter: "blur(4px)", zIndex: 100 }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 101, background: "rgba(253,253,255,.98)", backdropFilter: "blur(18px)",
        borderRadius: 22, padding: "clamp(1.5rem,4vw,2rem)",
        width: "min(480px,calc(100vw - 2rem))",
        border: "1px solid rgba(37,99,235,.15)",
        boxShadow: "0 24px 60px rgba(37,99,235,.12)",
        maxHeight: "85vh", overflowY: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700, color: "#111827", margin: 0 }}>
            {label}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {!balances || balances.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF", fontSize: "0.85rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏦</div>
              Aucune antenne n&apos;utilise cette devise pour le moment.
            </div>
          ) : (
            balances.map((b) => (
              <div key={b.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.9rem 1.1rem", background: "#F9FAFB", borderRadius: 14,
                border: "1px solid #F3F4F6"
              }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>{b.name}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.95rem", fontWeight: 800, color: "#1D4ED8" }}>
                  {formatCurrency(b.balance, b.currency || currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function AccountDetailModal({ user, onClose }: { user: PendingAccount; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', animation: 'fadein 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, padding: '1.5rem', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div className="ad-user-cell" style={{ gap: '1rem' }}>
            <div className="ad-avatar" style={{ width: 48, height: 48, fontSize: '1.1rem' }}>{getInitials(user.firstName, user.lastName)}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{user.firstName} {user.lastName}</h2>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.2rem' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6B7280', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Statut</span>
            <StatusBadge status="PENDING" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Date d&apos;inscription</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>{new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AntennaAdminDashboard() {
  const router = useRouter(); // Injection du routeur pour les liens cliquables
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<PendingAccount | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const res = await api.dashboardAntennaAdmin();
        if (isMounted) setData(res as unknown as DashboardData);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Erreur chargement dashboard");
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Grouper les soldes par devise
  const currencyGroups = useMemo(() => {
    if (!data?.antennaBalances) return {} as Record<string, { total: number; antennas: { id: string; name: string; balance: number; currency: string }[] }>;
    return data.antennaBalances.reduce((acc, curr) => {
      const cur = curr.currency || "GNF";
      if (!acc[cur]) acc[cur] = { total: 0, antennas: [] };
      acc[cur].total += curr.balance;
      acc[cur].antennas.push(curr);
      return acc;
    }, {} as Record<string, { total: number; antennas: { id: string; name: string; balance: number; currency: string }[] }>);
  }, [data]);

  // 4 cartes fixes de soldes
  const currencyCards: StatCard[] = FIXED_CURRENCIES.map(({ cur, label, color, bg }) => {
    const group = currencyGroups[cur] ?? { total: 0, antennas: [] };
    const antennaCount = group.antennas.length;
    return {
      label,
      value: formatCurrency(group.total, cur),
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      color, bg,
      sub: antennaCount > 0
        ? `${antennaCount} antenne${antennaCount > 1 ? "s" : ""} · Clic pour détails`
        : "Aucune antenne · Clic pour détails",
      clickable: true,
      onClick: () => setSelectedCurrency(cur),
      spanClass: "ad-span-1",
    };
  });

  const stats: StatCard[] = data ? [
    {
      label: "Membres de l'antenne",
      value: data.stats.members,
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "#2563EB", bg: "#EFF6FF", sub: "Membres actifs", trendUp: true, spanClass: "ad-span-1",
    },
    {
      label: "Adhésions en attente",
      value: data.stats.pendingApprovals,
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "#D97706", bg: "#FFFBEB", sub: "À traiter",
      urgent: data.stats.pendingApprovals > 0, spanClass: "ad-span-1",
    },
    {
      label: "Cotisations à valider",
      value: data.stats.pendingContributions,
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      color: "#7C3AED", bg: "#F5F3FF", sub: "En attente", spanClass: "ad-span-1",
    },
    ...currencyCards,
    {
      label: "Projets actifs",
      value: data.stats.activeProjects,
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: "#0891B2", bg: "#ECFEFF", sub: "En cours", spanClass: "ad-span-1",
    },
    {
      label: "Taux de cotisation",
      value: data.stats.members > 0
        ? `${Math.round(((data.stats.members - (data.stats.pendingApprovals ?? 0)) / data.stats.members) * 100)}%`
        : "—",
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      color: "#BE185D", bg: "#FDF2F8", sub: "Membres à jour", spanClass: "ad-span-1",
    },
  ] : [];

  return (
    <AppShell title="Tableau de bord">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        .ad-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1280px;margin:0 auto}
        .ad-page-header{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid rgba(37,99,235,0.10);opacity:0;transform:translateY(12px);animation:fadein .5s .05s cubic-bezier(.22,1,.36,1) forwards}
        .ad-eyebrow{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ad-eyebrow-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:pulse-dot 2s ease-in-out infinite}
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
        .ad-page-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.55rem,3vw,2rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ad-page-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .ad-date{font-size:.78rem;font-weight:600;color:#6B7280;background:rgba(37,99,235,.05);border:1px solid rgba(37,99,235,.12);border-radius:8px;padding:.45rem .85rem;white-space:nowrap}

        /* ── Stats Grids ── */
        .ad-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.85rem; margin-bottom: 1.75rem; }
        .ad-stats-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.85rem; margin-bottom: 1.75rem; }
        .ad-stats-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.85rem; margin-bottom: 1.75rem; }

        .ad-section-label{font-size:.65rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;margin:0 0 .65rem;display:flex;align-items:center;gap:.5rem;width:100%}
        .ad-section-label::after{content:'';flex:1;height:1px;background:rgba(0,0,0,.06)}

        /* CARTES CENTRÉES */
        .ad-stat-card {
            background:rgba(253,253,255,.9); backdrop-filter:blur(12px); border-radius:18px; padding:1.4rem 1.15rem;
            border:1px solid rgba(37,99,235,.10); box-shadow:0 2px 12px rgba(37,99,235,.05),0 0 0 1px rgba(255,255,255,.8) inset;
            position:relative; overflow:hidden; opacity:0; transform:translateY(16px);
            animation:fadein .5s cubic-bezier(.22,1,.36,1) forwards; transition:transform .2s,box-shadow .2s;
            display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .ad-stat-clickable{cursor:pointer}
        .ad-stat-clickable:hover{transform:translateY(-3px) scale(1.01);box-shadow:0 12px 24px rgba(37,99,235,.12),0 0 0 1px rgba(255,255,255,.9) inset}
        .ad-stat-card:not(.ad-stat-clickable):hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,99,235,.10),0 0 0 1px rgba(255,255,255,.9) inset}
        .ad-stat-card.urgent::after{content:'';position:absolute;inset:0;border-radius:18px;border:1.5px solid currentColor;pointer-events:none;animation:urgentborder 2s ease-in-out infinite}
        @keyframes urgentborder{0%,100%{opacity:.4}50%{opacity:1}}

        .ad-stat-currency{border-color:rgba(5,150,105,.15);background:linear-gradient(135deg,rgba(240,253,244,.9),rgba(253,253,255,.9))}

        /* NOUVEAU LAYOUT CENTRÉ POUR LE HAUT DE CARTE */
        .ad-stat-top {
            display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem; width: 100%;
        }
        .ad-stat-label {
            font-size:.68rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
            color:#6B7280; line-height:1.4; max-width:100%; text-align: center;
        }
        .ad-stat-icon {
            width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0;
            margin-bottom: 0.2rem;
        }
        .ad-stat-value {
            font-family:'Cormorant Garamond',serif; font-size:2rem; font-weight:700; color:#111827;
            letter-spacing:-.03em; line-height:1; margin-bottom:.4rem; word-break:break-word; text-align: center;
        }
        .ad-stat-sub {
            font-size:.7rem; font-weight:600; color:#6B7280; display:flex; align-items:center; justify-content: center; gap:.3rem;
        }
        .ad-stat-sub.up{color:#059669}

        @media(max-width:900px){
          .ad-stats-4 { grid-template-columns: repeat(2, 1fr); }
        }

        /* Responsive Mobile Centré */
        @media(max-width:768px){
          .ad-stats, .ad-stats-4 { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
          .ad-stats-2 { grid-template-columns: repeat(2, 1fr); gap: 0.6rem; }
          .ad-stat-card { padding: 1.2rem 0.6rem !important; border-radius: 14px !important; }
          .ad-stat-value { font-size: 1.5rem !important; }
          .ad-stat-label { font-size: 0.6rem !important; }
          .ad-stat-sub   { font-size: 0.6rem !important; }
          .ad-stat-icon  { width: 32px !important; height: 32px !important; border-radius: 8px !important; }
          .ad-stat-icon svg { width: 16px; height: 16px; }
          .ad-stat-top { gap: 0.4rem !important; margin-bottom: 0.6rem !important; }
        }

        .ad-bottom{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        @media(max-width:768px){.ad-bottom{grid-template-columns:1fr}}
        .ad-panel{background:rgba(253,253,255,.9);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(37,99,235,.10);box-shadow:0 2px 12px rgba(37,99,235,.05),0 0 0 1px rgba(255,255,255,.8) inset;overflow:hidden;opacity:0;animation:fadein .5s .3s cubic-bezier(.22,1,.36,1) forwards}
        .ad-panel-header{display:flex;align-items:center;justify-content:space-between;padding:1.15rem 1.4rem;border-bottom:1px solid rgba(37,99,235,.08)}
        .ad-panel-title{font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#374151;display:flex;align-items:center;gap:.5rem}
        .ad-panel-icon{width:28px;height:28px;background:#EFF6FF;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#2563EB}
        .ad-panel-badge{font-size:.68rem;font-weight:800;padding:.2rem .6rem;border-radius:99px;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A}
        .ad-panel-body{padding:.5rem 0}
        
        /* ── Tables Modernes ── */
        .ad-table { width: 100%; border-collapse: collapse; }
        .ad-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.08); }
        .ad-table thead th { padding: 0.6rem 1.2rem; font-size: 0.63rem; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: #9CA3AF; text-align: left; white-space: nowrap; }
        .ad-table tbody tr { border-bottom: 1px solid rgba(37,99,235,0.05); transition: background 0.15s; }
        .ad-table tbody tr:last-child { border-bottom: none; }
        .ad-row-clickable { cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .ad-row-clickable:hover { background: rgba(37,99,235,0.04) !important; }
        .ad-row-clickable:active { background: rgba(37,99,235,0.08) !important; }
        .ad-table td { padding: 0.65rem 1.2rem; font-size: 0.79rem; color: #374151; font-weight: 500; vertical-align: middle; }
        .ad-table td.muted { color: #9CA3AF; font-size: 0.72rem; }
        
        .ad-user-cell { display: flex; align-items: center; gap: 0.55rem; }
        .ad-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; color: white; flex-shrink: 0; background: linear-gradient(135deg, #2563EB, #3B82F6); }
        .ad-member-name { font-size: 0.8rem; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ad-member-email { font-size: 0.68rem; color: #9CA3AF; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .hide-desktop { display: none !important; }
        
        @media(max-width:768px){
          .hide-mobile { display: none !important; }
          .hide-desktop { display: block !important; }
          .ad-table th { padding: 0.5rem 0.6rem; font-size: 0.55rem; }
          .ad-table td { padding: 0.6rem 0.6rem; font-size: 0.7rem; }
          .ad-panel-header { padding: 1rem; }
        }

        .ad-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem 1rem;gap:.6rem;color:#9CA3AF}
        .ad-empty-icon{width:44px;height:44px;background:#F9FAFB;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:.25rem}
        .ad-empty p{font-size:.82rem;font-weight:600}
        .ad-alert-item{display:flex;gap:.85rem;align-items:flex-start;padding:1rem 1.4rem;border-bottom:1px solid rgba(37,99,235,.06);transition:background .18s}
        .ad-alert-item:last-child{border-bottom:none}
        .ad-alert-item:hover{background:rgba(37,99,235,.02)}
        .ad-alert-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0}
        .ad-alert-title{font-size:.82rem;font-weight:700;color:#111827;margin-bottom:.2rem}
        .ad-alert-desc{font-size:.76rem;color:#6B7280;line-height:1.55;font-weight:500}
        .ad-alert-action{display:inline-flex;align-items:center;gap:.3rem;margin-top:.5rem;font-size:.73rem;font-weight:800;color:#2563EB;cursor:pointer;transition:gap .2s;background:none;border:none;padding:0;font-family:'DM Sans',sans-serif}
        .ad-alert-action:hover{gap:.5rem}
        .ad-loader{display:flex;flex-direction:column;align-items:center;gap:1rem;color:#6B7280;font-size:.82rem;font-weight:600}
        .ad-loader-ring{width:40px;height:40px;border:3px solid rgba(37,99,235,.1);border-top-color:#2563EB;border-radius:50%;animation:spin .8s linear infinite}
        .ad-error{display:flex;align-items:center;gap:.6rem;padding:1rem 1.25rem;background:rgba(185,28,28,.06);border:1px solid rgba(185,28,28,.18);border-radius:14px;color:#B91C1C;font-size:.82rem;font-weight:700;margin-bottom:1.5rem}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadein{to{opacity:1;transform:translateY(0)}}
      `}</style>

      {error && (
        <div className="ad-wrap" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="ad-error">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        </div>
      )}

      {!data && !error && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div className="ad-loader">
            <div className="ad-loader-ring" />
            <span>Chargement…</span>
          </div>
        </div>
      )}

      {data && (
        <div className="ad-wrap">
          <div className="ad-page-header">
            <div>
              <div className="ad-eyebrow"><div className="ad-eyebrow-dot" />Espace administrateur</div>
              <h1 className="ad-page-title">Tableau de bord · <span>{data.antennaName}</span></h1>
            </div>
            <div className="ad-date">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Stats générales */}
          <span className="ad-section-label">Indicateurs de l&apos;antenne</span>
          <div className="ad-stats">
            {stats.slice(0, 3).map((s, i) => (
              <div key={s.label} className={`ad-stat-card${s.urgent ? " urgent" : ""}${s.clickable ? " ad-stat-clickable" : ""}`} style={{ animationDelay: `${0.08 + i * 0.06}s` }} onClick={s.onClick}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.color},${s.color}55)`, borderRadius: "18px 18px 0 0" }} />
                <div className="ad-stat-top">
                  {/* Icône placée au-dessus du label pour le centrage */}
                  <div className="ad-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                  <span className="ad-stat-label">{s.label}</span>
                </div>
                <div className="ad-stat-value" style={{ color: s.urgent ? s.color : "#111827" }}>{s.value}</div>
                <div className={`ad-stat-sub${s.trendUp === true ? " up" : ""}`}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* 4 cartes de soldes fixes */}
          <span className="ad-section-label">Soldes par devise</span>
          <div className="ad-stats-4">
            {stats.slice(3, 7).map((s, i) => (
              <div key={s.label} className={`ad-stat-card ad-stat-currency ad-stat-clickable`} style={{ animationDelay: `${0.28 + i * 0.07}s` }} onClick={s.onClick} role="button" tabIndex={0}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.color},${s.color}55)`, borderRadius: "18px 18px 0 0" }} />
                <div className="ad-stat-top">
                  <div className="ad-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                  <span className="ad-stat-label">{s.label}</span>
                </div>
                <div className="ad-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="ad-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Stats fin : projets + taux */}
          <div className="ad-stats-2" style={{ marginBottom: "1.75rem" }}>
            {stats.slice(7).map((s, i) => (
              <div key={s.label} className={`ad-stat-card${s.urgent ? " urgent" : ""}`} style={{ animationDelay: `${0.56 + i * 0.06}s` }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.color},${s.color}55)`, borderRadius: "18px 18px 0 0" }} />
                <div className="ad-stat-top">
                  <div className="ad-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                  <span className="ad-stat-label">{s.label}</span>
                </div>
                <div className="ad-stat-value">{s.value}</div>
                <div className="ad-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="ad-bottom">
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
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th className="hide-mobile">Email</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPendingAccounts.length === 0 ? (
                      <EmptyRow cols={4} label="Aucune demande d'adhésion en attente" />
                    ) : (
                      data.recentPendingAccounts.map((acc) => (
                        <tr key={acc.id} className="ad-row-clickable" onClick={() => setSelectedAccount(acc)}>
                          <td>
                            <div className="ad-user-cell">
                              <div className="ad-avatar">{getInitials(acc.firstName, acc.lastName)}</div>
                              <div>
                                <div className="ad-member-name">{acc.firstName} {acc.lastName}</div>
                                <div className="ad-member-email hide-desktop">{acc.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="hide-mobile" style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                            {acc.email}
                          </td>
                          <td>
                            <StatusBadge status="PENDING" />
                          </td>
                          <td className="muted">
                            {timeAgo(acc.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="ad-panel" style={{ animationDelay: "0.35s" }}>
              <div className="ad-panel-header">
                <div className="ad-panel-title">
                  <div className="ad-panel-icon" style={{ background: "#FEF3C7", color: "#D97706" }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                  </div>
                  Alertes &amp; Rappels
                </div>
              </div>
              <div>
                {/* Alerte Retardataires : REDIRECTION */}
                <div className="ad-alert-item">
                  <div className="ad-alert-dot" style={{ background: "#F59E0B" }} />
                  <div>
                    <div className="ad-alert-title">Membres en retard de cotisation</div>
                    <div className="ad-alert-desc">Certains membres n&apos;ont pas cotisé depuis plus de 3 mois.</div>
                    <button 
                      className="ad-alert-action" 
                      onClick={() => router.push('/admin/late-members')}
                    >
                      Voir la liste <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </button>
                  </div>
                </div>

                {/* Alerte Cotisations : REDIRECTION */}
                {data.stats.pendingContributions > 0 && (
                  <div className="ad-alert-item">
                    <div className="ad-alert-dot" style={{ background: "#7C3AED" }} />
                    <div>
                      <div className="ad-alert-title">{data.stats.pendingContributions} cotisation{data.stats.pendingContributions > 1 ? "s" : ""} à valider</div>
                      <div className="ad-alert-desc">Des paiements soumis par les membres attendent votre validation.</div>
                      <button 
                        className="ad-alert-action" 
                        style={{ color: "#7C3AED" }}
                        onClick={() => router.push('/admin/contributions')}
                      >
                        Valider maintenant <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Alerte Projets : REDIRECTION */}
                <div className="ad-alert-item">
                  <div className="ad-alert-dot" style={{ background: "#059669" }} />
                  <div>
                    <div className="ad-alert-title">Projets actifs</div>
                    <div className="ad-alert-desc">{data.stats.activeProjects} projet{data.stats.activeProjects !== 1 ? "s" : ""} en cours nécessite{data.stats.activeProjects === 1 ? "" : "nt"} un suivi.</div>
                    <button 
                      className="ad-alert-action" 
                      style={{ color: "#059669" }}
                      onClick={() => router.push('/admin/projects')}
                    >
                      Suivre les projets <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCurrency && (
        <BalancesModal
          currency={selectedCurrency}
          balances={currencyGroups[selectedCurrency]?.antennas}
          onClose={() => setSelectedCurrency(null)}
        />
      )}

      {selectedAccount && (
        <AccountDetailModal
          user={selectedAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
    </AppShell>
  );
}