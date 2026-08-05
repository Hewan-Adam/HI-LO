'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';
import { telegramLogin, devLogin, getCurrentUser, logout as apiLogout } from '../lib/api';
import { authStorage } from '../lib/auth-storage';
import type { AuthUser } from '../lib/types';

type AuthStatus = 'loading' | 'authenticated' | 'error' | 'unauthenticated';

export function useAuth() {
  const { initData, isTelegram } = useTelegramWebApp();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authStorage.getAccessToken()) {
      getCurrentUser()
        .then((me) => {
          setUser({ id: me.id, telegramId: me.telegramId, role: me.role });
          setStatus('authenticated');
        })
        .catch(() => {
          authStorage.clear();
          setStatus('unauthenticated');
        });
      return;
    }

    if (isTelegram) {
      if (!initData) {
        // Detected Telegram, but the WebApp hasn't handed us initData yet —
        // keep showing 'loading' rather than leaving a stale
        // 'unauthenticated' status from before Telegram was detected.
        setStatus('loading');
        return;
      }

      telegramLogin(initData)
        .then((res) => {
          setUser(res.user);
          setStatus('authenticated');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Login failed');
          setStatus('error');
        });
      return;
    }

    // Not in Telegram.
    if (process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true') {
      devLogin()
        .then((data) => {
          setUser(data.user);
          setStatus('authenticated');
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Dev login failed');
          setStatus('error');
        });
      return;
    }

    setStatus('unauthenticated');
  }, [initData, isTelegram]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  return { status, user, error, logout, isTelegram };
}