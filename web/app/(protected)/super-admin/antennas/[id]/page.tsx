//web/app/(protected)/super-admin/antennas/[id]/page.tsx
'use client';

import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AntennaForm } from '../../../../../components/super-admin/AntennaForm';
import { api } from '../../../../../lib/api-client';
import { http } from '../../../../../lib/http';
import type { Antenna } from '../../../../../types/antenna';

export default function EditAntennaPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [antenna, setAntenna] = useState<Antenna | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        // On fetch directement l'antenne via http pour ne pas alourdir api-client
        const data = await http<Antenna>(`/super-admin/antennas/${id}`);
        setAntenna(data);
      } catch {
        setError("Impossible de charger les informations de l'antenne.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <AppShell title="Modifier l'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ea-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:680px;margin:0 auto}

        /* ── Back link ── */
        .ea-back{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:700;color:#B91C1C;text-decoration:none;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:eain .45s .02s cubic-bezier(.22,1,.36,1) forwards;transition:color .15s}
        .ea-back:hover{color:#991B1B}

        /* ── Header ── */
        .ea-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:eain .5s .06s cubic-bezier(.22,1,.36,1) forwards}
        .ea-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .ea-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:eapulse 2s ease-in-out infinite}
        @keyframes eapulse{0%,100%{opacity:1}50%{opacity:.3}}
        .ea-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .ea-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* ── Panel ── */
        .ea-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:eain .5s .12s cubic-bezier(.22,1,.36,1) forwards}

        .ea-panel-head{padding:1rem 1.5rem;border-bottom:1px solid rgba(220,38,38,.08);display:flex;align-items:center;gap:.55rem}
        .ea-panel-ico{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(220,38,38,.3)}
        .ea-panel-title{font-size:.76rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}

        .ea-panel-body{padding:1.75rem 1.5rem}
        @media(max-width:540px){.ea-panel-body{padding:1.25rem 1.1rem}}

        /* ── States ── */
        .ea-error{display:flex;align-items:flex-start;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin-bottom:1.25rem;line-height:1.5}
        .ea-loader{display:flex;align-items:center;justify-content:center;padding:3rem;color:#6B7280;font-size:.85rem;font-weight:600;gap:.6rem;}
        .ea-ring{width:22px;height:22px;border:2.5px solid rgba(220,38,38,.15);border-top-color:#DC2626;border-radius:50%;animation:easpin .7s linear infinite;}

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
          <h1 className="ea-title">Modifier <span>l&apos;antenne</span></h1>
        </div>

        <div className="ea-panel">
          <div className="ea-panel-head">
            <div className="ea-panel-ico">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="ea-panel-title">Mise à jour des informations</span>
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
                initialValues={{
                  name: antenna.name,
                  city: antenna.city || '',
                  country: antenna.country || '',
                  isActive: antenna.isActive,
                }}
                submitLabel={busy ? 'Mise à jour...' : 'Enregistrer les modifications'}
                onSubmit={async (values) => {
                  setBusy(true); setError(null);
                  try {
                    await api.updateAntenna(id, values);
                    router.replace('/super-admin/antennas');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Erreur lors de la modification');
                    setBusy(false);
                  }
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}