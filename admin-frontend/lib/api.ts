import { authStorage } from './auth-storage';
import type {
  AdminTransaction,
  AdminUserDetail,
  AdminUserSummary,
  AnalyticsSummary,
  AuditLogEntry,
  GameSettings,
  LoginResponse,
  MultiplierTableEntry,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Single-flight refresh: if five requests 401 at once, they must trigger
// exactly one /auth/refresh call and all await the same promise, not five
// racing refresh attempts that would try to rotate the same refresh token
// concurrently and have four of them fail as "already used" (see the
// backend's refresh-token reuse detection in phase 3 — racing refreshes
// would actually trip that and revoke the whole session).
let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      authStorage.clear();
      return false;
    }
    const data: LoginResponse = await res.json();
    authStorage.setTokens(data);
    return true;
  } catch {
    authStorage.clear();
    return false;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  authenticated?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { method = 'GET', body, authenticated = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authenticated) {
    const token = authStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && authenticated && !isRetry) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      return request<T>(path, options, true);
    }
    throw new ApiError('Session expired — please log in again.', 401);
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : (payload?.message ?? res.statusText);
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Auth ----

export async function telegramLogin(initData: string): Promise<LoginResponse> {
  const data = await request<LoginResponse>('/auth/telegram-login', { method: 'POST', body: { initData }, authenticated: false });
  authStorage.setTokens(data);
  return data;
}

export function getCurrentUser() {
  return request<{ id: string; telegramId: string; role: string }>('/auth/me');
}

export async function logout(): Promise<void> {
  const refreshToken = authStorage.getRefreshToken();
  authStorage.clear();
  if (refreshToken) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }
}

// ---- Users ----

export function searchUsers(params: { telegramId?: string; username?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params.telegramId) query.set('telegramId', params.telegramId);
  if (params.username) query.set('username', params.username);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  return request<AdminUserSummary[]>(`/admin/users?${query.toString()}`);
}

export function getUserDetail(userId: string) {
  return request<AdminUserDetail>(`/admin/users/${userId}`);
}

export function banUser(userId: string, reason?: string) {
  return request<{ userId: string; banned: boolean }>(`/admin/users/${userId}/ban`, { method: 'POST', body: { reason } });
}

export function unbanUser(userId: string) {
  return request<{ userId: string; banned: boolean }>(`/admin/users/${userId}/unban`, { method: 'POST' });
}

// ---- Game settings ----

export function getGameSettings() {
  return request<GameSettings>('/admin/game-settings');
}

export function setAceMode(aceMode: GameSettings['aceMode']) {
  return request<{ aceMode: string }>('/admin/game-settings/ace-mode', { method: 'POST', body: { aceMode } });
}

export function setEqualRule(equalRule: GameSettings['equalRule']) {
  return request<{ equalRule: string }>('/admin/game-settings/equal-rule', { method: 'POST', body: { equalRule } });
}

export function setMultiplierTable(table: MultiplierTableEntry[]) {
  return request<{ multiplierTable: MultiplierTableEntry[] }>('/admin/game-settings/multiplier-table', { method: 'POST', body: { table } });
}

export function setTargetRtp(percent: number) {
  return request<{ targetRtpPercent: number }>('/admin/game-settings/target-rtp', { method: 'POST', body: { percent } });
}

// ---- Analytics ----

export function getAnalyticsSummary(start?: string, end?: string) {
  const query = new URLSearchParams();
  if (start) query.set('start', start);
  if (end) query.set('end', end);
  return request<AnalyticsSummary>(`/admin/analytics/summary?${query.toString()}`);
}

// ---- Transactions ----

export function searchTransactions(params: { userId?: string; type?: string; status?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params.userId) query.set('userId', params.userId);
  if (params.type) query.set('type', params.type);
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  return request<AdminTransaction[]>(`/admin/transactions?${query.toString()}`);
}

// ---- Audit log ----

export function getAuditLog(params: { userId?: string; action?: string; entityType?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params.userId) query.set('userId', params.userId);
  if (params.action) query.set('action', params.action);
  if (params.entityType) query.set('entityType', params.entityType);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  return request<AuditLogEntry[]>(`/admin/audit-log?${query.toString()}`);
}
