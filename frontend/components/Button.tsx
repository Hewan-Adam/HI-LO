'use client';

import { motion } from 'framer-motion';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'higher' | 'lower' | 'cashout' | 'neutral';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant;
  children: ReactNode;
  pulse?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  higher: 'bg-brass text-felt hover:bg-brass-light active:scale-[0.98]',
  lower: 'bg-brick text-parchment hover:bg-brick-light active:scale-[0.98]',
  cashout: 'bg-felt-lighter border border-brass text-brass hover:bg-brass/10 active:scale-[0.98]',
  neutral: 'bg-felt-lighter border border-white/10 text-parchment hover:border-white/20 active:scale-[0.98]',
};

export function Button({ variant = 'neutral', children, pulse = false, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      animate={pulse ? { boxShadow: ['0 0 0 0 rgba(212,175,55,0.4)', '0 0 0 8px rgba(212,175,55,0)'] } : undefined}
      transition={pulse ? { duration: 1.6, repeat: Infinity, ease: 'easeOut' } : undefined}
      disabled={disabled}
      className={`rounded-xl px-5 py-3.5 font-body text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  );
}
