// web/app/(protected)/admin/members/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { MemberActionsTable } from '../../../../components/admin/MemberActionsTable';
import { api } from '../../../../lib/api-client';
import { formatCurrency, formatDate, fullName } from '../../../../lib/format';
import type { UserSummary, UserStatus } from '../../../../types/user';
import type { Contribution } from '../../../../types/contribution';
import type { Project, ProjectStatus } from '../../../../types/project';
import type { AntennaDashboardStats } from '../../../../types/stats';

/* ══════════════════════════════════════════════════════ TYPES */
type DashboardAntennaData = {
  stats: AntennaDashboardStats;
  recentPendingAccounts?: UserSummary[];
  recentPendingContributions?: Contribution[];
  recentProjects?: Project[];
  lateMembers?: Array<UserSummary & { lastValidatedContributionAt?: string | null; lateMonths?: number }>;
};

/* ══════════════════════════════════════════════════════ INITIALS */
function Initials({ name, color = '#2563EB' }: { name: string; color?: string }) {
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,${color},${color}cc)`, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontFamily:"'Cormorant Garamond',serif", fontSize:'.82rem', fontWeight:600 }}>
      {txt}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ USER STATUS BADGE */
const USER_STATUS_MAP: Record<UserStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:                     { label: 'Actif',              color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
  PENDING_APPROVAL:           { label: 'En attente',         color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  PENDING_EMAIL_VERIFICATION: { label: 'Email non vérifié',  color:'#6B7280', bg:'#F3F4F6', border:'#E5E7EB' },
  SUSPENDED:                  { label: 'Suspendu',           color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  REJECTED:                   { label: 'Rejeté',             color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
};
function UserStatusBadge({ status }: { status: UserStatus }) {
  const s = USER_STATUS_MAP[status] ?? USER_STATUS_MAP['PENDING_APPROVAL'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'.25rem', fontSize:'.68rem', fontWeight:800, color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:99, padding:'.2rem .55rem', whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color }} />{s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ PROJECT STATUS BADGE */
const PROJ_STATUS_MAP: Record<ProjectStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:            { label: 'Brouillon',   color:'#6B7280', bg:'#F3F4F6', border:'#E5E7EB' },
  PENDING_APPROVAL: { label: 'En attente',  color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  APPROVED:         { label: 'Approuvé',    color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
  IN_PROGRESS:      { label: 'En cours',    color:'#059669', bg:'#ECFDF5', border:'#A7F3D0' },
  COMPLETED:        { label: 'Terminé',     color:'#7C3AED', bg:'#F5F3FF', border:'#DDD6FE' },
  SUSPENDED:        { label: 'Suspendu',    color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' },
  CANCELLED:        { label: 'Annulé',      color:'#9CA3AF', bg:'#F9FAFB', border:'#E5E7EB' },
};
function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = PROJ_STATUS_MAP[status] ?? PROJ_STATUS_MAP['DRAFT'];
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'.25rem', fontSize:'.68rem', fontWeight:800, color:s.color, background:s.bg, border:`1px solid ${s.border}`, borderRadius:99, padding:'.2rem .55rem', whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color }} />{s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ AMOUNT PILL */
function AmountPill({ amount, currency }: { amount: number; currency?: string }) {
  return (
    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:'.8rem', fontWeight:700, color:'#0F172A', background:'#F0F9FF', border:'1px solid #BAE6FD', borderRadius:7, padding:'.15rem .5rem', whiteSpace:'nowrap' }}>
      {formatCurrency(amount, currency)}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ LATE BADGE */
function LateBadge({ months }: { months?: number }) {
  if (!months) return <span style={{ color:'#D1D5DB', fontSize:'.75rem' }}>—</span>;
  const color  = months >= 12 ? '#DC2626' : '#D97706';
  const bg     = months >= 12 ? '#FEF2F2' : '#FFFBEB';
  const border = months >= 12 ? '#FECACA' : '#FDE68A';
  return (
    <span style={{ fontSize:'.7rem', fontWeight:800, color, background:bg, border:`1px solid ${border}`, borderRadius:99, padding:'.2rem .55rem' }}>
      {months} mois
    </span>
  );
}

/* ══════════════════════════════════════════════════════ STAT CARD */
function StatCard({ label, value, icon, color = '#2563EB', accent }: { label: string; value: string | number; icon: React.ReactNode; color?: string; accent?: string }) {
  return (
    <div style={{ background:'rgba(253,253,255,.92)', backdropFilter:'blur(10px)', borderRadius:14, border:'1px solid rgba(37,99,235,.09)', borderTop:`3px solid ${accent ?? color}`, boxShadow:'0 2px 10px rgba(37,99,235,.05)', padding:'.9rem 1rem' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'.5rem' }}>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', fontWeight:600, color: accent ?? color, lineHeight:1, marginBottom:'.25rem' }}>{value}</div>
          <div style={{ fontSize:'.67rem', fontWeight:700, color:'#6B7280', textTransform:'uppercase', letterSpacing:'.06em' }}>{label}</div>
        </div>
        <div style={{ width:36, height:36, borderRadius:10, background:`${accent ?? color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: accent ?? color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ MINI TABLE PANEL */
function MiniPanel({ title, icon, iconBg, iconColor, count, children, emptyMsg }: {
  title: string; icon: React.ReactNode; iconBg?: string; iconColor?: string;
  count: number; children: React.ReactNode; emptyMsg?: string;
}) {
  return (
    <div style={{ background:'rgba(253,253,255,.93)', backdropFilter:'blur(12px)', borderRadius:18, border:'1px solid rgba(37,99,235,.09)', boxShadow:'0 2px 14px rgba(37,99,235,.05),0 0 0 1px rgba(255,255,255,.85) inset', overflow:'hidden' }}>
      <div style={{ padding:'.9rem 1.2rem', borderBottom:'1px solid rgba(37,99,235,.07)', display:'flex', alignItems:'center', justifyItems:'space-between', gap:'.75rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.5rem', fontSize:'.72rem', fontWeight:800, letterSpacing:'.08em', textTransform:'uppercase', color:'#1F2937', flex:1 }}>
          <div style={{ width:24, height:24, borderRadius:6, background: iconBg ?? '#EFF6FF', color: iconColor ?? '#2563EB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
          {title}
        </div>
        <span style={{ fontSize:'.67rem', fontWeight:800, padding:'.17rem .5rem', borderRadius:99, background:'#EFF6FF', color:'#1D4ED8', border:'1px solid #BFDBFE' }}>{count}</span>
      </div>
      {count === 0
        ? <div style={{ padding:'1.5rem 1.2rem', textAlign:'center', color:'#9CA3AF', fontSize:'.78rem', fontWeight:600 }}>{emptyMsg ?? 'Aucun élément'}</div>
        : <div style={{ overflowX:'auto' }}>{children}</div>
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════ DELETE CONFIRM MODAL */
function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.45)', backdropFilter:'blur(4px)', zIndex:100 }} onClick={onCancel} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:101, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(18px)', borderRadius:20, padding:'clamp(1.5rem,4vw,2rem)', width:'min(420px,calc(100vw - 2rem))', border:'1px solid rgba(37,99,235,0.1)', boxShadow:'0 24px 60px rgba(37,99,235,0.14)' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'#FEF2F2', border:'1px solid #FECACA', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem' }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2"><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:600, color:'#111827', textAlign:'center', marginBottom:'.4rem' }}>Supprimer ce membre&nbsp;?</h2>
        <p style={{ fontSize:'.82rem', color:'#6B7280', textAlign:'center', marginBottom:'1.5rem', fontWeight:500 }}>
          <strong style={{ color:'#111827' }}>{name}</strong> sera supprim&eacute; d&eacute;finitivement.
        </p>
        <div style={{ display:'flex', gap:'.6rem', justifyContent:'center' }}>
          <button onClick={onCancel} style={{ height:40, padding:'0 1.2rem', borderRadius:10, border:'1px solid rgba(37,99,235,0.15)', background:'rgba(249,250,251,0.9)', fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', fontWeight:600, color:'#374151', cursor:'pointer' }}>Annuler</button>
          <button onClick={onConfirm} style={{ height:40, padding:'0 1.2rem', borderRadius:10, border:'none', background:'linear-gradient(135deg,#B91C1C,#DC2626)', fontFamily:"'DM Sans',sans-serif", fontSize:'.8rem', fontWeight:700, color:'white', cursor:'pointer', boxShadow:'0 4px 12px rgba(220,38,38,0.3)' }}>Supprimer</button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminAntennaHomePage() {
  const [activeTab,      setActiveTab]      = useState<'dashboard' | 'members'>('dashboard');
  const [dashboardData,  setDashboardData]  = useState<DashboardAntennaData | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashLoading,    setDashLoading]    = useState(false);
  const [members,        setMembers]        = useState<UserSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [q,              setQ]              = useState('');
  const [status,         setStatus]         = useState('');
  const [busyId,         setBusyId]         = useState<string | null>(null);
  const [membersError,   setMembersError]   = useState<string | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<UserSummary | null>(null);

  /* ── Dashboard ── */
  useEffect(() => {
    if (activeTab === 'dashboard' && !dashboardData) {
      setDashLoading(true);
      void (async () => {
        try {
          const res = await api.dashboardAntennaAdmin();
          setDashboardData(res);
        } catch (err) {
          setDashboardError(err instanceof Error ? err.message : 'Erreur dashboard');
        } finally { setDashLoading(false); }
      })();
    }
  }, [activeTab, dashboardData]);

  /* ── Members ── */
  const loadMembers = useCallback(async (qVal?: string, sVal?: string) => {
    setMembersError(null); setMembersLoading(true);
    try {
      const res = await api.listAntennaMembers({
        page:1, pageSize:100,
        q:      (qVal  ?? q)      || undefined,
        status: (sVal  ?? status) || undefined,
      });
      setMembers(res.items);
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : 'Erreur chargement membres');
    } finally { setMembersLoading(false); }
  }, [q, status]);

  useEffect(() => {
    if (activeTab === 'members' && members.length === 0) void loadMembers();
  }, [activeTab, members.length, loadMembers]);

  async function withReload(fn: () => Promise<void>, id: string) {
    setBusyId(id);
    try {
      await fn();
      await loadMembers();
      const res = await api.dashboardAntennaAdmin();
      setDashboardData(res);
    } finally { setBusyId(null); }
  }

  const stats = dashboardData?.stats;
  // Ajout des valeurs par défaut pour éviter l'erreur .map()
  const recentPendingAccounts = dashboardData?.recentPendingAccounts ?? [];
  const recentPendingContributions = dashboardData?.recentPendingContributions ?? [];
  const recentProjects = dashboardData?.recentProjects ?? [];
  const lateMembers = dashboardData?.lateMembers ?? [];

  /* ── Shared table styles ── */
  const thStyle: React.CSSProperties = { padding:'.65rem .9rem', fontSize:'.62rem', fontWeight:800, letterSpacing:'.1em', textTransform:'uppercase', color:'#374151', textAlign:'left', background:'rgba(248,250,252,.6)', whiteSpace:'nowrap' };
  const tdStyle: React.CSSProperties = { padding:'.75rem .9rem', verticalAlign:'middle', fontSize:'.8rem', color:'#111827' };
  const trStyle = (i: number): React.CSSProperties => ({ borderBottom:'1px solid rgba(37,99,235,.055)', animation:'aain .4s cubic-bezier(.22,1,.36,1) both', animationDelay:`${i * 0.03}s` });

  return (
    <AppShell title="Espace Admin Antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        .aa-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1200px;margin:0 auto}

        /* Header */
        .aa-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:aain .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .aa-eyebrow{font-size:.67rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .aa-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:aapulse 2s ease-in-out infinite}
        @keyframes aapulse{0%,100%{opacity:1}50%{opacity:.3}}
        .aa-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.85rem);font-weight:600;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .aa-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* Tabs */
        .aa-tabs{display:flex;gap:0;border-bottom:1px solid rgba(37,99,235,.1);margin-bottom:1.75rem;opacity:0;transform:translateY(8px);animation:aain .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        .aa-tab{height:44px;padding:0 1.25rem;border:none;border-bottom:2.5px solid transparent;background:transparent;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:600;color:#6B7280;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:.45rem;white-space:nowrap;margin-bottom:-1px}
        .aa-tab:hover{color:#374151}
        .aa-tab.active{color:#1D4ED8;border-bottom-color:#2563EB;font-weight:700}
        .aa-tab-chip{font-size:.62rem;font-weight:800;padding:.15rem .45rem;border-radius:99px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE;transition:all .2s}
        .aa-tab.active .aa-tab-chip{background:#DBEAFE;border-color:#93C5FD}

        /* Stats grid */
        .aa-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:aain .5s .12s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:900px){.aa-stats{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:480px){.aa-stats{grid-template-columns:repeat(1,1fr)}}

        /* Dashboard panels grid */
        .aa-grid2{display:grid;grid-template-columns:1fr 1fr;gap:1.1rem;margin-bottom:1.1rem;opacity:0;transform:translateY(10px);animation:aain .5s .18s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:860px){.aa-grid2{grid-template-columns:1fr}}
        .aa-grid2-b{animation-delay:.22s!important}

        /* Members toolbar */
        .aa-toolbar{display:flex;gap:.65rem;align-items:center;flex-wrap:wrap;padding:1rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07)}
        .aa-sw{position:relative;flex:1;min-width:180px}
        .aa-si{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .aa-search{width:100%;height:40px;border-radius:11px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.88);padding:0 .9rem 0 2.3rem;font-family:'DM Sans',sans-serif;font-size:.83rem;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .aa-search:focus{border-color:rgba(37,99,235,.4);box-shadow:0 0 0 3px rgba(37,99,235,.08);background:white}
        .aa-search::placeholder{color:rgba(107,114,128,.45)}
        .aa-select{height:40px;border-radius:11px;border:1px solid rgba(37,99,235,.15);background:rgba(255,255,255,.88);padding:0 2rem 0 .85rem;font-family:'DM Sans',sans-serif;font-size:.82rem;color:#374151;font-weight:600;outline:none;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right .65rem center;min-width:170px;transition:border-color .2s}
        .aa-select:focus{border-color:rgba(37,99,235,.4);outline:none}
        .aa-filter-btn{height:40px;padding:0 1.1rem;border-radius:11px;background:linear-gradient(135deg,#1D4ED8,#2563EB);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:700;display:flex;align-items:center;gap:.35rem;box-shadow:0 3px 10px rgba(37,99,235,.28);transition:all .18s;white-space:nowrap}
        .aa-filter-btn:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(37,99,235,.38)}

        /* Members panel */
        .aa-members-panel{background:rgba(253,253,255,.93);backdrop-filter:blur(12px);border-radius:20px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 14px rgba(37,99,235,.05),0 0 0 1px rgba(255,255,255,.85) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:aain .5s .1s cubic-bezier(.22,1,.36,1) forwards}
        .aa-members-head{padding:1rem 1.3rem;border-bottom:1px solid rgba(37,99,235,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem}
        .aa-members-title{font-size:.73rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1F2937;display:flex;align-items:center;gap:.5rem}
        .aa-members-ico{width:26px;height:26px;border-radius:7px;background:#EFF6FF;color:#2563EB;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .aa-count-chip{font-size:.67rem;font-weight:800;padding:.17rem .5rem;border-radius:99px;background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE}

        /* Error / loader */
        .aa-error{display:flex;align-items:center;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.8rem;font-weight:700;margin-bottom:1rem}
        .aa-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.82rem;font-weight:600}
        .aa-ring{width:24px;height:24px;border:2.5px solid rgba(37,99,235,.1);border-top-color:#2563EB;border-radius:50%;animation:aaspin .8s linear infinite}
        .aa-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem 1rem;gap:.65rem;color:#9CA3AF}
        .aa-empty p{font-size:.82rem;font-weight:700}

        /* Mini table shared */
        .aa-mt{width:100%;border-collapse:collapse}
        .aa-mt tr{border-bottom:1px solid rgba(37,99,235,.05)}
        .aa-mt tr:last-child{border-bottom:none}

        /* antenna name banner */
        .aa-antenna-banner{display:flex;align-items:center;gap:.75rem;padding:.85rem 1.1rem;background:linear-gradient(135deg,rgba(37,99,235,.07),rgba(59,130,246,.04));border:1px solid rgba(37,99,235,.12);border-radius:14px;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:aain .5s .10s cubic-bezier(.22,1,.36,1) forwards}
        .aa-antenna-ico{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#1D4ED8,#2563EB);display:flex;align-items:center;justifyContent:center;flex-shrink:0;box-shadow:0 4px 12px rgba(37,99,235,.3)}
        .aa-antenna-name{font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:600;color:#0F172A}
        .aa-antenna-sub{font-size:.7rem;color:#6B7280;font-weight:500}

        @keyframes aain{to{opacity:1;transform:translateY(0)}}
        @keyframes aaspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="aa-wrap">

        {/* Header */}
        <div className="aa-header">
          <div className="aa-eyebrow"><div className="aa-dot" />Admin antenne</div>
          <h1 className="aa-title">Espace <span>administrateur</span></h1>
        </div>

        {/* Tabs */}
        <div className="aa-tabs">
          {([
            { key:'dashboard', label:'Vue d\u2019ensemble',      icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, count: stats?.pendingAccounts },
            { key:'members',   label:'Annuaire \u0026 membres',  icon:<svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, count: members.length > 0 ? members.length : undefined },
          ] as const).map(t => (
            <button key={t.key} className={`aa-tab${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key as 'dashboard' | 'members')}>
              {t.icon}{t.label}
              {t.count !== undefined && <span className="aa-tab-chip">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ═══ TAB: DASHBOARD ═══ */}
        {activeTab === 'dashboard' && (
          <>
            {dashLoading && <div className="aa-loader"><div className="aa-ring" />Chargement&#8230;</div>}
            {dashboardError && (
              <div className="aa-error">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                {dashboardError}
              </div>
            )}

            {dashboardData && (
              <>
                {/* Antenna name banner */}
                <div className="aa-antenna-banner">
                  <div className="aa-antenna-ico" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>
                  </div>
                  <div>
                    <div className="aa-antenna-name">{stats?.antennaName}</div>
                    <div className="aa-antenna-sub">Tableau de bord de l&apos;antenne</div>
                  </div>
                </div>

                {/* Stats cards */}
                <div className="aa-stats">
                  <StatCard label="Membres total"       value={stats?.membersTotal ?? 0}       color="#2563EB" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
                  <StatCard label="Membres actifs"      value={stats?.membersActive ?? 0}      color="#059669" accent="#059669" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
                  <StatCard label="Comptes à valider"   value={stats?.pendingAccounts ?? 0}    color="#D97706" accent="#D97706" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>} />
                  <StatCard label="Cotisations en att." value={stats?.pendingContributions ?? 0} color="#7C3AED" accent="#7C3AED" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>} />
                  <StatCard label="Validées ce mois"    value={formatCurrency(stats?.validatedContributionsAmountMonth ?? 0, 'GNF')} color="#0369A1" accent="#0369A1" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402-2.599-1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
                  <StatCard label="Total validé"        value={formatCurrency(stats?.validatedContributionsAmountAllTime ?? 0, 'GNF')} color="#2563EB" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>} />
                  <StatCard label="Retardataires >3m"   value={stats?.lateMembersOver3Months ?? 0} color="#DC2626" accent="#DC2626" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
                  <StatCard label="Projets actifs"      value={stats?.activeProjects ?? 0}     color="#059669" accent="#059669" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>} />
                </div>

                {/* Row 1: Comptes en attente + Cotisations */}
                <div className="aa-grid2">
                  <MiniPanel title="Comptes en attente" icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} iconBg="#FFFBEB" iconColor="#D97706" count={recentPendingAccounts.length} emptyMsg="Aucun compte en attente">
                    <table className="aa-mt">
                      <thead><tr><th style={thStyle}>Membre</th><th style={thStyle}>Statut</th><th style={thStyle}>Date</th></tr></thead>
                      <tbody>
                        {recentPendingAccounts.map((u, i) => (
                          <tr key={u.id} style={trStyle(i)}>
                            <td style={tdStyle}>
                              <div style={{ display:'flex', alignItems:'center', gap:'.55rem' }}>
                                <Initials name={fullName(u)} />
                                <div>
                                  <div style={{ fontWeight:700, fontSize:'.82rem', color:'#0F172A' }}>{fullName(u)}</div>
                                  <div style={{ fontSize:'.68rem', color:'#6B7280' }}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={tdStyle}><UserStatusBadge status={u.status} /></td>
                            <td style={{ ...tdStyle, fontSize:'.72rem', color:'#6B7280' }}>{formatDate(u.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </MiniPanel>

                  <MiniPanel title="Cotisations à valider" icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>} iconBg="#F5F3FF" iconColor="#7C3AED" count={recentPendingContributions.length} emptyMsg="Aucune cotisation en attente">
                    <table className="aa-mt">
                      <thead><tr><th style={thStyle}>Membre</th><th style={thStyle}>Montant</th><th style={thStyle}>Date</th></tr></thead>
                      <tbody>
                        {recentPendingContributions.map((c, i) => (
                          <tr key={c.id} style={trStyle(i)}>
                            <td style={tdStyle}>
                              <div style={{ fontWeight:700, fontSize:'.82rem', color:'#0F172A' }}>{c.member ? `${c.member.firstName} ${c.member.lastName}` : c.memberId}</div>
                              {c.method && <div style={{ fontSize:'.68rem', color:'#6B7280' }}>{c.method}</div>}
                            </td>
                            <td style={tdStyle}><AmountPill amount={c.amount} currency={c.currency} /></td>
                            <td style={{ ...tdStyle, fontSize:'.72rem', color:'#6B7280' }}>{formatDate(c.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </MiniPanel>
                </div>

                {/* Row 2: Projets + Retardataires */}
                <div className="aa-grid2 aa-grid2-b">
                  <MiniPanel title="Projets récents" icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>} iconBg="#ECFDF5" iconColor="#059669" count={recentProjects.length} emptyMsg="Aucun projet">
                    <table className="aa-mt">
                      <thead><tr><th style={thStyle}>Titre</th><th style={thStyle}>Statut</th><th style={thStyle}>Budget</th></tr></thead>
                      <tbody>
                        {recentProjects.map((p, i) => (
                          <tr key={p.id} style={trStyle(i)}>
                            <td style={{ ...tdStyle, fontWeight:700, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</td>
                            <td style={tdStyle}><ProjectStatusBadge status={p.status} /></td>
                            <td style={tdStyle}>{p.budgetPlanned != null ? <AmountPill amount={p.budgetPlanned} /> : <span style={{ color:'#D1D5DB', fontSize:'.75rem' }}>—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </MiniPanel>

                  <MiniPanel title="Retardataires +3 mois" icon={<svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} iconBg="#FEF2F2" iconColor="#DC2626" count={lateMembers.length} emptyMsg="Aucun retardataire — bravo !">
                    <table className="aa-mt">
                      <thead><tr><th style={thStyle}>Membre</th><th style={thStyle}>Retard</th><th style={thStyle}>Dernière cotis.</th></tr></thead>
                      <tbody>
                        {lateMembers.map((m, i) => (
                          <tr key={m.id} style={trStyle(i)}>
                            <td style={tdStyle}>
                              <div style={{ fontWeight:700, fontSize:'.82rem', color:'#0F172A' }}>{fullName(m)}</div>
                              <div style={{ fontSize:'.68rem', color:'#6B7280' }}>{m.email}</div>
                            </td>
                            <td style={tdStyle}><LateBadge months={m.lateMonths} /></td>
                            <td style={{ ...tdStyle, fontSize:'.72rem', color:'#6B7280' }}>
                              {m.lastValidatedContributionAt ? formatDate(m.lastValidatedContributionAt) : <span style={{ color:'#D1D5DB' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </MiniPanel>
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ TAB: MEMBERS ═══ */}
        {activeTab === 'members' && (
          <div className="aa-members-panel">
            <div className="aa-members-head">
              <div className="aa-members-title">
                <div className="aa-members-ico"><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg></div>
                Gestion des membres
              </div>
              <span className="aa-count-chip">{members.length}</span>
            </div>

            {/* Toolbar */}
            <div className="aa-toolbar">
              <div className="aa-sw">
                <span className="aa-si"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg></span>
                <input className="aa-search" type="text" placeholder="Recherche nom, email&#8230;" value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void loadMembers(q, status)}
                />
              </div>
              <select className="aa-select" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">Tous statuts</option>
                <option value="PENDING_EMAIL_VERIFICATION">Email non v&eacute;rifi&eacute;</option>
                <option value="PENDING_APPROVAL">En attente approbation</option>
                <option value="ACTIVE">Actif</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="REJECTED">Rejet&eacute;</option>
              </select>
              <button className="aa-filter-btn" onClick={() => void loadMembers(q, status)}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
                Filtrer
              </button>
            </div>

            {membersError && (
              <div className="aa-error" style={{ margin:'.75rem 1.2rem' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
                {membersError}
              </div>
            )}

            {membersLoading
              ? <div className="aa-loader"><div className="aa-ring" />Chargement&#8230;</div>
              : <MemberActionsTable
                  items={members}
                  busyId={busyId}
                  onSuspend={(id: string) => withReload(() => api.suspendUser(id).then(() => undefined), id)}
                  onActivate={(id: string) => withReload(() => api.activateUser(id).then(() => undefined), id)}
                  onDelete={async (id: string) => {
                    const member = members.find(m => m.id === id);
                    if (member) setDeleteTarget(member);
                  }}
                />
            }
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteModal
          name={fullName(deleteTarget)}
          onConfirm={() => void withReload(() => api.deleteUser(deleteTarget.id).then(() => undefined), deleteTarget.id).then(() => setDeleteTarget(null))}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AppShell>
  );
}