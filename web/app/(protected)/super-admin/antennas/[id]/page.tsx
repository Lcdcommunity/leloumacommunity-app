//web/app/(protected)/super-admin/antennas/[id]/page.tsx
// web/app/(protected)/super-admin/antennas/[id]/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AntennaForm } from '../../../../../components/super-admin/AntennaForm';
import { api } from '../../../../../lib/api-client';
import type { Antenna } from '../../../../../types/antenna';
import { formatDate } from '../../../../../lib/format';

/* ══════════════════════════════════════════════════════ STATUS BADGE */
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.32rem',
      fontSize: '.72rem', fontWeight: 900,
      color:    active ? '#059669' : '#DC2626',
      background: active ? '#ECFDF5' : '#FEF2F2',
      border: `1px solid ${active ? '#A7F3D0' : '#FECACA'}`,
      borderRadius: 99, padding: '.28rem .75rem', whiteSpace: 'nowrap',
      letterSpacing: '.04em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? '#059669' : '#DC2626', flexShrink: 0 }} />
      {active ? 'ACTIVE' : 'INACTIVE'}
    </span>
  );
}

/* ══════════════════════════════════════════════════════ INFO ROW */
function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', minWidth: 0 }}>
      <span style={{ fontSize: '.62rem', fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>
        {label}
      </span>
      <span style={{
        fontSize: '.88rem', fontWeight: 700,
        color: value ? '#111827' : '#D1D5DB',
        fontFamily: mono ? "'DM Mono',monospace" : "'DM Sans',sans-serif",
        wordBreak: 'break-word',
      }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ DELETE MODAL */
function DeleteModal({
  antenna, onConfirm, onCancel, busy,
}: { antenna: Antenna; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', backdropFilter: 'blur(4px)', zIndex: 100 }}
        onClick={onCancel}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 101, background: 'rgba(255,255,255,.97)', backdropFilter: 'blur(18px)',
        borderRadius: 20, padding: 'clamp(1.5rem,4vw,2rem)',
        width: 'min(440px,calc(100vw - 2rem))',
        border: '1px solid rgba(220,38,38,.15)',
        boxShadow: '0 24px 60px rgba(220,38,38,.12)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#FEF2F2', border: '1px solid #FECACA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem',
        }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#DC2626" strokeWidth="2">
            <path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '.4rem' }}>
          Supprimer cette antenne&nbsp;?
        </h2>
        <p style={{ fontSize: '.82rem', color: '#6B7280', textAlign: 'center', marginBottom: '1.5rem', fontWeight: 600, lineHeight: 1.55 }}>
          <strong style={{ color: '#111827' }}>{antenna.name}</strong> ({antenna.code}) sera supprim&eacute;e d&eacute;finitivement. Cette action est irr&eacute;versible.
        </p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel} disabled={busy}
            style={{ height: 42, padding: '0 1.2rem', borderRadius: 10, border: '1px solid rgba(220,38,38,.18)', background: 'rgba(249,250,251,.95)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm} disabled={busy}
            style={{ height: 42, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.35)', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}
          >
            {busy && <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'easpin .7s linear infinite' }} />}
            {busy ? 'Suppression...' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════ PAGE */
export default function AntennaDetailPage() {
  const router  = useRouter();
  const params  = useParams();
  const id      = params.id as string;

  const [antenna,         setAntenna]         = useState<Antenna | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [busy,            setBusy]            = useState(false);
  const [isEditing,       setIsEditing]       = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBusy,      setDeleteBusy]      = useState(false);
  const [saveSuccess,     setSaveSuccess]     = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const data = await api.getAntenna(id);
        setAntenna(data);
      } catch {
        setError("Impossible de charger les informations de l'antenne.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function handleDelete() {
    if (!antenna) return;
    setDeleteBusy(true);
    try {
      await api.deleteAntenna(antenna.id);
      router.replace('/super-admin/antennas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      setDeleteBusy(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <AppShell title="Détails de l'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@500;600&display=swap');
        .ea-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:980px;margin:0 auto}

        /* ── Back link ── */
        .ea-back{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:700;color:#DC2626;text-decoration:none;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:eain .45s .02s cubic-bezier(.22,1,.36,1) forwards;transition:color .15s}
        .ea-back:hover{color:#991B1B}

        /* ── Header ── */
        .ea-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:eain .5s .06s cubic-bezier(.22,1,.36,1) forwards}
        .ea-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ea-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:eapulse 2s ease-in-out infinite}
        @keyframes eapulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ea-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ea-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* ── Hero card ── */
        .ea-hero{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;padding:1.5rem;margin-bottom:1rem;opacity:0;transform:translateY(10px);animation:eain .5s .09s cubic-bezier(.22,1,.36,1) forwards;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap}
        .ea-hero-left{display:flex;align-items:center;gap:1rem;min-width:0}
        .ea-hero-ico{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 14px rgba(220,38,38,.30);font-family:'Cormorant Garamond',serif;font-size:1.3rem;font-weight:700;color:white}
        .ea-hero-name{font-family:'Cormorant Garamond',serif;font-size:clamp(1.3rem,3vw,1.7rem);font-weight:700;color:#0F172A;letter-spacing:-.01em;line-height:1.15;margin-bottom:.3rem}
        .ea-hero-meta{display:flex;align-items:center;gap:.55rem;flex-wrap:wrap}
        .ea-hero-code{font-family:'DM Mono',monospace;font-size:.82rem;font-weight:700;color:#374151;background:rgba(254,242,242,.8);border:1px solid rgba(220,38,38,.15);border-radius:7px;padding:.2rem .55rem}
        .ea-hero-currency{font-family:'DM Mono',monospace;font-size:.78rem;font-weight:700;color:#6B7280;background:rgba(243,244,246,.8);border:1px solid rgba(0,0,0,.06);border-radius:7px;padding:.2rem .55rem}
        .ea-hero-date{font-size:.72rem;font-weight:600;color:#9CA3AF}
        .ea-hero-right{display:flex;gap:.5rem;align-items:center;flex-shrink:0}

        /* ── Action Buttons ── */
        .ea-btn-edit{height:38px;padding:0 1.1rem;border-radius:10px;border:none;background:linear-gradient(135deg,#991B1B,#DC2626);color:white;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;box-shadow:0 4px 14px rgba(220,38,38,.3);transition:transform .15s,box-shadow .2s}
        .ea-btn-edit:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(220,38,38,.4)}
        .ea-btn-cancel{height:38px;padding:0 1.1rem;border-radius:10px;border:1.5px solid rgba(220,38,38,.2);background:rgba(254,242,242,.5);color:#B91C1C;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .15s}
        .ea-btn-cancel:hover{background:#FEE2E2;border-color:rgba(220,38,38,.4)}
        .ea-btn-del{height:38px;padding:0 1.1rem;border-radius:10px;border:1.5px solid rgba(220,38,38,.2);background:white;color:#DC2626;font-family:'DM Sans',sans-serif;font-size:.8rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .15s}
        .ea-btn-del:hover{background:#FEF2F2;border-color:rgba(220,38,38,.4)}

        /* ── Info panel ── */
        .ea-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:eain .5s .14s cubic-bezier(.22,1,.36,1) forwards;margin-bottom:1rem}
        .ea-panel-head{padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.07);display:flex;align-items:center;gap:.5rem}
        .ea-panel-ico{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .ea-panel-title{font-size:.72rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#374151}
        .ea-panel-body{padding:1.25rem 1.4rem}

        /* ── Info grid ── */
        .ea-grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.25rem 2rem}
        .ea-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.25rem 2rem}
        @media(max-width:640px){.ea-grid-2{grid-template-columns:1fr}.ea-grid-3{grid-template-columns:1fr 1fr}}
        @media(max-width:420px){.ea-grid-3{grid-template-columns:1fr}}

        /* ── Divider ── */
        .ea-divider{height:1px;background:rgba(220,38,38,.07);margin:1.1rem 0}

        /* ── Edit form panel ── */
        .ea-edit-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1.5px solid rgba(220,38,38,.15);box-shadow:0 2px 18px rgba(220,38,38,.08),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:eain .4s cubic-bezier(.22,1,.36,1) forwards}
        .ea-edit-head{padding:.9rem 1.4rem;border-bottom:1px solid rgba(220,38,38,.1);display:flex;align-items:center;justify-content:space-between;background:rgba(254,242,242,.35)}
        .ea-edit-title{font-size:.72rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#B91C1C}
        .ea-edit-body{padding:1.5rem 1.4rem}

        /* ── Toast success ── */
        .ea-toast{display:flex;align-items:center;gap:.5rem;padding:.75rem 1rem;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;color:#065F46;font-size:.8rem;font-weight:700;margin-bottom:1rem;animation:eain .3s cubic-bezier(.22,1,.36,1)}

        /* ── States ── */
        .ea-error-box{display:flex;align-items:flex-start;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin-bottom:1.25rem;line-height:1.5}
        .ea-loader{display:flex;align-items:center;justify-content:center;padding:3rem;color:#6B7280;font-size:.85rem;font-weight:600;gap:.6rem}
        .ea-ring{width:22px;height:22px;border:2.5px solid rgba(220,38,38,.12);border-top-color:#DC2626;border-radius:50%;animation:easpin .7s linear infinite}

        @keyframes eain{to{opacity:1;transform:translateY(0)}}
        @keyframes easpin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ea-wrap">

        {/* Back link */}
        <Link href="/super-admin/antennas" className="ea-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux antennes
        </Link>

        {/* Page header */}
        <div className="ea-header">
          <div className="ea-eyebrow"><div className="ea-dot" />Super Admin</div>
          <h1 className="ea-title">
            {isEditing ? <>Modifier l&apos;<span>antenne</span></> : <>Détails de l&apos;<span>antenne</span></>}
          </h1>
        </div>

        {/* Error */}
        {error && !loading && (
          <div className="ea-error-box">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
            </svg>
            {error}
          </div>
        )}

        {/* Save success toast */}
        {saveSuccess && (
          <div className="ea-toast">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Antenne mise à jour avec succès.
          </div>
        )}

        {loading ? (
          <div className="ea-panel" style={{ animationDelay: '0s' }}>
            <div className="ea-loader"><div className="ea-ring" />Chargement de l&apos;antenne&#8230;</div>
          </div>
        ) : antenna ? (
          <>
            {/* ── Hero ── */}
            <div className="ea-hero">
              <div className="ea-hero-left">
                <div className="ea-hero-ico">{antenna.code.slice(0, 2).toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="ea-hero-name">{antenna.name}</div>
                  <div className="ea-hero-meta">
                    <span className="ea-hero-code">{antenna.code}</span>
                    <span className="ea-hero-currency">{antenna.defaultCurrency ?? 'EUR'}</span>
                    <StatusBadge active={antenna.isActive} />
                    <span className="ea-hero-date">Créée le {formatDate(antenna.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="ea-hero-right">
                {!isEditing ? (
                  <>
                    <button className="ea-btn-edit" onClick={() => { setIsEditing(true); setSaveSuccess(false); }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Modifier
                    </button>
                    <button className="ea-btn-del" onClick={() => setShowDeleteModal(true)}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Supprimer
                    </button>
                  </>
                ) : (
                  <button className="ea-btn-cancel" onClick={() => setIsEditing(false)}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Annuler l&apos;édition
                  </button>
                )}
              </div>
            </div>

            {/* ══ VIEW MODE ══ */}
            {!isEditing && (
              <>
                {/* Identification */}
                <div className="ea-panel">
                  <div className="ea-panel-head">
                    <div className="ea-panel-ico" style={{ background: 'rgba(254,242,242,.8)', color: '#DC2626' }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                    </div>
                    <span className="ea-panel-title">Identification</span>
                  </div>
                  <div className="ea-panel-body">
                    <div className="ea-grid-3">
                      <InfoRow label="Nom de l'antenne" value={antenna.name} />
                      <InfoRow label="Code"             value={antenna.code} mono />
                      <InfoRow label="Devise"           value={antenna.defaultCurrency ?? 'EUR'} mono />
                    </div>
                    <div className="ea-divider" />
                    <div className="ea-grid-3">
                      <InfoRow label="ID"         value={antenna.id} mono />
                      <InfoRow label="Créée le"   value={formatDate(antenna.createdAt)} />
                      <InfoRow label="Modifiée le" value={formatDate(antenna.updatedAt)} />
                    </div>
                  </div>
                </div>

                {/* Localisation */}
                <div className="ea-panel">
                  <div className="ea-panel-head">
                    <div className="ea-panel-ico" style={{ background: 'rgba(240,253,250,.9)', color: '#0F766E' }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="ea-panel-title">Localisation</span>
                  </div>
                  <div className="ea-panel-body">
                    <div className="ea-grid-2">
                      <InfoRow label="Ville"   value={antenna.city} />
                      <InfoRow label="Pays"    value={antenna.country} />
                    </div>
                  </div>
                </div>

                {/* Statut */}
                <div className="ea-panel">
                  <div className="ea-panel-head">
                    <div className="ea-panel-ico" style={{ background: antenna.isActive ? 'rgba(236,253,245,.9)' : 'rgba(254,242,242,.9)', color: antenna.isActive ? '#059669' : '#DC2626' }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="ea-panel-title">Statut de l&apos;antenne</span>
                  </div>
                  <div className="ea-panel-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <StatusBadge active={antenna.isActive} />
                      <span style={{ fontSize: '.82rem', color: '#6B7280', fontWeight: 600 }}>
                        {antenna.isActive
                          ? 'Cette antenne est active et visible des membres.'
                          : 'Cette antenne est désactivée et non visible des membres.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Association */}
                <div className="ea-panel">
                  <div className="ea-panel-head">
                    <div className="ea-panel-ico" style={{ background: 'rgba(239,246,255,.9)', color: '#1D4ED8' }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="ea-panel-title">Informations techniques</span>
                  </div>
                  <div className="ea-panel-body">
                    <div className="ea-grid-2">
                      <InfoRow label="Association ID" value={antenna.associationId} mono />
                      <InfoRow label="Dernière modification" value={formatDate(antenna.updatedAt)} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══ EDIT MODE ══ */}
            {isEditing && (
              <div className="ea-edit-panel">
                <div className="ea-edit-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <div className="ea-panel-ico" style={{ background: 'rgba(220,38,38,.15)', color: '#DC2626' }}>
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <span className="ea-edit-title">Modifier les informations</span>
                  </div>
                </div>
                <div className="ea-edit-body">
                  <AntennaForm
                    initialValues={{
                      name:            antenna.name,
                      city:            antenna.city    || '',
                      country:         antenna.country || '',
                      isActive:        antenna.isActive,
                      defaultCurrency: antenna.defaultCurrency || 'EUR',
                    }}
                    submitLabel={busy ? 'Mise à jour...' : 'Enregistrer les modifications'}
                    busy={busy}
                    onSubmit={async (values) => {
                      setBusy(true); setError(null); setSaveSuccess(false);
                      try {
                        const updated = await api.updateAntenna(id, values);
                        setAntenna(updated);
                        setIsEditing(false);
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 4000);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Erreur lors de la modification');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Delete modal */}
      {showDeleteModal && antenna && (
        <DeleteModal
          antenna={antenna}
          busy={deleteBusy}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </AppShell>
  );
} 