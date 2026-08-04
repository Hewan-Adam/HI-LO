"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const database_module_1 = require("./database/database.module");
const auth_module_1 = require("./auth/auth.module");
const wallet_module_1 = require("./wallet/wallet.module");
const game_engine_module_1 = require("./game-engine/game-engine.module");
const game_module_1 = require("./game/game.module");
const statistics_module_1 = require("./statistics/statistics.module");
const leaderboard_module_1 = require("./leaderboard/leaderboard.module");
const admin_settings_module_1 = require("./admin-settings/admin-settings.module");
const audit_log_module_1 = require("./audit-log/audit-log.module");
const admin_module_1 = require("./admin/admin.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const roles_guard_1 = require("./auth/guards/roles.guard");
const user_or_ip_throttler_guard_1 = require("./common/guards/user-or-ip-throttler.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            // Two throttle tiers: a generous default for normal browsing/API use,
            // and routes needing tighter limits (login, guess) override it with
            // @Throttle(...) at the controller level (see AuthController,
            // GameController). In-memory storage — fine for a single instance;
            // horizontally scaling this API would need @nestjs/throttler's Redis
            // storage adapter (we already depend on ioredis) so every instance
            // shares one counter instead of each enforcing its own limit
            // independently, which would silently multiply the effective limit by
            // the instance count.
            throttler_1.ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
            schedule_1.ScheduleModule.forRoot(), // enables @Cron in GameSweepScheduler
            auth_module_1.AuthModule,
            wallet_module_1.WalletModule,
            game_engine_module_1.GameEngineModule,
            game_module_1.GameModule,
            statistics_module_1.StatisticsModule,
            leaderboard_module_1.LeaderboardModule,
            admin_settings_module_1.AdminSettingsModule,
            audit_log_module_1.AuditLogModule,
            admin_module_1.AdminModule,
        ],
        providers: [
            // Explicit, single-place ordering for all three global guards — see
            // the comment in AuthModule for why this isn't split across modules.
            // Intended order: authenticate (attach req.user) -> rate-limit (can
            // then bucket by user id, not just IP) -> authorize (role check).
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: user_or_ip_throttler_guard_1.UserOrIpThrottlerGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.GlobalExceptionFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: logging_interceptor_1.LoggingInterceptor },
        ],
    })
], AppModule);
