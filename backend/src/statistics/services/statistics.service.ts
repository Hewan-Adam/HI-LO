import { Inject, Injectable } from '@nestjs/common';
import { STATISTICS_REPOSITORY, StatisticsRepository, GameResultForStats, StatisticsSnapshot } from '../interfaces/statistics-repository.interface';

@Injectable()
export class StatisticsService {
  constructor(@Inject(STATISTICS_REPOSITORY) private readonly repository: StatisticsRepository) {}

  async recordGameResult(userId: string, result: GameResultForStats): Promise<StatisticsSnapshot> {
    return this.repository.recordGameResult(userId, result);
  }

  async getStatistics(userId: string): Promise<StatisticsSnapshot> {
    const stats = await this.repository.getStatistics(userId);
    return (
      stats ?? {
        userId,
        totalGamesPlayed: 0,
        totalWins: 0,
        totalLosses: 0,
        totalWagered: 0,
        totalWon: 0,
        bestMultiplier: 0,
        longestStreak: 0,
      }
    );
  }
}
