import { GameState } from '../../game-engine/interfaces/game-config.interface';

/**
 * GameState is otherwise JSON-safe except for its two Date fields. These
 * helpers are the single place that (de)serialization happens, so nothing
 * else needs to know the wire format.
 */
export function serializeGameState(state: GameState): string {
  return JSON.stringify(state, (_key, value) => (value instanceof Date ? { __date: value.toISOString() } : value));
}

export function deserializeGameState(json: string): GameState {
  return JSON.parse(json, (_key, value) => {
    if (value && typeof value === 'object' && '__date' in value) {
      return new Date(value.__date);
    }
    return value;
  });
}
