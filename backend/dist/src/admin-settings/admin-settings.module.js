"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminSettingsModule = void 0;
const common_1 = require("@nestjs/common");
const admin_settings_service_1 = require("./services/admin-settings.service");
const prisma_admin_settings_repository_1 = require("./repositories/prisma-admin-settings.repository");
const admin_settings_repository_interface_1 = require("./interfaces/admin-settings-repository.interface");
let AdminSettingsModule = class AdminSettingsModule {
};
exports.AdminSettingsModule = AdminSettingsModule;
exports.AdminSettingsModule = AdminSettingsModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: admin_settings_service_1.AdminSettingsService,
                useFactory: (repo) => new admin_settings_service_1.AdminSettingsService(repo),
                inject: [admin_settings_repository_interface_1.ADMIN_SETTINGS_REPOSITORY],
            },
            { provide: admin_settings_repository_interface_1.ADMIN_SETTINGS_REPOSITORY, useClass: prisma_admin_settings_repository_1.PrismaAdminSettingsRepository },
        ],
        exports: [admin_settings_service_1.AdminSettingsService],
    })
], AdminSettingsModule);
