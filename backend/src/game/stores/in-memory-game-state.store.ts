import { Injectable } from '@nestjs/common';
import { GameStateStore } from '../interfaces/game-state-store.interface';
import { GameState } from '../../game-engine/interfaces/game-config.interface';
import { serializeGameState, deserializeGameState } from '../interfaces/serialized-game-state';

interface Entry {
  payload: string;
  expiresAt: number;
}

/** Faithful in-memory stand-in for Redis: same serialize-on-write behavior (so bugs in serialization surface here too) and real TTL expiry via wall-clock comparison. */
@Injectable()
export class InMemoryGameStateStore implements GameStateStore {
  private store = new Map<string, Entry>();

  async save(gameId: string, state: GameState, ttlSeconds: number): Promise<void> {
    this.store.set(gameId, { payload: serializeGameState(state), expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async load(gameId: string): Promise<GameState | null> {
    const entry = this.store.get(gameId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(gameId);
      return null;
    }
    return deserializeGameState(entry.payload);
  }

  async delete(gameId: string): Promise<void> {
    this.store.delete(gameId);
  }

  async refreshTtl(gameId: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(gameId);
    if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
  }
}
