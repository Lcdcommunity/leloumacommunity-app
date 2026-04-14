// web/hooks/useIdleTimeout.ts
import { useEffect, useRef } from 'react';
import { api } from '../lib/api-client';
import { clearAuthState } from '../lib/auth-store';
import { useRouter } from 'next/navigation';

export function useIdleTimeout(timeoutInMinutes: number = 15) {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const logoutUser = async () => {
    try {
      // 1. On informe le serveur pour révoquer la session
      await api.logout('', { logoutAll: false }); 
    } catch (e) {
      console.warn("Échec de la déconnexion propre", e);
    } finally {
      // 2. On nettoie le stockage local et on redirige
      clearAuthState();
      router.push('/login?reason=idle');
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logoutUser, timeoutInMinutes * 60 * 1000);
  };

  useEffect(() => {
    // Événements qui indiquent que l'utilisateur est actif
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Initialisation du timer
    resetTimer();

    // Ajout des écouteurs
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    return () => {
      // Nettoyage
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, []);
}