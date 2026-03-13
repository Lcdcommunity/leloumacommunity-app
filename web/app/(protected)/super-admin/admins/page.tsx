// web/app/(protected)/super-admin/admins/page.tsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { UserSummary } from '../../../../types/user';
import { formatDate, fullName } from '../../../../lib/format';

function AvatarIcon({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName.charAt(0) || ''}${lastName.charAt(0) || ''}`.toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 12, flexShrink: 0,
      background: 'linear-gradient(135deg,#1D4ED8,#3B82F6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: "'DM Sans',sans-serif",
      fontSize: '.85rem', fontWeight: 800,
      boxShadow: '0 3px 8px rgba(37,99,235,.3)',
    }}>
      {initials}
    </div>
  );
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ACTIVE: { label: 'Actif', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  SUSPENDED: { label: 'Suspendu', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  PENDING_APPROVAL: { label: 'En attente', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || { label: status, color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.28rem', fontSize: '.68rem', fontWeight: 900, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 99, padding: '.2rem .6rem', whiteSpace: 'nowrap', letterSpacing: '.04em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

export default function SuperAdminAdminsPage() {
  const [items, setItems] = useState<UserSummary[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (qVal?: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.listAntennaAdmins({ page: 1, pageSize: 100, q: qVal ?? q });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des administrateurs');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load('');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = items.length;
  const activeCount = items.filter((u) => u.status === 'ACTIVE').length;
  const suspendedCount = items.filter((u) => u.status === 'SUSPENDED').length;

  return (
    <AppShell title="Admins d'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        .sad-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:1200px;margin:0 auto}
        .sad-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:sadin .5s .04s cubic-bezier(.22,1,.36,1) forwards}
        .sad-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sad-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:sadpulse 2s ease-in-out infinite}
        @keyframes sadpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sad-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.5rem,3vw,2rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sad-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        .sad-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin-bottom:1.4rem;opacity:0;transform:translateY(10px);animation:sadin .5s .08s cubic-bezier(.22,1,.36,1) forwards}
        @media(max-width:540px){.sad-stats{grid-template-columns:1fr 1fr}}
        .sad-stat{background:rgba(253,253,255,.93);border-radius:14px;border:1px solid rgba(220,38,38,.09);border-top:3px solid;box-shadow:0 2px 8px rgba(220,38,38,.04);padding:.8rem 1rem}
        .sad-stat-val{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;line-height:1;margin-bottom:.2rem}
        .sad-stat-lbl{font-size:.65rem;font-weight:800;color:#6B7280;text-transform:uppercase;letter-spacing:.07em}

        .sad-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:sadin .5s .13s cubic-bezier(.22,1,.36,1) forwards}
        .sad-panel-head{padding:1rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap}
        .sad-panel-titlerow{display:flex;align-items:center;gap:.55rem}
        .sad-panel-ico{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(220,38,38,.3)}
        .sad-panel-title{font-size:.75rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .sad-count-chip{font-size:.68rem;font-weight:900;padding:.2rem .6rem;border-radius:99px;background:#FEF2F2;color:#B91C1C;border:1px solid #FECACA}

        .sad-new-btn{height:38px;padding:0 1.1rem;border-radius:11px;background:linear-gradient(135deg,#991B1B,#DC2626);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;display:flex;align-items:center;gap:.4rem;box-shadow:0 4px 14px rgba(220,38,38,.32);transition:all .18s;text-decoration:none;white-space:nowrap}
        .sad-new-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(220,38,38,.42)}

        .sad-toolbar{display:flex;gap:.6rem;align-items:center;flex-wrap:wrap;padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07)}
        .sad-sw{position:relative;flex:1;min-width:200px}
        .sad-si{position:absolute;left:.8rem;top:50%;transform:translateY(-50%);color:#9CA3AF;pointer-events:none}
        .sad-search{width:100%;height:40px;border-radius:11px;border:1px solid rgba(220,38,38,.15);background:rgba(255,255,255,.9);padding:0 .9rem 0 2.4rem;font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:500;color:#111827;outline:none;transition:border-color .2s,box-shadow .2s}
        .sad-search:focus{border-color:rgba(220,38,38,.4);box-shadow:0 0 0 3px rgba(220,38,38,.08);background:white}
        .sad-search::placeholder{color:rgba(107,114,128,.45);font-weight:400}
        .sad-search-btn{height:40px;padding:0 1.1rem;border-radius:11px;background:linear-gradient(135deg,#1D4ED8,#2563EB);border:none;color:white;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800;display:flex;align-items:center;gap:.4rem;box-shadow:0 3px 10px rgba(37,99,235,.3);transition:all .18s;white-space:nowrap}
        .sad-search-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 16px rgba(37,99,235,.4)}
        .sad-search-btn:disabled{opacity:.6;cursor:not-allowed}

        .sad-note{display:flex;align-items:flex-start;gap:.65rem;padding:.9rem 1.2rem;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;color:#1D4ED8;font-size:.8rem;font-weight:700;margin:1rem}

        .sad-tw{overflow-x:auto}
        .sad-table{width:100%;border-collapse:collapse;min-width:750px}
        .sad-table thead tr{border-bottom:2px solid rgba(220,38,38,.1)}
        .sad-table th{padding:.8rem 1.2rem;font-size:.65rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:#374151;background:rgba(254,242,242,.35);text-align:left;white-space:nowrap}
        .sad-table tbody tr{border-bottom:1px solid rgba(220,38,38,.05);transition:background .15s;animation:sadin .4s cubic-bezier(.22,1,.36,1) both}
        .sad-table tbody tr:last-child{border-bottom:none}
        .sad-table tbody tr:hover{background:rgba(220,38,38,.025)}
        .sad-table td{padding:.9rem 1.2rem;font-size:.82rem;color:#111827;vertical-align:middle}

        .sad-name{font-weight:800;font-size:.88rem;color:#0F172A}
        .sad-email{font-size:.72rem;color:#6B7280;font-weight:500;margin-top:2px}
        .sad-role{font-family:'DM Mono',monospace;font-size:.72rem;font-weight:700;color:#2563EB;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:.15rem .45rem}
        .sad-date{font-size:.75rem;font-weight:700;color:#6B7280}

        .sad-mob{display:none;flex-direction:column}
        @media(max-width:760px){.sad-tw{display:none}.sad-mob{display:flex}}
        .sad-mc{padding:1rem 1.2rem;border-bottom:1px solid rgba(220,38,38,.07);animation:sadin .4s cubic-bezier(.22,1,.36,1) both}
        .sad-mc:last-child{border-bottom:none}
        .sad-mc-top{display:flex;align-items:flex-start;gap:.65rem;margin-bottom:.6rem}
        .sad-mc-info{flex:1;min-width:0}
        .sad-mc-row2{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.65rem}

        .sad-loader{display:flex;align-items:center;justify-content:center;padding:3rem;gap:.75rem;color:#6B7280;font-size:.84rem;font-weight:700}
        .sad-ring{width:24px;height:24px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:sadspin .8s linear infinite}
        .sad-error{display:flex;align-items:center;gap:.65rem;padding:.9rem 1.2rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin:1rem}
        .sad-empty{display:flex;flex-direction:column;align-items:center;padding:3rem 1rem;gap:.7rem;color:#9CA3AF}
        .sad-empty p{font-size:.84rem;font-weight:700}

        @keyframes sadin{to{opacity:1;transform:translateY(0)}}
        @keyframes sadspin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="sad-wrap">
        <div className="sad-header">
          <div className="sad-eyebrow"><div className="sad-dot" />Super Admin</div>
          <h1 className="sad-title">Administrateurs <span>d&apos;antenne</span></h1>
        </div>

        <div className="sad-stats">
          {([
            { label: 'Total administrateurs', value: total, color: '#DC2626' },
            { label: 'Comptes actifs', value: activeCount, color: '#059669' },
            { label: 'Comptes suspendus', value: suspendedCount, color: '#D97706' },
          ] as const).map((s) => (
            <div key={s.label} className="sad-stat" style={{ borderTopColor: s.color }}>
              <div className="sad-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="sad-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="sad-panel">
          <div className="sad-panel-head">
            <div className="sad-panel-titlerow">
              <div className="sad-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="sad-panel-title">Comptes d&eacute;l&eacute;gu&eacute;s</span>
              {items.length > 0 && <span className="sad-count-chip">{items.length}</span>}
            </div>

            <Link href="/super-admin/admins/new" className="sad-new-btn">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.8">
                <path strokeLinecap="round" d="M12 4v16m8-8H4" />
              </svg>
              Nouvel admin
            </Link>
          </div>

          <div className="sad-toolbar">
            <div className="sad-sw">
              <span className="sad-si">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
              </span>

              <input
                className="sad-search"
                type="text"
                placeholder="Recherche par nom, email&#8230;"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void load(q)}
              />
            </div>

            <button className="sad-search-btn" disabled={loading} onClick={() => void load(q)}>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              Rechercher
            </button>
          </div>

          <div className="sad-note">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            Les actions suspendre, activer et supprimer ne sont pas encore branchées sur des routes super-admin dédiées pour les administrateurs d&apos;antenne.
          </div>

          {error && (
            <div className="sad-error">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="sad-loader"><div className="sad-ring" />Chargement&#8230;</div>
          ) : !error && items.length === 0 ? (
            <div className="sad-empty">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p>Aucun administrateur trouv&eacute;</p>
            </div>
          ) : !error ? (
            <>
              <div className="sad-tw">
                <table className="sad-table">
                  <thead>
                    <tr>
                      <th>Administrateur</th>
                      <th>R&ocirc;le / Antenne</th>
                      <th>Statut</th>
                      <th>Cr&eacute;&eacute; le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u, i) => (
                      <tr key={u.id} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                            <AvatarIcon firstName={u.firstName} lastName={u.lastName} />
                            <div>
                              <div className="sad-name">{fullName(u)}</div>
                              <div className="sad-email">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="sad-role">ADMIN ANTENNE</span>
                        </td>
                        <td><StatusBadge status={u.status} /></td>
                        <td><span className="sad-date">{formatDate(u.createdAt)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sad-mob">
                {items.map((u, i) => (
                  <div key={u.id} className="sad-mc" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="sad-mc-top">
                      <AvatarIcon firstName={u.firstName} lastName={u.lastName} />
                      <div className="sad-mc-info">
                        <div className="sad-name">{fullName(u)}</div>
                        <div className="sad-email">{u.email}</div>
                      </div>
                      <StatusBadge status={u.status} />
                    </div>
                    <div className="sad-mc-row2">
                      <span className="sad-role">ADMIN ANTENNE</span>
                      <span className="sad-date">{formatDate(u.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}