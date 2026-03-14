//////// web/app/(protected)/member/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { MemberStatusBanner } from '../../../components/member/MemberStatusBanner';
import { VirtualCardWidget } from '../../../components/member/VirtualCardWidget';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../lib/format';
import type { UserSummary } from '../../../types/user';
import type { Contribution } from '../../../types/contribution';
import type { Project } from '../../../types/project';
import type { ContentPost } from '../../../types/content';

type MemberDashboardResponse = {
  virtualCard?: {
    cardNumber: string;
    isLocked: boolean;
    expiresAt: string | null;
    qrToken: string;
    antennaName: string;
    user: {
      firstName: string;
      lastName: string;
      birthDate?: string | null;
      placeOfBirth?: string | null;
      country?: string | null;
      city?: string | null;
      profilePhotoUrl?: string; 
    };
  } | null;
  stats?: {
    myTotalContributions?: number;
    activeProjects?: number;
    myContributionsTotal?: number;
    myContributionsValidatedTotal?: number;
    myPendingContributionsCount?: number;
    associationTotalBalance?: number;
    lateMonths?: number;
    myLastContributionAt?: string | null;
    currency?: string;
  };
  me?: UserSummary;
  user?: UserSummary;
  recentContributions?: Contribution[];
  projectsInProgress?: Project[];
  latestContents?: ContentPost[];
  lateMembersPreview?: Array<{ id: string; firstName: string; lastName: string; lateMonths?: number }>;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED: { label: 'Validée',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    PENDING:   { label: 'En attente',color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    REJECTED:  { label: 'Rejetée',   color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    IN_PROGRESS:{ label: 'En cours', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    PUBLISHED: { label: 'Publié',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DRAFT:     { label: 'Brouillon', color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  const s = map[status] ?? { label: status, color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.28rem',
      fontSize: '0.7rem', fontWeight: 800,
      color: s.color, background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 99, padding: '0.18rem 0.6rem',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', padding: '1.75rem 1rem', color: '#6B7280', fontSize: '0.8rem', fontWeight: 500 }}>
        {label}
      </td>
    </tr>
  );
}

export default function MemberHomePage() {
  const [data, setData] = useState<MemberDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.dashboardMember() as MemberDashboardResponse;
        
        if (res.virtualCard && res.virtualCard.user) {
          const userRef = res.virtualCard.user as { profilePhotoUrl?: string | null };
          if (userRef.profilePhotoUrl === null) {
            res.virtualCard.user.profilePhotoUrl = undefined;
          }
        }
        
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur chargement dashboard');
      }
    })();
  }, []);

  const me = data?.me ?? data?.user;
  const cur = data?.stats?.currency || 'EUR';
  const lateMonths = data?.stats?.lateMonths ?? 0;

  const stats = data ? [
    {
      label: 'Total cotisé',
      value: formatCurrency(data.stats?.myContributionsTotal ?? data.stats?.myTotalContributions ?? 0, cur),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: '#2563EB', bg: '#EFF6FF', sub: 'Montant total versé',
    },
    {
      label: 'Cotisations validées',
      value: formatCurrency(data.stats?.myContributionsValidatedTotal ?? data.stats?.myTotalContributions ?? 0, cur),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      color: '#059669', bg: '#ECFDF5', sub: "Confirmées par l'admin",
    },
    {
      label: 'En attente',
      value: data.stats?.myPendingContributionsCount ?? 0,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: '#D97706', bg: '#FFFBEB', sub: 'Dépôts à valider',
      urgent: (data.stats?.myPendingContributionsCount ?? 0) > 0,
    },
    {
      label: 'Solde association',
      value: formatCurrency(data.stats?.associationTotalBalance ?? 0, cur),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      color: '#7C3AED', bg: '#F5F3FF', sub: 'Fonds collectifs',
    },
    {
      label: 'Retard',
      value: `${lateMonths} mois`,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: lateMonths > 0 ? '#DC2626' : '#059669',
      bg: lateMonths > 0 ? '#FEF2F2' : '#ECFDF5',
      sub: lateMonths > 0 ? 'Mois non cotisés' : 'À jour !',
      urgent: lateMonths > 2,
    },
    {
      label: 'Dernière cotisation',
      value: formatDate(data.stats?.myLastContributionAt ?? null),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: '#4B5563', bg: '#F3F4F6', sub: 'Date du dernier versement',
    },
  ] : [];

  return (
    <AppShell title="Espace membre">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');

        .mb-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1280px;
          margin: 0 auto;
        }

        /* ── Page header ── */
        .mb-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(37,99,235,0.10);
          opacity: 0;
          transform: translateY(10px);
          animation: mbin 0.5s 0.05s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mb-eyebrow {
          font-size: 0.68rem; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #2563EB; margin-bottom: 0.4rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .mb-eyebrow-dot {
          width: 6px; height: 6px; background: #3B82F6; border-radius: 50%;
          animation: mbpulse 2s ease-in-out infinite;
        }
        @keyframes mbpulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
        
        /* Titre plus affirmé */
        .mb-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(1.6rem, 3.5vw, 2.1rem);
          font-weight: 600; color: #111827;
          letter-spacing: -0.02em; line-height: 1.15;
        }
        .mb-title span {
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .mb-greeting-chip {
          font-size: 0.8rem; font-weight: 600; color: #374151;
          background: rgba(37,99,235,0.06);
          border: 1px solid rgba(37,99,235,0.15);
          border-radius: 8px; padding: 0.5rem 1rem;
          white-space: nowrap;
        }

        /* ── HERO SECTION (DOCK CARTE + STATS) ── */
        .mb-hero {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }
        .mb-hero-left {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .mb-hero-right {
          width: 400px;
          flex-shrink: 0;
        }
        @media (max-width: 1024px) {
          .mb-hero { flex-direction: column; }
          .mb-hero-right { width: 100%; max-width: 400px; margin: 0 auto; }
        }

        /* ── LE DOCK (Emplacement Carte) ── */
        .mb-card-dock {
          position: relative;
          width: 100%;
          border: 2px dashed rgba(37,99,235,0.25);
          border-radius: 24px;
          background: rgba(37,99,235,0.02);
          padding: 0.5rem; /* Espace autour du widget */
          animation: mbin 0.5s 0.15s cubic-bezier(.22,1,.36,1) forwards;
          opacity: 0;
        }
        .mb-dock-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          color: #94A3B8;
          z-index: 0;
        }
        .mb-dock-text {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .mb-card-layer {
          position: relative;
          z-index: 10;
        }

        /* ── Stats ── */
        .mb-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        /* SUR MOBILE : Forcer 3 colonnes pour les stats */
        @media (max-width: 768px) {
          .mb-stats {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem; /* Réduire l'espacement pour que ça rentre */
          }
        }

        .mb-stat {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          padding: 1.2rem 1.25rem;
          border: 1px solid rgba(37,99,235,0.12);
          box-shadow: 0 4px 12px rgba(37,99,235,0.04), 0 0 0 1px rgba(255,255,255,0.8) inset;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateY(14px);
          animation: mbin 0.5s cubic-bezier(.22,1,.36,1) forwards;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        /* Ajustements internes pour les stats sur mobile */
        @media (max-width: 768px) {
          .mb-stat {
            padding: 0.8rem;
            border-radius: 12px;
          }
          .mb-stat-accent {
            border-radius: 12px 12px 0 0;
          }
        }

        .mb-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(37,99,235,0.08), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        .mb-stat-accent {
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
          border-radius: 18px 18px 0 0;
        }
        .mb-stat-top {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 0.8rem;
        }
        
        @media (max-width: 768px) {
          .mb-stat-top {
             flex-direction: column-reverse; /* Icône au dessus du texte sur mobile si besoin, ou on garde tel quel selon la place */
             gap: 0.4rem;
             margin-bottom: 0.5rem;
          }
        }

        .mb-stat-label {
          font-size: 0.68rem; font-weight: 800;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #4B5563; max-width: 110px; line-height: 1.4;
        }

        @media (max-width: 768px) {
          .mb-stat-label {
            font-size: 0.55rem;
          }
        }

        .mb-stat-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        @media (max-width: 768px) {
           .mb-stat-icon {
             width: 24px; height: 24px; border-radius: 6px;
           }
           .mb-stat-icon svg {
             width: 14px; height: 14px;
           }
        }

        .mb-stat-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.85rem; font-weight: 700;
          color: #111827; letter-spacing: -0.03em;
          line-height: 1; margin-bottom: 0.4rem;
        }

        @media (max-width: 768px) {
           .mb-stat-value {
             font-size: 1.2rem;
             word-break: break-word; /* Evite que le texte ne dépasse de la carte */
           }
        }

        .mb-stat-sub {
          font-size: 0.72rem; color: #6B7280; font-weight: 600;
        }

        @media (max-width: 768px) {
           .mb-stat-sub {
             font-size: 0.55rem;
             line-height: 1.2;
           }
        }


        /* ── Bottom grid ── */
        .mb-grid2 {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 1.25rem; margin-bottom: 1.5rem;
        }
        @media (max-width: 860px) { .mb-grid2 { grid-template-columns: 1fr; } }

        /* ── Panel ── */
        .mb-panel {
          background: rgba(253,253,255,0.9);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.12);
          box-shadow: 0 4px 15px rgba(37,99,235,0.03), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden;
          opacity: 0;
          animation: mbin 0.5s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mb-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.2rem 1.4rem;
          border-bottom: 1px solid rgba(37,99,235,0.08);
        }
        .mb-panel-title {
          font-size: 0.78rem; font-weight: 800;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #1F2937;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .mb-panel-ico {
          width: 28px; height: 28px; background: #EFF6FF;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          color: #2563EB;
        }
        .mb-count-chip {
          font-size: 0.7rem; font-weight: 800;
          padding: 0.2rem 0.6rem; border-radius: 99px;
          background: #EFF6FF; color: #1D4ED8;
          border: 1px solid #BFDBFE;
        }

        /* ── Table (Textes plus visibles) ── */
        .mb-table { width: 100%; border-collapse: collapse; }
        .mb-table thead tr {
          border-bottom: 1px solid rgba(37,99,235,0.1);
        }
        .mb-table thead th {
          padding: 0.75rem 1.4rem;
          font-size: 0.68rem; font-weight: 800;
          letter-spacing: 0.09em; text-transform: uppercase;
          color: #6B7280; text-align: left;
        }
        .mb-table tbody tr {
          border-bottom: 1px solid rgba(37,99,235,0.06);
          transition: background 0.15s;
        }
        .mb-table tbody tr:last-child { border-bottom: none; }
        .mb-table tbody tr:hover { background: rgba(37,99,235,0.03); }
        .mb-table td {
          padding: 0.85rem 1.4rem;
          font-size: 0.82rem; color: #1F2937; font-weight: 500;
          vertical-align: middle;
        }
        .mb-table td.mono {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.05rem; font-weight: 700; color: #111827;
        }
        .mb-table td.muted { color: #6B7280; font-size: 0.78rem; font-weight: 500; }

        /* Member pill */
        .mb-member-pill {
          display: flex; align-items: center; gap: 0.6rem;
        }
        .mb-avatar-sm {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #2563EB, #3B82F6);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem; font-weight: 700; color: white; flex-shrink: 0;
        }

        /* late bar */
        .mb-late-bar {
          display: flex; align-items: center; gap: 0.6rem;
        }
        .mb-late-track {
          flex: 1; height: 5px; background: #FEE2E2;
          border-radius: 99px; overflow: hidden; max-width: 65px;
        }
        .mb-late-fill {
          height: 100%; background: #DC2626;
          border-radius: 99px;
        }

        /* error / loader */
        .mb-error {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 1rem 1.25rem;
          background: rgba(185,28,28,0.06);
          border: 1px solid rgba(185,28,28,0.18);
          border-radius: 14px; color: #B91C1C;
          font-size: 0.82rem; margin-bottom: 1.5rem;
        }
        .mb-loader {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 55vh; gap: 1rem;
          color: #6B7280; font-size: 0.85rem; font-weight: 600;
        }
        .mb-ring {
          width: 40px; height: 40px;
          border: 3px solid rgba(37,99,235,0.1);
          border-top-color: #2563EB;
          border-radius: 50%;
          animation: mbspin 0.8s linear infinite;
        }
        @keyframes mbspin { to { transform: rotate(360deg); } }
        @keyframes mbin { to { opacity:1; transform:translateY(0); } }
      `}</style>

      {!data && !error && (
        <div className="mb-loader">
          <div className="mb-ring" />
          <span>Chargement de votre espace…</span>
        </div>
      )}

      {error && (
        <div className="mb-error">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      {data && (
        <div className="mb-wrap">

          {/* ── Header ── */}
          <div className="mb-header">
            <div>
              <div className="mb-eyebrow"><div className="mb-eyebrow-dot" />Espace membre</div>
              <h1 className="mb-title">
                Bonjour, <span>{me?.firstName ?? 'Membre'}</span>
              </h1>
            </div>
            <div className="mb-greeting-chip">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          {/* ── NOUVELLE DISPOSITION : HÉROS (Stats à gauche, Dock Carte à droite) ── */}
          <div className="mb-hero">
            
            {/* Colonne de gauche (Bannière + Stats) */}
            <div className="mb-hero-left">
              {me && <MemberStatusBanner me={me} />}

              <div className="mb-stats">
                {stats.map((s, i) => (
                  <div
                    key={s.label}
                    className="mb-stat"
                    style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                  >
                    <div className="mb-stat-accent" style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}55)` }} />
                    <div className="mb-stat-top">
                      <span className="mb-stat-label">{s.label}</span>
                      <div className="mb-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                    </div>
                    <div className="mb-stat-value" style={{ color: s.urgent ? s.color : '#111827' }}>{String(s.value)}</div>
                    <div className="mb-stat-sub">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Colonne de droite (Le Dock de la Carte Virtuelle) */}
            <div className="mb-hero-right">
              <div className="mb-card-dock">
                
                {/* Le texte qui reste au fond quand on déplace la carte */}
                <div className="mb-dock-placeholder">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="mb-dock-text">Emplacement de la carte</span>
                </div>

                {/* La carte par-dessus */}
                <div className="mb-card-layer">
                  <VirtualCardWidget card={data.virtualCard || null} />
                </div>

              </div>
            </div>

          </div>

          {/* ── Row 1 : Contributions + Projects ── */}
          <div className="mb-grid2">

            {/* Cotisations */}
            <div className="mb-panel" style={{ animationDelay: '0.48s' }}>
              <div className="mb-panel-head">
                <div className="mb-panel-title">
                  <div className="mb-panel-ico">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l-4-4 4-4m6 8l4-4-4-4"/>
                    </svg>
                  </div>
                  Cotisations récentes
                </div>
                {(data.recentContributions?.length ?? 0) > 0 && (
                  <span className="mb-count-chip">{data.recentContributions!.length}</span>
                )}
              </div>
              <table className="mb-table">
                <thead>
                  <tr>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.recentContributions || []).length === 0 && <EmptyRow cols={3} label="Aucune cotisation enregistrée" />}
                  {(data.recentContributions || []).map(c => (
                    <tr key={c.id}>
                      <td className="mono">{formatCurrency(c.amount, c.currency)}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="muted">{formatDate(c.depositedAt || c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Projets */}
            <div className="mb-panel" style={{ animationDelay: '0.53s' }}>
              <div className="mb-panel-head">
                <div className="mb-panel-title">
                  <div className="mb-panel-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  Projets en cours
                </div>
                {(data.projectsInProgress?.length ?? 0) > 0 && (
                  <span className="mb-count-chip" style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                    {data.projectsInProgress!.length}
                  </span>
                )}
              </div>
              <table className="mb-table">
                <thead>
                  <tr>
                    <th>Projet</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.projectsInProgress || []).length === 0 && <EmptyRow cols={3} label="Aucun projet actif" />}
                  {(data.projectsInProgress || []).map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: '#111827' }}>{p.title}</td>
                      <td><StatusBadge status={p.status} /></td>
                      <td className="muted">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Row 2 : Contents + Late members ── */}
          <div className="mb-grid2">

            {/* Actualités */}
            <div className="mb-panel" style={{ animationDelay: '0.58s' }}>
              <div className="mb-panel-head">
                <div className="mb-panel-title">
                  <div className="mb-panel-ico" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                    </svg>
                  </div>
                  Informations récentes
                </div>
              </div>
              <table className="mb-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.latestContents || []).length === 0 && <EmptyRow cols={3} label="Aucune actualité publiée" />}
                  {(data.latestContents || []).map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: '#111827', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td className="muted">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Retardataires */}
            <div className="mb-panel" style={{ animationDelay: '0.63s' }}>
              <div className="mb-panel-head">
                <div className="mb-panel-title">
                  <div className="mb-panel-ico" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z"/>
                    </svg>
                  </div>
                  Retardataires · +3 mois
                </div>
                {(data.lateMembersPreview?.length ?? 0) > 0 && (
                  <span className="mb-count-chip" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                    {data.lateMembersPreview!.length}
                  </span>
                )}
              </div>
              <table className="mb-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Retard</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.lateMembersPreview || []).length === 0 && <EmptyRow cols={2} label="Aucun retardataire — bravo !" />}
                  {(data.lateMembersPreview || []).map(m => {
                    const months = m.lateMonths ?? 0;
                    const pct = Math.min((months / 12) * 100, 100);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="mb-member-pill">
                            <div className="mb-avatar-sm">
                              {(m.firstName[0] ?? '') + (m.lastName[0] ?? '')}
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>
                              {m.firstName} {m.lastName}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="mb-late-bar">
                            <div className="mb-late-track">
                              <div className="mb-late-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#DC2626', whiteSpace: 'nowrap' }}>
                              {months > 0 ? `${months} mois` : '—'}
                            </span>
                          </div>
                        </td>
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