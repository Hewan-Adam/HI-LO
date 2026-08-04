export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';

export const RANK_LABELS: Record<number, string> = {
  1: 'A',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
};

export const SUIT_CODES: Record<Suit, string> = {
  HEARTS: 'H',
  DIAMONDS: 'D',
  CLUBS: 'C',
  SPADES: 'S',
};

/**
 * A single playing card. `rank` is always 1 (Ace) through 13 (King) regardless
 * of ace-high/ace-low configuration — the *effective* rank used for
 * comparisons is computed by CardComparatorService, never stored on the card
 * itself, so the same deck works under either Ace rule.
 */
export interface Card {
  suit: Suit;
  rank: number; // 1-13
  label: string; // e.g. "A", "10", "K"
  code: string; // e.g. "AH", "10S", "KD" — unique per card in a deck
}

export function buildOrderedDeck(): Card[] {
  const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        suit,
        rank,
        label: RANK_LABELS[rank],
        code: `${RANK_LABELS[rank]}${SUIT_CODES[suit]}`,
      });
    }
  }

  return deck;
}
