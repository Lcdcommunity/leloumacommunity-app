//web/app/(protected)/super-admin/antennas/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AntennaForm } from '../../../../../components/super-admin/AntennaForm';
import { api } from '../../../../../lib/api-client';

export default function NewAntennaPage() {
  const router = useRouter();
  const [error,  setError]  = useState<string | null>(null);
  const [busy,   setBusy]   = useState(false);

  return (
    <AppShell title="Nouvelle antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .na-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:680px;margin:0 auto}

        /* ── Back link ── */
        .na-back{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:700;color:#B91C1C;text-decoration:none;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:nain .45s .02s cubic-bezier(.22,1,.36,1) forwards;transition:color .15s}
        .na-back:hover{color:#991B1B}

        /* ── Header ── */
        .na-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:nain .5s .06s cubic-bezier(.22,1,.36,1) forwards}
        .na-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#DC2626;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .na-dot{width:6px;height:6px;background:#EF4444;border-radius:50%;animation:napulse 2s ease-in-out infinite}
        @keyframes napulse{0%,100%{opacity:1}50%{opacity:.3}}
        .na-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .na-title span{background:linear-gradient(135deg,#991B1B,#EF4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

        /* ── Panel ── */
        .na-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(220,38,38,.09);box-shadow:0 2px 18px rgba(220,38,38,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:nain .5s .12s cubic-bezier(.22,1,.36,1) forwards}

        .na-panel-head{padding:1rem 1.5rem;border-bottom:1px solid rgba(220,38,38,.08);display:flex;align-items:center;gap:.55rem}
        .na-panel-ico{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#991B1B,#DC2626);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(220,38,38,.3)}
        .na-panel-title{font-size:.76rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}

        .na-panel-body{padding:1.75rem 1.5rem}
        @media(max-width:540px){.na-panel-body{padding:1.25rem 1.1rem}}

        /* ── Error banner ── */
        .na-error{display:flex;align-items:flex-start;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin-bottom:1.25rem;line-height:1.5}

        /* ── Info notice ── */
        .na-notice{display:flex;gap:.6rem;align-items:flex-start;padding:.8rem 1rem;background:rgba(254,242,242,.5);border:1px solid rgba(220,38,38,.15);border-radius:11px;margin-bottom:1.5rem;font-size:.78rem;font-weight:600;color:#991B1B;line-height:1.5}

        @keyframes nain{to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="na-wrap">

        {/* Back */}
        <Link href="/super-admin/antennas" className="na-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux antennes
        </Link>

        {/* Header */}
        <div className="na-header">
          <div className="na-eyebrow"><div className="na-dot" />Super Admin</div>
          <h1 className="na-title">Cr&eacute;er une <span>antenne</span></h1>
        </div>

        {/* Panel */}
        <div className="na-panel">
          <div className="na-panel-head">
            <div className="na-panel-ico">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
            <span className="na-panel-title">Nouvelle antenne</span>
          </div>

          <div className="na-panel-body">
            <div className="na-notice">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Le <strong>code antenne</strong> doit &ecirc;tre unique et ne pourra pas &ecirc;tre modifi&eacute; apr&egrave;s cr&eacute;ation.
                Choisissez-le avec soin.
              </span>
            </div>

            {error && (
              <div className="na-error">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}

            <AntennaForm
              submitLabel={busy ? 'Cr\u00e9ation\u2026' : 'Cr\u00e9er l\u2019antenne'}
              onSubmit={async (values) => {
                setBusy(true); setError(null);
                try {
                  await api.createAntenna(values);
                  router.replace('/super-admin/antennas');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erreur lors de la cr\u00e9ation');
                  setBusy(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}