import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuthRepository, RefreshTokenRecord } from '../interfaces/auth-repository.interface';
import { AuthenticatedUser, Role } from '../interfaces/auth-types';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByTelegramId(telegramId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    return user ? this.toAuthenticatedUser(user) : null;
  }
async findFirstUser(): Promise<AuthenticatedUser | null> {
  const user = await this.prisma.user.findFirst();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username ?? undefined,
    role: user.role as Role,
    isBanned: user.isBanned,
  };
}
  async createUser(params: { telegramId: string; username?: string; firstName?: string; lastName?: string }): Promise<AuthenticatedUser> {
    // Upsert rather than a plain create: two near-simultaneous first logins
    // from the same brand-new Telegram user (e.g. double-tapped launch)
    // must not race into a duplicate-user / unique-constraint error.
    const user = await this.prisma.user.upsert({
      where: { telegramId: params.telegramId },
      update: {},
      create: {
        telegramId: params.telegramId,
        username: params.username,
        firstName: params.firstName,
        lastName: params.lastName,
      },
    });
    return this.toAuthenticatedUser(user);
  }

  async findUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user ? this.toAuthenticatedUser(user) : null;
  }

  async storeRefreshToken(params: { userId: string; tokenHash: string; familyId: string; expiresAt: Date }): Promise<RefreshTokenRecord> {
    const record = await this.prisma.refreshToken.create({
      data: {
        userId: params.userId,
        tokenHash: params.tokenHash,
        familyId: params.familyId,
        expiresAt: params.expiresAt,
      },
    });
    return this.toRefreshTokenRecord(record);
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return record ? this.toRefreshTokenRecord(record) : null;
  }

  async markRotated(tokenHash: string, replacedByTokenHash: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { revoked: true, replacedByTokenHash },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId },
      data: { revoked: true },
    });
  }

  private toAuthenticatedUser(user: {
    id: string;
    telegramId: string;
    username: string | null;
    role: string;
    isBanned: boolean;
  }): AuthenticatedUser {
    return {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username ?? undefined,
      role: user.role as Role,
      isBanned: user.isBanned,
    };
  }

  private toRefreshTokenRecord(record: {
    id: string;
    userId: string;
    tokenHash: string;
    familyId: string;
    revoked: boolean;
    replacedByTokenHash: string | null;
    expiresAt: Date;
    createdAt: Date;
  }): RefreshTokenRecord {
    return {
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      familyId: record.familyId,
      revoked: record.revoked,
      replacedByTokenHash: record.replacedByTokenHash ?? undefined,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
    };
  }
}
