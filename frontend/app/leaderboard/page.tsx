'use client';

import { useEffect, useState } from 'react';
import { getLeaderboard } from '../../lib/api';
import { formatCurrency, formatMultiplier } from '../../lib/format';
import { Panel } from '../../components/Panel';
import { EmptyState } from '../../components/EmptyState';
import type { LeaderboardEntry } from '../../lib/types';

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'today' | 'all-time'>('today');
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    setEntries(null);
    getLeaderboard(period, 50)
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]));
  }, [period]);

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <header>
        <p className="font-body text-xs uppercase tracking-wide text-sage">Leaderboard</p>
        <h1 className="font-display text-3xl font-semibold text-parchment">Top winners</h1>
      </header>

      <div className="flex gap-2">
        {(['today', 'all-time'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-lg border py-2 font-body text-sm capitalize transition-colors ${
              period === p ? 'border-brass bg-brass/10 text-brass' : 'border-white/10 text-sage hover:border-white/20'
            }`}
          >
            {p === 'today' ? 'Today' : 'All-time'}
          </button>
        ))}
      </div>

      {entries === null && <Panel className="animate-pulse text-center text-sage">Loading…</Panel>}
      {entries?.length === 0 && <EmptyState title="No winners yet" description={`Be the first to cash out ${period === 'today' ? 'today' : 'on the all-time board'}.`} />}
      {entries && entries.length > 0 && (
        <Panel className="divide-y divide-white/5 p-0">
          {entries.map((entry, index) => (
            <div key={entry.userId} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-6 shrink-0 text-center font-mono text-sm ${index < 3 ? 'text-brass' : 'text-sage'}`}>
                {entry.rank ?? index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm text-parchment">{entry.username ?? 'Anonymous player'}</p>
                <p className="font-body text-xs text-sage">
                  {entry.gamesPlayed} game{entry.gamesPlayed === 1 ? '' : 's'} · best {formatMultiplier(entry.bestMultiplier)}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold text-brass">{formatCurrency(entry.totalWinnings)}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
