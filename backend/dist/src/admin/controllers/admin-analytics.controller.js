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
exports.AdminAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const admin_analytics_service_1 = require("../services/admin-analytics.service");
const auth_decorators_1 = require("../../auth/decorators/auth.decorators");
const auth_types_1 = require("../../auth/interfaces/auth-types");
let AdminAnalyticsController = class AdminAnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async summary(start, end) {
        const rangeEnd = end ? new Date(end) : new Date();
        const rangeStart = start ? new Date(start) : new Date(rangeEnd.getTime() - 24 * 60 * 60 * 1000); // default: last 24h
        return this.analyticsService.getSummary(rangeStart, rangeEnd);
    }
};
exports.AdminAnalyticsController = AdminAnalyticsController;
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Query)('start')),
    __param(1, (0, common_1.Query)('end')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminAnalyticsController.prototype, "summary", null);
exports.AdminAnalyticsController = AdminAnalyticsController = __decorate([
    (0, common_1.Controller)('admin/analytics'),
    (0, auth_decorators_1.Roles)(auth_types_1.Role.ADMIN),
    __metadata("design:paramtypes", [admin_analytics_service_1.AdminAnalyticsService])
], AdminAnalyticsController);
