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
 * Wraps the Telegram Mini App bridge. Degrades gracefully outside Telegram
 * (e.g. testing in a normal desktop browser during development) — every
 * method becomes a harmless no-op rather than throwing, so the rest of the
 * app never needs to branch on "am I actually inside Telegram?"
 */
export function useTelegramWebApp() {
  const [initData, setInitData] = useState<string>('');
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) return;

    setIsTelegram(true);
    setInitData(webApp.initData ?? '');
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor('#0B1210'); // matches the felt background token
    webApp.setBackgroundColor('#0B1210');
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
