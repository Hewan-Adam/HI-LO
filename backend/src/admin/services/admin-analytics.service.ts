import { Inject, Injectable } from '@nestjs/common';
import { GAME_REPOSITORY, GameRepository, GameRow } from '../../game/interfaces/game-repository.interface';
import { GameStatus } from '../../game-engine/interfaces/game-config.interface';

export interface AnalyticsSummary {
  rangeStart: Date;
  rangeEnd: Date;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winLossRatio: number | null; // wins / losses, null if losses is 0 and wins > 0 (undefined ratio, not divide-by-zero)
  totalWagered: number;
  totalPaidOut: number;
  /** House profit = totalWagered - totalPaidOut, over this range. This is what "daily revenue" / "house profit" in the spec's Admin Dashboard actually means arithmetically. */
  houseProfit: number;
  activePlayers: number;
  averageSessionDurationSeconds: number;
}

@Injectable()
export class AdminAnalyticsService {
  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  async getSummary(rangeStart: Date, rangeEnd: Date): Promise<AnalyticsSummary> {
    const [endedGames, activePlayers] = await Promise.all([
      this.gameRepository.getGamesEndedInRange(rangeStart, rangeEnd),
      this.gameRepository.getDistinctPlayerCountInRange(rangeStart, rangeEnd),
    ]);

    // ABANDONED games were fully refunded (see GameApiService.abandonExpiredGame)
    // — the stake never became house revenue, so they must be excluded from
    // wagered/payout/profit math. Counting a refunded bet as "wagered" would
    // overstate both volume and (since payout is 0) profit. They're still
    // real sessions though, so they're excluded from win/loss and
    // profit-bearing metrics but not hidden from the dashboard entirely —
    // callers can derive `abandonedGames` from `gamesPlayed - settledGames`
    // if needed; this summary reports the settled-game metrics that matter
    // for revenue reporting.
    const settledGames = endedGames.filter((g) => g.status === GameStatus.CASHED_OUT || g.status === GameStatus.LOST);

    const wins = settledGames.filter((g) => g.status === GameStatus.CASHED_OUT).length;
    const losses = settledGames.filter((g) => g.status === GameStatus.LOST).length;
    const totalWagered = this.sum(settledGames, (g) => g.betAmount);
    const totalPaidOut = this.sum(settledGames, (g) => g.payout ?? 0);

    return {
      rangeStart,
      rangeEnd,
      gamesPlayed: settledGames.length,
      wins,
      losses,
      winLossRatio: losses > 0 ? Number((wins / losses).toFixed(4)) : null,
      totalWagered: Number(totalWagered.toFixed(8)),
      totalPaidOut: Number(totalPaidOut.toFixed(8)),
      houseProfit: Number((totalWagered - totalPaidOut).toFixed(8)),
      activePlayers,
      averageSessionDurationSeconds: this.averageSessionDuration(settledGames),
    };
  }

  private sum(games: GameRow[], selector: (g: GameRow) => number): number {
    return games.reduce((total, g) => total + selector(g), 0);
  }

  private averageSessionDuration(games: GameRow[]): number {
    const withDuration = games.filter((g) => g.endedAt);
    if (withDuration.length === 0) return 0;
    const totalSeconds = withDuration.reduce((total, g) => total + (g.endedAt!.getTime() - g.startedAt.getTime()) / 1000, 0);
    return Number((totalSeconds / withDuration.length).toFixed(2));
  }
}
