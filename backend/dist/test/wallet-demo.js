"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const wallet_service_1 = require("../src/wallet/services/wallet.service");
const in_memory_wallet_repository_1 = require("../src/wallet/repositories/in-memory-wallet.repository");
const wallet_exceptions_1 = require("../src/wallet/exceptions/wallet.exceptions");
function line() {
    console.log('-'.repeat(72));
}
async function main() {
    const repo = new in_memory_wallet_repository_1.InMemoryWalletRepository();
    const wallet = new wallet_service_1.WalletService(repo);
    line();
    console.log('1) CREATE WALLET + DEPOSIT');
    line();
    await wallet.getOrCreateWallet('user-1');
    const depositTx = await wallet.deposit('user-1', 100, 'dep-ref-001');
    console.log(`Deposited 100. balanceAfter=${depositTx.balanceAfter}`);
    line();
    console.log('2) IDEMPOTENT DEPOSIT (same reference submitted twice)');
    line();
    const depositTxAgain = await wallet.deposit('user-1', 100, 'dep-ref-001');
    console.log(`Second call with same reference returned the SAME transaction id: ${depositTxAgain.id === depositTx.id}`);
    const balanceAfterDupe = await wallet.getWallet('user-1');
    console.log(`Balance did NOT double-credit: ${balanceAfterDupe.balance} (expected 100)`);
    line();
    console.log('3) PLACE BET');
    line();
    const betTx = await wallet.placeBet('user-1', 'game-abc', 20);
    console.log(`Bet 20 placed. balanceAfter=${betTx.balanceAfter}`);
    line();
    console.log('4) INSUFFICIENT FUNDS IS REJECTED');
    line();
    try {
        await wallet.placeBet('user-1', 'game-abc', 99999);
        console.log('ERROR: should have thrown!');
    }
    catch (err) {
        console.log(`Correctly rejected: ${err instanceof wallet_exceptions_1.InsufficientFundsException} (${err.message})`);
    }
    line();
    console.log('5) CASHOUT CREDITS BACK');
    line();
    const cashoutTx = await wallet.settleCashout('user-1', 'game-abc', 45);
    console.log(`Cashed out 45. balanceAfter=${cashoutTx.balanceAfter}`);
    line();
    console.log('6) BONUS WALLET: credit + bet drawing from bonus first');
    line();
    await wallet.creditBonus('user-1', 30, 'promo-001');
    let snap = await wallet.getWallet('user-1');
    console.log(`After bonus credit: balance=${snap.balance}, bonusBalance=${snap.bonusBalance}`);
    const bonusBetTx = await wallet.placeBet('user-1', 'game-xyz', 50, true); // 30 from bonus, 20 from real
    console.log(`Bet 50 (useBonusFirst=true) metadata: ${JSON.stringify(bonusBetTx.metadata)}`);
    snap = await wallet.getWallet('user-1');
    console.log(`After bonus-first bet: balance=${snap.balance}, bonusBalance=${snap.bonusBalance}`);
    line();
    console.log('7) REFUND (e.g. an aborted game) restores exactly what was deducted');
    line();
    const refundTx = await wallet.refundBet('user-1', 'game-xyz', 50, 30); // 30 back to bonus, 20 back to real
    console.log(`Refunded. balanceAfter=${refundTx.balanceAfter}`);
    snap = await wallet.getWallet('user-1');
    console.log(`Post-refund: balance=${snap.balance}, bonusBalance=${snap.bonusBalance}`);
    line();
    console.log('8) DUPLICATE REFERENCE ON A DIFFERENT AMOUNT IS STILL IDEMPOTENT, NOT DOUBLE-APPLIED');
    line();
    const promoAgain = await wallet.creditBonus('user-1', 30, 'promo-001'); // same ref as step 6
    console.log(`Returned existing transaction instead of re-crediting: ${promoAgain.id === (await repo.getTransactionByReference('promo-001')).id}`);
    line();
    console.log('9) CONCURRENCY: 20 simultaneous bets of 5 against the same wallet, with an artificial read-write race window');
    line();
    await wallet.getOrCreateWallet('user-2');
    await wallet.deposit('user-2', 1000, 'dep-ref-002');
    repo.simulateReadWriteDelayMs = 15; // force real interleaving between read and conditional write
    const concurrentBets = Array.from({ length: 20 }, (_, i) => wallet.placeBet('user-2', 'game-concurrent', 5));
    const results = await Promise.allSettled(concurrentBets);
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    repo.simulateReadWriteDelayMs = 0;
    const finalWallet2 = await wallet.getWallet('user-2');
    const expectedBalance = 1000 - succeeded * 5;
    console.log(`Bets succeeded: ${succeeded}, failed: ${failed} (out of 20 concurrent attempts)`);
    console.log(`Final balance: ${finalWallet2.balance} — expected 1000 - (${succeeded} x 5) = ${expectedBalance}`);
    console.log(`No lost updates / no double-spend: ${finalWallet2.balance === expectedBalance}`);
    const historyCount = (await wallet.getTransactionHistory('user-2', 100)).filter((t) => t.type === 'BET').length;
    console.log(`Ledger rows recorded for BET on user-2: ${historyCount} (must equal succeeded count: ${historyCount === succeeded})`);
    line();
    console.log('10) TRANSACTION HISTORY');
    line();
    const history = await wallet.getTransactionHistory('user-1', 10);
    for (const t of history) {
        console.log(`${t.createdAt.toISOString()}  ${t.type.padEnd(18)} amount=${t.amount}  balanceAfter=${t.balanceAfter}`);
    }
}
main().catch((err) => {
    console.error('DEMO FAILED:', err);
    process.exit(1);
});
