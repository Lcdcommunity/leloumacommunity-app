// web/app/(protected)/super-admin/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate, fullName } from '../../../lib/format';
import type { UserSummary } from '../../../types/user';
import type { Contribution } from '../../../types/contribution';

// ─── Types ────────────────────────────────────────────────────────────────────

// Le backend retourne budgetAmount / amountSpent — on les mappe ici
type BackendProject = {
  id: string;
  title: string;
  status: string;
  budgetAmount?: number | null;   // ← champ réel du backend
  amountSpent?: number | null;    // ← champ réel du backend
  budgetPlanned?: number | null;  // ← alias possible
  budgetSpent?: number | null;    // ← alias possible
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type AntennaBalance = {
  id: string;
  name: string;
  balance: number;
  currency: string;
};

type DashboardData = {
  stats: {
    associations: number;
    antennas: number;
    members: number;
    pendingAccounts: number;
    pendingContributions: number;
    activeProjects: number;
    totalValidatedContributionsAmount: number;
  };
  antennaBalances?: AntennaBalance[];
  recentPendingAccounts: UserSummary[];
  recentContributions: Contribution[];
  recentProjects: BackendProject[];
};

type StatCard = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  sub: string;
  urgent?: boolean;
  clickable?: boolean;
  onClick?: () => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProjectBudget(p: BackendProject) {
  const planned = p.budgetPlanned ?? p.budgetAmount ?? 0;
  const spent   = p.budgetSpent   ?? p.amountSpent  ?? 0;
  return { planned, spent };
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED:        { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    PENDING:          { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING_APPROVAL: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    REJECTED:         { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    ACTIVE:           { label: 'Actif',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    IN_PROGRESS:      { label: 'En cours',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    PUBLISHED:        { label: 'Publié',     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DRAFT:            { label: 'Brouillon',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    COMPLETED:        { label: 'Terminé',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    APPROVED:         { label: 'Approuvé',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    CANCELLED:        { label: 'Annulé',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
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

// ─── Modals ───────────────────────────────────────────────────────────────────

function BalancesModal({
  currency,
  balances,
  onClose,
}: {
  currency: string;
  balances?: AntennaBalance[];
  onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', animation: 'sain 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 480, background: 'rgba(253,253,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: '1.5rem', border: '1px solid rgba(37,99,235,.15)', boxShadow: '0 24px 60px rgba(37,99,235,.12)', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            {FIXED_CURRENCIES.find(c => c.cur === currency)?.label ?? `Soldes — ${currency}`}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {!balances || balances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏦</div>
              Aucune antenne n&apos;utilise cette devise pour le moment.
            </div>
          ) : (
            balances.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.1rem', background: '#F9FAFB', borderRadius: 14, border: '1px solid #F3F4F6' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{b.name}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', monospace", fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                  {formatCurrency(b.balance, b.currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AccountDetailModal({ user, onClose }: { user: UserSummary; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', animation: 'sain 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, padding: '1.5rem', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div className="sa-user-cell" style={{ gap: '1rem' }}>
            <div className="sa-avatar" style={{ width: 48, height: 48, fontSize: '1.1rem' }}>{getInitials(fullName(user))}</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{fullName(user)}</h2>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.2rem' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6B7280', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Rôle</span>
            <span className="sa-role" style={{ fontSize: '0.75rem' }}>{user.role}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Statut</span>
            <StatusBadge status={user.status} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Date d&apos;inscription</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminContributionDetailModal({ item, onClose }: { item: Contribution; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', animation: 'sain 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, padding: '1.5rem', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 600, color: '#111827', margin: 0 }}>Détail de la cotisation</h2>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6B7280', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginBottom: '1.5rem' }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2.2rem', fontWeight: 700, color: '#111827' }}>
            {formatCurrency(item.amount, item.currency || 'EUR')}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Membre</span>
            {item.member ? (
              <div className="sa-user-cell">
                <div className="sa-avatar" style={{ width: 24, height: 24, fontSize: '0.5rem', background: 'linear-gradient(135deg, #059669, #34D399)' }}>
                  {getInitials(`${item.member.firstName} ${item.member.lastName}`)}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{`${item.member.firstName} ${item.member.lastName}`}</span>
              </div>
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>ID: {item.memberId}</span>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Date de création</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>{formatDate(item.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminProjectDetailModal({ project, onClose }: { project: BackendProject; onClose: () => void }) {
  const { planned, spent } = getProjectBudget(project);
  const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;
  const overBudget = planned > 0 && spent > planned;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', animation: 'sain 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: 24, padding: '1.5rem', boxShadow: '0 32px 72px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <StatusBadge status={project.status} />
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: '0.5rem 0 0' }}>{project.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6B7280', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {project.description && (
          <p style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.6, marginBottom: '1.5rem', padding: '1rem', background: '#F9FAFB', borderRadius: 12 }}>
            {project.description}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Budget Prévu</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>{planned > 0 ? formatCurrency(planned) : '—'}</div>
          </div>
          <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Budget Dépensé</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.25rem', fontWeight: 700, color: overBudget ? '#DC2626' : '#111827' }}>{spent > 0 ? formatCurrency(spent) : '—'}</div>
          </div>
        </div>

        {planned > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>Avancement budgétaire</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: overBudget ? '#DC2626' : pct > 75 ? '#D97706' : '#2563EB' }}>{Math.round(pct)}% {overBudget && '⚠'}</span>
            </div>
            <div style={{ height: 8, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: overBudget ? '#DC2626' : pct > 75 ? '#F59E0B' : '#3B82F6', borderRadius: 99 }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Créé le</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#374151' }}>{formatDate(project.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

// 4 devises fixes — toujours affichées même si solde = 0
const FIXED_CURRENCIES = [
  { cur: 'GNF', label: 'Solde antennes (GNF)',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { cur: 'EUR', label: 'Solde antennes (Euro)',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { cur: 'USD', label: 'Solde antennes (Dollar)',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { cur: 'XOF', label: 'Solde antennes (XOF)',      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
];

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  
  // États pour les modales
  const [selectedAccount, setSelectedAccount] = useState<UserSummary | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [selectedProject, setSelectedProject] = useState<BackendProject | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      try {
        const res = await api.dashboardSuperAdmin();
        if (isMounted) setData(res as unknown as DashboardData);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Erreur chargement');
      }
    };
    void fetch();
    return () => { isMounted = false; };
  }, []);

  // Grouper les soldes d'antennes par devise
  const currencyGroups = useMemo(() => {
    if (!data?.antennaBalances?.length) return {} as Record<string, { total: number; antennas: AntennaBalance[] }>;
    return data.antennaBalances.reduce((acc, curr) => {
      const cur = curr.currency || 'EUR';
      if (!acc[cur]) acc[cur] = { total: 0, antennas: [] };
      acc[cur].total += curr.balance;
      acc[cur].antennas.push(curr);
      return acc;
    }, {} as Record<string, { total: number; antennas: AntennaBalance[] }>);
  }, [data]);

  // Cartes de stats de base
  const baseStats: StatCard[] = data ? [
    {
      label: 'Associations',
      value: data.stats.associations,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
      color: '#2563EB', bg: '#EFF6FF', sub: 'Organisations',
    },
    {
      label: 'Antennes',
      value: data.stats.antennas,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>,
      color: '#7C3AED', bg: '#F5F3FF', sub: 'Sections locales',
    },
    {
      label: 'Membres',
      value: data.stats.members,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
      color: '#059669', bg: '#ECFDF5', sub: 'Membres validés',
    },
    {
      label: 'Comptes en attente',
      value: data.stats.pendingAccounts,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>,
      color: '#D97706', bg: '#FFFBEB', sub: 'À valider',
      urgent: data.stats.pendingAccounts > 0,
    },
    {
      label: 'Cotisations en attente',
      value: data.stats.pendingContributions,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>,
      color: '#0891B2', bg: '#ECFEFF', sub: 'En attente de validation',
      urgent: data.stats.pendingContributions > 0,
    },
    {
      label: 'Projets actifs',
      value: data.stats.activeProjects,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
      color: '#7C3AED', bg: '#F5F3FF', sub: 'En cours',
    },
  ] : [];

  const currencyStats: StatCard[] = FIXED_CURRENCIES.map(({ cur, label, color, bg }) => {
    const group = currencyGroups[cur] ?? { total: 0, antennas: [] };
    const antennaCount = group.antennas.length;
    return {
      label,
      value: formatCurrency(group.total, cur),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      color, bg,
      sub: antennaCount > 0
        ? `${antennaCount} antenne${antennaCount > 1 ? 's' : ''} · Clic pour détails`
        : 'Aucune antenne · Clic pour détails',
      clickable: true,
      onClick: () => setSelectedCurrency(cur),
    };
  });

  return (
    <AppShell title="Super Admin · Vue globale">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        .sa-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1340px; margin: 0 auto;
        }

        /* ── Header ── */
        .sa-header {
          display: flex; align-items: flex-end;
          justify-content: space-between; flex-wrap: wrap;
          gap: 1rem; margin-bottom: 1.75rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(220,38,38,0.10);
          opacity: 0; transform: translateY(10px);
          animation: sain 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .sa-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: #DC2626; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .sa-eyebrow-dot { width: 6px; height: 6px; background: #EF4444; border-radius: 50%; animation: sapulse 2s ease-in-out infinite; }
        @keyframes sapulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
        .sa-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.95rem); font-weight: 700; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .sa-title span { background: linear-gradient(135deg, #B91C1C, #EF4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .sa-chip { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #6B7280; font-weight: 600; background: rgba(220,38,38,0.05); border: 1px solid rgba(220,38,38,0.12); border-radius: 8px; padding: 0.45rem 0.9rem; white-space: nowrap; }
        .sa-chip-dot { width: 6px; height: 6px; background: #EF4444; border-radius: 50%; }

        /* ── Stats sections ── */
        .sa-section-label {
          font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: #9CA3AF;
          margin: 0 0 0.65rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .sa-section-label::after { content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.06); }

        /* Base stats grid : 3 colonnes sur desktop, 2 sur tablet, 3 sur mobile (compact) */
        .sa-stats-base {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        @media (max-width: 900px) { .sa-stats-base { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 520px)  { .sa-stats-base { grid-template-columns: repeat(3, 1fr); gap: 0.4rem; } }

        /* Currency cards : 1 à 4 colonnes selon le nombre de devises */
        .sa-stats-currency {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 520px) { .sa-stats-currency { grid-template-columns: repeat(2, 1fr); gap: 0.4rem; } }

        /* ── Stat card ── */
        .sa-stat {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          padding: 1.1rem 1.15rem;
          border: 1px solid rgba(37,99,235,0.08);
          box-shadow: 0 2px 10px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateY(14px);
          animation: sain 0.5s cubic-bezier(.22,1,.36,1) forwards;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sa-stat-clickable { cursor: pointer; }
        .sa-stat-clickable:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 12px 24px rgba(5,150,105,0.14), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        /* Carte devise : style légèrement différencié */
        .sa-stat-currency {
          border-color: rgba(5,150,105,0.15);
          background: linear-gradient(135deg, rgba(240,253,244,0.9), rgba(253,253,255,0.9));
        }
        .sa-stat-currency .sa-stat-accent { background: linear-gradient(90deg, #059669, #10B981) !important; }

        @media (max-width: 520px) {
          .sa-stat { padding: 0.6rem 0.5rem; border-radius: 12px; }
          .sa-stat-value { font-size: 1.05rem !important; word-break: break-word; }
          .sa-stat-label { font-size: 0.5rem !important; }
          .sa-stat-sub   { font-size: 0.48rem !important; }
          .sa-stat-icon  { width: 24px !important; height: 24px !important; border-radius: 6px !important; }
          .sa-stat-icon svg { width: 12px; height: 12px; }
          .sa-stat-top { flex-direction: column-reverse; gap: 0.2rem; margin-bottom: 0.4rem; }
        }

        .sa-stat-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.65rem; }
        .sa-stat-label { font-size: 0.61rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7280; max-width: 110px; line-height: 1.4; }
        .sa-stat-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sa-stat-value { font-family: 'Cormorant Garamond', serif; font-size: 1.75rem; font-weight: 700; color: #111827; letter-spacing: -0.03em; line-height: 1; margin-bottom: 0.28rem; word-break: break-word; }
        .sa-stat-sub { font-size: 0.62rem; color: #9CA3AF; font-weight: 600; }
        .sa-stat-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 18px 18px 0 0; }

        /* ── Grid panels ── */
        .sa-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        @media (max-width: 780px) { .sa-grid2 { grid-template-columns: 1fr; } }

        .sa-panel {
          background: rgba(253,253,255,0.9); backdrop-filter: blur(12px);
          border-radius: 18px; border: 1px solid rgba(37,99,235,0.08);
          box-shadow: 0 2px 10px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden; opacity: 0;
          animation: sain 0.5s cubic-bezier(.22,1,.36,1) forwards;
        }
        .sa-panel-full { grid-column: span 2; }
        @media (max-width: 780px) { .sa-panel-full { grid-column: span 1; } }

        .sa-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,0.07); }
        .sa-panel-title { font-size: 0.73rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; display: flex; align-items: center; gap: 0.45rem; }
        .sa-panel-ico { width: 26px; height: 26px; background: #EFF6FF; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #2563EB; }
        .sa-count-chip { font-size: 0.66rem; font-weight: 800; padding: 0.18rem 0.55rem; border-radius: 99px; background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }

        /* ── Tables ── */
        .sa-table { width: 100%; border-collapse: collapse; }
        .sa-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.08); }
        .sa-table thead th { padding: 0.6rem 1.2rem; font-size: 0.63rem; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase; color: #9CA3AF; text-align: left; white-space: nowrap; }
        .sa-table tbody tr { border-bottom: 1px solid rgba(37,99,235,0.05); transition: background 0.15s; }
        .sa-table tbody tr:last-child { border-bottom: none; }
        
        .sa-row-clickable { cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .sa-row-clickable:hover { background: rgba(37,99,235,0.04) !important; }
        .sa-row-clickable:active { background: rgba(37,99,235,0.08) !important; }

        .sa-table td { padding: 0.65rem 1.2rem; font-size: 0.79rem; color: #374151; font-weight: 500; vertical-align: middle; }
        .sa-table td.mono { font-family: 'Cormorant Garamond', serif; font-size: 0.93rem; font-weight: 700; color: #111827; }
        .sa-table td.muted { color: #9CA3AF; font-size: 0.72rem; }
        .sa-table td.bold { font-weight: 700; color: #111827; }

        .sa-user-cell { display: flex; align-items: center; gap: 0.55rem; }
        .sa-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #2563EB, #60A5FA); display: flex; align-items: center; justify-content: center; font-size: 0.59rem; font-weight: 800; color: white; flex-shrink: 0; }
        .sa-role { font-size: 0.64rem; font-weight: 800; padding: 0.14rem 0.5rem; border-radius: 6px; background: #F0F9FF; color: #0369A1; border: 1px solid #BAE6FD; }
        .sa-budget-wrap { display: flex; flex-direction: column; gap: 0.22rem; }
        .sa-budget-bar { height: 3px; background: #E5E7EB; border-radius: 99px; overflow: hidden; max-width: 80px; }
        .sa-budget-fill { height: 100%; border-radius: 99px; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .sa-table th { padding: 0.5rem 0.6rem; font-size: 0.6rem; }
          .sa-table td { padding: 0.6rem 0.6rem; font-size: 0.75rem; }
          .sa-table td.mono { font-size: 0.85rem; }
          .sa-panel-head { padding: 1rem; }
        }

        /* ── Loader / Error ── */
        .sa-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 55vh; gap: 1rem; color: #6B7280; font-size: 0.82rem; font-weight: 600; }
        .sa-ring { width: 40px; height: 40px; border: 3px solid rgba(220,38,38,0.1); border-top-color: #DC2626; border-radius: 50%; animation: saspin 0.8s linear infinite; }
        .sa-error { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.25rem; background: rgba(185,28,28,0.06); border: 1px solid rgba(185,28,28,0.18); border-radius: 14px; color: #B91C1C; font-size: 0.82rem; font-weight: 700; margin-bottom: 1.5rem; }

        @keyframes saspin { to { transform: rotate(360deg); } }
        @keyframes sain   { to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {!data && !error && (
        <div className="sa-loader">
          <div className="sa-ring" />
          <span>Chargement des données globales…</span>
        </div>
      )}

      {error && (
        <div className="sa-error">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
          </svg>
          {error}
        </div>
      )}

      {data && (
        <div className="sa-wrap">

          {/* Header */}
          <div className="sa-header">
            <div>
              <div className="sa-eyebrow"><div className="sa-eyebrow-dot" />Super Administration</div>
              <h1 className="sa-title">Vue <span>globale</span></h1>
            </div>
            <div className="sa-chip">
              <div className="sa-chip-dot" />
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* ── Stats de base (6 cartes) ── */}
          <p className="sa-section-label">Indicateurs généraux</p>
          <div className="sa-stats-base" style={{ marginBottom: '1.5rem' }}>
            {baseStats.map((s, i) => (
              <div
                key={s.label}
                className={`sa-stat${s.clickable ? ' sa-stat-clickable' : ''}${s.urgent ? ' sa-stat-urgent' : ''}`}
                style={{ animationDelay: `${0.08 + i * 0.06}s` }}
                onClick={s.onClick}
              >
                <div className="sa-stat-accent" style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}55)` }} />
                {s.urgent && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: `1.5px solid ${s.color}50`, pointerEvents: 'none' }} />
                )}
                <div className="sa-stat-top">
                  <span className="sa-stat-label">{s.label}</span>
                  <div className="sa-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                </div>
                <div className="sa-stat-value" style={{ color: s.urgent ? s.color : '#111827' }}>{String(s.value)}</div>
                <div className="sa-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Cartes de soldes par devise ── */}
          <>
            <p className="sa-section-label">Soldes par devise</p>
            <div className="sa-stats-currency">
              {currencyStats.map((s, i) => (
                  <div
                    key={s.label}
                    className="sa-stat sa-stat-currency sa-stat-clickable"
                    style={{ animationDelay: `${0.42 + i * 0.07}s` }}
                    onClick={s.onClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && s.onClick?.()}
                    title="Voir le détail par antenne"
                  >
                    <div className="sa-stat-accent" />
                    <div className="sa-stat-top">
                      <span className="sa-stat-label">{s.label}</span>
                      <div className="sa-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                    </div>
                    <div className="sa-stat-value" style={{ color: s.color }}>{String(s.value)}</div>
                    <div className="sa-stat-sub">{s.sub}</div>
                  </div>
              ))}
            </div>
          </>

          {/* ── Panels : comptes en attente + cotisations ── */}
          <div className="sa-grid2">

            <div className="sa-panel" style={{ animationDelay: '0.52s' }}>
              <div className="sa-panel-head">
                <div className="sa-panel-title">
                  <div className="sa-panel-ico">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                  </div>
                  Comptes en attente
                </div>
                {data.recentPendingAccounts.length > 0 && (
                  <span className="sa-count-chip">{data.recentPendingAccounts.length}</span>
                )}
              </div>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th className="hide-mobile">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPendingAccounts.length === 0 && <EmptyRow cols={4} label="Aucun compte en attente" />}
                  {data.recentPendingAccounts.map(u => (
                    <tr key={u.id} className="sa-row-clickable" onClick={() => setSelectedAccount(u)}>
                      <td>
                        <div className="sa-user-cell">
                          <div className="sa-avatar">{getInitials(fullName(u))}</div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.8rem', lineHeight: 1.3 }}>{fullName(u)}</div>
                            <div style={{ fontSize: '0.69rem', color: '#9CA3AF' }} className="hide-mobile">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="sa-role">{u.role}</span></td>
                      <td><StatusBadge status={u.status} /></td>
                      <td className="muted hide-mobile">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sa-panel" style={{ animationDelay: '0.57s' }}>
              <div className="sa-panel-head">
                <div className="sa-panel-title">
                  <div className="sa-panel-ico" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  Cotisations récentes
                </div>
                {data.recentContributions.length > 0 && (
                  <span className="sa-count-chip" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                    {data.recentContributions.length}
                  </span>
                )}
              </div>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th className="hide-mobile">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentContributions.length === 0 && <EmptyRow cols={4} label="Aucune cotisation récente" />}
                  {data.recentContributions.map(c => (
                    <tr key={c.id} className="sa-row-clickable" onClick={() => setSelectedContribution(c)}>
                      <td>
                        <div className="sa-user-cell">
                          <div className="sa-avatar" style={{ background: 'linear-gradient(135deg, #059669, #34D399)' }}>
                            {c.member ? getInitials(`${c.member.firstName} ${c.member.lastName}`) : '??'}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>
                            {c.member ? `${c.member.firstName} ${c.member.lastName}` : c.memberId}
                          </span>
                        </div>
                      </td>
                      <td className="mono">{formatCurrency(c.amount, c.currency)}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="muted hide-mobile">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Projets récents (pleine largeur) ── */}
          <div className="sa-grid2">
            <div className="sa-panel sa-panel-full" style={{ animationDelay: '0.62s' }}>
              <div className="sa-panel-head">
                <div className="sa-panel-title">
                  <div className="sa-panel-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                    </svg>
                  </div>
                  Projets récents
                </div>
                {data.recentProjects.length > 0 && (
                  <span className="sa-count-chip" style={{ background: '#F5F3FF', color: '#5B21B6', border: '1px solid #DDD6FE' }}>
                    {data.recentProjects.length}
                  </span>
                )}
              </div>
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Statut</th>
                    <th>Budget prévu</th>
                    <th className="hide-mobile">Budget dépensé</th>
                    <th className="hide-mobile">Avancement</th>
                    <th className="hide-mobile">Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentProjects.length === 0 && <EmptyRow cols={6} label="Aucun projet enregistré" />}
                  {data.recentProjects.map(p => {
                    const { planned, spent } = getProjectBudget(p);
                    const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;
                    const overBudget = planned > 0 && spent > planned;
                    return (
                      <tr key={p.id} className="sa-row-clickable" onClick={() => setSelectedProject(p)}>
                        <td className="bold">{p.title}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td className="mono">{planned > 0 ? formatCurrency(planned) : '—'}</td>
                        <td className="mono hide-mobile" style={{ color: overBudget ? '#DC2626' : '#111827' }}>
                          {spent > 0 ? formatCurrency(spent) : '—'}
                        </td>
                        <td className="hide-mobile">
                          {planned > 0 ? (
                            <div className="sa-budget-wrap">
                              <div className="sa-budget-bar">
                                <div
                                  className="sa-budget-fill"
                                  style={{ width: `${pct}%`, background: overBudget ? '#DC2626' : pct > 75 ? '#D97706' : '#2563EB' }}
                                />
                              </div>
                              <span style={{ fontSize: '0.67rem', color: overBudget ? '#DC2626' : '#6B7280', fontWeight: 700 }}>
                                {Math.round(pct)}%
                              </span>
                            </div>
                          ) : <span style={{ color: '#D1D5DB', fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td className="muted hide-mobile">{formatDate(p.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Modales */}
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

      {selectedContribution && (
        <AdminContributionDetailModal
          item={selectedContribution}
          onClose={() => setSelectedContribution(null)}
        />
      )}

      {selectedProject && (
        <AdminProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

    </AppShell>
  );
}