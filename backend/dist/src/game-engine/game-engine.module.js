"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameEngineModule = void 0;
const common_1 = require("@nestjs/common");
const deck_service_1 = require("./services/deck.service");
const provably_fair_service_1 = require("./services/provably-fair.service");
const multiplier_service_1 = require("./services/multiplier.service");
const card_comparator_service_1 = require("./services/card-comparator.service");
const game_engine_service_1 = require("./services/game-engine.service");
/**
 * Phase 1 module: pure game-engine domain logic, no persistence.
 * The upcoming persistence phase will add a GameRepository (Prisma-backed)
 * and a GameController/GameApiService that load/save GameState and wrap
 * each state mutation in a DB transaction alongside the matching wallet
 * debit/credit — this module stays framework-agnostic on purpose.
 */
let GameEngineModule = class GameEngineModule {
};
exports.GameEngineModule = GameEngineModule;
exports.GameEngineModule = GameEngineModule = __decorate([
    (0, common_1.Module)({
        providers: [deck_service_1.DeckService, provably_fair_service_1.ProvablyFairService, multiplier_service_1.MultiplierService, card_comparator_service_1.CardComparatorService, game_engine_service_1.GameEngineService],
        exports: [deck_service_1.DeckService, provably_fair_service_1.ProvablyFairService, multiplier_service_1.MultiplierService, card_comparator_service_1.CardComparatorService, game_engine_service_1.GameEngineService],
    })
], GameEngineModule);
