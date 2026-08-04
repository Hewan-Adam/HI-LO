import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GameRepository, GameRow, GameMoveRow } from '../interfaces/game-repository.interface';
import { AceMode, EqualRule, GameMoveRecord, GameStatus, MoveResult, PredictionType } from '../../game-engine/interfaces/game-config.interface';
import { buildOrderedDeck } from '../../game-engine/interfaces/card.interface';

@Injectable()
export class PrismaGameRepository implements GameRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const row = await this.prisma.game.create({
      data: {
        id: params.id,
        userId: params.userId,
        betAmount: params.betAmount,
        aceMode: params.aceMode as unknown as Prisma.GameCreateInput['aceMode'],
        equalRule: params.equalRule as unknown as Prisma.GameCreateInput['equalRule'],
        // serverSeed intentionally omitted — stays NULL until finalizeGame(),
        // so it is never queryable in Postgres while the game is ACTIVE.
        serverSeedHash: params.serverSeedHash,
        clientSeed: params.clientSeed,
        nonce: params.nonce,
      },
    });
    return this.toRow(row);
  }

  async deleteGame(id: string): Promise<void> {
    await this.prisma.game.delete({ where: { id } });
  }

  async getGameById(id: string): Promise<GameRow | null> {
    const row = await this.prisma.game.findUnique({ where: { id } });
    return row ? this.toRow(row) : null;
  }

  async getGameHistory(userId: string, limit = 50, offset = 0): Promise<GameRow[]> {
    const rows = await this.prisma.game.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map((row) => this.toRow(row));
  }

  async getMoves(gameId: string): Promise<GameMoveRow[]> {
    const rows = await this.prisma.gameMove.findMany({ where: { gameId }, orderBy: { moveIndex: 'asc' } });
    const deckByCode = new Map(buildOrderedDeck().map((c) => [c.code, c]));
    return rows.map((m) => ({
      gameId,
      moveIndex: m.moveIndex,
      currentCard: deckByCode.get(m.currentCardCode)!,
      nextCard: deckByCode.get(m.nextCardCode)!,
      prediction: m.prediction as PredictionType,
      result: m.result as MoveResult,
      multiplierAfter: Number(m.multiplierAfter),
    }));
  }

  async getGamesEndedInRange(start: Date, end: Date): Promise<GameRow[]> {
    const rows = await this.prisma.game.findMany({
      where: { status: { not: 'ACTIVE' as any }, endedAt: { gte: start, lt: end } },
    });
    return rows.map((row) => this.toRow(row));
  }

  async getDistinctPlayerCountInRange(start: Date, end: Date): Promise<number> {
    const rows = await this.prisma.game.findMany({
      where: { startedAt: { gte: start, lt: end } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.length;
  }

  async getStaleActiveGames(olderThan: Date): Promise<GameRow[]> {
    const rows = await this.prisma.game.findMany({
      where: { status: 'ACTIVE' as any, updatedAt: { lt: olderThan } },
    });
    return rows.map((row) => this.toRow(row));
  }

  async appendMove(
    gameId: string,
    move: GameMoveRecord,
    updated: { streak: number; cursor: number; currentMultiplier: number },
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.gameMove.create({
        data: {
          gameId,
          moveIndex: move.moveIndex,
          currentCardCode: move.currentCard.code,
          nextCardCode: move.nextCard.code,
          prediction: move.prediction as unknown as Prisma.GameMoveCreateInput['prediction'],
          result: move.result as unknown as Prisma.GameMoveCreateInput['result'],
          multiplierAfter: move.multiplierAfter,
        },
      }),
      this.prisma.game.update({
        where: { id: gameId },
        data: { streak: updated.streak, cursor: updated.cursor, currentMultiplier: updated.currentMultiplier },
      }),
    ]);
  }

  async finalizeGame(id: string, params: { status: GameStatus; payout: number; serverSeed: string | null; endedAt: Date }): Promise<void> {
    await this.prisma.game.update({
      where: { id },
      data: {
        status: params.status as unknown as Prisma.GameUpdateInput['status'],
        payout: params.payout,
        serverSeed: params.serverSeed, // revealed for the first (and only) time here
        endedAt: params.endedAt,
      },
    });
  }

  private toRow(row: {
    id: string;
    userId: string;
    betAmount: Prisma.Decimal;
    status: string;
    aceMode: string;
    equalRule: string;
    serverSeed: string | null;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    streak: number;
    cursor: number;
    currentMultiplier: Prisma.Decimal;
    payout: Prisma.Decimal | null;
    startedAt: Date;
    endedAt: Date | null;
    updatedAt: Date;
  }): GameRow {
    return {
      id: row.id,
      userId: row.userId,
      betAmount: Number(row.betAmount),
      status: row.status as GameStatus,
      aceMode: row.aceMode as AceMode,
      equalRule: row.equalRule as EqualRule,
      serverSeed: row.serverSeed ?? undefined,
      serverSeedHash: row.serverSeedHash,
      clientSeed: row.clientSeed,
      nonce: row.nonce,
      streak: row.streak,
      cursor: row.cursor,
      currentMultiplier: Number(row.currentMultiplier),
      payout: row.payout != null ? Number(row.payout) : undefined,
      startedAt: row.startedAt,
      endedAt: row.endedAt ?? undefined,
      updatedAt: row.updatedAt,
    };
  }
}
