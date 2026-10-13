// web/components/platform-wallet/ui.tsx
//
// v1.0 — Petits éléments visuels partagés par les écrans du wallet plateforme
//   (cartes ombrées, pastilles de statut, formats). Styles inline : Tailwind n'est pas installé.
//
'use client';

import type { CSSProperties, ReactNode } from 'react';
import { formatCurrency } from '../../lib/format';
import type { TransferStatus } from '../../lib/platform-wallet-api';

export const STATUS: Record<TransferStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING_VALIDATION: { label: 'En attente', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  VALIDATED: { label: 'Validé', color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7' },
  REJECTED: { label: 'Refusé', color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5' },
  CANCELLED: { label: 'Annulé', color: '#374151', bg: '#F9FAFB', border: '#D1D5DB' },
};

export const CUR_FLAG: Record<string, string> = { EUR: '🇪🇺', USD: '🇺🇸', GNF: '🇬🇳', XOF: '🌍', GBP: '🇬🇧', CAD: '🇨🇦', CHF: '🇨🇭' };

export const money = (amount: string | number, currency: string) => formatCurrency(Number(amount), currency);

export const dateFr = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const card: CSSProperties = {
  background: '#fff',
  borderRadius: 18,
  boxShadow: '0 2px 14px rgba(15,23,42,.07)',
  border: '1px solid rgba(15,23,42,.04)',
};

export const input: CSSProperties = {
  width: '100%', height: 44, borderRadius: 12, boxSizing: 'border-box', border: '1.5px solid #E2E8F0',
  padding: '0 .9rem', fontSize: '.92rem', fontWeight: 600, color: '#0F172A', background: '#fff', outline: 'none', fontFamily: 'inherit',
};

export const label: CSSProperties = {
  display: 'block', fontSize: '.68rem', fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase', color: '#475569', marginBottom: 6,
};

export function btn(bg: string, opts: { ghost?: boolean; disabled?: boolean } = {}): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42, padding: '0 1.1rem',
    borderRadius: 12, border: opts.ghost ? `1.5px solid ${bg}` : 'none', background: opts.ghost ? '#fff' : bg,
    color: opts.ghost ? bg : '#fff', fontWeight: 700, fontSize: '.86rem', cursor: opts.disabled ? 'not-allowed' : 'pointer',
    opacity: opts.disabled ? 0.55 : 1, fontFamily: 'inherit', boxShadow: opts.ghost ? 'none' : `0 4px 14px ${bg}44`,
  };
}

export function StatusPill({ status }: { status: TransferStatus }) {
  const s = STATUS[status] ?? STATUS.CANCELLED;
  return (
    <span style={{ fontSize: '.68rem', fontWeight: 800, padding: '.22rem .7rem', borderRadius: 99, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const c = kind === 'error' ? ['#FEF2F2', '#FCA5A5', '#991B1B'] : kind === 'success' ? ['#ECFDF5', '#6EE7B7', '#065F46'] : ['#EFF6FF', '#BFDBFE', '#1E40AF'];
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} style={{ background: c[0], border: `1px solid ${c[1]}`, color: c[2], borderRadius: 12, padding: '.7rem .9rem', fontSize: '.84rem', fontWeight: 600, marginBottom: 12 }}>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div style={{ ...card, padding: '2rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '.88rem', fontWeight: 600 }}>{children}</div>;
}

export const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
  .pw-wrap { font-family:'DM Sans',sans-serif; padding:clamp(1rem,3vw,2rem); max-width:1100px; margin:0 auto; }
  .pw-grid4 { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:14px; }
  .pw-grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:12px; }
  .pw-row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; justify-content:space-between; }
  .pw-tabs { display:flex; gap:6px; background:#F1F5F9; padding:4px; border-radius:14px; width:fit-content; max-width:100%; overflow-x:auto; }
  .pw-tab { border:none; background:transparent; padding:.5rem 1rem; border-radius:10px; font-weight:700; font-size:.82rem; color:#64748B; cursor:pointer; font-family:inherit; white-space:nowrap; }
  .pw-tab[data-on="1"] { background:#fff; color:#0F172A; box-shadow:0 1px 6px rgba(15,23,42,.1); }
  .pw-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); display:flex; align-items:center; justify-content:center; z-index:100; padding:1rem; }
  .pw-modal { background:#fff; border-radius:20px; width:100%; max-width:460px; max-height:92vh; overflow-y:auto; box-shadow:0 25px 60px rgba(0,0,0,.25); padding:1.4rem; }
  @media (max-width:520px){ .pw-wrap{ padding:.9rem; } }
`;
