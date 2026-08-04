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
exports.MultiplierService = void 0;
exports.assertMonotonicMultiplierTable = assertMonotonicMultiplierTable;
const common_1 = require("@nestjs/common");
const multiplier_table_constant_1 = require("../constants/multiplier-table.constant");
/**
 * Exported standalone so callers outside the game engine (namely
 * AdminSettingsService, validating an admin-edited table before it's ever
 * persisted or handed to MultiplierService) can enforce the exact same rule
 * without duplicating it.
 */
function assertMonotonicMultiplierTable(table) {
    const sorted = [...table].sort((a, b) => a.streak - b.streak);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].multiplier <= sorted[i - 1].multiplier) {
            throw new Error(`Invalid multiplier table: multiplier at streak ${sorted[i].streak} must exceed the multiplier at streak ${sorted[i - 1].streak}`);
        }
    }
}
let MultiplierService = class MultiplierService {
    constructor() {
        this.table = [...multiplier_table_constant_1.DEFAULT_MULTIPLIER_TABLE];
        assertMonotonicMultiplierTable(this.table);
    }
    setTable(table) {
        assertMonotonicMultiplierTable(table);
        this.table = [...table].sort((a, b) => a.streak - b.streak);
    }
    getTable() {
        return [...this.table];
    }
    /**
     * Returns the payout multiplier for a given correct-guess streak.
     * - streak 0 (no correct guesses yet) -> 1x (the original bet)
     * - streak within the configured table -> exact configured value
     * - streak beyond the configured table -> extrapolated using the growth
     *   ratio between the last two configured entries, so long streaks
     *   (up to maxStreak = 51) still resolve to a sensible, ever-increasing
     *   multiplier instead of throwing or flatlining.
     */
    getMultiplier(streak) {
        if (streak <= 0)
            return 1;
        const exact = this.table.find((entry) => entry.streak === streak);
        if (exact) {
            return exact.multiplier;
        }
        const last = this.table[this.table.length - 1];
        if (streak < last.streak) {
            // Between two configured points that aren't consecutive integers.
            const lower = [...this.table].reverse().find((e) => e.streak < streak);
            const upper = this.table.find((e) => e.streak > streak);
            if (lower && upper) {
                const ratio = (streak - lower.streak) / (upper.streak - lower.streak);
                return Number((lower.multiplier +
                    ratio * (upper.multiplier - lower.multiplier)).toFixed(4));
            }
        }
        const secondLast = this.table[this.table.length - 2] ?? {
            streak: 0,
            multiplier: 1,
        };
        const growthRatio = last.multiplier / secondLast.multiplier;
        const stepsBeyond = streak - last.streak;
        return Number((last.multiplier * Math.pow(growthRatio, stepsBeyond)).toFixed(4));
    }
    calculatePotentialPayout(betAmount, streak) {
        return Number((betAmount * this.getMultiplier(streak)).toFixed(8));
    }
};
exports.MultiplierService = MultiplierService;
exports.MultiplierService = MultiplierService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MultiplierService);
