export const LEADERBOARD_REPOSITORY = Symbol('LEADERBOARD_REPOSITORY');

export interface LeaderboardEntrySnapshot {
  userId: string;
  username?: string;
  period: string;
  totalWinnings: number;
  gamesPlayed: number;
  bestMultiplier: number;
  rank?: number;
}

export const ALL_TIME_PERIOD = 'ALL_TIME';

/** Returns the period key for "today" in UTC, e.g. "DAILY-2026-07-26". */
export function currentDailyPeriod(now: Date = new Date()): string {
  return `DAILY-${now.toISOString().slice(0, 10)}`;
}

export interface LeaderboardRepository {
  /** Increments winnings/gamesPlayed and raises bestMultiplier if higher, for one period. Called once per (period) per settled game — typically twice per game (ALL_TIME + the current daily period). */
  recordResult(userId: string, period: string, params: { winningsDelta: number; multiplierAchieved: number }): Promise<void>;
  getTopN(period: string, limit: number): Promise<LeaderboardEntrySnapshot[]>;
  /** Recomputes and persists `rank` for every entry in a period, ordered by totalWinnings descending. Intended to run periodically (e.g. a scheduled job), not on every single game settlement, since re-ranking the whole period on every game would be needless write amplification. */
  recalculateRanks(period: string): Promise<void>;
}
