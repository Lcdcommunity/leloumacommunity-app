// web/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import { logout } from '../../lib/auth';
import type { UserRole } from '../../types/user';

type NavItem = { href: string; label: string; icon: React.ReactNode };

function Ico({ d }: { d: string }) {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICO = {
  home:       'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  pin:        'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  users:      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  group:      'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  check:      'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  coin:       'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  creditCard: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  clip:       'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  doc:        'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  bell:       'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  audit:      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  gear:       'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  clock:      'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  chart:      'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
  news:       'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
  plus:       'M12 4v16m8-8H4',
  history:    'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  edit:       'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  user:       'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
};

const superAdminItems: NavItem[] = [
  { href: '/super-admin',                label: 'Dashboard',             icon: <Ico d={ICO.home} /> },
  { href: '/super-admin/antennas',       label: 'Antennes',              icon: <Ico d={ICO.pin} /> },
  { href: '/super-admin/admins',         label: 'Admins antenne',        icon: <Ico d={ICO.users} /> },
  { href: '/super-admin/members',        label: 'Membres',               icon: <Ico d={ICO.group} /> },
  { href: '/super-admin/approvals',      label: 'Validations comptes',   icon: <Ico d={ICO.check} /> },
  { href: '/super-admin/contributions',  label: 'Cotisations',           icon: <Ico d={ICO.coin} /> },
  { href: '/super-admin/expenses',       label: 'Dépenses',              icon: <Ico d={ICO.creditCard} /> },
  { href: '/super-admin/projects',       label: 'Projets',               icon: <Ico d={ICO.clip} /> },
  { href: '/super-admin/sponsors',       label: 'Partenaires',           icon: <Ico d={ICO.users} /> },
  { href: '/super-admin/documents',      label: 'Documents',             icon: <Ico d={ICO.doc} /> },
  { href: '/super-admin/notifications',  label: 'Notifications',         icon: <Ico d={ICO.bell} /> },
  { href: '/super-admin/audit',          label: 'Audit',                 icon: <Ico d={ICO.audit} /> },
  { href: '/super-admin/profile',        label: 'Mon profil',            icon: <Ico d={ICO.user} /> },
  { href: '/super-admin/settings',       label: 'Paramètres',            icon: <Ico d={ICO.gear} /> },
];

const adminItems: NavItem[] = [
  { href: '/admin',                      label: 'Dashboard',             icon: <Ico d={ICO.home} /> },
  { href: '/admin/approvals',            label: 'Validations comptes',   icon: <Ico d={ICO.check} /> },
  { href: '/admin/members',              label: 'Membres',               icon: <Ico d={ICO.group} /> },
  { href: '/admin/contributions',        label: 'Cotisations',           icon: <Ico d={ICO.coin} /> },
  { href: '/admin/contributions/history',label: 'Historique cotisations',icon: <Ico d={ICO.history} /> },
  { href: '/admin/expenses',             label: 'Dépenses',              icon: <Ico d={ICO.creditCard} /> },
  { href: '/admin/projects',             label: 'Projets',               icon: <Ico d={ICO.clip} /> },
  { href: '/admin/events',               label: 'Événements',            icon: <Ico d={ICO.bell} /> },
  { href: '/admin/documents',            label: 'Documents & photos',    icon: <Ico d={ICO.doc} /> },
  { href: '/admin/contents',             label: 'Informations',          icon: <Ico d={ICO.news} /> },
  { href: '/admin/late-members',         label: 'Retardataires +3 mois', icon: <Ico d={ICO.clock} /> },
  { href: '/admin/projections',          label: 'Projections',           icon: <Ico d={ICO.chart} /> },
  { href: '/admin/notifications',        label: 'Notifications',         icon: <Ico d={ICO.bell} /> },
  { href: '/admin/audit',                label: 'Audit',                 icon: <Ico d={ICO.audit} /> },
  { href: '/admin/profile',              label: 'Mon profil',            icon: <Ico d={ICO.user} /> },
  { href: '/admin/settings',             label: 'Paramètres',            icon: <Ico d={ICO.gear} /> },
];

const memberItems: NavItem[] = [
  { href: '/member',                       label: 'Dashboard',             icon: <Ico d={ICO.home} /> },
  { href: '/member/contributions/new',     label: 'Faire un dépôt',        icon: <Ico d={ICO.plus} /> },
  { href: '/member/contributions/history', label: 'Mes cotisations',       icon: <Ico d={ICO.coin} /> },
  { href: '/member/expenses',              label: 'Dépenses',              icon: <Ico d={ICO.creditCard} /> },
  { href: '/member/projects',              label: 'Projets',               icon: <Ico d={ICO.clip} /> },
  { href: '/member/projects/propose',      label: 'Proposer un projet',    icon: <Ico d={ICO.edit} /> },
  { href: '/member/events',                label: 'Événements',            icon: <Ico d={ICO.bell} /> },
  { href: '/member/documents',             label: 'Documents & photos',    icon: <Ico d={ICO.doc} /> },
  { href: '/member/contents',              label: 'Informations',          icon: <Ico d={ICO.news} /> },
  { href: '/member/late-members',          label: 'Retardataires +3 mois', icon: <Ico d={ICO.clock} /> },
  { href: '/member/notifications',         label: 'Notifications',         icon: <Ico d={ICO.bell} /> },
  { href: '/member/profile',               label: 'Mon profil',            icon: <Ico d={ICO.user} /> },
  { href: '/member/settings',              label: 'Paramètres',            icon: <Ico d={ICO.gear} /> },
];

const BOTTOM_SLUGS = ['settings', 'profile'];

/**
 * Couleurs par rôle :
 * SUPER_ADMIN   → rouge doux
 * ANTENNA_ADMIN → bleu ciel
 * MEMBER        → vert
 */
const ROLE_COLORS: Record<string, {
  accent: string;
  dim: string;
  pillBg: string;
  pillText: string;
  gradient: string;
  label: string;
  hoverBg: string;
}> = {
  SUPER_ADMIN: {
    accent: '#C0392B',
    dim: 'rgba(192,57,43,0.08)',
    pillBg: '#FDF3F2',
    pillText: '#C0392B',
    gradient: 'linear-gradient(135deg,#C0392B,#E74C3C)',
    label: 'Super Admin',
    hoverBg: 'rgba(192,57,43,0.05)',
  },
  ANTENNA_ADMIN: {
    accent: '#2980B9',
    dim: 'rgba(41,128,185,0.10)',
    pillBg: '#E8F6FD',
    pillText: '#2980B9',
    gradient: 'linear-gradient(135deg,#2980B9,#5DADE2)',
    label: 'Admin antenne',
    hoverBg: 'rgba(41,128,185,0.05)',
  },
  MEMBER: {
    accent: '#27AE60',
    dim: 'rgba(39,174,96,0.10)',
    pillBg: '#E8F8EF',
    pillText: '#27AE60',
    gradient: 'linear-gradient(135deg,#27AE60,#52D48A)',
    label: 'Membre',
    hoverBg: 'rgba(39,174,96,0.05)',
  },
};

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
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

  const allItems = useMemo(() => {
    if (role === 'SUPER_ADMIN')   return superAdminItems;
    if (role === 'ANTENNA_ADMIN') return adminItems;
    if (role === 'MEMBER')        return memberItems;
    return [];
  }, [role]);

  const mainItems   = allItems.filter(i => !BOTTOM_SLUGS.some(s => i.href.endsWith('/' + s)));
  const bottomItems = allItems.filter(i =>  BOTTOM_SLUGS.some(s => i.href.endsWith('/' + s)));

  const colors = ROLE_COLORS[role ?? 'ANTENNA_ADMIN'] ?? ROLE_COLORS['ANTENNA_ADMIN'];

  async function handleLogout() {
    await logout(false);
    router.replace('/login');
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .sidebar {
          width: 224px; min-width: 224px;
          height: 100vh; position: sticky; top: 0;
          display: flex; flex-direction: column;
          background: rgba(255,255,255,0.94);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          border-right: 1px solid var(--sb-dim);
          box-shadow: 2px 0 18px var(--sb-dim);
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }
        @media (max-width: 768px) { .sidebar { display: none; } }

        /* ── Brand avec logo ── */
        .sb-brand {
          padding: 0.85rem 1rem;
          display: flex; align-items: center; gap: 0.65rem;
          border-bottom: 1px solid var(--sb-dim);
          flex-shrink: 0;
        }
        .sb-logo-img {
          width: 36px !important; height: 36px !important;
          border-radius: 9px; flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          object-fit: cover; display: block !important;
        }
        .sb-brand-text { display: flex; flex-direction: column; min-width: 0; }
        .sb-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.95rem; font-weight: 600; color: #111827;
          letter-spacing: -0.01em; line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sb-pill {
          font-size: 0.58rem; font-weight: 800; letter-spacing: 0.07em;
          text-transform: uppercase; padding: 0.1rem 0.42rem;
          border-radius: 99px; display: inline-flex;
          margin-top: 2px; width: fit-content;
        }

        /* ── Nav ── */
        .sb-nav {
          flex: 1; overflow-y: auto; padding: 0.55rem 0.6rem;
          scrollbar-width: none;
        }
        .sb-nav::-webkit-scrollbar { display: none; }

        .sb-link {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.52rem 0.7rem; border-radius: 9px;
          text-decoration: none; color: #4B5563;
          font-size: 0.78rem; font-weight: 500; line-height: 1;
          transition: background 0.14s, color 0.14s, transform 0.12s;
          margin-bottom: 1px; position: relative;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sb-link:hover {
          background: var(--sb-hover);
          color: var(--sb-accent);
          transform: translateX(2px);
        }
        .sb-link.active {
          background: var(--sb-dim);
          color: var(--sb-accent);
          font-weight: 700;
        }
        .sb-link.active::before {
          content: '';
          position: absolute; left: 0; top: 22%; bottom: 22%;
          width: 3px; border-radius: 0 3px 3px 0;
          background: var(--sb-accent);
        }
        .sb-ico { flex-shrink: 0; opacity: 0.65; transition: opacity 0.14s; }
        .sb-link:hover .sb-ico,
        .sb-link.active .sb-ico { opacity: 1; }

        .sb-bottom {
          padding: 0.55rem 0.6rem 0;
          border-top: 1px solid var(--sb-dim);
        }

        .sb-footer { padding: 0.5rem 0.6rem 0.7rem; }
        .sb-logout {
          display: flex; align-items: center; gap: 0.55rem;
          width: 100%; padding: 0.52rem 0.7rem; border-radius: 9px;
          border: none; background: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.76rem; font-weight: 700; color: #DC2626;
          transition: background 0.14s, transform 0.12s; text-align: left;
        }
        .sb-logout:hover { background: #FEF2F2; transform: translateX(2px); }
      `}</style>

      <aside
        className="sidebar"
        style={{
          '--sb-accent': colors.accent,
          '--sb-dim':    colors.dim,
          '--sb-hover':  colors.hoverBg,
        } as React.CSSProperties}
      >
        {/* ── Brand : logo + nom + rôle ── */}
        <div className="sb-brand">
          <Image
            src="/assets/images/logolcd.jpg"
            alt="Lélouma CD"
            width={36}
            height={36}
            className="sb-logo-img"
          />
          <div className="sb-brand-text">
            <div className="sb-name">Lélouma</div>
            <div
              className="sb-pill"
              style={{ background: colors.pillBg, color: colors.pillText }}
            >
              {colors.label}
            </div>
          </div>
        </div>

        {/* ── Nav principale ── */}
        <nav className="sb-nav">
          {mainItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sb-link${pathname === item.href ? ' active' : ''}`}
            >
              <span className="sb-ico">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* ── Profil / Paramètres ── */}
        {bottomItems.length > 0 && (
          <div className="sb-bottom">
            {bottomItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`sb-link${pathname === item.href ? ' active' : ''}`}
              >
                <span className="sb-ico">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        )}

        {/* ── Déconnexion ── */}
        <div className="sb-footer">
          <button className="sb-logout" onClick={handleLogout}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}