"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardModule = void 0;
const common_1 = require("@nestjs/common");
const leaderboard_controller_1 = require("./leaderboard.controller");
const leaderboard_service_1 = require("./services/leaderboard.service");
const prisma_leaderboard_repository_1 = require("./repositories/prisma-leaderboard.repository");
const leaderboard_repository_interface_1 = require("./interfaces/leaderboard-repository.interface");
let LeaderboardModule = class LeaderboardModule {
};
exports.LeaderboardModule = LeaderboardModule;
exports.LeaderboardModule = LeaderboardModule = __decorate([
    (0, common_1.Module)({
        controllers: [leaderboard_controller_1.LeaderboardController],
        providers: [leaderboard_service_1.LeaderboardService, { provide: leaderboard_repository_interface_1.LEADERBOARD_REPOSITORY, useClass: prisma_leaderboard_repository_1.PrismaLeaderboardRepository }],
        exports: [leaderboard_service_1.LeaderboardService],
    })
], LeaderboardModule);
