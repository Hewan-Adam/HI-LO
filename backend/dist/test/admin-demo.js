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
require("reflect-metadata");
const crypto = __importStar(require("crypto"));
const admin_settings_service_1 = require("../src/admin-settings/services/admin-settings.service");
const in_memory_admin_settings_repository_1 = require("../src/admin-settings/repositories/in-memory-admin-settings.repository");
const game_rules_provider_1 = require("../src/game/services/game-rules.provider");
const in_memory_audit_log_repository_1 = require("../src/audit-log/repositories/in-memory-audit-log.repository");
const audit_log_service_1 = require("../src/audit-log/services/audit-log.service");
const in_memory_admin_user_repository_1 = require("../src/admin/repositories/in-memory-admin-user.repository");
const admin_users_service_1 = require("../src/admin/services/admin-users.service");
const admin_exceptions_1 = require("../src/admin/exceptions/admin.exceptions");
const auth_types_1 = require("../src/auth/interfaces/auth-types");
const in_memory_game_repository_1 = require("../src/game/repositories/in-memory-game.repository");
const admin_analytics_service_1 = require("../src/admin/services/admin-analytics.service");
const game_config_interface_1 = require("../src/game-engine/interfaces/game-config.interface");
const in_memory_wallet_repository_1 = require("../src/wallet/repositories/in-memory-wallet.repository");
const wallet_service_1 = require("../src/wallet/services/wallet.service");
const admin_transactions_service_1 = require("../src/admin/services/admin-transactions.service");
function line() {
    console.log('-'.repeat(72));
}
async function main() {
    line();
    console.log('1) ADMIN SETTINGS ROUND-TRIP + LIVE PROPAGATION TO THE GAME RULES PROVIDER');
    line();
    const settingsRepo = new in_memory_admin_settings_repository_1.InMemoryAdminSettingsRepository();
    const adminSettings = new admin_settings_service_1.AdminSettingsService(settingsRepo);
    const rulesProvider = new game_rules_provider_1.AdminSettingsGameRulesProvider(adminSettings);
    console.log(`Default ace mode before any admin change: ${await rulesProvider.getAceMode()}`);
    await adminSettings.setAceMode(game_config_interface_1.AceMode.LOW, 'admin-1');
    await adminSettings.setEqualRule(game_config_interface_1.EqualRule.LOSS, 'admin-1');
    console.log(`Ace mode after admin sets it to LOW: ${await rulesProvider.getAceMode()} (read via GameRulesProvider, not directly)`);
    console.log(`Equal rule after admin sets it to LOSS: ${await rulesProvider.getEqualRule()}`);
    try {
        await adminSettings.setMultiplierTable([
            { streak: 1, multiplier: 1.25 },
            { streak: 2, multiplier: 1.1 }, // decreasing — invalid
        ], 'admin-1');
        console.log('ERROR: non-monotonic multiplier table should have been rejected!');
    }
    catch (err) {
        console.log(`Non-monotonic multiplier table correctly rejected: ${err.message}`);
    }
    await adminSettings.setMultiplierTable([
        { streak: 1, multiplier: 1.3 },
        { streak: 2, multiplier: 1.7 },
    ], 'admin-1');
    const table = await rulesProvider.getMultiplierTable();
    console.log(`Valid custom multiplier table accepted and live via the provider: ${JSON.stringify(table)}`);
    line();
    console.log('2) BAN PRIVILEGE HIERARCHY');
    line();
    const userRepo = new in_memory_admin_user_repository_1.InMemoryAdminUserRepository();
    const auditRepo = new in_memory_audit_log_repository_1.InMemoryAuditLogRepository();
    const auditLog = new audit_log_service_1.AuditLogService(auditRepo);
    const adminUsers = new admin_users_service_1.AdminUsersService(userRepo, auditLog);
    const player = { id: 'user-player', telegramId: '1', role: auth_types_1.Role.PLAYER, isBanned: false, createdAt: new Date() };
    const admin = { id: 'user-admin', telegramId: '2', role: auth_types_1.Role.ADMIN, isBanned: false, createdAt: new Date() };
    const superAdmin = { id: 'user-super', telegramId: '3', role: auth_types_1.Role.SUPER_ADMIN, isBanned: false, createdAt: new Date() };
    userRepo._addUser(player);
    userRepo._addUser(admin);
    userRepo._addUser(superAdmin);
    try {
        await adminUsers.setBanStatus(admin.id, auth_types_1.Role.ADMIN, admin.id === 'user-admin' ? admin.id : '', true, 'test');
    }
    catch {
        /* irrelevant self-ban edge case, ignore for this demo */
    }
    try {
        await adminUsers.setBanStatus('actor-admin', auth_types_1.Role.ADMIN, admin.id, true, 'trying to ban a peer admin');
        console.log('ERROR: an ADMIN should not be able to ban another ADMIN!');
    }
    catch (err) {
        console.log(`ADMIN banning another ADMIN correctly rejected: ${err instanceof admin_exceptions_1.InsufficientAdminPrivilegeException}`);
    }
    await adminUsers.setBanStatus('actor-admin', auth_types_1.Role.ADMIN, player.id, true, 'spamming bets');
    console.log(`ADMIN banning a PLAYER succeeded: ${(await adminUsers.getDetail(player.id)).isBanned}`);
    await adminUsers.setBanStatus('actor-super', auth_types_1.Role.SUPER_ADMIN, admin.id, true, 'policy violation');
    console.log(`SUPER_ADMIN banning an ADMIN succeeded: ${(await adminUsers.getDetail(admin.id)).isBanned}`);
    const banLogs = await auditLog.find({ action: 'user.ban' });
    console.log(`Audit log correctly recorded ${banLogs.length} ban action(s)`);
    line();
    console.log('3) ANALYTICS: revenue/win-loss/active-players, correctly excluding refunded ABANDONED games');
    line();
    const gameRepo = new in_memory_game_repository_1.InMemoryGameRepository();
    const analytics = new admin_analytics_service_1.AdminAnalyticsService(gameRepo);
    async function fabricateGame(userId, betAmount, status, payout) {
        const row = await gameRepo.createGame({
            id: crypto.randomUUID(),
            userId,
            betAmount,
            aceMode: game_config_interface_1.AceMode.HIGH,
            equalRule: game_config_interface_1.EqualRule.PUSH,
            serverSeedHash: 'hash',
            clientSeed: 'seed',
            nonce: 0,
        });
        await gameRepo.finalizeGame(row.id, { status, payout, serverSeed: status === game_config_interface_1.GameStatus.ABANDONED ? null : 'revealed-seed', endedAt: new Date() });
    }
    await fabricateGame('player-a', 10, game_config_interface_1.GameStatus.CASHED_OUT, 25); // house pays out 15 net
    await fabricateGame('player-a', 10, game_config_interface_1.GameStatus.LOST, 0); // house keeps 10
    await fabricateGame('player-b', 8, game_config_interface_1.GameStatus.ABANDONED, 0); // fully refunded — must NOT count as wagered/profit
    await fabricateGame('player-c', 5, game_config_interface_1.GameStatus.LOST, 0);
    const rangeStart = new Date(Date.now() - 60_000);
    const rangeEnd = new Date(Date.now() + 60_000);
    const summary = await analytics.getSummary(rangeStart, rangeEnd);
    console.log(`gamesPlayed (excludes ABANDONED): ${summary.gamesPlayed} (expected 3)`);
    console.log(`wins=${summary.wins} losses=${summary.losses} winLossRatio=${summary.winLossRatio}`);
    console.log(`totalWagered=${summary.totalWagered} (expected 25 = 10+10+5, the abandoned 8 is excluded)`);
    console.log(`totalPaidOut=${summary.totalPaidOut} (expected 25)`);
    console.log(`houseProfit=${summary.houseProfit} (expected 0 = 25 wagered - 25 paid out)`);
    console.log(`activePlayers=${summary.activePlayers} (expected 3: player-a, player-b, player-c — abandoned games still count as activity)`);
    line();
    console.log('4) CROSS-USER TRANSACTION SEARCH (admin oversight, unlike a user\'s own scoped history)');
    line();
    const walletRepo = new in_memory_wallet_repository_1.InMemoryWalletRepository();
    const walletService = new wallet_service_1.WalletService(walletRepo);
    const adminTransactions = new admin_transactions_service_1.AdminTransactionsService(walletService);
    await walletService.getOrCreateWallet('user-x');
    await walletService.getOrCreateWallet('user-y');
    await walletService.deposit('user-x', 50, 'dep-x');
    await walletService.deposit('user-y', 75, 'dep-y');
    const allDeposits = await adminTransactions.search({ type: 'DEPOSIT' });
    console.log(`Admin can see deposits across BOTH users: ${allDeposits.length} (expected 2)`);
    const onlyUserX = await adminTransactions.search({ userId: 'user-x' });
    console.log(`Filtering by userId correctly scopes to one user: ${onlyUserX.length} (expected 1), amount=${onlyUserX[0]?.amount}`);
}
main().catch((err) => {
    console.error('DEMO FAILED:', err);
    process.exit(1);
});
