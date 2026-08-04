"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStatisticsRepository = void 0;
const common_1 = require("@nestjs/common");
let InMemoryStatisticsRepository = class InMemoryStatisticsRepository {
    constructor() {
        this.stats = new Map();
    }
    async recordGameResult(userId, result) {
        const existing = this.stats.get(userId) ?? {
            userId,
            totalGamesPlayed: 0,
            totalWins: 0,
            totalLosses: 0,
            totalWagered: 0,
            totalWon: 0,
            bestMultiplier: 0,
            longestStreak: 0,
        };
        existing.totalGamesPlayed += 1;
        if (result.isWin)
            existing.totalWins += 1;
        else
            existing.totalLosses += 1;
        existing.totalWagered = Number((existing.totalWagered + result.wagered).toFixed(8));
        existing.totalWon = Number((existing.totalWon + result.won).toFixed(8));
        existing.bestMultiplier = Math.max(existing.bestMultiplier, result.multiplierAchieved);
        existing.longestStreak = Math.max(existing.longestStreak, result.streakAchieved);
        this.stats.set(userId, existing);
        return { ...existing };
    }
    async getStatistics(userId) {
        const row = this.stats.get(userId);
        return row ? { ...row } : null;
    }
};
exports.InMemoryStatisticsRepository = InMemoryStatisticsRepository;
exports.InMemoryStatisticsRepository = InMemoryStatisticsRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryStatisticsRepository);
