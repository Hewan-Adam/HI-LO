import { Role } from '../../auth/interfaces/auth-types';

export const ADMIN_USER_REPOSITORY = Symbol('ADMIN_USER_REPOSITORY');

export interface AdminUserSummary {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  isBanned: boolean;
  bannedReason?: string;
  createdAt: Date;
}

export interface AdminUserDetail extends AdminUserSummary {
  walletBalance: number;
  walletBonusBalance: number;
  totalGamesPlayed: number;
  totalWagered: number;
}

export interface AdminUserSearchFilters {
  telegramId?: string;
  username?: string;
  limit?: number;
  offset?: number;
}

export interface AdminUserRepository {
  search(filters: AdminUserSearchFilters): Promise<AdminUserSummary[]>;
  getDetail(userId: string): Promise<AdminUserDetail | null>;
  getRole(userId: string): Promise<Role | null>;
  setBanStatus(userId: string, banned: boolean, reason?: string): Promise<void>;
}
