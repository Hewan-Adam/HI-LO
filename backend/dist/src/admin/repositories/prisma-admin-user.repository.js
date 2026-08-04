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
exports.PrismaAdminUserRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let PrismaAdminUserRepository = class PrismaAdminUserRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async search(filters) {
        const rows = await this.prisma.user.findMany({
            where: {
                telegramId: filters.telegramId ? { contains: filters.telegramId } : undefined,
                username: filters.username ? { contains: filters.username, mode: 'insensitive' } : undefined,
            },
            orderBy: { createdAt: 'desc' },
            take: filters.limit ?? 50,
            skip: filters.offset ?? 0,
        });
        return rows.map((row) => this.toSummary(row));
    }
    async getDetail(userId) {
        const row = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { wallet: true, statistics: true },
        });
        if (!row)
            return null;
        return {
            ...this.toSummary(row),
            walletBalance: row.wallet ? Number(row.wallet.balance) : 0,
            walletBonusBalance: row.wallet ? Number(row.wallet.bonusBalance) : 0,
            totalGamesPlayed: row.statistics?.totalGamesPlayed ?? 0,
            totalWagered: row.statistics ? Number(row.statistics.totalWagered) : 0,
        };
    }
    async getRole(userId) {
        const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        return row ? row.role : null;
    }
    async setBanStatus(userId, banned, reason) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { isBanned: banned, bannedReason: banned ? reason : null },
        });
    }
    toSummary(row) {
        return {
            id: row.id,
            telegramId: row.telegramId,
            username: row.username ?? undefined,
            firstName: row.firstName ?? undefined,
            lastName: row.lastName ?? undefined,
            role: row.role,
            isBanned: row.isBanned,
            bannedReason: row.bannedReason ?? undefined,
            createdAt: row.createdAt,
        };
    }
};
exports.PrismaAdminUserRepository = PrismaAdminUserRepository;
exports.PrismaAdminUserRepository = PrismaAdminUserRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaAdminUserRepository);
