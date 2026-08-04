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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisGameStateStore = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const serialized_game_state_1 = require("../interfaces/serialized-game-state");
const KEY_PREFIX = 'game:active:';
let RedisGameStateStore = class RedisGameStateStore {
    constructor(redis) {
        this.redis = redis;
    }
    key(gameId) {
        return `${KEY_PREFIX}${gameId}`;
    }
    async save(gameId, state, ttlSeconds) {
        await this.redis.set(this.key(gameId), (0, serialized_game_state_1.serializeGameState)(state), 'EX', ttlSeconds);
    }
    async load(gameId) {
        const raw = await this.redis.get(this.key(gameId));
        return raw ? (0, serialized_game_state_1.deserializeGameState)(raw) : null;
    }
    async delete(gameId) {
        await this.redis.del(this.key(gameId));
    }
    async refreshTtl(gameId, ttlSeconds) {
        await this.redis.expire(this.key(gameId), ttlSeconds);
    }
};
exports.RedisGameStateStore = RedisGameStateStore;
exports.RedisGameStateStore = RedisGameStateStore = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ioredis_1.default])
], RedisGameStateStore);
