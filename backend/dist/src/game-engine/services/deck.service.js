"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeckService = void 0;
const common_1 = require("@nestjs/common");
const card_interface_1 = require("../interfaces/card.interface");
const provably_fair_service_1 = require("./provably-fair.service");
let DeckService = class DeckService {
    constructor(provablyFair) {
        this.provablyFair = provablyFair;
    }
    /**
     * Fisher-Yates shuffle driven by a deterministic float stream, so the
     * exact same (serverSeed, clientSeed, nonce) always produces the exact
     * same deck order — this is what makes the game verifiable after the
     * server seed is revealed.
     */
    shuffle(deck, floats) {
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
    generateShuffledDeck(serverSeed, clientSeed, nonce) {
        const orderedDeck = (0, card_interface_1.buildOrderedDeck)();
        // Fisher-Yates over 52 cards needs at most 51 swap decisions.
        const floats = this.provablyFair.generateFloats(serverSeed, clientSeed, nonce, orderedDeck.length - 1);
        return this.shuffle(orderedDeck, floats);
    }
    /**
     * Recomputes the deck from revealed seeds and checks it matches what was
     * actually dealt in a completed game — this is the core of player-facing
     * fairness verification.
     */
    verifyDeck(serverSeed, clientSeed, nonce, dealtCardCodes) {
        const recomputedDeck = this.generateShuffledDeck(serverSeed, clientSeed, nonce);
        for (let i = 0; i < dealtCardCodes.length; i++) {
            if (recomputedDeck[i].code !== dealtCardCodes[i]) {
                return false;
            }
        }
        return true;
    }
};
exports.DeckService = DeckService;
exports.DeckService = DeckService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provably_fair_service_1.ProvablyFairService])
], DeckService);
