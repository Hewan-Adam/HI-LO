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
exports.AdminTransactionsController = void 0;
const common_1 = require("@nestjs/common");
const admin_transactions_service_1 = require("../services/admin-transactions.service");
const auth_decorators_1 = require("../../auth/decorators/auth.decorators");
const auth_types_1 = require("../../auth/interfaces/auth-types");
const wallet_types_1 = require("../../wallet/interfaces/wallet-types");
let AdminTransactionsController = class AdminTransactionsController {
    constructor(adminTransactionsService) {
        this.adminTransactionsService = adminTransactionsService;
    }
    async search(userId, type, status, limit, offset) {
        return this.adminTransactionsService.search({
            userId,
            type,
            status,
            limit: limit ? Number(limit) : undefined,
            offset: offset ? Number(offset) : undefined,
        });
    }
};
exports.AdminTransactionsController = AdminTransactionsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('userId')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminTransactionsController.prototype, "search", null);
exports.AdminTransactionsController = AdminTransactionsController = __decorate([
    (0, common_1.Controller)('admin/transactions'),
    (0, auth_decorators_1.Roles)(auth_types_1.Role.ADMIN),
    __metadata("design:paramtypes", [admin_transactions_service_1.AdminTransactionsService])
], AdminTransactionsController);
