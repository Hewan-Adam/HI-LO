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
exports.UpdateTargetRtpDto = exports.UpdateMultiplierTableDto = exports.MultiplierTableEntryDto = exports.UpdateEqualRuleDto = exports.UpdateAceModeDto = exports.BanUserDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const game_config_interface_1 = require("../../game-engine/interfaces/game-config.interface");
class BanUserDto {
}
exports.BanUserDto = BanUserDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], BanUserDto.prototype, "reason", void 0);
class UpdateAceModeDto {
}
exports.UpdateAceModeDto = UpdateAceModeDto;
__decorate([
    (0, class_validator_1.IsEnum)(game_config_interface_1.AceMode),
    __metadata("design:type", String)
], UpdateAceModeDto.prototype, "aceMode", void 0);
class UpdateEqualRuleDto {
}
exports.UpdateEqualRuleDto = UpdateEqualRuleDto;
__decorate([
    (0, class_validator_1.IsEnum)(game_config_interface_1.EqualRule),
    __metadata("design:type", String)
], UpdateEqualRuleDto.prototype, "equalRule", void 0);
class MultiplierTableEntryDto {
}
exports.MultiplierTableEntryDto = MultiplierTableEntryDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], MultiplierTableEntryDto.prototype, "streak", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], MultiplierTableEntryDto.prototype, "multiplier", void 0);
class UpdateMultiplierTableDto {
}
exports.UpdateMultiplierTableDto = UpdateMultiplierTableDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MultiplierTableEntryDto),
    __metadata("design:type", Array)
], UpdateMultiplierTableDto.prototype, "table", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsPositive)(),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateMultiplierTableDto.prototype, "percent", void 0);
class UpdateTargetRtpDto {
}
exports.UpdateTargetRtpDto = UpdateTargetRtpDto;
