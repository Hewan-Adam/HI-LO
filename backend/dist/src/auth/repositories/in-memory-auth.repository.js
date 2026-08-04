"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAuthRepository = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const auth_types_1 = require("../interfaces/auth-types");
let InMemoryAuthRepository = class InMemoryAuthRepository {
    constructor() {
        this.usersByTelegramId = new Map();
        this.usersById = new Map();
        this.refreshTokens = new Map(); // keyed by tokenHash
    }
    async findUserByTelegramId(telegramId) {
        return this.usersByTelegramId.get(telegramId) ?? null;
    }
    async findFirstUser() {
        return this.usersById.values().next().value ?? null;
    }
    async createUser(params) {
        const user = {
            id: crypto.randomUUID(),
            telegramId: params.telegramId,
            username: params.username,
            role: auth_types_1.Role.PLAYER,
            isBanned: false,
        };
        this.usersByTelegramId.set(user.telegramId, user);
        this.usersById.set(user.id, user);
        return user;
    }
    async findUserById(userId) {
        return this.usersById.get(userId) ?? null;
    }
    async storeRefreshToken(params) {
        const record = {
            id: crypto.randomUUID(),
            userId: params.userId,
            tokenHash: params.tokenHash,
            familyId: params.familyId,
            revoked: false,
            expiresAt: params.expiresAt,
            createdAt: new Date(),
        };
        this.refreshTokens.set(record.tokenHash, record);
        return record;
    }
    async findRefreshTokenByHash(tokenHash) {
        return this.refreshTokens.get(tokenHash) ?? null;
    }
    async markRotated(tokenHash, replacedByTokenHash) {
        const record = this.refreshTokens.get(tokenHash);
        if (!record)
            return;
        record.revoked = true;
        record.replacedByTokenHash = replacedByTokenHash;
    }
    async revokeFamily(familyId) {
        for (const record of this.refreshTokens.values()) {
            if (record.familyId === familyId) {
                record.revoked = true;
            }
        }
    }
    /** Test/demo helper only — not part of the AuthRepository interface. */
    _setUserBanned(userId, banned) {
        const user = this.usersById.get(userId);
        if (user)
            user.isBanned = banned;
    }
    /** Test/demo helper only. */
    _setUserRole(userId, role) {
        const user = this.usersById.get(userId);
        if (user)
            user.role = role;
    }
};
exports.InMemoryAuthRepository = InMemoryAuthRepository;
exports.InMemoryAuthRepository = InMemoryAuthRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryAuthRepository);
