"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUIT_CODES = exports.RANK_LABELS = void 0;
exports.buildOrderedDeck = buildOrderedDeck;
exports.RANK_LABELS = {
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
exports.SUIT_CODES = {
    HEARTS: 'H',
    DIAMONDS: 'D',
    CLUBS: 'C',
    SPADES: 'S',
};
function buildOrderedDeck() {
    const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    const deck = [];
    for (const suit of suits) {
        for (let rank = 1; rank <= 13; rank++) {
            deck.push({
                suit,
                rank,
                label: exports.RANK_LABELS[rank],
                code: `${exports.RANK_LABELS[rank]}${exports.SUIT_CODES[suit]}`,
            });
        }
    }
    return deck;
}
