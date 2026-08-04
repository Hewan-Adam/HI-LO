import { MultiplierTableEntry } from '../interfaces/game-config.interface';

/**
 * Default multiplier table, matching the values from the game spec.
 * This is a *default* only — the admin dashboard (Phase 6) persists its own
 * table in AdminSettings ("multiplier_table" key) and MultiplierService is
 * constructed with whatever table is loaded from there. Nothing here is
 * hardcoded into the calculation logic.
 */
export const DEFAULT_MULTIPLIER_TABLE: MultiplierTableEntry[] = [
  { streak: 1, multiplier: 1.25 },
  { streak: 2, multiplier: 1.6 },
  { streak: 3, multiplier: 2.05 },
  { streak: 4, multiplier: 2.7 },
  { streak: 5, multiplier: 3.6 },
  { streak: 6, multiplier: 5.0 },
  { streak: 7, multiplier: 7.5 },
  { streak: 8, multiplier: 11.0 },
];

export const DEFAULT_ACE_MODE = 'HIGH';
export const DEFAULT_EQUAL_RULE = 'PUSH';
export const DEFAULT_MAX_STREAK = 51; // a 52-card deck allows at most 51 comparisons
