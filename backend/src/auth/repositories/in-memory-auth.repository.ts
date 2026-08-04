import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthRepository, RefreshTokenRecord } from '../interfaces/auth-repository.interface';
import { AuthenticatedUser, Role } from '../interfaces/auth-types';

@Injectable()
export class InMemoryAuthRepository implements AuthRepository {
  private usersByTelegramId = new Map<string, AuthenticatedUser>();
  private usersById = new Map<string, AuthenticatedUser>();
  private refreshTokens = new Map<string, RefreshTokenRecord>(); // keyed by tokenHash

  async findUserByTelegramId(telegramId: string): Promise<AuthenticatedUser | null> {
    return this.usersByTelegramId.get(telegramId) ?? null;
  }
async findFirstUser(): Promise<AuthenticatedUser | null> {
  return this.usersById.values().next().value ?? null;
}
  async createUser(params: { telegramId: string; username?: string; firstName?: string; lastName?: string }): Promise<AuthenticatedUser> {
    const user: AuthenticatedUser = {
      id: crypto.randomUUID(),
      telegramId: params.telegramId,
      username: params.username,
      role: Role.PLAYER,
      isBanned: false,
    };
    this.usersByTelegramId.set(user.telegramId, user);
    this.usersById.set(user.id, user);
    return user;
  }

  async findUserById(userId: string): Promise<AuthenticatedUser | null> {
    return this.usersById.get(userId) ?? null;
  }

  async storeRefreshToken(params: { userId: string; tokenHash: string; familyId: string; expiresAt: Date }): Promise<RefreshTokenRecord> {
    const record: RefreshTokenRecord = {
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

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.get(tokenHash) ?? null;
  }

  async markRotated(tokenHash: string, replacedByTokenHash: string): Promise<void> {
    const record = this.refreshTokens.get(tokenHash);
    if (!record) return;
    record.revoked = true;
    record.replacedByTokenHash = replacedByTokenHash;
  }

  async revokeFamily(familyId: string): Promise<void> {
    for (const record of this.refreshTokens.values()) {
      if (record.familyId === familyId) {
        record.revoked = true;
      }
    }
  }

  /** Test/demo helper only — not part of the AuthRepository interface. */
  _setUserBanned(userId: string, banned: boolean): void {
    const user = this.usersById.get(userId);
    if (user) user.isBanned = banned;
  }

  /** Test/demo helper only. */
  _setUserRole(userId: string, role: Role): void {
    const user = this.usersById.get(userId);
    if (user) user.role = role;
  }
}
