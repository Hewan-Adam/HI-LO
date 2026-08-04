"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./services/auth.service");
const token_service_1 = require("./services/token.service");
const telegram_verification_service_1 = require("./services/telegram-verification.service");
const prisma_auth_repository_1 = require("./repositories/prisma-auth.repository");
const auth_repository_interface_1 = require("./interfaces/auth-repository.interface");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const roles_guard_1 = require("./guards/roles.guard");
const auth_config_interface_1 = require("./interfaces/auth-config.interface");
const AUTH_CONFIG = (0, auth_config_interface_1.loadAuthConfig)();
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            {
                provide: token_service_1.TokenService,
                useFactory: () => new token_service_1.TokenService(AUTH_CONFIG.accessTokenSecret, AUTH_CONFIG.refreshTokenSecret, AUTH_CONFIG.accessTokenTtlSeconds, AUTH_CONFIG.refreshTokenTtlSeconds),
            },
            {
                provide: telegram_verification_service_1.TelegramVerificationService,
                useFactory: () => new telegram_verification_service_1.TelegramVerificationService(AUTH_CONFIG.telegramBotToken, AUTH_CONFIG.telegramAuthMaxAgeSeconds),
            },
            { provide: auth_repository_interface_1.AUTH_REPOSITORY, useClass: prisma_auth_repository_1.PrismaAuthRepository },
            // JwtAuthGuard and RolesGuard are provided here (so their constructor
            // deps — TokenService, Reflector — resolve from this module's scope)
            // but deliberately NOT registered as APP_GUARD here. Global guard
            // execution order across multiple APP_GUARD registrations spread
            // across different modules follows Nest's module-resolution order,
            // which is hard to reason about precisely — and here the order
            // actually matters: UserOrIpThrottlerGuard needs to run AFTER
            // JwtAuthGuard (so req.user is populated) and the app needs
            // JwtAuthGuard to run before RolesGuard regardless. Rather than split
            // three interdependent guards across two modules and hope Nest
            // resolves them in the right order, AppModule registers all three as
            // APP_GUARD itself, in one explicit array, in the exact order intended.
            jwt_auth_guard_1.JwtAuthGuard,
            roles_guard_1.RolesGuard,
            core_1.Reflector,
        ],
        exports: [auth_service_1.AuthService, token_service_1.TokenService, jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard],
    })
], AuthModule);
