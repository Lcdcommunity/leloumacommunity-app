//web/components/layout/AppShell.tsx
'use client'; // ⚡ Indispensable pour les hooks et les timers

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { api } from '../../lib/api-client';
import { clearAuthState } from '../../lib/auth-store';

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now()); // ⚡ Stocke l'heure de la dernière activité

  const TIMEOUT_IN_MS = 15 * 60 * 1000; // 15 minutes

  const logoutUser = async () => {
    try {
      await api.logout('', { logoutAll: false });
    } catch (e) {
      console.warn("Déconnexion forcée par inactivité.");
    } finally {
      clearAuthState();
      router.push('/login?reason=idle');
    }
  };

  const resetTimer = () => {
    lastActivityRef.current = Date.now(); // ⚡ Met à jour l'heure réelle de l'activité
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logoutUser, TIMEOUT_IN_MS);
  };

  const checkInactivityOnResume = () => {
    // ⚡ Vérifie si l'utilisateur revient après une mise en veille/verrouillage
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      if (now - lastActivityRef.current >= TIMEOUT_IN_MS) {
        logoutUser();
      } else {
        // Si le délai n'est pas encore dépassé, on relance le timer avec le temps restant
        const remaining = TIMEOUT_IN_MS - (now - lastActivityRef.current);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(logoutUser, remaining);
      }
    }
  };

  useEffect(() => {
    // Événements d'interaction (inclut touchstart pour mobile)
    const events = [
      'mousedown', 
      'mousemove', 
      'keypress', 
      'scroll', 
      'touchstart', 
      'click'
    ];
    
    // Initialisation
    resetTimer();

    // Écouteurs d'activité
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // ⚡ GESTION SPÉCIFIQUE MOBILE & VERROUILLAGE
    // Se déclenche quand l'utilisateur déverrouille son tel ou revient sur l'onglet
    document.addEventListener('visibilitychange', checkInactivityOnResume);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      document.removeEventListener('visibilitychange', checkInactivityOnResume);
    };
  }, []);

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .app-shell {
          display: flex;
          min-height: 100vh;
          background: linear-gradient(150deg, #EEF2F8 0%, #F0F4FC 50%, #E4ECF7 100%);
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
          .app-shell { flex-direction: column; }
          .page-content {
            padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
          }
        }

        @media (min-width: 769px) {
          .app-mobile-nav { display: none; }
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