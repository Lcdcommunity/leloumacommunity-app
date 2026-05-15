//web/app/(protected)/member/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { MemberStatusBanner } from '../../../components/member/MemberStatusBanner';
import { VirtualCardWidget } from '../../../components/member/VirtualCardWidget';
import { DashboardCarousel, CarouselProject, CarouselEvent } from '../../../components/member/DashboardCarousel';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../lib/format';
import type { UserSummary } from '../../../types/user';
import type { Contribution } from '../../../types/contribution';
import type { Project } from '../../../types/project';
import type { ContentPost } from '../../../types/content';
import { WelcomePopup } from '../../../components/member/WelcomePopup';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ApiFileAttachment {
  file?: { url?: string | null } | null;
}

type RawApiProject = Omit<Project, 'updatedAt'> & {
  updatedAt?: string | null;
  budgetPlanned?: number | null;
  budgetAmount?: number | null;
  budgetSpent?: number | null;
  amountSpent?: number | null;
  endsAt?: string | null;
  attachments?: ApiFileAttachment[] | null;
};

type ExtendedCarouselProject = CarouselProject & {
  updatedAt?: string | Date | null;
  endsAt?: string | Date | null;
  budgetPlanned?: number | null;
  budgetAmount?: number | null;
  budgetSpent?: number | null;
  amountSpent?: number | null;
};

type DashboardData = {
  stats: {
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
  me: UserSummary;
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
      profilePhotoUrl?: string | null;
      function?: string | null;
      professionalStatus?: string | null;
      originVillage?: string | null;
    };
  } | null;
  recentContributions: Contribution[];
  projectsInProgress: ExtendedCarouselProject[];
  latestContents: ContentPost[];
  upcomingEvents?: CarouselEvent[];
  lateMembersPreview: Array<{ id: string; firstName: string; lastName: string; lateMonths?: number }>;
  antennaBalances?: Array<{ id: string; name: string; balance: number; currency: string }>;
};

type BalanceSummary = {
  associationId: string;
  associationName: string;
  totalValidatedContributionsAmount: number;
  currency: string;
  lastUpdatedAt?: string | null;
};

// monthReference et yearReference sont exposés pour la détection correcte des états
type ExtendedContribution = Contribution & {
  purpose?: string | null;
  currency?: string;
  method?: string | null;
  validatedAt?: string | null;
  note?: string | null;
  depositedAt?: string | null;
  monthReference?: number | null;
  yearReference?: number | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED:          { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    PENDING:            { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    REJECTED:           { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    CANCELLED:          { label: 'Annulée',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    IN_PROGRESS:        { label: 'En cours',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    PUBLISHED:          { label: 'Publié',     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DRAFT:              { label: 'Brouillon',  color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
    APPROVED:           { label: 'Approuvé',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    COMPLETED:          { label: 'Terminé',    color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' },
    PROPOSED:           { label: 'Proposé',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  };
  return map[status] ?? { label: status, color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' };
}

function getPurposeConfig(purpose?: string | null) {
  const map: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    REGULAR_QUOTA:   { label: 'Cotisation',   icon: '📅', color: '#059669', bg: '#ECFDF5' },
    MEMBERSHIP_CARD: { label: 'Carte membre', icon: '💳', color: '#2563EB', bg: '#EFF6FF' },
    DONATION:        { label: 'Don libre',    icon: '🤝', color: '#D97706', bg: '#FFFBEB' },
  };
  return purpose ? (map[purpose] ?? null) : null;
}

function getMethodLabel(method?: string | null) {
  const map: Record<string, string> = {
    CASH: 'Espèces', BANK_TRANSFER: 'Virement bancaire', MOBILE_MONEY: 'Mobile Money',
  };
  return method ? (map[method] ?? method) : '—';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = getStatusConfig(status);
  return (
    <span className="mb-status-badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="mb-status-dot" style={{ background: s.color }} />
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

// ─── Contribution Detail Modal ───────────────────────────────────────────────

function ContributionDetailModal({
  item,
  currency,
  onClose,
}: {
  item: ExtendedContribution;
  currency: string;
  onClose: () => void;
}) {
  const purposeCfg = getPurposeConfig(item.purpose);
  const statusCfg = getStatusConfig(item.status);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem', animation: 'mbin2 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 420,
          background: '#fff', borderRadius: 22,
          padding: '0 0 1.5rem', maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
          animation: 'mbscale2 0.28s cubic-bezier(.22,1,.36,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.25rem', fontWeight: 500, color: '#111827' }}>
            Détail du versement
          </span>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '1.25rem 1.25rem 0', display: 'flex', alignItems: 'baseline', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2rem', fontWeight: 600, color: '#111827' }}>
            {formatCurrency(item.amount, item.currency || currency)}
          </span>
          <StatusBadge status={item.status} />
        </div>

        <div style={{ padding: '0.5rem 1.25rem 0', display: 'flex', flexDirection: 'column' }}>
          {[
            purposeCfg && {
              label: 'Motif',
              content: (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 600, padding: '0.25rem 0.65rem', borderRadius: 99, background: purposeCfg.bg, color: purposeCfg.color }}>
                  {purposeCfg.icon} {purposeCfg.label}
                </span>
              ),
            },
            { label: 'Méthode', content: <span style={{ fontSize: '0.83rem', color: '#1F2937', fontWeight: 500 }}>{getMethodLabel(item.method)}</span> },
            { label: 'Date du dépôt', content: <span style={{ fontSize: '0.83rem', color: '#1F2937', fontWeight: 500 }}>{formatDate(item.depositedAt || item.createdAt)}</span> },
            { label: 'Validation', content: <span style={{ fontSize: '0.83rem', fontWeight: 500, color: item.validatedAt ? '#1F2937' : '#9CA3AF' }}>{item.validatedAt ? formatDate(item.validatedAt) : 'En attente'}</span> },
            item.note && {
              label: 'Commentaire',
              content: (
                <span style={{ fontSize: '0.8rem', color: '#374151', fontStyle: 'italic', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.5rem 0.75rem', display: 'block', lineHeight: 1.55, textAlign: 'left' }}>
                  &ldquo;{item.note}&rdquo;
                </span>
              ),
            },
            { label: 'Statut', content: <span style={{ fontSize: '0.83rem', fontWeight: 700, color: statusCfg.color }}>{statusCfg.label}</span> },
          ].filter(Boolean).map((row, i) => {
            const r = row as { label: string; content: React.ReactNode };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0.72rem 0', borderBottom: '1px solid #F9FAFB', gap: '1rem' }}>
                <span style={{ fontSize: '0.71rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9CA3AF', flexShrink: 0, paddingTop: 2 }}>{r.label}</span>
                <div style={{ textAlign: 'right' }}>{r.content}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Modals Soldes & Association ─────────────────────────────────────────────

function CurrencyBalancesModal({
  currency, balances, onClose,
}: {
  currency: string;
  balances?: { id: string; name: string; balance: number; currency: string }[];
  onClose: () => void;
}) {
  const label = FIXED_CURRENCIES_MEMBER.find(c => c.cur === currency)?.label ?? `Soldes — ${currency}`;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 22, padding: '1.5rem', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.35rem', fontWeight: 700, color: '#111827', margin: 0 }}>{label}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {!balances || balances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏦</div>
              Aucune antenne n&apos;utilise cette devise pour le moment.
            </div>
          ) : balances.map(b => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: '#F9FAFB', borderRadius: 12, border: '1px solid #F3F4F6' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>{b.name}</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1rem', fontWeight: 800, color: '#2563EB' }}>{formatCurrency(b.balance, b.currency)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BalanceModal({ summary, onClose }: { summary: BalanceSummary | null; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', animation: 'mbin2 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, padding: '1.5rem', boxShadow: '0 24px 60px rgba(0,0,0,0.18)', animation: 'mbscale2 0.28s cubic-bezier(.22,1,.36,1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 600, color: '#111827', margin: 0 }}>Solde de l&apos;association</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {!summary ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#9CA3AF', fontSize: '0.85rem' }}>Données non disponibles</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#059669' }}>Total validé</span>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{formatCurrency(summary.totalValidatedContributionsAmount, summary.currency)}</span>
              <span style={{ fontSize: '0.74rem', color: '#6B7280' }}>{summary.associationName}</span>
            </div>
            {summary.lastUpdatedAt && (
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', textAlign: 'center', margin: 0 }}>Dernière mise à jour : {formatDate(summary.lastUpdatedAt)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const FIXED_CURRENCIES_MEMBER = [
  { cur: 'GNF', label: 'Solde antennes (GNF)',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { cur: 'EUR', label: 'Solde antennes (Euro)',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { cur: 'USD', label: 'Solde antennes (Dollar)', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { cur: 'XOF', label: 'Solde antennes (XOF)',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
];

// ─── Modal Détail Projet ─────────────────────────────────────────────────────

function ProjectDetailModal({ project, onClose }: { project: ExtendedCarouselProject; onClose: () => void }) {
  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; bar: string }> = {
    IN_PROGRESS: { label: 'En cours',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', bar: '#3B82F6' },
    APPROVED:    { label: 'Approuvé',  color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', bar: '#10B981' },
    COMPLETED:   { label: 'Terminé',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', bar: '#8B5CF6' },
    SUSPENDED:   { label: 'Suspendu',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', bar: '#F59E0B' },
    CANCELLED:   { label: 'Annulé',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', bar: '#EF4444' },
    DRAFT:       { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', bar: '#9CA3AF' },
    PROPOSED:    { label: 'Proposé',   color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', bar: '#9CA3AF' },
  };

  const cfg = STATUS_CFG[project.status || 'DRAFT'] ?? STATUS_CFG['DRAFT'];
  const planned = project.budgetPlanned ?? project.budgetAmount ?? 0;
  const spent   = project.budgetSpent   ?? project.amountSpent  ?? 0;
  const pct     = planned > 0 ? Math.min((spent / planned) * 100, 100) : 0;
  const over    = spent > planned && planned > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: 24, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 72px rgba(0,0,0,0.18)', animation: 'mbscale2 0.28s cubic-bezier(.22,1,.36,1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 4, background: cfg.bar, borderRadius: '24px 24px 0 0' }} />
        <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.7rem' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', fontSize: '0.62rem', fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 99, padding: '0.18rem 0.5rem', marginBottom: '0.45rem' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color }} />{cfg.label}
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.35rem', fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.25 }}>{project.title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div style={{ padding: '0 1.3rem 1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 110px)' }}>
          {project.description && (
            <div style={{ margin: '1rem 0 0', padding: '0.85rem 1rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>Description</div>
              <p style={{ fontSize: '0.83rem', color: '#374151', lineHeight: 1.65, margin: 0 }}>{project.description}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.75rem' }}>
            {[
              { label: 'Début',          value: project.startsAt ? formatDate(project.startsAt as string | Date) : '—' },
              { label: 'Fin prévue',     value: project.endsAt   ? formatDate(project.endsAt   as string | Date) : '—' },
              { label: 'Budget prévu',   value: planned > 0 ? formatCurrency(planned) : '—' },
              { label: 'Budget dépensé', value: spent > 0 ? formatCurrency(spent) : '—', urgent: over },
            ].map(row => (
              <div key={row.label} style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.8rem 0.9rem', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.63rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>{row.label}</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.05rem', fontWeight: 700, color: row.urgent ? '#DC2626' : '#111827' }}>{row.value}</div>
              </div>
            ))}
          </div>

          {planned > 0 && (
            <div style={{ marginTop: '0.65rem', background: '#F8FAFC', borderRadius: 12, padding: '0.85rem 1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.63rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Avancement budgétaire</span>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: over ? '#DC2626' : pct > 80 ? '#D97706' : '#059669' }}>{Math.round(pct)}%{over ? ' ⚠' : ''}</span>
              </div>
              <div style={{ height: 7, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: over ? 'linear-gradient(90deg,#F97316,#DC2626)' : pct > 80 ? '#F59E0B' : 'linear-gradient(90deg,#3B82F6,#6366F1)', transition: 'width 0.9s cubic-bezier(.22,1,.36,1)' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.65rem' }}>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.8rem 0.9rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Créé le</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{formatDate(project.createdAt as string | Date)}</div>
            </div>
            <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '0.8rem 0.9rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.35rem' }}>Mis à jour</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{formatDate((project.updatedAt || project.createdAt) as string | Date)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Détail Info/Actualité ─────────────────────────────────────────────

function ContentDetailModal({ content, onClose }: { content: ContentPost; onClose: () => void }) {
  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PUBLISHED: { label: 'Publié',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DRAFT:     { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    ARCHIVED:  { label: 'Archivé',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  };
  const cfg = STATUS_CFG[content.status] ?? STATUS_CFG['PUBLISHED'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 24, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 72px rgba(0,0,0,0.18)', animation: 'mbscale2 0.28s cubic-bezier(.22,1,.36,1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#059669,#10B981)', borderRadius: '24px 24px 0 0' }} />
        <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.7rem' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', fontSize: '0.62rem', fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 99, padding: '0.18rem 0.5rem', marginBottom: '0.45rem' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color }} />{cfg.label}
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.35rem', fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.25 }}>{content.title}</h2>
            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 500, marginTop: '0.35rem' }}>Publié le {formatDate(content.createdAt)}</div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ padding: '1.1rem 1.3rem 1.5rem' }}>
          {content.body ? (
            <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>{content.body}</div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.85rem' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>Aucun contenu disponible pour le moment.</div>
          )}
          {content.updatedAt && content.updatedAt !== content.createdAt && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #F3F4F6', fontSize: '0.7rem', color: '#CBD5E1', textAlign: 'right' }}>Dernière mise à jour : {formatDate(content.updatedAt)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function MemberHomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [myContributions, setMyContributions] = useState<ExtendedContribution[]>([]);
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ExtendedCarouselProject | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentPost | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<ExtendedContribution | null>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [pricing, setPricing] = useState<Record<string, { monthlyQuota: number; membershipCard: number }> | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dashRes, balanceRes, contribRes, projectsRes, contentsRes, lateRes] = await Promise.allSettled([
          api.dashboardMember(),
          api.getAssociationBalanceSummary(),
          // pageSize 120 pour couvrir jusqu'à une année d'avances (12 mois)
          // + l'historique récent sans risque de tronquer
          api.listMyContributions({ page: 1, pageSize: 120 }),
          api.listProjectsForMembers({ page: 1, pageSize: 5 }),
          api.listContentsForMembers({ page: 1, pageSize: 5 }),
          api.listLateMembersVisible({ page: 1, pageSize: 5 }),
        ]);

        if (dashRes.status === 'fulfilled') {
          const res = dashRes.value as DashboardData;

          if (res.virtualCard && res.virtualCard.user && res.me) {
            if (!res.virtualCard.user.function && res.me.function) {
              res.virtualCard.user.function = res.me.function;
            }
            if (!res.virtualCard.user.professionalStatus && res.me.professionalStatus) {
              res.virtualCard.user.professionalStatus = res.me.professionalStatus;
            }
            if (!res.virtualCard.user.originVillage && res.me.originSubPrefecture) {
              res.virtualCard.user.originVillage = res.me.originSubPrefecture;
            }
          }

          if (res.virtualCard?.user) {
            const u = res.virtualCard.user as { profilePhotoUrl?: string | null };
            if (u.profilePhotoUrl === null) u.profilePhotoUrl = undefined;
          }

          if (projectsRes.status === 'fulfilled') {
            const rawItems = projectsRes.value.items as unknown as RawApiProject[];
            res.projectsInProgress = rawItems
              .filter(p => !['DRAFT', 'CANCELLED', 'ARCHIVED'].includes(p.status as string))
              .map(p => ({
                id: p.id,
                title: p.title,
                summary: p.summary,
                description: p.description,
                startsAt: p.startsAt,
                endsAt: p.endsAt,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                status: p.status,
                coverImageFileId: p.coverImageFileId,
                locationText: p.locationText,
                budgetPlanned: p.budgetPlanned,
                budgetAmount: p.budgetAmount,
                budgetSpent: p.budgetSpent,
                amountSpent: p.amountSpent,
                attachments: Array.isArray(p.attachments)
                  ? p.attachments.map(a => ({ file: { url: (a as unknown as { url?: string | null }).url || null } }))
                  : null,
              })) as ExtendedCarouselProject[];
            if (res.stats) res.stats.activeProjects = res.projectsInProgress.length;
          }
          if (contentsRes.status === 'fulfilled') {
            res.latestContents = (contentsRes.value.items as ContentPost[]).slice(0, 5);
          }
          if (lateRes.status === 'fulfilled') {
            res.lateMembersPreview = lateRes.value.items as Array<{ id: string; firstName: string; lastName: string; lateMonths?: number }>;
          }

          setData(res);
        } else {
          setError(dashRes.reason instanceof Error ? dashRes.reason.message : 'Erreur chargement dashboard');
        }

        if (balanceRes.status === 'fulfilled') {
          setBalanceSummary(balanceRes.value as BalanceSummary);
        }
        if (contribRes.status === 'fulfilled') {
          setMyContributions((contribRes.value?.items ?? []) as ExtendedContribution[]);
        }

        // Pricing
        try {
          const pricingRes = await api.getAssociationPricing();
          setPricing(pricingRes);
        } catch { /* ignore */ }

        // Popup 2x/jour : slot 'am' (avant midi) + slot 'pm' (après midi)
        const popupUserId = (dashRes.status === 'fulfilled'
          ? (dashRes.value as DashboardData)?.me?.id
          : null) ?? 'anon';

        setTimeout(() => {
          const dateStr = new Date().toISOString().slice(0, 10);
          const slot = new Date().getHours() < 12 ? 'am' : 'pm';
          const popupKey = `wp_seen_${popupUserId}_${dateStr}_${slot}`;
          if (!sessionStorage.getItem(popupKey)) {
            sessionStorage.setItem(popupKey, '1');
            setShowWelcomePopup(true);
          }
        }, 500);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inattendue');
      }
    };
    void fetchAll();
  }, []);

  const me = data?.me;

  const recentContribs = useMemo<ExtendedContribution[]>(() => {
    return myContributions.length > 0
      ? myContributions
      : (data?.recentContributions ?? []) as ExtendedContribution[];
  }, [myContributions, data?.recentContributions]);

  const myAntennaId = data?.me?.antennaId;
  const myAntenna = data?.antennaBalances?.find(a => a.id === myAntennaId);
  const cur = data?.stats?.currency || myAntenna?.currency || balanceSummary?.currency || 'EUR';

  // lateMonths vient du backend (source de vérité — calculé via monthReference/yearReference)
  const lateMonths = data?.stats?.lateMonths ?? 0;

  const lastContribDate = useMemo(() => {
    const fromStats = data?.stats?.myLastContributionAt;
    if (fromStats) return fromStats;
    if (recentContribs.length > 0) {
      const dates = recentContribs
        .map(c => new Date(c.depositedAt || c.createdAt).getTime())
        .filter(t => !isNaN(t));
      if (dates.length > 0) return new Date(Math.max(...dates)).toISOString();
    }
    return null;
  }, [data?.stats?.myLastContributionAt, recentContribs]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();

  // ── hasRegularThisMonth ────────────────────────────────────────────────────
  // Court-circuit principal : si lateMonths === 0, le backend confirme que le
  // membre est à jour (y compris s'il a anticipé plusieurs mois).
  // Sinon, on vérifie finement dans les contributions chargées via
  // monthReference/yearReference (jamais via depositedAt qui est une date de saisie).
  const hasRegularThisMonth = useMemo(() => {
    if (lateMonths === 0 && data !== null) return true;

    return recentContribs.some(c => {
      if (c.purpose !== 'REGULAR_QUOTA' && c.purpose !== 'LATE_QUOTA') return false;
      if (c.status !== 'VALIDATED' && c.status !== 'PENDING_VALIDATION') return false;

      // Priorité absolue à monthReference/yearReference (logique métier)
      if (c.monthReference != null && c.yearReference != null) {
        return c.monthReference === currentMonth && c.yearReference === currentYear;
      }

      // Fallback uniquement pour les anciennes contributions sans référence
      const cDate = new Date(c.depositedAt || c.createdAt);
      return cDate.getMonth() + 1 === currentMonth && cDate.getFullYear() === currentYear;
    });
  }, [recentContribs, currentMonth, currentYear, lateMonths, data]);

  // ── hasActiveCard ──────────────────────────────────────────────────────────
  // Une carte VALIDÉE cette année = membre couvert.
  // Une carte PENDING_VALIDATION cette année = démarche engagée → on considère
  // que la carte est "en cours" pour ne pas redemander le paiement.
  const hasActiveCard = useMemo(() => {
    return recentContribs.some(c => {
      if (c.purpose !== 'MEMBERSHIP_CARD') return false;
      // VALIDATED = carte active | PENDING_VALIDATION = soumise, pas encore activée
      if (c.status !== 'VALIDATED' && c.status !== 'PENDING_VALIDATION') return false;
      const cDate = new Date(c.depositedAt || c.createdAt);
      return cDate.getFullYear() === currentYear;
    });
  }, [recentContribs, currentYear]);

  // ── hasPendingContribution ─────────────────────────────────────────────────
  // Détecte si une cotisation régulière ou de retard a été soumise
  // mais n'est pas encore validée par l'admin.
  // → Permet d'afficher le mode latePending ou regularPending dans le popup.
  const hasPendingContribution = useMemo(() => {
    return recentContribs.some(c =>
      (c.purpose === 'REGULAR_QUOTA' || c.purpose === 'LATE_QUOTA') &&
      c.status === 'PENDING_VALIDATION',
    );
  }, [recentContribs]);

  // ── hasPendingCard ─────────────────────────────────────────────────────────
  // Détecte si une carte membre a été soumise mais n'est pas encore validée.
  // → Permet d'afficher le mode cardPending dans le popup.
  const hasPendingCard = useMemo(() => {
    return recentContribs.some(c =>
      c.purpose === 'MEMBERSHIP_CARD' &&
      c.status === 'PENDING_VALIDATION',
    );
  }, [recentContribs]);

  const popupCurrency = cur || 'EUR';
  const popupPricing  = pricing?.[popupCurrency] ?? pricing?.['EUR'] ?? null;
  const firstName = data?.me?.firstName || data?.virtualCard?.user?.firstName || 'Membre';

  type StatCard = {
    label: string; value: string | number; icon: React.ReactNode;
    color: string; bg: string; sub: string; spanClass: string;
    urgent?: boolean; clickable?: boolean; onClick?: () => void;
  };

  const mbCurrencyGroups = useMemo(() => {
    if (!data?.antennaBalances) return {} as Record<string, { total: number; antennas: { id: string; name: string; balance: number; currency: string }[] }>;
    return data.antennaBalances.reduce<Record<string, { total: number; antennas: { id: string; name: string; balance: number; currency: string }[] }>>((acc, curr) => {
      const c = curr.currency || 'EUR';
      if (!acc[c]) acc[c] = { total: 0, antennas: [] };
      acc[c].total += curr.balance;
      acc[c].antennas.push(curr);
      return acc;
    }, {});
  }, [data]);

  const stats: StatCard[] = data ? [
    ...FIXED_CURRENCIES_MEMBER.map(({ cur: fc, label, color, bg }) => {
      const grp = mbCurrencyGroups[fc] ?? { total: 0, antennas: [] };
      return {
        label,
        value: formatCurrency(grp.total, fc),
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/></svg>,
        color, bg,
        sub: grp.antennas.length > 0 ? `${grp.antennas.length} antenne${grp.antennas.length > 1 ? 's' : ''} · Clic` : 'Aucune antenne · Clic',
        clickable: true,
        onClick: () => setSelectedCurrency(fc),
        spanClass: 'mb-span-1',
      };
    }),
    {
      label: 'Retard', value: `${lateMonths} mois`,
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>,
      color: lateMonths > 0 ? '#DC2626' : '#059669', bg: lateMonths > 0 ? '#FEF2F2' : '#ECFDF5',
      sub: lateMonths > 0 ? 'Mois non cotisés' : 'À jour !', urgent: lateMonths > 2, spanClass: 'mb-span-1',
    },
    {
      label: 'Dernière cotisation', value: lastContribDate ? formatDate(lastContribDate) : '—',
      icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
      color: '#4B5563', bg: '#F3F4F6', sub: 'Date du dernier versement', spanClass: 'mb-span-1',
    },
  ] : [];

  return (
    <AppShell title="Espace membre">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@400;500;600;700;800&display=swap');

        @keyframes mbin  { to { opacity: 1; transform: translateY(0); } }
        @keyframes mbin2 { from { opacity: 0; } to { opacity: 1; } }
        @keyframes mbscale2 {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes mbpulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
        @keyframes mbspin  { to { transform: rotate(360deg); } }

        .mb-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          padding-bottom: 8rem;
          max-width: 1280px; margin: 0 auto;
        }

        .mb-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
          margin-bottom: 2rem; padding-bottom: 1.5rem;
          border-bottom: 1px solid rgba(37,99,235,0.10);
          opacity: 0; transform: translateY(10px);
          animation: mbin 0.5s 0.05s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mb-eyebrow {
          font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; color: #2563EB; margin-bottom: 0.4rem;
          display: flex; align-items: center; gap: 0.4rem;
        }
        .mb-eyebrow-dot {
          width: 6px; height: 6px; background: #3B82F6; border-radius: 50%;
          animation: mbpulse 2s ease-in-out infinite;
        }
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
          background: rgba(37,99,235,0.06); border: 1px solid rgba(37,99,235,0.15);
          border-radius: 8px; padding: 0.5rem 1rem; white-space: nowrap;
        }

        .mb-stats {
          display: grid; grid-template-columns: repeat(6, 1fr);
          gap: 0.75rem; margin-bottom: 1.5rem;
        }
        .mb-span-1 { grid-column: span 1; }
        @media (max-width: 1100px) { .mb-stats { grid-template-columns: repeat(3, 1fr); } }

        .mb-stat {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          background: rgba(253,253,255,0.9); backdrop-filter: blur(12px);
          border-radius: 18px; padding: 1.2rem 1.25rem;
          border: 1px solid rgba(37,99,235,0.12);
          box-shadow: 0 4px 12px rgba(37,99,235,0.04), 0 0 0 1px rgba(255,255,255,0.8) inset;
          position: relative; overflow: hidden;
          opacity: 0; transform: translateY(14px);
          animation: mbin 0.5s cubic-bezier(.22,1,.36,1) forwards;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .mb-stat-clickable { cursor: pointer; }
        .mb-stat-clickable:hover {
          transform: translateY(-3px) scale(1.01);
          box-shadow: 0 12px 24px rgba(37,99,235,0.12), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        .mb-stat:not(.mb-stat-clickable):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(37,99,235,0.08), 0 0 0 1px rgba(255,255,255,0.9) inset;
        }
        .mb-stat-accent {
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
          border-radius: 18px 18px 0 0;
        }
        .mb-stat-top {
          display: flex; flex-direction: column-reverse; align-items: center; justify-content: center;
          gap: 0.4rem; margin-bottom: 0.8rem; width: 100%;
        }
        .mb-stat-label {
          font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: #4B5563; max-width: 110px; line-height: 1.4; text-align: center;
        }
        .mb-stat-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mb-stat-value {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.85rem; font-weight: 700; color: #111827;
          letter-spacing: -0.03em; line-height: 1; margin-bottom: 0.4rem; word-break: break-word; text-align: center;
        }
        .mb-stat-sub { font-size: 0.72rem; color: #6B7280; font-weight: 600; text-align: center; }

        .mb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.5rem; }
        @media (max-width: 860px) { .mb-grid2 { grid-template-columns: 1fr; } }

        .mb-panel {
          background: rgba(253,253,255,0.9); backdrop-filter: blur(12px);
          border-radius: 20px; border: 1px solid rgba(37,99,235,0.12);
          box-shadow: 0 4px 15px rgba(37,99,235,0.03), 0 0 0 1px rgba(255,255,255,0.8) inset;
          overflow: hidden; max-width: 100%;
          opacity: 0; animation: mbin 0.5s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mb-panel-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.2rem 1.4rem; border-bottom: 1px solid rgba(37,99,235,0.08);
        }
        .mb-panel-title {
          font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: #1F2937;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .mb-panel-ico {
          width: 28px; height: 28px; background: #EFF6FF;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          color: #2563EB;
        }
        .mb-count-chip {
          font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.6rem;
          border-radius: 99px; background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;
        }
        .mb-panel-body { overflow-x: hidden; width: 100%; }
        .mb-table { width: 100%; border-collapse: collapse; }
        .mb-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.1); }
        .mb-table thead th {
          padding: 0.75rem 1.4rem;
          font-size: 0.68rem; font-weight: 800; letter-spacing: 0.09em;
          text-transform: uppercase; color: #6B7280; text-align: left;
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

        .mb-contrib-row { cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .mb-contrib-row:hover { background: rgba(37,99,235,0.04) !important; }
        .mb-contrib-row:active { background: rgba(37,99,235,0.08) !important; }

        .mb-cards-viewport { overflow: hidden; width: 100%; padding: 1.25rem 0; position: relative; }
        .mb-cards-track {
          display: flex; gap: 1rem; width: max-content;
          padding: 0 1.4rem;
          animation: panCards 18s ease-in-out infinite alternate;
        }
        .mb-cards-track:hover, .mb-cards-track:active { animation-play-state: paused; }
        @keyframes panCards {
          0%, 5% { transform: translateX(0); }
          95%, 100% { transform: translateX(calc(-100% + 100vw - 3rem)); }
        }
        @media (min-width: 1024px) {
          .mb-cards-track { animation: none; flex-wrap: wrap; width: 100%; }
        }

        .mb-true-card {
          min-width: 250px; max-width: 280px; flex: 0 0 auto;
          min-height: 180px;
          border-radius: 18px; padding: 1.1rem 1.25rem;
          display: flex; flex-direction: column; gap: 0.65rem;
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 4px 15px rgba(0,0,0,0.05); position: relative;
          cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
        }
        .mb-true-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
        .mb-tc-proj { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-color: #BFDBFE; }
        .mb-tc-news { background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-color: #A7F3D0; }
        .mb-tc-title { font-size: 0.95rem; font-weight: 800; color: #111827; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .mb-tc-meta { font-size: 0.72rem; color: #4B5563; font-weight: 500; display: flex; align-items: center; gap: 0.4rem; margin-top: auto; }
        .mb-tc-btn { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 0.4rem; }
        .mb-empty { text-align: center; padding: 2.5rem 1rem; color: #9CA3AF; font-size: 0.85rem; font-weight: 500; }

        .mb-member-pill { display: flex; align-items: center; gap: 0.6rem; }
        .mb-avatar-sm {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #2563EB, #3B82F6);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem; font-weight: 700; color: white; flex-shrink: 0;
        }
        .mb-late-bar { display: flex; align-items: center; gap: 0.6rem; }
        .mb-late-track { flex: 1; height: 5px; background: #FEE2E2; border-radius: 99px; overflow: hidden; max-width: 65px; }
        .mb-late-fill  { height: 100%; background: #DC2626; border-radius: 99px; }

        .mb-fab {
          position: fixed; bottom: calc(64px + 1rem); right: 1rem; z-index: 100;
          background: linear-gradient(135deg, #10B981 0%, #065F46 100%);
          color: white; border: none; border-radius: 50px;
          padding: 0.85rem 1.4rem;
          font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: 0.88rem;
          cursor: pointer; display: flex; align-items: center; gap: 0.55rem;
          box-shadow: 0 6px 20px rgba(16,185,129,0.35), 0 2px 8px rgba(0,0,0,0.12);
          transition: transform 0.2s, box-shadow 0.2s;
          opacity: 0; animation: mbin 0.5s 0.5s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mb-fab:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 10px 28px rgba(16,185,129,0.45), 0 4px 10px rgba(0,0,0,0.15); }
        .mb-fab:active { transform: scale(0.97); }

        .mb-modal-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem; animation: mbin2 0.25s ease forwards;
        }
        .mb-modal-inner {
          position: relative; width: 100%; max-width: 420px;
          animation: mbscale2 0.3s cubic-bezier(.22,1,.36,1) forwards;
        }
        .mb-modal-close {
          position: absolute; top: -0.75rem; right: -0.75rem; z-index: 10;
          width: 34px; height: 34px; background: white;
          border: 1px solid rgba(0,0,0,0.12); border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15); color: #374151;
          transition: background 0.15s, transform 0.15s;
        }
        .mb-modal-close:hover { background: #F3F4F6; transform: scale(1.1); }

        .mb-error {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 1rem 1.25rem;
          background: rgba(185,28,28,0.06); border: 1px solid rgba(185,28,28,0.18);
          border-radius: 14px; color: #B91C1C; font-size: 0.82rem;
          margin-bottom: 1.5rem; font-family: 'DM Sans', sans-serif;
        }
        .mb-loader {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 55vh; gap: 1rem;
          color: #6B7280; font-size: 0.85rem; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
        }
        .mb-ring {
          width: 40px; height: 40px;
          border: 3px solid rgba(37,99,235,0.1); border-top-color: #2563EB;
          border-radius: 50%; animation: mbspin 0.8s linear infinite;
        }

        .mb-status-badge { display: inline-flex; align-items: center; gap: 0.28rem; font-size: 0.7rem; font-weight: 800; border-radius: 99px; padding: 0.18rem 0.6rem; white-space: nowrap; }
        .mb-status-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .mb-motif-badge { display: inline-flex; align-items: center; gap: 0.28rem; font-size: 0.68rem; font-weight: 600; border-radius: 99px; padding: 0.18rem 0.55rem; white-space: nowrap; max-width: 100%; }
        .mb-motif-icon { flex-shrink: 0; }
        .mb-motif-text { overflow: hidden; text-overflow: ellipsis; }
        .truncate-cell { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .mb-stats { grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
          .mb-stat { padding: 0.6rem 0.5rem !important; border-radius: 12px !important; }
          .mb-stat-value { font-size: 1.1rem !important; word-break: break-word; }
          .mb-stat-label { font-size: 0.52rem !important; }
          .mb-stat-sub   { font-size: 0.5rem !important; }
          .mb-stat-icon  { width: 24px !important; height: 24px !important; border-radius: 6px !important; }
          .mb-stat-icon svg { width: 12px; height: 12px; }
          .mb-stat-top { flex-direction: column-reverse !important; gap: 0.2rem !important; margin-bottom: 0.4rem !important; }
          .mb-panel-head { padding: 1rem; }
          .mb-table { min-width: unset; width: 100%; }
          .mb-table th { padding: 0.5rem 0.2rem; font-size: 0.55rem; letter-spacing: 0; text-align: center !important; }
          .mb-table td { padding: 0.5rem 0.2rem; font-size: 0.68rem; text-align: center !important; }
          .mb-table td.mono { font-size: 0.75rem; }
          .mb-status-badge { font-size: 0.52rem; padding: 0.1rem 0.28rem; gap: 0.18rem; }
          .mb-motif-badge  { font-size: 0.52rem; padding: 0.1rem 0.28rem; }
          .truncate-cell { max-width: 90px; overflow-wrap: break-word; white-space: normal; line-height: 1.2; }
          .mb-true-card { min-width: 200px; max-width: 220px; }
          .mb-cards-viewport { overflow: hidden; }
          .mb-cards-track { animation-duration: 10s; }
          .mb-member-pill { gap: 0.4rem; }
          .mb-late-track { max-width: 45px; }
        }
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
            <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
          </svg>
          {error}
        </div>
      )}

      {data && (
        <div className="mb-wrap">
          <div className="mb-header">
            <div>
              <div className="mb-eyebrow"><div className="mb-eyebrow-dot"/>Espace membre</div>
              <h1 className="mb-title">Bonjour, <span>{firstName}</span></h1>
            </div>
            <div className="mb-greeting-chip">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          {me && <MemberStatusBanner me={me} />}

          <div className="mb-stats" style={{ marginTop: '1.5rem' }}>
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`mb-stat mb-span-1${s.clickable ? ' mb-stat-clickable' : ''}`}
                style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                onClick={s.onClick}
                role={s.clickable ? 'button' : undefined}
                tabIndex={s.clickable ? 0 : undefined}
              >
                <div className="mb-stat-accent" style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}55)` }} />
                {s.urgent && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 18, border: `1.5px solid ${s.color}50`, pointerEvents: 'none' }}/>
                )}
                <div className="mb-stat-top">
                  <span className="mb-stat-label">{s.label}</span>
                  <div className="mb-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                </div>
                <div className="mb-stat-value" style={{ color: s.urgent ? s.color : '#111827' }}>{String(s.value)}</div>
                <div className="mb-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

          <DashboardCarousel
            projects={data.projectsInProgress}
            news={data.latestContents}
            events={data.upcomingEvents}
          />

          <div className="mb-grid2">
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
                {recentContribs.length > 0 && (
                  <span className="mb-count-chip">{recentContribs.length}</span>
                )}
              </div>
              <div className="mb-panel-body">
                <table className="mb-table">
                  <thead>
                    <tr>
                      <th>Montant</th>
                      <th>Motif</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentContribs.length === 0 && (
                      <EmptyRow cols={3} label="Aucune cotisation enregistrée"/>
                    )}
                    {/* Afficher les 10 plus récentes dans le tableau
                        (on charge 120 pour les calculs métier, on n'affiche pas tout) */}
                    {recentContribs.slice(0, 10).map(c => {
                      const pc = getPurposeConfig(c.purpose);
                      return (
                        <tr key={c.id} className="mb-contrib-row" onClick={() => setSelectedContribution(c)} title="Voir le détail">
                          <td className="mono">{formatCurrency(c.amount, c.currency || cur)}</td>
                          <td>
                            {pc ? (
                              <span className="mb-motif-badge" style={{ background: pc.bg, color: pc.color }}>
                                <span className="mb-motif-icon">{pc.icon}</span>
                                <span className="mb-motif-text">{pc.label}</span>
                              </span>
                            ) : (
                              <span className="mb-motif-badge" style={{ background: '#ECFDF5', color: '#059669' }}>
                                <span className="mb-motif-icon">📅</span>
                                <span className="mb-motif-text">Cotisation</span>
                              </span>
                            )}
                          </td>
                          <td><StatusBadge status={c.status}/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-panel" style={{ animationDelay: '0.53s' }}>
              <div className="mb-panel-head">
                <div className="mb-panel-title">
                  <div className="mb-panel-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  Projets en cours
                </div>
                {(data.projectsInProgress?.length ?? 0) > 0 && (
                  <span className="mb-count-chip" style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                    {data.projectsInProgress.length}
                  </span>
                )}
              </div>
              <div className="mb-cards-viewport">
                {(data.projectsInProgress || []).length === 0 ? (
                  <div className="mb-empty">Aucun projet actif</div>
                ) : (
                  <div className="mb-cards-track">
                    {(data.projectsInProgress || []).map(p => (
                      <div key={p.id} className="mb-true-card mb-tc-proj" onClick={() => setSelectedProject(p)}>
                        <StatusBadge status={p.status || 'DRAFT'}/>
                        <div className="mb-tc-title">{p.title}</div>
                        <div className="mb-tc-meta">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Mis à jour le {formatDate(p.updatedAt || p.createdAt || null)}
                        </div>
                        <div className="mb-tc-btn" style={{ color: '#2563EB' }}>Voir le projet ➔</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-grid2">
            <div className="mb-panel" style={{ animationDelay: '0.58s' }}>
              <div className="mb-panel-head">
                <div className="mb-panel-title">
                  <div className="mb-panel-ico" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                    </svg>
                  </div>
                  Informations récentes
                </div>
              </div>
              <div className="mb-cards-viewport">
                {(data.latestContents || []).length === 0 ? (
                  <div className="mb-empty">Aucune actualité publiée</div>
                ) : (
                  <div className="mb-cards-track">
                    {(data.latestContents || []).map(c => (
                      <div key={c.id} className="mb-true-card mb-tc-news" onClick={() => setSelectedContent(c)}>
                        <StatusBadge status={c.status}/>
                        <div className="mb-tc-title">{c.title}</div>
                        <div className="mb-tc-meta">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Publié le {formatDate(c.createdAt)}
                        </div>
                        <div className="mb-tc-btn" style={{ color: '#059669' }}>Lire l&apos;article ➔</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mb-panel" style={{ animationDelay: '0.63s' }}>
              <div className="mb-panel-head">
                <div className="mb-panel-title">
                  <div className="mb-panel-ico" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                  </div>
                  Retardataires · +3 mois
                </div>
                {(data.lateMembersPreview?.length ?? 0) > 0 && (
                  <span className="mb-count-chip" style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                    {data.lateMembersPreview.length}
                  </span>
                )}
              </div>
              <div className="mb-panel-body">
                <table className="mb-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Membre</th>
                      <th>Retard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.lateMembersPreview || []).length === 0 && <EmptyRow cols={2} label="Aucun retardataire — bravo !"/>}
                    {(data.lateMembersPreview || []).map(m => {
                      const months = m.lateMonths ?? 0;
                      return (
                        <tr key={m.id}>
                          <td>
                            <div className="mb-member-pill">
                              <div className="mb-avatar-sm">{(m.firstName[0] ?? '') + (m.lastName[0] ?? '')}</div>
                              <span className="truncate-cell" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{m.firstName} {m.lastName}</span>
                            </div>
                          </td>
                          <td>
                            <div className="mb-late-bar">
                              <div className="mb-late-track">
                                <div className="mb-late-fill" style={{ width: `${Math.min((months / 12) * 100, 100)}%` }}/>
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
        </div>
      )}

      {data && (
        <button type="button" className="mb-fab" onClick={() => setIsCardVisible(true)} aria-label="Afficher ma carte virtuelle">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
          Ma carte
        </button>
      )}

      {isCardVisible && (
        <div className="mb-modal-overlay" onClick={() => setIsCardVisible(false)}>
          <div className="mb-modal-inner" onClick={e => e.stopPropagation()}>
            <button type="button" className="mb-modal-close" onClick={() => setIsCardVisible(false)} aria-label="Fermer">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
            <VirtualCardWidget card={data?.virtualCard || null}/>
          </div>
        </div>
      )}

      {selectedContribution && (
        <ContributionDetailModal
          item={selectedContribution}
          currency={cur}
          onClose={() => setSelectedContribution(null)}
        />
      )}

      {showBalanceModal && (
        <BalanceModal
          summary={balanceSummary}
          onClose={() => setShowBalanceModal(false)}
        />
      )}

      {selectedCurrency && (
        <CurrencyBalancesModal
          currency={selectedCurrency}
          balances={mbCurrencyGroups[selectedCurrency]?.antennas}
          onClose={() => setSelectedCurrency(null)}
        />
      )}

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {selectedContent && (
        <ContentDetailModal
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}

      {showWelcomePopup && data && (
        <WelcomePopup
          firstName={firstName}
          lateMonths={lateMonths}
          // true si le mois courant n'est pas couvert (pas de contribution validée ou en attente)
          hasRegularPending={!hasRegularThisMonth}
          // true si pas de carte validée NI en attente pour cette année
          hasCardPending={!hasActiveCard}
          currency={popupCurrency}
          regularAmount={popupPricing?.monthlyQuota ?? null}
          cardAmount={popupPricing?.membershipCard ?? null}
          // ✅ CÂBLAGE CORRECT : ces deux props déclenchent les modes *Pending
          hasPendingContribution={hasPendingContribution}
          hasPendingCard={hasPendingCard}
          onClose={() => setShowWelcomePopup(false)}
        />
      )}
    </AppShell>
  );
}