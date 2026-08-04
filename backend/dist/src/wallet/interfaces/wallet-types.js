"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletTransactionStatus = exports.WalletTransactionType = void 0;
/**
 * Domain-layer enums intentionally mirror the Prisma schema's
 * TransactionType/TransactionStatus enums (kept in sync manually), following
 * the same pattern as the game-engine module: the business logic in
 * WalletService never imports the generated Prisma client directly, so it
 * stays testable with an in-memory repository and framework-agnostic.
 */
var WalletTransactionType;
(function (WalletTransactionType) {
    WalletTransactionType["DEPOSIT"] = "DEPOSIT";
    WalletTransactionType["WITHDRAWAL"] = "WITHDRAWAL";
    WalletTransactionType["BET"] = "BET";
    WalletTransactionType["CASHOUT"] = "CASHOUT";
    WalletTransactionType["REFUND"] = "REFUND";
    WalletTransactionType["BONUS_CREDIT"] = "BONUS_CREDIT";
    WalletTransactionType["PROMOTION_CREDIT"] = "PROMOTION_CREDIT";
    WalletTransactionType["REFERRAL_REWARD"] = "REFERRAL_REWARD";
})(WalletTransactionType || (exports.WalletTransactionType = WalletTransactionType = {}));
var WalletTransactionStatus;
(function (WalletTransactionStatus) {
    WalletTransactionStatus["PENDING"] = "PENDING";
    WalletTransactionStatus["COMPLETED"] = "COMPLETED";
    WalletTransactionStatus["FAILED"] = "FAILED";
    WalletTransactionStatus["REVERSED"] = "REVERSED";
})(WalletTransactionStatus || (exports.WalletTransactionStatus = WalletTransactionStatus = {}));
