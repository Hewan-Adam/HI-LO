import { Injectable } from '@nestjs/common';
import { Card } from '../interfaces/card.interface';
import { AceMode, EqualRule, MoveResult, PredictionType } from '../interfaces/game-config.interface';

export interface ComparisonOutcome {
  result: MoveResult;
  /** null when the outcome doesn't map to a clean win/loss (PUSH, REDRAW) */
  isCorrect: boolean | null;
}

@Injectable()
export class CardComparatorService {
  /** Ace resolves to 14 (high) or 1 (low) per the configured Ace mode; every other rank is unchanged. */
  effectiveRank(card: Card, aceMode: AceMode): number {
    if (card.rank === 1) {
      return aceMode === AceMode.HIGH ? 14 : 1;
    }
    return card.rank;
  }

  compare(
    currentCard: Card,
    nextCard: Card,
    prediction: PredictionType,
    aceMode: AceMode,
    equalRule: EqualRule,
  ): ComparisonOutcome {
    const currentRank = this.effectiveRank(currentCard, aceMode);
    const nextRank = this.effectiveRank(nextCard, aceMode);

    if (currentRank === nextRank) {
      switch (equalRule) {
        case EqualRule.PUSH:
          return { result: MoveResult.PUSH, isCorrect: null };
        case EqualRule.LOSS:
          return { result: MoveResult.LOSS, isCorrect: false };
        case EqualRule.REDRAW:
          return { result: MoveResult.REDRAW, isCorrect: null };
      }
    }

    const actualDirection = nextRank > currentRank ? PredictionType.HIGHER : PredictionType.LOWER;
    const isCorrect = actualDirection === prediction;

    return { result: isCorrect ? MoveResult.WIN : MoveResult.LOSS, isCorrect };
  }
}
