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
exports.GameSweepScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const game_api_service_1 = require("./game-api.service");
let GameSweepScheduler = class GameSweepScheduler {
    constructor(gameApiService) {
        this.gameApiService = gameApiService;
        this.logger = new common_1.Logger('GameSweepScheduler');
    }
    async handleSweep() {
        try {
            const { swept, skipped } = await this.gameApiService.sweepAbandonedGames();
            if (swept > 0 || skipped > 0) {
                this.logger.log(`Sweep complete: ${swept} game(s) refunded and marked ABANDONED, ${skipped} false-positive candidate(s) skipped (still live).`);
            }
        }
        catch (err) {
            // A failed sweep should never crash the process — it just means
            // those stale games get picked up on the next run (or the next time
            // a player happens to act on one, which still works reactively).
            this.logger.error('Sweep run failed', err instanceof Error ? err.stack : String(err));
        }
    }
};
exports.GameSweepScheduler = GameSweepScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GameSweepScheduler.prototype, "handleSweep", null);
exports.GameSweepScheduler = GameSweepScheduler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_api_service_1.GameApiService])
], GameSweepScheduler);
