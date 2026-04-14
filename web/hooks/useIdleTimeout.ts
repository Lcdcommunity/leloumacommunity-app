// web/hooks/useIdleTimeout.ts
import { useEffect, useRef, useCallback } from 'react';
import { api } from '../lib/api-client';
import { clearAuthState } from '../lib/auth-store';
import { useRouter } from 'next/navigation';

export function useIdleTimeout(timeoutInMinutes: number = 15) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const logoutUser = useCallback(async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Échec de la déconnexion propre', e);
    } finally {
      clearAuthState();
      router.push('/login?reason=idle');
    }
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(
      logoutUser,
      timeoutInMinutes * 60 * 1000
    );
  }, [logoutUser, timeoutInMinutes]);

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
    ];

    resetTimer();

    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);

      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);
}