// web/app/(protected)/admin/members/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate, fullName } from '../../../../lib/format';
import type { UserSummary, UserStatus } from '../../../../types/user';

/* ══════════════════════════════════════════════════════ INITIALS */
function Initials({ name, color = '#2563EB' }: { name: string; color?: string }) {
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${color},${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Cormorant Garamond',serif", fontSize: '.85rem', fontWeight: 700 }}>
      {txt}
    </div>
  );
}

function BigInitials({ name, color = '#2563EB' }: { name: string; color?: string }) {
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${color},${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', fontWeight: 700, boxShadow: `0 8px 16px ${color}33` }}>
      {txt}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ USER STATUS BADGE */
const USER_STATUS_MAP: Record<UserStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:           { label: 'Actif',              color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  PENDING_APPROVAL: { label: 'En attente',         color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  EMAIL_UNVERIFIED: { label: 'Email non vérif.',   color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' }, // Texte raccourci
  SUSPENDED:        { label: 'Suspendu',           color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  REJECTED:         { label: 'Rejeté',             color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  DELETED:          { label: 'Supprimé',           color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

function UserStatusBadge({ status }: { status: UserStatus }) {
  const s = USER_STATUS_MAP[status] ?? USER_STATUS_MAP['PENDING_APPROVAL'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: 'clamp(0.6rem, 2vw, 0.68rem)', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.15rem .45rem', whiteSpace: 'nowrap', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
    </span>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminMembersDirectoryPage() {
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  // États pour la modale
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadMembers = useCallback(async (qVal?: string, sVal?: string) => {
    setError(null); 
    setLoading(true);
    try {
      const res = await api.listAntennaMembers({
        page: 1, 
        pageSize: 100,
        q: (qVal ?? q) || undefined,
        status: (sVal ?? status) || undefined,
      });
      setMembers(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des membres');
    } finally { 
      setLoading(false); 
    }
  }, [q, status]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  /* ── Actions de la modale ── */
  const handleUpdateStatus = async (newStatus: UserStatus) => {
    if (!selectedUser) return;
    setActionLoading(newStatus);
    try {
      if (newStatus === 'ACTIVE') {
        await api.approveMemberAccountAntenna(selectedUser.id);
      } else if (newStatus === 'REJECTED') {
        await api.rejectMemberAccountAntenna(selectedUser.id);
      }
      await loadMembers();
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erreur lors de la mise à jour du statut.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce compte ?')) return;
    setActionLoading('DELETE');
    try {
      await api.deleteUser(selectedUser.id);
      await loadMembers();
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression du compte.");
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Helper pour afficher les valeurs vides ── */
  const renderInfoValue = (value: string | null | undefined) => {
    if (!value || value.trim() === '') {
      return <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontWeight: 500 }}>Non renseigné</span>;
    }
    return value;
  };

  /* ── Shared table styles ── */
  const thStyle: React.CSSProperties = { padding: '.65rem .9rem', fontSize: '.62rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#374151', textAlign: 'left', background: 'rgba(248,250,252,.6)', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '.75rem .9rem', verticalAlign: 'middle', fontSize: '.8rem', color: '#111827' };
  const trStyle = (i: number): React.CSSProperties => ({ 
    borderBottom: '1px solid rgba(37,99,235,.055)', 
    animation: 'aaFadeInUp .4s cubic-bezier(.22,1,.36,1) both', 
    animationDelay: `${i * 0.03}s`,
    cursor: 'pointer',
  });

  return (
    <AppShell title="Annuaire des membres">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
        .aa-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; }

        /* Header */
        .aa-header { margin-bottom: 1.5rem; animation: aaFadeInUp 0.5s 0.04s cubic-bezier(.22,1,.36,1) both; }
        .aa-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .aa-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: aapulse 2s ease-in-out infinite; }
        @keyframes aapulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .aa-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .aa-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Toolbar */
        .aa-toolbar { display: flex; gap: clamp(0.35rem, 1.5vw, 0.65rem); align-items: center; flex-wrap: nowrap; padding: 1rem clamp(0.5rem, 2vw, 1.3rem); border-bottom: 1px solid rgba(37,99,235,.07); overflow: hidden; }
        .aa-sw { position: relative; flex: 1; min-width: 0; }
        .aa-si { position: absolute; left: clamp(0.5rem, 1.5vw, 0.8rem); top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .aa-search { width: 100%; height: 40px; border-radius: 11px; border: 1px solid rgba(37,99,235,.15); background: rgba(255,255,255,.88); padding: 0 0.5rem 0 clamp(1.7rem, 4vw, 2.3rem); font-family: 'DM Sans', sans-serif; font-size: clamp(0.75rem, 2vw, 0.83rem); color: #111827; outline: none; transition: border-color .2s, box-shadow .2s; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
        .aa-search:focus { border-color: rgba(37,99,235,.4); box-shadow: 0 0 0 3px rgba(37,99,235,.08); background: white; }
        .aa-search::placeholder { color: rgba(107,114,128,.45); }
        .aa-select { flex: 0 1 auto; min-width: 0; height: 40px; border-radius: 11px; border: 1px solid rgba(37,99,235,.15); background: rgba(255,255,255,.88); padding: 0 clamp(1.2rem, 3vw, 2rem) 0 clamp(0.3rem, 1vw, 0.85rem); font-family: 'DM Sans', sans-serif; font-size: clamp(0.7rem, 2vw, 0.82rem); color: #374151; font-weight: 600; outline: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right clamp(0.25rem, 1vw, 0.65rem) center; transition: border-color .2s; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }
        .aa-select:focus { border-color: rgba(37,99,235,.4); outline: none; }
        .aa-filter-btn { flex: 0 0 auto; height: 40px; padding: 0 clamp(0.6rem, 2vw, 1.4rem); border-radius: 11px; background: linear-gradient(135deg,#1D4ED8,#2563EB); border: none; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: clamp(0.75rem, 2vw, 0.8rem); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.35rem; box-shadow: 0 3px 10px rgba(37,99,235,.28); transition: all 0.18s; white-space: nowrap; }
        .aa-filter-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(37,99,235,.38); }

        /* Members panel */
        .aa-members-panel { background: rgba(253,253,255,.93); backdrop-filter: blur(12px); border-radius: 20px; border: 1px solid rgba(37,99,235,.09); box-shadow: 0 2px 14px rgba(37,99,235,.05), 0 0 0 1px rgba(255,255,255,.85) inset; overflow: hidden; animation: aaFadeInUp 0.5s 0.1s cubic-bezier(.22,1,.36,1) both; }
        .aa-members-head { padding: 1rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,.07); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
        .aa-members-title { font-size: 0.73rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #1F2937; display: flex; align-items: center; gap: 0.5rem; }
        .aa-members-ico { width: 26px; height: 26px; border-radius: 7px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .aa-count-chip { font-size: 0.67rem; font-weight: 800; padding: 0.17rem 0.5rem; border-radius: 99px; background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }

        /* Error / loader */
        .aa-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.8rem; font-weight: 700; margin: 1.2rem; }
        .aa-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; font-weight: 600; }
        .aa-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,.1); border-top-color: #2563EB; border-radius: 50%; animation: aaspin 0.8s linear infinite; }
        .aa-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem 1rem; gap: 0.65rem; color: #9CA3AF; }
        .aa-empty p { font-size: 0.82rem; font-weight: 700; }

        /* Table */
        .aa-mt { width: 100%; border-collapse: collapse; }
        .aa-mt tr { border-bottom: 1px solid rgba(37,99,235,.05); transition: background 0.15s; }
        .aa-mt tr:last-child { border-bottom: none; }
        .aa-row-clickable:hover { background: rgba(37,99,235,0.03) !important; }
        .aa-row-clickable:active { background: rgba(37,99,235,0.06) !important; }

        /* ── MODAL STYLES ── */
        .aa-modal-overlay { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.5); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem; animation: aaFadeIn 0.25s forwards cubic-bezier(.22,1,.36,1) both; }
        .aa-modal-content { background: white; border-radius: 24px; width: 100%; max-width: 540px; box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(255,255,255,.9) inset; overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; animation: aaScaleUp 0.3s forwards cubic-bezier(.22,1,.36,1) both; }
        .aa-modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; background: #F8FAFC; }
        .aa-modal-title { font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 800; letter-spacing: 0.03em; color: #111827; }
        .aa-modal-close { background: white; border: 1px solid #E2E8F0; color: #64748B; cursor: pointer; padding: 0.4rem; border-radius: 50%; transition: all 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .aa-modal-close:hover { background: #F1F5F9; color: #111827; }
        .aa-modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
        
        .aa-user-hero { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px dashed #E2E8F0; }
        .aa-user-hero-info { display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-start; min-width: 0; }
        .aa-user-hero-name { font-family: 'Cormorant Garamond', serif; font-size: 1.7rem; font-weight: 700; color: #111827; line-height: 1.1; word-break: break-word; }
        .aa-user-hero-email { font-size: 0.85rem; color: #64748B; font-weight: 500; word-break: break-all; }

        .aa-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        .aa-info-item { display: flex; flex-direction: column; gap: 0.35rem; }
        .aa-info-label { font-size: 0.68rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; }
        .aa-info-value { font-size: 0.88rem; font-weight: 600; color: #1E293B; background: #F8FAFC; padding: 0.65rem 0.85rem; border-radius: 12px; border: 1px solid #F1F5F9; }

        .aa-modal-footer { padding: 1rem 1.25rem; border-top: 1px solid rgba(0,0,0,0.06); display: flex; flex-wrap: nowrap; gap: 0.5rem; justify-content: center; background: #F8FAFC; }
        .aa-btn { flex: 1; min-width: 0; height: 44px; border-radius: 12px; font-size: clamp(0.7rem, 2vw, 0.82rem); font-weight: 800; letter-spacing: 0.03em; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem; font-family: 'DM Sans', sans-serif; border: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 0.5rem; }
        .aa-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .aa-btn svg { flex-shrink: 0; }
        
        .aa-btn-validate { background: linear-gradient(135deg, #059669, #10B981); color: white; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); }
        .aa-btn-validate:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(5, 150, 105, 0.35); }
        
        .aa-btn-reject { background: linear-gradient(135deg, #D97706, #F59E0B); color: white; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); }
        .aa-btn-reject:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(217, 119, 6, 0.35); }
        
        .aa-btn-delete { background: white; color: #DC2626; border: 1.5px solid #FECACA; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.05); }
        .aa-btn-delete:hover:not(:disabled) { background: #FEF2F2; border-color: #F87171; }
        
        .aa-btn-ring { width: 14px; height: 14px; border: 2.5px solid; border-radius: 50%; animation: aaspin 0.8s linear infinite; flex-shrink: 0; }

        /* Responsive */
        .hide-mobile { display: table-cell; }
        .hide-desktop { display: none; }
        @media(max-width:768px){
          .hide-mobile { display: none !important; }
          .hide-desktop { display: block; }
          .aa-si svg { width: 13px; height: 13px; }
          .aa-modal-content { border-radius: 20px; }
          .aa-info-grid { grid-template-columns: 1fr; gap: 0.85rem; }
          /* On garde les boutons sur la même ligne même sur mobile */
          .aa-modal-footer { padding: 0.85rem; gap: 0.35rem; }
          .aa-btn { height: 40px; }
        }

        @keyframes aaFadeInUp { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes aaFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes aaScaleUp { 0% { transform: scale(0.95) translateY(10px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes aaspin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="aa-wrap">

        {/* Header */}
        <div className="aa-header">
          <div className="aa-eyebrow"><div className="aa-dot" />Admin antenne</div>
          <h1 className="aa-title">Annuaire <span>&amp; membres</span></h1>
        </div>

        <div className="aa-members-panel">
          <div className="aa-members-head">
            <div className="aa-members-title">
              <div className="aa-members-ico">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              Gestion des membres
            </div>
            <span className="aa-count-chip">{members.length}</span>
          </div>

          {/* Toolbar */}
          <div className="aa-toolbar">
            <div className="aa-sw">
              <span className="aa-si">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
              </span>
              <input className="aa-search" type="text" placeholder="Recherche nom, email..." value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void loadMembers(q, status)}
              />
            </div>
            <select className="aa-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="EMAIL_UNVERIFIED">Email non vérifié</option>
              <option value="PENDING_APPROVAL">En attente approbation</option>
              <option value="ACTIVE">Actif</option>
              <option value="SUSPENDED">Suspendu</option>
              <option value="REJECTED">Rejeté</option>
            </select>
            <button className="aa-filter-btn" onClick={() => void loadMembers(q, status)}>
              Filtrer
            </button>
          </div>

          {error && (
            <div className="aa-error">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="aa-loader"><div className="aa-ring" />Chargement...</div>
          ) : members.length === 0 ? (
            <div className="aa-empty">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p>Aucun membre trouvé pour ces critères.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="aa-mt">
                <thead>
                  <tr>
                    <th style={thStyle}>Membre</th>
                    <th className="hide-mobile" style={thStyle}>Email</th>
                    <th style={{ ...thStyle, width: '120px' }}>Statut</th>
                    <th className="hide-mobile" style={thStyle}>Créé le</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((u, i) => (
                    <tr 
                      key={u.id} 
                      style={trStyle(i)} 
                      className="aa-row-clickable"
                      onClick={() => setSelectedUser(u)} // Ouvre la modale
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
                          <Initials name={fullName(u)} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#0F172A' }}>{fullName(u)}</div>
                            <div className="hide-desktop" style={{ fontSize: '.68rem', color: '#6B7280' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hide-mobile" style={tdStyle}>
                        <div style={{ fontSize: '.8rem', color: '#6B7280' }}>{u.email}</div>
                      </td>
                      <td style={tdStyle}>
                        <UserStatusBadge status={u.status} />
                      </td>
                      <td className="hide-mobile" style={{ ...tdStyle, fontSize: '.75rem', color: '#6B7280' }}>
                        {formatDate(u.createdAt)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── MODALE DE VALIDATION ── */}
        {selectedUser && (
          <div className="aa-modal-overlay" onClick={() => setSelectedUser(null)}>
            <div className="aa-modal-content" onClick={e => e.stopPropagation()}>
              
              <div className="aa-modal-header">
                <span className="aa-modal-title">Détails du compte</span>
                <button className="aa-modal-close" onClick={() => setSelectedUser(null)}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="aa-modal-body">
                <div className="aa-user-hero">
                  <BigInitials name={fullName(selectedUser)} color={USER_STATUS_MAP[selectedUser.status as UserStatus]?.color || '#2563EB'} />
                  <div className="aa-user-hero-info">
                    <div className="aa-user-hero-name">{fullName(selectedUser)}</div>
                    <div className="aa-user-hero-email">{selectedUser.email}</div>
                    <div style={{ marginTop: '0.2rem' }}>
                      <UserStatusBadge status={selectedUser.status} />
                    </div>
                  </div>
                </div>

                <div className="aa-info-grid">
                  <div className="aa-info-item">
                    <span className="aa-info-label">Date d&apos;inscription</span>
                    <span className="aa-info-value">{formatDate(selectedUser.createdAt)}</span>
                  </div>
                  <div className="aa-info-item">
                    <span className="aa-info-label">Téléphone</span>
                    <span className="aa-info-value">{renderInfoValue(selectedUser.phone)}</span>
                  </div>
                  <div className="aa-info-item">
                    <span className="aa-info-label">Profession</span>
                    <span className="aa-info-value">{renderInfoValue(selectedUser.professionalStatus)}</span>
                  </div>
                  <div className="aa-info-item">
                    <span className="aa-info-label">Poste associatif</span>
                    <span className="aa-info-value">{renderInfoValue(selectedUser.function)}</span>
                  </div>
                  <div className="aa-info-item">
                    <span className="aa-info-label">Commune d&apos;origine</span>
                    <span className="aa-info-value">{renderInfoValue(selectedUser.originSubPrefecture)}</span>
                  </div>
                  <div className="aa-info-item">
                    <span className="aa-info-label">Lieu de résidence</span>
                    <span className="aa-info-value">
                      {renderInfoValue([selectedUser.city, selectedUser.country].filter(Boolean).join(', '))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="aa-modal-footer">
                {selectedUser.status !== 'ACTIVE' && selectedUser.status !== 'DELETED' && (
                  <button 
                    className="aa-btn aa-btn-validate" 
                    onClick={() => handleUpdateStatus('ACTIVE')} 
                    disabled={actionLoading !== null}
                    title="Valider"
                  >
                    {actionLoading === 'ACTIVE' ? <div className="aa-btn-ring" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : (
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    Valider
                  </button>
                )}

                {selectedUser.status !== 'REJECTED' && selectedUser.status !== 'DELETED' && (
                  <button 
                    className="aa-btn aa-btn-reject" 
                    onClick={() => handleUpdateStatus('REJECTED')} 
                    disabled={actionLoading !== null}
                    title="Rejeter"
                  >
                    {actionLoading === 'REJECTED' ? <div className="aa-btn-ring" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : (
                      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                    Rejeter
                  </button>
                )}

                <button 
                  className="aa-btn aa-btn-delete" 
                  onClick={handleDelete} 
                  disabled={actionLoading !== null}
                  title="Supprimer"
                >
                  {actionLoading === 'DELETE' ? <div className="aa-btn-ring" style={{ borderColor: 'rgba(220,38,38,0.3)', borderTopColor: '#DC2626' }} /> : (
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  )}
                  Supprimer
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}