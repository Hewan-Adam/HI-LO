import 'reflect-metadata';
import { DeckService } from '../src/game-engine/services/deck.service';
import { ProvablyFairService } from '../src/game-engine/services/provably-fair.service';
import { MultiplierService } from '../src/game-engine/services/multiplier.service';
import { CardComparatorService } from '../src/game-engine/services/card-comparator.service';
import { GameEngineService } from '../src/game-engine/services/game-engine.service';
import { PredictionType } from '../src/game-engine/interfaces/game-config.interface';

import { WalletService } from '../src/wallet/services/wallet.service';
import { InMemoryWalletRepository } from '../src/wallet/repositories/in-memory-wallet.repository';

import { InMemoryGameRepository } from '../src/game/repositories/in-memory-game.repository';
import { InMemoryGameStateStore } from '../src/game/stores/in-memory-game-state.store';
import { DefaultGameRulesProvider } from '../src/game/services/game-rules.provider';
import { GameApiService } from '../src/game/services/game-api.service';

import { StatisticsService } from '../src/statistics/services/statistics.service';
import { InMemoryStatisticsRepository } from '../src/statistics/repositories/in-memory-statistics.repository';
import { LeaderboardService } from '../src/leaderboard/services/leaderboard.service';
import { InMemoryLeaderboardRepository } from '../src/leaderboard/repositories/in-memory-leaderboard.repository';

import { NotYourGameException, GameNotActiveException, GameSessionExpiredException } from '../src/game/exceptions/game.exceptions';
import { InsufficientFundsException } from '../src/wallet/exceptions/wallet.exceptions';

function line() {
  console.log('-'.repeat(72));
}

const RANK_VALUES: Record<string, number> = { A: 14, J: 11, Q: 12, K: 13 }; // Ace-high, matching AceMode.HIGH (the default rules provider)
function rankOf(cardCode: string): number {
  const label = cardCode.slice(0, -1); // strip the trailing suit letter
  return RANK_VALUES[label] ?? Number(label);
}

async function main() {
  // --- wire everything up with in-memory test doubles, exactly like a unit test would ---
  const provablyFair = new ProvablyFairService();
  const deckService = new DeckService(provablyFair);
  const multiplierService = new MultiplierService();
  const comparator = new CardComparatorService();
  const gameEngine = new GameEngineService(deckService, provablyFair, multiplierService, comparator);

  const walletRepo = new InMemoryWalletRepository();
  const walletService = new WalletService(walletRepo as any);

  const gameRepo = new InMemoryGameRepository();
  const stateStore = new InMemoryGameStateStore();
  const rulesProvider = new DefaultGameRulesProvider();

  const statsRepo = new InMemoryStatisticsRepository();
  const statisticsService = new StatisticsService(statsRepo as any);
  const leaderboardRepo = new InMemoryLeaderboardRepository();
  const leaderboardService = new LeaderboardService(leaderboardRepo as any);

  const gameApi = new GameApiService(
    gameEngine,
    gameRepo as any,
    stateStore as any,
    rulesProvider as any,
    walletService,
    statisticsService,
    leaderboardService,
  );

  const USER = 'player-1';
  await walletService.getOrCreateWallet(USER);
  await walletService.deposit(USER, 100, 'seed-deposit');

  line();
  console.log('1) START GAME (bet debited immediately)');
  line();
  const start = await gameApi.startGame(USER, 10);
  console.log(`gameId=${start.gameId} currentCard=${start.currentCard} serverSeedHash=${start.serverSeedHash.slice(0, 16)}...`);
  let wallet = await walletService.getWallet(USER);
  console.log(`Wallet balance after bet: ${wallet.balance} (expected 90)`);

  line();
  console.log('2) PLAY UNTIL A CASHOUT IS ACHIEVED (retries with fresh games on a loss — bet size is trivial, this just exercises the win path deterministically)');
  line();

  let cashoutGameId: string | null = null;
  let finalResult: { payout: number; fairnessProof: unknown } | null = null;

  for (let attempt = 1; attempt <= 25 && !cashoutGameId; attempt++) {
    const attemptStart = attempt === 1 ? start : await gameApi.startGame(USER, 2);
    let currentCardCode = attemptStart.currentCard;
    let response: Awaited<ReturnType<typeof gameApi.submitGuess>> | null = null;

    for (let turn = 1; turn <= 2; turn++) {
      const prediction = rankOf(currentCardCode) <= 8 ? PredictionType.HIGHER : PredictionType.LOWER;
      response = await gameApi.submitGuess(USER, attemptStart.gameId, prediction);
      if (response.gameOver) break;
      currentCardCode = response.revealedCard;
    }

    if (response && !response.gameOver && response.streak > 0) {
      finalResult = await gameApi.cashout(USER, attemptStart.gameId);
      cashoutGameId = attemptStart.gameId;
      console.log(`Attempt ${attempt}: reached streak ${response.streak}, cashed out for ${finalResult.payout} (bet was ${attemptStart.betAmount})`);
    } else if (attempt === 1 || attempt % 5 === 0) {
      console.log(`Attempt ${attempt}: ended in ${response?.result ?? 'unknown'} before a cashout opportunity — retrying`);
    }
  }

  if (!cashoutGameId) {
    console.log('Did not land a cashout within the retry budget (bad luck) — continuing with the rest of the demo regardless.');
  }

  wallet = await walletService.getWallet(USER);
  console.log(`Wallet balance after the cashout sequence: ${wallet.balance}`);

  line();
  console.log('3) HISTORY + FAIRNESS PROOF');
  line();
  const history = await gameApi.getHistory(USER);
  console.log(`History has ${history.length} game(s). Most recent status: ${history[0].status}, payout: ${history[0].payout}`);

  const fairness = await gameApi.getFairnessProof(USER, cashoutGameId ?? start.gameId);
  console.log(`Fairness verifiable: ${fairness.verifiable}, valid: ${(fairness as any).valid}`);

  line();
  console.log('4) OWNERSHIP + STATE GUARDS');
  line();
  const start2 = await gameApi.startGame(USER, 5);
  try {
    await gameApi.submitGuess('someone-else', start2.gameId, PredictionType.HIGHER);
    console.log('ERROR: should have rejected a different user!');
  } catch (err) {
    console.log(`Non-owner correctly rejected: ${err instanceof NotYourGameException}`);
  }
  await gameApi.cashout(USER, start2.gameId).catch(() => {
    /* streak may be 0 — that's fine, we just want the game to end for the next check */
  });
  // Force it to end regardless of the above (guess until it resolves), then check re-guessing a finished game fails.
  let stillActive = true;
  let guardGameId = start2.gameId;
  while (stillActive) {
    try {
      const r = await gameApi.submitGuess(USER, guardGameId, PredictionType.HIGHER);
      stillActive = !r.gameOver;
    } catch {
      stillActive = false;
    }
  }
  try {
    await gameApi.submitGuess(USER, guardGameId, PredictionType.HIGHER);
    console.log('ERROR: guessing on a finished game should fail!');
  } catch (err) {
    console.log(`Guessing on a finished game correctly rejected: ${err instanceof GameNotActiveException}`);
  }

  line();
  console.log('5) INSUFFICIENT FUNDS LEAVES NO ORPHAN GAME ROW');
  line();
  try {
    await gameApi.startGame(USER, 999999);
    console.log('ERROR: should have rejected an oversized bet!');
  } catch (err) {
    console.log(`Oversized bet correctly rejected: ${err instanceof InsufficientFundsException}`);
  }

  line();
  console.log('6) SESSION EXPIRY (Redis-held state lost) -> auto-refund + ABANDONED');
  line();
  const start3 = await gameApi.startGame(USER, 8);
  const balanceBeforeExpiry = (await walletService.getWallet(USER)).balance;
  // Simulate Redis TTL expiry by deleting the in-memory store entry directly.
  await stateStore.delete(start3.gameId);
  try {
    await gameApi.submitGuess(USER, start3.gameId, PredictionType.HIGHER);
    console.log('ERROR: should have thrown GameSessionExpiredException!');
  } catch (err) {
    console.log(`Session expiry correctly detected: ${err instanceof GameSessionExpiredException}`);
  }
  const balanceAfterExpiry = (await walletService.getWallet(USER)).balance;
  console.log(`Bet auto-refunded: balance went from ${balanceBeforeExpiry} back to ${balanceAfterExpiry} (+8)`);
  const abandonedRow = await gameRepo.getGameById(start3.gameId);
  console.log(`Game row correctly marked ABANDONED: ${abandonedRow?.status === 'ABANDONED'}`);
  console.log(`Fairness on an abandoned game correctly reports unverifiable: ${(await gameApi.getFairnessProof(USER, start3.gameId)).verifiable === false}`);

  line();
  console.log('7) STATISTICS + LEADERBOARD REFLECT SETTLED GAMES');
  line();
  const stats = await statisticsService.getStatistics(USER);
  console.log(`Statistics: gamesPlayed=${stats.totalGamesPlayed}, wins=${stats.totalWins}, losses=${stats.totalLosses}, wagered=${stats.totalWagered}`);
  const topAllTime = await leaderboardService.getAllTimeTopN(10);
  console.log(`Leaderboard (all-time) entries: ${topAllTime.length}, top entry winnings: ${topAllTime[0]?.totalWinnings ?? 0}`);
}

main().catch((err) => {
  console.error('DEMO FAILED:', err);
  process.exit(1);
});
