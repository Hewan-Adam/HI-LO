import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { GameEngineModule } from '../game-engine/game-engine.module';
import { WalletModule } from '../wallet/wallet.module';
import { StatisticsModule } from '../statistics/statistics.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { AdminSettingsService } from '../admin-settings/services/admin-settings.service';
import { GameController } from './game.controller';
import { GameApiService } from './services/game-api.service';
import { GameSweepScheduler } from './services/game-sweep.scheduler';
import { GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { PrismaGameRepository } from './repositories/prisma-game.repository';
import { GAME_STATE_STORE } from './interfaces/game-state-store.interface';
import { RedisGameStateStore } from './stores/redis-game-state.store';
import { GAME_RULES_PROVIDER, AdminSettingsGameRulesProvider } from './services/game-rules.provider';

const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Module({
  imports: [GameEngineModule, WalletModule, StatisticsModule, LeaderboardModule, AdminSettingsModule],
  controllers: [GameController],
  providers: [
    GameApiService,
    GameSweepScheduler,
    { provide: GAME_REPOSITORY, useClass: PrismaGameRepository },
    {
      provide: GAME_RULES_PROVIDER,
      useFactory: (adminSettings: AdminSettingsService) => new AdminSettingsGameRulesProvider(adminSettings),
      inject: [AdminSettingsService],
    },
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
    {
      provide: GAME_STATE_STORE,
      useFactory: (redis: Redis) => new RedisGameStateStore(redis),
      inject: [REDIS_CLIENT],
    },
  ],
  exports: [GAME_REPOSITORY],
})
export class GameModule {}
