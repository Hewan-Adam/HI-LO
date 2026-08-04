"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeGameState = serializeGameState;
exports.deserializeGameState = deserializeGameState;
/**
 * GameState is otherwise JSON-safe except for its two Date fields. These
 * helpers are the single place that (de)serialization happens, so nothing
 * else needs to know the wire format.
 */
function serializeGameState(state) {
    return JSON.stringify(state, (_key, value) => (value instanceof Date ? { __date: value.toISOString() } : value));
}
function deserializeGameState(json) {
    return JSON.parse(json, (_key, value) => {
        if (value && typeof value === 'object' && '__date' in value) {
            return new Date(value.__date);
        }
        return value;
    });
}
