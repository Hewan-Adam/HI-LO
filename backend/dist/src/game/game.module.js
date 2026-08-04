"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameModule = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const game_engine_module_1 = require("../game-engine/game-engine.module");
const wallet_module_1 = require("../wallet/wallet.module");
const statistics_module_1 = require("../statistics/statistics.module");
const leaderboard_module_1 = require("../leaderboard/leaderboard.module");
const admin_settings_module_1 = require("../admin-settings/admin-settings.module");
const admin_settings_service_1 = require("../admin-settings/services/admin-settings.service");
const game_controller_1 = require("./game.controller");
const game_api_service_1 = require("./services/game-api.service");
const game_sweep_scheduler_1 = require("./services/game-sweep.scheduler");
const game_repository_interface_1 = require("./interfaces/game-repository.interface");
const prisma_game_repository_1 = require("./repositories/prisma-game.repository");
const game_state_store_interface_1 = require("./interfaces/game-state-store.interface");
const redis_game_state_store_1 = require("./stores/redis-game-state.store");
const game_rules_provider_1 = require("./services/game-rules.provider");
const REDIS_CLIENT = Symbol('REDIS_CLIENT');
let GameModule = class GameModule {
};
exports.GameModule = GameModule;
exports.GameModule = GameModule = __decorate([
    (0, common_1.Module)({
        imports: [game_engine_module_1.GameEngineModule, wallet_module_1.WalletModule, statistics_module_1.StatisticsModule, leaderboard_module_1.LeaderboardModule, admin_settings_module_1.AdminSettingsModule],
        controllers: [game_controller_1.GameController],
        providers: [
            game_api_service_1.GameApiService,
            game_sweep_scheduler_1.GameSweepScheduler,
            { provide: game_repository_interface_1.GAME_REPOSITORY, useClass: prisma_game_repository_1.PrismaGameRepository },
            {
                provide: game_rules_provider_1.GAME_RULES_PROVIDER,
                useFactory: (adminSettings) => new game_rules_provider_1.AdminSettingsGameRulesProvider(adminSettings),
                inject: [admin_settings_service_1.AdminSettingsService],
            },
            {
                provide: REDIS_CLIENT,
                useFactory: () => new ioredis_1.default(process.env.REDIS_URL ?? 'redis://localhost:6379'),
            },
            {
                provide: game_state_store_interface_1.GAME_STATE_STORE,
                useFactory: (redis) => new redis_game_state_store_1.RedisGameStateStore(redis),
                inject: [REDIS_CLIENT],
            },
        ],
        exports: [game_repository_interface_1.GAME_REPOSITORY],
    })
], GameModule);
