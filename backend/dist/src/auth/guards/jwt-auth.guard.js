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
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const token_service_1 = require("../services/token.service");
const auth_decorators_1 = require("../decorators/auth.decorators");
let JwtAuthGuard = class JwtAuthGuard {
    constructor(tokenService, reflector) {
        this.tokenService = tokenService;
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(auth_decorators_1.IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers?.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Missing or malformed Authorization header');
        }
        const token = authHeader.slice('Bearer '.length);
        const payload = this.tokenService.verifyAccessToken(token); // throws UnauthorizedException on failure
        request.user = payload;
        return true;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [token_service_1.TokenService,
        core_1.Reflector])
], JwtAuthGuard);
