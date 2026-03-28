// web/components/layout/MobileNav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import { logout } from '../../lib/auth';
import type { UserRole } from '../../types/user';

function Ico({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24"
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
  creditCard: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', // Icône Dépenses
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
  logout:     'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
};

type NavItem = { href: string; label: string; ico: string; section?: string };

const superAdminItems: NavItem[] = [
  { href: '/super-admin',               label: 'Dashboard',             ico: ICO.home,       section: 'Principal' },
  { href: '/super-admin/antennas',      label: 'Antennes',              ico: ICO.pin,        section: 'Principal' },
  { href: '/super-admin/admins',        label: 'Admins antenne',        ico: ICO.users,      section: 'Principal' },
  { href: '/super-admin/members',       label: 'Membres',               ico: ICO.group,      section: 'Principal' },
  { href: '/super-admin/approvals',     label: 'Validations comptes',   ico: ICO.check,      section: 'Gestion' },
  { href: '/super-admin/contributions', label: 'Cotisations',           ico: ICO.coin,       section: 'Gestion' },
  { href: '/super-admin/expenses',      label: 'Dépenses',              ico: ICO.creditCard, section: 'Gestion' },
  { href: '/super-admin/projects',      label: 'Projets',               ico: ICO.clip,       section: 'Gestion' },
  { href: '/super-admin/sponsors',      label: 'Partenaires',           ico: ICO.users,      section: 'Gestion' },
  { href: '/super-admin/documents',     label: 'Documents',             ico: ICO.doc,        section: 'Gestion' },
  { href: '/super-admin/notifications', label: 'Notifications',         ico: ICO.bell,       section: 'Outils' },
  { href: '/super-admin/audit',         label: 'Audit',                 ico: ICO.audit,      section: 'Outils' },
  { href: '/super-admin/profile',       label: 'Mon profil',            ico: ICO.user,       section: 'Outils' },
  { href: '/super-admin/settings',      label: 'Paramètres',            ico: ICO.gear,       section: 'Outils' },
];

const adminItems: NavItem[] = [
  { href: '/admin',                      label: 'Dashboard',             ico: ICO.home,       section: 'Principal' },
  { href: '/admin/approvals',            label: 'Validations comptes',   ico: ICO.check,      section: 'Principal' },
  { href: '/admin/members',              label: 'Membres',               ico: ICO.group,      section: 'Principal' },
  { href: '/admin/contributions',        label: 'Cotisations',           ico: ICO.coin,       section: 'Finances' },
  { href: '/admin/contributions/history',label: 'Historique cotisations',ico: ICO.history,    section: 'Finances' },
  { href: '/admin/expenses',             label: 'Dépenses',              ico: ICO.creditCard, section: 'Finances' },
  { href: '/admin/projections',          label: 'Projections',           ico: ICO.chart,      section: 'Finances' },
  { href: '/admin/projects',             label: 'Projets',               ico: ICO.clip,       section: 'Contenu' },
  { href: '/admin/events',               label: 'Événements',            ico: ICO.bell,       section: 'Contenu' },
  { href: '/admin/documents',            label: 'Documents & photos',    ico: ICO.doc,        section: 'Contenu' },
  { href: '/admin/contents',             label: 'Informations',          ico: ICO.news,       section: 'Contenu' },
  { href: '/admin/late-members',         label: 'Retardataires +3 mois', ico: ICO.clock,      section: 'Contenu' },
  { href: '/admin/notifications',        label: 'Notifications',         ico: ICO.bell,       section: 'Outils' },
  { href: '/admin/audit',                label: 'Audit',                 ico: ICO.audit,      section: 'Outils' },
  { href: '/admin/settings',             label: 'Paramètres',            ico: ICO.gear,       section: 'Outils' },
  { href: '/admin/profile',              label: 'Mon profil',            ico: ICO.user,       section: 'Outils' },
];

const memberItems: NavItem[] = [
  { href: '/member',                       label: 'Dashboard',             ico: ICO.home,       section: 'Principal' },
  { href: '/member/contributions/new',     label: 'Faire un dépôt',        ico: ICO.plus,       section: 'Principal' },
  { href: '/member/contributions/history', label: 'Mes cotisations',       ico: ICO.coin,       section: 'Principal' },
  { href: '/member/expenses',              label: 'Dépenses',              ico: ICO.creditCard, section: 'Principal' },
  { href: '/member/projects',              label: 'Projets',               ico: ICO.clip,       section: 'Communauté' },
  { href: '/member/projects/propose',      label: 'Proposer un projet',    ico: ICO.edit,       section: 'Communauté' },
  { href: '/member/events',                label: 'Événements',            ico: ICO.bell,       section: 'Communauté' },
  { href: '/member/documents',             label: 'Documents & photos',    ico: ICO.doc,        section: 'Communauté' },
  { href: '/member/contents',              label: 'Informations',          ico: ICO.news,       section: 'Communauté' },
  { href: '/member/late-members',          label: 'Retardataires +3 mois', ico: ICO.clock,      section: 'Communauté' },
  { href: '/member/notifications',         label: 'Notifications',         ico: ICO.bell,       section: 'Compte' },
  { href: '/member/profile',               label: 'Mon profil',            ico: ICO.user,       section: 'Compte' },
  { href: '/member/settings',              label: 'Paramètres',            ico: ICO.gear,       section: 'Compte' },
];

const quickTabs: Record<string, { href: string; label: string; ico: string }[]> = {
  SUPER_ADMIN: [
    { href: '/super-admin',           label: 'Accueil', ico: ICO.home  },
    { href: '/super-admin/members',   label: 'Membres', ico: ICO.group },
    { href: '/super-admin/approvals', label: 'Comptes', ico: ICO.check },
    { href: '/super-admin/profile',   label: 'Profil',  ico: ICO.user  },
  ],
  ANTENNA_ADMIN: [
    { href: '/admin',               label: 'Accueil', ico: ICO.home },
    { href: '/admin/contributions', label: 'Cotis.',  ico: ICO.coin },
    { href: '/admin/projects',      label: 'Projets', ico: ICO.clip },
    { href: '/admin/profile',       label: 'Profil',  ico: ICO.user },
  ],
  MEMBER: [
    { href: '/member',                   label: 'Accueil', ico: ICO.home },
    { href: '/member/contributions/new', label: 'Dépôt',   ico: ICO.plus },
    { href: '/member/projects',          label: 'Projets', ico: ICO.clip },
    { href: '/member/profile',           label: 'Profil',  ico: ICO.user },
  ],
};

const ROLE_COLORS: Record<string, { accent: string; dim: string; pillBg: string; pillText: string; label: string }> = {
  SUPER_ADMIN:   { accent: '#DC2626', dim: 'rgba(220,38,38,0.12)',  pillBg: '#FEF2F2', pillText: '#B91C1C', label: 'Super Admin' },
  ANTENNA_ADMIN: { accent: '#2563EB', dim: 'rgba(37,99,235,0.12)',  pillBg: '#EFF6FF', pillText: '#1D4ED8', label: 'Admin antenne' },
  MEMBER:        { accent: '#059669', dim: 'rgba(5,150,105,0.12)',  pillBg: '#ECFDF5', pillText: '#047857', label: 'Membre' },
};

export function MobileNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [open, setOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);

  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

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
    return memberItems;
  }, [role]);

  const tabs   = useMemo(() => quickTabs[role ?? 'MEMBER'] ?? quickTabs['MEMBER'], [role]);
  const colors = ROLE_COLORS[role ?? 'MEMBER'] ?? ROLE_COLORS['MEMBER'];

  const sections = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const item of allItems) {
      const key = item.section ?? 'Autre';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [allItems]);

  const handleLogout = useCallback(async () => {
    setOpen(false);
    await logout(false);
    router.replace('/login');
  }, [router]);

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/member' && href !== '/admin' && href !== '/super-admin' && pathname.startsWith(href));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=DM+Sans:wght@400;500;600;700&display=swap');

        .mn-bar, .mn-drawer-overlay { display: none; }
        @media (max-width: 768px) {
          .mn-bar { display: flex; }
          .mn-drawer-overlay { display: block; }
        }

        /* ════ BOTTOM BAR ════ */
        .mn-bar {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          height: 64px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.06);
          padding: 0 0.35rem;
          padding-bottom: env(safe-area-inset-bottom, 0);
          align-items: center;
        }

        .mn-tab {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.575rem; font-weight: 600; letter-spacing: 0.02em;
          color: #9CA3AF;
          padding: 0.35rem 0.2rem 0.25rem;
          border-radius: 14px; margin: 0.3rem 0.1rem;
          transition: color 0.18s, background 0.18s, transform 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .mn-tab:active { transform: scale(0.9); }
        .mn-tab.active { color: var(--mn-accent); }
        .mn-tab.active .mn-tab-ico-wrap { background: var(--mn-dim); border-radius: 10px; }

        .mn-tab-ico-wrap {
          width: 36px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.18s;
        }

        .mn-tab.mn-cta .mn-tab-ico-wrap {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent)) !important;
          box-shadow: 0 4px 14px var(--mn-dim);
          margin-top: -10px; opacity: 0.9;
        }
        .mn-tab.mn-cta { color: #6B7280; }
        .mn-tab.mn-cta.active { color: var(--mn-accent); }
        .mn-tab.mn-cta .mn-tab-ico-wrap svg { color: white; width: 17px; height: 17px; }

        .mn-burger {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.575rem; font-weight: 600;
          color: #9CA3AF; padding: 0.35rem 0.2rem 0.25rem;
          border-radius: 14px; margin: 0.3rem 0.1rem;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.18s, transform 0.15s;
        }
        .mn-burger:active { transform: scale(0.9); }
        .mn-burger.open { color: var(--mn-accent); }
        .mn-burger.open .mn-tab-ico-wrap { background: var(--mn-dim); border-radius: 10px; }

        .mn-burger-lines {
          display: flex; flex-direction: column; gap: 3.5px;
          width: 17px; align-items: flex-end;
        }
        .mn-burger-line {
          height: 2px; background: currentColor; border-radius: 99px;
          transition: all 0.25s cubic-bezier(.22,1,.36,1);
          transform-origin: center;
        }
        .mn-burger-line:nth-child(1) { width: 17px; }
        .mn-burger-line:nth-child(2) { width: 12px; }
        .mn-burger-line:nth-child(3) { width: 17px; }
        .mn-burger.open .mn-burger-line:nth-child(1) { transform: translateY(5.5px) rotate(45deg); width: 17px; }
        .mn-burger.open .mn-burger-line:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .mn-burger.open .mn-burger-line:nth-child(3) { transform: translateY(-5.5px) rotate(-45deg); width: 17px; }

        /* ════ OVERLAY ════ */
        .mn-drawer-overlay {
          position: fixed; inset: 0; z-index: 48;
          background: rgba(15,23,42,0.4);
          backdrop-filter: blur(4px);
          transition: opacity 0.28s ease;
        }
        .mn-drawer-overlay.hidden  { opacity: 0; pointer-events: none; }
        .mn-drawer-overlay.visible { opacity: 1; }

        /* ════ DRAWER (Modern iOS Bottom Sheet style) ════ */
        .mn-drawer {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 49;
          background: #F8FAFC;
          border-radius: 24px 24px 0 0;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.12);
          max-height: 85vh;
          display: flex; flex-direction: column;
          transition: transform 0.32s cubic-bezier(.22,1,.36,1);
          padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
          font-family: 'DM Sans', sans-serif;
        }
        @media (min-width: 769px) { .mn-drawer { display: none; } }
        .mn-drawer.closed { transform: translateY(100%); }
        .mn-drawer.opened { transform: translateY(0); }

        .mn-handle {
          width: 40px; height: 5px; border-radius: 99px;
          background: #CBD5E1; margin: 10px auto 0; flex-shrink: 0;
        }

        .mn-drawer-head {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 1rem 1.25rem 0.85rem;
          background: #F8FAFC;
          flex-shrink: 0;
        }
        .mn-drawer-logo {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.2rem; font-weight: 700; color: white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        }
        .mn-drawer-appname {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.1rem; font-weight: 600; color: #111827;
          line-height: 1.1;
        }
        .mn-drawer-rolepill {
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 0.15rem 0.5rem;
          border-radius: 99px; display: inline-flex; margin-top: 3px;
        }        
        
        .mn-drawer-scroll {
          flex: 1; overflow-y: auto; padding: 0.5rem 1.25rem 1rem;
          scrollbar-width: none;
        }
        .mn-drawer-scroll::-webkit-scrollbar { display: none; }

        .mn-section-label {
          font-size: 0.65rem; font-weight: 800;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #64748B; padding: 0.5rem 0 0.4rem 0.5rem;
        }

        .mn-group {
          background: white; border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.03);
          margin-bottom: 1.25rem; overflow: hidden;
        }

        .mn-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.8rem 1rem;
          text-decoration: none; color: #334155;
          font-size: 0.85rem; font-weight: 600;
          border-bottom: 1px solid #F1F5F9;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .mn-link:last-child { border-bottom: none; }
        .mn-link:active { background: #F8FAFC; }
        .mn-link.active { color: var(--mn-accent); background: var(--mn-dim); }

        .mn-link-ico {
          width: 32px; height: 32px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; background: #F1F5F9; color: #64748B;
          transition: all 0.2s;
        }
        .mn-link.active .mn-link-ico { background: var(--mn-accent); color: white; }
        
        .mn-link-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .mn-link-chevron { color: #CBD5E1; display: flex; transition: color 0.2s; }
        .mn-link.active .mn-link-chevron { color: var(--mn-accent); }

        .mn-logout-group {
          background: white; border-radius: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.03);
          margin-bottom: 2rem; overflow: hidden;
        }
        .mn-logout {
          display: flex; align-items: center; gap: 0.75rem;
          width: 100%; padding: 0.8rem 1rem;
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; color: #DC2626;
          transition: background 0.15s; -webkit-tap-highlight-color: transparent; text-align: left;
        }
        .mn-logout:active { background: #FEF2F2; }
      `}</style>

      <div
        className={`mn-drawer-overlay ${open ? 'visible' : 'hidden'}`}
        onClick={() => setOpen(false)}
      />

      <div
        className={`mn-drawer ${open ? 'opened' : 'closed'}`}
        style={{ '--mn-accent': colors.accent, '--mn-dim': colors.dim } as React.CSSProperties}
      >
        <div className="mn-handle" />

        <div className="mn-drawer-head">
          <div
            className="mn-drawer-logo"
            style={{ background: `linear-gradient(135deg, ${colors.accent === '#DC2626' ? '#B91C1C' : colors.accent === '#059669' ? '#047857' : '#1D4ED8'}, ${colors.accent})` }}
          >
            L
          </div>
          <div>
            <div className="mn-drawer-appname">Lélouma</div>
            <div className="mn-drawer-rolepill" style={{ background: colors.pillBg, color: colors.pillText }}>
              {colors.label}
            </div>
          </div>
        </div>

        <div className="mn-drawer-scroll">
          {sections.map(([section, items]) => (
            <div key={section}>
              <div className="mn-section-label">{section}</div>
              <div className="mn-group">
                {items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mn-link${isActive(item.href) ? ' active' : ''}`}
                  >
                    <span className="mn-link-ico"><Ico d={item.ico} size={15} /></span>
                    <span className="mn-link-text">{item.label}</span>
                    <span className="mn-link-chevron">
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="mn-logout-group">
            <button className="mn-logout" onClick={handleLogout}>
              <span className="mn-link-ico" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                <Ico d={ICO.logout} size={15} />
              </span>
              <span className="mn-link-text">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      <nav
        className="mn-bar"
        style={{ '--mn-accent': colors.accent, '--mn-dim': colors.dim } as React.CSSProperties}
      >
        {tabs.map(tab => {
          const active = isActive(tab.href);
          const isCta  = tab.ico === ICO.plus;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mn-tab${active ? ' active' : ''}${isCta ? ' mn-cta' : ''}`}
            >
              <span className="mn-tab-ico-wrap">
                <Ico d={tab.ico} size={isCta ? 17 : 20} />
              </span>
              {tab.label}
            </Link>
          );
        })}

        <button
          className={`mn-burger${open ? ' open' : ''}`}
          onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <span className="mn-tab-ico-wrap">
            <div className="mn-burger-lines">
              <div className="mn-burger-line" />
              <div className="mn-burger-line" />
              <div className="mn-burger-line" />
            </div>
          </span>
          Menu
        </button>
      </nav>
    </>
  );
}