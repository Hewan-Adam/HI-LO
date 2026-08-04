'use client';

import { useEffect, useState } from 'react';

interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  HapticFeedback?: {
    impactOccurred(style: 'light' | 'medium' | 'heavy'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function useTelegramWebApp() {
  const [initData, setInitData] = useState<string | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      setIsTelegram(false);
      return;
    }
    setIsTelegram(true);
    webApp.ready();
    webApp.expand();
    setInitData(webApp.initData || null);
  }, []);

  const haptic = {
    impact(style: 'light' | 'medium' | 'heavy' = 'light') {
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
