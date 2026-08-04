'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTelegramWebApp } from './useTelegramWebApp';
import { telegramLogin, getCurrentUser, logout as apiLogout } from '../lib/api';
import { authStorage } from '../lib/auth-storage';
import type { AuthUser } from '../lib/types';

type AuthStatus = 'loading' | 'authenticated' | 'error' | 'unauthenticated';

export function useAuth() {
  const { initData, isTelegram } = useTelegramWebApp();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already have a session from a previous visit — confirm it's still
    // valid (an account can be banned, or a refresh-token family revoked,
    // between visits) and populate `user` rather than leaving it null with
    // a stale 'authenticated' status. Note GET /auth/me's JWT-derived
    // payload doesn't carry `username` (only id/telegramId/role) — the UI
    // falls back to a generic "Player" label until the next full Telegram
    // login repopulates it, which is a cosmetic gap, not a functional one.
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

    if (!isTelegram) {
      // Running outside Telegram (e.g. local dev in a normal browser) —
      // there's no initData to log in with. The app still renders so the
      // UI can be worked on without a live Telegram session.
      setStatus('unauthenticated');
      return;
    }

    if (!initData) return; // waiting for useTelegramWebApp's effect to populate it

    telegramLogin(initData)
      .then((res) => {
        setUser(res.user);
        setStatus('authenticated');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Login failed');
        setStatus('error');
      });
  }, [initData, isTelegram]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  return { status, user, error, logout, isTelegram };
}
