'use client';

import { useEffect, useState } from 'react';
import { getGameHistory } from '../../lib/api';
import { formatCurrency, formatMultiplier, formatRelativeDate } from '../../lib/format';
import { Panel } from '../../components/Panel';
import { EmptyState } from '../../components/EmptyState';
import type { GameHistoryEntry, GameStatus } from '../../lib/types';

const STATUS_STYLES: Record<GameStatus, string> = {
  CASHED_OUT: 'text-brass',
  LOST: 'text-brick-light',
  ABANDONED: 'text-sage',
  ACTIVE: 'text-sage',
};

const STATUS_LABELS: Record<GameStatus, string> = {
  CASHED_OUT: 'Cashed out',
  LOST: 'Lost',
  ABANDONED: 'Abandoned',
  ACTIVE: 'In progress',
};

export default function HistoryPage() {
  const [games, setGames] = useState<GameHistoryEntry[] | null>(null);

  useEffect(() => {
    getGameHistory(50).then(setGames).catch(() => setGames([]));
  }, []);

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <header>
        <p className="font-body text-xs uppercase tracking-wide text-sage">History</p>
        <h1 className="font-display text-3xl font-semibold text-parchment">Past rounds</h1>
      </header>

      {games === null && <Panel className="animate-pulse text-center text-sage">Loading…</Panel>}
      {games?.length === 0 && <EmptyState title="No rounds yet" description="Play your first game to see it show up here." />}
      {games && games.length > 0 && (
        <Panel className="divide-y divide-white/5 p-0">
          {games.map((game) => (
            <div key={game.gameId} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className={`font-body text-sm font-semibold ${STATUS_STYLES[game.status]}`}>{STATUS_LABELS[game.status]}</p>
                <p className="font-body text-xs text-sage">
                  {formatRelativeDate(game.startedAt)} · bet {formatCurrency(game.betAmount)} · streak {game.streak}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold text-parchment">
                  {game.payout != null ? formatCurrency(game.payout) : '—'}
                </p>
                <p className="font-mono text-xs text-sage">{formatMultiplier(game.currentMultiplier)}</p>
              </div>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
