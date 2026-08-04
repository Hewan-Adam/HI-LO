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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaLeaderboardRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let PrismaLeaderboardRepository = class PrismaLeaderboardRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordResult(userId, period, params) {
        await this.prisma.leaderboard.upsert({
            where: { userId_period: { userId, period } },
            create: {
                userId,
                period,
                totalWinnings: params.winningsDelta,
                gamesPlayed: 1,
                bestMultiplier: params.multiplierAchieved,
            },
            update: {
                totalWinnings: { increment: params.winningsDelta },
                gamesPlayed: { increment: 1 },
            },
        });
        // bestMultiplier needs max-semantics, same conditional-retry approach as StatisticsRepository.
        await this.raiseBestMultiplierIfHigher(userId, period, params.multiplierAchieved);
    }
    async raiseBestMultiplierIfHigher(userId, period, candidate, attempt = 0) {
        if (attempt > 5)
            return;
        const current = await this.prisma.leaderboard.findUniqueOrThrow({ where: { userId_period: { userId, period } } });
        const currentValue = Number(current.bestMultiplier);
        if (candidate <= currentValue)
            return;
        const result = await this.prisma.leaderboard.updateMany({
            where: { userId, period, bestMultiplier: currentValue },
            data: { bestMultiplier: candidate },
        });
        if (result.count === 0) {
            await this.raiseBestMultiplierIfHigher(userId, period, candidate, attempt + 1);
        }
    }
    async getTopN(period, limit) {
        const rows = await this.prisma.leaderboard.findMany({
            where: { period },
            orderBy: { totalWinnings: 'desc' },
            take: limit,
            include: { user: { select: { username: true } } },
        });
        return rows.map((row) => ({
            userId: row.userId,
            username: row.user?.username ?? undefined,
            period: row.period,
            totalWinnings: Number(row.totalWinnings),
            gamesPlayed: row.gamesPlayed,
            bestMultiplier: Number(row.bestMultiplier),
            rank: row.rank ?? undefined,
        }));
    }
    async recalculateRanks(period) {
        const rows = await this.prisma.leaderboard.findMany({
            where: { period },
            orderBy: { totalWinnings: 'desc' },
            select: { id: true },
        });
        // Sequential on purpose: this runs as an infrequent background job, not
        // a hot path, so a batch of simple awaited updates is fine and avoids
        // needing a raw SQL window-function query here.
        for (let i = 0; i < rows.length; i++) {
            await this.prisma.leaderboard.update({ where: { id: rows[i].id }, data: { rank: i + 1 } });
        }
    }
};
exports.PrismaLeaderboardRepository = PrismaLeaderboardRepository;
exports.PrismaLeaderboardRepository = PrismaLeaderboardRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaLeaderboardRepository);
