import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { GameEngineModule } from './game-engine/game-engine.module';
import { GameModule } from './game/game.module';
import { StatisticsModule } from './statistics/statistics.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AdminSettingsModule } from './admin-settings/admin-settings.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AdminModule } from './admin/admin.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { UserOrIpThrottlerGuard } from './common/guards/user-or-ip-throttler.guard';
import { BotModule } from './bot/bot.module';
@Module({
  imports: [
    BotModule,
    DatabaseModule,
    // Two throttle tiers: a generous default for normal browsing/API use,
    // and routes needing tighter limits (login, guess) override it with
    // @Throttle(...) at the controller level (see AuthController,
    // GameController). In-memory storage — fine for a single instance;
    // horizontally scaling this API would need @nestjs/throttler's Redis
    // storage adapter (we already depend on ioredis) so every instance
    // shares one counter instead of each enforcing its own limit
    // independently, which would silently multiply the effective limit by
    // the instance count.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(), // enables @Cron in GameSweepScheduler
    AuthModule,
    WalletModule,
    GameEngineModule,
    GameModule,
    StatisticsModule,
    LeaderboardModule,
    AdminSettingsModule,
    AuditLogModule,
    AdminModule,
  ],
  providers: [
    // Explicit, single-place ordering for all three global guards — see
    // the comment in AuthModule for why this isn't split across modules.
    // Intended order: authenticate (attach req.user) -> rate-limit (can
    // then bucket by user id, not just IP) -> authorize (role check).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserOrIpThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
