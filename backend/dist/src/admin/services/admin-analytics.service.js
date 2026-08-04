"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const game_repository_interface_1 = require("../../game/interfaces/game-repository.interface");
const game_config_interface_1 = require("../../game-engine/interfaces/game-config.interface");
let AdminAnalyticsService = class AdminAnalyticsService {
    constructor(gameRepository) {
        this.gameRepository = gameRepository;
    }
    async getSummary(rangeStart, rangeEnd) {
        const [endedGames, activePlayers] = await Promise.all([
            this.gameRepository.getGamesEndedInRange(rangeStart, rangeEnd),
            this.gameRepository.getDistinctPlayerCountInRange(rangeStart, rangeEnd),
        ]);
        // ABANDONED games were fully refunded (see GameApiService.abandonExpiredGame)
        // — the stake never became house revenue, so they must be excluded from
        // wagered/payout/profit math. Counting a refunded bet as "wagered" would
        // overstate both volume and (since payout is 0) profit. They're still
        // real sessions though, so they're excluded from win/loss and
        // profit-bearing metrics but not hidden from the dashboard entirely —
        // callers can derive `abandonedGames` from `gamesPlayed - settledGames`
        // if needed; this summary reports the settled-game metrics that matter
        // for revenue reporting.
        const settledGames = endedGames.filter((g) => g.status === game_config_interface_1.GameStatus.CASHED_OUT || g.status === game_config_interface_1.GameStatus.LOST);
        const wins = settledGames.filter((g) => g.status === game_config_interface_1.GameStatus.CASHED_OUT).length;
        const losses = settledGames.filter((g) => g.status === game_config_interface_1.GameStatus.LOST).length;
        const totalWagered = this.sum(settledGames, (g) => g.betAmount);
        const totalPaidOut = this.sum(settledGames, (g) => g.payout ?? 0);
        return {
            rangeStart,
            rangeEnd,
            gamesPlayed: settledGames.length,
            wins,
            losses,
            winLossRatio: losses > 0 ? Number((wins / losses).toFixed(4)) : null,
            totalWagered: Number(totalWagered.toFixed(8)),
            totalPaidOut: Number(totalPaidOut.toFixed(8)),
            houseProfit: Number((totalWagered - totalPaidOut).toFixed(8)),
            activePlayers,
            averageSessionDurationSeconds: this.averageSessionDuration(settledGames),
        };
    }
    sum(games, selector) {
        return games.reduce((total, g) => total + selector(g), 0);
    }
    averageSessionDuration(games) {
        const withDuration = games.filter((g) => g.endedAt);
        if (withDuration.length === 0)
            return 0;
        const totalSeconds = withDuration.reduce((total, g) => total + (g.endedAt.getTime() - g.startedAt.getTime()) / 1000, 0);
        return Number((totalSeconds / withDuration.length).toFixed(2));
    }
};
exports.AdminAnalyticsService = AdminAnalyticsService;
exports.AdminAnalyticsService = AdminAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(game_repository_interface_1.GAME_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], AdminAnalyticsService);
