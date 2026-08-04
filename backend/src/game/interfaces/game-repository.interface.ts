import { AceMode, EqualRule, GameMoveRecord, GameStatus } from '../../game-engine/interfaces/game-config.interface';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export interface GameRow {
  id: string;
  userId: string;
  betAmount: number;
  status: GameStatus;
  aceMode: AceMode;
  equalRule: EqualRule;
  serverSeed?: string; // present only once status !== ACTIVE
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  streak: number;
  cursor: number;
  currentMultiplier: number;
  payout?: number;
  startedAt: Date;
  endedAt?: Date;
  updatedAt: Date;
}

export interface GameMoveRow extends GameMoveRecord {
  gameId: string;
}

/**
 * The durable half of a game's lifecycle — deliberately minimal compared to
 * `GameStateStore` (Redis): no deck, no server seed while ACTIVE. This is
 * what powers history, admin views, and fairness verification after the
 * fact; it is not what the API reads from on every guess (that's the
 * Redis-held `GameState`, which is why `GameEngineService` stays completely
 * decoupled from this repository).
 */
export interface GameRepository {
  /** Inserts the initial ACTIVE row, before any wallet debit has happened. */
  createGame(params: {
    id: string;
    userId: string;
    betAmount: number;
    aceMode: AceMode;
    equalRule: EqualRule;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  }): Promise<GameRow>;

  /** Compensating action if the wallet debit that must follow createGame() fails — nothing durable has happened yet, so this is a hard delete, not a status change. */
  deleteGame(id: string): Promise<void>;

  getGameById(id: string): Promise<GameRow | null>;

  getGameHistory(userId: string, limit: number, offset: number): Promise<GameRow[]>;

  getMoves(gameId: string): Promise<GameMoveRow[]>;

  /** For the admin analytics dashboard: every non-ACTIVE game whose endedAt falls in [start, end), across all users. Powers revenue, win/loss ratio, and average session duration. */
  getGamesEndedInRange(start: Date, end: Date): Promise<GameRow[]>;

  /** For the admin analytics dashboard: count of distinct users with a game STARTED in [start, end), across all users — "active players" for a period. */
  getDistinctPlayerCountInRange(start: Date, end: Date): Promise<number>;

  /**
   * For the sweep job (GameSweepScheduler): every game still ACTIVE whose
   * `updatedAt` is older than `olderThan` — i.e. no guess/cashout has
   * touched it recently enough that its Redis-held live state has almost
   * certainly expired (see GameApiService's ACTIVE_GAME_TTL_SECONDS). This
   * lets abandoned sessions get refunded proactively on a schedule, instead
   * of only reactively the next time the player happens to act on them
   * (which might be never, if they just closed the app).
   */
  getStaleActiveGames(olderThan: Date): Promise<GameRow[]>;

  /** Appends one move and updates the live-progress columns — called after every guess, whether or not the game ends. */
  appendMove(
    gameId: string,
    move: GameMoveRecord,
    updated: { streak: number; cursor: number; currentMultiplier: number },
  ): Promise<void>;

  /**
   * Called exactly once, when a game transitions out of ACTIVE — this is
   * what reveals serverSeed. `serverSeed` is nullable to cover one honest
   * edge case: if the Redis-held live GameState's TTL expires before the
   * game finishes (see GameApiService.abandonGame), the seed was never
   * durably stored anywhere and is genuinely unrecoverable — that game's
   * fairness can never be independently verified after the fact. This
   * should be rare in practice (TTL is refreshed on every action and set
   * generously) and worth alerting on in production if it ever happens, but
   * it's a real possibility of this architecture, not something to hide
   * behind a fake value.
   */
  finalizeGame(id: string, params: { status: GameStatus; payout: number; serverSeed: string | null; endedAt: Date }): Promise<void>;
}
