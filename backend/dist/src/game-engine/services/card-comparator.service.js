"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardComparatorService = void 0;
const common_1 = require("@nestjs/common");
const game_config_interface_1 = require("../interfaces/game-config.interface");
let CardComparatorService = class CardComparatorService {
    /** Ace resolves to 14 (high) or 1 (low) per the configured Ace mode; every other rank is unchanged. */
    effectiveRank(card, aceMode) {
        if (card.rank === 1) {
            return aceMode === game_config_interface_1.AceMode.HIGH ? 14 : 1;
        }
        return card.rank;
    }
    compare(currentCard, nextCard, prediction, aceMode, equalRule) {
        const currentRank = this.effectiveRank(currentCard, aceMode);
        const nextRank = this.effectiveRank(nextCard, aceMode);
        if (currentRank === nextRank) {
            switch (equalRule) {
                case game_config_interface_1.EqualRule.PUSH:
                    return { result: game_config_interface_1.MoveResult.PUSH, isCorrect: null };
                case game_config_interface_1.EqualRule.LOSS:
                    return { result: game_config_interface_1.MoveResult.LOSS, isCorrect: false };
                case game_config_interface_1.EqualRule.REDRAW:
                    return { result: game_config_interface_1.MoveResult.REDRAW, isCorrect: null };
            }
        }
        const actualDirection = nextRank > currentRank ? game_config_interface_1.PredictionType.HIGHER : game_config_interface_1.PredictionType.LOWER;
        const isCorrect = actualDirection === prediction;
        return { result: isCorrect ? game_config_interface_1.MoveResult.WIN : game_config_interface_1.MoveResult.LOSS, isCorrect };
    }
};
exports.CardComparatorService = CardComparatorService;
exports.CardComparatorService = CardComparatorService = __decorate([
    (0, common_1.Injectable)()
], CardComparatorService);
