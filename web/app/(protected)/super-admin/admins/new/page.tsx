//web/app/(protected)/super-admin/admins/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '../../../../../components/layout/AppShell';
import { AdminUserForm, type AdminFormValues } from '../../../../../components/super-admin/AdminUserForm';
import { superAdminApi } from '../../../../../lib/super-admin-api';

export default function NewAntennaAdminPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AppShell title="Créer un admin d'antenne">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .sadn-wrap{font-family:'DM Sans',sans-serif;padding:clamp(1.25rem,3vw,2rem);max-width:900px;margin:0 auto}
        .sadn-back{display:inline-flex;align-items:center;gap:.4rem;font-size:.78rem;font-weight:700;color:#1D4ED8;text-decoration:none;margin-bottom:1.25rem;opacity:0;transform:translateY(8px);animation:sadnin .45s .02s cubic-bezier(.22,1,.36,1) forwards;transition:color .15s}
        .sadn-back:hover{color:#1E3A8A}
        .sadn-header{margin-bottom:1.5rem;opacity:0;transform:translateY(10px);animation:sadnin .5s .06s cubic-bezier(.22,1,.36,1) forwards}
        .sadn-eyebrow{font-size:.67rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#2563EB;margin-bottom:.35rem;display:flex;align-items:center;gap:.4rem}
        .sadn-dot{width:6px;height:6px;background:#3B82F6;border-radius:50%;animation:sadnpulse 2s ease-in-out infinite}
        @keyframes sadnpulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sadn-title{font-family:'Cormorant Garamond',serif;font-size:clamp(1.45rem,3vw,1.9rem);font-weight:700;color:#111827;letter-spacing:-.02em;line-height:1.15}
        .sadn-title span{background:linear-gradient(135deg,#1D4ED8,#3B82F6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .sadn-panel{background:rgba(253,253,255,.94);backdrop-filter:blur(14px);border-radius:22px;border:1px solid rgba(37,99,235,.09);box-shadow:0 2px 18px rgba(37,99,235,.06),0 0 0 1px rgba(255,255,255,.9) inset;overflow:hidden;opacity:0;transform:translateY(10px);animation:sadnin .5s .12s cubic-bezier(.22,1,.36,1) forwards}
        .sadn-panel-head{padding:1rem 1.5rem;border-bottom:1px solid rgba(37,99,235,.08);display:flex;align-items:center;gap:.55rem}
        .sadn-panel-ico{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#1D4ED8,#2563EB);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(37,99,235,.3)}
        .sadn-panel-title{font-size:.76rem;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#1F2937}
        .sadn-panel-body{padding:1.75rem 1.5rem}
        @media(max-width:540px){.sadn-panel-body{padding:1.25rem 1.1rem}}
        .sadn-error{display:flex;align-items:flex-start;gap:.6rem;padding:.9rem 1.1rem;background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;color:#B91C1C;font-size:.82rem;font-weight:800;margin-bottom:1.5rem;line-height:1.5}
        @keyframes sadnin{to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className="sadn-wrap">
        <Link href="/super-admin/admins" className="sadn-back">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour aux administrateurs
        </Link>

        <div className="sadn-header">
          <div className="sadn-eyebrow"><div className="sadn-dot" />Super Admin</div>
          <h1 className="sadn-title">Créer un <span>administrateur</span></h1>
        </div>

        <div className="sadn-panel">
          <div className="sadn-panel-head">
            <div className="sadn-panel-ico">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="sadn-panel-title">Informations du compte d&eacute;l&eacute;gu&eacute;</span>
          </div>

          <div className="sadn-panel-body">
            {error && (
              <div className="sadn-error">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                {error}
              </div>
            )}

            <AdminUserForm
              busy={busy}
              onSubmit={async (values: AdminFormValues) => {
                setBusy(true);
                setError(null);

                try {
                  await superAdminApi.createAntennaAdmin(values);
                  router.replace('/super-admin/admins');
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erreur lors de la création de l'administrateur");
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