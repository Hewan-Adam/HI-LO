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
exports.AdminSettingsService = exports.ADMIN_SETTINGS_KEYS = void 0;
const common_1 = require("@nestjs/common");
const game_config_interface_1 = require("../../game-engine/interfaces/game-config.interface");
const multiplier_table_constant_1 = require("../../game-engine/constants/multiplier-table.constant");
const multiplier_service_1 = require("../../game-engine/services/multiplier.service");
/** The known, documented AdminSettings key namespace. Anything not listed here is a bug, not a feature — this is deliberately not "anything goes." */
exports.ADMIN_SETTINGS_KEYS = {
    ACE_MODE: 'game.aceMode',
    EQUAL_RULE: 'game.equalRule',
    MULTIPLIER_TABLE: 'game.multiplierTable',
    /** Informational target for the analytics dashboard — the multiplier table is what actually determines real RTP; this is what the admin *intends* it to approximate. */
    TARGET_RTP_PERCENT: 'game.targetRtpPercent',
};
let AdminSettingsService = class AdminSettingsService {
    constructor(repository) {
        this.repository = repository;
    }
    async getAceMode() {
        const record = await this.repository.get(exports.ADMIN_SETTINGS_KEYS.ACE_MODE);
        return record?.value ?? game_config_interface_1.AceMode[multiplier_table_constant_1.DEFAULT_ACE_MODE];
    }
    async setAceMode(value, updatedBy) {
        await this.repository.set(exports.ADMIN_SETTINGS_KEYS.ACE_MODE, value, updatedBy, 'Whether Ace is treated as high (14) or low (1) for card comparisons.');
    }
    async getEqualRule() {
        const record = await this.repository.get(exports.ADMIN_SETTINGS_KEYS.EQUAL_RULE);
        return record?.value ?? game_config_interface_1.EqualRule[multiplier_table_constant_1.DEFAULT_EQUAL_RULE];
    }
    async setEqualRule(value, updatedBy) {
        await this.repository.set(exports.ADMIN_SETTINGS_KEYS.EQUAL_RULE, value, updatedBy, 'What happens when the current and next card have equal rank: PUSH, LOSS, or REDRAW.');
    }
    async getMultiplierTable() {
        const record = await this.repository.get(exports.ADMIN_SETTINGS_KEYS.MULTIPLIER_TABLE);
        return record?.value ?? [...multiplier_table_constant_1.DEFAULT_MULTIPLIER_TABLE];
    }
    async setMultiplierTable(table, updatedBy) {
        // Fail loudly before persisting a table that would break MultiplierService at game-start time —
        // an admin typo here should reject immediately, not surface as a broken game an hour later.
        try {
            (0, multiplier_service_1.assertMonotonicMultiplierTable)(table);
        }
        catch (err) {
            // assertMonotonicMultiplierTable is framework-agnostic (game-engine
            // has no @nestjs/common dependency by design — see phase 1) and
            // throws a plain Error; this is the boundary where that gets
            // translated into a proper HTTP 400 instead of an unhandled 500.
            throw new common_1.BadRequestException(err instanceof Error ? err.message : 'Invalid multiplier table');
        }
        await this.repository.set(exports.ADMIN_SETTINGS_KEYS.MULTIPLIER_TABLE, table, updatedBy, 'Payout multiplier per correct-guess streak. Must be strictly increasing.');
    }
    async getTargetRtpPercent() {
        const record = await this.repository.get(exports.ADMIN_SETTINGS_KEYS.TARGET_RTP_PERCENT);
        return record?.value ?? null;
    }
    async setTargetRtpPercent(value, updatedBy) {
        if (value <= 0 || value > 100) {
            throw new common_1.BadRequestException('Target RTP percent must be between 0 and 100');
        }
        await this.repository.set(exports.ADMIN_SETTINGS_KEYS.TARGET_RTP_PERCENT, value, updatedBy, 'Informational target return-to-player percentage the multiplier table is intended to approximate — not enforced automatically.');
    }
    async getAll() {
        return this.repository.getAll();
    }
};
exports.AdminSettingsService = AdminSettingsService;
exports.AdminSettingsService = AdminSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], AdminSettingsService);
