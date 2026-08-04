import type { Config } from 'tailwindcss';

/**
 * Design tokens — "high-roller card table at 1am":
 *   felt      — near-black emerald backdrop, the table surface
 *   feltLight — slightly lifted panel surface (cards, sheets)
 *   brass     — the odometer/multiplier accent; also "win" state
 *   brick     — loss/danger state, muted rather than alarm-red
 *   parchment — primary text, warm off-white (poker chip, not pure white)
 *   sage      — muted secondary text
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#0B1210',
          light: '#0F2E22',
          lighter: '#153A2C',
        },
        brass: {
          DEFAULT: '#D4AF37',
          light: '#E8CB6A',
          dark: '#9C7F27',
        },
        brick: {
          DEFAULT: '#C1443C',
          light: '#DB6259',
        },
        parchment: '#F2EFE6',
        sage: '#8FA79B',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'ui-serif', 'serif'],
        body: ['var(--font-manrope)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        felt: '0 8px 30px rgba(0, 0, 0, 0.45)',
        brass: '0 0 0 1px rgba(212, 175, 55, 0.35), 0 4px 20px rgba(212, 175, 55, 0.15)',
      },
      keyframes: {
        'deal-in': {
          '0%': { transform: 'translateX(40px) rotate(6deg)', opacity: '0' },
          '100%': { transform: 'translateX(0) rotate(0)', opacity: '1' },
        },
        'digit-flip': {
          '0%': { transform: 'rotateX(0deg)' },
          '50%': { transform: 'rotateX(-90deg)' },
          '100%': { transform: 'rotateX(0deg)' },
        },
      },
      animation: {
        'deal-in': 'deal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
