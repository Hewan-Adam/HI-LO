import { Inject, Injectable } from '@nestjs/common';
import { ALL_TIME_PERIOD, currentDailyPeriod, LEADERBOARD_REPOSITORY, LeaderboardEntrySnapshot, LeaderboardRepository } from '../interfaces/leaderboard-repository.interface';

@Injectable()
export class LeaderboardService {
  constructor(@Inject(LEADERBOARD_REPOSITORY) private readonly repository: LeaderboardRepository) {}

  /** Called once per settled game that resulted in a payout (a cashout). Losses don't move the leaderboard — it tracks winnings, not activity. */
  async recordWin(userId: string, winningsDelta: number, multiplierAchieved: number): Promise<void> {
    await Promise.all([
      this.repository.recordResult(userId, ALL_TIME_PERIOD, { winningsDelta, multiplierAchieved }),
      this.repository.recordResult(userId, currentDailyPeriod(), { winningsDelta, multiplierAchieved }),
    ]);
  }

  async getTopN(period: string, limit = 20): Promise<LeaderboardEntrySnapshot[]> {
    return this.repository.getTopN(period, limit);
  }

  async getTodayTopN(limit = 20): Promise<LeaderboardEntrySnapshot[]> {
    return this.repository.getTopN(currentDailyPeriod(), limit);
  }

  async getAllTimeTopN(limit = 20): Promise<LeaderboardEntrySnapshot[]> {
    return this.repository.getTopN(ALL_TIME_PERIOD, limit);
  }
}
