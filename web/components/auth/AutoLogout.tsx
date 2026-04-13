// web/components/auth/AutoLogout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function AutoLogout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. On ne tracke pas l'inactivité sur les pages publiques, ni sur la page de déconnexion elle-même
    const publicRoutes = ['/login', '/signup', '/', '/logout', '/forgot-password'];
    if (pathname && publicRoutes.includes(pathname)) return;

    let timeoutId: NodeJS.Timeout;

    // 2. Fonction qui s'exécute après 15mn de vide
    const handleLogout = () => {
      // Redirection vers la page de déconnexion pour profiter de la majestueuse animation du rideau
      router.push('/logout');
    };

    // 3. Réinitialisation du chrono
    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 15 minutes = 15 * 60 * 1000 = 900 000 ms
      timeoutId = setTimeout(handleLogout, 900000);
    };

    // 4. Événements qui prouvent que l'utilisateur est actif
    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];

    // Initialisation
    resetTimer();

    // On branche les écouteurs sur la fenêtre
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Nettoyage si le composant est démonté
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [pathname, router]);

  // Ce composant est strictement invisible, il tourne uniquement en tâche de fond
  return null;
}