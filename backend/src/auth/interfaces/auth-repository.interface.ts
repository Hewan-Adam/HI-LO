import { AuthenticatedUser } from './auth-types';
import { Role } from '../interfaces/auth-types';
export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  revoked: boolean;
  replacedByTokenHash?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface AuthRepository {
  findUserByTelegramId(telegramId: string): Promise<AuthenticatedUser | null>;
  createUser(params: { telegramId: string; username?: string; firstName?: string; lastName?: string }): Promise<AuthenticatedUser>;
  findUserById(userId: string): Promise<AuthenticatedUser | null>;
findFirstUser(): Promise<AuthenticatedUser | null>;
  storeRefreshToken(params: { userId: string; tokenHash: string; familyId: string; expiresAt: Date }): Promise<RefreshTokenRecord>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** Marks a token as rotated-away (superseded by a newer one from the same family), without deleting the audit trail. */
  markRotated(tokenHash: string, replacedByTokenHash: string): Promise<void>;
  /** Revokes every token in a family — used both for explicit logout-all-devices and for reuse/theft detection. */
  revokeFamily(familyId: string): Promise<void>;
}
