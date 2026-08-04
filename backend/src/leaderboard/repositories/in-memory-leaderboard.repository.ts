import { Injectable } from '@nestjs/common';
import { LeaderboardEntrySnapshot, LeaderboardRepository } from '../interfaces/leaderboard-repository.interface';

@Injectable()
export class InMemoryLeaderboardRepository implements LeaderboardRepository {
  private entries = new Map<string, LeaderboardEntrySnapshot>(); // keyed by `${period}:${userId}`
  private usernames = new Map<string, string>();

  /** Test/demo helper only. */
  _setUsername(userId: string, username: string): void {
    this.usernames.set(userId, username);
  }

  async recordResult(userId: string, period: string, params: { winningsDelta: number; multiplierAchieved: number }): Promise<void> {
    const key = `${period}:${userId}`;
    const existing = this.entries.get(key) ?? {
      userId,
      username: this.usernames.get(userId),
      period,
      totalWinnings: 0,
      gamesPlayed: 0,
      bestMultiplier: 0,
    };

    existing.totalWinnings = Number((existing.totalWinnings + params.winningsDelta).toFixed(8));
    existing.gamesPlayed += 1;
    existing.bestMultiplier = Math.max(existing.bestMultiplier, params.multiplierAchieved);

    this.entries.set(key, existing);
  }

  async getTopN(period: string, limit: number): Promise<LeaderboardEntrySnapshot[]> {
    return [...this.entries.values()]
      .filter((e) => e.period === period)
      .sort((a, b) => b.totalWinnings - a.totalWinnings)
      .slice(0, limit)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  async recalculateRanks(period: string): Promise<void> {
    const sorted = [...this.entries.values()].filter((e) => e.period === period).sort((a, b) => b.totalWinnings - a.totalWinnings);
    sorted.forEach((entry, i) => {
      entry.rank = i + 1;
    });
  }
}
