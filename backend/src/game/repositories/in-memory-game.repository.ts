import { Injectable } from '@nestjs/common';
import { GameRepository, GameRow, GameMoveRow } from '../interfaces/game-repository.interface';
import { AceMode, EqualRule, GameMoveRecord, GameStatus } from '../../game-engine/interfaces/game-config.interface';

@Injectable()
export class InMemoryGameRepository implements GameRepository {
  private games = new Map<string, GameRow>();
  private moves = new Map<string, GameMoveRow[]>();

  async createGame(params: {
    id: string;
    userId: string;
    betAmount: number;
    aceMode: AceMode;
    equalRule: EqualRule;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  }): Promise<GameRow> {
    const row: GameRow = {
      id: params.id,
      userId: params.userId,
      betAmount: params.betAmount,
      status: GameStatus.ACTIVE,
      aceMode: params.aceMode,
      equalRule: params.equalRule,
      serverSeedHash: params.serverSeedHash,
      clientSeed: params.clientSeed,
      nonce: params.nonce,
      streak: 0,
      cursor: 0,
      currentMultiplier: 1,
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    this.games.set(row.id, row);
    this.moves.set(row.id, []);
    return { ...row };
  }

  async deleteGame(id: string): Promise<void> {
    this.games.delete(id);
    this.moves.delete(id);
  }

  async getGameById(id: string): Promise<GameRow | null> {
    const row = this.games.get(id);
    return row ? { ...row } : null;
  }

  async getGameHistory(userId: string, limit = 50, offset = 0): Promise<GameRow[]> {
    return [...this.games.values()]
      .filter((g) => g.userId === userId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(offset, offset + limit)
      .map((g) => ({ ...g }));
  }

  async getMoves(gameId: string): Promise<GameMoveRow[]> {
    return [...(this.moves.get(gameId) ?? [])];
  }

  async getGamesEndedInRange(start: Date, end: Date): Promise<GameRow[]> {
    return [...this.games.values()]
      .filter((g) => g.status !== GameStatus.ACTIVE && g.endedAt && g.endedAt >= start && g.endedAt < end)
      .map((g) => ({ ...g }));
  }

  async getDistinctPlayerCountInRange(start: Date, end: Date): Promise<number> {
    const userIds = new Set(
      [...this.games.values()].filter((g) => g.startedAt >= start && g.startedAt < end).map((g) => g.userId),
    );
    return userIds.size;
  }

  async appendMove(
    gameId: string,
    move: GameMoveRecord,
    updated: { streak: number; cursor: number; currentMultiplier: number },
  ): Promise<void> {
    const row = this.games.get(gameId);
    if (!row) throw new Error(`Game ${gameId} not found`);

    const moveList = this.moves.get(gameId) ?? [];
    moveList.push({ ...move, gameId });
    this.moves.set(gameId, moveList);

    row.streak = updated.streak;
    row.cursor = updated.cursor;
    row.currentMultiplier = updated.currentMultiplier;
    row.updatedAt = new Date();
  }

  async getStaleActiveGames(olderThan: Date): Promise<GameRow[]> {
    return [...this.games.values()]
      .filter((g) => g.status === GameStatus.ACTIVE && g.updatedAt < olderThan)
      .map((g) => ({ ...g }));
  }

  /** Test/demo helper only — not part of the GameRepository interface. Simulates a game that's been idle for a while without needing to actually wait. */
  _debugSetUpdatedAt(gameId: string, date: Date): void {
    const row = this.games.get(gameId);
    if (row) row.updatedAt = date;
  }

  async finalizeGame(id: string, params: { status: GameStatus; payout: number; serverSeed: string | null; endedAt: Date }): Promise<void> {
    const row = this.games.get(id);
    if (!row) throw new Error(`Game ${id} not found`);
    row.status = params.status;
    row.payout = params.payout;
    row.serverSeed = params.serverSeed ?? undefined;
    row.endedAt = params.endedAt;
    row.updatedAt = new Date();
  }
}
