"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryGameStateStore = void 0;
const common_1 = require("@nestjs/common");
const serialized_game_state_1 = require("../interfaces/serialized-game-state");
/** Faithful in-memory stand-in for Redis: same serialize-on-write behavior (so bugs in serialization surface here too) and real TTL expiry via wall-clock comparison. */
let InMemoryGameStateStore = class InMemoryGameStateStore {
    constructor() {
        this.store = new Map();
    }
    async save(gameId, state, ttlSeconds) {
        this.store.set(gameId, { payload: (0, serialized_game_state_1.serializeGameState)(state), expiresAt: Date.now() + ttlSeconds * 1000 });
    }
    async load(gameId) {
        const entry = this.store.get(gameId);
        if (!entry)
            return null;
        if (entry.expiresAt < Date.now()) {
            this.store.delete(gameId);
            return null;
        }
        return (0, serialized_game_state_1.deserializeGameState)(entry.payload);
    }
    async delete(gameId) {
        this.store.delete(gameId);
    }
    async refreshTtl(gameId, ttlSeconds) {
        const entry = this.store.get(gameId);
        if (entry)
            entry.expiresAt = Date.now() + ttlSeconds * 1000;
    }
};
exports.InMemoryGameStateStore = InMemoryGameStateStore;
exports.InMemoryGameStateStore = InMemoryGameStateStore = __decorate([
    (0, common_1.Injectable)()
], InMemoryGameStateStore);
