import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import * as crypto from 'crypto';
import { DeckService } from './deck.service';
import { ProvablyFairService } from './provably-fair.service';
import { MultiplierService } from './multiplier.service';
import { CardComparatorService } from './card-comparator.service';
import {
  AceMode,
  EqualRule,
  FairnessProof,
  GameEngineConfig,
  GameState,
  GameStatus,
  MoveResult,
  PredictionType,
} from '../interfaces/game-config.interface';
import { DEFAULT_MAX_STREAK } from '../constants/multiplier-table.constant';

export interface StartGameParams {
  userId: string;
  betAmount: number;
  clientSeed?: string; // if omitted, the server generates one on the player's behalf
  config?: Partial<GameEngineConfig>;
}

export interface GuessOutcome {
  state: GameState;
  result: MoveResult;
  correct: boolean | null;
  revealedCardCode: string;
  gameOver: boolean;
}

export interface CashoutOutcome {
  state: GameState;
  payout: number;
}

/**
 * Pure domain logic for a single Hi-Lo game — no database, no HTTP, no
 * queues. This makes the entire ruleset (provably-fair dealing, Ace mode,
 * equal-card handling, multiplier growth, cashout math) independently
 * unit-testable and auditable. The persistence phase wraps this service
 * with a Prisma-backed repository that loads/saves `GameState` and performs
 * the matching wallet debit/credit inside the same DB transaction.
 */
@Injectable()
export class GameEngineService {
  constructor(
    private readonly deckService: DeckService,
    private readonly provablyFair: ProvablyFairService,
    private readonly multiplierService: MultiplierService,
    private readonly comparator: CardComparatorService,
  ) {}

  startGame(params: StartGameParams): GameState {
    if (params.betAmount <= 0) {
      throw new BadRequestException('Bet amount must be greater than zero');
    }

    const config: GameEngineConfig = {
      aceMode: params.config?.aceMode ?? AceMode.HIGH,
      equalRule: params.config?.equalRule ?? EqualRule.PUSH,
      multiplierTable: params.config?.multiplierTable ?? this.multiplierService.getTable(),
      maxStreak: params.config?.maxStreak ?? DEFAULT_MAX_STREAK,
    };

    if (config.multiplierTable) {
      this.multiplierService.setTable(config.multiplierTable);
    }

    const serverSeed = this.provablyFair.generateServerSeed();
    const serverSeedHash = this.provablyFair.hashServerSeed(serverSeed);
    const clientSeed = params.clientSeed ?? this.provablyFair.generateClientSeed();
    const nonce = 0; // first game for this seed pair; incremented by the repository layer on seed reuse

    const deck = this.deckService.generateShuffledDeck(serverSeed, clientSeed, nonce);

    const state: GameState = {
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
      status: GameStatus.ACTIVE,
      currentMultiplier: 1,
      potentialPayout: params.betAmount,
      config,
      startedAt: new Date(),
    };

    return state;
  }

  /** The card currently on screen, which the player is predicting against. */
  getCurrentCard(state: GameState) {
    return state.deck[state.cursor];
  }

  submitGuess(state: GameState, prediction: PredictionType): GuessOutcome {
    if (state.status !== GameStatus.ACTIVE) {
      throw new ConflictException(`Game ${state.gameId} is not active (status: ${state.status})`);
    }
    if (state.cursor + 1 >= state.deck.length) {
      throw new ConflictException('Deck exhausted — this should never happen within maxStreak bounds');
    }

    const currentCard = state.deck[state.cursor];
    const nextCard = state.deck[state.cursor + 1];

    const outcome = this.comparator.compare(currentCard, nextCard, prediction, state.config.aceMode, state.config.equalRule);

    // REDRAW: silently discard the tied card and re-compare against the one after it,
    // without recording a move or advancing the streak — the player never even sees it.
    if (outcome.result === MoveResult.REDRAW) {
      state.cursor += 1;
      return this.submitGuess(state, prediction);
    }

    state.cursor += 1;

    if (outcome.result === MoveResult.PUSH) {
      state.moves.push({
        moveIndex: state.moves.length,
        currentCard,
        nextCard,
        prediction,
        result: MoveResult.PUSH,
        multiplierAfter: state.currentMultiplier,
      });
      return {
        state,
        result: MoveResult.PUSH,
        correct: null,
        revealedCardCode: nextCard.code,
        gameOver: false,
      };
    }

    if (outcome.result === MoveResult.WIN) {
      state.streak += 1;
      state.currentMultiplier = this.multiplierService.getMultiplier(state.streak);
      state.potentialPayout = this.multiplierService.calculatePotentialPayout(state.betAmount, state.streak);

      state.moves.push({
        moveIndex: state.moves.length,
        currentCard,
        nextCard,
        prediction,
        result: MoveResult.WIN,
        multiplierAfter: state.currentMultiplier,
      });

      const hitMaxStreak = state.streak >= state.config.maxStreak;
      if (hitMaxStreak) {
        state.status = GameStatus.CASHED_OUT;
        state.payout = state.potentialPayout;
        state.endedAt = new Date();
      }

      return {
        state,
        result: MoveResult.WIN,
        correct: true,
        revealedCardCode: nextCard.code,
        gameOver: hitMaxStreak,
      };
    }

    // LOSS
    state.status = GameStatus.LOST;
    state.payout = 0;
    state.endedAt = new Date();
    state.moves.push({
      moveIndex: state.moves.length,
      currentCard,
      nextCard,
      prediction,
      result: MoveResult.LOSS,
      multiplierAfter: state.currentMultiplier,
    });

    return {
      state,
      result: MoveResult.LOSS,
      correct: false,
      revealedCardCode: nextCard.code,
      gameOver: true,
    };
  }

  cashout(state: GameState): CashoutOutcome {
    if (state.status !== GameStatus.ACTIVE) {
      throw new ConflictException(`Game ${state.gameId} cannot be cashed out (status: ${state.status})`);
    }
    if (state.streak === 0) {
      throw new BadRequestException('Cannot cash out before at least one correct guess');
    }

    state.status = GameStatus.CASHED_OUT;
    state.payout = state.potentialPayout;
    state.endedAt = new Date();

    return { state, payout: state.payout };
  }

  /** Reveals the server seed and the full dealt-card sequence so the player can independently verify fairness. */
  getFairnessProof(state: GameState): FairnessProof {
    if (state.status === GameStatus.ACTIVE) {
      throw new ConflictException('Server seed is only revealed once the game has ended');
    }
    return {
      serverSeed: state.serverSeed,
      serverSeedHash: state.serverSeedHash,
      clientSeed: state.clientSeed,
      nonce: state.nonce,
      dealtCardCodes: state.deck.slice(0, state.cursor + 1).map((c) => c.code),
    };
  }

  verifyFairness(proof: FairnessProof): boolean {
    const hashMatches = this.provablyFair.verifyServerSeed(proof.serverSeed, proof.serverSeedHash);
    if (!hashMatches) return false;
    return this.deckService.verifyDeck(proof.serverSeed, proof.clientSeed, proof.nonce, proof.dealtCardCodes);
  }
}
