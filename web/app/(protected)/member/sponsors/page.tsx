// web/app/(protected)/member/sponsors/page.tsx
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
  PLATINUM: { label: '⭐ Platine',  color: '#4C1D95', bg: '#EDE9FE', border: '#C4B5FD', accent: '#7C3AED' },
  GOLD:     { label: '🥇 Or',       color: '#92400E', bg: '#FEF3C7', border: '#FCD34D', accent: '#D97706' },
  SILVER:   { label: '🥈 Argent',   color: '#374151', bg: '#F3F4F6', border: '#D1D5DB', accent: '#6B7280' },
  STANDARD: { label: '📌 Standard', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', accent: '#059669' },
};

const TIER_BANNER: Record<string, string> = {
  PLATINUM: 'linear-gradient(90deg,#7C3AED,#A78BFA)',
  GOLD:     'linear-gradient(90deg,#D97706,#FCD34D)',
  SILVER:   'linear-gradient(90deg,#6B7280,#D1D5DB)',
  STANDARD: 'linear-gradient(90deg,#059669,#34D399)',
};

const TIER_ORDER: Record<string, number> = { PLATINUM: 0, GOLD: 1, SILVER: 2, STANDARD: 3 };

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'ms-fadein .2s' }}
      onClick={onClose}>
      <div style={{ background: 'white', width: '100%', maxWidth: 460, borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.18)', animation: 'ms-scalein .25s cubic-bezier(.22,1,.36,1)' }}
        onClick={e => e.stopPropagation()}>

        {/* Banner */}
        <div style={{ height: 6, background: TIER_BANNER[sponsor.tier ?? 'STANDARD'] }} />

        {/* Hero */}
        <div style={{ background: `linear-gradient(135deg, ${tier.accent}15, ${tier.accent}05)`, borderBottom: `1px solid ${tier.border}`, padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ width: 76, height: 76, borderRadius: 20, overflow: 'hidden', background: 'white', border: `2px solid ${tier.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${tier.accent}22` }}>
            {sponsor.logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
              : <LogoPlaceholder name={sponsor.name} size={62} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem', flexWrap: 'wrap' }}>
              <span style={{ padding: '.18rem .6rem', borderRadius: 99, fontSize: '.62rem', fontWeight: 800, color: tier.color, background: tier.bg, border: `1px solid ${tier.border}` }}>{tier.label}</span>
              <span style={{ padding: '.18rem .55rem', borderRadius: 99, fontSize: '.6rem', fontWeight: 800, ...(sponsor.isActive ? { color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0' } : { color: '#9CA3AF', background: '#F3F4F6', border: '1px solid #E5E7EB' }) }}>
                {sponsor.isActive ? '● Partenaire actif' : '● Inactif'}
              </span>
            </div>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.45rem', fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.2 }}>{sponsor.name}</h2>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${tier.border}`, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sponsor.websiteUrl && (
            <a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1rem', background: '#F0FDF4', borderRadius: 12, border: '1px solid #A7F3D0', textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '.65rem', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Site officiel</div>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#065F46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sponsor.websiteUrl}</div>
              </div>
              <svg width="14" height="14" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 5l7 7-7 7" /></svg>
            </a>
          )}
          {sponsor.contactEmail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.9rem 1rem', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" fill="none" stroke="#059669" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <div style={{ fontSize: '.65rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Contact</div>
                <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#111827' }}>{sponsor.contactEmail}</div>
              </div>
            </div>
          )}
          {!sponsor.websiteUrl && !sponsor.contactEmail && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94A3B8', fontSize: '.82rem', fontWeight: 600 }}>
              Aucune information de contact disponible pour ce partenaire.
            </div>
          )}

          {/* Message de remerciement */}
          <div style={{ background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #A7F3D0', borderRadius: 12, padding: '.85rem 1rem', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🤝</span>
            <p style={{ margin: 0, fontSize: '.78rem', color: '#065F46', fontWeight: 600, lineHeight: 1.5 }}>
              Nous remercions <strong>{sponsor.name}</strong> pour son soutien à notre association.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MemberSponsorsPage() {
  const [items, setItems] = useState<SponsorExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [selected, setSelected] = useState<SponsorExtended | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listSponsors();
      // Membre ne voit que les actifs
      setItems((res.items as SponsorExtended[]).filter(s => s.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = tierFilter === 'ALL' ? items : items.filter(s => s.tier === tierFilter);
  const sorted = [...filtered].sort((a, b) => (TIER_ORDER[a.tier ?? 'STANDARD'] - TIER_ORDER[b.tier ?? 'STANDARD']) || a.name.localeCompare(b.name));

  // Grouper par tier pour un rendu en sections
  const sections: { tier: string; label: string; items: SponsorExtended[] }[] = [];
  if (tierFilter === 'ALL') {
    const tiers = ['PLATINUM', 'GOLD', 'SILVER', 'STANDARD'] as const;
    for (const t of tiers) {
      const group = sorted.filter(s => (s.tier ?? 'STANDARD') === t);
      if (group.length > 0) sections.push({ tier: t, label: TIER_CONFIG[t].label, items: group });
    }
  } else {
    sections.push({ tier: tierFilter, label: TIER_CONFIG[tierFilter]?.label ?? tierFilter, items: sorted });
  }

  return (
    <AppShell title="Partenaires">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        @keyframes ms-fadein  { from{opacity:0} to{opacity:1} }
        @keyframes ms-scalein { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes ms-in      { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        .ms-wrap { font-family:'DM Sans',sans-serif; padding:clamp(1.25rem,3vw,2rem); max-width:1100px; margin:0 auto; }

        /* Header */
        .ms-header { margin-bottom:1.75rem; opacity:0; animation:ms-in .45s .04s cubic-bezier(.22,1,.36,1) forwards; }
        .ms-eyebrow { font-size:.65rem; font-weight:900; letter-spacing:.12em; text-transform:uppercase; color:#059669; margin-bottom:.3rem; display:flex; align-items:center; gap:.4rem; }
        .ms-eyebrow-dot { width:6px; height:6px; background:#10B981; border-radius:50%; }
        .ms-title { font-family:'Cormorant Garamond',serif; font-size:clamp(1.4rem,4vw,2rem); font-weight:700; color:#111827; margin:0 0 .35rem; }
        .ms-title span { color:#059669; }
        .ms-subtitle { font-size:.82rem; color:#6B7280; margin:0; font-weight:500; }

        /* Hero banner */
        .ms-hero { background:linear-gradient(135deg,#ECFDF5,#F0FDF4); border:1px solid #A7F3D0; border-radius:20px; padding:1.5rem; margin-bottom:1.75rem; display:flex; align-items:center; gap:1rem; flex-wrap:wrap; opacity:0; animation:ms-in .45s .07s cubic-bezier(.22,1,.36,1) forwards; }
        .ms-hero-ico { width:52px; height:52px; border-radius:15px; background:linear-gradient(135deg,#059669,#10B981); display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 4px 14px rgba(5,150,105,.3); }
        .ms-hero-text h3 { fontFamily:'Cormorant Garamond',serif; font-size:1.1rem; font-weight:700; color:#065F46; margin:0 0 .2rem; }
        .ms-hero-text p { font-size:.8rem; color:#047857; margin:0; font-weight:500; }
        .ms-hero-count { margin-left:auto; }
        .ms-hero-num { font-family:'DM Mono',monospace; font-size:2rem; font-weight:700; color:#059669; line-height:1; }
        .ms-hero-lbl { font-size:.6rem; font-weight:800; color:#6EE7B7; text-transform:uppercase; letter-spacing:.06em; }

        /* Filter toolbar */
        .ms-toolbar { display:flex; align-items:center; gap:.5rem; margin-bottom:1.5rem; flex-wrap:wrap; opacity:0; animation:ms-in .45s .1s cubic-bezier(.22,1,.36,1) forwards; }
        .ms-filters { display:flex; gap:.3rem; background:#F0FDF4; padding:.28rem; border-radius:12px; border:1px solid #D1FAE5; }
        .ms-fbtn { border:none; background:transparent; padding:.32rem .8rem; border-radius:9px; font-size:.72rem; font-weight:700; color:#6B7280; cursor:pointer; transition:all .15s; white-space:nowrap; }
        .ms-fbtn.active { background:white; color:#059669; box-shadow:0 1px 4px rgba(5,150,105,.15); }

        /* Section */
        .ms-section { margin-bottom:2rem; opacity:0; animation:ms-in .45s .13s cubic-bezier(.22,1,.36,1) forwards; }
        .ms-section-head { display:flex; align-items:center; gap:.6rem; margin-bottom:.85rem; }
        .ms-section-label { font-size:.72rem; font-weight:900; text-transform:uppercase; letter-spacing:.1em; color:#374151; }
        .ms-section-count { font-size:.62rem; font-weight:800; color:#94A3B8; background:#F3F4F6; border-radius:99px; padding:.1rem .45rem; }
        .ms-section-line { flex:1; height:1px; background:#E2E8F0; }

        /* Grid */
        .ms-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:.85rem; }
        @media(max-width:500px) { .ms-grid { grid-template-columns:1fr; } }

        /* Card */
        .ms-card { background:white; border:1px solid #E2E8F0; border-radius:20px; overflow:hidden; cursor:pointer; transition:all .2s cubic-bezier(.22,1,.36,1); display:flex; flex-direction:column; }
        .ms-card:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(5,150,105,.1); border-color:rgba(5,150,105,.3); }
        .ms-card-banner { height:6px; }
        .ms-card-body { padding:1.25rem; flex:1; display:flex; flex-direction:column; gap:.75rem; }
        .ms-card-logo-wrap { width:100%; height:88px; border-radius:14px; overflow:hidden; background:#F8FAFC; border:1px solid #E2E8F0; display:flex; align-items:center; justify-content:center; }
        .ms-card-logo-wrap img { width:100%; height:100%; object-fit:contain; padding:12px; }
        .ms-card-name { font-family:'Cormorant Garamond',serif; font-size:1.05rem; font-weight:700; color:#111827; line-height:1.25; margin:0; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
        .ms-card-tier { display:inline-flex; }
        .ms-tier-badge { padding:.18rem .55rem; border-radius:99px; font-size:.6rem; font-weight:800; white-space:nowrap; }
        .ms-card-footer { padding:.7rem 1.25rem; border-top:1px solid #F0FDF4; background:#F9FEFB; display:flex; align-items:center; justify-content:space-between; }
        .ms-card-link { font-size:.68rem; font-weight:700; color:#059669; text-decoration:none; display:inline-flex; align-items:center; gap:.2rem; }
        .ms-card-link:hover { text-decoration:underline; }
        .ms-see-more { font-size:.68rem; font-weight:800; color:#94A3B8; display:flex; align-items:center; gap:.2rem; }
        .ms-card:hover .ms-see-more { color:#059669; }

        /* Empty / Loader */
        .ms-empty { text-align:center; padding:4rem 2rem; color:#94A3B8; }
        .ms-loader { display:flex; align-items:center; justify-content:center; padding:3rem; gap:.65rem; color:#6B7280; font-size:.85rem; }
        .ms-ring { width:22px; height:22px; border:2.5px solid rgba(5,150,105,.1); border-top-color:#059669; border-radius:50%; animation:ms-ring .8s linear infinite; }
        @keyframes ms-ring { to{transform:rotate(360deg)} }
      `}</style>

      <div className="ms-wrap">

        {/* Header */}
        <div className="ms-header">
          <div className="ms-eyebrow"><div className="ms-eyebrow-dot" />Espace membre</div>
          <h1 className="ms-title">Nos <span>Partenaires</span></h1>
          <p className="ms-subtitle">Découvrez les organisations qui soutiennent notre association.</p>
        </div>

        {/* Hero card */}
        {!loading && items.length > 0 && (
          <div className="ms-hero">
            <div className="ms-hero-ico">
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="ms-hero-text">
              <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', fontWeight: 700, color: '#065F46', margin: '0 0 .2rem' }}>Partenaires officiels</h3>
              <p style={{ fontSize: '.8rem', color: '#047857', margin: 0, fontWeight: 500 }}>Ces organisations accompagnent notre association dans sa mission.</p>
            </div>
            <div className="ms-hero-count" style={{ textAlign: 'center' }}>
              <div className="ms-hero-num">{items.length}</div>
              <div className="ms-hero-lbl">Partenaire{items.length > 1 ? 's' : ''}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {items.length > 0 && (
          <div className="ms-toolbar">
            <div className="ms-filters">
              <button className={`ms-fbtn${tierFilter === 'ALL' ? ' active' : ''}`} onClick={() => setTierFilter('ALL')}>Tous</button>
              {(['PLATINUM', 'GOLD', 'SILVER', 'STANDARD'] as const).filter(t => items.some(s => (s.tier ?? 'STANDARD') === t)).map(t => (
                <button key={t} className={`ms-fbtn${tierFilter === t ? ' active' : ''}`} onClick={() => setTierFilter(t)}>
                  {TIER_CONFIG[t].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="ms-loader"><div className="ms-ring" />Chargement…</div>
        ) : error ? (
          <div style={{ background: '#FEF2F2', color: '#B91C1C', padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid #FECACA', fontWeight: 700 }}>{error}</div>
        ) : items.length === 0 ? (
          <div className="ms-empty">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#CBD5E1" strokeWidth="1.2" style={{ display: 'block', margin: '0 auto 1rem' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p style={{ fontWeight: 700, color: '#374151', marginBottom: '.35rem' }}>Aucun partenaire pour le moment</p>
            <p style={{ fontSize: '.8rem' }}>Revenez plus tard pour découvrir nos partenaires.</p>
          </div>
        ) : (
          sections.map(section => (
            <div key={section.tier} className="ms-section">
              {sections.length > 1 && (
                <div className="ms-section-head">
                  <span className="ms-section-label">{section.label}</span>
                  <span className="ms-section-count">{section.items.length}</span>
                  <div className="ms-section-line" />
                </div>
              )}
              <div className="ms-grid">
                {section.items.map(s => {
                  const tier = TIER_CONFIG[s.tier ?? 'STANDARD'];
                  return (
                    <div key={s.id} className="ms-card" onClick={() => setSelected(s)}>
                      <div className="ms-card-banner" style={{ background: TIER_BANNER[s.tier ?? 'STANDARD'] }} />
                      <div className="ms-card-body">
                        {/* Logo rectangulaire bien cadré */}
                        <div className="ms-card-logo-wrap">
                          {s.logoUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={s.logoUrl} alt={s.name} />
                            : <LogoPlaceholder name={s.name} size={56} />}
                        </div>
                        <div>
                          <h3 className="ms-card-name">{s.name}</h3>
                        </div>
                        <div className="ms-card-tier">
                          <span className="ms-tier-badge" style={{ color: tier.color, background: tier.bg, border: `1px solid ${tier.border}` }}>{tier.label}</span>
                        </div>
                      </div>
                      <div className="ms-card-footer">
                        <div>
                          {s.websiteUrl ? (
                            <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="ms-card-link" onClick={e => e.stopPropagation()}>
                              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                              Site officiel
                            </a>
                          ) : (
                            <span style={{ fontSize: '.65rem', color: '#CBD5E1', fontWeight: 600 }}>Aucun lien</span>
                          )}
                        </div>
                        <span className="ms-see-more">
                          En savoir +
                          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && <SponsorDetailModal sponsor={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}