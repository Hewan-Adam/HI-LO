import { authStorage } from './auth-storage';
import type {
  ApiErrorBody,
  CashoutResponse,
  GameHistoryEntry,
  GuessResponse,
  LeaderboardEntry,
  LoginResponse,
  PredictionType,
  StartGameResponse,
  StatisticsSummary,
  TransactionEntry,
  WalletSummary,
} from './types';
import type { AuthUser } from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody | null,
  ) {
    super(typeof body?.message === 'string' ? body.message : Array.isArray(body?.message) ? body!.message.join(', ') : `Request failed with status ${status}`);
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/** Ensures only one refresh request is ever in flight, even if several API calls 401 at the same moment. */
async function refreshTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        authStorage.clear();
        return false;
      }
      const data: LoginResponse = await response.json();
      authStorage.setTokens(data);
      return true;
    } catch {
      return false;
    }
  })();

  const result = await refreshInFlight;
  refreshInFlight = null;
  return result;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Set false for the two auth endpoints that must never trigger a refresh loop. */
  authenticated?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, authenticated = true } = options;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authenticated) {
      const token = authStorage.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch();

  if (response.status === 401 && authenticated) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;
    try {
      errorBody = await response.json();
    } catch {
      /* response wasn't JSON — errorBody stays null, ApiError falls back to a generic message */
    }
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// ---------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------

export async function telegramLogin(initData: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>('/auth/telegram-login', { method: 'POST', body: { initData }, authenticated: false });
  authStorage.setTokens(data);
  return data;
}

/** GET /auth/me — used to populate user info when resuming a session from a previously-stored token pair, where we have no `user` object yet. */
export function getCurrentUser(): Promise<{ id: string; telegramId: string; role: import('./types').Role }> {
  return request('/auth/me');
}

export async function logout(): Promise<void> {
  const refreshToken = authStorage.getRefreshToken();
  authStorage.clear();
  if (refreshToken) {
    await request('/auth/logout', { method: 'POST', body: { refreshToken }, authenticated: false }).catch(() => {
      /* best-effort: the local session is already cleared either way */
    });
  }
}

// ---------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------

export function startGame(betAmount: number, clientSeed?: string): Promise<StartGameResponse> {
  return request('/game/start', { method: 'POST', body: { betAmount, clientSeed } });
}

export function submitGuess(gameId: string, prediction: PredictionType): Promise<GuessResponse> {
  return request('/game/guess', { method: 'POST', body: { gameId, prediction } });
}

export function cashout(gameId: string): Promise<CashoutResponse> {
  return request('/game/cashout', { method: 'POST', body: { gameId } });
}

export function getGameHistory(limit = 20, offset = 0): Promise<GameHistoryEntry[]> {
  return request(`/game/history?limit=${limit}&offset=${offset}`);
}

// ---------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------

export function getWallet(): Promise<WalletSummary> {
  return request('/wallet');
}

export function getWalletHistory(limit = 20, offset = 0): Promise<TransactionEntry[]> {
  return request(`/wallet/history?limit=${limit}&offset=${offset}`);
}

// ---------------------------------------------------------------------
// Leaderboard + Statistics
// ---------------------------------------------------------------------

export function getLeaderboard(period: 'today' | 'all-time' = 'all-time', limit = 20): Promise<{ period: string; entries: LeaderboardEntry[] }> {
  return request(`/leaderboard?period=${period}&limit=${limit}`);
}

export function getStatistics(): Promise<StatisticsSummary> {
  return request('/statistics');
}
// lib/api.ts

// lib/api.ts
export async function devLogin() {
  const data = await request<{
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  }>('/auth/dev-login', {
    method: 'POST',
    authenticated: false,
  });

  authStorage.setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return data;
}
