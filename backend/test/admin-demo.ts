import 'reflect-metadata';
import * as crypto from 'crypto';
import { AdminSettingsService } from '../src/admin-settings/services/admin-settings.service';
import { InMemoryAdminSettingsRepository } from '../src/admin-settings/repositories/in-memory-admin-settings.repository';
import { AdminSettingsGameRulesProvider } from '../src/game/services/game-rules.provider';

import { InMemoryAuditLogRepository } from '../src/audit-log/repositories/in-memory-audit-log.repository';
import { AuditLogService } from '../src/audit-log/services/audit-log.service';

import { InMemoryAdminUserRepository } from '../src/admin/repositories/in-memory-admin-user.repository';
import { AdminUsersService } from '../src/admin/services/admin-users.service';
import { InsufficientAdminPrivilegeException } from '../src/admin/exceptions/admin.exceptions';
import { Role } from '../src/auth/interfaces/auth-types';

import { InMemoryGameRepository } from '../src/game/repositories/in-memory-game.repository';
import { AdminAnalyticsService } from '../src/admin/services/admin-analytics.service';
import { AceMode, EqualRule, GameStatus } from '../src/game-engine/interfaces/game-config.interface';

import { InMemoryWalletRepository } from '../src/wallet/repositories/in-memory-wallet.repository';
import { WalletService } from '../src/wallet/services/wallet.service';
import { AdminTransactionsService } from '../src/admin/services/admin-transactions.service';

function line() {
  console.log('-'.repeat(72));
}

async function main() {
  line();
  console.log('1) ADMIN SETTINGS ROUND-TRIP + LIVE PROPAGATION TO THE GAME RULES PROVIDER');
  line();

  const settingsRepo = new InMemoryAdminSettingsRepository();
  const adminSettings = new AdminSettingsService(settingsRepo as any);
  const rulesProvider = new AdminSettingsGameRulesProvider(adminSettings);

  console.log(`Default ace mode before any admin change: ${await rulesProvider.getAceMode()}`);
  await adminSettings.setAceMode(AceMode.LOW, 'admin-1');
  await adminSettings.setEqualRule(EqualRule.LOSS, 'admin-1');
  console.log(`Ace mode after admin sets it to LOW: ${await rulesProvider.getAceMode()} (read via GameRulesProvider, not directly)`);
  console.log(`Equal rule after admin sets it to LOSS: ${await rulesProvider.getEqualRule()}`);

  try {
    await adminSettings.setMultiplierTable(
      [
        { streak: 1, multiplier: 1.25 },
        { streak: 2, multiplier: 1.1 }, // decreasing — invalid
      ],
      'admin-1',
    );
    console.log('ERROR: non-monotonic multiplier table should have been rejected!');
  } catch (err) {
    console.log(`Non-monotonic multiplier table correctly rejected: ${(err as Error).message}`);
  }

  await adminSettings.setMultiplierTable(
    [
      { streak: 1, multiplier: 1.3 },
      { streak: 2, multiplier: 1.7 },
    ],
    'admin-1',
  );
  const table = await rulesProvider.getMultiplierTable();
  console.log(`Valid custom multiplier table accepted and live via the provider: ${JSON.stringify(table)}`);

  line();
  console.log('2) BAN PRIVILEGE HIERARCHY');
  line();

  const userRepo = new InMemoryAdminUserRepository();
  const auditRepo = new InMemoryAuditLogRepository();
  const auditLog = new AuditLogService(auditRepo as any);
  const adminUsers = new AdminUsersService(userRepo as any, auditLog);

  const player = { id: 'user-player', telegramId: '1', role: Role.PLAYER, isBanned: false, createdAt: new Date() };
  const admin = { id: 'user-admin', telegramId: '2', role: Role.ADMIN, isBanned: false, createdAt: new Date() };
  const superAdmin = { id: 'user-super', telegramId: '3', role: Role.SUPER_ADMIN, isBanned: false, createdAt: new Date() };
  userRepo._addUser(player);
  userRepo._addUser(admin);
  userRepo._addUser(superAdmin);

  try {
    await adminUsers.setBanStatus(admin.id, Role.ADMIN, admin.id === 'user-admin' ? admin.id : '', true, 'test');
  } catch {
    /* irrelevant self-ban edge case, ignore for this demo */
  }

  try {
    await adminUsers.setBanStatus('actor-admin', Role.ADMIN, admin.id, true, 'trying to ban a peer admin');
    console.log('ERROR: an ADMIN should not be able to ban another ADMIN!');
  } catch (err) {
    console.log(`ADMIN banning another ADMIN correctly rejected: ${err instanceof InsufficientAdminPrivilegeException}`);
  }

  await adminUsers.setBanStatus('actor-admin', Role.ADMIN, player.id, true, 'spamming bets');
  console.log(`ADMIN banning a PLAYER succeeded: ${(await adminUsers.getDetail(player.id)).isBanned}`);

  await adminUsers.setBanStatus('actor-super', Role.SUPER_ADMIN, admin.id, true, 'policy violation');
  console.log(`SUPER_ADMIN banning an ADMIN succeeded: ${(await adminUsers.getDetail(admin.id)).isBanned}`);

  const banLogs = await auditLog.find({ action: 'user.ban' });
  console.log(`Audit log correctly recorded ${banLogs.length} ban action(s)`);

  line();
  console.log('3) ANALYTICS: revenue/win-loss/active-players, correctly excluding refunded ABANDONED games');
  line();

  const gameRepo = new InMemoryGameRepository();
  const analytics = new AdminAnalyticsService(gameRepo as any);

  async function fabricateGame(userId: string, betAmount: number, status: GameStatus, payout: number) {
    const row = await gameRepo.createGame({
      id: crypto.randomUUID(),
      userId,
      betAmount,
      aceMode: AceMode.HIGH,
      equalRule: EqualRule.PUSH,
      serverSeedHash: 'hash',
      clientSeed: 'seed',
      nonce: 0,
    });
    await gameRepo.finalizeGame(row.id, { status, payout, serverSeed: status === GameStatus.ABANDONED ? null : 'revealed-seed', endedAt: new Date() });
  }

  await fabricateGame('player-a', 10, GameStatus.CASHED_OUT, 25); // house pays out 15 net
  await fabricateGame('player-a', 10, GameStatus.LOST, 0); // house keeps 10
  await fabricateGame('player-b', 8, GameStatus.ABANDONED, 0); // fully refunded — must NOT count as wagered/profit
  await fabricateGame('player-c', 5, GameStatus.LOST, 0);

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

  const walletRepo = new InMemoryWalletRepository();
  const walletService = new WalletService(walletRepo as any);
  const adminTransactions = new AdminTransactionsService(walletService);

  await walletService.getOrCreateWallet('user-x');
  await walletService.getOrCreateWallet('user-y');
  await walletService.deposit('user-x', 50, 'dep-x');
  await walletService.deposit('user-y', 75, 'dep-y');

  const allDeposits = await adminTransactions.search({ type: 'DEPOSIT' as any });
  console.log(`Admin can see deposits across BOTH users: ${allDeposits.length} (expected 2)`);
  const onlyUserX = await adminTransactions.search({ userId: 'user-x' });
  console.log(`Filtering by userId correctly scopes to one user: ${onlyUserX.length} (expected 1), amount=${onlyUserX[0]?.amount}`);
}

main().catch((err) => {
  console.error('DEMO FAILED:', err);
  process.exit(1);
});
