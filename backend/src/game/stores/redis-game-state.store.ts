import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { GameStateStore } from '../interfaces/game-state-store.interface';
import { GameState } from '../../game-engine/interfaces/game-config.interface';
import { serializeGameState, deserializeGameState } from '../interfaces/serialized-game-state';

const KEY_PREFIX = 'game:active:';

@Injectable()
export class RedisGameStateStore implements GameStateStore {
  constructor(private readonly redis: Redis) {}

  private key(gameId: string): string {
    return `${KEY_PREFIX}${gameId}`;
  }

  async save(gameId: string, state: GameState, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(gameId), serializeGameState(state), 'EX', ttlSeconds);
  }

  async load(gameId: string): Promise<GameState | null> {
    const raw = await this.redis.get(this.key(gameId));
    return raw ? deserializeGameState(raw) : null;
  }

  async delete(gameId: string): Promise<void> {
    await this.redis.del(this.key(gameId));
  }

  async refreshTtl(gameId: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(this.key(gameId), ttlSeconds);
  }
}
