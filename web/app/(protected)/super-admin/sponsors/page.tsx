//web/app/(protected)/super-admin/sponsors/page.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '../../../../components/layout/AppShell';
import { api, type Sponsor } from '../../../../lib/api-client';

// ── Types étendus ─────────────────────────────────────────────────────────────
type SponsorTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'STANDARD';

interface SponsorExtended extends Sponsor {
  logoUrl?: string | null;
  tier?: SponsorTier;
}

type SponsorPayload = {
  name: string;
  websiteUrl?: string;
  contactEmail?: string;
  isActive: boolean;
  logoUrl?: string;
  tier?: SponsorTier;
};

// ── Logo placeholder SVG ──────────────────────────────────────────────────────
function LogoPlaceholder({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const hue = name.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} rx={size * 0.22} fill={`hsl(${hue},55%,92%)`} />
      <text
        x="50%" y="54%" dominantBaseline="middle" textAnchor="middle"
        fill={`hsl(${hue},55%,38%)`} fontSize={size * 0.38}
        fontFamily="DM Sans, sans-serif" fontWeight="800"
      >
        {initials || '?'}
      </text>
    </svg>
  );
}

// ── Logo uploader ─────────────────────────────────────────────────────────────
function LogoUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 88, height: 88, borderRadius: 18,
          background: value ? 'transparent' : '#FEF2F2',
          border: `2px dashed ${value ? 'transparent' : '#FECACA'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden', position: 'relative',
          transition: 'all .2s',
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <svg width="28" height="28" fill="none" stroke="#DC2626" strokeWidth="1.8" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        )}
        {value && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity .2s',
          }} className="logo-hover-overlay">
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </div>
        )}
      </div>
      <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, textAlign: 'center' }}>
        {value ? 'Cliquer pour changer' : 'Uploader un logo'}
      </span>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function SponsorModal({
  sponsor,
  onClose,
  onSuccess,
}: {
  sponsor?: SponsorExtended | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(sponsor?.name ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(sponsor?.websiteUrl ?? '');
  const [contactEmail, setContactEmail] = useState(sponsor?.contactEmail ?? '');
  const [logoUrl, setLogoUrl] = useState(sponsor?.logoUrl ?? '');
  const [tier, setTier] = useState<SponsorTier>(sponsor?.tier ?? 'STANDARD');
  const [isActive, setIsActive] = useState(sponsor ? sponsor.isActive : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: SponsorPayload = {
        name,
        websiteUrl: websiteUrl || undefined,
        contactEmail: contactEmail || undefined,
        logoUrl: logoUrl || undefined,
        tier,
        isActive,
      };
      if (sponsor) {
        await api.updateSponsor(sponsor.id, payload as Partial<Sponsor>);
      } else {
        await api.createSponsor(payload as Omit<Sponsor, 'id'>);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!sponsor || !confirm('Supprimer ce partenaire ?')) return;
    setSaving(true);
    try {
      await api.deleteSponsor(sponsor.id);
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur suppression');
      setSaving(false);
    }
  }

  return (
    <div className="sas-modal-overlay" onClick={onClose}>
      <div className="sas-modal" onClick={(e) => e.stopPropagation()}>
        {/* Hero */}
        <div className="sas-modal-hero">
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
              {sponsor ? 'Modifier le partenaire' : 'Nouveau partenaire'}
            </p>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, color: 'white', lineHeight: 1.2 }}>
              {name || 'Sans titre'}
            </h2>
          </div>
          <button className="sas-modal-close" onClick={onClose}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sas-modal-body">
          {error && (
            <div style={{ marginBottom: '1rem', padding: '0.8rem', background: '#FEF2F2', color: '#B91C1C', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {/* Logo + Nom */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <LogoUploader value={logoUrl ?? ''} onChange={setLogoUrl} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div className="sas-field">
                <label>Nom de l&apos;organisation <span>*</span></label>
                <input
                  className="sas-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Ex: TotalEnergies, OCP Group…"
                />
              </div>
              <div className="sas-field">
                <label>Niveau de partenariat</label>
                <select
                  className="sas-input"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as SponsorTier)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="PLATINUM">⭐ Platine</option>
                  <option value="GOLD">🥇 Or</option>
                  <option value="SILVER">🥈 Argent</option>
                  <option value="STANDARD">📌 Standard</option>
                </select>
              </div>
            </div>
          </div>

          <div className="sas-grid-2">
            <div className="sas-field">
              <label>Site Web</label>
              <input
                type="url"
                className="sas-input"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="sas-field">
              <label>Email de contact</label>
              <input
                type="email"
                className="sas-input"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@entreprise.com"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1rem', background: '#F9FAFB', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid #E5E7EB' }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: 17, height: 17, accentColor: '#DC2626' }}
            />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151' }}>
              Partenaire actif — visible sur la plateforme
            </span>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
            {sponsor ? (
              <button type="button" className="sas-btn-del" onClick={handleDelete} disabled={saving}>
                Supprimer
              </button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="sas-btn-cancel" onClick={onClose} disabled={saving}>
                Annuler
              </button>
              <button type="submit" className="sas-btn-submit" disabled={saving}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tier badge ────────────────────────────────────────────────────────────────
const TIER_CONFIG: Record<SponsorTier, { label: string; color: string; bg: string; border: string }> = {
  PLATINUM: { label: '⭐ Platine', color: '#4C1D95', bg: '#EDE9FE', border: '#C4B5FD' },
  GOLD:     { label: '🥇 Or',      color: '#92400E', bg: '#FEF3C7', border: '#FCD34D' },
  SILVER:   { label: '🥈 Argent',  color: '#374151', bg: '#F3F4F6', border: '#D1D5DB' },
  STANDARD: { label: '📌 Standard', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
};

function TierBadge({ tier }: { tier?: SponsorTier }) {
  const cfg = TIER_CONFIG[tier ?? 'STANDARD'];
  return (
    <span style={{
      padding: '0.15rem 0.55rem', borderRadius: 99, fontSize: '0.6rem',
      fontWeight: 800, color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

// ── Sponsor Card ──────────────────────────────────────────────────────────────
function SponsorCard({ sponsor, onClick }: { sponsor: SponsorExtended; onClick: () => void }) {
  return (
    <div className="sas-card" onClick={onClick}>
      <div className="sas-card-logo">
        {sponsor.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sponsor.logoUrl} alt={sponsor.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <LogoPlaceholder name={sponsor.name} size={52} />
        )}
      </div>
      <div className="sas-card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
          <p className="sas-card-name">{sponsor.name}</p>
          <span className={`sas-status ${sponsor.isActive ? 'active' : 'inactive'}`}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: sponsor.isActive ? '#059669' : '#9CA3AF', flexShrink: 0 }} />
            {sponsor.isActive ? 'Actif' : 'Inactif'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem', alignItems: 'center' }}>
          <TierBadge tier={sponsor.tier} />
          {sponsor.websiteUrl && (
            <a
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '0.68rem', color: '#3B82F6', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 10-5.656-5.656l-1.1 1.1" />
              </svg>
              Site web
            </a>
          )}
          {sponsor.contactEmail && (
            <span style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {sponsor.contactEmail}
            </span>
          )}
        </div>
      </div>
      <div className="sas-card-arrow">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SuperAdminSponsorsPage() {
  const [items, setItems] = useState<SponsorExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [modalState, setModalState] = useState<{ isOpen: boolean; sponsor?: SponsorExtended | null }>({ isOpen: false });

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

  const filtered = items.filter((s) =>
    filter === 'ALL' ? true : filter === 'ACTIVE' ? s.isActive : !s.isActive
  );
  const activeCount = items.filter((s) => s.isActive).length;

  return (
    <AppShell title="Partenaires & Sponsors">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');

        .sas-wrap { font-family:'DM Sans',sans-serif; padding:clamp(1.25rem,3vw,2rem); max-width:1100px; margin:0 auto; animation:sasin .4s cubic-bezier(.22,1,.36,1) forwards; }

        .sas-title { font-family:'Cormorant Garamond',serif; font-size:clamp(1.6rem,4vw,2.2rem); font-weight:700; color:#111827; margin:0 0 .25rem; }
        .sas-title span { color:#DC2626; }
        .sas-subtitle { font-size:.82rem; color:#9CA3AF; font-weight:600; margin:0 0 1.5rem; }

        .sas-stats { display:flex; gap:.75rem; margin-bottom:1.5rem; flex-wrap:wrap; }
        .sas-stat { background:white; border:1px solid #F3F4F6; border-radius:14px; padding:.6rem 1rem; display:flex; align-items:center; gap:.5rem; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .sas-stat-num { font-family:'DM Mono',monospace; font-size:1.2rem; font-weight:700; color:#111827; line-height:1; }
        .sas-stat-lbl { font-size:.68rem; font-weight:700; color:#9CA3AF; text-transform:uppercase; letter-spacing:.06em; }

        .sas-toolbar { display:flex; justify-content:space-between; align-items:center; gap:.75rem; margin-bottom:1rem; flex-wrap:wrap; }
        .sas-filters { display:flex; gap:.35rem; background:#F3F4F6; padding:.3rem; border-radius:12px; }
        .sas-filter-btn { border:none; background:transparent; padding:.35rem .85rem; border-radius:9px; font-size:.75rem; font-weight:700; color:#6B7280; cursor:pointer; transition:all .15s; white-space:nowrap; }
        .sas-filter-btn.active { background:white; color:#DC2626; box-shadow:0 1px 4px rgba(0,0,0,.1); }
        .sas-new-btn { background:linear-gradient(135deg,#991B1B,#DC2626); color:white; border:none; padding:.6rem 1.2rem; border-radius:12px; font-weight:800; font-size:.82rem; cursor:pointer; display:inline-flex; align-items:center; gap:.4rem; box-shadow:0 4px 14px rgba(220,38,38,.28); white-space:nowrap; transition:transform .15s,box-shadow .15s; }
        .sas-new-btn:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(220,38,38,.32); }

        .sas-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:.85rem; }

        .sas-card { background:white; border:1px solid #F3F4F6; border-radius:18px; padding:1.1rem 1.1rem 1rem; display:flex; align-items:flex-start; gap:.9rem; cursor:pointer; transition:all .18s cubic-bezier(.22,1,.36,1); position:relative; }
        .sas-card:hover { border-color:rgba(220,38,38,.25); box-shadow:0 6px 24px rgba(220,38,38,.08); transform:translateY(-2px); }
        .sas-card-logo { width:56px; height:56px; flex-shrink:0; border-radius:14px; overflow:hidden; background:#F9FAFB; border:1px solid #F3F4F6; display:flex; align-items:center; justify-content:center; }
        .sas-card-body { flex:1; min-width:0; }
        .sas-card-name { margin:0; font-size:.92rem; font-weight:800; color:#111827; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sas-card-arrow { color:#D1D5DB; flex-shrink:0; margin-top:4px; transition:color .15s; }
        .sas-card:hover .sas-card-arrow { color:#DC2626; }

        .sas-status { padding:.2rem .55rem; border-radius:99px; font-size:.6rem; font-weight:800; display:inline-flex; align-items:center; gap:.25rem; flex-shrink:0; }
        .sas-status.active { background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; }
        .sas-status.inactive { background:#F3F4F6; color:#9CA3AF; border:1px solid #E5E7EB; }

        .sas-empty { text-align:center; padding:4rem 2rem; color:#9CA3AF; }
        .sas-empty svg { margin-bottom:1rem; opacity:.4; }
        .sas-empty p { font-size:.9rem; font-weight:600; margin:0; }

        .sas-modal-overlay { position:fixed; inset:0; z-index:100; background:rgba(15,23,42,.55); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadein .2s; }
        .sas-modal { background:white; width:100%; max-width:520px; border-radius:22px; display:flex; flex-direction:column; overflow:hidden; max-height:90vh; box-shadow:0 24px 64px rgba(0,0,0,.18); }
        .sas-modal-hero { background:linear-gradient(135deg,#991B1B,#DC2626); padding:1.25rem 1.5rem; display:flex; align-items:center; gap:1rem; flex-shrink:0; }
        .sas-modal-body { padding:1.5rem; overflow-y:auto; }
        .sas-modal-close { background:rgba(255,255,255,.15); border:1px solid rgba(255,255,255,.2); width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:white; flex-shrink:0; }
        .sas-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
        .sas-field { display:flex; flex-direction:column; gap:.3rem; }
        .sas-field label { font-size:.65rem; font-weight:900; text-transform:uppercase; letter-spacing:.07em; color:#B91C1C; }
        .sas-field label span { color:#D1D5DB; }
        .sas-input { height:42px; border-radius:10px; border:1.5px solid #E5E7EB; padding:0 .9rem; font-family:'DM Sans'; font-size:.85rem; font-weight:600; outline:none; color:#111827; background:white; transition:border-color .15s,box-shadow .15s; width:100%; box-sizing:border-box; }
        .sas-input:focus { border-color:#DC2626; box-shadow:0 0 0 3px rgba(220,38,38,.1); }
        .sas-btn-submit { background:linear-gradient(135deg,#991B1B,#DC2626); color:white; border:none; padding:0 1.2rem; height:42px; border-radius:10px; font-weight:800; font-size:.85rem; cursor:pointer; }
        .sas-btn-cancel { background:white; border:1.5px solid #E5E7EB; color:#4B5563; padding:0 1.2rem; height:42px; border-radius:10px; font-weight:700; font-size:.85rem; cursor:pointer; }
        .sas-btn-del { background:#FEF2F2; border:1.5px solid #FECACA; color:#DC2626; padding:0 1.2rem; height:42px; border-radius:10px; font-weight:700; font-size:.85rem; cursor:pointer; }
        .sas-card:hover .logo-hover-overlay { opacity:1 !important; }

        @media(max-width:500px) { .sas-grid-2{grid-template-columns:1fr} .sas-stats{gap:.5rem} }
        @keyframes sasin { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadein { from{opacity:0} to{opacity:1} }
      `}</style>

      <div className="sas-wrap">
        <h1 className="sas-title">Réseau de <span>Partenaires</span></h1>
        <p className="sas-subtitle">Gérez vos mécènes, sponsors et partenaires institutionnels</p>

        {!loading && items.length > 0 && (
          <div className="sas-stats">
            <div className="sas-stat">
              <div>
                <div className="sas-stat-num">{items.length}</div>
                <div className="sas-stat-lbl">Total</div>
              </div>
            </div>
            <div className="sas-stat">
              <div>
                <div className="sas-stat-num" style={{ color: '#059669' }}>{activeCount}</div>
                <div className="sas-stat-lbl">Actifs</div>
              </div>
            </div>
            <div className="sas-stat">
              <div>
                <div className="sas-stat-num" style={{ color: '#9CA3AF' }}>{items.length - activeCount}</div>
                <div className="sas-stat-lbl">Inactifs</div>
              </div>
            </div>
          </div>
        )}

        <div className="sas-toolbar">
          <div className="sas-filters">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => (
              <button
                key={f}
                className={`sas-filter-btn ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'ALL' ? 'Tous' : f === 'ACTIVE' ? 'Actifs' : 'Inactifs'}
              </button>
            ))}
          </div>
          <button className="sas-new-btn" onClick={() => setModalState({ isOpen: true })}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Ajouter
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#FEF2F2', color: '#B91C1C', borderRadius: '12px', fontSize: '.85rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#9CA3AF', fontSize: '.9rem', fontWeight: 600 }}>
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="sas-empty">
            <svg width="48" height="48" fill="none" stroke="#DC2626" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
            <p>Aucun partenaire{filter !== 'ALL' ? ' dans cette catégorie' : ''}.</p>
          </div>
        ) : (
          <div className="sas-grid">
            {filtered.map((s) => (
              <SponsorCard
                key={s.id}
                sponsor={s}
                onClick={() => setModalState({ isOpen: true, sponsor: s })}
              />
            ))}
          </div>
        )}
      </div>

      {modalState.isOpen && (
        <SponsorModal
          sponsor={modalState.sponsor}
          onClose={() => setModalState({ isOpen: false })}
          onSuccess={() => { setModalState({ isOpen: false }); void load(); }}
        />
      )}
    </AppShell>
  );
}