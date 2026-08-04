import { Card } from './card.interface';

export enum AceMode {
  HIGH = 'HIGH',
  LOW = 'LOW',
}

export enum EqualRule {
  PUSH = 'PUSH', // game continues, streak/multiplier unchanged, card re-shown
  LOSS = 'LOSS', // counts as an incorrect guess, game ends
  REDRAW = 'REDRAW', // the tied card is discarded and a new one is drawn silently
}

export enum PredictionType {
  HIGHER = 'HIGHER',
  LOWER = 'LOWER',
}

export enum MoveResult {
  WIN = 'WIN',
  LOSS = 'LOSS',
  PUSH = 'PUSH',
  REDRAW = 'REDRAW',
}

export enum GameStatus {
  ACTIVE = 'ACTIVE',
  CASHED_OUT = 'CASHED_OUT',
  LOST = 'LOST',
  ABANDONED = 'ABANDONED',
}

export interface MultiplierTableEntry {
  streak: number;
  multiplier: number;
}

export interface GameEngineConfig {
  aceMode: AceMode;
  equalRule: EqualRule;
  multiplierTable: MultiplierTableEntry[];
  /** Max correct guesses before the game force-cashes-out (e.g. deck exhaustion safety net). Defaults to 51. */
  maxStreak: number;
}

export interface GameMoveRecord {
  moveIndex: number;
  currentCard: Card;
  nextCard: Card;
  prediction: PredictionType;
  result: MoveResult;
  multiplierAfter: number;
}

/**
 * The full in-memory representation of one Hi-Lo game. Persistence (Prisma)
 * is layered on top of this in a later phase — GameEngineService here is
 * pure domain logic with no I/O, which keeps it trivially unit-testable and
 * keeps the provably-fair math auditable independent of the database.
 */
export interface GameState {
  gameId: string;
  userId: string;
  betAmount: number;

  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;

  deck: Card[]; // full shuffled deck, generated once at game start
  cursor: number; // index of the currently-revealed card within `deck`
  moves: GameMoveRecord[];

  streak: number;
  status: GameStatus;
  currentMultiplier: number;
  potentialPayout: number;
  payout?: number; // set only once the game ends (CASHED_OUT -> potentialPayout, LOST -> 0)

  config: GameEngineConfig;

  startedAt: Date;
  endedAt?: Date;
}

export interface FairnessProof {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  dealtCardCodes: string[]; // the cards actually dealt, in order, for the player to verify
}
