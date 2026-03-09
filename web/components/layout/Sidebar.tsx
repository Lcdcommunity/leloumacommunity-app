// web/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '../../lib/api-client';
import type { UserRole } from '../../types/user';

type NavItem = { href: string; label: string };

const superAdminItems: NavItem[] = [
  { href: '/super-admin', label: 'Dashboard' },
  { href: '/super-admin/antennas', label: 'Antennes' },
  { href: '/super-admin/admins', label: 'Admins antenne' },
  { href: '/super-admin/members', label: 'Membres' },
  { href: '/super-admin/approvals', label: 'Validations comptes' },
  { href: '/super-admin/contributions', label: 'Cotisations' },
  { href: '/super-admin/projects', label: 'Projets' },
  { href: '/super-admin/documents', label: 'Documents' },
  { href: '/super-admin/notifications', label: 'Notifications' },
  { href: '/super-admin/audit', label: 'Audit' },
  { href: '/super-admin/settings', label: 'Paramètres' },
];

const adminItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/approvals', label: 'Validations comptes' },
  { href: '/admin/members', label: 'Membres' },
  { href: '/admin/contributions', label: 'Validation cotisations' },
  { href: '/admin/contributions/history', label: 'Historique cotisations' },
  { href: '/admin/projects', label: 'Projets' },
  { href: '/admin/documents', label: 'Documents & photos' },
  { href: '/admin/contents', label: 'Informations' },
  { href: '/admin/late-members', label: 'Retardataires +3 mois' },
  { href: '/admin/projections', label: 'Projections' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/settings', label: 'Paramètres' },
];

const memberItems: NavItem[] = [
  { href: '/member', label: 'Dashboard' },
  { href: '/member/contributions/new', label: 'Faire un dépôt' },
  { href: '/member/contributions/history', label: 'Mes cotisations' },
  { href: '/member/projects', label: 'Projets' },
  { href: '/member/projects/propose', label: 'Proposer un projet' },
  { href: '/member/documents', label: 'Documents & photos' },
  { href: '/member/contents', label: 'Informations' },
  { href: '/member/late-members', label: 'Retardataires +3 mois' },
  { href: '/member/notifications', label: 'Notifications' },
  { href: '/member/profile', label: 'Mon profil' },
  { href: '/member/settings', label: 'Paramètres' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);

  // Sécurisation du useEffect pour éviter les fuites de mémoire
  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const me = await api.me();
        if (isMounted) {
          setRole(me.role);
        }
      } catch {
        if (isMounted) {
          setRole(null);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const items = useMemo(() => {
    if (role === 'SUPER_ADMIN') return superAdminItems;
    if (role === 'ANTENNA_ADMIN') return adminItems;
    if (role === 'MEMBER') return memberItems;
    return [];
  }, [role]);

  const title = role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ANTENNA_ADMIN' ? 'Admin antenne' : 'Membre';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">{title}</div>
      <nav className="sidebar-nav">
        {items.map((item) => {
          // Utilisation de l'égalité stricte pour que seul le menu exact soit en surbrillance
          const active = pathname === item.href; 
          return (
            <Link key={item.href} href={item.href} className={`sidebar-link ${active ? 'active' : ''}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}