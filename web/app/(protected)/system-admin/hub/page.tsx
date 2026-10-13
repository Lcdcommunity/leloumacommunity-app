// web/app/(protected)/system-admin/hub/page.tsx
//
// v1.0 — 🆕 Hub de la console du Grand Chef : choix de l'univers à piloter.
//   • « Consulter les associations » → back-office LCD (/system-admin), couleurs violettes.
//   • « Consulter les sociétés de transfert » → back-office Direct Transf'air (/transfert), couleurs vertes,
//     ouvert par connexion unique (assertion signée de 60 s, aucun second mot de passe).
//   Page autonome (sans menu latéral) : chaque univers ne montre ensuite que ses propres éléments.
//
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { consoleSsoApi, openTransferConsole } from '../../../../lib/console-sso-api';

const LCD = { main: '#7C3AED', soft: '#F5F3FF', border: '#DDD6FE', dark: '#4C1D95' };
const DT = { main: '#0B7A5B', soft: '#ECFDF5', border: '#A7F3D0', dark: '#064E3B' };

const css = `
.hub-wrap{min-height:100vh;background:linear-gradient(160deg,#F8FAFC 0%,#EEF2FF 55%,#ECFDF5 100%);padding:clamp(1rem,4vw,2.5rem);box-sizing:border-box;font-family:inherit;color:#0F172A}
.hub-inner{max-width:980px;margin:0 auto}
.hub-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:clamp(1.5rem,5vw,3rem)}
.hub-title{font-size:clamp(1.35rem,4vw,2rem);font-weight:900;letter-spacing:-.02em;margin:0}
.hub-sub{margin:.35rem 0 0;color:#64748B;font-size:.95rem;font-weight:500}
.hub-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(1rem,3vw,1.75rem)}
.hub-card{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:1rem;text-align:left;width:100%;box-sizing:border-box;background:#fff;border:1.5px solid rgba(15,23,42,.05);border-radius:24px;padding:clamp(1.25rem,3vw,2rem);box-shadow:0 4px 24px rgba(15,23,42,.08);cursor:pointer;font-family:inherit;color:inherit;text-decoration:none;transition:transform .18s ease,box-shadow .18s ease}
.hub-card:hover:not([aria-disabled="true"]){transform:translateY(-3px);box-shadow:0 12px 34px rgba(15,23,42,.14)}
.hub-card:focus-visible{outline:3px solid var(--hub-main);outline-offset:3px}
.hub-card[aria-disabled="true"]{cursor:not-allowed;opacity:.62}
.hub-logo{width:76px;height:76px;border-radius:20px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex:none}
.hub-name{font-size:1.25rem;font-weight:900;margin:0}
.hub-desc{margin:0;color:#475569;font-size:.9rem;line-height:1.5;font-weight:500}
.hub-chips{display:flex;flex-wrap:wrap;gap:.4rem}
.hub-chip{font-size:.72rem;font-weight:800;border-radius:999px;padding:.25rem .65rem}
.hub-cta{margin-top:auto;display:inline-flex;align-items:center;gap:.5rem;border-radius:14px;padding:.75rem 1.2rem;font-weight:800;font-size:.92rem;color:#fff;background:var(--hub-main)}
.hub-note{margin-top:1.25rem;font-size:.82rem;font-weight:600;border-radius:14px;padding:.8rem 1rem}
.hub-out{border:1.5px solid #E2E8F0;background:#fff;color:#334155;border-radius:12px;padding:.55rem 1rem;font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit}
@media (max-width:720px){.hub-grid{grid-template-columns:1fr}.hub-logo{width:64px;height:64px}}
`;

export default function SystemAdminHubPage() {
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    consoleSsoApi
      .transferStatus()
      .then((s) => alive && setConfigured(s.configured))
      .catch(() => alive && setConfigured(false));
    return () => {
      alive = false;
    };
  }, []);

  async function goTransfer() {
    if (busy || !configured) return;
    setBusy(true);
    setError(null);
    try {
      const ticket = await consoleSsoApi.transferTicket();
      openTransferConsole(ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connexion impossible au back-office des sociétés de transfert.');
      setBusy(false);
    }
  }

  const transferDisabled = configured !== true;

  return (
    <div className="hub-wrap">
      <style>{css}</style>
      <div className="hub-inner">
        <div className="hub-top">
          <div>
            <h1 className="hub-title">Console Grand Chef</h1>
            <p className="hub-sub">Choisis l&apos;univers que tu veux piloter.</p>
          </div>
          <button type="button" className="hub-out" onClick={() => router.push('/logout')}>
            Déconnexion
          </button>
        </div>

        <div className="hub-grid">
          <Link
            href="/system-admin"
            className="hub-card"
            style={{ ['--hub-main' as string]: LCD.main, borderColor: LCD.border }}
          >
            <span className="hub-logo" style={{ background: LCD.soft }}>
              <Image src="/assets/images/logolcd.jpg" alt="Logo associations" width={76} height={76} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            </span>
            <h2 className="hub-name" style={{ color: LCD.dark }}>Consulter les associations</h2>
            <p className="hub-desc">Associations clientes, antennes, membres, cotisations et le wallet des commissions du Grand Chef.</p>
            <div className="hub-chips">
              <span className="hub-chip" style={{ background: LCD.soft, color: LCD.dark }}>Associations</span>
              <span className="hub-chip" style={{ background: LCD.soft, color: LCD.dark }}>Wallet Grand Chef</span>
            </div>
            <span className="hub-cta">Ouvrir →</span>
          </Link>

          <button
            type="button"
            className="hub-card"
            onClick={goTransfer}
            aria-disabled={transferDisabled || busy}
            style={{ ['--hub-main' as string]: DT.main, borderColor: DT.border }}
          >
            <span className="hub-logo" style={{ background: DT.main }}>
              <svg width="76" height="76" viewBox="0 0 64 64" aria-hidden="true">
                <rect width="64" height="64" rx="16" fill={DT.main} />
                <path d="M14 24h30l-7-7M50 40H20l7 7" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="hub-name" style={{ color: DT.dark }}>Consulter les sociétés de transfert</h2>
            <p className="hub-desc">Sociétés de transfert d&apos;argent, leurs agences, taux, portefeuilles et opérations — avec leurs propres couleurs.</p>
            <div className="hub-chips">
              <span className="hub-chip" style={{ background: DT.soft, color: DT.dark }}>Sociétés</span>
              <span className="hub-chip" style={{ background: DT.soft, color: DT.dark }}>Connexion unique</span>
            </div>
            <span className="hub-cta">
              {busy ? 'Ouverture…' : configured === null ? 'Vérification…' : configured ? 'Ouvrir →' : 'Non configuré'}
            </span>
          </button>
        </div>

        {configured === false && (
          <div className="hub-note" style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }}>
            La connexion unique vers les sociétés de transfert n&apos;est pas encore configurée (variable{' '}
            <code>PLATFORM_SSO_SECRET</code> à définir sur les deux serveurs).
          </div>
        )}
        {error && (
          <div className="hub-note" role="alert" style={{ background: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
