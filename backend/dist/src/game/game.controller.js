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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const game_api_service_1 = require("./services/game-api.service");
const game_dto_1 = require("./dto/game.dto");
const auth_decorators_1 = require("../auth/decorators/auth.decorators");
// No legitimate human plays faster than this — a tighter limit than the
// app-wide default doubles as a cheap first line of defense against a
// scripted client hammering the game loop, on top of being plain anti-spam.
const GAMEPLAY_THROTTLE = { default: { limit: 30, ttl: 60_000 } };
let GameController = class GameController {
    constructor(gameApiService) {
        this.gameApiService = gameApiService;
    }
    async start(user, dto) {
        return this.gameApiService.startGame(user.sub, dto.betAmount, dto.clientSeed);
    }
    async guess(user, dto) {
        return this.gameApiService.submitGuess(user.sub, dto.gameId, dto.prediction);
    }
    async cashout(user, dto) {
        return this.gameApiService.cashout(user.sub, dto.gameId);
    }
    async history(user, limit, offset) {
        return this.gameApiService.getHistory(user.sub, limit ? Number(limit) : undefined, offset ? Number(offset) : undefined);
    }
    async fairness(user, gameId) {
        return this.gameApiService.getFairnessProof(user.sub, gameId);
    }
};
exports.GameController = GameController;
__decorate([
    (0, throttler_1.Throttle)(GAMEPLAY_THROTTLE),
    (0, common_1.Post)('start'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, game_dto_1.StartGameDto]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "start", null);
__decorate([
    (0, throttler_1.Throttle)(GAMEPLAY_THROTTLE),
    (0, common_1.Post)('guess'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, game_dto_1.SubmitGuessDto]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "guess", null);
__decorate([
    (0, throttler_1.Throttle)(GAMEPLAY_THROTTLE),
    (0, common_1.Post)('cashout'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, game_dto_1.CashoutDto]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "cashout", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "history", null);
__decorate([
    (0, common_1.Get)(':gameId/fairness'),
    __param(0, (0, auth_decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "fairness", null);
exports.GameController = GameController = __decorate([
    (0, common_1.Controller)('game'),
    __metadata("design:paramtypes", [game_api_service_1.GameApiService])
], GameController);
