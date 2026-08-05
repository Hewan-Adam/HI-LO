'use client';

import { useEffect, useState } from 'react';

interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  };
  BackButton?: {
    show(): void;
    hide(): void;
    onClick(cb: () => void): void;
    offClick(cb: () => void): void;
  };
  colorScheme: 'light' | 'dark';
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/**
 * Wraps the Telegram Mini App bridge. Polls briefly for window.Telegram.WebApp
 * to appear, since the SDK script can finish loading after this effect first
 * runs. Degrades gracefully outside Telegram (e.g. local browser dev) — every
 * method becomes a harmless no-op rather than throwing.
 */
export function useTelegramWebApp() {
  const [initData, setInitData] = useState<string>('');
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // ~2 seconds at 100ms intervals

    function tryInit() {
      if (cancelled) return;

      const webApp = window.Telegram?.WebApp;
      if (webApp) {
        setIsTelegram(true);
        setInitData(webApp.initData ?? '');
        webApp.ready();
        webApp.expand();
        webApp.setHeaderColor('#0B1210');
        webApp.setBackgroundColor('#0B1210');
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        setTimeout(tryInit, 100);
      }
      // Genuinely not in Telegram — give up silently, isTelegram stays false.
    }

    tryInit();

    return () => {
      cancelled = true;
    };
  }, []);

  const haptic = {
    impact(style: 'light' | 'medium' | 'heavy' = 'medium') {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    },
    success() {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    },
    error() {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    },
  };

  return { initData, isTelegram, haptic };
}