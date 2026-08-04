import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeaderboardEntrySnapshot, LeaderboardRepository } from '../interfaces/leaderboard-repository.interface';

@Injectable()
export class PrismaLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async recordResult(userId: string, period: string, params: { winningsDelta: number; multiplierAchieved: number }): Promise<void> {
    await this.prisma.leaderboard.upsert({
      where: { userId_period: { userId, period } },
      create: {
        userId,
        period,
        totalWinnings: params.winningsDelta,
        gamesPlayed: 1,
        bestMultiplier: params.multiplierAchieved,
      },
      update: {
        totalWinnings: { increment: params.winningsDelta },
        gamesPlayed: { increment: 1 },
      },
    });

    // bestMultiplier needs max-semantics, same conditional-retry approach as StatisticsRepository.
    await this.raiseBestMultiplierIfHigher(userId, period, params.multiplierAchieved);
  }

  private async raiseBestMultiplierIfHigher(userId: string, period: string, candidate: number, attempt = 0): Promise<void> {
    if (attempt > 5) return;
    const current = await this.prisma.leaderboard.findUniqueOrThrow({ where: { userId_period: { userId, period } } });
    const currentValue = Number(current.bestMultiplier);
    if (candidate <= currentValue) return;

    const result = await this.prisma.leaderboard.updateMany({
      where: { userId, period, bestMultiplier: currentValue },
      data: { bestMultiplier: candidate },
    });
    if (result.count === 0) {
      await this.raiseBestMultiplierIfHigher(userId, period, candidate, attempt + 1);
    }
  }

  async getTopN(period: string, limit: number): Promise<LeaderboardEntrySnapshot[]> {
    const rows = await this.prisma.leaderboard.findMany({
      where: { period },
      orderBy: { totalWinnings: 'desc' },
      take: limit,
      include: { user: { select: { username: true } } },
    });
    return rows.map((row) => ({
      userId: row.userId,
      username: row.user?.username ?? undefined,
      period: row.period,
      totalWinnings: Number(row.totalWinnings),
      gamesPlayed: row.gamesPlayed,
      bestMultiplier: Number(row.bestMultiplier),
      rank: row.rank ?? undefined,
    }));
  }

  async recalculateRanks(period: string): Promise<void> {
    const rows = await this.prisma.leaderboard.findMany({
      where: { period },
      orderBy: { totalWinnings: 'desc' },
      select: { id: true },
    });
    // Sequential on purpose: this runs as an infrequent background job, not
    // a hot path, so a batch of simple awaited updates is fine and avoids
    // needing a raw SQL window-function query here.
    for (let i = 0; i < rows.length; i++) {
      await this.prisma.leaderboard.update({ where: { id: rows[i].id }, data: { rank: i + 1 } });
    }
  }
}
