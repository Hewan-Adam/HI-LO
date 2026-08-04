import { Injectable } from '@nestjs/common';
import { AdminUserDetail, AdminUserRepository, AdminUserSearchFilters, AdminUserSummary } from '../interfaces/admin-user-repository.interface';
import { Role } from '../../auth/interfaces/auth-types';

@Injectable()
export class InMemoryAdminUserRepository implements AdminUserRepository {
  private users = new Map<string, AdminUserSummary>();
  private walletBalances = new Map<string, { balance: number; bonusBalance: number }>();
  private stats = new Map<string, { totalGamesPlayed: number; totalWagered: number }>();

  /** Test/demo helper only. */
  _addUser(user: AdminUserSummary): void {
    this.users.set(user.id, user);
  }

  /** Test/demo helper only. */
  _setWallet(userId: string, balance: number, bonusBalance: number): void {
    this.walletBalances.set(userId, { balance, bonusBalance });
  }

  /** Test/demo helper only. */
  _setStats(userId: string, totalGamesPlayed: number, totalWagered: number): void {
    this.stats.set(userId, { totalGamesPlayed, totalWagered });
  }

  async search(filters: AdminUserSearchFilters): Promise<AdminUserSummary[]> {
    return [...this.users.values()]
      .filter((u) => !filters.telegramId || u.telegramId.includes(filters.telegramId))
      .filter((u) => !filters.username || (u.username ?? '').toLowerCase().includes(filters.username!.toLowerCase()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 50));
  }

  async getDetail(userId: string): Promise<AdminUserDetail | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    const wallet = this.walletBalances.get(userId) ?? { balance: 0, bonusBalance: 0 };
    const stats = this.stats.get(userId) ?? { totalGamesPlayed: 0, totalWagered: 0 };
    return { ...user, walletBalance: wallet.balance, walletBonusBalance: wallet.bonusBalance, ...stats };
  }

  async getRole(userId: string): Promise<Role | null> {
    return this.users.get(userId)?.role ?? null;
  }

  async setBanStatus(userId: string, banned: boolean, reason?: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) return;
    user.isBanned = banned;
    user.bannedReason = banned ? reason : undefined;
  }
}
