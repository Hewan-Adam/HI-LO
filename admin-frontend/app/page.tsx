'use client';

import { useEffect, useState } from 'react';
import { getAnalyticsSummary } from '../lib/api';
import { formatCurrency, formatDuration, formatPercent, toDatetimeLocalValue } from '../lib/format';
import { StatTile } from '../components/StatTile';
import type { AnalyticsSummary } from '../lib/types';

function defaultRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { start, end };
}

export default function DashboardPage() {
  const [{ start, end }] = useState(defaultRange);
  const [rangeStart, setRangeStart] = useState(toDatetimeLocalValue(start));
  const [rangeEnd, setRangeEnd] = useState(toDatetimeLocalValue(end));
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);

  function load(startValue: string, endValue: string) {
    setLoading(true);
    getAnalyticsSummary(new Date(startValue).toISOString(), new Date(endValue).toISOString())
      .then(setSummary)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(rangeStart, rangeEnd);
    // Live-pulse: re-fetch every 30s so the ticker strip actually reflects
    // "now" for whoever is watching this screen during a shift, without
    // requiring a manual refresh.
    const interval = setInterval(() => load(rangeStart, rangeEnd), 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-body text-2xl font-semibold text-parchment">Dashboard</h1>
          <p className="font-body text-sm text-sage">House performance for the selected window</p>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-xs text-sage">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brass" />
          live · refreshes every 30s
        </span>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-white/5 bg-felt-light p-4">
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-sage">From</span>
          <input
            type="datetime-local"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="rounded-md border border-white/10 bg-felt px-2 py-1.5 font-mono text-sm text-parchment focus:border-brass focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-xs text-sage">To</span>
          <input
            type="datetime-local"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="rounded-md border border-white/10 bg-felt px-2 py-1.5 font-mono text-sm text-parchment focus:border-brass focus:outline-none"
          />
        </label>
        <button
          onClick={() => load(rangeStart, rangeEnd)}
          className="rounded-md bg-brass/10 px-3 py-1.5 font-body text-sm font-semibold text-brass hover:bg-brass/20"
        >
          Apply
        </button>
      </div>

      {loading && !summary && <p className="font-body text-sm text-sage">Loading…</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile label="House profit" value={formatCurrency(summary.houseProfit)} accent />
          <StatTile label="Total wagered" value={formatCurrency(summary.totalWagered)} />
          <StatTile label="Total paid out" value={formatCurrency(summary.totalPaidOut)} />
          <StatTile label="Games settled" value={summary.gamesPlayed} />
          <StatTile label="Active players" value={summary.activePlayers} />
          <StatTile
            label="Win / loss ratio"
            value={summary.winLossRatio != null ? summary.winLossRatio.toFixed(2) : '—'}
            hint={`${summary.wins}W · ${summary.losses}L`}
          />
          <StatTile
            label="RTP (actual)"
            value={summary.totalWagered > 0 ? formatPercent((summary.totalPaidOut / summary.totalWagered) * 100) : '—'}
            hint="paid out ÷ wagered, this window"
          />
          <StatTile label="Avg. session" value={formatDuration(summary.averageSessionDurationSeconds)} />
        </div>
      )}
    </div>
  );
}
