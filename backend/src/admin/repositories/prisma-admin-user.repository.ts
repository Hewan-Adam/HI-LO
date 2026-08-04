import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AdminUserDetail, AdminUserRepository, AdminUserSearchFilters, AdminUserSummary } from '../interfaces/admin-user-repository.interface';
import { Role } from '../../auth/interfaces/auth-types';

@Injectable()
export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: AdminUserSearchFilters): Promise<AdminUserSummary[]> {
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

  async getDetail(userId: string): Promise<AdminUserDetail | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true, statistics: true },
    });
    if (!row) return null;

    return {
      ...this.toSummary(row),
      walletBalance: row.wallet ? Number(row.wallet.balance) : 0,
      walletBonusBalance: row.wallet ? Number(row.wallet.bonusBalance) : 0,
      totalGamesPlayed: row.statistics?.totalGamesPlayed ?? 0,
      totalWagered: row.statistics ? Number(row.statistics.totalWagered) : 0,
    };
  }

  async getRole(userId: string): Promise<Role | null> {
    const row = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return row ? (row.role as Role) : null;
  }

  async setBanStatus(userId: string, banned: boolean, reason?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: banned, bannedReason: banned ? reason : null },
    });
  }

  private toSummary(row: {
    id: string;
    telegramId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isBanned: boolean;
    bannedReason: string | null;
    createdAt: Date;
  }): AdminUserSummary {
    return {
      id: row.id,
      telegramId: row.telegramId,
      username: row.username ?? undefined,
      firstName: row.firstName ?? undefined,
      lastName: row.lastName ?? undefined,
      role: row.role as Role,
      isBanned: row.isBanned,
      bannedReason: row.bannedReason ?? undefined,
      createdAt: row.createdAt,
    };
  }
}
