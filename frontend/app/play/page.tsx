'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { submitGuess, cashout, ApiError } from '../../lib/api';
import { formatCurrency, formatMultiplier } from '../../lib/format';
import { useTelegramWebApp } from '../../hooks/useTelegramWebApp';
import { PlayingCard } from '../../components/PlayingCard';
import { StreakLadder, type LadderRung } from '../../components/StreakLadder';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { EmptyState } from '../../components/EmptyState';
import type { PredictionType } from '../../lib/types';

// Mirrors the backend's default multiplier table (game-engine/constants).
// If an admin changes the live table it will simply differ from what the
// player was shown in the lobby before the game started — a genuine
// display nuance flagged in the README rather than silently papered over.
const DEFAULT_RUNGS: LadderRung[] = [
  { streak: 1, multiplier: 1.25 },
  { streak: 2, multiplier: 1.6 },
  { streak: 3, multiplier: 2.05 },
  { streak: 4, multiplier: 2.7 },
  { streak: 5, multiplier: 3.6 },
  { streak: 6, multiplier: 5.0 },
  { streak: 7, multiplier: 7.5 },
  { streak: 8, multiplier: 11.0 },
];

type Outcome = { kind: 'cashed_out'; payout: number } | { kind: 'lost' } | null;

function PlayPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { haptic } = useTelegramWebApp();

  const gameId = searchParams.get('gameId') ?? '';
  const betAmount = Number(searchParams.get('bet') ?? 0);

  const [currentCard, setCurrentCard] = useState(searchParams.get('card') ?? '');
  const [streak, setStreak] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [potentialPayout, setPotentialPayout] = useState(betAmount);
  const [flash, setFlash] = useState<'win' | 'loss' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  if (!gameId) {
    return (
      <div className="px-5 pt-8">
        <EmptyState
          title="No game in progress"
          description="Start a new round from the lobby to begin."
          action={
            <Button variant="higher" onClick={() => router.push('/lobby')}>
              Go to lobby
            </Button>
          }
        />
      </div>
    );
  }

  async function handleGuess(prediction: PredictionType) {
    setError(null);
    setBusy(true);
    haptic.impact('light');
    try {
      const res = await submitGuess(gameId, prediction);
      setCurrentCard(res.revealedCard);
      setStreak(res.streak);
      setMultiplier(res.currentMultiplier);
      setPotentialPayout(res.potentialPayout);

      if (res.result === 'WIN') {
        setFlash('win');
        haptic.success();
      } else if (res.result === 'LOSS') {
        setFlash('loss');
        haptic.error();
      }
      // PUSH: no flash — the card re-shows with no streak/multiplier change, nothing to celebrate or mourn.

      if (res.gameOver) {
        setOutcome(res.result === 'LOSS' ? { kind: 'lost' } : { kind: 'cashed_out', payout: res.payout ?? 0 });
      }
    } catch (err) {
      haptic.error();
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Your bet is safe — try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCashout() {
    setError(null);
    setBusy(true);
    haptic.impact('medium');
    try {
      const res = await cashout(gameId);
      setOutcome({ kind: 'cashed_out', payout: res.payout });
      haptic.success();
    } catch (err) {
      haptic.error();
      setError(err instanceof ApiError ? err.message : 'Could not cash out. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (outcome) {
    return (
      <div className="flex flex-col gap-6 px-5 pt-12">
        <PlayingCard code={currentCard} flashState={outcome.kind === 'cashed_out' ? 'win' : 'loss'} />
        {outcome.kind === 'cashed_out' ? (
          <Panel className="border-brass/40 text-center">
            <p className="font-body text-xs uppercase tracking-wide text-sage">Cashed out</p>
            <p className="mt-1 font-display text-5xl font-semibold text-brass">{formatCurrency(outcome.payout)}</p>
            <p className="mt-2 font-body text-sm text-sage">at {formatMultiplier(multiplier)}, streak of {streak}</p>
          </Panel>
        ) : (
          <Panel className="border-brick/40 text-center">
            <p className="font-body text-xs uppercase tracking-wide text-sage">Round over</p>
            <p className="mt-1 font-display text-4xl font-semibold text-brick-light">Lost the streak</p>
            <p className="mt-2 font-body text-sm text-sage">Your bet of {formatCurrency(betAmount)} stays with the house this time.</p>
          </Panel>
        )}
        <Button variant="higher" className="w-full" onClick={() => router.push('/lobby')}>
          Play again
        </Button>
        <Button
          variant="neutral"
          className="w-full"
          onClick={() => router.push(`/history`)}
        >
          View history
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-body text-xs uppercase tracking-wide text-sage">Bet</p>
          <p className="font-mono text-lg text-parchment">{formatCurrency(betAmount)}</p>
        </div>
        <div className="text-right">
          <p className="font-body text-xs uppercase tracking-wide text-sage">Potential payout</p>
          <p className="font-display text-2xl font-semibold text-brass">{formatCurrency(potentialPayout)}</p>
        </div>
      </header>

      <div className="flex items-center justify-center py-4">
        <PlayingCard code={currentCard} flashState={flash} />
      </div>

      <StreakLadder rungs={DEFAULT_RUNGS} currentStreak={streak} />

      {error && <Panel className="border-brick/40 text-sm text-brick-light">{error}</Panel>}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="higher" disabled={busy} onClick={() => handleGuess('HIGHER')}>
          ▲ Higher
        </Button>
        <Button variant="lower" disabled={busy} onClick={() => handleGuess('LOWER')}>
          ▼ Lower
        </Button>
      </div>

      <Button variant="cashout" disabled={busy || streak === 0} onClick={handleCashout} pulse={streak > 0 && !busy}>
        {streak > 0 ? `Cash out — ${formatCurrency(potentialPayout)}` : 'Cash out (after your first correct guess)'}
      </Button>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="px-5 pt-8 text-center text-sage">Loading round…</div>}>
      <PlayPageInner />
    </Suspense>
  );
}
