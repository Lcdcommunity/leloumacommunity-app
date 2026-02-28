//web/lib/auth-store.ts
// Store simple en mémoire + localStorage (stable, sans lib)
type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
};

const STORAGE_KEY = 'assoc_auth_v1';

let memoryState: AuthState = {
  accessToken: null,
  refreshToken: null,
  refreshTokenExpiresAt: null,
};

export function loadAuthState(): AuthState {
  if (typeof window === 'undefined') return memoryState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return memoryState;
    const parsed = JSON.parse(raw) as AuthState;
    memoryState = parsed;
    return parsed;
  } catch {
    return memoryState;
  }
}

export function saveAuthState(next: AuthState): void {
  memoryState = next;
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearAuthState(): void {
  saveAuthState({
    accessToken: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
  });
}

export function getAccessToken(): string | null {
  return memoryState.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return memoryState.refreshToken ?? null;
}

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