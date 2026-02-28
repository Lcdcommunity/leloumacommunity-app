//web/components/auth/AuthGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadAuthState } from '../../lib/auth-store';
import { api } from '../../lib/api-client';
import { Loader } from '../ui/Loader';
import type { CurrentUser } from '../../types/user';

export function AuthGuard({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: 'SUPER_ADMIN' | 'ANTENNA_ADMIN' | 'MEMBER';
}) {
  const router = useRouter();
  const [state, setState] = useState<{
    loading: boolean;
    user: CurrentUser | null;
  }>({ loading: true, user: null });

  useEffect(() => {
    let mounted = true;

    async function init() {
      const auth = loadAuthState();
      if (!auth.accessToken && !auth.refreshToken) {
        router.replace('/login');
        return;
      }

      try {
        const me = await api.me();
        const user = me as CurrentUser;

        if (requireRole && user.role !== requireRole) {
          router.replace('/dashboard');
          return;
        }

        if (mounted) setState({ loading: false, user });
      } catch {
        router.replace('/login');
      }
    }

    void init();
    return () => {
      mounted = false;
    };
  }, [router, requireRole]);

  if (state.loading) return <Loader text="Vérification de la session..." />;
  return <>{children}</>;
}