//web/app/(protected)/super-admin/antennas/[id]/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AntennaForm } from '../../../../../components/super-admin/AntennaForm';
import { api } from '../../../../../lib/api-client';
import type { Antenna } from '../../../../../types/antenna';

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
          <strong style={{ color: '#111827' }}>{antenna.name}</strong> ({antenna.code}) sera supprim&eacute;e d&eacute;finitivement.
        </p>
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel} disabled={busy}
            style={{ height: 40, padding: '0 1.2rem', borderRadius: 10, border: '1px solid rgba(220,38,38,.18)', background: 'rgba(249,250,251,.95)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 700, color: '#374151', cursor: 'pointer' }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm} disabled={busy}
            style={{ height: 40, padding: '0 1.3rem', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#991B1B,#DC2626)', fontFamily: "'DM Sans',sans-serif", fontSize: '.82rem', fontWeight: 800, color: 'white', cursor: 'pointer', boxShadow: '0 4px 14px rgba(220,38,38,.35)', opacity: busy ? .6 : 1, display: 'flex', alignItems: 'center', gap: '.4rem' }}
          >
            {busy ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </>
  );
}

export default function EditAntennaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // FIX 1 : Le type Antenna contient déjà defaultCurrency
  const [antenna, setAntenna] = useState<Antenna | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

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
    <AppShell title={isEditing ? "Modifier l'antenne" : "Détails de l'antenne"}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ea-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:980px;margin:0 auto}

        /* ── Back link ── */
        .ea-back{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:700;color:#1D4ED8;text-decoration:none;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:eain .45s .02s cubic-bezier(.22,1,.36,1) forwards;transition:color .15s}
        .ea-back:hover{color:#1E3A8A}

        /* ── Header ── */
        .ea-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:eain .5s .06s cubic-bezier(.22,1,.36,1) forwards}
        .ea-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ea-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:eapulse 2s ease-in-out infinite}
        @keyframes eapulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ea-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15;display:flex;align-items:center;justify-content:space-between}
        .ea-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* ── Panel ── */
        .ea-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 18px rgba(37,99,235,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:eain .5s .12s cubic-bezier(.22,1,.36,1) forwards}
        .ea-panel-head{padding:1rem 1.5rem;border-bottom:1px solid rgba(37,99,235,.08);display:flex;align-items:center;justify-content:space-between;gap:.55rem}
        .ea-panel-ico{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#1D4ED8,#2563EB);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(37,99,235,.3)}
        .ea-panel-title{font-size:.76rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .ea-panel-body{padding:1.75rem 1.5rem}

        /* ── Action Buttons ── */
        .ea-btn-edit{height:34px;padding:0 1rem;border-radius:9px;border:none;background:linear-gradient(135deg,#1D4ED8,#2563EB);color:white;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;box-shadow:0 4px 14px rgba(37,99,235,.3);transition:transform .15s}
        .ea-btn-edit:hover{transform:translateY(-1px)}
        .ea-btn-cancel{height:34px;padding:0 1rem;border-radius:9px;border:1.5px solid rgba(37,99,235,.2);background:rgba(239,246,255,.6);color:#1D4ED8;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .15s}
        .ea-btn-cancel:hover{background:#DBEAFE;border-color:rgba(37,99,235,.4)}
        .ea-btn-del{height:34px;padding:0 1rem;border-radius:9px;border:1.5px solid rgba(220,38,38,.2);background:white;color:#DC2626;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .15s}
        .ea-btn-del:hover{background:#FEF2F2;border-color:rgba(220,38,38,.4)}

        /* ── States ── */
        .ea-error{display:flex;align-items:flex-start;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin-bottom:1.25rem;line-height:1.5}
        .ea-loader{display:flex;align-items:center;justify-content:center;padding:3rem;color:#6B7280;font-size:.85rem;font-weight:600;gap:.6rem;}
        .ea-ring{width:22px;height:22px;border:2.5px solid rgba(37,99,235,.15);border-top-color:#2563EB;border-radius:50%;animation:easpin .7s linear infinite;}

        @keyframes eain{to{opacity:1;transform:translateY(0)}}
        @keyframes easpin{to{transform:rotate(360deg)}}
      `}</style>

      <div className="ea-wrap">
        <Link href="/super-admin/antennas" className="ea-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux antennes
        </Link>

        <div className="ea-header">
          <div className="ea-eyebrow"><div className="ea-dot" />Super Admin</div>
          <h1 className="ea-title">
            {isEditing ? <span>Modifier l&apos;antenne</span> : <span>Détails de l&apos;antenne</span>}
          </h1>
        </div>

        <div className="ea-panel">
          <div className="ea-panel-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
              <div className="ea-panel-ico">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span className="ea-panel-title">Informations</span>
            </div>
            
            {!loading && antenna && (
              <div style={{ display: 'flex', gap: '.5rem' }}>
                {!isEditing ? (
                  <>
                    <button className="ea-btn-edit" onClick={() => setIsEditing(true)}>
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
                    {/* FIX 2 : Échappement de l'apostrophe */}
                    Annuler l&apos;édition
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="ea-panel-body">
            {loading ? (
              <div className="ea-loader"><div className="ea-ring" />Chargement...</div>
            ) : error ? (
              <div className="ea-error">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            ) : antenna ? (
              <AntennaForm
                readOnly={!isEditing}
                initialValues={{
                  name: antenna.name,
                  city: antenna.city || '',
                  country: antenna.country || '',
                  isActive: antenna.isActive,
                  /* FIX 3 : Assure-toi que AntennaForm.tsx a bien été sauvegardé avec la mise à jour de l'interface AntennaFormValues */
                  defaultCurrency: antenna.defaultCurrency || 'EUR',
                }}
                submitLabel={busy ? 'Mise à jour...' : 'Enregistrer les modifications'}
                onSubmit={async (values) => {
                  setBusy(true); setError(null);
                  try {
                    await api.updateAntenna(id, values);
                    setIsEditing(false); // On repasse en mode lecture
                    router.refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Erreur lors de la modification');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

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