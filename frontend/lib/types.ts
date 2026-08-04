// Mirrors backend enums/DTOs from src/game-engine, src/auth, src/wallet.
// Kept in sync manually — same intentional decoupling as the backend's own
// domain-layer enums vs. Prisma schema enums (see backend/src/game/interfaces).

export type PredictionType = 'HIGHER' | 'LOWER';
export type MoveResult = 'WIN' | 'LOSS' | 'PUSH' | 'REDRAW';
export type GameStatus = 'ACTIVE' | 'CASHED_OUT' | 'LOST' | 'ABANDONED';
export type Role = 'PLAYER' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  telegramId: string;
  username?: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export interface LoginResponse extends TokenPair {
  user: AuthUser;
}

export interface StartGameResponse {
  gameId: string;
  serverSeedHash: string;
  clientSeed: string;
  currentCard: string; // card code, e.g. "AH", "10S", "KD"
  betAmount: number;
  currentMultiplier: number;
  potentialPayout: number;
}

export interface GuessResponse {
  result: MoveResult;
  correct: boolean | null;
  revealedCard: string;
  streak: number;
  currentMultiplier: number;
  potentialPayout: number;
  gameOver: boolean;
  payout?: number;
  fairnessProof?: FairnessProof;
}

export interface FairnessProof {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  dealtCardCodes: string[];
}

export interface CashoutResponse {
  payout: number;
  fairnessProof: FairnessProof;
}

export interface GameHistoryEntry {
  gameId: string;
  betAmount: number;
  status: GameStatus;
  streak: number;
  currentMultiplier: number;
  payout?: number;
  startedAt: string;
  endedAt?: string;
}

export interface WalletSummary {
  balance: number;
  bonusBalance: number;
  currency: string;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'BET' | 'CASHOUT' | 'REFUND' | 'BONUS_CREDIT' | 'PROMOTION_CREDIT' | 'REFERRAL_REWARD';

export interface TransactionEntry {
  id: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username?: string;
  totalWinnings: number;
  gamesPlayed: number;
  bestMultiplier: number;
  rank?: number;
}

export interface StatisticsSummary {
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  totalWagered: number;
  totalWon: number;
  bestMultiplier: number;
  longestStreak: number;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}
