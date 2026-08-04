"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryAdminUserRepository = void 0;
const common_1 = require("@nestjs/common");
let InMemoryAdminUserRepository = class InMemoryAdminUserRepository {
    constructor() {
        this.users = new Map();
        this.walletBalances = new Map();
        this.stats = new Map();
    }
    /** Test/demo helper only. */
    _addUser(user) {
        this.users.set(user.id, user);
    }
    /** Test/demo helper only. */
    _setWallet(userId, balance, bonusBalance) {
        this.walletBalances.set(userId, { balance, bonusBalance });
    }
    /** Test/demo helper only. */
    _setStats(userId, totalGamesPlayed, totalWagered) {
        this.stats.set(userId, { totalGamesPlayed, totalWagered });
    }
    async search(filters) {
        return [...this.users.values()]
            .filter((u) => !filters.telegramId || u.telegramId.includes(filters.telegramId))
            .filter((u) => !filters.username || (u.username ?? '').toLowerCase().includes(filters.username.toLowerCase()))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50));
    }
    async getDetail(userId) {
        const user = this.users.get(userId);
        if (!user)
            return null;
        const wallet = this.walletBalances.get(userId) ?? { balance: 0, bonusBalance: 0 };
        const stats = this.stats.get(userId) ?? { totalGamesPlayed: 0, totalWagered: 0 };
        return { ...user, walletBalance: wallet.balance, walletBonusBalance: wallet.bonusBalance, ...stats };
    }
    async getRole(userId) {
        return this.users.get(userId)?.role ?? null;
    }
    async setBanStatus(userId, banned, reason) {
        const user = this.users.get(userId);
        if (!user)
            return;
        user.isBanned = banned;
        user.bannedReason = banned ? reason : undefined;
    }
};
exports.InMemoryAdminUserRepository = InMemoryAdminUserRepository;
exports.InMemoryAdminUserRepository = InMemoryAdminUserRepository = __decorate([
    (0, common_1.Injectable)()
], InMemoryAdminUserRepository);
