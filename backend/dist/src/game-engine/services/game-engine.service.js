"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngineService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const deck_service_1 = require("./deck.service");
const provably_fair_service_1 = require("./provably-fair.service");
const multiplier_service_1 = require("./multiplier.service");
const card_comparator_service_1 = require("./card-comparator.service");
const game_config_interface_1 = require("../interfaces/game-config.interface");
const multiplier_table_constant_1 = require("../constants/multiplier-table.constant");
/**
 * Pure domain logic for a single Hi-Lo game — no database, no HTTP, no
 * queues. This makes the entire ruleset (provably-fair dealing, Ace mode,
 * equal-card handling, multiplier growth, cashout math) independently
 * unit-testable and auditable. The persistence phase wraps this service
 * with a Prisma-backed repository that loads/saves `GameState` and performs
 * the matching wallet debit/credit inside the same DB transaction.
 */
let GameEngineService = class GameEngineService {
    constructor(deckService, provablyFair, multiplierService, comparator) {
        this.deckService = deckService;
        this.provablyFair = provablyFair;
        this.multiplierService = multiplierService;
        this.comparator = comparator;
    }
    startGame(params) {
        if (params.betAmount <= 0) {
            throw new common_1.BadRequestException('Bet amount must be greater than zero');
        }
        const config = {
            aceMode: params.config?.aceMode ?? game_config_interface_1.AceMode.HIGH,
            equalRule: params.config?.equalRule ?? game_config_interface_1.EqualRule.PUSH,
            multiplierTable: params.config?.multiplierTable ?? this.multiplierService.getTable(),
            maxStreak: params.config?.maxStreak ?? multiplier_table_constant_1.DEFAULT_MAX_STREAK,
        };
        if (config.multiplierTable) {
            this.multiplierService.setTable(config.multiplierTable);
        }
        const serverSeed = this.provablyFair.generateServerSeed();
        const serverSeedHash = this.provablyFair.hashServerSeed(serverSeed);
        const clientSeed = params.clientSeed ?? this.provablyFair.generateClientSeed();
        const nonce = 0; // first game for this seed pair; incremented by the repository layer on seed reuse
        const deck = this.deckService.generateShuffledDeck(serverSeed, clientSeed, nonce);
        const state = {
            gameId: crypto.randomUUID(),
            userId: params.userId,
            betAmount: params.betAmount,
            serverSeed,
            serverSeedHash,
            clientSeed,
            nonce,
            deck,
            cursor: 0, // deck[0] is the first revealed card
            moves: [],
            streak: 0,
            status: game_config_interface_1.GameStatus.ACTIVE,
            currentMultiplier: 1,
            potentialPayout: params.betAmount,
            config,
            startedAt: new Date(),
        };
        return state;
    }
    /** The card currently on screen, which the player is predicting against. */
    getCurrentCard(state) {
        return state.deck[state.cursor];
    }
    submitGuess(state, prediction) {
        if (state.status !== game_config_interface_1.GameStatus.ACTIVE) {
            throw new common_1.ConflictException(`Game ${state.gameId} is not active (status: ${state.status})`);
        }
        if (state.cursor + 1 >= state.deck.length) {
            throw new common_1.ConflictException('Deck exhausted — this should never happen within maxStreak bounds');
        }
        const currentCard = state.deck[state.cursor];
        const nextCard = state.deck[state.cursor + 1];
        const outcome = this.comparator.compare(currentCard, nextCard, prediction, state.config.aceMode, state.config.equalRule);
        // REDRAW: silently discard the tied card and re-compare against the one after it,
        // without recording a move or advancing the streak — the player never even sees it.
        if (outcome.result === game_config_interface_1.MoveResult.REDRAW) {
            state.cursor += 1;
            return this.submitGuess(state, prediction);
        }
        state.cursor += 1;
        if (outcome.result === game_config_interface_1.MoveResult.PUSH) {
            state.moves.push({
                moveIndex: state.moves.length,
                currentCard,
                nextCard,
                prediction,
                result: game_config_interface_1.MoveResult.PUSH,
                multiplierAfter: state.currentMultiplier,
            });
            return {
                state,
                result: game_config_interface_1.MoveResult.PUSH,
                correct: null,
                revealedCardCode: nextCard.code,
                gameOver: false,
            };
        }
        if (outcome.result === game_config_interface_1.MoveResult.WIN) {
            state.streak += 1;
            state.currentMultiplier = this.multiplierService.getMultiplier(state.streak);
            state.potentialPayout = this.multiplierService.calculatePotentialPayout(state.betAmount, state.streak);
            state.moves.push({
                moveIndex: state.moves.length,
                currentCard,
                nextCard,
                prediction,
                result: game_config_interface_1.MoveResult.WIN,
                multiplierAfter: state.currentMultiplier,
            });
            const hitMaxStreak = state.streak >= state.config.maxStreak;
            if (hitMaxStreak) {
                state.status = game_config_interface_1.GameStatus.CASHED_OUT;
                state.payout = state.potentialPayout;
                state.endedAt = new Date();
            }
            return {
                state,
                result: game_config_interface_1.MoveResult.WIN,
                correct: true,
                revealedCardCode: nextCard.code,
                gameOver: hitMaxStreak,
            };
        }
        // LOSS
        state.status = game_config_interface_1.GameStatus.LOST;
        state.payout = 0;
        state.endedAt = new Date();
        state.moves.push({
            moveIndex: state.moves.length,
            currentCard,
            nextCard,
            prediction,
            result: game_config_interface_1.MoveResult.LOSS,
            multiplierAfter: state.currentMultiplier,
        });
        return {
            state,
            result: game_config_interface_1.MoveResult.LOSS,
            correct: false,
            revealedCardCode: nextCard.code,
            gameOver: true,
        };
    }
    cashout(state) {
        if (state.status !== game_config_interface_1.GameStatus.ACTIVE) {
            throw new common_1.ConflictException(`Game ${state.gameId} cannot be cashed out (status: ${state.status})`);
        }
        if (state.streak === 0) {
            throw new common_1.BadRequestException('Cannot cash out before at least one correct guess');
        }
        state.status = game_config_interface_1.GameStatus.CASHED_OUT;
        state.payout = state.potentialPayout;
        state.endedAt = new Date();
        return { state, payout: state.payout };
    }
    /** Reveals the server seed and the full dealt-card sequence so the player can independently verify fairness. */
    getFairnessProof(state) {
        if (state.status === game_config_interface_1.GameStatus.ACTIVE) {
            throw new common_1.ConflictException('Server seed is only revealed once the game has ended');
        }
        return {
            serverSeed: state.serverSeed,
            serverSeedHash: state.serverSeedHash,
            clientSeed: state.clientSeed,
            nonce: state.nonce,
            dealtCardCodes: state.deck.slice(0, state.cursor + 1).map((c) => c.code),
        };
    }
    verifyFairness(proof) {
        const hashMatches = this.provablyFair.verifyServerSeed(proof.serverSeed, proof.serverSeedHash);
        if (!hashMatches)
            return false;
        return this.deckService.verifyDeck(proof.serverSeed, proof.clientSeed, proof.nonce, proof.dealtCardCodes);
    }
};
exports.GameEngineService = GameEngineService;
exports.GameEngineService = GameEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [deck_service_1.DeckService,
        provably_fair_service_1.ProvablyFairService,
        multiplier_service_1.MultiplierService,
        card_comparator_service_1.CardComparatorService])
], GameEngineService);
