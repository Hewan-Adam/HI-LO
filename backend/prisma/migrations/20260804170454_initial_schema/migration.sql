-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLAYER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'CASHED_OUT', 'LOST', 'ABANDONED');

-- CreateEnum
CREATE TYPE "AceMode" AS ENUM ('HIGH', 'LOW');

-- CreateEnum
CREATE TYPE "EqualRule" AS ENUM ('PUSH', 'LOSS', 'REDRAW');

-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('HIGHER', 'LOWER');

-- CreateEnum
CREATE TYPE "MoveResult" AS ENUM ('WIN', 'LOSS', 'PUSH', 'REDRAW');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BET', 'CASHOUT', 'REFUND', 'BONUS_CREDIT', 'PROMOTION_CREDIT', 'REFERRAL_REWARD');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('DEPOSIT_BONUS', 'FREE_BET', 'CASHBACK', 'REFERRAL_BONUS');

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "replacedByTokenHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PLAYER',
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "bonusBalance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "betAmount" DECIMAL(18,8) NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "aceMode" "AceMode" NOT NULL,
    "equalRule" "EqualRule" NOT NULL,
    "serverSeed" TEXT,
    "serverSeedHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "cursor" INTEGER NOT NULL DEFAULT 0,
    "currentMultiplier" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "payout" DECIMAL(18,8),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_moves" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "moveIndex" INTEGER NOT NULL,
    "currentCardCode" TEXT NOT NULL,
    "nextCardCode" TEXT NOT NULL,
    "prediction" "PredictionType" NOT NULL,
    "result" "MoveResult" NOT NULL,
    "multiplierAfter" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,8) NOT NULL,
    "balanceBefore" DECIMAL(18,8) NOT NULL,
    "balanceAfter" DECIMAL(18,8) NOT NULL,
    "reference" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalWinnings" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "bestMultiplier" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalGamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalLosses" INTEGER NOT NULL DEFAULT 0,
    "totalWagered" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "totalWon" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "bestMultiplier" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "rewardPaid" BOOLEAN NOT NULL DEFAULT false,
    "rewardAmount" DECIMAL(18,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "amount" DECIMAL(18,8),
    "percentage" DECIMAL(5,2),
    "maxAmount" DECIMAL(18,8),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_telegramId_idx" ON "users"("telegramId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_userId_idx" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "games_userId_idx" ON "games"("userId");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_startedAt_idx" ON "games"("startedAt");

-- CreateIndex
CREATE INDEX "game_moves_gameId_idx" ON "game_moves"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "game_moves_gameId_moveIndex_key" ON "game_moves"("gameId", "moveIndex");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_key" ON "transactions"("reference");

-- CreateIndex
CREATE INDEX "transactions_userId_idx" ON "transactions"("userId");

-- CreateIndex
CREATE INDEX "transactions_gameId_idx" ON "transactions"("gameId");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "leaderboard_entries_period_idx" ON "leaderboard_entries"("period");

-- CreateIndex
CREATE INDEX "leaderboard_entries_rank_idx" ON "leaderboard_entries"("rank");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entries_userId_period_key" ON "leaderboard_entries"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "statistics_userId_key" ON "statistics"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referredUserId_key" ON "referrals"("referredUserId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_idx" ON "referrals"("referrerId");

-- CreateIndex
CREATE INDEX "promotions_isActive_idx" ON "promotions"("isActive");

-- CreateIndex
CREATE INDEX "promotions_type_idx" ON "promotions"("type");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_settings_key_key" ON "admin_settings"("key");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
