'use client';

import { useAdminAuth } from '../hooks/useAdminAuth';
import { Sidebar } from './Sidebar';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, user, error, logout, isTelegram } = useAdminAuth();

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center font-body text-sm text-sage">
        Checking your session…
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-body text-lg font-semibold text-parchment">Open this from Telegram</p>
        <p className="max-w-sm font-body text-sm text-sage">
          {isTelegram
            ? 'Waiting for Telegram session data…'
            : 'The admin dashboard authenticates through your Telegram account. Open it via the bot\u2019s admin link inside Telegram (desktop or mobile) rather than a plain browser tab.'}
        </p>
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-body text-lg font-semibold text-brick-light">Access denied</p>
        <p className="max-w-sm font-body text-sm text-sage">
          Your Telegram account ({user?.telegramId}) is signed in but doesn&apos;t have admin access. If this is unexpected, ask a Super
          Admin to check your role.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="font-body text-lg font-semibold text-brick-light">Couldn&apos;t sign in</p>
        <p className="max-w-sm font-body text-sm text-sage">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar username={user?.username ?? user?.telegramId} role={user?.role} onLogout={logout} />
      <main className="min-h-screen flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
