// web/app/(protected)/admin/members/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import { formatDate, fullName } from '../../../../lib/format';
import type { UserSummary, UserStatus } from '../../../../types/user';

/* ══════════════════════════════════════════════════════ INITIALS */
function Initials({ name, color = '#2563EB' }: { name: string; color?: string }) {
  const parts = name.trim().split(' ');
  const txt = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${color},${color}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: "'Cormorant Garamond',serif", fontSize: '.82rem', fontWeight: 600 }}>
      {txt}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ USER STATUS BADGE */
// Correction : Remplacement de PENDING_EMAIL_VERIFICATION par EMAIL_UNVERIFIED pour correspondre au schéma Prisma
const USER_STATUS_MAP: Record<UserStatus, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE:           { label: 'Actif',              color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  PENDING_APPROVAL: { label: 'En attente',         color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  EMAIL_UNVERIFIED: { label: 'Email non vérifié',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' },
  SUSPENDED:        { label: 'Suspendu',           color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  REJECTED:         { label: 'Rejeté',             color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  DELETED:          { label: 'Supprimé',           color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' },
};

function UserStatusBadge({ status }: { status: UserStatus }) {
  const s = USER_STATUS_MAP[status] ?? USER_STATUS_MAP['PENDING_APPROVAL'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem', fontWeight: 800, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.2rem .55rem', whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />{s.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function AdminMembersDirectoryPage() {
  const router = useRouter();
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

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

  /* ── Shared table styles ── */
  const thStyle: React.CSSProperties = { padding: '.65rem .9rem', fontSize: '.62rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#374151', textAlign: 'left', background: 'rgba(248,250,252,.6)', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '.75rem .9rem', verticalAlign: 'middle', fontSize: '.8rem', color: '#111827' };
  const trStyle = (i: number): React.CSSProperties => ({ 
    borderBottom: '1px solid rgba(37,99,235,.055)', 
    animation: 'aain .4s cubic-bezier(.22,1,.36,1) both', 
    animationDelay: `${i * 0.03}s`,
    cursor: 'pointer',
  });

  return (
    <AppShell title="Annuaire des membres">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        .aa-wrap { font-family: 'DM Sans', sans-serif; padding: clamp(1.25rem, 3vw, 2rem); max-width: 1200px; margin: 0 auto; }

        /* Header */
        .aa-header { margin-bottom: 1.5rem; opacity: 0; transform: translateY(10px); animation: aain 0.5s 0.04s cubic-bezier(.22,1,.36,1) forwards; }
        .aa-eyebrow { font-size: 0.67rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #2563EB; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem; }
        .aa-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: aapulse 2s ease-in-out infinite; }
        @keyframes aapulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .aa-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.45rem, 3vw, 1.85rem); font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.15; }
        .aa-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* Toolbar */
        .aa-toolbar { display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; padding: 1rem 1.3rem; border-bottom: 1px solid rgba(37,99,235,.07); }
        .aa-sw { position: relative; flex: 1; min-width: 180px; }
        .aa-si { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .aa-search { width: 100%; height: 40px; border-radius: 11px; border: 1px solid rgba(37,99,235,.15); background: rgba(255,255,255,.88); padding: 0 .9rem 0 2.3rem; font-family: 'DM Sans', sans-serif; font-size: 0.83rem; color: #111827; outline: none; transition: border-color .2s, box-shadow .2s; }
        .aa-search:focus { border-color: rgba(37,99,235,.4); box-shadow: 0 0 0 3px rgba(37,99,235,.08); background: white; }
        .aa-search::placeholder { color: rgba(107,114,128,.45); }
        .aa-select { height: 40px; border-radius: 11px; border: 1px solid rgba(37,99,235,.15); background: rgba(255,255,255,.88); padding: 0 2rem 0 .85rem; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #374151; font-weight: 600; outline: none; appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right .65rem center; min-width: 170px; transition: border-color .2s; }
        .aa-select:focus { border-color: rgba(37,99,235,.4); outline: none; }
        .aa-filter-btn { height: 40px; padding: 0 1.1rem; border-radius: 11px; background: linear-gradient(135deg,#1D4ED8,#2563EB); border: none; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 0.35rem; box-shadow: 0 3px 10px rgba(37,99,235,.28); transition: all 0.18s; white-space: nowrap; }
        .aa-filter-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(37,99,235,.38); }

        /* Members panel */
        .aa-members-panel { background: rgba(253,253,255,.93); backdrop-filter: blur(12px); border-radius: 20px; border: 1px solid rgba(37,99,235,.09); box-shadow: 0 2px 14px rgba(37,99,235,.05), 0 0 0 1px rgba(255,255,255,.85) inset; overflow: hidden; opacity: 0; transform: translateY(10px); animation: aain 0.5s 0.1s cubic-bezier(.22,1,.36,1) forwards; }
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

        .hide-mobile { display: table-cell; }
        @media(max-width:768px){
          .hide-mobile { display: none !important; }
        }

        @keyframes aain { to { opacity: 1; transform: translateY(0); } }
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
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/></svg>
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
                    <th style={thStyle}>Statut</th>
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
                      onClick={() => router.push(`/admin/members/${u.id}`)}
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
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}