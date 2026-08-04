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
exports.CashoutDto = exports.SubmitGuessDto = exports.StartGameDto = void 0;
const class_validator_1 = require("class-validator");
const game_config_interface_1 = require("../../game-engine/interfaces/game-config.interface");
class StartGameDto {
}
exports.StartGameDto = StartGameDto;
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 8 }),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], StartGameDto.prototype, "betAmount", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], StartGameDto.prototype, "clientSeed", void 0);
class SubmitGuessDto {
}
exports.SubmitGuessDto = SubmitGuessDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], SubmitGuessDto.prototype, "gameId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(game_config_interface_1.PredictionType),
    __metadata("design:type", String)
], SubmitGuessDto.prototype, "prediction", void 0);
class CashoutDto {
}
exports.CashoutDto = CashoutDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CashoutDto.prototype, "gameId", void 0);
