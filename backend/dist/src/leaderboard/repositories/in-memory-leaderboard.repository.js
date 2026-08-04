"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryLeaderboardRepository = void 0;
const common_1 = require("@nestjs/common");
let InMemoryLeaderboardRepository = class InMemoryLeaderboardRepository {
    constructor() {
        this.entries = new Map(); // keyed by `${period}:${userId}`
        this.usernames = new Map();
    }
    /** Test/demo helper only. */
    _setUsername(userId, username) {
        this.usernames.set(userId, username);
    }
    async recordResult(userId, period, params) {
        const key = `${period}:${userId}`;
        const existing = this.entries.get(key) ?? {
            userId,
            username: this.usernames.get(userId),
            period,
            totalWinnings: 0,
            gamesPlayed: 0,
            bestMultiplier: 0,
        };
        existing.totalWinnings = Number((existing.totalWinnings + params.winningsDelta).toFixed(8));
        existing.gamesPlayed += 1;
        existing.bestMultiplier = Math.max(existing.bestMultiplier, params.multiplierAchieved);
        this.entries.set(key, existing);
    }
    async getTopN(period, limit) {
        return [...this.entries.values()]
            .filter((e) => e.period === period)
            .sort((a, b) => b.totalWinnings - a.totalWinnings)
            .slice(0, limit)
            .map((e, i) => ({ ...e, rank: i + 1 }));
    }
    async recalculateRanks(period) {
        const sorted = [...this.entries.values()].filter((e) => e.period === period).sort((a, b) => b.totalWinnings - a.totalWinnings);
        sorted.forEach((entry, i) => {
            entry.rank = i + 1;
        });
    }
};
exports.InMemoryLeaderboardRepository = InMemoryLeaderboardRepository;
exports.InMemoryLeaderboardRepository = InMemoryLeaderboardRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryLeaderboardRepository);
