export const STATISTICS_REPOSITORY = Symbol('STATISTICS_REPOSITORY');

export interface StatisticsSnapshot {
  userId: string;
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  totalWon: number;
  bestMultiplier: number;
  longestStreak: number;
}

export interface GameResultForStats {
  wagered: number;
  won: number; // 0 for a loss
  isWin: boolean;
  multiplierAchieved: number;
  streakAchieved: number;
}

export interface StatisticsRepository {
  /** Upserts and atomically increments — must be safe under concurrent settlement of two different games for the same user. */
  recordGameResult(userId: string, result: GameResultForStats): Promise<StatisticsSnapshot>;
  getStatistics(userId: string): Promise<StatisticsSnapshot | null>;
}
