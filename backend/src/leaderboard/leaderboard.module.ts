import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './services/leaderboard.service';
import { PrismaLeaderboardRepository } from './repositories/prisma-leaderboard.repository';
import { LEADERBOARD_REPOSITORY } from './interfaces/leaderboard-repository.interface';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, { provide: LEADERBOARD_REPOSITORY, useClass: PrismaLeaderboardRepository }],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
