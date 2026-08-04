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
exports.AdminSettingsGameRulesProvider = exports.DefaultGameRulesProvider = exports.GAME_RULES_PROVIDER = void 0;
const common_1 = require("@nestjs/common");
const game_config_interface_1 = require("../../game-engine/interfaces/game-config.interface");
const multiplier_table_constant_1 = require("../../game-engine/constants/multiplier-table.constant");
const admin_settings_service_1 = require("../../admin-settings/services/admin-settings.service");
exports.GAME_RULES_PROVIDER = Symbol('GAME_RULES_PROVIDER');
/**
 * Phase 4 default: returns the spec's static defaults. Kept around (and
 * still used by the demo scripts and any test that doesn't care about admin
 * configurability) even now that AdminSettingsGameRulesProvider exists.
 */
let DefaultGameRulesProvider = class DefaultGameRulesProvider {
    async getAceMode() {
        return game_config_interface_1.AceMode[multiplier_table_constant_1.DEFAULT_ACE_MODE];
    }
    async getEqualRule() {
        return game_config_interface_1.EqualRule[multiplier_table_constant_1.DEFAULT_EQUAL_RULE];
    }
    async getMultiplierTable() {
        return [...multiplier_table_constant_1.DEFAULT_MULTIPLIER_TABLE];
    }
};
exports.DefaultGameRulesProvider = DefaultGameRulesProvider;
exports.DefaultGameRulesProvider = DefaultGameRulesProvider = __decorate([
    (0, common_1.Injectable)()
], DefaultGameRulesProvider);
/**
 * Phase 5 (admin dashboard) real implementation: reads the same three
 * values live from `AdminSettings` via `AdminSettingsService`, falling back
 * to the spec's defaults until an admin has set them for the first time.
 * `GameApiService` needed zero changes to start using this — it only ever
 * depended on the `GameRulesProvider` interface, which is exactly the point
 * of having it.
 */
let AdminSettingsGameRulesProvider = class AdminSettingsGameRulesProvider {
    constructor(adminSettings) {
        this.adminSettings = adminSettings;
    }
    async getAceMode() {
        return this.adminSettings.getAceMode();
    }
    async getEqualRule() {
        return this.adminSettings.getEqualRule();
    }
    async getMultiplierTable() {
        return this.adminSettings.getMultiplierTable();
    }
};
exports.AdminSettingsGameRulesProvider = AdminSettingsGameRulesProvider;
exports.AdminSettingsGameRulesProvider = AdminSettingsGameRulesProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [admin_settings_service_1.AdminSettingsService])
], AdminSettingsGameRulesProvider);
