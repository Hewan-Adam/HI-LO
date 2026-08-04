import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './services/leaderboard.service';
import { Public } from '../auth/decorators/auth.decorators';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  // Leaderboards are public within the Mini App — no account required to view them.
  @Public()
  @Get()
  async getLeaderboard(@Query('period') period?: 'today' | 'all-time', @Query('limit') limit?: string) {
    const parsedLimit = limit ? Math.min(Number(limit), 100) : 20;
    const entries =
      period === 'today' ? await this.leaderboardService.getTodayTopN(parsedLimit) : await this.leaderboardService.getAllTimeTopN(parsedLimit);
    return { period: period === 'today' ? 'today' : 'all-time', entries };
  }
}
