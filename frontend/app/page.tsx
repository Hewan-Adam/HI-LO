'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { getWallet, getStatistics } from '../lib/api';
import { formatCurrency, formatMultiplier } from '../lib/format';
import { Panel, StatRow } from '../components/Panel';
import { Button } from '../components/Button';
import type { StatisticsSummary, WalletSummary } from '../lib/types';

export default function HomePage() {
  const { status, user } = useAuth();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [stats, setStats] = useState<StatisticsSummary | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    getWallet().then(setWallet).catch(() => {});
    getStatistics().then(setStats).catch(() => {});
  }, [status]);

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <header>
        <p className="font-body text-sm text-sage">Welcome back{user?.username ? `,` : ''}</p>
        <h1 className="font-display text-3xl font-semibold text-parchment">{user?.username ?? 'Player'}</h1>
      </header>

      {status === 'loading' && <Panel className="animate-pulse text-center text-sage">Connecting to Telegram…</Panel>}

      {status === 'error' && (
        <Panel className="border-brick/40 text-center text-brick-light">Couldn't sign you in. Try reopening the Mini App.</Panel>
      )}

      {(status === 'authenticated' || status === 'unauthenticated') && (
        <>
          <Panel>
            <p className="font-body text-xs uppercase tracking-wide text-sage">Balance</p>
            <p className="mt-1 font-display text-4xl font-semibold text-brass">
              {wallet ? formatCurrency(wallet.balance, wallet.currency) : '—'}
            </p>
            {wallet && wallet.bonusBalance > 0 && (
              <p className="mt-1 font-body text-xs text-sage">+ {formatCurrency(wallet.bonusBalance)} bonus</p>
            )}
          </Panel>

          <Link href="/lobby">
            <Button variant="higher" className="w-full">
              Play Hi-Lo
            </Button>
          </Link>

          {stats && stats.totalGamesPlayed > 0 && (
            <Panel>
              <p className="mb-1 font-body text-xs uppercase tracking-wide text-sage">Your stats</p>
              <StatRow label="Games played" value={stats.totalGamesPlayed} />
              <StatRow label="Best multiplier" value={formatMultiplier(stats.bestMultiplier)} valueClassName="text-brass" />
              <StatRow label="Longest streak" value={stats.longestStreak} />
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
