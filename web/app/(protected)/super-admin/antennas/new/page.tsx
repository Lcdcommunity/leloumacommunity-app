//web/app/(protected)/super-admin/antennas/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AntennaForm, type AntennaFormValues } from '../../../../../components/super-admin/AntennaForm';
import { superAdminApi } from '../../../../../lib/super-admin-api';

export default function NewAntennaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AppShell title="Créer une antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .sap-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:980px;margin:0 auto}
        .sap-back{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:700;color:#1D4ED8;text-decoration:none;margin-bottom:1.25rem}
        .sap-header{margin-bottom:1.5rem}
        .sap-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sap-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%}
        .sap-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sap-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .sap-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 18px rgba(37,99,235,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden}
        .sap-panel-head{padding:1rem 1.5rem;border-bottom:1px solid rgba(37,99,235,.08);display:flex;align-items:center;gap:.55rem}
        .sap-panel-ico{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#1D4ED8,#2563EB);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(37,99,235,.3)}
        .sap-panel-title{font-size:.76rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .sap-panel-body{padding:1.75rem 1.5rem}
        .sap-error{display:flex;align-items:flex-start;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin-bottom:1.5rem;line-height:1.5}
      `}</style>

      <div className="sap-wrap">
        <Link href="/super-admin/antennas" className="sap-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux antennes
        </Link>

        <div className="sap-header">
          <div className="sap-eyebrow"><div className="sap-dot" />Super Admin</div>
          <h1 className="sap-title">Créer une <span>antenne</span></h1>
        </div>

        <div className="sap-panel">
          <div className="sap-panel-head">
            <div className="sap-panel-ico">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M15 9h.01M15 13h.01" />
              </svg>
            </div>
            <span className="sap-panel-title">Création d’antenne et admin principal</span>
          </div>

          <div className="sap-panel-body">
            {error && (
              <div className="sap-error">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}

            <AntennaForm
              busy={busy}
              onSubmit={async (values: AntennaFormValues) => {
                setBusy(true);
                setError(null);

                try {
                  await superAdminApi.createAntenna(values);
                  router.replace('/super-admin/antennas');
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erreur lors de la création de l'antenne");
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