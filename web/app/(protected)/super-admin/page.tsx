/////// web/app/(protected)/super-admin/page.tsx
// v2.1 — CHANGELOG :
// ── CORRIGÉ (08/08) : panneau "Projets récents" converti d'une grille
//    statique (sa-project-grid/sa-project-card) à un défilement horizontal
//    (sa-cards-viewport/sa-cards-track), même comportement que "Informations
//    récentes" (qui défilait déjà) et que le compte membre/admin. Nouvelle
//    variante de couleur .sa-tc-proj (bleu) pour distinguer visuellement des
//    cartes actualités (.sa-tc-news, vert, inchangée). "Cotisations
//    récentes" non modifié.
'use client';

import { useEffect, useState, useMemo } from 'react';
import { AppShell } from '../../../components/layout/AppShell';
import { DashboardCarousel, CarouselProject } from '../../../components/member/DashboardCarousel';
import { api } from '../../../lib/api-client';
import { formatCurrency, formatDate, fullName } from '../../../lib/format';
import type { UserSummary } from '../../../types/user';
import type { Contribution } from '../../../types/contribution';
import type { Project } from '../../../types/project';
import type { ContentPost } from '../../../types/content';

type BackendProject = {
  id: string;
  title: string;
  status: string;
  budgetAmount?: number | null; 
  amountSpent?: number | null;  
  budgetPlanned?: number | null; 
  budgetSpent?: number | null;  
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

interface ApiFileAttachment {
  file?: { url?: string | null } | null;
}

type LateMemberEntry = {
  id: string;
  firstName: string;
  lastName: string;
  lateMonths?: number;
  antennaId?: string;
  antennaName?: string;
  currency?: string;
};

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

function getProjectBudget(p: BackendProject) {
  const planned = p.budgetPlanned ?? p.budgetAmount ?? 0;
  const spent   = p.budgetSpent   ?? p.amountSpent  ?? 0;
  return { planned, spent };
}

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    VALIDATED:          { label: 'Validée',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    PENDING:            { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING_APPROVAL:   { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    PENDING_VALIDATION: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' }, 
    REJECTED:           { label: 'Rejetée',    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    ACTIVE:             { label: 'Actif',      color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    IN_PROGRESS:        { label: 'En cours',   color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    PUBLISHED:          { label: 'Publié',     color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DRAFT:              { label: 'Brouillon',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    COMPLETED:          { label: 'Terminé',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    APPROVED:           { label: 'Approuvé',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    CANCELLED:          { label: 'Annulé',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
    PROPOSED:           { label: 'Proposé',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    ARCHIVED:            { label: 'Archivé',    color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  };
  const s = map[status] ?? { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      fontSize: '0.65rem', fontWeight: 700,
      color: s.color, background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 99, padding: '0.15rem 0.4rem', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

function BalancesModal({ currency, balances, onClose }: { currency: string; balances?: AntennaBalance[]; onClose: () => void; }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', animation: 'sain 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 480, background: 'rgba(253,253,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: '1.5rem', border: '1px solid rgba(37,99,235,.15)', boxShadow: '0 24px 60px rgba(37,99,235,.12)', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            {`Soldes — ${currency}`}
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', animation: 'sain 0.2s ease' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: 520, background: 'rgba(253,253,255,.98)', backdropFilter: 'blur(18px)', borderRadius: 22, padding: '1.5rem', border: '1px solid rgba(220,38,38,.15)', boxShadow: '0 24px 60px rgba(220,38,38,.12)', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0 }}>Retardataires</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600 }}>Toutes antennes confondues</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
              Aucun retardataire pour le moment.
            </div>
          ) : (
            members.map(m => {
              const currency = m.currency || 'GNF';
              const monthly = pricing?.[currency]?.monthlyQuota ?? 0;
              const months = m.lateMonths ?? 0;
              const montant = months * monthly;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: '#FEF2F2', borderRadius: 14, border: '1px solid #FECACA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#DC2626,#F87171)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {getInitials(`${m.firstName} ${m.lastName}`)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.firstName} {m.lastName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.antennaName || '—'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#DC2626' }}>{months > 0 ? `${months} mois` : '—'}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', fontWeight: 700, color: '#991B1B' }}>
                      {monthly > 0 ? formatCurrency(montant, currency) : '—'}
                    </div>
                  </div>
                </div>
              );
            })
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
  const [animOpen, setAnimOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => setAnimOpen(true), 10);
    return () => {
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, []);

  const handleClose = () => {
    setAnimOpen(false);
    setTimeout(onClose, 300);
  };

  const memberName = item.member ? `${item.member.firstName} ${item.member.lastName}` : item.memberUserId;

  return (
    <div className={`modal-overlay ${animOpen ? 'open' : ''}`} onClick={handleClose}>
      <style>{`
        .modal-overlay { 
          position: fixed; inset: 0; z-index: 9999; 
          background: rgba(15,23,42,0); backdrop-filter: blur(0px); 
          display: flex; align-items: center; justify-content: center; 
          padding: 1rem; opacity: 0; pointer-events: none;
          transition: background 0.3s ease, opacity 0.3s ease;
        }
        .modal-overlay.open { 
          background: rgba(15,23,42,0.6); opacity: 1; pointer-events: auto; backdrop-filter: blur(4px); 
        }
        .modal-content { 
          background: white; 
          width: 100%; max-width: 500px; 
          border-radius: 24px; 
          max-height: 90vh; overflow-y: auto; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          transform: translateY(20px) scale(0.98);
          transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .modal-overlay.open .modal-content { transform: translateY(0) scale(1); }
        .modal-header { padding: 1.25rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 10; }
        .modal-title { font-family: 'Cormorant Garamond',serif; font-size: 1.4rem; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 0.5rem; margin: 0; }
        .modal-close { width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #e2e8f0; display: flex; align-items: center; justify-content: center; cursor: pointer; background: white; color: #64748b; transition: background 0.2s; }
        .modal-body { padding: 1.25rem; }
        .sc-modal-hero { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem 1.5rem; background: linear-gradient(to bottom, #ECFDF5, #F0FDF4); border-radius: 16px; border: 1px dashed #A7F3D0; margin-bottom: 1.5rem; }
        .sc-modal-hero-label { font-size: 0.65rem; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 0.2rem; }
        .sc-modal-hero-amount { font-family: 'DM Mono', monospace; font-size: clamp(1.8rem, 6vw, 2.4rem); font-weight: 800; color: #047857; line-height: 1; text-align: center; word-break: break-word; }
        .sm-section-divider { font-size: 0.7rem; font-weight: 800; color: #DC2626; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #FECACA; padding-bottom: 0.4rem; margin: 0 0 0.75rem 0; }
        .sm-dp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
        .sm-dp-field { display: flex; flex-direction: column; gap: 4px; }
        .sm-dp-field.full { grid-column: span 2; }
        .sm-dp-field label { font-size: .65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .sm-dp-value { font-size: .9rem; font-weight: 600; color: #1e293b; padding: 4px 0; word-break: break-word; }
        .sc-modal-user { display: flex; align-items: center; gap: 0.6rem; }
        .sc-modal-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg,#DC2626,#991B1B); display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 900; color: white; flex-shrink: 0; }
      `}</style>

      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Détails de la cotisation</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="sc-modal-hero">
            <span className="sc-modal-hero-label">Montant de la cotisation</span>
            <span className="sc-modal-hero-amount">{formatCurrency(item.amount, item.currency || 'EUR')}</span>
          </div>
          <div className="sm-section-divider">Informations Membre</div>
          <div className="sm-dp-grid" style={{ marginBottom: '1rem', gridTemplateColumns: '1fr' }}>
            <div className="sm-dp-field full">
              <div className="sc-modal-user">
                <div className="sc-modal-avatar">{item.member ? getInitials(memberName) : 'ID'}</div>
                <div>
                  <div className="sm-dp-value" style={{ padding: 0 }}>{memberName}</div>
                  {item.member && <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>{item.member.email}</div>}
                </div>
              </div>
            </div>
          </div>
          <div className="sm-section-divider">Détails de la transaction</div>
          <div className="sm-dp-grid">
            <div className="sm-dp-field">
              <label>Statut</label><div className="sm-dp-value"><StatusBadge status={item.status} /></div>
            </div>
            <div className="sm-dp-field">
              <label>Date de dépôt</label><div className="sm-dp-value">{formatDate(item.createdAt)}</div>
            </div>
            <div className="sm-dp-field full">
              <label>Référence</label><div className="sm-dp-value" style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.8rem', color: '#6B7280' }}>{item.id}</div>
            </div>
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
        {project.description && <p style={{ fontSize: '0.85rem', color: '#4B5563', lineHeight: 1.6, marginBottom: '1.5rem', padding: '1rem', background: '#F9FAFB', borderRadius: 12 }}>{project.description}</p>}
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

function ContentDetailModal({ content, onClose }: { content: ContentPost; onClose: () => void }) {
  const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    PUBLISHED: { label: 'Publié',    color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DRAFT:     { label: 'Brouillon', color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
    ARCHIVED:  { label: 'Archivé',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  };
  const cfg = STATUS_CFG[content.status] ?? STATUS_CFG['PUBLISHED'];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }} onClick={onClose}>
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

const FIXED_CURRENCIES = [
  { cur: 'GNF', label: 'Solde antennes (GNF)',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { cur: 'EUR', label: 'Solde antennes (Euro)',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { cur: 'USD', label: 'Solde antennes (Dollar)',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { cur: 'XOF', label: 'Solde antennes (XOF)',      color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
];

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<UserSummary | null>(null);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [selectedProject, setSelectedProject] = useState<BackendProject | null>(null);

  const [lateMembers, setLateMembers] = useState<LateMemberEntry[]>([]);
  const [showLateMembersModal, setShowLateMembersModal] = useState(false);
  const [projectsInProgress, setProjectsInProgress] = useState<ExtendedCarouselProject[]>([]);
  const [latestContents, setLatestContents] = useState<ContentPost[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentPost | null>(null);
  const [pricing, setPricing] = useState<PricingMap | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      try {
        const [dashRes, lateRes, projectsRes, contentsRes, pricingRes] = await Promise.allSettled([
          api.dashboardSuperAdmin(),
          api.listLateMembersOver3Months({ page: 1, pageSize: 100 }),
          api.listProjectsForMembers({ page: 1, pageSize: 6 }),
          api.listContentsForMembers({ page: 1, pageSize: 5 }),
          api.getAssociationPricing(),
        ]);
        if (!isMounted) return;

        if (dashRes.status === 'fulfilled') {
          setData(dashRes.value as unknown as DashboardData);
        } else {
          setError(dashRes.reason instanceof Error ? dashRes.reason.message : 'Erreur chargement dashboard');
        }

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
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Erreur inattendue');
      }
    })();
    return () => { isMounted = false; };
  }, []);

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

  const baseStats: StatCard[] = data ? [
    {
      label: 'Antennes',
      value: data.stats.antennas,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
      color: '#7C3AED', bg: '#F5F3FF', sub: 'Sections locales',
    },
    {
      label: 'Membres',
      value: data.stats.members,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: '#059669', bg: '#ECFDF5', sub: 'Membres validés',
    },
    {
      label: 'Comptes en attente',
      value: data.stats.pendingAccounts,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: '#D97706', bg: '#FFFBEB', sub: 'À valider',
      urgent: data.stats.pendingAccounts > 0,
    },
    {
      label: 'Cotisations en attente',
      value: data.stats.pendingContributions,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
      color: '#0891B2', bg: '#ECFEFF', sub: 'En attente de validation',
      urgent: data.stats.pendingContributions > 0,
    },
    {
      label: 'Projets actifs',
      value: data.stats.activeProjects,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      color: '#7C3AED', bg: '#F5F3FF', sub: 'En cours',
    },
    {
      label: 'Taux de cotisation',
      value: data.stats.members > 0
        ? `${Math.round(((data.stats.members - (data.stats.pendingAccounts ?? 0)) / data.stats.members) * 100)}%`
        : '—',
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      color: '#BE185D', bg: '#FDF2F8', sub: 'Membres à jour',
    },
    {
      label: 'Retard',
      value: lateMembers.length,
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: lateMembers.length > 0 ? '#DC2626' : '#059669',
      bg: lateMembers.length > 0 ? '#FEF2F2' : '#ECFDF5',
      sub: lateMembers.length > 0 ? 'Retardataires · Clic pour détails' : 'Aucun retardataire',
      urgent: lateMembers.length > 0,
      clickable: true,
      onClick: () => setShowLateMembersModal(true),
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
      sub: antennaCount > 0 ? `${antennaCount} antenne${antennaCount > 1 ? 's' : ''} · Clic pour détails` : 'Aucune antenne · Clic pour détails',
      clickable: true,
      onClick: () => setSelectedCurrency(cur),
    };
  });

  return (
    <AppShell title="Super Admin · Vue globale">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        .sa-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1340px; margin: 0 auto; box-sizing: border-box; width: 100%; overflow-x: hidden; }
        .sa-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.75rem; padding-bottom: 1.5rem; border-bottom: 1px solid rgba(220,38,38,0.10); opacity: 0; transform: translateY(10px); animation: sain 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .sa-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase; color: #DC2626; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .sa-eyebrow-dot { width: 6px; height: 6px; background: #EF4444; border-radius: 50%; animation: sapulse 2s ease-in-out infinite; }
        @keyframes sapulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.8)} }
        .sa-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 1.95rem); font-weight: 700; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .sa-title span { background: linear-gradient(135deg, #B91C1C, #EF4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .sa-chip { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #6B7280; font-weight: 600; background: rgba(220,38,38,0.05); border: 1px solid rgba(220,38,38,0.12); border-radius: 8px; padding: 0.45rem 0.9rem; white-space: nowrap; }
        .sa-chip-dot { width: 6px; height: 6px; background: #DC2626; border-radius: 50%; flex-shrink: 0; }
        .sa-section-label { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9CA3AF; margin: 0 0 0.65rem; display: flex; align-items: center; gap: 0.5rem; }
        .sa-section-label::after { content: ''; flex: 1; height: 1px; background: rgba(0,0,0,0.06); }
        .sa-stats-base { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.5rem; }
        @media (max-width: 520px)  { .sa-stats-base { grid-template-columns: repeat(3, 1fr); gap: 0.4rem; } }
        .sa-stats-currency { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
        @media (max-width: 520px) { .sa-stats-currency { grid-template-columns: repeat(2, 1fr); gap: 0.4rem; } }
        .sa-stat { display: flex; flex-direction: column; align-items: center; text-align: center; background: rgba(253,253,255,0.9); backdrop-filter: blur(12px); border-radius: 18px; padding: 1.1rem 1.15rem; border: 1px solid rgba(37,99,235,0.08); box-shadow: 0 2px 10px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset; position: relative; overflow: hidden; opacity: 0; transform: translateY(14px); animation: sain 0.5s cubic-bezier(.22,1,.36,1) forwards; transition: transform 0.2s, box-shadow 0.2s; }
        .sa-stat-clickable { cursor: pointer; }
        .sa-stat-clickable:hover { transform: translateY(-3px) scale(1.01); box-shadow: 0 12px 24px rgba(5,150,105,0.14), 0 0 0 1px rgba(255,255,255,0.9) inset; }
        .sa-stat-currency { border-color: rgba(5,150,105,0.15); background: linear-gradient(135deg, rgba(240,253,244,0.9), rgba(253,253,255,0.9)); }
        .sa-stat-urgent::after { content: ''; position: absolute; inset: 0; border-radius: 18px; border: 1.5px solid currentColor; pointer-events: none; animation: saurgentborder 2s ease-in-out infinite; color: inherit; }
        @keyframes saurgentborder { 0%,100%{opacity:.35} 50%{opacity:.9} }
        @media (max-width: 520px) { .sa-stat { padding: 0.6rem 0.5rem; border-radius: 12px; } .sa-stat-value { font-size: 1.05rem !important; word-break: break-word; } .sa-stat-label { font-size: 0.5rem !important; } .sa-stat-icon { width: 24px !important; height: 24px !important; border-radius: 6px !important; } .sa-stat-icon svg { width: 12px; height: 12px; } .sa-stat-top { flex-direction: column-reverse; gap: 0.2rem; margin-bottom: 0.4rem; } }
        .sa-stat-top { display: flex; flex-direction: column-reverse; align-items: center; justify-content: center; gap: 0.4rem; margin-bottom: 0.65rem; width: 100%; }
        .sa-stat-label { font-size: 0.61rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #6B7280; text-align: center; line-height: 1.4; }
        .sa-stat-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sa-stat-value { font-family: 'Cormorant Garamond', serif; font-size: 1.75rem; font-weight: 700; color: #111827; letter-spacing: -0.03em; line-height: 1; margin-bottom: 0.28rem; word-break: break-word; }
        .sa-stat-sub { font-size: 0.62rem; color: #9CA3AF; font-weight: 600; text-align: center; }
        .sa-stat-accent { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 18px 18px 0 0; }
        .sa-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
        @media (max-width: 780px) { .sa-grid2 { grid-template-columns: 1fr; } }
        .sa-panel { background: rgba(253,253,255,0.9); backdrop-filter: blur(12px); border-radius: 18px; border: 1px solid rgba(37,99,235,0.08); box-shadow: 0 2px 10px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.8) inset; overflow: hidden; opacity: 0; animation: sain 0.5s cubic-bezier(.22,1,.36,1) forwards; }
        .sa-panel-full { grid-column: span 2; }
        @media (max-width: 780px) { .sa-panel-full { grid-column: span 1; } }
        .sa-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,0.07); }
        .sa-panel-title { font-size: 0.73rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #374151; display: flex; align-items: center; gap: 0.45rem; }
        .sa-panel-ico { width: 26px; height: 26px; background: #EFF6FF; border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #2563EB; }
        .sa-count-chip { font-size: 0.66rem; font-weight: 800; padding: 0.18rem 0.55rem; border-radius: 99px; background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
        
        /* Liste des cartes d'items */
        .sa-list-items { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; }
        .sa-item-card { 
          display: flex; align-items: center; justify-content: space-between; 
          background: white; border: 1px solid #F1F5F9; border-radius: 14px; 
          padding: 0.75rem 1rem; transition: transform 0.2s, box-shadow 0.2s; 
          cursor: pointer;
        }
        .sa-item-card:hover { transform: translateX(3px); box-shadow: 0 4px 12px rgba(0,0,0,0.04); border-color: #E2E8F0; }
        
        .sa-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #2563EB, #60A5FA); display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 800; color: white; flex-shrink: 0; }
        .sa-role { font-size: 0.64rem; font-weight: 800; padding: 0.14rem 0.5rem; border-radius: 6px; background: #F0F9FF; color: #0369A1; border: 1px solid #BAE6FD; }
        .sa-user-cell { display: flex; align-items: center; }

        /* ── AJOUTÉ : carrousel (projets + actualités) + section Informations récentes ── */
        .sa-carousel-wrap { margin-bottom: 1.5rem; opacity: 0; animation: sain 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards; }
        .sa-cards-viewport { overflow: hidden; width: 100%; padding: 1.1rem 0; position: relative; }
        .sa-cards-track { display: flex; gap: 1rem; width: max-content; padding: 0 1.3rem; animation: saPanCards 18s ease-in-out infinite alternate; }
        .sa-cards-track:hover, .sa-cards-track:active { animation-play-state: paused; }
        @keyframes saPanCards { 0%, 5% { transform: translateX(0); } 95%, 100% { transform: translateX(calc(-100% + 100vw - 3rem)); } }
        @media (min-width: 1024px) { .sa-cards-track { animation: none; flex-wrap: wrap; width: 100%; } }
        /* 🔥 CORRIGÉ (08/08) : .sa-true-card redevient une base structurelle
           neutre — la couleur (vert "actualités" / bleu "projets") vient
           désormais des modificateurs .sa-tc-news / .sa-tc-proj, même
           pattern que member/admin (mb-tc-*/ad-tc-*). */
        .sa-true-card { min-width: 230px; max-width: 260px; flex: 0 0 auto; min-height: 170px; border-radius: 16px; padding: 1rem 1.15rem; display: flex; flex-direction: column; gap: 0.6rem; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 4px 15px rgba(0,0,0,0.05); position: relative; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .sa-true-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
        .sa-tc-news { background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border-color: #A7F3D0; }
        .sa-tc-proj { background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border-color: #BFDBFE; }
        .sa-tc-title { font-size: 0.92rem; font-weight: 800; color: #111827; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .sa-tc-meta { font-size: 0.7rem; color: #4B5563; font-weight: 500; display: flex; align-items: center; gap: 0.4rem; margin-top: auto; }
        .sa-tc-btn { font-size: 0.63rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 0.35rem; }

        @media (max-width: 768px) { 
          .hide-mobile { display: none !important; } 
        }
        .sa-error { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.25rem; background: rgba(185,28,28,0.06); border: 1px solid rgba(185,28,28,0.18); border-radius: 14px; color: #B91C1C; font-size: 0.82rem; font-weight: 700; margin: clamp(1rem, 3vw, 2rem) auto; max-width: 1340px; }
        .sa-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 55vh; gap: 1rem; color: #6B7280; }
        .sa-ring { width: 40px; height: 40px; border: 3px solid rgba(220,38,38,0.1); border-top-color: #DC2626; border-radius: 50%; animation: saspin 0.8s linear infinite; }
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

          <p className="sa-section-label">Indicateurs généraux</p>
          <div className="sa-stats-base" style={{ marginBottom: '1.5rem' }}>
            {baseStats.map((s, i) => (
              <div
                key={s.label}
                className={`sa-stat${s.clickable ? ' sa-stat-clickable' : ''}${s.urgent ? ' sa-stat-urgent' : ''}`}
                style={{ animationDelay: `${0.08 + i * 0.06}s` }}
                onClick={s.onClick}
                role={s.clickable ? 'button' : undefined}
                tabIndex={s.clickable ? 0 : undefined}
              >
                <div className="sa-stat-accent" style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}55)` }} />
                <div className="sa-stat-top">
                  <span className="sa-stat-label">{s.label}</span>
                  <div className="sa-stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                </div>
                <div className="sa-stat-value" style={{ color: s.urgent ? s.color : '#111827' }}>{String(s.value)}</div>
                <div className="sa-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>

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

          <div className="sa-grid2">
            <div className="sa-panel" style={{ animationDelay: '0.52s' }}>
              <div className="sa-panel-head">
                <div className="sa-panel-title">
                  <div className="sa-panel-ico"><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg></div>
                  Comptes en attente
                </div>
                {data.recentPendingAccounts.length > 0 && <span className="sa-count-chip">{data.recentPendingAccounts.length}</span>}
              </div>
              <div className="sa-list-items">
                {data.recentPendingAccounts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.78rem' }}>Aucun compte en attente</div>
                ) : (
                  data.recentPendingAccounts.map(u => (
                    <div key={u.id} className="sa-item-card" onClick={() => setSelectedAccount(u)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="sa-avatar">{getInitials(fullName(u))}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 800, color: '#111827', fontSize: '0.82rem' }}>{fullName(u)}</span>
                          <span className="sa-role" style={{ width: 'fit-content', marginTop: '2px' }}>{u.role}</span>
                        </div>
                      </div>
                      <StatusBadge status={u.status} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="sa-panel" style={{ animationDelay: '0.57s' }}>
              <div className="sa-panel-head">
                <div className="sa-panel-title">
                  <div className="sa-panel-ico" style={{ background: '#ECFDF5', color: '#059669' }}><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                  Cotisations récentes
                </div>
                {data.recentContributions.length > 0 && <span className="sa-count-chip" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>{data.recentContributions.length}</span>}
              </div>
              <div className="sa-list-items">
                {data.recentContributions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.78rem' }}>Aucune cotisation récente</div>
                ) : (
                  data.recentContributions.map(c => (
                    <div key={c.id} className="sa-item-card" onClick={() => setSelectedContribution(c)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="sa-avatar" style={{ background: 'linear-gradient(135deg, #059669, #34D399)' }}>{c.member ? getInitials(`${c.member.firstName} ${c.member.lastName}`) : '??'}</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 800, color: '#111827', fontSize: '0.82rem' }}>{c.member ? `${c.member.firstName} ${c.member.lastName}` : c.memberUserId}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>{formatCurrency(c.amount, c.currency)}</span>
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── AJOUTÉ : carrousel projets + actualités (photos) ── */}
          <div className="sa-carousel-wrap">
            <DashboardCarousel projects={projectsInProgress} news={latestContents} />
          </div>

          {/* 🔥 CORRIGÉ (08/08) : "Projets récents" en défilement horizontal
              (sa-cards-viewport/sa-cards-track), même comportement que
              "Informations récentes" ci-dessous et que membre/admin —
              remplace l'ancienne grille statique sa-project-grid. */}
          <div className="sa-grid2">
            <div className="sa-panel sa-panel-full" style={{ animationDelay: '0.62s' }}>
              <div className="sa-panel-head">
                <div className="sa-panel-title"><div className="sa-panel-ico" style={{ background: '#F5F3FF', color: '#7C3AED' }}><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg></div>Projets récents</div>
                {data.recentProjects.length > 0 && <span className="sa-count-chip" style={{ background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>{data.recentProjects.length}</span>}
              </div>
              <div className="sa-cards-viewport">
                {data.recentProjects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.78rem' }}>Aucun projet récent</div>
                ) : (
                  <div className="sa-cards-track">
                    {data.recentProjects.map(p => (
                      <div key={p.id} className="sa-true-card sa-tc-proj" onClick={() => setSelectedProject(p)}>
                        <StatusBadge status={p.status} />
                        <div className="sa-tc-title">{p.title}</div>
                        <div className="sa-tc-meta">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Mis à jour le {formatDate(p.updatedAt || p.createdAt)}
                        </div>
                        <div className="sa-tc-btn" style={{ color: '#7C3AED' }}>Voir le projet ➔</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Section animée "Informations récentes" (comme côté membre) — inchangée ── */}
          <div className="sa-grid2">
            <div className="sa-panel sa-panel-full" style={{ animationDelay: '0.67s' }}>
              <div className="sa-panel-head">
                <div className="sa-panel-title">
                  <div className="sa-panel-ico" style={{ background: '#ECFDF5', color: '#059669' }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
                  </div>
                  Informations récentes
                </div>
              </div>
              <div className="sa-cards-viewport">
                {latestContents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontSize: '0.78rem' }}>Aucune actualité publiée</div>
                ) : (
                  <div className="sa-cards-track">
                    {latestContents.map(c => (
                      <div key={c.id} className="sa-true-card sa-tc-news" onClick={() => setSelectedContent(c)}>
                        <StatusBadge status={c.status} />
                        <div className="sa-tc-title">{c.title}</div>
                        <div className="sa-tc-meta">
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Publié le {formatDate(c.createdAt)}
                        </div>
                        <div className="sa-tc-btn" style={{ color: '#059669' }}>Lire l&apos;article ➔</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCurrency && <BalancesModal currency={selectedCurrency} balances={currencyGroups[selectedCurrency]?.antennas} onClose={() => setSelectedCurrency(null)} />}
      {selectedAccount && <AccountDetailModal user={selectedAccount} onClose={() => setSelectedAccount(null)} />}
      {selectedContribution && <AdminContributionDetailModal item={selectedContribution} onClose={() => setSelectedContribution(null)} />}
      {selectedProject && <AdminProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
      {showLateMembersModal && <LateMembersModal members={lateMembers} pricing={pricing} onClose={() => setShowLateMembersModal(false)} />}
      {selectedContent && <ContentDetailModal content={selectedContent} onClose={() => setSelectedContent(null)} />}
    </AppShell>
  );
}