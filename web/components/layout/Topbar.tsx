//web/components/layout/Topbar.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { logout } from '../../lib/auth';

export function Topbar({ title }: { title: string }) {
  const router = useRouter();

  async function handleLogout() {
    await logout(false);
    router.replace('/login');
  }

  return (
    <header className="topbar">
      <h1 className="page-title">{title}</h1>
      <div className="topbar-actions">
        <Button variant="ghost" onClick={() => router.push('/super-admin/notifications')}>
          Notifications
        </Button>
        <Button variant="secondary" onClick={() => router.push('/super-admin/settings')}>
          Mon profil
        </Button>
        <Button variant="danger" onClick={handleLogout}>
          Déconnexion
        </Button>
      </div>
    </header>
  );
}