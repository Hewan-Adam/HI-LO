import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GameApiService } from './game-api.service';

@Injectable()
export class GameSweepScheduler {
  private readonly logger = new Logger('GameSweepScheduler');

  constructor(private readonly gameApiService: GameApiService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSweep(): Promise<void> {
    try {
      const { swept, skipped } = await this.gameApiService.sweepAbandonedGames();
      if (swept > 0 || skipped > 0) {
        this.logger.log(`Sweep complete: ${swept} game(s) refunded and marked ABANDONED, ${skipped} false-positive candidate(s) skipped (still live).`);
      }
    } catch (err) {
      // A failed sweep should never crash the process — it just means
      // those stale games get picked up on the next run (or the next time
      // a player happens to act on one, which still works reactively).
      this.logger.error('Sweep run failed', err instanceof Error ? err.stack : String(err));
    }
  }
}
