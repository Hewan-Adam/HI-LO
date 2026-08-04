import type { Config } from 'tailwindcss';

/**
 * Same token names/values as the player Mini App (frontend/tailwind.config.ts)
 * — this is the back-office view of the same product, not a different brand.
 * What differs here is layout (sidebar + dense tables, not bottom-nav mobile
 * screens) and restraint: an ops tool should reward scanning, not delight,
 * so there's no equivalent of the player app's StreakLadder "signature
 * moment" — the signature here is disciplined tabular alignment instead.
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
    },
  },
  plugins: [],
};

export default config;
