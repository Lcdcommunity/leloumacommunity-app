// web/components/layout/MobileNav.tsx
'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import type { UserRole } from '../../types/user';

function Ico({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  logout:     'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  calendar:   'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  star:       'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.382-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  send:       'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
};

type NavItem = { href: string; label: string; ico: string; section?: string };

const systemAdminItems: NavItem[] = [
  { href: '/system-admin',                  label: 'Dashboard SaaS',      ico: ICO.home,       section: 'Plateforme' },
  { href: '/system-admin/associations/new', label: 'Nouvelle Instance',   ico: ICO.plus,       section: 'Plateforme' },
  { href: '/system-admin/audit',            label: 'Logs Système',        ico: ICO.audit,      section: 'Sécurité' },
  { href: '/system-admin/profile',          label: 'Mon profil',          ico: ICO.user,       section: 'Compte' },
  { href: '/system-admin/settings',         label: 'Paramètres SaaS',     ico: ICO.gear,       section: 'Compte' },
];

const superAdminItems: NavItem[] = [
  { href: '/super-admin',                 label: 'Dashboard',              ico: ICO.home,       section: 'Principal' },
  { href: '/super-admin/antennas',        label: 'Antennes',               ico: ICO.pin,        section: 'Principal' },
  { href: '/super-admin/admins',          label: 'Admins antenne',         ico: ICO.users,      section: 'Principal' },
  { href: '/super-admin/members',         label: 'Membres',                ico: ICO.group,      section: 'Principal' },
  { href: '/super-admin/approvals',       label: 'Validations comptes',    ico: ICO.check,      section: 'Gestion' },
  { href: '/super-admin/contributions',   label: 'Cotisations',            ico: ICO.coin,       section: 'Gestion' },
  { href: '/super-admin/expenses',        label: 'Dépenses',               ico: ICO.creditCard, section: 'Gestion' },
  { href: '/super-admin/projects',        label: 'Projets',                ico: ICO.clip,       section: 'Gestion' },
  { href: '/super-admin/events',          label: 'Événements',             ico: ICO.calendar,   section: 'Gestion' },
  { href: '/super-admin/sponsors',        label: 'Partenaires',            ico: ICO.star,       section: 'Gestion' },
  { href: '/super-admin/documents',       label: 'Documents',              ico: ICO.doc,        section: 'Gestion' },
  { href: '/super-admin/contents',        label: 'Informations',           ico: ICO.news,       section: 'Gestion' },
  { href: '/super-admin/communication',   label: 'Envoi SMS & Push',       ico: ICO.send,       section: 'Outils' },
  { href: '/super-admin/notifications',   label: 'Notifications',          ico: ICO.bell,       section: 'Outils' },
  { href: '/super-admin/audit',           label: 'Audit',                  ico: ICO.audit,      section: 'Outils' },
  { href: '/super-admin/profile',         label: 'Mon profil',             ico: ICO.user,       section: 'Outils' },
  { href: '/super-admin/settings',        label: 'Paramètres',             ico: ICO.gear,       section: 'Outils' },
];

const adminItems: NavItem[] = [
  { href: '/admin',                       label: 'Dashboard',              ico: ICO.home,       section: 'Principal' },
  { href: '/admin/approvals',             label: 'Validations comptes',    ico: ICO.check,      section: 'Principal' },
  { href: '/admin/members',               label: 'Membres',                ico: ICO.group,      section: 'Principal' },
  { href: '/admin/contributions',         label: 'Cotisations',            ico: ICO.coin,       section: 'Finances' },
  { href: '/admin/contributions/history', label: 'Historique cotisations', ico: ICO.history,    section: 'Finances' },
  { href: '/admin/expenses',              label: 'Dépenses',               ico: ICO.creditCard, section: 'Finances' },
  { href: '/admin/projections',           label: 'Projections',            ico: ICO.chart,      section: 'Finances' },
  { href: '/admin/projects',              label: 'Projets',                ico: ICO.clip,       section: 'Contenu' },
  { href: '/admin/events',                label: 'Événements',             ico: ICO.calendar,   section: 'Contenu' },
  { href: '/admin/documents',             label: 'Documents & photos',     ico: ICO.doc,        section: 'Contenu' },
  { href: '/admin/contents',              label: 'Informations',           ico: ICO.news,       section: 'Contenu' },
  { href: '/admin/late-members',          label: 'Retardataires +3 mois',  ico: ICO.clock,      section: 'Contenu' },
  { href: '/admin/communication',         label: 'Envoi SMS & Push',       ico: ICO.send,       section: 'Outils' },
  { href: '/admin/notifications',         label: 'Notifications',          ico: ICO.bell,       section: 'Outils' },
  { href: '/admin/audit',                 label: 'Audit',                  ico: ICO.audit,      section: 'Outils' },
  { href: '/admin/settings',              label: 'Paramètres',             ico: ICO.gear,       section: 'Outils' },
  { href: '/admin/profile',               label: 'Mon profil',             ico: ICO.user,       section: 'Outils' },
];

const memberItems: NavItem[] = [
  { href: '/member',                       label: 'Dashboard',              ico: ICO.home,       section: 'Principal' },
  { href: '/member/contributions/new',     label: 'Faire un dépôt',         ico: ICO.plus,       section: 'Principal' },
  { href: '/member/contributions/history', label: 'Mes cotisations',        ico: ICO.coin,       section: 'Principal' },
  { href: '/member/expenses',              label: 'Dépenses',               ico: ICO.creditCard, section: 'Principal' },
  { href: '/member/projects',              label: 'Projets',                ico: ICO.clip,       section: 'Communauté' },
  { href: '/member/projects/propose',      label: 'Proposer un projet',     ico: ICO.edit,       section: 'Communauté' },
  { href: '/member/events',                label: 'Événements',             ico: ICO.calendar,   section: 'Communauté' },
  { href: '/member/documents',             label: 'Documents & photos',     ico: ICO.doc,        section: 'Communauté' },
  { href: '/member/contents',              label: 'Informations',           ico: ICO.news,       section: 'Communauté' },
  { href: '/member/late-members',          label: 'Retardataires +3 mois',  ico: ICO.clock,      section: 'Communauté' },
  { href: '/member/notifications',         label: 'Notifications',          ico: ICO.bell,       section: 'Compte' },
  { href: '/member/profile',               label: 'Mon profil',             ico: ICO.user,       section: 'Compte' },
  { href: '/member/settings',              label: 'Paramètres',             ico: ICO.gear,       section: 'Compte' },
];

const quickTabs: Record<string, { href: string; label: string; ico: string }[]> = {
  SYSTEM_ADMIN: [
    { href: '/system-admin',                  label: 'SaaS',    ico: ICO.home  },
    { href: '/system-admin/associations/new', label: 'Instance',ico: ICO.plus  },
    { href: '/system-admin/audit',            label: 'Logs',    ico: ICO.audit },
    { href: '/system-admin/profile',          label: 'Profil',  ico: ICO.user  },
  ],
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

// Couleurs du Neumorphic Glow (Lueur LED)
const ROLE_COLORS: Record<string, { accent: string; dim: string; pillBg: string; pillText: string; label: string; shadow: string }> = {
  SYSTEM_ADMIN:  { accent: '#8B5CF6', dim: 'rgba(139,92,246,0.15)', pillBg: '#F5F3FF', pillText: '#7C3AED', label: 'Grand Chef', shadow: 'rgba(139,92,246,0.5)' },
  SUPER_ADMIN:   { accent: '#EF4444', dim: 'rgba(239,68,68,0.15)',  pillBg: '#FEF2F2', pillText: '#B91C1C', label: 'Super Admin', shadow: 'rgba(239,68,68,0.5)' },
  ANTENNA_ADMIN: { accent: '#3B82F6', dim: 'rgba(59,130,246,0.15)',  pillBg: '#EFF6FF', pillText: '#1D4ED8', label: 'Admin antenne', shadow: 'rgba(59,130,246,0.5)' },
  MEMBER:        { accent: '#10B981', dim: 'rgba(16,185,129,0.15)',  pillBg: '#ECFDF5', pillText: '#047857', label: 'Membre', shadow: 'rgba(16,185,129,0.5)' },
};

export function MobileNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [associationName, setAssociationName] = useState('Plateforme');
  const [open, setOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  const [unreadCount, setUnreadCount] = useState(0);

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
        if (!mounted) return;
        setRole(me.role);
        if (me.association?.name) {
          setAssociationName(me.association.name);
        } else if (me.role !== 'SYSTEM_ADMIN') {
          const assoc = await api.getAssociation();
          if (mounted && assoc?.name) setAssociationName(assoc.name);
        }
      } catch { if (mounted) setRole(null); }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await api.listMyNotifications();
        if (!mounted) return;
        const data = Array.isArray(res) ? res : (res?.items || []);
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [pathname, open]);

  const allItems = useMemo(() => {
    if (role === 'SYSTEM_ADMIN')  return systemAdminItems;
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

  const handleLogout = useCallback(() => {
    setOpen(false);
    router.push('/logout');
  }, [router]);

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/member' && href !== '/admin' && href !== '/super-admin' && href !== '/system-admin' && pathname.startsWith(href));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');

        /* ════ MASQUER SUR DESKTOP ════ */
        @media (min-width: 769px) {
          .mn-container, .mn-overlay, .mn-drawer { 
            display: none !important; 
          }
        }
        
        /* ════ NEUMORPHIC FLOATING PILL ════ */
        .mn-container {
          position: fixed; 
          bottom: calc(1rem + env(safe-area-inset-bottom, 0)); 
          left: 1rem; 
          right: 1rem; 
          z-index: 50;
          height: 64px;
          
          /* Neumorphic Base */
          background: #F0F3F7; /* Gris très doux */
          border-radius: 32px;
          
          /* Soft Shadows for Floating Neumorphism */
          box-shadow: 
            6px 6px 16px rgba(163, 177, 198, 0.4), 
            -6px -6px 16px rgba(255, 255, 255, 0.9),
            inset 1px 1px 2px rgba(255, 255, 255, 0.6),
            inset -1px -1px 2px rgba(163, 177, 198, 0.1);
          
          padding: 0 0.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* ════ TABS ════ */
        .mn-tab {
          flex: 1; 
          height: 52px;
          display: flex; 
          flex-direction: column;
          align-items: center; 
          justify-content: center; 
          text-decoration: none;
          color: #9CA3AF;
          border-radius: 20px; 
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          -webkit-tap-highlight-color: transparent;
        }

        /* L'icône par défaut */
        .mn-tab-ico-wrap {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        /* Le texte caché par défaut */
        .mn-tab-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.6rem; 
          font-weight: 700;
          letter-spacing: 0.03em;
          opacity: 0;
          transform: translateY(10px) scale(0.8);
          position: absolute;
          bottom: 4px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }

        /* Interaction au clic (Active) */
        .mn-tab.active {
          color: var(--mn-accent);
          /* Inset shadow to look "pressed" */
          background: #E8EDF2;
          box-shadow: 
            inset 4px 4px 8px rgba(163, 177, 198, 0.3), 
            inset -4px -4px 8px rgba(255, 255, 255, 0.8);
        }

        .mn-tab.active .mn-tab-ico-wrap {
          transform: translateY(-8px);
          color: var(--mn-accent);
        }

        .mn-tab.active .mn-tab-label {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* 💡 THE GLOW (Lueur LED Neumorphique) */
        .mn-glow {
          position: absolute;
          bottom: 2px;
          width: 24px;
          height: 3px;
          border-radius: 99px;
          background: var(--mn-accent);
          opacity: 0;
          transform: scaleX(0);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          /* Lueur LED intense */
          box-shadow: 0 0 10px 1px var(--mn-shadow), 0 0 20px 2px var(--mn-shadow);
        }
        
        .mn-tab.active .mn-glow {
          opacity: 1;
          transform: scaleX(1);
        }

        /* ════ CENTER FAB (Guinea Flag Neumorphism) ════ */
        .mn-fab-container {
          position: relative;
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -24px; /* Déborde vers le haut */
        }

        .mn-fab {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          overflow: hidden;
          
          /* Neumorphic base for the FAB itself */
          background: #F0F3F7; 
          box-shadow: 
            inset 2px 2px 4px rgba(255,255,255,0.7),
            inset -2px -2px 4px rgba(163,177,198,0.2),
            0 8px 18px rgba(163, 177, 198, 0.4);
        }

        .mn-fab:active {
          transform: scale(0.92);
          box-shadow: 0 4px 10px rgba(163, 177, 198, 0.3);
        }

        .mn-fab.open {
          color: var(--mn-accent);
          background: #E8EDF2;
          box-shadow: 
            inset 4px 4px 8px rgba(163, 177, 198, 0.4), 
            inset -4px -4px 8px rgba(255, 255, 255, 0.9);
        }

        /* 🇬🇳 THE GUINEA FLAG NEUMORPHIC CIRCLE */
        .mn-guinea-flag {
          width: 100%; height: 100%; border-radius: 50%;
          display: flex; overflow: hidden;
          transition: opacity 0.3s ease;
        }
        .mn-fab.open .mn-guinea-flag { opacity: 0; position: absolute; } /* Masqué quand ouvert */

        .mn-flag-red, .mn-flag-yellow, .mn-flag-green { flex: 1; height: 100%; position: relative; }
        .mn-flag-red { background: #EF4444; }
        .mn-flag-yellow { background: #FBBF24; }
        .mn-flag-green { background: #10B981; }

        /* Effet "creusé" neumorphique à l'intérieur du drapeau */
        .mn-guinea-flag::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          box-shadow: 
            inset 8px 8px 16px rgba(163, 177, 198, 0.2), 
            inset -8px -8px 16px rgba(255, 255, 255, 0.3),
            inset 2px 2px 4px rgba(0,0,0,0.1),
            inset -2px -2px 4px rgba(255,255,255,0.1);
        }
        
        /* 💡 THE GLOW (Lueur LED pour le drapeau) */
        .mn-guinea-glow {
          position: absolute; inset: -4px; border-radius: 50%; z-index: -1;
          box-shadow: 0 0 15px 1px rgba(251,191,36,0.6); /* Glow doré de base */
          transition: box-shadow 0.3s ease;
        }
        .mn-fab:hover .mn-guinea-glow {
          box-shadow: 0 0 25px 3px rgba(251,191,36,0.8); /* Glow doré intense au survol */
        }

        /* ════ NOTIFICATION BADGE ════ */
        .mn-badge-dot {
          position: absolute; 
          top: 0px; 
          right: 0px; 
          width: 12px; 
          height: 12px;
          background: #EF4444; 
          border: 2px solid #F0F3F7; 
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(239,68,68,0.6);
        }
        
        .mn-tab .mn-badge-dot { top: 0; right: 0; border-color: #F0F3F7; }
        
        .mn-fab .mn-badge-dot {
           top: -4px; right: -4px; border-color: transparent;
           box-shadow: 0 0 8px rgba(239,68,68,0.8);
        }

        .mn-badge-count {
          background: #EF4444; color: white; font-size: 0.65rem; font-weight: 800;
          padding: 0.15rem 0.45rem; border-radius: 99px; line-height: 1;
          box-shadow: 0 2px 6px rgba(239,68,68,0.3);
        }

        /* ════ OVERLAY ════ */
        .mn-overlay {
          position: fixed; inset: 0; z-index: 48;
          background: rgba(240, 243, 247, 0.7);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: opacity 0.3s ease;
        }
        .mn-overlay.hidden  { opacity: 0; pointer-events: none; }
        .mn-overlay.visible { opacity: 1; }

        /* ════ NEUMORPHIC DRAWER ════ */
        .mn-drawer {
          position: fixed; 
          bottom: 100px; /* Au-dessus de la pilule */
          left: 1rem; 
          right: 1rem; 
          z-index: 49;
          background: #F0F3F7;
          border-radius: 32px;
          box-shadow: 
            10px 10px 30px rgba(163, 177, 198, 0.4), 
            -10px -10px 30px rgba(255, 255, 255, 0.9),
            inset 1px 1px 2px rgba(255, 255, 255, 0.6);
          max-height: calc(100vh - 140px);
          display: flex; flex-direction: column;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); /* Elastic Bouncing */
          transform-origin: bottom center;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }
        
        .mn-drawer.closed { 
          transform: translateY(20px) scale(0.95); 
          opacity: 0; 
          pointer-events: none; 
        }
        .mn-drawer.opened { 
          transform: translateY(0) scale(1); 
          opacity: 1; 
        }

        .mn-drawer-head {
          display: flex; align-items: center; gap: 0.8rem;
          padding: 1.5rem 1.5rem 1rem;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(163, 177, 198, 0.15);
        }
        .mn-drawer-logo {
          width: 44px; height: 44px; border-radius: 14px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.4rem; font-weight: 700; color: white;
          box-shadow: 0 4px 12px var(--mn-shadow);
          text-transform: uppercase;
          background: linear-gradient(135deg, var(--mn-accent), var(--mn-accent));
        }
        .mn-drawer-appname {
          font-size: 1.1rem; font-weight: 800; color: #111827;
          line-height: 1.1; letter-spacing: -0.02em;
        }
        .mn-drawer-rolepill {
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.05em;
          text-transform: uppercase; padding: 0.2rem 0.6rem;
          border-radius: 99px; display: inline-flex; margin-top: 4px;
        }        
        
        .mn-drawer-scroll {
          flex: 1; overflow-y: auto; padding: 0.5rem 1.5rem 1.5rem;
          scrollbar-width: none;
        }
        .mn-drawer-scroll::-webkit-scrollbar { display: none; }

        .mn-section-label {
          font-size: 0.65rem; font-weight: 800;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #9CA3AF; padding: 1rem 0 0.5rem 0.5rem;
        }

        .mn-group {
          background: #F0F3F7; 
          border-radius: 20px;
          box-shadow: 
            inset 4px 4px 8px rgba(163, 177, 198, 0.3), 
            inset -4px -4px 8px rgba(255, 255, 255, 0.8);
          margin-bottom: 0.5rem; overflow: hidden;
          padding: 0.5rem;
        }

        .mn-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.85rem;
          text-decoration: none; color: #4B5563;
          font-size: 0.85rem; font-weight: 600;
          border-radius: 14px;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        
        .mn-link:active { 
          background: rgba(163, 177, 198, 0.15); 
        }
        
        .mn-link.active { 
          color: var(--mn-accent); 
          background: white;
          box-shadow: 0 2px 8px rgba(163, 177, 198, 0.2);
        }

        .mn-link-ico {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: #9CA3AF;
          transition: all 0.2s;
        }
        .mn-link.active .mn-link-ico { 
          background: var(--mn-dim); 
          color: var(--mn-accent); 
        }
        
        .mn-link-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .mn-logout-group {
          margin-top: 2rem;
        }
        .mn-logout {
          display: flex; align-items: center; gap: 0.75rem;
          width: 100%; padding: 1rem;
          background: #F0F3F7; 
          border-radius: 20px;
          box-shadow: 
            6px 6px 12px rgba(163, 177, 198, 0.3), 
            -6px -6px 12px rgba(255, 255, 255, 0.8);
          border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 800; color: #DC2626;
          transition: all 0.2s; -webkit-tap-highlight-color: transparent; text-align: left;
        }
        .mn-logout:active { 
          box-shadow: 
            inset 4px 4px 8px rgba(163, 177, 198, 0.3), 
            inset -4px -4px 8px rgba(255, 255, 255, 0.8);
        }
      `}</style>

      {/* Overlay global flouté */}
      <div
        className={`mn-overlay ${open ? 'visible' : 'hidden'}`}
        onClick={() => setOpen(false)}
      />

      {/* Le Menu Neumorphique (S'ouvre vers le haut) */}
      <div
        className={`mn-drawer ${open ? 'opened' : 'closed'}`}
        style={{ '--mn-accent': colors.accent, '--mn-dim': colors.dim, '--mn-shadow': colors.shadow } as React.CSSProperties}
      >
        <div className="mn-drawer-head">
          <div className="mn-drawer-logo">
            {associationName.charAt(0)}
          </div>
          <div>
            <div className="mn-drawer-appname">{role === 'SYSTEM_ADMIN' ? 'LCD Platform' : associationName}</div>
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
                {items.map(item => {
                  const isNotifLink = item.href.includes('/notifications');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`mn-link${isActive(item.href) ? ' active' : ''}`}
                    >
                      <span className="mn-link-ico"><Ico d={item.ico} size={18} /></span>
                      <span className="mn-link-text">{item.label}</span>

                      {isNotifLink && unreadCount > 0 && (
                        <span className="mn-badge-count">{unreadCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mn-logout-group">
            <button className="mn-logout" onClick={handleLogout}>
              <span className="mn-link-ico" style={{ color: '#DC2626' }}>
                <Ico d={ICO.logout} size={20} />
              </span>
              <span className="mn-link-text">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* La Pilule Flottante Principale */}
      <nav
        className="mn-container"
        style={{ '--mn-accent': colors.accent, '--mn-dim': colors.dim, '--mn-shadow': colors.shadow } as React.CSSProperties}
      >
        {tabs.map((tab, index) => {
          const active = isActive(tab.href);
          
          return (
            <React.Fragment key={`frag-${tab.href}`}>
              {/* On insère le bouton FAB central pile au milieu des onglets (index 2) */}
              {index === 2 && (
                <div className="mn-fab-container">
                  <button
                    className={`mn-fab ${open ? 'open' : ''}`}
                    onClick={() => setOpen(v => !v)}
                    aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
                  >
                    {/* 🇬🇳 THE GUINEA FLAG NEUMORPHIC CIRCLE */}
                    <div className="mn-guinea-flag">
                      <div className="mn-flag-red" />
                      <div className="mn-flag-yellow" />
                      <div className="mn-flag-green" />
                    </div>

                    {/* Icône x quand ouvert, remplace le drapeau */}
                    {open && (
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ zIndex: 3 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    
                    {/* 💡 THE GLOW (Lueur LED Neumorphique pour le drapeau) */}
                    {!open && <div className="mn-guinea-glow" />}

                    {/* Badge de notification central */}
                    {unreadCount > 0 && !open && <div className="mn-badge-dot" />}
                  </button>
                </div>
              )}
              
              <Link href={tab.href} className={`mn-tab ${active ? 'active' : ''}`}>
                <span className="mn-tab-ico-wrap">
                  <Ico d={tab.ico} size={22} />
                  {tab.href.includes('/notifications') && unreadCount > 0 && <div className="mn-badge-dot" />}
                </span>
                <span className="mn-tab-label">{tab.label}</span>
                {/* Lueur LED Neumorphique */}
                <div className="mn-glow" />
              </Link>
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}