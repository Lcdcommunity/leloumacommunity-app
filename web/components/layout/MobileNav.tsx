// web/components/layout/MobileNav.tsx
'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../lib/api-client';
import type { UserRole } from '../../types/user';

// ── Renders either an emoji (single string) or SVG paths (string[]) ──
function Ico({ d, size = 20 }: { d: string | string[]; size?: number }) {
  if (typeof d === 'string') {
    return (
      <span
        style={{
          fontSize: size,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {d}
      </span>
    );
  }
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
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

// ── Seul chemin SVG conservé : le × du FAB quand ouvert ──
const CLOSE_PATH = ['M18 6L6 18M6 6l12 12'];

// ── Palette emoji ──
const E = {
  home:         '🏠',
  project:      '🚰',
  contribution: '💰',
  members:      '🧑‍🧑‍🧒‍🧒',
  profile:      '🚹',
  bell:         '🔔',
  settings:     '⚙️',
  creditCard:   '💳',
  calendar:     '📅',
  vote:         '🗳️',
  document:     '📄',
  news:         '📰',
  star:         '⭐',
  send:         '📨',
  audit:        '📋',
  clock:        '⏰',
  chart:        '📊',
  shield:       '🛡️',
  pin:          '📍',
  plus:         '➕',
  trending:     '📈',
  history:      '📜',
  logout:       '🚪',
} as const;

type NavItem = { href: string; label: string; ico: string | string[]; section?: string };

const systemAdminItems: NavItem[] = [
  { href: '/system-admin',                  label: 'Dashboard SaaS',    ico: E.home,         section: 'Plateforme' },
  { href: '/system-admin/associations/new', label: 'Nouvelle Instance', ico: E.plus,         section: 'Plateforme' },
  { href: '/system-admin/audit',            label: 'Logs Système',      ico: E.audit,        section: 'Sécurité'   },
  { href: '/system-admin/profile',          label: 'Mon profil',        ico: E.profile,      section: 'Compte'     },
  { href: '/system-admin/settings',         label: 'Paramètres SaaS',   ico: E.settings,     section: 'Compte'     },
];

const superAdminItems: NavItem[] = [
  { href: '/super-admin',               label: 'Dashboard',           ico: E.home,         section: 'Principal' },
  { href: '/super-admin/antennas',      label: 'Antennes',            ico: E.pin,          section: 'Principal' },
  { href: '/super-admin/admins',        label: 'Admins antenne',      ico: E.members,      section: 'Principal' },
  { href: '/super-admin/members',       label: 'Membres',             ico: E.members,      section: 'Principal' },
  { href: '/super-admin/approvals',     label: 'Validations comptes', ico: E.shield,       section: 'Gestion'   },
  { href: '/super-admin/contributions', label: 'Cotisations',         ico: E.contribution, section: 'Gestion'   },
  { href: '/super-admin/expenses',      label: 'Dépenses',            ico: E.creditCard,   section: 'Gestion'   },
  // 🔥 NOUVEAU : Vue lecture seule des virements inter-antennes (toutes antennes)
  { href: '/super-admin/transfers',     label: 'Virements',           ico: E.send,         section: 'Gestion'   },
  { href: '/super-admin/projects',      label: 'Projets',             ico: E.project,      section: 'Gestion'   },
  { href: '/super-admin/elections',     label: 'Élections',           ico: E.vote,         section: 'Gestion'   },
  { href: '/super-admin/events',        label: 'Événements',          ico: E.calendar,     section: 'Gestion'   },
  { href: '/super-admin/sponsors',      label: 'Partenaires',         ico: E.star,         section: 'Gestion'   },
  { href: '/super-admin/documents',     label: 'Documents',           ico: E.document,     section: 'Gestion'   },
  { href: '/super-admin/contents',      label: 'Informations',        ico: E.news,         section: 'Gestion'   },
  { href: '/super-admin/communication', label: 'Envoi SMS & Push',    ico: E.send,         section: 'Outils'    },
  { href: '/super-admin/notifications', label: 'Notifications',       ico: E.bell,         section: 'Outils'    },
  { href: '/super-admin/audit',         label: 'Audit',               ico: E.audit,        section: 'Outils'    },
  { href: '/super-admin/profile',       label: 'Mon profil',          ico: E.profile,      section: 'Outils'    },
  { href: '/super-admin/settings',      label: 'Paramètres',          ico: E.settings,     section: 'Outils'    },
];

const adminItems: NavItem[] = [
  { href: '/admin',                       label: 'Dashboard',              ico: E.home,         section: 'Principal' },
  { href: '/admin/approvals',             label: 'Validations comptes',    ico: E.shield,       section: 'Principal' },
  { href: '/admin/members',               label: 'Membres',                ico: E.members,      section: 'Principal' },
  { href: '/admin/contributions',         label: 'Cotisations',            ico: E.contribution, section: 'Finances'  },
  { href: '/admin/contributions/history', label: 'Historique cotisations', ico: E.history,      section: 'Finances'  },
  { href: '/admin/expenses',              label: 'Dépenses',               ico: E.creditCard,   section: 'Finances'  },
  { href: '/admin/projections',           label: 'Projections',            ico: E.chart,        section: 'Finances'  },
  { href: '/admin/transfers',             label: 'Virements',              ico: E.send,         section: 'Finances'  },
  { href: '/admin/projects',              label: 'Projets',                ico: E.project,      section: 'Contenu'   },
  { href: '/admin/project-proposals',     label: 'Propositions membres',   ico: E.project,      section: 'Contenu'   },
  { href: '/admin/elections',             label: 'Élections',              ico: E.vote,         section: 'Contenu'   },
  { href: '/admin/events',                label: 'Événements',             ico: E.calendar,     section: 'Contenu'   },
  { href: '/admin/documents',             label: 'Documents & photos',     ico: E.document,     section: 'Contenu'   },
  { href: '/admin/contents',              label: 'Informations',           ico: E.news,         section: 'Contenu'   },
  { href: '/admin/late-members',          label: 'Retardataires +3 mois',  ico: E.clock,        section: 'Contenu'   },
  { href: '/admin/sponsors',              label: 'Partenaires',            ico: E.star,         section: 'Contenu'   },
  { href: '/admin/communication',         label: 'Envoi SMS & Push',       ico: E.send,         section: 'Outils'    },
  { href: '/admin/notifications',         label: 'Notifications',          ico: E.bell,         section: 'Outils'    },
  { href: '/admin/audit',                 label: 'Audit',                  ico: E.audit,        section: 'Outils'    },
  { href: '/admin/settings',              label: 'Paramètres',             ico: E.settings,     section: 'Outils'    },
  { href: '/admin/profile',               label: 'Mon profil',             ico: E.profile,      section: 'Outils'    },
];

const memberItems: NavItem[] = [
  { href: '/member',                       label: 'Dashboard',             ico: E.home,         section: 'Principal'  },
  { href: '/member/contributions/new',     label: 'Faire un dépôt',        ico: E.contribution, section: 'Principal'  },
  { href: '/member/contributions/history', label: 'Mes cotisations',       ico: E.contribution, section: 'Principal'  },
  { href: '/member/expenses',              label: 'Dépenses',              ico: E.creditCard,   section: 'Principal'  },
  { href: '/member/projects',              label: 'Projets',               ico: E.project,      section: 'Communauté' },
  { href: '/member/projects/propose',      label: 'Proposer un projet',    ico: E.project,      section: 'Communauté' },
  { href: '/member/projects/projection',   label: 'Simulation financière', ico: E.trending,     section: 'Communauté' },
  { href: '/member/elections',             label: 'Espace Élections',      ico: E.vote,         section: 'Communauté' },
  { href: '/member/events',                label: 'Événements',            ico: E.calendar,     section: 'Communauté' },
  { href: '/member/documents',             label: 'Documents & photos',    ico: E.document,     section: 'Communauté' },
  { href: '/member/contents',              label: 'Informations',          ico: E.news,         section: 'Communauté' },
  { href: '/member/late-members',          label: 'Retardataires +3 mois', ico: E.clock,        section: 'Communauté' },
  { href: '/member/sponsors',              label: 'Partenaires',           ico: E.star,         section: 'Communauté' },
  { href: '/member/notifications',         label: 'Notifications',         ico: E.bell,         section: 'Compte'     },
  { href: '/member/profile',               label: 'Mon profil',            ico: E.profile,      section: 'Compte'     },
  { href: '/member/settings',              label: 'Paramètres',            ico: E.settings,     section: 'Compte'     },
];

const quickTabs: Record<string, { href: string; label: string; ico: string | string[] }[]> = {
  SYSTEM_ADMIN: [
    { href: '/system-admin',                  label: 'SaaS',     ico: E.home    },
    { href: '/system-admin/associations/new', label: 'Instance', ico: E.plus    },
    { href: '/system-admin/audit',            label: 'Logs',     ico: E.audit   },
    { href: '/system-admin/profile',          label: 'Profil',   ico: E.profile },
  ],
  SUPER_ADMIN: [
    { href: '/super-admin',           label: 'Accueil', ico: E.home    },
    { href: '/super-admin/members',   label: 'Membres', ico: E.members },
    { href: '/super-admin/approvals', label: 'Comptes', ico: E.shield  },
    { href: '/super-admin/profile',   label: 'Profil',  ico: E.profile },
  ],
  ANTENNA_ADMIN: [
    { href: '/admin',                   label: 'Accueil',      ico: E.home         },
    { href: '/admin/contributions',     label: 'Cotis.',       ico: E.contribution },
    { href: '/admin/project-proposals', label: 'Propositions', ico: E.project      },
    { href: '/admin/profile',           label: 'Profil',       ico: E.profile      },
  ],
  MEMBER: [
    { href: '/member',                   label: 'Accueil',  ico: E.home         },
    { href: '/member/contributions/new', label: 'Dépôt',    ico: E.contribution },
    { href: '/member/projects/propose',  label: 'Proposer', ico: E.project      },
    { href: '/member/profile',           label: 'Profil',   ico: E.profile      },
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
  SYSTEM_ADMIN:  { accent: '#8B5CF6', dim: 'rgba(139,92,246,0.15)',  pillBg: '#F5F3FF', pillText: '#7C3AED', label: 'Grand Chef',    shadow: 'rgba(139,92,246,0.4)'  },
  SUPER_ADMIN:   { accent: '#EF4444', dim: 'rgba(239,68,68,0.15)',   pillBg: '#FEF2F2', pillText: '#B91C1C', label: 'Super Admin',   shadow: 'rgba(239,68,68,0.4)'   },
  ANTENNA_ADMIN: { accent: '#3B82F6', dim: 'rgba(59,130,246,0.15)',  pillBg: '#EFF6FF', pillText: '#1D4ED8', label: 'Admin antenne', shadow: 'rgba(59,130,246,0.4)'  },
  MEMBER:        { accent: '#10B981', dim: 'rgba(16,185,129,0.15)',  pillBg: '#ECFDF5', pillText: '#047857', label: 'Membre',        shadow: 'rgba(16,185,129,0.4)'  },
};

// ── FAB : bouton central — gris moyen pour que l'ombre soit visible (effet flottant) ──
const FAB_BG      = '#64748B'; // Slate-500 — gris bleuté, assez clair pour que l'ombre ressorte
const FAB_BG_DARK = '#475569'; // Slate-600 — légèrement plus sombre quand ouvert
const FAB_SHADOW  = 'rgba(0, 0, 0, 0.28)';

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
        .mn-drawer.closed { transform: translateY(16px) scale(0.97); opacity: 0; pointer-events: none; }
        .mn-drawer.opened { transform: translateY(0) scale(1); opacity: 1; }

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

        /* ════ DRAWER SCROLL ════ */
        .mn-drawer-scroll {
          flex: 1; overflow-y: auto;
          padding: 0.5rem 0.75rem 1rem;
          -ms-overflow-style: none; scrollbar-width: none;
        }
        .mn-drawer-scroll::-webkit-scrollbar { display: none; }

        .mn-section-label {
          font-size: 0.6rem; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; color: #94A3B8;
          padding: 0.85rem 0.5rem 0.3rem;
        }

        .mn-group {
          display: flex; flex-direction: column; gap: 2px;
        }

        .mn-link {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.65rem 0.75rem; border-radius: 12px;
          text-decoration: none; color: #334155;
          font-size: 0.875rem; font-weight: 500;
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
          position: relative;
        }
        .mn-link:active, .mn-link.active {
          background: var(--mn-dim); color: var(--mn-accent);
        }
        .mn-link.active { font-weight: 700; }

        .mn-link-ico {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .mn-link-text { flex: 1; }

        .mn-badge-count {
          background: #EF4444; color: white;
          font-size: 0.6rem; font-weight: 800;
          padding: 0.1rem 0.4rem; border-radius: 99px;
          min-width: 18px; text-align: center; line-height: 1.6;
        }

        .mn-logout-wrap {
          margin-top: 0.75rem; padding-top: 0.75rem;
          border-top: 1px solid rgba(0,0,0,0.06);
        }
        .mn-logout {
          display: flex; align-items: center; gap: 0.75rem; width: 100%;
          padding: 0.65rem 0.75rem; border-radius: 12px;
          background: none; border: none; cursor: pointer;
          color: #F43F5E; font-size: 0.875rem; font-weight: 600;
          transition: background 0.15s;
          -webkit-tap-highlight-color: transparent;
          font-family: 'DM Sans', sans-serif;
        }
        .mn-logout:active { background: rgba(244,63,94,0.08); }

        /* ════ CONTAINER (barre inférieure) ════ */
        .mn-container {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-around;
          height: calc(72px + env(safe-area-inset-bottom, 0px));
          padding: 0 0.5rem calc(env(safe-area-inset-bottom, 0px) + 8px);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 -4px 24px rgba(0,0,0,0.07);
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
          opacity: 0; transform: translateY(6px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none; max-height: 0;
        }
        .mn-tab.active { color: var(--mn-accent); }
        .mn-tab.active .mn-tab-ico-wrap { transform: translateY(-4px); }
        .mn-tab.active .mn-tab-label { opacity: 1; transform: translateY(0); max-height: 14px; }
        .mn-tab-dot {
          position: absolute; bottom: 3px;
          width: 16px; height: 2px; border-radius: 2px;
          background: var(--mn-accent);
          opacity: 0; transform: scaleX(0);
          transition: all 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        .mn-tab.active .mn-tab-dot { opacity: 1; transform: scaleX(1); }

        /* Badge dot sur tab */
        .mn-badge-dot {
          position: absolute; top: 0; right: 0;
          width: 7px; height: 7px; border-radius: 50%;
          background: #EF4444; border: 1.5px solid white;
        }

        /* ════ FAB CENTRAL — discret & rond ════ */
        .mn-fab-wrap {
          position: relative; width: 56px; height: 56px;
          display: flex; align-items: center; justify-content: center;
          margin-top: -22px;
        }
        .mn-fab {
          width: 52px; height: 52px; border-radius: 50%;
          border: none; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          display: flex; align-items: center; justify-content: center;
          background: ${FAB_BG};
          box-shadow:
            0 10px 30px ${FAB_SHADOW},
            0 4px 10px rgba(0,0,0,0.18),
            0 1px 3px rgba(0,0,0,0.12),
            0 0 0 3px rgba(255,255,255,1);
          transition: all 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
          position: relative;
          overflow: visible;
        }
        .mn-fab:active { transform: scale(0.9); }

        /* 🇬🇳 (fermé) */
        .mn-fab-flag {
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; line-height: 1; user-select: none;
          position: absolute;
          transition: opacity 0.2s, transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        .mn-fab.open .mn-fab-flag {
          opacity: 0; transform: scale(0.4) rotate(-30deg);
        }

        /* × (ouvert) */
        .mn-fab-close {
          color: white;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transform: scale(0.4) rotate(-90deg);
          transition: opacity 0.2s, transform 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
          position: absolute;
        }
        .mn-fab.open .mn-fab-close {
          opacity: 1; transform: scale(1) rotate(0deg);
        }

        /* Fond légèrement plus sombre quand ouvert */
        .mn-fab.open { background: ${FAB_BG_DARK}; }

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

      {/* Drawer */}
      <div className={`mn-drawer ${open ? 'opened' : 'closed'}`} style={cssVars}>
        <div className="mn-drawer-head">
          <div className="mn-drawer-logo">{associationName.charAt(0)}</div>
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

          <div className="mn-logout-wrap">
            <button className="mn-logout" onClick={handleLogout}>
              <span className="mn-link-ico">
                <Ico d={E.logout} size={17} />
              </span>
              <span className="mn-link-text">Déconnexion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pilule flottante */}
      <nav className="mn-container" style={cssVars}>
        {tabs.map((tab, index) => {
          const active = isActive(tab.href);
          return (
            <React.Fragment key={tab.href}>
              {/* FAB central — inséré avant le 3e onglet */}
              {index === 2 && (
                <div className="mn-fab-wrap">
                  <button
                    className={`mn-fab ${open ? 'open' : ''}`}
                    onClick={() => setOpen(v => !v)}
                    aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
                  >
                    {/* 🇬🇳 */}
                    <span className="mn-fab-flag" aria-hidden="true">🇬🇳</span>
                    {/* × */}
                    <span className="mn-fab-close" aria-hidden="true">
                      <Ico d={CLOSE_PATH} size={20} />
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