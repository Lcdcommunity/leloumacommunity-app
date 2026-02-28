//web/components/layout/MobileNav.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api-client';
import type { UserRole } from '../../types/user';

export function MobileNav() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const me = await api.me();
        setRole(me.role);
      } catch {
        setRole(null);
      }
    })();
  }, []);

  const items = useMemo(() => {
    if (role === 'SUPER_ADMIN') {
      return [
        { href: '/super-admin', label: 'Dashboard' },
        { href: '/super-admin/antennas', label: 'Antennes' },
        { href: '/super-admin/admins', label: 'Admins' },
        { href: '/super-admin/members', label: 'Membres' },
        { href: '/super-admin/settings', label: 'Profil' },
      ];
    }
    if (role === 'ANTENNA_ADMIN') {
      return [
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/approvals', label: 'Comptes' },
        { href: '/admin/contributions', label: 'Cotisations' },
        { href: '/admin/projects', label: 'Projets' },
        { href: '/admin/settings', label: 'Profil' },
      ];
      return [
  { href: '/member', label: 'Accueil' },
  { href: '/member/contributions/new', label: 'Dépôt' },
  { href: '/member/projects', label: 'Projets' },
  { href: '/member/notifications', label: 'Notif' },
  { href: '/member/profile', label: 'Profil' },
];
    }
    return [
      { href: '/member', label: 'Accueil' },
      { href: '/member/settings', label: 'Profil' },
    ];
  }, [role]);

  return (
    <nav className="mobile-nav">
      {items.map((i) => (
        <Link key={i.href} href={i.href}>{i.label}</Link>
      ))}
    </nav>
  );
}