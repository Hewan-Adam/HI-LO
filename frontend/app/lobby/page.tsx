'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useTelegramWebApp } from '../../hooks/useTelegramWebApp';
import { startGame, ApiError } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { Panel } from '../../components/Panel';
import { Button } from '../../components/Button';

const QUICK_AMOUNTS = [5, 10, 25, 50];

export default function LobbyPage() {
  const { status } = useAuth();
  const { haptic } = useTelegramWebApp();
  const router = useRouter();
  const [amount, setAmount] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setError(null);
    setStarting(true);
    haptic.impact('light');
    try {
      const game = await startGame(amount);
      router.push(`/play?gameId=${game.gameId}&card=${game.currentCard}&bet=${game.betAmount}`);
    } catch (err) {
      haptic.error();
      setError(err instanceof ApiError ? err.message : 'Could not start the game. Try again.');
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-5 pt-8">
      <header>
        <p className="font-body text-xs uppercase tracking-wide text-sage">Hi-Lo</p>
        <h1 className="font-display text-3xl font-semibold text-parchment">Place your bet</h1>
      </header>

      <Panel>
        <p className="mb-3 font-body text-xs uppercase tracking-wide text-sage">Bet amount</p>
        <div className="mb-4 flex items-center justify-center rounded-xl bg-felt-lighter py-6">
          <span className="font-display text-4xl font-semibold text-brass">{formatCurrency(amount)}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              onClick={() => setAmount(value)}
              className={`rounded-lg border py-2 font-mono text-sm transition-colors ${
                amount === value ? 'border-brass bg-brass/10 text-brass' : 'border-white/10 text-sage hover:border-white/20'
              }`}
            >
              ${value}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={() => setAmount((a) => Math.max(1, a - 5))}
            className="h-10 w-10 rounded-lg border border-white/10 font-body text-lg text-sage hover:border-white/20"
            aria-label="Decrease bet"
          >
            −
          </button>
          <input
            type="range"
            min={1}
            max={200}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1 accent-brass"
          />
          <button
            onClick={() => setAmount((a) => a + 5)}
            className="h-10 w-10 rounded-lg border border-white/10 font-body text-lg text-sage hover:border-white/20"
            aria-label="Increase bet"
          >
            +
          </button>
        </div>
      </Panel>

      {error && <Panel className="border-brick/40 text-sm text-brick-light">{error}</Panel>}

      <Button variant="higher" onClick={handleStart} disabled={starting || status === 'loading'} className="w-full">
        {starting ? 'Dealing…' : 'Deal the first card'}
      </Button>

      <p className="text-center font-body text-xs text-sage">
        Every deck is provably fair — the shuffle seed is committed before your first card and revealed once the round ends.
      </p>
    </div>
  );
}
