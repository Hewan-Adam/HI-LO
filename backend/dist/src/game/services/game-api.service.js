"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameApiService = exports.ACTIVE_GAME_TTL_SECONDS = void 0;
const common_1 = require("@nestjs/common");
const game_engine_service_1 = require("../../game-engine/services/game-engine.service");
const game_config_interface_1 = require("../../game-engine/interfaces/game-config.interface");
const game_repository_interface_1 = require("../interfaces/game-repository.interface");
const game_state_store_interface_1 = require("../interfaces/game-state-store.interface");
const game_rules_provider_1 = require("./game-rules.provider");
const wallet_service_1 = require("../../wallet/services/wallet.service");
const statistics_service_1 = require("../../statistics/services/statistics.service");
const leaderboard_service_1 = require("../../leaderboard/services/leaderboard.service");
const game_exceptions_1 = require("../exceptions/game.exceptions");
/** How long an ACTIVE game's live state survives in Redis without activity. Refreshed on every guess. */
exports.ACTIVE_GAME_TTL_SECONDS = 60 * 60; // 1 hour
/** Extra grace period past the TTL before the sweep job considers a game a sweep candidate — avoids racing a TTL that's about to legitimately expire right as the sweep runs. */
const SWEEP_STALENESS_BUFFER_SECONDS = 5 * 60; // 5 minutes
let GameApiService = class GameApiService {
    constructor(gameEngine, gameRepository, stateStore, rulesProvider, walletService, statisticsService, leaderboardService) {
        this.gameEngine = gameEngine;
        this.gameRepository = gameRepository;
        this.stateStore = stateStore;
        this.rulesProvider = rulesProvider;
        this.walletService = walletService;
        this.statisticsService = statisticsService;
        this.leaderboardService = leaderboardService;
    }
    async startGame(userId, betAmount, clientSeed) {
        const [aceMode, equalRule, multiplierTable] = await Promise.all([
            this.rulesProvider.getAceMode(),
            this.rulesProvider.getEqualRule(),
            this.rulesProvider.getMultiplierTable(),
        ]);
        const state = this.gameEngine.startGame({
            userId,
            betAmount,
            clientSeed,
            config: { aceMode, equalRule, multiplierTable },
        });
        // Durable row first (no money moved yet) — createGame() only ever writes
        // non-sensitive columns; serverSeed stays NULL here.
        await this.gameRepository.createGame({
            id: state.gameId,
            userId,
            betAmount,
            aceMode,
            equalRule,
            serverSeedHash: state.serverSeedHash,
            clientSeed: state.clientSeed,
            nonce: state.nonce,
        });
        try {
            await this.walletService.placeBet(userId, state.gameId, betAmount);
        }
        catch (err) {
            // Compensating action: nothing durable happened besides the empty
            // Game row, so delete it rather than leaving an ACTIVE game with no
            // matching bet debit. This is a saga-style compensation, not a single
            // cross-aggregate DB transaction — see the phase 4 README for why.
            await this.gameRepository.deleteGame(state.gameId);
            throw err;
        }
        await this.stateStore.save(state.gameId, state, exports.ACTIVE_GAME_TTL_SECONDS);
        return {
            gameId: state.gameId,
            serverSeedHash: state.serverSeedHash,
            clientSeed: state.clientSeed,
            currentCard: this.gameEngine.getCurrentCard(state).code,
            betAmount: state.betAmount,
            currentMultiplier: state.currentMultiplier,
            potentialPayout: state.potentialPayout,
        };
    }
    async submitGuess(userId, gameId, prediction) {
        await this.assertOwnedActiveGame(userId, gameId);
        const state = await this.stateStore.load(gameId);
        if (!state) {
            await this.abandonExpiredGame(gameId, userId);
            throw new game_exceptions_1.GameSessionExpiredException(gameId);
        }
        const outcome = this.gameEngine.submitGuess(state, prediction);
        const lastMove = outcome.state.moves[outcome.state.moves.length - 1];
        await this.gameRepository.appendMove(gameId, lastMove, {
            streak: outcome.state.streak,
            cursor: outcome.state.cursor,
            currentMultiplier: outcome.state.currentMultiplier,
        });
        if (outcome.gameOver) {
            await this.settleEndedGame(outcome.state);
        }
        else {
            await this.stateStore.refreshTtl(gameId, exports.ACTIVE_GAME_TTL_SECONDS);
            await this.stateStore.save(gameId, outcome.state, exports.ACTIVE_GAME_TTL_SECONDS);
        }
        return {
            result: outcome.result,
            correct: outcome.correct,
            revealedCard: outcome.revealedCardCode,
            streak: outcome.state.streak,
            currentMultiplier: outcome.state.currentMultiplier,
            potentialPayout: outcome.state.potentialPayout,
            gameOver: outcome.gameOver,
            payout: outcome.gameOver ? outcome.state.payout : undefined,
            fairnessProof: outcome.gameOver ? this.gameEngine.getFairnessProof(outcome.state) : undefined,
        };
    }
    async cashout(userId, gameId) {
        await this.assertOwnedActiveGame(userId, gameId);
        const state = await this.stateStore.load(gameId);
        if (!state) {
            await this.abandonExpiredGame(gameId, userId);
            throw new game_exceptions_1.GameSessionExpiredException(gameId);
        }
        const outcome = this.gameEngine.cashout(state); // throws BadRequestException if streak is 0
        await this.settleEndedGame(outcome.state);
        return {
            payout: outcome.payout,
            fairnessProof: this.gameEngine.getFairnessProof(outcome.state),
        };
    }
    async getHistory(userId, limit = 50, offset = 0) {
        const rows = await this.gameRepository.getGameHistory(userId, limit, offset);
        return rows.map((row) => ({
            gameId: row.id,
            betAmount: row.betAmount,
            status: row.status,
            streak: row.streak,
            currentMultiplier: row.currentMultiplier,
            payout: row.payout,
            startedAt: row.startedAt,
            endedAt: row.endedAt,
        }));
    }
    async getFairnessProof(userId, gameId) {
        const row = await this.gameRepository.getGameById(gameId);
        if (!row)
            throw new game_exceptions_1.GameNotFoundException(gameId);
        if (row.userId !== userId)
            throw new game_exceptions_1.NotYourGameException();
        if (row.status === game_config_interface_1.GameStatus.ACTIVE) {
            throw new game_exceptions_1.GameNotActiveException(gameId); // serverSeed is never revealed while a game is still in progress
        }
        if (!row.serverSeed) {
            // The one honest edge case from GameRepository.finalizeGame's doc comment: session expired before settlement.
            return { verifiable: false, reason: 'Server seed was lost when this game session expired before it could be settled normally.' };
        }
        const moves = await this.gameRepository.getMoves(gameId);
        const dealtCardCodes = [moves[0].currentCard.code, ...moves.map((m) => m.nextCard.code)];
        const proof = {
            serverSeed: row.serverSeed,
            serverSeedHash: row.serverSeedHash,
            clientSeed: row.clientSeed,
            nonce: row.nonce,
            dealtCardCodes,
        };
        return { verifiable: true, valid: this.gameEngine.verifyFairness(proof), ...proof };
    }
    /**
     * Proactively finds and settles ACTIVE games whose Redis-held state has
     * almost certainly expired (no activity for longer than the TTL plus a
     * safety buffer), refunding each and marking it ABANDONED. Intended to be
     * called on a schedule (see GameSweepScheduler) rather than only
     * reactively when a player happens to act on a stale game — a player who
     * simply closes the app mid-round would otherwise leave their bet
     * debited indefinitely.
     *
     * Double-checks Redis before abandoning each candidate: `updatedAt` being
     * old is strong evidence the TTL expired, but isn't proof (clock skew, or
     * a genuinely idle-but-still-cached session) — actually confirming the
     * state is gone avoids a false-positive refund on a game that could still
     * be resumed.
     */
    async sweepAbandonedGames() {
        const threshold = new Date(Date.now() - (exports.ACTIVE_GAME_TTL_SECONDS + SWEEP_STALENESS_BUFFER_SECONDS) * 1000);
        const candidates = await this.gameRepository.getStaleActiveGames(threshold);
        let swept = 0;
        let skipped = 0;
        for (const row of candidates) {
            const stillLive = await this.stateStore.load(row.id);
            if (stillLive) {
                skipped += 1; // false positive — the session is still genuinely live, leave it alone
                continue;
            }
            await this.abandonExpiredGame(row.id, row.userId);
            swept += 1;
        }
        return { swept, skipped };
    }
    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------
    async assertOwnedActiveGame(userId, gameId) {
        const row = await this.gameRepository.getGameById(gameId);
        if (!row)
            throw new game_exceptions_1.GameNotFoundException(gameId);
        if (row.userId !== userId)
            throw new game_exceptions_1.NotYourGameException();
        if (row.status !== game_config_interface_1.GameStatus.ACTIVE)
            throw new game_exceptions_1.GameNotActiveException(gameId);
    }
    /** Shared settlement path for both an in-guess auto-cashout (max streak) and an explicit /game/cashout call, and for a LOSS. */
    async settleEndedGame(state) {
        const payout = state.payout ?? 0;
        if (state.status === game_config_interface_1.GameStatus.CASHED_OUT) {
            await this.walletService.settleCashout(state.userId, state.gameId, payout);
        }
        // LOSS: nothing further to do wallet-wise — the bet was already debited at game start and is simply not returned.
        await this.gameRepository.finalizeGame(state.gameId, {
            status: state.status,
            payout,
            serverSeed: state.serverSeed,
            endedAt: state.endedAt ?? new Date(),
        });
        await this.stateStore.delete(state.gameId);
        await this.statisticsService.recordGameResult(state.userId, {
            wagered: state.betAmount,
            won: payout,
            isWin: state.status === game_config_interface_1.GameStatus.CASHED_OUT,
            multiplierAchieved: state.currentMultiplier,
            streakAchieved: state.streak,
        });
        if (state.status === game_config_interface_1.GameStatus.CASHED_OUT) {
            await this.leaderboardService.recordWin(state.userId, payout, state.currentMultiplier);
        }
    }
    /** The Redis-held state is gone (TTL expired) but the durable row still shows ACTIVE — refund the bet and mark the game ABANDONED, since play can no longer continue and the deck/seed can't be recovered from Postgres alone. Called both reactively (from submitGuess/cashout hitting a missing session) and proactively (from sweepAbandonedGames). */
    async abandonExpiredGame(gameId, userId) {
        const row = await this.gameRepository.getGameById(gameId);
        if (!row || row.status !== game_config_interface_1.GameStatus.ACTIVE)
            return; // already handled by a concurrent request
        await this.walletService.refundBet(userId, gameId, row.betAmount);
        await this.gameRepository.finalizeGame(gameId, {
            status: game_config_interface_1.GameStatus.ABANDONED,
            payout: 0,
            serverSeed: null, // genuinely unrecoverable — see the doc comment on GameRepository.finalizeGame
            endedAt: new Date(),
        });
    }
};
exports.GameApiService = GameApiService;
exports.GameApiService = GameApiService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(game_repository_interface_1.GAME_REPOSITORY)),
    __param(2, (0, common_1.Inject)(game_state_store_interface_1.GAME_STATE_STORE)),
    __param(3, (0, common_1.Inject)(game_rules_provider_1.GAME_RULES_PROVIDER)),
    __metadata("design:paramtypes", [game_engine_service_1.GameEngineService, Object, Object, Object, wallet_service_1.WalletService,
        statistics_service_1.StatisticsService,
        leaderboard_service_1.LeaderboardService])
], GameApiService);
