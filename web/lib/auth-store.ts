// web/lib/auth-store.ts
// Store simple en mémoire + localStorage + synchronisation Cookie pour le middleware

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
};

const STORAGE_KEY = 'assoc_auth_v1';

// État initial vide
let memoryState: AuthState = {
  accessToken: null,
  refreshToken: null,
  refreshTokenExpiresAt: null,
};

/**
 * Charge l'état depuis le localStorage vers la mémoire.
 * Sécurisé pour le SSR (Server Side Rendering).
 */
export function loadAuthState(): AuthState {
  if (typeof window === 'undefined') return memoryState;
  
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryState;
    
    const parsed = JSON.parse(raw) as AuthState;
    
    // Mise à jour de la mémoire pour les futurs appels synchrones
    memoryState = {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      refreshTokenExpiresAt: parsed.refreshTokenExpiresAt ?? null,
    };
    
    return memoryState;
  } catch (error) {
    console.error("Erreur lors du chargement de l'état d'authentification:", error);
    return memoryState;
  }
}

/**
 * Sauvegarde l'état en mémoire, dans le localStorage ET dans les cookies.
 */
export function saveAuthState(next: AuthState): void {
  memoryState = next;
  if (typeof window === 'undefined') return;
  
  try {
    // 1. Sauvegarde dans le localStorage (pour ton app React)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    // 2. Synchronisation avec les Cookies (pour le middleware Next.js)
    if (next.accessToken) {
      // On crée un cookie valable 1 jour (86400 secondes), accessible partout (path=/)
      document.cookie = `accessToken=${next.accessToken}; path=/; max-age=86400; SameSite=Lax`;
    } else {
      // S'il n'y a plus de token (ex: déconnexion), on détruit le cookie en le périmant
      document.cookie = "accessToken=; path=/; max-age=0; SameSite=Lax";
    }

  } catch (error) {
    console.error("Impossible de sauvegarder l'état d'authentification:", error);
  }
}

/**
 * Réinitialise l'authentification (Logout).
 */
export function clearAuthState(): void {
  saveAuthState({
    accessToken: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
  });
}

/**
 * Récupère le token d'accès actuel.
 */
export function getAccessToken(): string | null {
  return memoryState.accessToken;
}

/**
 * Récupère le token de rafraîchissement actuel.
 */
export function getRefreshToken(): string | null {
  return memoryState.refreshToken;
}

/**
 * Met à jour les tokens après une connexion ou un refresh.
 */
export function setTokens(params: {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}): void {
  saveAuthState({
    accessToken: params.accessToken,
    refreshToken: params.refreshToken,
    refreshTokenExpiresAt: params.refreshTokenExpiresAt,
  });
}

/**
 * ── AUTO-INITIALISATION ──
 * Cette partie est vitale : elle peuple la memoryState dès que le fichier 
 * est importé côté client, évitant que les premiers appels API soient anonymes.
 */
if (typeof window !== 'undefined') {
  loadAuthState();
}