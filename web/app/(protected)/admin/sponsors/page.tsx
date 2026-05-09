// web/app/(protected)/admin/sponsors/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type Sponsor } from '../../../../lib/api-client';

type SponsorTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'STANDARD';
interface SponsorExtended extends Sponsor {
  logoUrl?: string | null;
  tier?: SponsorTier;
}

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; accent: string }> = {
  PLATINUM: { label: '⭐ Platine', color: '#4C1D95', bg: '#EDE9FE', border: '#C4B5FD', accent: '#7C3AED' },
  GOLD:     { label: '🥇 Or',      color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', accent: '#D97706' },
  SILVER:   { label: '🥈 Argent',  color: '#374151', bg: '#F3F4F6', border: '#D1D5DB', accent: '#6B7280' },
  STANDARD: { label: '📌 Standard',color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB' },
};

function LogoPlaceholder({ name, size = 60 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const hue = name.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} rx={size * 0.2} fill={`hsl(${hue},55%,92%)`} />
      <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fill={`hsl(${hue},55%,38%)`} fontSize={size * 0.38}
        fontFamily="DM Sans, sans-serif" fontWeight="800">
        {initials || '?'}
      </text>
    </svg>
  );
}

function SponsorDetailModal({ sponsor, onClose }: { sponsor: SponsorExtended; onClose: () => void }) {
  const tier = TIER_CONFIG[sponsor.tier ?? 'STANDARD'];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'sp-fadein .2s' }}
      onClick={onClose}>
      <div style={{ background: 'white', width: '100%', maxWidth: 460, borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.18)', animation: 'sp-scalein .25s cubic-bezier(.22,1,.36,1)' }}
        onClick={e => e.stopPropagation()}>

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${tier.accent}22, ${tier.accent}08)`, borderBottom: `1px solid ${tier.border}`, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, overflow: 'hidden', background: 'white', border: `2px solid ${tier.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${tier.accent}22` }}>
            {sponsor.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
              : <LogoPlaceholder name={sponsor.name} size={60} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.35rem', flexWrap: 'wrap' }}>
              <span style={{ padding: '.18rem .6rem', borderRadius: 99, fontSize: '.62rem', fontWeight: 800, color: tier.color, background: tier.bg, border: `1px solid ${tier.border}` }}>{tier.label}</span>
              <span style={{ padding: '.18rem .55rem', borderRadius: 99, fontSize: '.6rem', fontWeight: 800, ...(sponsor.isActive ? { color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0' } : { color: '#9CA3AF', background: '#F3F4F6', border: '1px solid #E5E7EB' }) }}>
                {sponsor.isActive ? '● Actif' : '● Inactif'}
              </span>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sponsor.name}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${tier.border}`, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sponsor.websiteUrl && (
            <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', textDecoration: 'none', transition: 'all .18s' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" stroke="#2563EB" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.1 1.1" /></svg>
              </div>
              <div>
                <div style={{ fontSize: '.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Site web</div>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#2563EB' }}>{sponsor.websiteUrl}</div>
              </div>
              <svg width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 'auto', flexShrink: 0 }}><path strokeLinecap="round" d="M9 5l7 7-7 7" /></svg>
            </a>
          )}
          {sponsor.contactEmail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <div style={{ fontSize: '.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Email de contact</div>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#111827' }}>{sponsor.contactEmail}</div>
              </div>
            </div>
          )}
          {!sponsor.websiteUrl && !sponsor.contactEmail && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#94A3B8', fontSize: '.82rem' }}>Aucune information de contact disponible.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSponsorsPage() {
  const [items, setItems] = useState<SponsorExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [selected, setSelected] = useState<SponsorExtended | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listSponsors();
      setItems(res.items as SponsorExtended[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = items.filter(s => {
    const statusOk = filter === 'ALL' ? true : filter === 'ACTIVE' ? s.isActive : !s.isActive;
    const tierOk   = tierFilter === 'ALL' ? true : s.tier === tierFilter;
    return statusOk && tierOk;
  });

  const activeCount   = items.filter(s => s.isActive).length;
  const platinumCount = items.filter(s => s.tier === 'PLATINUM').length;

  // Tri par tier puis alphabétique
  const TIER_ORDER: Record<string, number> = { PLATINUM: 0, GOLD: 1, SILVER: 2, STANDARD: 3 };
  const sorted = [...filtered].sort((a, b) => (TIER_ORDER[a.tier ?? 'STANDARD'] - TIER_ORDER[b.tier ?? 'STANDARD']) || a.name.localeCompare(b.name));

  return (
    <AppShell title="Partenaires">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        @keyframes sp-fadein  { from{opacity:0} to{opacity:1} }
        @keyframes sp-scalein { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes sp-in      { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        .sp-wrap { font-family:'DM Sans',sans-serif; padding:clamp(1.25rem,3vw,2rem); max-width:1100px; margin:0 auto; }

        /* Header */
        .sp-header { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; opacity:0; animation:sp-in .45s .04s cubic-bezier(.22,1,.36,1) forwards; }
        .sp-eyebrow { font-size:.65rem; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:#2563EB; margin-bottom:.3rem; }
        .sp-title { font-family:'Cormorant Garamond',serif; font-size:clamp(1.4rem,4vw,2rem); font-weight:700; color:#111827; margin:0; }
        .sp-title span { color:#2563EB; }

        /* Stats */
        .sp-stats { display:flex; gap:.65rem; flex-wrap:wrap; margin-bottom:1.5rem; opacity:0; animation:sp-in .45s .07s cubic-bezier(.22,1,.36,1) forwards; }
        .sp-stat { background:white; border:1px solid #E2E8F0; border-radius:14px; padding:.65rem 1rem; display:flex; align-items:center; gap:.5rem; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .sp-stat-num { font-family:'DM Mono',monospace; font-size:1.2rem; font-weight:700; color:#111827; line-height:1; }
        .sp-stat-lbl { font-size:.65rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:.06em; }

        /* Toolbar */
        .sp-toolbar { display:flex; justify-content:space-between; align-items:center; gap:.75rem; margin-bottom:1.25rem; flex-wrap:wrap; opacity:0; animation:sp-in .45s .1s cubic-bezier(.22,1,.36,1) forwards; }
        .sp-filters { display:flex; gap:.3rem; background:#F3F4F6; padding:.28rem; border-radius:12px; }
        .sp-fbtn { border:none; background:transparent; padding:.32rem .8rem; border-radius:9px; font-size:.72rem; font-weight:700; color:#6B7280; cursor:pointer; transition:all .15s; white-space:nowrap; }
        .sp-fbtn.active { background:white; color:#2563EB; box-shadow:0 1px 4px rgba(0,0,0,.1); }
        .sp-tier-select { height:36px; border-radius:10px; border:1px solid #E2E8F0; padding:0 2rem 0 .75rem; font-size:.75rem; font-weight:700; color:#374151; outline:none; background:white url("data:image/svg+xml,%3Csvg width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E") no-repeat right .65rem center; appearance:none; cursor:pointer; }

        /* Grid */
        .sp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:.85rem; opacity:0; animation:sp-in .45s .13s cubic-bezier(.22,1,.36,1) forwards; }

        /* Card */
        .sp-card { background:white; border:1px solid #E2E8F0; border-radius:20px; overflow:hidden; cursor:pointer; transition:all .2s cubic-bezier(.22,1,.36,1); position:relative; display:flex; flex-direction:column; }
        .sp-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(37,99,235,.1); border-color:rgba(37,99,235,.25); }
        .sp-card.inactive { opacity:.6; }

        .sp-card-banner { height:7px; }

        .sp-card-top { padding:1.25rem 1.25rem .75rem; display:flex; gap:1rem; align-items:flex-start; }
        .sp-card-logo { width:64px; height:64px; border-radius:16px; overflow:hidden; background:#F8FAFC; border:1px solid #E2E8F0; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 2px 8px rgba(0,0,0,.06); }
        .sp-card-logo img { width:100%; height:100%; object-fit:contain; padding:8px; }
        .sp-card-info { flex:1; min-width:0; }
        .sp-card-name { font-family:'Cormorant Garamond',serif; font-size:1.15rem; font-weight:700; color:#111827; line-height:1.2; margin:0 0 .4rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sp-card-badges { display:flex; flex-wrap:wrap; gap:.3rem; }

        .sp-card-footer { padding:.75rem 1.25rem; border-top:1px solid #F1F5F9; display:flex; align-items:center; justify-content:space-between; background:#FAFAFA; }
        .sp-card-links { display:flex; gap:.5rem; align-items:center; }
        .sp-card-link { font-size:.68rem; font-weight:700; color:#2563EB; text-decoration:none; display:inline-flex; align-items:center; gap:.2rem; }
        .sp-card-link:hover { text-decoration:underline; }
        .sp-see-more { font-size:.68rem; font-weight:800; color:#94A3B8; display:flex; align-items:center; gap:.2rem; }
        .sp-card:hover .sp-see-more { color:#2563EB; }

        /* Badge */
        .sp-tier-badge { padding:.18rem .55rem; border-radius:99px; font-size:.6rem; font-weight:800; white-space:nowrap; }
        .sp-status-badge { padding:.18rem .5rem; border-radius:99px; font-size:.6rem; font-weight:800; white-space:nowrap; display:inline-flex; align-items:center; gap:.25rem; }

        /* Empty / Loader */
        .sp-empty { text-align:center; padding:4rem 2rem; color:#94A3B8; }
        .sp-loader { display:flex; align-items:center; justify-content:center; padding:3rem; gap:.65rem; color:#6B7280; font-size:.85rem; }
        .sp-ring { width:22px; height:22px; border:2.5px solid rgba(37,99,235,.1); border-top-color:#2563EB; border-radius:50%; animation:sp-ring .8s linear infinite; }
        @keyframes sp-ring { to{transform:rotate(360deg)} }

        /* Section header */
        .sp-section-head { display:flex; align-items:center; gap:.5rem; margin:1.5rem 0 .75rem; }
        .sp-section-label { font-size:.62rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:#94A3B8; }
        .sp-section-line { flex:1; height:1px; background:#E2E8F0; }

        @media(max-width:500px) {
          .sp-grid { grid-template-columns:1fr; }
          .sp-toolbar { flex-direction:column; align-items:flex-start; }
        }
      `}</style>

      <div className="sp-wrap">

        {/* Header */}
        <div className="sp-header">
          <div>
            <div className="sp-eyebrow">Admin antenne</div>
            <h1 className="sp-title">Partenaires & <span>Sponsors</span></h1>
          </div>
        </div>

        {/* Stats */}
        <div className="sp-stats">
          <div className="sp-stat">
            <div className="sp-stat-num">{items.length}</div>
            <div className="sp-stat-lbl">Total</div>
          </div>
          <div className="sp-stat">
            <div className="sp-stat-num" style={{ color: '#059669' }}>{activeCount}</div>
            <div className="sp-stat-lbl">Actifs</div>
          </div>
          {platinumCount > 0 && (
            <div className="sp-stat">
              <div className="sp-stat-num" style={{ color: '#7C3AED' }}>{platinumCount}</div>
              <div className="sp-stat-lbl">Platine</div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="sp-toolbar">
          <div className="sp-filters">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(f => (
              <button key={f} className={`sp-fbtn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'ALL' ? 'Tous' : f === 'ACTIVE' ? 'Actifs' : 'Inactifs'}
              </button>
            ))}
          </div>
          <select className="sp-tier-select" value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
            <option value="ALL">Tous les niveaux</option>
            <option value="PLATINUM">⭐ Platine</option>
            <option value="GOLD">🥇 Or</option>
            <option value="SILVER">🥈 Argent</option>
            <option value="STANDARD">📌 Standard</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="sp-loader"><div className="sp-ring" />Chargement des partenaires…</div>
        ) : error ? (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid #FECACA', fontWeight: 700 }}>{error}</div>
        ) : sorted.length === 0 ? (
          <div className="sp-empty">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#CBD5E1" strokeWidth="1.2" style={{ display: 'block', margin: '0 auto 1rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p style={{ fontWeight: 700, color: '#374151', marginBottom: '.35rem' }}>Aucun partenaire trouvé</p>
            <p style={{ fontSize: '.8rem' }}>Aucun partenaire ne correspond aux filtres sélectionnés.</p>
          </div>
        ) : (
          <div className="sp-grid">
            {sorted.map((s, i) => {
              const tier = TIER_CONFIG[s.tier ?? 'STANDARD'];
              const TIER_BANNER: Record<string, string> = {
                PLATINUM: 'linear-gradient(90deg,#7C3AED,#A78BFA)',
                GOLD:     'linear-gradient(90deg,#D97706,#FCD34D)',
                SILVER:   'linear-gradient(90deg,#6B7280,#D1D5DB)',
                STANDARD: 'linear-gradient(90deg,#2563EB,#93C5FD)',
              };
              return (
                <div
                  key={s.id}
                  className={`sp-card${!s.isActive ? ' inactive' : ''}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                  onClick={() => setSelected(s)}
                >
                  <div className="sp-card-banner" style={{ background: TIER_BANNER[s.tier ?? 'STANDARD'] }} />
                  <div className="sp-card-top">
                    <div className="sp-card-logo">
                      {s.logoUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={s.logoUrl} alt={s.name} />
                        : <LogoPlaceholder name={s.name} size={52} />}
                    </div>
                    <div className="sp-card-info">
                      <h3 className="sp-card-name" title={s.name}>{s.name}</h3>
                      <div className="sp-card-badges">
                        <span className="sp-tier-badge" style={{ color: tier.color, background: tier.bg, border: `1px solid ${tier.border}` }}>{tier.label}</span>
                        <span className="sp-status-badge" style={s.isActive ? { color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0' } : { color: '#9CA3AF', background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.isActive ? '#059669' : '#9CA3AF' }} />
                          {s.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="sp-card-footer">
                    <div className="sp-card-links">
                      {s.websiteUrl && (
                        <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="sp-card-link" onClick={e => e.stopPropagation()}>
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.1 1.1" /></svg>
                          Site web
                        </a>
                      )}
                      {s.contactEmail && (
                        <span style={{ fontSize: '.65rem', color: '#94A3B8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{s.contactEmail}</span>
                      )}
                      {!s.websiteUrl && !s.contactEmail && (
                        <span style={{ fontSize: '.65rem', color: '#CBD5E1', fontWeight: 600 }}>Aucun contact</span>
                      )}
                    </div>
                    <span className="sp-see-more">
                      Voir
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 5l7 7-7 7" /></svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && <SponsorDetailModal sponsor={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}