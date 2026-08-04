export type Role = 'PLAYER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AdminUser {
  id: string;
  telegramId: string;
  username?: string;
  role: Role;
}

export interface LoginResponse {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

// ---- Users ----

export interface AdminUserSummary {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  isBanned: boolean;
  bannedReason?: string;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  walletBalance: number;
  walletBonusBalance: number;
  totalGamesPlayed: number;
  totalWagered: number;
}

// ---- Game settings ----

export type AceMode = 'HIGH' | 'LOW';
export type EqualRule = 'PUSH' | 'LOSS' | 'REDRAW';

export interface MultiplierTableEntry {
  streak: number;
  multiplier: number;
}

export interface GameSettings {
  aceMode: AceMode;
  equalRule: EqualRule;
  multiplierTable: MultiplierTableEntry[];
  targetRtpPercent: number | null;
}

// ---- Analytics ----

export interface AnalyticsSummary {
  rangeStart: string;
  rangeEnd: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winLossRatio: number | null;
  totalWagered: number;
  totalPaidOut: number;
  houseProfit: number;
  activePlayers: number;
  averageSessionDurationSeconds: number;
}

// ---- Transactions ----

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'BET'
  | 'CASHOUT'
  | 'REFUND'
  | 'BONUS_CREDIT'
  | 'PROMOTION_CREDIT'
  | 'REFERRAL_REWARD';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

export interface AdminTransaction {
  id: string;
  userId: string;
  gameId?: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference?: string;
  createdAt: string;
}

// ---- Audit log ----

export interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
