//web/components/layout/AppShell.tsx
'use client'; // ⚡ Indispensable pour les hooks et les timers

import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { api } from '../../lib/api-client';
import { clearAuthState } from '../../lib/auth-store';

type AppShellProps = {
  title: string;
  children: React.ReactNode;
};

export function AppShell({
  title,
  children,
}: AppShellProps) {
  const router = useRouter();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const TIMEOUT_IN_MS = 15 * 60 * 1000; // 15 minutes

  const logoutUser = useCallback(async () => {
    try {
      await api.logout();
    } catch (error) {
      console.warn('Déconnexion forcée par inactivité.', error);
    } finally {
      clearAuthState();
      router.push('/login?reason=idle');
    }
  }, [router]);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void logoutUser();
    }, TIMEOUT_IN_MS);
  }, [logoutUser, TIMEOUT_IN_MS]);

  const checkInactivityOnResume = useCallback(() => {
    // ⚡ Vérifie si l'utilisateur revient après verrouillage / veille
    if (document.visibilityState !== 'visible') {
      return;
    }

    const now = Date.now();
    const elapsed = now - lastActivityRef.current;

    if (elapsed >= TIMEOUT_IN_MS) {
      void logoutUser();
      return;
    }

    const remaining = TIMEOUT_IN_MS - elapsed;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void logoutUser();
    }, remaining);
  }, [logoutUser, TIMEOUT_IN_MS]);

  useEffect(() => {
    const events: Array<keyof DocumentEventMap> = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Initialisation
    resetTimer();

    // Écouteurs d'activité
    events.forEach((event) => {
      document.addEventListener(event, resetTimer);
    });

    // ⚡ Mobile / reprise après verrouillage écran
    document.addEventListener(
      'visibilitychange',
      checkInactivityOnResume
    );

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });

      document.removeEventListener(
        'visibilitychange',
        checkInactivityOnResume
      );
    };
  }, [resetTimer, checkInactivityOnResume]);

  return (
    <>
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
        }

        .app-shell {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(
            150deg,
            #EEF2F8 0%,
            #F0F4FC 50%,
            #E4ECF7 100%
          );
        }

        .app-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        .page-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 0;
        }

        @media (max-width: 768px) {
          .app-shell {
            flex-direction: column;
          }

          .page-content {
            padding-bottom: calc(
              64px + env(safe-area-inset-bottom, 0px)
            );
          }
        }

        @media (min-width: 769px) {
          .app-mobile-nav {
            display: none;
          }
        }
      `}</style>

      <div className="app-shell">
        <Sidebar />

        <div className="app-main">
          <Topbar title={title} />

          <main className="page-content">
            {children}
          </main>
        </div>
      </div>

      <MobileNav />
    </>
  );
}