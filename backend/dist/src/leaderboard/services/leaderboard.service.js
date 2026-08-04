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
exports.LeaderboardService = void 0;
const common_1 = require("@nestjs/common");
const leaderboard_repository_interface_1 = require("../interfaces/leaderboard-repository.interface");
let LeaderboardService = class LeaderboardService {
    constructor(repository) {
        this.repository = repository;
    }
    /** Called once per settled game that resulted in a payout (a cashout). Losses don't move the leaderboard — it tracks winnings, not activity. */
    async recordWin(userId, winningsDelta, multiplierAchieved) {
        await Promise.all([
            this.repository.recordResult(userId, leaderboard_repository_interface_1.ALL_TIME_PERIOD, { winningsDelta, multiplierAchieved }),
            this.repository.recordResult(userId, (0, leaderboard_repository_interface_1.currentDailyPeriod)(), { winningsDelta, multiplierAchieved }),
        ]);
    }
    async getTopN(period, limit = 20) {
        return this.repository.getTopN(period, limit);
    }
    async getTodayTopN(limit = 20) {
        return this.repository.getTopN((0, leaderboard_repository_interface_1.currentDailyPeriod)(), limit);
    }
    async getAllTimeTopN(limit = 20) {
        return this.repository.getTopN(leaderboard_repository_interface_1.ALL_TIME_PERIOD, limit);
    }
};
exports.LeaderboardService = LeaderboardService;
exports.LeaderboardService = LeaderboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(leaderboard_repository_interface_1.LEADERBOARD_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], LeaderboardService);
