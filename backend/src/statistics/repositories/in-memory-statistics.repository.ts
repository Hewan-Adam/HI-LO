import { Injectable } from '@nestjs/common';
import { GameResultForStats, StatisticsRepository, StatisticsSnapshot } from '../interfaces/statistics-repository.interface';

@Injectable()
export class InMemoryStatisticsRepository implements StatisticsRepository {
  private stats = new Map<string, StatisticsSnapshot>();

  async recordGameResult(userId: string, result: GameResultForStats): Promise<StatisticsSnapshot> {
    const existing = this.stats.get(userId) ?? {
      userId,
      totalGamesPlayed: 0,
      totalWins: 0,
      totalLosses: 0,
      totalWagered: 0,
      totalWon: 0,
      bestMultiplier: 0,
      longestStreak: 0,
    };

    existing.totalGamesPlayed += 1;
    if (result.isWin) existing.totalWins += 1;
    else existing.totalLosses += 1;
    existing.totalWagered = Number((existing.totalWagered + result.wagered).toFixed(8));
    existing.totalWon = Number((existing.totalWon + result.won).toFixed(8));
    existing.bestMultiplier = Math.max(existing.bestMultiplier, result.multiplierAchieved);
    existing.longestStreak = Math.max(existing.longestStreak, result.streakAchieved);

    this.stats.set(userId, existing);
    return { ...existing };
  }

  async getStatistics(userId: string): Promise<StatisticsSnapshot | null> {
    const row = this.stats.get(userId);
    return row ? { ...row } : null;
  }
}
