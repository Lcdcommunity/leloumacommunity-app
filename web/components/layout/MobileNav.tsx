// web/components/layout/MobileNav.tsx
'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import type { UserRole } from '../../types/user';

function Ico({ d, size = 20 }: { d: string | string[]; size?: number }) {
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      width={size}
      height={size}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

const ICO = {
  home:        ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  pin:         ['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z', 'M12 13a3 3 0 100-6 3 3 0 000 6z'],
  users:       ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8z', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  group:       ['M12 11a4 4 0 100-8 4 4 0 000 8z', 'M6 21v-1a6 6 0 0112 0v1'],
  shieldCheck: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', 'M9 12l2 2 4-4'],
  coin:        ['M12 1v22', 'M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6'],
  creditCard:  ['M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2z', 'M1 10h22'],
  clipboard:   ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', 'M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M9 12h6', 'M9 16h4'],
  fileText:    ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'],
  bell:        ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 01-3.46 0'],
  settings:    ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  clock:       ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 6v6l4 2'],
  chartBar:    ['M18 20V10', 'M12 20V4', 'M6 20v-6'],
  newspaper:   ['M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a4 4 0 01-4-4V6a2 2 0 012-2', 'M10 7h8', 'M10 11h8', 'M10 15h4'],
  plus:        ['M12 5v14', 'M5 12h14'],
  penLine:     ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4z'],
  user:        ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'],
  logout:      ['M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  calendar:    ['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
  star:        ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'],
  send:        ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'],
  auditLog:    ['M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2', 'M9 5a2 2 0 012-2h2a2 2 0 012 2', 'M10 12h4', 'M10 16h2'],
  history:     ['M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  close:       ['M18 6L6 18M6 6l12 12'],
  vote:        ['M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'],
  // 🔥 NOUVEAUX ICÔNES pour les pages créées
  lightbulb:   ['M9 21h6', 'M12 3a6 6 0 016 6c0 2.22-1.2 4.16-3 5.2V17a1 1 0 01-1 1H10a1 1 0 01-1-1v-2.8C7.2 13.16 6 11.22 6 9a6 6 0 016-6z'],
  trendingUp:  ['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6'],
};

type NavItem = { href: string; label: string; ico: string | string[]; section?: string };

const systemAdminItems: NavItem[] = [
  { href: '/system-admin',                  label: 'Dashboard SaaS',      ico: ICO.home,       section: 'Plateforme' },
  { href: '/system-admin/associations/new', label: 'Nouvelle Instance',   ico: ICO.plus,       section: 'Plateforme' },
  { href: '/system-admin/audit',            label: 'Logs Système',        ico: ICO.auditLog,   section: 'Sécurité'   },
  { href: '/system-admin/profile',          label: 'Mon profil',          ico: ICO.user,       section: 'Compte'     },
  { href: '/system-admin/settings',         label: 'Paramètres SaaS',     ico: ICO.settings,   section: 'Compte'     },
];

const superAdminItems: NavItem[] = [
  { href: '/super-admin',                 label: 'Dashboard',              ico: ICO.home,        section: 'Principal' },
  { href: '/super-admin/antennas',        label: 'Antennes',               ico: ICO.pin,         section: 'Principal' },
  { href: '/super-admin/admins',          label: 'Admins antenne',         ico: ICO.users,       section: 'Principal' },
  { href: '/super-admin/members',         label: 'Membres',                ico: ICO.group,       section: 'Principal' },
  { href: '/super-admin/approvals',       label: 'Validations comptes',    ico: ICO.shieldCheck, section: 'Gestion'   },
  { href: '/super-admin/contributions',   label: 'Cotisations',            ico: ICO.coin,        section: 'Gestion'   },
  { href: '/super-admin/expenses',        label: 'Dépenses',               ico: ICO.creditCard,  section: 'Gestion'   },
  { href: '/super-admin/projects',        label: 'Projets',                ico: ICO.clipboard,   section: 'Gestion'   },
  { href: '/super-admin/elections',       label: 'Élections',              ico: ICO.vote,        section: 'Gestion'   },
  { href: '/super-admin/events',          label: 'Événements',             ico: ICO.calendar,    section: 'Gestion'   },
  { href: '/super-admin/sponsors',        label: 'Partenaires',            ico: ICO.star,        section: 'Gestion'   },
  { href: '/super-admin/documents',       label: 'Documents',              ico: ICO.fileText,    section: 'Gestion'   },
  { href: '/super-admin/contents',        label: 'Informations',           ico: ICO.newspaper,   section: 'Gestion'   },
  { href: '/super-admin/communication',   label: 'Envoi SMS & Push',       ico: ICO.send,        section: 'Outils'    },
  { href: '/super-admin/notifications',   label: 'Notifications',          ico: ICO.bell,        section: 'Outils'    },
  { href: '/super-admin/audit',           label: 'Audit',                  ico: ICO.auditLog,    section: 'Outils'    },
  { href: '/super-admin/profile',         label: 'Mon profil',             ico: ICO.user,        section: 'Outils'    },
  { href: '/super-admin/settings',        label: 'Paramètres',             ico: ICO.settings,    section: 'Outils'    },
];

const adminItems: NavItem[] = [
  { href: '/admin',                           label: 'Dashboard',              ico: ICO.home,        section: 'Principal' },
  { href: '/admin/approvals',                 label: 'Validations comptes',    ico: ICO.shieldCheck, section: 'Principal' },
  { href: '/admin/members',                   label: 'Membres',                ico: ICO.group,       section: 'Principal' },
  { href: '/admin/contributions',             label: 'Cotisations',            ico: ICO.coin,        section: 'Finances'  },
  { href: '/admin/contributions/history',     label: 'Historique cotisations', ico: ICO.history,     section: 'Finances'  },
  { href: '/admin/expenses',                  label: 'Dépenses',               ico: ICO.creditCard,  section: 'Finances'  },
  { href: '/admin/projections',               label: 'Projections',            ico: ICO.chartBar,    section: 'Finances'  },
  { href: '/admin/projects',                  label: 'Projets',                ico: ICO.clipboard,   section: 'Contenu'   },
  // 🔥 NOUVEAU : Propositions de projets reçues des membres
  { href: '/admin/project-proposals',         label: 'Propositions membres',   ico: ICO.lightbulb,   section: 'Contenu'   },
  { href: '/admin/elections',                 label: 'Élections',              ico: ICO.vote,        section: 'Contenu'   },
  { href: '/admin/events',                    label: 'Événements',             ico: ICO.calendar,    section: 'Contenu'   },
  { href: '/admin/documents',                 label: 'Documents & photos',     ico: ICO.fileText,    section: 'Contenu'   },
  { href: '/admin/contents',                  label: 'Informations',           ico: ICO.newspaper,   section: 'Contenu'   },
  { href: '/admin/late-members',              label: 'Retardataires +3 mois',  ico: ICO.clock,       section: 'Contenu'   },
  // 🔥 NOUVEAU : Partenaires en lecture seule
  { href: '/admin/sponsors',                  label: 'Partenaires',            ico: ICO.star,        section: 'Contenu'   },
  { href: '/admin/communication',             label: 'Envoi SMS & Push',       ico: ICO.send,        section: 'Outils'    },
  { href: '/admin/notifications',             label: 'Notifications',          ico: ICO.bell,        section: 'Outils'    },
  { href: '/admin/audit',                     label: 'Audit',                  ico: ICO.auditLog,    section: 'Outils'    },
  { href: '/admin/settings',                  label: 'Paramètres',             ico: ICO.settings,    section: 'Outils'    },
  { href: '/admin/profile',                   label: 'Mon profil',             ico: ICO.user,        section: 'Outils'    },
];

const memberItems: NavItem[] = [
  { href: '/member',                           label: 'Dashboard',              ico: ICO.home,       section: 'Principal'  },
  { href: '/member/contributions/new',         label: 'Faire un dépôt',         ico: ICO.plus,       section: 'Principal'  },
  { href: '/member/contributions/history',     label: 'Mes cotisations',        ico: ICO.coin,       section: 'Principal'  },
  { href: '/member/expenses',                  label: 'Dépenses',               ico: ICO.creditCard, section: 'Principal'  },
  { href: '/member/projects',                  label: 'Projets',                ico: ICO.clipboard,  section: 'Communauté' },
  { href: '/member/projects/propose',          label: 'Proposer un projet',     ico: ICO.penLine,    section: 'Communauté' },
  // 🔥 NOUVEAU : Simulation financière (ProjectionForm identique à l'admin)
  { href: '/member/projects/projection',       label: 'Simulation financière',  ico: ICO.trendingUp, section: 'Communauté' },
  { href: '/member/elections',                 label: 'Espace Élections',       ico: ICO.vote,       section: 'Communauté' },
  { href: '/member/events',                    label: 'Événements',             ico: ICO.calendar,   section: 'Communauté' },
  { href: '/member/documents',                 label: 'Documents & photos',     ico: ICO.fileText,   section: 'Communauté' },
  { href: '/member/contents',                  label: 'Informations',           ico: ICO.newspaper,  section: 'Communauté' },
  { href: '/member/late-members',              label: 'Retardataires +3 mois',  ico: ICO.clock,      section: 'Communauté' },
  // 🔥 NOUVEAU : Partenaires en lecture seule
  { href: '/member/sponsors',                  label: 'Partenaires',            ico: ICO.star,       section: 'Communauté' },
  { href: '/member/notifications',             label: 'Notifications',          ico: ICO.bell,       section: 'Compte'     },
  { href: '/member/profile',                   label: 'Mon profil',             ico: ICO.user,       section: 'Compte'     },
  { href: '/member/settings',                  label: 'Paramètres',             ico: ICO.settings,   section: 'Compte'     },
];

const quickTabs: Record<string, { href: string; label: string; ico: string | string[] }[]> = {
  SYSTEM_ADMIN: [
    { href: '/system-admin',                  label: 'SaaS',     ico: ICO.home     },
    { href: '/system-admin/associations/new', label: 'Instance', ico: ICO.plus     },
    { href: '/system-admin/audit',            label: 'Logs',     ico: ICO.auditLog },
    { href: '/system-admin/profile',          label: 'Profil',   ico: ICO.user     },
  ],
  SUPER_ADMIN: [
    { href: '/super-admin',           label: 'Accueil', ico: ICO.home        },
    { href: '/super-admin/members',   label: 'Membres', ico: ICO.group       },
    { href: '/super-admin/approvals', label: 'Comptes', ico: ICO.shieldCheck },
    { href: '/super-admin/profile',   label: 'Profil',  ico: ICO.user        },
  ],
  ANTENNA_ADMIN: [
    { href: '/admin',                       label: 'Accueil',     ico: ICO.home        },
    { href: '/admin/contributions',         label: 'Cotis.',      ico: ICO.coin        },
    { href: '/admin/project-proposals',     label: 'Propositions',ico: ICO.lightbulb   },
    { href: '/admin/profile',               label: 'Profil',      ico: ICO.user        },
  ],
  MEMBER: [
    { href: '/member',                       label: 'Accueil', ico: ICO.home      },
    { href: '/member/contributions/new',     label: 'Dépôt',   ico: ICO.plus      },
    { href: '/member/projects/propose',      label: 'Proposer',ico: ICO.penLine   },
    { href: '/member/profile',               label: 'Profil',  ico: ICO.user      },
  ],
};

type RoleColorEntry = {
  accent: string;
  dim: string;
  pillBg: string;
  pillText: string;
  label: string;
  shadow: string;
};

const ROLE_COLORS: Record<string, RoleColorEntry> = {
  SYSTEM_ADMIN:  { accent: '#8B5CF6', dim: 'rgba(139,92,246,0.15)',  pillBg: '#F5F3FF', pillText: '#7C3AED', label: 'Grand Chef',   shadow: 'rgba(139,92,246,0.4)'  },
  SUPER_ADMIN:   { accent: '#EF4444', dim: 'rgba(239,68,68,0.15)',   pillBg: '#FEF2F2', pillText: '#B91C1C', label: 'Super Admin',  shadow: 'rgba(239,68,68,0.4)'   },
  ANTENNA_ADMIN: { accent: '#3B82F6', dim: 'rgba(59,130,246,0.15)',  pillBg: '#EFF6FF', pillText: '#1D4ED8', label: 'Admin antenne',shadow: 'rgba(59,130,246,0.4)'  },
  MEMBER:        { accent: '#10B981', dim: 'rgba(16,185,129,0.15)',  pillBg: '#ECFDF5', pillText: '#047857', label: 'Membre',       shadow: 'rgba(16,185,129,0.4)'  },
};

export function MobileNav() {
  const pathname = usePathname();
  const router   = useRouter();

  const [role, setRole]                       = useState<UserRole | null>(null);
  const [associationName, setAssociationName] = useState('Plateforme');
  const [open, setOpen]                       = useState(false);
  const [prevPath, setPrevPath]               = useState(pathname);
  const [unreadCount, setUnreadCount]         = useState(0);

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
      } catch {
        if (mounted) setRole(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const res = await api.listMyNotifications();
        if (!mounted) return;
        const data = Array.isArray(res) ? res : (res?.items ?? []);
        setUnreadCount(data.filter((n: { isRead: boolean }) => !n.isRead).length);
      } catch { /* silence */ }
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
    (
      href !== '/member' &&
      href !== '/admin' &&
      href !== '/super-admin' &&
      href !== '/system-admin' &&
      pathname.startsWith(href)
    );

  const cssVars = {
    '--mn-accent': colors.accent,
    '--mn-dim':    colors.dim,
    '--mn-shadow': colors.shadow,
  } as React.CSSProperties;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:opsz,wght@9..40,400;500;600;700;800&display=swap');

        /* ════ MASQUER SUR DESKTOP ════ */
        @media (min-width: 769px) {
          .mn-safe-area, .mn-container, .mn-overlay, .mn-drawer { display: none !important; }
        }

        .mn-safe-area {
          padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
        }

        /* ════ OVERLAY ════ */
        .mn-overlay {
          position: fixed; inset: 0; z-index: 48;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          transition: opacity 0.25s ease;
        }
        .mn-overlay.hidden  { opacity: 0; pointer-events: none; }
        .mn-overlay.visible { opacity: 1; }

        /* ════ DRAWER ════ */
        .mn-drawer {
          position: fixed;
          bottom: calc(76px + env(safe-area-inset-bottom, 12px));
          left: 0.75rem; right: 0.75rem;
          z-index: 49;
          background: #FFFFFF;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow:
            0 -4px 6px rgba(0,0,0,0.03),
            0 20px 60px rgba(0,0,0,0.15),
            0 0 0 1px rgba(255,255,255,0.9) inset;
          max-height: calc(100dvh - 140px);
          display: flex; flex-direction: column;
          transition: transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.25s ease;
          transform-origin: bottom center;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }
        .mn-drawer.closed {
          transform: translateY(16px) scale(0.97);
          opacity: 0; pointer-events: none;
        }
        .mn-drawer.opened {
          transform: translateY(0) scale(1);
          opacity: 1;
        }

        /* Header du drawer */
        .mn-drawer-head {
          display: flex; align-items: center; gap: 0.85rem;
          padding: 1.25rem 1.25rem 1rem;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(0,0,0,0.055);
        }
        .mn-drawer-logo {
          width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.35rem; font-weight: 700; color: white;
          box-shadow: 0 4px 14px var(--mn-shadow);
          background: linear-gradient(135deg, var(--mn-accent), #0F172A);
        }
        .mn-drawer-appname {
          font-size: 1rem; font-weight: 700; color: #0F172A;
          line-height: 1.15; letter-spacing: -0.02em;
        }
        .mn-drawer-rolepill {
          font-size: 0.575rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; padding: 0.18rem 0.55rem;
          border-radius: 99px; display: inline-flex; margin-top: 3px;
          border: 1px solid currentColor; opacity: 0.85;
        }

        /* Scroll */
        .mn-drawer-scroll {
          flex: 1; overflow-y: auto; padding: 0.5rem 0.85rem 1.25rem;
          scrollbar-width: none;
        }
        .mn-drawer-scroll::-webkit-scrollbar { display: none; }

        /* Sections */
        .mn-section-label {
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #94A3B8;
          padding: 0.9rem 0.25rem 0.4rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .mn-section-label::after {
          content: ''; flex: 1; height: 1px;
          background: rgba(148,163,184,0.2);
        }

        .mn-group {
          display: flex; flex-direction: column; gap: 1px;
          margin-bottom: 0.25rem;
        }

        .mn-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          text-decoration: none; color: #475569;
          font-size: 0.85rem; font-weight: 500;
          border-radius: 12px;
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
          position: relative;
        }
        .mn-link:active { background: rgba(0,0,0,0.04); }
        .mn-link.active {
          color: var(--mn-accent);
          background: var(--mn-dim);
          font-weight: 650;
        }
        .mn-link.active::before {
          content: '';
          position: absolute; left: 0; top: 25%; bottom: 25%;
          width: 3px; border-radius: 0 3px 3px 0;
          background: var(--mn-accent);
        }

        .mn-link-ico {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: #94A3B8;
          transition: background 0.15s, color 0.15s;
        }
        .mn-link.active .mn-link-ico {
          background: var(--mn-dim);
          color: var(--mn-accent);
        }
        .mn-link-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Bouton déconnexion */
        .mn-logout-wrap { padding: 0.75rem 0 0; border-top: 1px solid rgba(0,0,0,0.055); margin-top: 0.5rem; }
        .mn-logout {
          display: flex; align-items: center; gap: 0.75rem;
          width: 100%; padding: 0.8rem 0.85rem;
          background: rgba(244,63,94,0.06); border-radius: 12px;
          border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; color: #F43F5E;
          -webkit-tap-highlight-color: transparent; text-align: left;
        }
        .mn-logout:active { background: rgba(244,63,94,0.1); }

        /* ════ BADGE ════ */
        .mn-badge-dot {
          position: absolute; top: 0; right: 0;
          width: 8px; height: 8px;
          background: #EF4444; border: 2px solid #FFFFFF;
          border-radius: 50%;
        }
        .mn-badge-count {
          background: #EF4444; color: white; font-size: 0.65rem; font-weight: 800;
          padding: 0.12rem 0.4rem; border-radius: 99px; line-height: 1.2;
          margin-left: auto;
        }

        /* ════ FLOATING PILL ════ */
        .mn-container {
          position: fixed;
          bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
          left: 0.75rem; right: 0.75rem;
          z-index: 50; height: 60px;

          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border-radius: 30px;
          border: 1px solid rgba(255,255,255,0.8);
          box-shadow:
            0 8px 32px rgba(0,0,0,0.12),
            0 2px 8px rgba(0,0,0,0.06),
            0 0 0 1px rgba(0,0,0,0.04);

          padding: 0 0.4rem;
          display: flex; align-items: center; justify-content: space-between;
        }

        /* ════ TABS ════ */
        .mn-tab {
          flex: 1; height: 48px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-decoration: none; color: #94A3B8;
          border-radius: 22px; position: relative;
          transition: all 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
          -webkit-tap-highlight-color: transparent;
          gap: 2px;
        }
        .mn-tab-ico-wrap {
          transition: transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
        .mn-tab-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.58rem; font-weight: 700; letter-spacing: 0.03em;
          opacity: 0;
          transform: translateY(6px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
          max-height: 0;
        }
        .mn-tab.active { color: var(--mn-accent); }
        .mn-tab.active .mn-tab-ico-wrap { transform: translateY(-4px); }
        .mn-tab.active .mn-tab-label {
          opacity: 1;
          transform: translateY(0);
          max-height: 14px;
        }
        /* Indicateur actif */
        .mn-tab-dot {
          position: absolute; bottom: 3px;
          width: 16px; height: 2px; border-radius: 2px;
          background: var(--mn-accent);
          opacity: 0; transform: scaleX(0);
          transition: all 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        .mn-tab.active .mn-tab-dot { opacity: 1; transform: scaleX(1); }

        /* ════ FAB CENTER — Drapeau de Guinée ════ */
        .mn-fab-wrap {
          position: relative; width: 54px; height: 54px;
          display: flex; align-items: center; justify-content: center;
          margin-top: -20px;
        }
        .mn-fab {
          width: 50px; height: 50px; border-radius: 50%;
          border: none; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
          display: flex; align-items: center; justify-content: center;
          padding: 0; overflow: hidden; position: relative;
          box-shadow:
            0 4px 16px rgba(0,0,0,0.18),
            0 1px 4px rgba(0,0,0,0.1),
            0 0 0 2px rgba(255,255,255,0.9);
          background: #fff;
        }
        .mn-fab:active { transform: scale(0.9); }
        .mn-fab.open    { transform: rotate(90deg); }

        /* 🇬🇳 Drapeau Guinée */
        .mn-guinea-flag {
          width: 100%; height: 100%; border-radius: 50%;
          display: flex; overflow: hidden;
          transition: opacity 0.2s, transform 0.2s;
        }
        .mn-fab.open .mn-guinea-flag { opacity: 0; transform: scale(0.6); position: absolute; }

        .mn-flag-stripe { flex: 1; height: 100%; }
        .mn-flag-red    { background: #CE1126; }
        .mn-flag-yellow { background: #FCD116; }
        .mn-flag-green  { background: #009460; }

        /* Icône ✕ quand ouvert */
        .mn-fab-close {
          position: absolute; z-index: 2;
          display: flex; align-items: center; justify-content: center;
          color: #0F172A;
          opacity: 0; transform: scale(0.4) rotate(-90deg);
          transition: opacity 0.2s, transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        .mn-fab.open .mn-fab-close { opacity: 1; transform: scale(1) rotate(0deg); }

        /* Halo du drapeau */
        .mn-fab-halo {
          position: absolute; inset: -5px; border-radius: 50%; z-index: -1;
          background: conic-gradient(
            #CE1126 0deg 120deg,
            #FCD116 120deg 240deg,
            #009460 240deg 360deg
          );
          opacity: 0.25; filter: blur(6px);
          transition: opacity 0.25s;
        }
        .mn-fab:hover .mn-fab-halo { opacity: 0.45; }
        .mn-fab.open .mn-fab-halo  { opacity: 0.1; }

        /* Badge sur FAB */
        .mn-fab-badge {
          position: absolute; top: -2px; right: -2px;
          width: 14px; height: 14px;
          background: #EF4444; border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(239,68,68,0.5);
          pointer-events: none;
        }
      `}</style>

      {/* Overlay */}
      <div
        className={`mn-overlay ${open ? 'visible' : 'hidden'}`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer — menu complet */}
      <div
        className={`mn-drawer ${open ? 'opened' : 'closed'}`}
        style={cssVars}
      >
        {/* Header */}
        <div className="mn-drawer-head">
          <div className="mn-drawer-logo">
            {associationName.charAt(0)}
          </div>
          <div>
            <div className="mn-drawer-appname">
              {role === 'SYSTEM_ADMIN' ? 'LCD Platform' : associationName}
            </div>
            <div
              className="mn-drawer-rolepill"
              style={{ color: colors.accent, background: colors.pillBg }}
            >
              {colors.label}
            </div>
          </div>
        </div>

        {/* Sections */}
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
                      <span className="mn-link-ico">
                        <Ico d={item.ico} size={17} />
                      </span>
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

          {/* Logout */}
          <div className="mn-logout-wrap">
            <button className="mn-logout" onClick={handleLogout}>
              <span className="mn-link-ico" style={{ color: '#F43F5E' }}>
                <Ico d={ICO.logout} size={17} />
              </span>
              <span className="mn-link-text">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pilule flottante principale */}
      <nav className="mn-container" style={cssVars}>
        {tabs.map((tab, index) => {
          const active = isActive(tab.href);
          return (
            <React.Fragment key={tab.href}>
              {/* FAB central — inséré avant le 3e onglet */}
              {index === 2 && (
                <div className="mn-fab-wrap">
                  <div className="mn-fab-halo" />
                  <button
                    className={`mn-fab ${open ? 'open' : ''}`}
                    onClick={() => setOpen(v => !v)}
                    aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
                  >
                    <div className="mn-guinea-flag" aria-hidden="true">
                      <div className="mn-flag-stripe mn-flag-red"    />
                      <div className="mn-flag-stripe mn-flag-yellow" />
                      <div className="mn-flag-stripe mn-flag-green"  />
                    </div>
                    <span className="mn-fab-close" aria-hidden="true">
                      <Ico d={ICO.close} size={20} />
                    </span>
                    {unreadCount > 0 && !open && (
                      <div className="mn-fab-badge" aria-label={`${unreadCount} notifications non lues`} />
                    )}
                  </button>
                </div>
              )}

              {/* Tab */}
              <Link href={tab.href} className={`mn-tab ${active ? 'active' : ''}`}>
                <span className="mn-tab-ico-wrap">
                  <Ico d={tab.ico} size={21} />
                  {tab.href.includes('/notifications') && unreadCount > 0 && (
                    <div className="mn-badge-dot" aria-label={`${unreadCount} notifications`} />
                  )}
                </span>
                <span className="mn-tab-label">{tab.label}</span>
                <div className="mn-tab-dot" aria-hidden="true" />
              </Link>
            </React.Fragment>
          );
        })}
      </nav>
    </>
  );
}