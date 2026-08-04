'use client';

import { motion } from 'framer-motion';
import { formatMultiplier } from '../lib/format';

export interface LadderRung {
  streak: number;
  multiplier: number;
}

interface StreakLadderProps {
  rungs: LadderRung[];
  currentStreak: number;
}

/**
 * Reads bottom-to-top like the deck itself climbing: rung 1 at the bottom,
 * higher streaks above it. Rungs already cleared are dimmed sage (progress
 * made); the current rung glows brass gold (where you are); rungs not yet
 * reached stay dim (what's still ahead). This is the one place the design
 * spends its "boldness budget" — everything else in the UI stays
 * deliberately quiet around it.
 */
export function StreakLadder({ rungs, currentStreak }: StreakLadderProps) {
  const ascending = [...rungs].sort((a, b) => a.streak - b.streak); // DOM order: lowest first; flex-col-reverse flips this so the highest rung renders at the top

  return (
    <div className="flex flex-col-reverse gap-1.5">
      {ascending.map((rung) => {
          const cleared = rung.streak < currentStreak;
          const isCurrent = rung.streak === currentStreak || (currentStreak === 0 && rung.streak === 1);
          return (
            <motion.div
              key={rung.streak}
              initial={false}
              animate={isCurrent ? { scale: 1.06 } : { scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-mono ${
                isCurrent
                  ? 'border-brass bg-brass/10 text-brass shadow-brass'
                  : cleared
                    ? 'border-sage/30 bg-sage/5 text-sage'
                    : 'border-white/5 text-sage/40'
              }`}
            >
              <span>#{rung.streak}</span>
              <span className="font-semibold">{formatMultiplier(rung.multiplier)}</span>
            </motion.div>
          );
        })}
    </div>
  );
}
