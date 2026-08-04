"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_settings_module_1 = require("../admin-settings/admin-settings.module");
const audit_log_module_1 = require("../audit-log/audit-log.module");
const wallet_module_1 = require("../wallet/wallet.module");
const game_module_1 = require("../game/game.module");
const admin_users_controller_1 = require("./controllers/admin-users.controller");
const admin_game_settings_controller_1 = require("./controllers/admin-game-settings.controller");
const admin_analytics_controller_1 = require("./controllers/admin-analytics.controller");
const admin_transactions_controller_1 = require("./controllers/admin-transactions.controller");
const admin_audit_log_controller_1 = require("./controllers/admin-audit-log.controller");
const admin_users_service_1 = require("./services/admin-users.service");
const admin_analytics_service_1 = require("./services/admin-analytics.service");
const admin_transactions_service_1 = require("./services/admin-transactions.service");
const admin_user_repository_interface_1 = require("./interfaces/admin-user-repository.interface");
const prisma_admin_user_repository_1 = require("./repositories/prisma-admin-user.repository");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [admin_settings_module_1.AdminSettingsModule, audit_log_module_1.AuditLogModule, wallet_module_1.WalletModule, game_module_1.GameModule],
        controllers: [admin_users_controller_1.AdminUsersController, admin_game_settings_controller_1.AdminGameSettingsController, admin_analytics_controller_1.AdminAnalyticsController, admin_transactions_controller_1.AdminTransactionsController, admin_audit_log_controller_1.AdminAuditLogController],
        providers: [
            admin_users_service_1.AdminUsersService,
            admin_analytics_service_1.AdminAnalyticsService,
            admin_transactions_service_1.AdminTransactionsService,
            { provide: admin_user_repository_interface_1.ADMIN_USER_REPOSITORY, useClass: prisma_admin_user_repository_1.PrismaAdminUserRepository },
        ],
    })
], AdminModule);
