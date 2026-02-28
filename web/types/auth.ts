//web/types/auth.ts
import type { CurrentUser } from './user';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user?: CurrentUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}