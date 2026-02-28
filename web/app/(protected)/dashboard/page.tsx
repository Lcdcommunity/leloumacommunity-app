//web/app/(protected)/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api-client';

export default function DashboardRouterPage() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      try {
        const me = await api.me();
        if (me.role === 'SUPER_ADMIN') router.replace('/super-admin');
        else if (me.role === 'ANTENNA_ADMIN') router.replace('/admin');
        else router.replace('/member');
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);

  return null;
}