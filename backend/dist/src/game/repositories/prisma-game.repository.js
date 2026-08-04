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
exports.PrismaGameRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const card_interface_1 = require("../../game-engine/interfaces/card.interface");
let PrismaGameRepository = class PrismaGameRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createGame(params) {
        const row = await this.prisma.game.create({
            data: {
                id: params.id,
                userId: params.userId,
                betAmount: params.betAmount,
                aceMode: params.aceMode,
                equalRule: params.equalRule,
                // serverSeed intentionally omitted — stays NULL until finalizeGame(),
                // so it is never queryable in Postgres while the game is ACTIVE.
                serverSeedHash: params.serverSeedHash,
                clientSeed: params.clientSeed,
                nonce: params.nonce,
            },
        });
        return this.toRow(row);
    }
    async deleteGame(id) {
        await this.prisma.game.delete({ where: { id } });
    }
    async getGameById(id) {
        const row = await this.prisma.game.findUnique({ where: { id } });
        return row ? this.toRow(row) : null;
    }
    async getGameHistory(userId, limit = 50, offset = 0) {
        const rows = await this.prisma.game.findMany({
            where: { userId },
            orderBy: { startedAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return rows.map((row) => this.toRow(row));
    }
    async getMoves(gameId) {
        const rows = await this.prisma.gameMove.findMany({ where: { gameId }, orderBy: { moveIndex: 'asc' } });
        const deckByCode = new Map((0, card_interface_1.buildOrderedDeck)().map((c) => [c.code, c]));
        return rows.map((m) => ({
            gameId,
            moveIndex: m.moveIndex,
            currentCard: deckByCode.get(m.currentCardCode),
            nextCard: deckByCode.get(m.nextCardCode),
            prediction: m.prediction,
            result: m.result,
            multiplierAfter: Number(m.multiplierAfter),
        }));
    }
    async getGamesEndedInRange(start, end) {
        const rows = await this.prisma.game.findMany({
            where: { status: { not: 'ACTIVE' }, endedAt: { gte: start, lt: end } },
        });
        return rows.map((row) => this.toRow(row));
    }
    async getDistinctPlayerCountInRange(start, end) {
        const rows = await this.prisma.game.findMany({
            where: { startedAt: { gte: start, lt: end } },
            select: { userId: true },
            distinct: ['userId'],
        });
        return rows.length;
    }
    async getStaleActiveGames(olderThan) {
        const rows = await this.prisma.game.findMany({
            where: { status: 'ACTIVE', updatedAt: { lt: olderThan } },
        });
        return rows.map((row) => this.toRow(row));
    }
    async appendMove(gameId, move, updated) {
        await this.prisma.$transaction([
            this.prisma.gameMove.create({
                data: {
                    gameId,
                    moveIndex: move.moveIndex,
                    currentCardCode: move.currentCard.code,
                    nextCardCode: move.nextCard.code,
                    prediction: move.prediction,
                    result: move.result,
                    multiplierAfter: move.multiplierAfter,
                },
            }),
            this.prisma.game.update({
                where: { id: gameId },
                data: { streak: updated.streak, cursor: updated.cursor, currentMultiplier: updated.currentMultiplier },
            }),
        ]);
    }
    async finalizeGame(id, params) {
        await this.prisma.game.update({
            where: { id },
            data: {
                status: params.status,
                payout: params.payout,
                serverSeed: params.serverSeed, // revealed for the first (and only) time here
                endedAt: params.endedAt,
            },
        });
    }
    toRow(row) {
        return {
            id: row.id,
            userId: row.userId,
            betAmount: Number(row.betAmount),
            status: row.status,
            aceMode: row.aceMode,
            equalRule: row.equalRule,
            serverSeed: row.serverSeed ?? undefined,
            serverSeedHash: row.serverSeedHash,
            clientSeed: row.clientSeed,
            nonce: row.nonce,
            streak: row.streak,
            cursor: row.cursor,
            currentMultiplier: Number(row.currentMultiplier),
            payout: row.payout != null ? Number(row.payout) : undefined,
            startedAt: row.startedAt,
            endedAt: row.endedAt ?? undefined,
            updatedAt: row.updatedAt,
        };
    }
};
exports.PrismaGameRepository = PrismaGameRepository;
exports.PrismaGameRepository = PrismaGameRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaGameRepository);
