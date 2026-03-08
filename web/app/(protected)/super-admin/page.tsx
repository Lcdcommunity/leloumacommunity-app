// web/app/(protected)/super-admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate, fullName } from '../../../lib/format';
import type { UserSummary } from '../../../types/user';
import type { Contribution } from '../../../types/contribution';
import type { Project } from '../../../types/project';

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
  recentPendingAccounts: UserSummary[];
  recentContributions: Contribution[];
  recentProjects: Project[];
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED:   { label: 'Validée',     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    PENDING:     { label: 'En attente',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    REJECTED:    { label: 'Rejetée',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    ACTIVE:      { label: 'Actif',       color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    IN_PROGRESS: { label: 'En cours',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    PUBLISHED:   { label: 'Publié',      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DRAFT:       { label: 'Brouillon',   color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    COMPLETED:   { label: 'Terminé',     color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
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

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.dashboardSuperAdmin();
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement');
      }
    })();
  }, []);

  const stats = data ? [
    {
      label: 'Associations',
      value: data.stats.associations,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
      color: '#2563EB', bg: '#EFF6FF', sub: 'Organisations enregistrées',
    },
    {
      label: 'Antennes',
      value: data.stats.antennas,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>,
      color: '#7C3AED', bg: '#F5F3FF', sub: 'Sections locales actives',
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
      color: '#D97706', bg: '#FFFBEB', sub: 'Validations requises',
      urgent: data.stats.pendingAccounts > 0,
    },
    {
      label: 'Cotisations en attente',
      value: data.stats.pendingContributions,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>,
      color: '#0891B2', bg: '#ECFEFF', sub: 'À valider par antenne',
      urgent: data.stats.pendingContributions > 0,
    },
    {
      label: 'Projets actifs',
      value: data.stats.activeProjects,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>,
      color: '#7C3AED', bg: '#F5F3FF', sub: 'Projets en cours',
    },
    {
      label: 'Cagnotte validée',
      value: formatCurrency(data.stats.totalValidatedContributionsAmount, 'EUR'),
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>,
      color: '#059669', bg: '#ECFDF5', sub: 'Total global confirmé',
      wide: true,
    },
  ] : [];

  return (
    <AppShell title="Super Admin · Vue globale">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');

        .sa-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1340px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .sa-header {
          display: flex; align-items: flex-end;
          justify-content: space-between; flex-wrap: wrap;
          gap: 1rem; margin-bottom: 1.75rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(37,99,235,0.10);
          opacity: 0; transform: translateY(10px);
          animation: sain 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .sa-eyebrow {
          font-size: 0.67rem; font-weight: 700;
          letter-spacing: 0.13em; text-transform: uppercase;
          color: #DC2626; margin-bottom: 0.35rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .sa-eyebrow-dot {
          width: 6px; height: 6px; background: #EF4444;
          border-radius: 50%; animation: sapulse 2s ease-in-out infinite;
        }
        @keyframes sapulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
        .sa-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.5rem, 3vw, 1.95rem);
          font-weight: 500; color: #111827;
          letter-spacing: -0.02em; line-height: 1.15;
        }
        .sa-title span {
          background: linear-gradient(135deg, #B91C1C, #EF4444);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .sa-chip {
          display: flex; align-items: center; gap: 0.5rem;
          font-size: 0.75rem; color: #6B7280;
          background: rgba(220,38,38,0.05);
          border: 1px solid rgba(220,38,38,0.12);
          border-radius: 8px; padding: 0.45rem 0.9rem;
          white-space: nowrap;
        }
        .sa-chip-dot { width: 6px; height: 6px; background: #EF4444; border-radius: 50%; }

        /* ── Stats ── */
        .sa-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .sa-stats .wide { grid-column: span 4; }
        @media (max-width: 1024px) {
          .sa-stats { grid-template-columns: repeat(3,1fr); }
          .sa-stats .wide { grid-column: span 3; }
        }
        @media (max-width: 700px) {
          .sa-stats { grid-template-columns: repeat(2,1fr); }
          .sa-stats .wide { grid-column: span 2; }
        }
        @media (max-width: 460px) {
          .sa-stats { grid-template-columns: 1fr; }
          .sa-stats .wide { grid-column: span 1; }
        }

        .sa-stat {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          padding: 1.1rem 1.25rem;
          border: 1px solid rgba(37,99,235,0.08);
          box-shadow: 0 2px 10px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateY(14px);
          animation: sain 0.5s cubic-bezier(.22,1,.36,1) forwards;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .sa-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(37,99,235,0.09), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        .sa-stat.wide {
          display: flex; align-items: center;
          gap: 1.5rem; padding: 1rem 1.5rem;
        }
        .sa-stat-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.7rem; }
        .sa-stat-label {
          font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #6B7280; max-width: 100px; line-height: 1.4;
        }
        .sa-stat-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .sa-stat-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.9rem; font-weight: 600;
          color: #111827; letter-spacing: -0.03em; line-height: 1;
          margin-bottom: 0.3rem;
        }
        .sa-stat.wide .sa-stat-value { font-size: 2.4rem; }
        .sa-stat-sub { font-size: 0.67rem; color: #9CA3AF; font-weight: 500; }
        .sa-stat-accent {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          border-radius: 18px 18px 0 0;
        }
        .sa-stat.wide .sa-stat-accent { width: 3px; height: auto; top: 0; bottom: 0; left: 0; right: auto; border-radius: 18px 0 0 18px; }

        /* ── Grid panels ── */
        .sa-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        @media (max-width: 780px) { .sa-grid2 { grid-template-columns: 1fr; } }

        .sa-panel {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          border: 1px solid rgba(37,99,235,0.08);
          box-shadow: 0 2px 10px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden;
          opacity: 0;
          animation: sain 0.5s cubic-bezier(.22,1,.36,1) forwards;
        }
        .sa-panel-full { grid-column: span 2; }
        @media (max-width: 780px) { .sa-panel-full { grid-column: span 1; } }

        .sa-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 1.3rem;
          border-bottom: 1px solid rgba(37,99,235,0.07);
        }
        .sa-panel-title {
          font-size: 0.73rem; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #374151;
          display: flex; align-items: center; gap: 0.45rem;
        }
        .sa-panel-ico {
          width: 26px; height: 26px; background: #EFF6FF;
          border-radius: 7px; display: flex; align-items: center; justify-content: center;
          color: #2563EB;
        }
        .sa-count-chip {
          font-size: 0.66rem; font-weight: 700;
          padding: 0.18rem 0.55rem; border-radius: 99px;
          background: #FFFBEB; color: #92400E;
          border: 1px solid #FDE68A;
        }

        /* ── Tables ── */
        .sa-table { width: 100%; border-collapse: collapse; }
        .sa-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.08); }
        .sa-table thead th {
          padding: 0.6rem 1.2rem;
          font-size: 0.63rem; font-weight: 700;
          letter-spacing: 0.09em; text-transform: uppercase;
          color: #9CA3AF; text-align: left; white-space: nowrap;
        }
        .sa-table tbody tr {
          border-bottom: 1px solid rgba(37,99,235,0.05);
          transition: background 0.15s;
        }
        .sa-table tbody tr:last-child { border-bottom: none; }
        .sa-table tbody tr:hover { background: rgba(37,99,235,0.025); }
        .sa-table td {
          padding: 0.65rem 1.2rem;
          font-size: 0.79rem; color: #374151;
          vertical-align: middle;
        }
        .sa-table td.mono {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.93rem; font-weight: 600; color: #111827;
        }
        .sa-table td.muted { color: #9CA3AF; font-size: 0.72rem; }
        .sa-table td.bold { font-weight: 600; color: #111827; }

        .sa-user-cell { display: flex; align-items: center; gap: 0.55rem; }
        .sa-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #2563EB, #60A5FA);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.59rem; font-weight: 700; color: white; flex-shrink: 0;
        }

        /* Budget bar */
        .sa-budget-wrap { display: flex; flex-direction: column; gap: 0.22rem; }
        .sa-budget-bar {
          height: 3px; background: #E5E7EB;
          border-radius: 99px; overflow: hidden; max-width: 80px;
        }
        .sa-budget-fill { height: 100%; border-radius: 99px; }

        /* Role chip */
        .sa-role {
          font-size: 0.64rem; font-weight: 700;
          padding: 0.14rem 0.5rem; border-radius: 6px;
          background: #F0F9FF; color: #0369A1;
          border: 1px solid #BAE6FD;
        }

        /* Loader / Error */
        .sa-loader {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 55vh; gap: 1rem;
          color: #6B7280; font-size: 0.82rem;
        }
        .sa-ring {
          width: 40px; height: 40px;
          border: 3px solid rgba(220,38,38,0.1);
          border-top-color: #DC2626;
          border-radius: 50%;
          animation: saspin 0.8s linear infinite;
        }
        .sa-error {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 1rem 1.25rem;
          background: rgba(185,28,28,0.06);
          border: 1px solid rgba(185,28,28,0.18);
          border-radius: 14px; color: #B91C1C;
          font-size: 0.82rem; margin-bottom: 1.5rem;
        }

        @keyframes saspin { to { transform: rotate(360deg); } }
        @keyframes sain { to { opacity: 1; transform: translateY(0); } }
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
              <h1 className="sa-title">Vue <span>globale</span> · Lélouma</h1>
            </div>
            <div className="sa-chip">
              <div className="sa-chip-dot" />
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Stats grid */}
          <div className="sa-stats">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`sa-stat${s.wide ? ' wide' : ''}`}
                style={{ animationDelay: `${0.08 + i * 0.06}s` }}
              >
                <div
                  className="sa-stat-accent"
                  style={{ background: `linear-gradient(${s.wide ? '180deg' : '90deg'}, ${s.color}, ${s.color}55)` }}
                />
                {s.wide ? (
                  <>
                    <div className="sa-stat-icon" style={{ background: s.bg, color: s.color, width: 48, height: 48, borderRadius: 14 }}>{s.icon}</div>
                    <div>
                      <div className="sa-stat-label" style={{ marginBottom: '0.35rem' }}>{s.label}</div>
                      <div className="sa-stat-value">{String(s.value)}</div>
                      <div className="sa-stat-sub">{s.sub}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="sa-stat-top">
                      <span className="sa-stat-label">{s.label}</span>
                      <div className="sa-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                    </div>
                    <div className="sa-stat-value" style={{ color: s.urgent ? s.color : '#111827' }}>{String(s.value)}</div>
                    <div className="sa-stat-sub">{s.sub}</div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Row 1 */}
          <div className="sa-grid2">

            {/* Pending accounts */}
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
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPendingAccounts.length === 0 && <EmptyRow cols={4} label="Aucun compte en attente" />}
                  {data.recentPendingAccounts.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="sa-user-cell">
                          <div className="sa-avatar">{getInitials(fullName(u))}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.8rem', lineHeight: 1.3 }}>{fullName(u)}</div>
                            <div style={{ fontSize: '0.69rem', color: '#9CA3AF' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="sa-role">{u.role}</span></td>
                      <td><StatusBadge status={u.status} /></td>
                      <td className="muted">{formatDate(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Recent contributions */}
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
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentContributions.length === 0 && <EmptyRow cols={4} label="Aucune cotisation récente" />}
                  {data.recentContributions.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="sa-user-cell">
                          <div className="sa-avatar" style={{ background: 'linear-gradient(135deg, #059669, #34D399)' }}>
                            {c.member ? getInitials(`${c.member.firstName} ${c.member.lastName}`) : '??'}
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>
                            {c.member ? `${c.member.firstName} ${c.member.lastName}` : c.memberId}
                          </span>
                        </div>
                      </td>
                      <td className="mono">{formatCurrency(c.amount, c.currency)}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="muted">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 2 : Projects full width */}
          <div className="sa-grid2">
            <div className="sa-panel sa-panel-full" style={{ animationDelay: '0.62s' }}>
              <div className="sa-panel-head">
                <div className="sa-panel-title">
                  <div className="sa-panel-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
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
                    <th>Budget dépensé</th>
                    <th>Avancement</th>
                    <th>Créé le</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentProjects.length === 0 && <EmptyRow cols={6} label="Aucun projet enregistré" />}
                  {data.recentProjects.map(p => {
                    const planned = p.budgetPlanned ?? 0;
                    const spent = p.budgetSpent ?? 0;
                    const pct = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;
                    const overBudget = planned > 0 && spent > planned;
                    return (
                      <tr key={p.id}>
                        <td className="bold">{p.title}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td className="mono">{planned > 0 ? formatCurrency(planned) : '—'}</td>
                        <td className="mono" style={{ color: overBudget ? '#DC2626' : '#111827' }}>
                          {spent > 0 ? formatCurrency(spent) : '—'}
                        </td>
                        <td>
                          {planned > 0 ? (
                            <div className="sa-budget-wrap">
                              <div className="sa-budget-bar">
                                <div
                                  className="sa-budget-fill"
                                  style={{
                                    width: `${pct}%`,
                                    background: overBudget ? '#DC2626' : pct > 75 ? '#D97706' : '#2563EB',
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.67rem', color: overBudget ? '#DC2626' : '#6B7280', fontWeight: 600 }}>
                                {Math.round(pct)}%
                              </span>
                            </div>
                          ) : <span style={{ color: '#D1D5DB', fontSize: '0.75rem' }}>—</span>}
                        </td>
                        <td className="muted">{formatDate(p.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </AppShell>
  );
}