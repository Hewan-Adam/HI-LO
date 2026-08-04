import { Injectable } from '@nestjs/common';
import { Card, buildOrderedDeck } from '../interfaces/card.interface';
import { ProvablyFairService } from './provably-fair.service';

@Injectable()
export class DeckService {
  constructor(private readonly provablyFair: ProvablyFairService) {}

  /**
   * Fisher-Yates shuffle driven by a deterministic float stream, so the
   * exact same (serverSeed, clientSeed, nonce) always produces the exact
   * same deck order — this is what makes the game verifiable after the
   * server seed is revealed.
   */
  shuffle(deck: Card[], floats: number[]): Card[] {
    const shuffled = [...deck];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(floats[shuffled.length - 1 - i] * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Builds a fresh 52-card deck and deterministically shuffles it from the
   * given provably-fair seeds. Cards can never repeat within the resulting
   * deck because it's a permutation of a single ordered 52-card set, not a
   * draw-with-replacement process.
   */
  generateShuffledDeck(serverSeed: string, clientSeed: string, nonce: number): Card[] {
    const orderedDeck = buildOrderedDeck();
    // Fisher-Yates over 52 cards needs at most 51 swap decisions.
    const floats = this.provablyFair.generateFloats(serverSeed, clientSeed, nonce, orderedDeck.length - 1);
    return this.shuffle(orderedDeck, floats);
  }

  /**
   * Recomputes the deck from revealed seeds and checks it matches what was
   * actually dealt in a completed game — this is the core of player-facing
   * fairness verification.
   */
  verifyDeck(serverSeed: string, clientSeed: string, nonce: number, dealtCardCodes: string[]): boolean {
    const recomputedDeck = this.generateShuffledDeck(serverSeed, clientSeed, nonce);
    for (let i = 0; i < dealtCardCodes.length; i++) {
      if (recomputedDeck[i].code !== dealtCardCodes[i]) {
        return false;
      }
    }
    return true;
  }
}
