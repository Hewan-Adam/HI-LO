'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';
import { telegramLogin, getCurrentUser, logout as apiLogout } from '../lib/api';
import { authStorage } from '../lib/auth-storage';
import type { AdminUser } from '../lib/types';

export type AdminAuthStatus = 'loading' | 'authenticated' | 'forbidden' | 'error' | 'unauthenticated';

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

export function useAdminAuth() {
  const { initData, isTelegram } = useTelegramWebApp();
  const [status, setStatus] = useState<AdminAuthStatus>('loading');
  const [user, setUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyUserAndGate = useCallback((candidate: AdminUser) => {
    if (!ADMIN_ROLES.has(candidate.role)) {
      // A real PLAYER account, correctly authenticated — just not authorized
      // for this app. Distinguished from 'error' deliberately: this isn't a
      // broken login, it's a working login that correctly doesn't belong
      // here, and the UI treats those two cases very differently (see
      // app/page.tsx / ForbiddenScreen).
      setUser(candidate);
      setStatus('forbidden');
      return;
    }
    setUser(candidate);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    if (authStorage.getAccessToken()) {
      getCurrentUser()
        .then((me) => applyUserAndGate({ id: me.id, telegramId: me.telegramId, role: me.role as AdminUser['role'] }))
        .catch(() => {
          authStorage.clear();
          setStatus('unauthenticated');
        });
      return;
    }

    if (!isTelegram) {
      setStatus('unauthenticated');
      return;
    }
    if (!initData) return;

    telegramLogin(initData)
      .then((res) => applyUserAndGate(res.user))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Login failed');
        setStatus('error');
      });
  }, [initData, isTelegram, applyUserAndGate]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  return { status, user, error, logout, isTelegram, isSuperAdmin: user?.role === 'SUPER_ADMIN' };
}
