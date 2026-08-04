'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { formatCardCode } from '../lib/format';

interface PlayingCardProps {
  code: string | null; // null renders a face-down card back
  size?: 'lg' | 'md';
  flashState?: 'win' | 'loss' | null;
}

const RANK_LABELS: Record<string, string> = { A: 'A', J: 'J', Q: 'Q', K: 'K' };

export function PlayingCard({ code, size = 'lg', flashState = null }: PlayingCardProps) {
  const dims = size === 'lg' ? 'h-44 w-32' : 'h-28 w-20';
  const parsed = code ? formatCardCode(code) : null;

  return (
    <div className={`relative ${dims}`} style={{ perspective: '1000px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={code ?? 'back'}
          initial={{ rotateY: 90, opacity: 0.4 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: -90, opacity: 0.4 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full w-full rounded-2xl border ${
            flashState === 'win'
              ? 'border-brass shadow-brass'
              : flashState === 'loss'
                ? 'border-brick shadow-[0_0_0_1px_rgba(193,68,60,0.4),0_4px_20px_rgba(193,68,60,0.2)]'
                : 'border-white/10 shadow-felt'
          } bg-gradient-to-b from-parchment to-parchment/95 flex flex-col justify-between p-3`}
        >
          {parsed ? (
            <>
              <div className={`font-display text-2xl leading-none ${parsed.color === 'red' ? 'text-brick' : 'text-felt'}`}>
                {RANK_LABELS[parsed.rank] ?? parsed.rank}
              </div>
              <div className={`self-center font-display text-4xl ${parsed.color === 'red' ? 'text-brick' : 'text-felt'}`}>{parsed.suit}</div>
              <div className={`self-end rotate-180 font-display text-2xl leading-none ${parsed.color === 'red' ? 'text-brick' : 'text-felt'}`}>
                {RANK_LABELS[parsed.rank] ?? parsed.rank}
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-lg bg-felt-lighter">
              <div className="h-3/4 w-3/4 rounded-md border-2 border-brass/30" />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
