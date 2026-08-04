import { GameState } from '../../game-engine/interfaces/game-config.interface';

export const GAME_STATE_STORE = Symbol('GAME_STATE_STORE');

/**
 * Holds the *full* in-flight GameState — including the revealed `serverSeed`
 * and complete shuffled deck — for exactly as long as a game is ACTIVE.
 *
 * Why Redis (and not Postgres) for this: the durable `Game` row in Postgres
 * deliberately never stores `serverSeed` until the game ends (see phase 1),
 * so it can never be queried out mid-game even by mistake. The full deck
 * isn't a Postgres column at all — it's cheap to regenerate deterministically
 * from the seeds, so there's no reason to persist it durably. Redis is the
 * right fit for this exact shape of data: hot, short-lived (a game session
 * lasts minutes, not months), keyed by gameId, with a TTL so an abandoned
 * game's sensitive state doesn't linger forever.
 */
export interface GameStateStore {
  save(gameId: string, state: GameState, ttlSeconds: number): Promise<void>;
  load(gameId: string): Promise<GameState | null>;
  delete(gameId: string): Promise<void>;
  refreshTtl(gameId: string, ttlSeconds: number): Promise<void>;
}
