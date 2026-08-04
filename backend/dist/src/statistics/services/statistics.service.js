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
exports.StatisticsService = void 0;
const common_1 = require("@nestjs/common");
const statistics_repository_interface_1 = require("../interfaces/statistics-repository.interface");
let StatisticsService = class StatisticsService {
    constructor(repository) {
        this.repository = repository;
    }
    async recordGameResult(userId, result) {
        return this.repository.recordGameResult(userId, result);
    }
    async getStatistics(userId) {
        const stats = await this.repository.getStatistics(userId);
        return (stats ?? {
            userId,
            totalGamesPlayed: 0,
            totalWins: 0,
            totalLosses: 0,
            totalWagered: 0,
            totalWon: 0,
            bestMultiplier: 0,
            longestStreak: 0,
        });
    }
};
exports.StatisticsService = StatisticsService;
exports.StatisticsService = StatisticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(statistics_repository_interface_1.STATISTICS_REPOSITORY)),
    __metadata("design:paramtypes", [Object])
], StatisticsService);
