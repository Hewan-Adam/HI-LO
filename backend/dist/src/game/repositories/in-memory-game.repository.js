"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryGameRepository = void 0;
const common_1 = require("@nestjs/common");
const game_config_interface_1 = require("../../game-engine/interfaces/game-config.interface");
let InMemoryGameRepository = class InMemoryGameRepository {
    constructor() {
        this.games = new Map();
        this.moves = new Map();
    }
    async createGame(params) {
        const row = {
            id: params.id,
            userId: params.userId,
            betAmount: params.betAmount,
            status: game_config_interface_1.GameStatus.ACTIVE,
            aceMode: params.aceMode,
            equalRule: params.equalRule,
            serverSeedHash: params.serverSeedHash,
            clientSeed: params.clientSeed,
            nonce: params.nonce,
            streak: 0,
            cursor: 0,
            currentMultiplier: 1,
            startedAt: new Date(),
            updatedAt: new Date(),
        };
        this.games.set(row.id, row);
        this.moves.set(row.id, []);
        return { ...row };
    }
    async deleteGame(id) {
        this.games.delete(id);
        this.moves.delete(id);
    }
    async getGameById(id) {
        const row = this.games.get(id);
        return row ? { ...row } : null;
    }
    async getGameHistory(userId, limit = 50, offset = 0) {
        return [...this.games.values()]
            .filter((g) => g.userId === userId)
            .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
            .slice(offset, offset + limit)
            .map((g) => ({ ...g }));
    }
    async getMoves(gameId) {
        return [...(this.moves.get(gameId) ?? [])];
    }
    async getGamesEndedInRange(start, end) {
        return [...this.games.values()]
            .filter((g) => g.status !== game_config_interface_1.GameStatus.ACTIVE && g.endedAt && g.endedAt >= start && g.endedAt < end)
            .map((g) => ({ ...g }));
    }
    async getDistinctPlayerCountInRange(start, end) {
        const userIds = new Set([...this.games.values()].filter((g) => g.startedAt >= start && g.startedAt < end).map((g) => g.userId));
        return userIds.size;
    }
    async appendMove(gameId, move, updated) {
        const row = this.games.get(gameId);
        if (!row)
            throw new Error(`Game ${gameId} not found`);
        const moveList = this.moves.get(gameId) ?? [];
        moveList.push({ ...move, gameId });
        this.moves.set(gameId, moveList);
        row.streak = updated.streak;
        row.cursor = updated.cursor;
        row.currentMultiplier = updated.currentMultiplier;
        row.updatedAt = new Date();
    }
    async getStaleActiveGames(olderThan) {
        return [...this.games.values()]
            .filter((g) => g.status === game_config_interface_1.GameStatus.ACTIVE && g.updatedAt < olderThan)
            .map((g) => ({ ...g }));
    }
    /** Test/demo helper only — not part of the GameRepository interface. Simulates a game that's been idle for a while without needing to actually wait. */
    _debugSetUpdatedAt(gameId, date) {
        const row = this.games.get(gameId);
        if (row)
            row.updatedAt = date;
    }
    async finalizeGame(id, params) {
        const row = this.games.get(id);
        if (!row)
            throw new Error(`Game ${id} not found`);
        row.status = params.status;
        row.payout = params.payout;
        row.serverSeed = params.serverSeed ?? undefined;
        row.endedAt = params.endedAt;
        row.updatedAt = new Date();
    }
};
exports.InMemoryGameRepository = InMemoryGameRepository;
exports.InMemoryGameRepository = InMemoryGameRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryGameRepository);
