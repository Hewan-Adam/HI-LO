import 'reflect-metadata';
import { DeckService } from '../src/game-engine/services/deck.service';
import { ProvablyFairService } from '../src/game-engine/services/provably-fair.service';
import { MultiplierService } from '../src/game-engine/services/multiplier.service';
import { CardComparatorService } from '../src/game-engine/services/card-comparator.service';
import { GameEngineService } from '../src/game-engine/services/game-engine.service';

import { WalletService } from '../src/wallet/services/wallet.service';
import { InMemoryWalletRepository } from '../src/wallet/repositories/in-memory-wallet.repository';

import { InMemoryGameRepository } from '../src/game/repositories/in-memory-game.repository';
import { InMemoryGameStateStore } from '../src/game/stores/in-memory-game-state.store';
import { DefaultGameRulesProvider } from '../src/game/services/game-rules.provider';
import { GameApiService, ACTIVE_GAME_TTL_SECONDS } from '../src/game/services/game-api.service';

import { StatisticsService } from '../src/statistics/services/statistics.service';
import { InMemoryStatisticsRepository } from '../src/statistics/repositories/in-memory-statistics.repository';
import { LeaderboardService } from '../src/leaderboard/services/leaderboard.service';
import { InMemoryLeaderboardRepository } from '../src/leaderboard/repositories/in-memory-leaderboard.repository';

import { UserOrIpThrottlerGuard } from '../src/common/guards/user-or-ip-throttler.guard';

function line() {
  console.log('-'.repeat(72));
}

async function main() {
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

  const statisticsService = new StatisticsService(new InMemoryStatisticsRepository() as any);
  const leaderboardService = new LeaderboardService(new InMemoryLeaderboardRepository() as any);

  const gameApi = new GameApiService(gameEngine, gameRepo as any, stateStore as any, rulesProvider as any, walletService, statisticsService, leaderboardService);

  const USER = 'player-sweep';
  await walletService.getOrCreateWallet(USER);
  await walletService.deposit(USER, 100, 'seed');

  line();
  console.log('SETUP: three games in different staleness states');
  line();

  const fresh = await gameApi.startGame(USER, 10);
  console.log(`Game A (fresh, untouched):        ${fresh.gameId}`);

  const trulyStale = await gameApi.startGame(USER, 15);
  console.log(`Game B (stale timestamp + no Redis state — should be swept): ${trulyStale.gameId}`);
  const staleThreshold = new Date(Date.now() - (ACTIVE_GAME_TTL_SECONDS + 6 * 60) * 1000); // older than TTL + sweep buffer
  gameRepo._debugSetUpdatedAt(trulyStale.gameId, staleThreshold);
  await stateStore.delete(trulyStale.gameId); // simulates real Redis TTL expiry

  const falsePositive = await gameApi.startGame(USER, 20);
  console.log(`Game C (stale timestamp but Redis state still live — should be SKIPPED): ${falsePositive.gameId}`);
  gameRepo._debugSetUpdatedAt(falsePositive.gameId, staleThreshold);
  // deliberately NOT deleting its Redis state — this is the false-positive case

  const balanceAfterThreeBets = (await walletService.getWallet(USER)).balance;
  console.log(`Balance after 3 bets (100 - 10 - 15 - 20): ${balanceAfterThreeBets} (expected 55)`);

  line();
  console.log('RUN THE SWEEP');
  line();
  const result = await gameApi.sweepAbandonedGames();
  console.log(`Sweep result: swept=${result.swept}, skipped=${result.skipped} (expected swept=1, skipped=1)`);

  line();
  console.log('VERIFY OUTCOMES');
  line();

  const rowA = await gameRepo.getGameById(fresh.gameId);
  console.log(`Game A (fresh) untouched, still ACTIVE: ${rowA?.status === 'ACTIVE'}`);

  const rowB = await gameRepo.getGameById(trulyStale.gameId);
  console.log(`Game B correctly marked ABANDONED: ${rowB?.status === 'ABANDONED'}`);
  console.log(`Game B's serverSeed correctly left null (genuinely unrecoverable): ${rowB?.serverSeed === undefined}`);

  const rowC = await gameRepo.getGameById(falsePositive.gameId);
  console.log(`Game C (false positive) correctly left ACTIVE, NOT swept: ${rowC?.status === 'ACTIVE'}`);

  const finalBalance = (await walletService.getWallet(USER)).balance;
  console.log(`Balance after sweep: ${finalBalance} (expected 55 + 15 refund from Game B = 70)`);
  console.log(`Refund correctly applied only to the truly-stale game: ${finalBalance === 70}`);

  const history = await walletService.getTransactionHistory(USER, 10);
  const refundTx = history.find((t) => t.type === 'REFUND');
  console.log(`A REFUND transaction was recorded for Game B: ${refundTx?.gameId === trulyStale.gameId}`);

  line();
  console.log('THROTTLER GUARD: tracks by user id when authenticated, falls back to IP otherwise');
  line();

  const guard = Object.create(UserOrIpThrottlerGuard.prototype) as UserOrIpThrottlerGuard;
  const getTracker = (guard as any).getTracker.bind(guard);

  const authenticatedTracker = await getTracker({ user: { sub: 'user-123' }, ip: '203.0.113.5' });
  console.log(`Authenticated request tracked by user id: ${authenticatedTracker === 'user:user-123'}`);

  const anonymousTracker = await getTracker({ ip: '203.0.113.5' });
  console.log(`Unauthenticated request falls back to IP: ${anonymousTracker === 'ip:203.0.113.5'}`);
}

main().catch((err) => {
  console.error('DEMO FAILED:', err);
  process.exit(1);
});
