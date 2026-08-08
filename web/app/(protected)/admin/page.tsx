// web/app/(protected)/admin/page.tsx
// v3.1 — CHANGELOG :
// ── CORRIGÉ (07/08) : texte figé "plus de 3 mois" dans l'alerte
//    "Membres en retard de cotisation" — le seuil réel de cette liste
//    (/admin/late-members, admin.service.ts::listLateMembers) est
//    désormais de 1 mois, pas 3 (cf. chantier "cas Thierno" / harmonisation
//    du retard). Le libellé mentait donc depuis ce changement.
//
// v3.0 — CHANGELOG :
// ── AJOUTÉ : panneaux "Projets en cours" et "Informations récentes" en
//    défilement horizontal (cartes ad-true-card), même comportement que
//    super-admin/membre. Modals de détail associés (ProjectDetailModal,
//    ContentDetailModal). Le carrousel photo (DashboardCarousel) déjà présent
//    est conservé tel quel. La section "Alertes & Rappels" reste en bas de
//    page — les nouveaux panneaux sont insérés juste avant elle.
// ── CORRIGÉ : import de formatDate (manquant, nécessaire aux nouvelles cartes).
// ── AJOUTÉ : StatusBadge étendu (au-delà de PENDING) pour bien libeller les
//    statuts de projets/actualités affichés dans les nouvelles cartes.

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../components/layout/AppShell';
import { DashboardCarousel, CarouselProject } from '../../../components/member/DashboardCarousel';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate } from '../../../lib/format';
import type { Project } from '../../../types/project';
import type { ContentPost } from '../../../types/content';

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

// ── AJOUTÉ : retardataires (carte cliquable) ────────────────────────────────
// Le montant est estimé (mois de retard × cotisation mensuelle de la devise
// du membre, avec repli sur GNF si l'entrée ne précise pas de devise) tant
// que le backend ne renvoie pas un montant déjà calculé — cf. résumé final.
interface ApiFileAttachment {
  file?: { url?: string | null } | null;
}

interface LateMemberEntry {
  id: string;
  firstName: string;
  lastName: string;
  lateMonths?: number;
  antennaName?: string;
  currency?: string;
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

type PricingMap = Record<string, { monthlyQuota: number; membershipCard: number }>;

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

// ── CHANGÉ : map étendue au-delà de PENDING pour libeller correctement les
//   statuts de projets/actualités affichés dans les nouvelles cartes.
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PENDING:            { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    VALIDATED:          { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    IN_PROGRESS:        { label: 'En cours',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    APPROVED:           { label: 'Approuvé',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    COMPLETED:          { label: 'Terminé',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    SUSPENDED:          { label: 'Suspendu',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    CANCELLED:          { label: 'Annulé',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PROPOSED:           { label: 'Proposé',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    DRAFT:              { label: 'Brouillon',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    PUBLISHED:          { label: 'Publié',     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    ARCHIVED:           { label: 'Archivé',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    REJECTED:           { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
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

// ── AJOUTÉ : carte "Membres en retard" cliquable → nom, prénom, montant ────
function LateMembersModal({
  members,
  pricing,
  onClose,
}: {
  members: LateMemberEntry[];
  pricing: PricingMap | null;
  onClose: () => void;
}) {
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
        border: "1px solid rgba(220,38,38,.15)",
        boxShadow: "0 24px 60px rgba(220,38,38,.12)",
        maxHeight: "85vh", overflowY: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "1.4rem", fontWeight: 700, color: "#111827", margin: 0 }}>
            Membres en retard
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {members.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#9CA3AF", fontSize: "0.85rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎉</div>
              Aucun retardataire pour le moment.
            </div>
          ) : (
            members.map((m) => {
              const currency = m.currency || 'GNF';
              const monthly = pricing?.[currency]?.monthlyQuota ?? 0;
              const months = m.lateMonths ?? 0;
              const montant = months * monthly;
              return (
                <div key={m.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.9rem 1.1rem", background: "#FEF2F2", borderRadius: 14,
                  border: "1px solid #FECACA"
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <div className="ad-avatar" style={{ background: 'linear-gradient(135deg,#DC2626,#F87171)' }}>{getInitials(m.firstName, m.lastName)}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>{m.firstName} {m.lastName}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#DC2626' }}>{months > 0 ? `${months} mois` : '—'}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.9rem", fontWeight: 800, color: "#991B1B" }}>
                      {monthly > 0 ? formatCurrency(montant, currency) : '—'}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ── AJOUTÉ : détail projet — même comportement que membre/super-admin ──────
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 500, background: '#fff', borderRadius: 24, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 72px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 4, background: cfg.bar, borderRadius: '24px 24px 0 0' }} />
        <div style={{ padding: '1.1rem 1.3rem 0.8rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.7rem' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.22rem', fontSize: '0.62rem', fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 99, padding: '0.18rem 0.5rem', marginBottom: '0.45rem' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: cfg.color }} />{cfg.label}
            </span>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.35rem', fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.25 }}>{project.title}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F3F4F6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div style={{ padding: '0 1.3rem 1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 110px)' }}>
          {project.description && (
            <div style={{ margin: '1rem 0 0', padding: '0.85rem 1rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.63rem', fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.4rem' }}>Description</div>
              <p style={{ fontSize: '0.83rem', color: '#374151', lineHeight: 1.65, margin: 0 }}>{project.description}</p>
            </div>
          )}

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

// ── AJOUTÉ : détail actualité — même comportement que membre/super-admin ───
function ContentDetailModal({ content, onClose }: { content: ContentPost; onClose: () => void }) {
  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PUBLISHED: { label: 'Publié',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DRAFT:     { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    ARCHIVED:  { label: 'Archivé',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  };
  const cfg = STATUS_CFG[content.status] ?? STATUS_CFG['PUBLISHED'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 24, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 72px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
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
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ padding: '1.1rem 1.3rem 1.5rem' }}>
          {content.body ? (
            <div style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontFamily: "'DM Sans', sans-serif" }}>{content.body}</div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.85rem' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>Aucun contenu disponible pour le moment.</div>
          )}
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

  // ── AJOUTÉ : harmonisation avec les dashboards super-admin/membre ────────
  const [lateMembers, setLateMembers] = useState<LateMemberEntry[]>([]);
  const [showLateMembersModal, setShowLateMembersModal] = useState(false);
  const [projectsInProgress, setProjectsInProgress] = useState<ExtendedCarouselProject[]>([]);
  const [latestContents, setLatestContents] = useState<ContentPost[]>([]);
  const [pricing, setPricing] = useState<PricingMap | null>(null);
  // ── AJOUTÉ : sélection pour les nouveaux panneaux "Projets en cours" /
  //   "Informations récentes" (défilement horizontal).
  const [selectedProject, setSelectedProject] = useState<ExtendedCarouselProject | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentPost | null>(null);

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

  // ── AJOUTÉ : retardataires + carrousel projets/actus, en parallèle du
  //   dashboard principal (n'affecte pas son état de chargement/erreur).
  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const [lateRes, projectsRes, contentsRes, pricingRes] = await Promise.allSettled([
        // 🔥 CORRIGÉ : listLateMembersOver3Months (/admin/late-members) est
        // l'endpoint dédié à l'admin d'antenne — listLateMembersVisible
        // (/member/late-members) est celui du membre, réutilisé par erreur.
        // Seuil réel désormais 1 mois côté backend (admin.service.ts) —
        // cf. correction du libellé "Alertes & Rappels" plus bas.
        api.listLateMembersOver3Months({ page: 1, pageSize: 50 }),
        api.listProjectsForMembers({ page: 1, pageSize: 6 }),
        api.listContentsForMembers({ page: 1, pageSize: 5 }),
        api.getAssociationPricing(),
      ]);
      if (!isMounted) return;

      if (lateRes.status === 'fulfilled') {
        setLateMembers(((lateRes.value as { items?: LateMemberEntry[] })?.items ?? []) as LateMemberEntry[]);
      }
      if (projectsRes.status === 'fulfilled') {
        const rawItems = projectsRes.value.items as unknown as RawApiProject[];
        setProjectsInProgress(
          rawItems
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
            })) as ExtendedCarouselProject[]
        );
      }
      if (contentsRes.status === 'fulfilled') {
        setLatestContents((contentsRes.value.items as ContentPost[]).slice(0, 5));
      }
      if (pricingRes.status === 'fulfilled') {
        setPricing(pricingRes.value as PricingMap);
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
    // ── AJOUTÉ : carte "Retard" cliquable (voir LateMembersModal) ──
    {
      label: "Retard",
      value: lateMembers.length,
      icon: (
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: lateMembers.length > 0 ? "#DC2626" : "#059669",
      bg: lateMembers.length > 0 ? "#FEF2F2" : "#ECFDF5",
      sub: lateMembers.length > 0 ? "Retardataires · Clic pour détails" : "Aucun retardataire",
      urgent: lateMembers.length > 0,
      clickable: true,
      onClick: () => setShowLateMembersModal(true),
      spanClass: "ad-span-1",
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
        .ad-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.85rem; margin-bottom: 1.75rem; }

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
          .ad-stats-grid { grid-template-columns: repeat(3, 1fr); gap: 0.7rem; }
        }

        /* Responsive Mobile Centré avec 3 colonnes forcées */
        @media(max-width:768px){
          .ad-stats-grid { grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
          .ad-stat-card { padding: 0.85rem 0.3rem !important; border-radius: 12px !important; }
          .ad-stat-value { font-size: 1.15rem !important; margin-bottom: 0.2rem !important; }
          .ad-stat-label { font-size: 0.5rem !important; letter-spacing: 0 !important; line-height: 1.2 !important; }
          .ad-stat-sub   { font-size: 0.55rem !important; gap: 0.15rem !important; }
          .ad-stat-icon  { width: 28px !important; height: 28px !important; border-radius: 7px !important; }
          .ad-stat-icon svg { width: 14px; height: 14px; }
          .ad-stat-top { gap: 0.25rem !important; margin-bottom: 0.4rem !important; }
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

        /* ── AJOUTÉ : carrousel (projets + actualités, avec photos) ── */
        .ad-carousel-wrap { opacity: 0; animation: fadein .5s .32s cubic-bezier(.22,1,.36,1) forwards; margin-bottom: 1.5rem; }

        /* ── AJOUTÉ : panneaux "Projets en cours" / "Informations récentes"
           en défilement horizontal — même comportement que membre/super-admin. ── */
        .ad-cards-viewport { overflow: hidden; width: 100%; padding: 1.1rem 0; position: relative; }
        .ad-cards-track { display: flex; gap: 1rem; width: max-content; padding: 0 1.3rem; animation: adPanCards 18s ease-in-out infinite alternate; }
        .ad-cards-track:hover, .ad-cards-track:active { animation-play-state: paused; }
        @keyframes adPanCards { 0%, 5% { transform: translateX(0); } 95%, 100% { transform: translateX(calc(-100% + 100vw - 3rem)); } }
        @media (min-width: 1024px) { .ad-cards-track { animation: none; flex-wrap: wrap; width: 100%; } }
        .ad-true-card { min-width: 230px; max-width: 260px; flex: 0 0 auto; min-height: 170px; border-radius: 16px; padding: 1rem 1.15rem; display: flex; flex-direction: column; gap: 0.6rem; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 4px 15px rgba(0,0,0,0.05); position: relative; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .ad-true-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
        .ad-tc-proj { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-color: #BFDBFE; }
        .ad-tc-news { background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-color: #A7F3D0; }
        .ad-tc-title { font-size: 0.92rem; font-weight: 800; color: #111827; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .ad-tc-meta { font-size: 0.7rem; color: #4B5563; font-weight: 500; display: flex; align-items: center; gap: 0.4rem; margin-top: auto; }
        .ad-tc-btn { font-size: 0.63rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 0.35rem; }
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

          {/* Toutes les statistiques regroupées dans une grille unique de 3 par ligne */}
          <div className="ad-stats-grid">
            {stats.map((s, i) => {
              const isCurrency = FIXED_CURRENCIES.some((c) => c.label === s.label);
              return (
                <div 
                  key={s.label} 
                  className={`ad-stat-card${s.urgent ? " urgent" : ""}${s.clickable ? " ad-stat-clickable" : ""}${isCurrency ? " ad-stat-currency" : ""}`} 
                  style={{ animationDelay: `${0.08 + i * 0.06}s` }} 
                  onClick={s.onClick}
                  role={s.clickable ? "button" : undefined}
                  tabIndex={s.clickable ? 0 : undefined}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.color},${s.color}55)`, borderRadius: "18px 18px 0 0" }} />
                  <div className="ad-stat-top">
                    <div className="ad-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                    <span className="ad-stat-label">{s.label}</span>
                  </div>
                  <div className="ad-stat-value" style={{ color: s.urgent || isCurrency ? s.color : "#111827" }}>{s.value}</div>
                  <div className={`ad-stat-sub${s.trendUp === true ? " up" : ""}`}>{s.sub}</div>
                </div>
              );
            })}
          </div>

          {/* ── AJOUTÉ : carrousel projets + actualités (photos) ── */}
          <div className="ad-carousel-wrap">
            <DashboardCarousel projects={projectsInProgress} news={latestContents} />
          </div>

          {/* ── AJOUTÉ : "Projets en cours" + "Informations récentes" en
              défilement horizontal, même comportement que membre/super-admin.
              Placé avant le bloc suivant pour que "Alertes & Rappels" reste
              bien en bas de page. ── */}
          <div className="ad-bottom" style={{ marginBottom: '1rem' }}>
            <div className="ad-panel" style={{ animationDelay: "0.36s" }}>
              <div className="ad-panel-header">
                <div className="ad-panel-title">
                  <div className="ad-panel-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  </div>
                  Projets en cours
                </div>
                {projectsInProgress.length > 0 && (
                  <span className="ad-panel-badge" style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>{projectsInProgress.length}</span>
                )}
              </div>
              <div className="ad-cards-viewport">
                {projectsInProgress.length === 0 ? (
                  <div className="ad-empty">
                    <div className="ad-empty-icon">📁</div>
                    <p>Aucun projet actif</p>
                  </div>
                ) : (
                  <div className="ad-cards-track">
                    {projectsInProgress.map(p => (
                      <div key={p.id} className="ad-true-card ad-tc-proj" onClick={() => setSelectedProject(p)}>
                        <StatusBadge status={p.status || 'DRAFT'} />
                        <div className="ad-tc-title">{p.title}</div>
                        <div className="ad-tc-meta">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Mis à jour le {formatDate(p.updatedAt || p.createdAt || null)}
                        </div>
                        <div className="ad-tc-btn" style={{ color: '#2563EB' }}>Voir le projet ➔</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="ad-panel" style={{ animationDelay: "0.4s" }}>
              <div className="ad-panel-header">
                <div className="ad-panel-title">
                  <div className="ad-panel-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
                  </div>
                  Informations récentes
                </div>
              </div>
              <div className="ad-cards-viewport">
                {latestContents.length === 0 ? (
                  <div className="ad-empty">
                    <div className="ad-empty-icon">📄</div>
                    <p>Aucune actualité publiée</p>
                  </div>
                ) : (
                  <div className="ad-cards-track">
                    {latestContents.map(c => (
                      <div key={c.id} className="ad-true-card ad-tc-news" onClick={() => setSelectedContent(c)}>
                        <StatusBadge status={c.status} />
                        <div className="ad-tc-title">{c.title}</div>
                        <div className="ad-tc-meta">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Publié le {formatDate(c.createdAt)}
                        </div>
                        <div className="ad-tc-btn" style={{ color: '#059669' }}>Lire l&apos;article ➔</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── "Demandes d'adhésion" + "Alertes & Rappels" — reste en bas de page ── */}
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
                    <div className="ad-alert-desc">Certains membres accusent un retard de cotisation — à relancer dès maintenant.</div>
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

      {showLateMembersModal && (
        <LateMembersModal
          members={lateMembers}
          pricing={pricing}
          onClose={() => setShowLateMembersModal(false)}
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
    </AppShell>
  );
}