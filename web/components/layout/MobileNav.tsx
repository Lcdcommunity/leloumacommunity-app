//web/components/layout/MobileNav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '../../lib/api-client';
import type { UserRole } from '../../types/user';

// ── SVG helper ──────────────────────────────────────────────────────────────
function Ico({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {d2 && <path d={d2} />}
    </svg>
  );
}

// ── Nav items per role (max 5 tabs) ─────────────────────────────────────────
type Tab = { href: string; label: string; icon: React.ReactNode; activeIcon?: React.ReactNode };

const superAdminTabs: Tab[] = [
  { href: '/super-admin',               label: 'Accueil',    icon: <Ico d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { href: '/super-admin/antennas',       label: 'Antennes',   icon: <Ico d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /> },
  { href: '/super-admin/members',        label: 'Membres',    icon: <Ico d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
  { href: '/super-admin/notifications',  label: 'Notifs',     icon: <Ico d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> },
  { href: '/super-admin/settings',       label: 'Profil',     icon: <Ico d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
];

const adminTabs: Tab[] = [
  { href: '/admin',                 label: 'Accueil',    icon: <Ico d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { href: '/admin/approvals',       label: 'Comptes',    icon: <Ico d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { href: '/admin/contributions',   label: 'Cotisations',icon: <Ico d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { href: '/admin/projects',        label: 'Projets',    icon: <Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
  { href: '/admin/settings',        label: 'Profil',     icon: <Ico d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
];

const memberTabs: Tab[] = [
  { href: '/member',                       label: 'Accueil',  icon: <Ico d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { href: '/member/contributions/new',     label: 'D\u00e9p\u00f4t',   icon: <Ico d="M12 4v16m8-8H4" /> },
  { href: '/member/projects',              label: 'Projets',  icon: <Ico d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
  { href: '/member/notifications',         label: 'Notifs',   icon: <Ico d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> },
  { href: '/member/profile',               label: 'Profil',   icon: <Ico d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
];

const ROLE_ACCENT: Record<string, string> = {
  SUPER_ADMIN:   '#DC2626',
  ANTENNA_ADMIN: '#2563EB',
  MEMBER:        '#2563EB',
};

export function MobileNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const me = await api.me();
        if (mounted) setRole(me.role);
      } catch { if (mounted) setRole(null); }
    })();
    return () => { mounted = false; };
  }, []);

  const tabs = useMemo(() => {
    if (role === 'SUPER_ADMIN')   return superAdminTabs;
    if (role === 'ANTENNA_ADMIN') return adminTabs;
    if (role === 'MEMBER')        return memberTabs;
    return memberTabs; // fallback
  }, [role]);

  const accent = ROLE_ACCENT[role ?? ''] ?? '#2563EB';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        /* ── Fixed bottom bar — mobile only ── */
        .mobile-nav {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-nav {
            display: flex;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
            height: 64px;
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(37,99,235,0.09);
            box-shadow: 0 -4px 20px rgba(37,99,235,0.07);
            padding: 0 0.25rem;
            /* Safe area for iOS notch */
            padding-bottom: env(safe-area-inset-bottom, 0);
          }
        }

        .mn-tab {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          text-decoration: none; color: #9CA3AF;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.58rem; font-weight: 600; letter-spacing: 0.02em;
          padding: 0.4rem 0.25rem 0.3rem;
          border-radius: 12px; margin: 0.3rem 0.15rem;
          transition: color 0.18s, background 0.18s, transform 0.15s;
          position: relative;
          -webkit-tap-highlight-color: transparent;
        }
        .mn-tab:active { transform: scale(0.92); }
        .mn-tab.active {
          color: var(--mn-accent);
          background: rgba(37,99,235,0.07);
        }
        /* Accent-specific active bg */
        .mn-tab.active[data-accent="#DC2626"] { background: rgba(220,38,38,0.07); }

        .mn-tab-ico { transition: transform 0.2s cubic-bezier(.22,1,.36,1); }
        .mn-tab.active .mn-tab-ico { transform: translateY(-1px); }

        /* Pill highlight on active tab */
        .mn-tab.active::after {
          content: '';
          position: absolute; top: 4px; left: 50%; transform: translateX(-50%);
          width: 20px; height: 3px; border-radius: 99px;
          background: var(--mn-accent);
          animation: mnpop 0.25s cubic-bezier(.22,1,.36,1);
        }
        @keyframes mnpop {
          from { opacity:0; transform: translateX(-50%) scaleX(0.3); }
          to   { opacity:1; transform: translateX(-50%) scaleX(1); }
        }

        /* Special "Dépôt" tab — plus icon gets a circle bg */
        .mn-tab.mn-cta .mn-tab-ico {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #1D4ED8, #3B82F6);
          display: flex; align-items: center; justify-content: center;
          color: white;
          box-shadow: 0 3px 12px rgba(37,99,235,0.32);
          margin-top: -6px;
          transition: transform 0.2s cubic-bezier(.22,1,.36,1), box-shadow 0.2s;
        }
        .mn-tab.mn-cta:active .mn-tab-ico { transform: scale(0.9); }
        .mn-tab.mn-cta { color: #6B7280; }
        .mn-tab.mn-cta.active { background: none; color: #2563EB; }
        .mn-tab.mn-cta.active::after { display: none; }
        .mn-tab.mn-cta .mn-tab-ico svg { width: 16px; height: 16px; strokeWidth: 2.5; }
      `}</style>

      <nav className="mobile-nav" style={{ '--mn-accent': accent } as React.CSSProperties}>
        {tabs.map(tab => {
          const isActive = pathname === tab.href
            || (tab.href !== '/member' && tab.href !== '/admin' && tab.href !== '/super-admin'
                && pathname.startsWith(tab.href));
          const isCta = tab.href.includes('/contributions/new');

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mn-tab${isActive ? ' active' : ''}${isCta ? ' mn-cta' : ''}`}
              data-accent={accent}
            >
              <span className="mn-tab-ico">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}