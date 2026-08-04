"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const token_service_1 = require("./token.service");
const telegram_verification_service_1 = require("./telegram-verification.service");
const auth_repository_interface_1 = require("../interfaces/auth-repository.interface");
const auth_exceptions_1 = require("../exceptions/auth.exceptions");
/**
 * Orchestrates the full auth lifecycle:
 *
 *   telegramLogin  -> verify initData, find-or-create the user, issue a
 *                     brand-new token family.
 *   refresh        -> verify + look up the presented refresh token, detect
 *                     reuse of an already-rotated token (theft signal), and
 *                     if clean, rotate it: revoke the old one, issue a new
 *                     access+refresh pair in the same family.
 *   logout         -> revoke the presented token's entire family, so a
 *                     stolen-but-not-yet-used token also stops working.
 *
 * Refresh token rotation detail: every refresh token is single-use. Using
 * one successfully invalidates it and returns a new one. If a token is
 * presented that the DB shows as already `revoked` (i.e. it was already
 * rotated away or explicitly logged out), that's treated as a strong signal
 * the token leaked, so the entire family is revoked — forcing re-login on
 * every device sharing that family, not just silently rejecting the one
 * request.
 */
let AuthService = class AuthService {
    constructor(repository, tokenService, telegramVerification) {
        this.repository = repository;
        this.tokenService = tokenService;
        this.telegramVerification = telegramVerification;
    }
    async telegramLogin(initData) {
        const { user: tgUser } = this.telegramVerification.verify(initData);
        const telegramId = String(tgUser.id);
        let user = await this.repository.findUserByTelegramId(telegramId);
        if (!user) {
            user = await this.repository.createUser({
                telegramId,
                username: tgUser.username,
                firstName: tgUser.first_name,
                lastName: tgUser.last_name,
            });
        }
        if (user.isBanned) {
            throw new auth_exceptions_1.UserBannedException();
        }
        const familyId = crypto.randomUUID();
        const tokens = await this.issueTokenPair(user, familyId);
        return { user, tokens };
    }
    async refresh(presentedRefreshToken) {
        const payload = this.tokenService.verifyRefreshToken(presentedRefreshToken); // throws if malformed/expired/bad signature
        const tokenHash = this.tokenService.hashToken(presentedRefreshToken);
        const stored = await this.repository.findRefreshTokenByHash(tokenHash);
        if (!stored) {
            throw new auth_exceptions_1.InvalidRefreshTokenException();
        }
        if (stored.revoked) {
            // Reuse of an already-rotated (or already-logged-out) token: treat as compromise.
            await this.repository.revokeFamily(stored.familyId);
            throw new auth_exceptions_1.RefreshTokenReuseDetectedException();
        }
        if (stored.expiresAt.getTime() < Date.now()) {
            throw new auth_exceptions_1.InvalidRefreshTokenException();
        }
        const user = await this.repository.findUserById(payload.sub);
        if (!user) {
            throw new auth_exceptions_1.InvalidRefreshTokenException();
        }
        if (user.isBanned) {
            throw new auth_exceptions_1.UserBannedException();
        }
        // Rotate: the presented token is now spent, a new one takes its place in the same family.
        const tokens = await this.issueTokenPair(user, stored.familyId);
        const newRefreshHash = this.tokenService.hashToken(tokens.refreshToken);
        await this.repository.markRotated(tokenHash, newRefreshHash);
        return { user, tokens };
    }
    async logout(presentedRefreshToken) {
        const payload = this.tokenService.verifyRefreshToken(presentedRefreshToken);
        void payload; // signature/expiry check is enough here; we revoke by family regardless of per-token state
        const tokenHash = this.tokenService.hashToken(presentedRefreshToken);
        const stored = await this.repository.findRefreshTokenByHash(tokenHash);
        if (stored) {
            await this.repository.revokeFamily(stored.familyId);
        }
    }
    async issueTokenPair(user, familyId) {
        const access = this.tokenService.issueAccessToken(user.id, user.role, user.telegramId);
        const refresh = this.tokenService.issueRefreshToken(user.id, familyId);
        await this.repository.storeRefreshToken({
            userId: user.id,
            tokenHash: this.tokenService.hashToken(refresh.token),
            familyId,
            expiresAt: refresh.expiresAt,
        });
        return {
            accessToken: access.token,
            refreshToken: refresh.token,
            accessTokenExpiresAt: access.expiresAt,
            refreshTokenExpiresAt: refresh.expiresAt,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(auth_repository_interface_1.AUTH_REPOSITORY)),
    __metadata("design:paramtypes", [Object, token_service_1.TokenService,
        telegram_verification_service_1.TelegramVerificationService])
], AuthService);
