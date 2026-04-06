// web/app/(protected)/admin/approvals/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary, UserStatus } from '../../../../types/user';
import { formatDate } from '../../../../lib/format';

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\u2019instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

/* ══════════════════════════════════════════════════════ INITIALS */
function Initials({ firstName, lastName }: { firstName: string; lastName: string }) {
  const txt = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: "'Cormorant Garamond', serif",
      fontSize: '0.95rem', fontWeight: 600,
      boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
    }}>
      {txt}
    </div>
  );
}

function BigInitials({ firstName, lastName, color = '#2563EB' }: { firstName: string; lastName: string; color?: string }) {
  const txt = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  return (
    <div style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${color},${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Cormorant Garamond',serif", fontSize: '1.5rem', fontWeight: 700, boxShadow: `0 8px 16px ${color}33` }}>
      {txt}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ USER STATUS BADGE */
const USER_STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:           { label: 'Actif',              color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  PENDING_APPROVAL: { label: 'En attente',         color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  EMAIL_UNVERIFIED: { label: 'Email non vérif.',   color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  SUSPENDED:        { label: 'Suspendu',           color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  REJECTED:         { label: 'Rejeté',             color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  DELETED:          { label: 'Supprimé',           color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

function UserStatusBadge({ status }: { status: string }) {
  const s = USER_STATUS_MAP[status] ?? USER_STATUS_MAP['PENDING_APPROVAL'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: 'clamp(0.6rem, 2vw, 0.68rem)', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.15rem .45rem', whiteSpace: 'nowrap', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
    </span>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminApprovalsPage() {
  const [items,     setItems]     = useState<UserSummary[]>([]);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  
  // États pour la modale
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await api.listPendingMemberApprovalsAntenna({ page: 1, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  /* ── Actions de la modale ── */
  const handleUpdateStatus = async (newStatus: 'ACTIVE' | 'REJECTED') => {
    if (!selectedUser) return;
    setActionLoading(newStatus);
    try {
      if (newStatus === 'ACTIVE') {
        await api.approveMemberAccountAntenna(selectedUser.id);
      } else if (newStatus === 'REJECTED') {
        await api.rejectMemberAccountAntenna(selectedUser.id, undefined);
      }
      await load();
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Erreur lors de l'opération.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce compte en attente ?')) return;
    setActionLoading('DELETE');
    try {
      await api.deleteUser(selectedUser.id);
      await load();
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

  const filtered = items.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <AppShell title="Validations comptes">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');

        .aa-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1rem, 3vw, 2rem);
          max-width: 980px; margin: 0 auto;
        }

        /* Header */
        .aa-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          flex-wrap: wrap; gap: 1rem; margin-bottom: 1.75rem;
          animation: aaFadeInUp 0.5s 0.04s cubic-bezier(.22,1,.36,1) both;
        }
        .aa-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .aa-eyebrow-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: aapulse 2s ease-in-out infinite; }
        @keyframes aapulse { 0%,100%{opacity:1;} 50%{opacity:.3;} }
        .aa-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .aa-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

        /* Stats chips */
        .aa-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .aa-chip {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.4rem 0.85rem; border-radius: 99px;
          font-size: 0.72rem; font-weight: 700; border: 1px solid;
        }

        /* Toolbar */
        .aa-toolbar {
          display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;
          margin-bottom: 1.1rem;
          animation: aaFadeInUp 0.5s 0.1s cubic-bezier(.22,1,.36,1) both;
        }
        .aa-search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 340px; }
        .aa-search-ico { position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .aa-search {
          width: 100%; height: 42px; border-radius: 11px;
          border: 1px solid rgba(37,99,235,0.15);
          background: rgba(255,255,255,0.85);
          padding: 0 1rem 0 2.4rem;
          font-family: 'DM Sans', sans-serif; font-size: 0.84rem; color: #111827;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .aa-search:focus { border-color: rgba(37,99,235,0.45); box-shadow: 0 0 0 3px rgba(37,99,235,0.09); background: white; }
        .aa-search::placeholder { color: rgba(107,114,128,0.5); }

        .aa-reload-btn {
          height: 42px; padding: 0 1rem; border-radius: 11px;
          border: 1px solid rgba(37,99,235,0.15); background: rgba(255,255,255,0.85);
          display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: #374151;
          font-family: 'DM Sans', sans-serif; font-size: 0.78rem; font-weight: 600;
          transition: all 0.18s; white-space: nowrap;
        }
        .aa-reload-btn:hover { background: #EFF6FF; border-color: rgba(37,99,235,0.3); color: #1D4ED8; }

        /* Panel */
        .aa-panel {
          background: rgba(253,253,255,0.93);
          backdrop-filter: blur(12px); border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.09);
          box-shadow: 0 2px 14px rgba(37,99,235,0.05), 0 0 0 1px rgba(255,255,255,0.85) inset;
          overflow: hidden;
          animation: aaFadeInUp 0.5s 0.15s cubic-bezier(.22,1,.36,1) both;
        }

        /* Table */
        .aa-table { width: 100%; border-collapse: collapse; }
        .aa-table thead tr { border-bottom: 1px solid rgba(37,99,235,0.09); }
        .aa-table thead th {
          padding: 0.85rem 1.25rem;
          font-size: 0.66rem; font-weight: 800; letter-spacing: 0.1em;
          text-transform: uppercase; color: #374151; text-align: left;
          background: rgba(248,250,252,0.6);
        }
        .aa-table tbody tr {
          border-bottom: 1px solid rgba(37,99,235,0.055);
          transition: background 0.15s; cursor: pointer;
          animation: aaFadeInUp 0.4s cubic-bezier(.22,1,.36,1) both;
        }
        .aa-table tbody tr:last-child { border-bottom: none; }
        .aa-table tbody tr:hover { background: rgba(37,99,235,0.03) !important; }
        .aa-table tbody tr:active { background: rgba(37,99,235,0.06) !important; }
        .aa-table td { padding: 0.9rem 1.25rem; vertical-align: middle; }

        /* Member info */
        .aa-member { display: flex; align-items: center; gap: 0.75rem; }
        .aa-member-name { font-size: 0.88rem; font-weight: 700; color: #0F172A; }
        .aa-member-email { font-size: 0.72rem; color: #6B7280; font-weight: 500; margin-top: 1px; }

        /* Date column */
        .aa-date { font-size: 0.78rem; color: #4B5563; font-weight: 600; }
        .aa-date-ago { font-size: 0.68rem; color: #9CA3AF; font-weight: 500; margin-top: 2px; }

        /* Empty / loader */
        .aa-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3.5rem 1rem; gap: 0.75rem; color: #9CA3AF; }
        .aa-empty-ico { width: 52px; height: 52px; border-radius: 50%; background: #F3F4F6; border: 1px solid #E5E7EB; display: flex; align-items: center; justify-content: center; }
        .aa-empty p { font-size: 0.82rem; font-weight: 600; text-align: center; }

        .aa-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: #6B7280; font-size: 0.82rem; font-weight: 600; }
        .aa-ring { width: 24px; height: 24px; border: 2.5px solid rgba(37,99,235,0.1); border-top-color: #2563EB; border-radius: 50%; animation: aaspin 0.8s linear infinite; }

        /* Error */
        .aa-error { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.1rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }

        /* Mobile card layout */
        .aa-mobile-cards { display: none; }
        @media (max-width: 700px) {
          .aa-table-wrap { display: none; }
          .aa-mobile-cards { display: flex; flex-direction: column; }
        }
        .aa-mcard {
          padding: 1rem 1.25rem; border-bottom: 1px solid rgba(37,99,235,0.07);
          animation: aaFadeInUp 0.4s cubic-bezier(.22,1,.36,1) both;
          cursor: pointer; transition: background 0.15s;
          display: flex; align-items: center; justify-content: space-between;
        }
        .aa-mcard:last-child { border-bottom: none; }
        .aa-mcard:hover { background: rgba(37,99,235,0.03); }
        .aa-mcard:active { background: rgba(37,99,235,0.06); }
        
        .aa-mcard-content { flex: 1; min-width: 0; }
        .aa-mcard-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
        .aa-mcard-meta { font-size: 0.72rem; color: #6B7280; font-weight: 500; display: flex; gap: 1rem; flex-wrap: wrap; }
        .aa-mcard-chevron { flex-shrink: 0; color: #9CA3AF; margin-left: 1rem; }

        /* ── MODAL STYLES (Repris à l'identique de la page members) ── */
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

        @media(max-width:768px){
          .aa-modal-content { border-radius: 20px; }
          .aa-info-grid { grid-template-columns: 1fr; gap: 0.85rem; }
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
          <div>
            <div className="aa-eyebrow"><div className="aa-eyebrow-dot" />Admin antenne</div>
            <h1 className="aa-title">Comptes <span>en attente</span></h1>
          </div>
          <div className="aa-chips">
            <span className="aa-chip" style={{ background:'#FFFBEB', color:'#D97706', borderColor:'#FDE68A' }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:'#D97706' }} />
              {items.length} en attente
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="aa-error">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0 }}>
              <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
            </svg>
            {error}
          </div>
        )}

        {/* Toolbar */}
        <div className="aa-toolbar">
          <div className="aa-search-wrap">
            <span className="aa-search-ico">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
              </svg>
            </span>
            <input
              className="aa-search"
              type="text"
              placeholder="Rechercher un membre&#8230;"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="aa-reload-btn" onClick={() => void load()}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Actualiser
          </button>
        </div>

        {/* Panel */}
        <div className="aa-panel">
          {loading ? (
            <div className="aa-loader"><div className="aa-ring" />Chargement&#8230;</div>
          ) : filtered.length === 0 ? (
            <div className="aa-empty">
              <div className="aa-empty-ico">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p>{search ? 'Aucun r\u00e9sultat pour cette recherche' : 'Aucun compte en attente \u2014 tout est \u00e0 jour\u00a0!'}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="aa-table-wrap">
                <table className="aa-table">
                  <thead>
                    <tr>
                      <th>Membre</th>
                      <th>Inscription</th>
                      <th style={{ textAlign:'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr key={u.id} style={{ animationDelay:`${i * 0.04}s` }} onClick={() => setSelectedUser(u)}>
                        <td>
                          <div className="aa-member">
                            <Initials firstName={u.firstName} lastName={u.lastName} />
                            <div>
                              <div className="aa-member-name">{u.firstName} {u.lastName}</div>
                              <div className="aa-member-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="aa-date">{formatDate(u.createdAt)}</div>
                          <div className="aa-date-ago">{timeAgo(u.createdAt)}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="aa-mobile-cards">
                {filtered.map((u, i) => (
                  <div key={u.id} className="aa-mcard" style={{ animationDelay:`${i * 0.04}s` }} onClick={() => setSelectedUser(u)}>
                    <div className="aa-mcard-content">
                      <div className="aa-mcard-top">
                        <Initials firstName={u.firstName} lastName={u.lastName} />
                        <div>
                          <div className="aa-member-name">{u.firstName} {u.lastName}</div>
                          <div className="aa-member-email">{u.email}</div>
                        </div>
                      </div>
                      <div className="aa-mcard-meta">
                        <span>Inscrit le {formatDate(u.createdAt)}</span>
                        <span>{timeAgo(u.createdAt)}</span>
                      </div>
                    </div>
                    <div className="aa-mcard-chevron">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── MODALE DE VALIDATION ── */}
      {selectedUser && (
        <div className="aa-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="aa-modal-content" onClick={e => e.stopPropagation()}>
            
            <div className="aa-modal-header">
              <span className="aa-modal-title">Validation du compte</span>
              <button className="aa-modal-close" onClick={() => setSelectedUser(null)}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="aa-modal-body">
              <div className="aa-user-hero">
                <BigInitials firstName={selectedUser.firstName} lastName={selectedUser.lastName} color={USER_STATUS_MAP[selectedUser.status as UserStatus]?.color || '#D97706'} />
                <div className="aa-user-hero-info">
                  <div className="aa-user-hero-name">{selectedUser.firstName} {selectedUser.lastName}</div>
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

    </AppShell>
  );
}