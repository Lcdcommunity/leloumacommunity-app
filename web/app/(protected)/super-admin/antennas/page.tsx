/////// web/app/(protected)/super-admin/antennas/page.tsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../../components/layout/AppShell';
import { api } from '../../../../lib/api-client';
import type { Antenna } from '../../../../types/antenna';
import { formatDate } from '../../../../lib/format';

/* ══════════════════════════════════════════════════════ STATUS BADGE */
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.28rem',
      fontSize: '.68rem', fontWeight: 900,
      color:    active ? '#059669' : '#DC2626',
      background: active ? '#ECFDF5' : '#FEF2F2',
      border: `1px solid ${active ? '#A7F3D0' : '#FECACA'}`,
      borderRadius: 99, padding: '.2rem .6rem', whiteSpace: 'nowrap',
      letterSpacing: '.04em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: active ? '#059669' : '#DC2626', flexShrink: 0 }} />
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ ANTENNA ICON */
function AntennaIcon({ name, code }: { name: string; code: string }) {
  const lowerName = name.toLowerCase();

  // 🌍 LOGIQUE CHIRURGICALE DES DRAPEAUX
  if (lowerName.includes('guinée')) return <div className="sa-icon-flag">🇬🇳</div>;
  if (lowerName.includes('sénégal')) return <div className="sa-icon-flag">🇸🇳</div>;
  if (lowerName.includes('france')) return <div className="sa-icon-flag">🇫🇷</div>;

  // ✈️ LOGIQUE DES CONTINENTS (DÉGRADÉ BLEU)
  const continents = ['amerique', 'europe', 'afrique', 'asie', 'océanie', 'monde'];
  const isContinent = continents.some(c => lowerName.includes(c));

  return (
    <div className={`sa-icon-box ${isContinent ? 'is-continent' : ''}`}>
      {code.slice(0, 2).toUpperCase()}
    </div>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function SuperAdminAntennasPage() {
  const router = useRouter();
  const [items,   setItems]   = useState<Antenna[]>([]);
  const [q,       setQ]       = useState('');
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async (qVal?: string) => {
    setLoading(true); setError(null);
    try {
      const res = await api.listAntennas({ q: qVal ?? q, page: 1, pageSize: 50 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement antennes');
    } finally { setLoading(false); }
  }, [q]);

  useEffect(() => { void load(''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount   = items.filter(a => a.isActive).length;
  const inactiveCount = items.length - activeCount;

  return (
    <AppShell title="Super-Admin — Antennes">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        
        .sa-wrap {
          font-family: 'DM Sans', sans-serif;
          padding: clamp(1.25rem, 3vw, 2rem);
          max-width: 1200px; margin: 0 auto;
          box-sizing: border-box; width: 100%;
        }

        .sa-header {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
          opacity: 0; transform: translateY(10px); animation: sain .5s .04s cubic-bezier(.22,1,.36,1) forwards;
        }
        .sa-header-text { display: flex; flex-direction: column; }
        .sa-eyebrow { font-size: .67rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #2563EB; margin-bottom: .35rem; display: flex; align-items: center; gap: .4rem; }
        .sa-dot { width: 6px; height: 6px; background: #3B82F6; border-radius: 50%; animation: sapulse 2s ease-in-out infinite; }
        @keyframes sapulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        .sa-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; color: #111827; letter-spacing: -.02em; line-height: 1.15; margin: 0; }
        .sa-title span { background: linear-gradient(135deg,#1D4ED8,#3B82F6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

        /* 🚀 BOUTON CRÉATION ULTRA-VISIBLE */
        .sa-new-btn { 
          height: 46px; padding: 0 1.5rem; border-radius: 14px; 
          background: #1E3A8A; /* Bleu nuit profond */
          color: white; border: 1px solid rgba(255,255,255,0.1); 
          cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: .85rem; font-weight: 800; 
          display: flex; align-items: center; gap: .5rem; 
          box-shadow: 0 10px 25px rgba(30,58,138,0.3); transition: all .2s; 
          text-decoration: none; white-space: nowrap; 
        }
        .sa-new-btn:hover { transform: translateY(-2px); background: #111827; box-shadow: 0 15px 30px rgba(0,0,0,0.2); }

        .sa-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.7rem; margin-bottom: 1.4rem;
          opacity: 0; transform: translateY(10px); animation: sain .5s .08s cubic-bezier(.22,1,.36,1) forwards;
        }
        .sa-stat { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: rgba(253,253,255,.93); border-radius: 14px; border: 1px solid rgba(0,0,0,0.05); border-top: 3px solid; box-shadow: 0 2px 8px rgba(0,0,0,0.04); padding: .8rem .5rem; }
        .sa-stat-val { font-family: 'Cormorant Garamond', serif; font-size: 1.7rem; font-weight: 700; line-height: 1; margin-bottom: .3rem; }
        .sa-stat-lbl { font-size: .65rem; font-weight: 800; color: #6B7280; text-transform: uppercase; letter-spacing: .05em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

        .sa-panel { background: rgba(253,253,255,.94); backdrop-filter: blur(14px); border-radius: 22px; border: 1px solid rgba(0,0,0,.05); box-shadow: 0 2px 18px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,.9) inset; overflow: hidden; opacity: 0; transform: translateY(10px); animation: sain .5s .13s cubic-bezier(.22,1,.36,1) forwards; }
        .sa-panel-head { padding: 1rem 1.4rem; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: space-between; gap: .75rem; flex-wrap: wrap; }
        .sa-panel-titlerow { display: flex; align-items: center; gap: .55rem; }
        .sa-panel-ico { width: 28px; height: 28px; border-radius: 8px; background: #1E3A8A; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: white; }
        .sa-panel-title { font-size: .75rem; font-weight: 900; letter-spacing: .09em; text-transform: uppercase; color: #1F2937; }
        .sa-count-chip { font-size: .68rem; font-weight: 900; padding: .2rem .6rem; border-radius: 99px; background: #F3F4F6; color: #111827; border: 1px solid #E5E7EB; }

        .sa-toolbar { padding: .9rem 1.4rem; border-bottom: 1px solid #F3F4F6; width: 100%; box-sizing: border-box; }
        .sa-search-row { display: flex; align-items: center; gap: .65rem; width: 100%; flex-wrap: nowrap; }
        .sa-sw { position: relative; flex: 1 1 auto; min-width: 0; }
        .sa-si { position: absolute; left: .8rem; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .sa-search { width: 100%; height: 42px; border-radius: 11px; border: 1px solid #E5E7EB; background: rgba(255,255,255,.9); padding: 0 .9rem 0 2.4rem; font-family: 'DM Sans', sans-serif; font-size: .84rem; font-weight: 500; color: #111827; outline: none; transition: all .2s; box-sizing: border-box; }
        .sa-search:focus { border-color: #1E3A8A; box-shadow: 0 0 0 3px rgba(30,58,138,0.05); background: white; }
        
        .sa-search-btn { flex: 0 0 auto; height: 42px; padding: 0 1.2rem; border-radius: 11px; background: #111827; border: none; color: white; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 800; display: flex; align-items: center; gap: .4rem; transition: all .18s; white-space: nowrap; }

        /* 🎨 ICONS & DRAPEAUX */
        .sa-icon-flag { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: #F8FAFC; border: 1px solid #E2E8F0; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.04); }
        .sa-icon-box { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-family: 'Cormorant Garamond', serif; font-size: .85rem; font-weight: 700; flex-shrink: 0; background: #64748B; box-shadow: 0 3px 8px rgba(0,0,0,0.1); }
        .sa-icon-box.is-continent { background: linear-gradient(135deg, #1D4ED8, #3B82F6); box-shadow: 0 3px 10px rgba(29,78,216,0.3); }

        .sa-tw { overflow-x: auto; }
        .sa-table { width: 100%; border-collapse: collapse; min-width: 520px; }
        .sa-table th { padding: .8rem 1.2rem; font-size: .65rem; font-weight: 900; letter-spacing: .11em; text-transform: uppercase; color: #9CA3AF; text-align: left; white-space: nowrap; border-bottom: 1px solid #F3F4F6; }
        .sa-table tbody tr { border-bottom: 1px solid #F9FAFB; transition: background .15s; cursor: pointer; }
        .sa-table tbody tr:hover { background: rgba(0,0,0,0.02); }
        .sa-table td { padding: .9rem 1.2rem; font-size: .82rem; color: #111827; vertical-align: middle; }

        .sa-row-arrow { opacity: 0; transform: translateX(-4px); transition: all .2s; color: #1E3A8A; }
        .sa-table tr:hover .sa-row-arrow { opacity: 1; transform: translateX(0); }

        .sa-code { font-family: 'DM Mono', monospace; font-size: .82rem; font-weight: 700; color: #111827; background: #F3F4F6; padding: .18rem .5rem; border-radius: 6px; white-space: nowrap; }
        .sa-name { font-weight: 800; font-size: .88rem; color: #0F172A; }
        .sa-sub { font-size: .72rem; color: #6B7280; font-weight: 600; margin-top: 2px; }
        .sa-date { font-size: .75rem; font-weight: 700; color: #6B7280; }

        .sa-mob { display: none; flex-direction: column; }
        @media (max-width: 680px) { .sa-tw { display: none; } .sa-mob { display: flex; } }
        .sa-mc { padding: 1rem 1.2rem; border-bottom: 1px solid #F3F4F6; animation: sain .4s cubic-bezier(.22,1,.36,1) both; cursor: pointer; }

        .sa-loader { display: flex; align-items: center; justify-content: center; padding: 3rem; gap: .75rem; color: #6B7280; font-size: .84rem; font-weight: 700; }
        .sa-ring { width: 24px; height: 24px; border: 2.5px solid rgba(0,0,0,0.1); border-top-color: #1E3A8A; border-radius: 50%; animation: saspin .8s linear infinite; }
        .sa-error { display: flex; align-items: center; gap: .65rem; padding: .9rem 1.2rem; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; color: #B91C1C; font-size: .82rem; font-weight: 800; margin: 1rem; }
        .sa-empty { display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; gap: .7rem; color: #9CA3AF; }

        @keyframes sain { to { opacity: 1; transform: translateY(0); } }
        @keyframes saspin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="sa-wrap">

        <div className="sa-header">
          <div className="sa-header-text">
            <div className="sa-eyebrow"><div className="sa-dot" />Super Admin</div>
            <h1 className="sa-title">Gestion des <span>antennes</span></h1>
          </div>
          <Link href="/super-admin/antennas/new" className="sa-new-btn">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Nouvelle antenne</span>
          </Link>
        </div>

        <div className="sa-stats">
          {([
            { label: 'Total antennes', value: items.length,  color: '#374151' },
            { label: 'Actives',         value: activeCount,   color: '#059669' },
            { label: 'Inactives',       value: inactiveCount, color: '#DC2626' },
          ] as const).map(s => (
            <div key={s.label} className="sa-stat" style={{ borderTopColor: s.color }} title={s.label}>
              <div className="sa-stat-val" style={{ color: s.color }}>{s.value}</div>
              <div className="sa-stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="sa-panel">
          <div className="sa-panel-head">
            <div className="sa-panel-titlerow">
              <div className="sa-panel-ico">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <span className="sa-panel-title">Antennes enregistrées</span>
              {items.length > 0 && <span className="sa-count-chip">{items.length}</span>}
            </div>
          </div>

          <div className="sa-toolbar">
            <div className="sa-search-row">
              <div className="sa-sw">
                <span className="sa-si">
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                  </svg>
                </span>
                <input
                  className="sa-search"
                  type="text"
                  placeholder="Rechercher par nom, code..."
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void load(q)}
                />
              </div>
              <button className="sa-search-btn" disabled={loading} onClick={() => void load(q)}>
                Rechercher
              </button>
            </div>
          </div>

          {/* 💉 FIX LINT : Affichage de l'erreur */}
          {error && (
            <div className="sa-error">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
              </svg>
              {error}
            </div>
          )}

          {loading ? (
            <div className="sa-loader"><div className="sa-ring" />Chargement...</div>
          ) : !error && items.length === 0 ? (
            <div className="sa-empty">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#E5E7EB" strokeWidth="1.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              <p>Aucune antenne trouvée</p>
            </div>
          ) : !error ? (
            <>
              <div className="sa-tw">
                <table className="sa-table">
                  <thead>
                    <tr>
                      <th>Antenne</th>
                      <th>Code</th>
                      <th>Localisation</th>
                      <th>Devise</th>
                      <th>Statut</th>
                      <th>Créé le</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a, i) => (
                      <tr key={a.id} style={{ animationDelay: `${i * 0.04}s` }} onClick={() => router.push(`/super-admin/antennas/${a.id}`)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                            <AntennaIcon name={a.name} code={a.code} />
                            <div>
                              <div className="sa-name">{a.name}</div>
                              <div className="sa-sub">ID : {a.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="sa-code">{a.code}</span></td>
                        <td>{a.city ?? '—'}</td>
                        <td>{a.defaultCurrency ?? 'EUR'}</td>
                        <td><StatusBadge active={a.isActive} /></td>
                        <td><span className="sa-date">{formatDate(a.createdAt)}</span></td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="sa-row-arrow">➔</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sa-mob">
                {items.map((a, i) => (
                  <div key={a.id} className="sa-mc" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => router.push(`/super-admin/antennas/${a.id}`)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                        <AntennaIcon name={a.name} code={a.code} />
                        <div>
                          <div className="sa-name">{a.name}</div>
                          <div className="sa-sub">{a.city ?? 'Non définie'}</div>
                        </div>
                      </div>
                      <StatusBadge active={a.isActive} />
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