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
exports.PrismaStatisticsRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let PrismaStatisticsRepository = class PrismaStatisticsRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordGameResult(userId, result) {
        // A plain read-modify-write here would race under concurrent settlements
        // for the same user (two games finishing at once). Using `increment` in
        // the upsert makes every field update an atomic column-level operation
        // at the database level — Postgres serializes concurrent increments to
        // the same row rather than one silently overwriting the other's read.
        // `bestMultiplier`/`longestStreak` still need a read-then-conditional-write
        // since Prisma has no atomic "max" upsert primitive; those two are
        // wrapped in a retry loop below.
        await this.prisma.statistics.upsert({
            where: { userId },
            create: {
                userId,
                totalGamesPlayed: 1,
                totalWins: result.isWin ? 1 : 0,
                totalLosses: result.isWin ? 0 : 1,
                totalWagered: result.wagered,
                totalWon: result.won,
                bestMultiplier: result.multiplierAchieved,
                longestStreak: result.streakAchieved,
            },
            update: {
                totalGamesPlayed: { increment: 1 },
                totalWins: { increment: result.isWin ? 1 : 0 },
                totalLosses: { increment: result.isWin ? 0 : 1 },
                totalWagered: { increment: result.wagered },
                totalWon: { increment: result.won },
            },
        });
        await this.raiseIfHigher(userId, 'bestMultiplier', result.multiplierAchieved);
        await this.raiseIfHigher(userId, 'longestStreak', result.streakAchieved);
        const row = await this.prisma.statistics.findUniqueOrThrow({ where: { userId } });
        return this.toSnapshot(row);
    }
    async getStatistics(userId) {
        const row = await this.prisma.statistics.findUnique({ where: { userId } });
        return row ? this.toSnapshot(row) : null;
    }
    /** Retries a conditional "only update if the new value is higher" write against optimistic reads — analogous in spirit to the wallet's version-conditioned update, just without a dedicated version column here since these two fields are the only ones needing max-semantics. */
    async raiseIfHigher(userId, field, candidate, attempt = 0) {
        if (attempt > 5)
            return; // extremely unlikely to matter this many collisions deep; a slightly stale "best" value is not a correctness bug, just a rare cosmetic staleness
        const current = await this.prisma.statistics.findUniqueOrThrow({ where: { userId } });
        const currentValue = Number(current[field]);
        if (candidate <= currentValue)
            return;
        const result = await this.prisma.statistics.updateMany({
            where: { userId, [field]: currentValue },
            data: { [field]: candidate },
        });
        if (result.count === 0) {
            await this.raiseIfHigher(userId, field, candidate, attempt + 1);
        }
    }
    toSnapshot(row) {
        return {
            userId: row.userId,
            totalGamesPlayed: row.totalGamesPlayed,
            totalWins: row.totalWins,
            totalLosses: row.totalLosses,
            totalWagered: Number(row.totalWagered),
            totalWon: Number(row.totalWon),
            bestMultiplier: Number(row.bestMultiplier),
            longestStreak: row.longestStreak,
        };
    }
};
exports.PrismaStatisticsRepository = PrismaStatisticsRepository;
exports.PrismaStatisticsRepository = PrismaStatisticsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaStatisticsRepository);
