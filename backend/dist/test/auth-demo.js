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
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const crypto = __importStar(require("crypto"));
const telegram_verification_service_1 = require("../src/auth/services/telegram-verification.service");
const token_service_1 = require("../src/auth/services/token.service");
const auth_service_1 = require("../src/auth/services/auth.service");
const in_memory_auth_repository_1 = require("../src/auth/repositories/in-memory-auth.repository");
const roles_guard_1 = require("../src/auth/guards/roles.guard");
const auth_types_1 = require("../src/auth/interfaces/auth-types");
const auth_exceptions_1 = require("../src/auth/exceptions/auth.exceptions");
function line() {
    console.log('-'.repeat(72));
}
/** Builds a genuine Telegram-style initData string, signed exactly the way Telegram itself signs it — used here to test our OWN verification logic, not to fake real Telegram data. */
function buildSignedInitData(botToken, fields) {
    const dataCheckString = Object.entries(fields)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    const params = new URLSearchParams({ ...fields, hash });
    return params.toString();
}
// Fake reflector satisfying just the surface RolesGuard actually calls, so we
// can unit-test RolesGuard without booting a full Nest application.
class FakeReflector {
    constructor(metadata) {
        this.metadata = metadata;
    }
    getAllAndOverride(key) {
        return this.metadata[key];
    }
}
function fakeContext(user) {
    return {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => ({}),
        getClass: () => ({}),
    };
}
async function main() {
    const BOT_TOKEN = 'fake-bot-token-for-testing-only';
    line();
    console.log('1) TELEGRAM initData VERIFICATION');
    line();
    const verification = new telegram_verification_service_1.TelegramVerificationService(BOT_TOKEN, 86400);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const validInitData = buildSignedInitData(BOT_TOKEN, {
        auth_date: String(nowSeconds),
        query_id: 'AAH12345',
        user: JSON.stringify({ id: 987654321, first_name: 'Ada', username: 'ada_lovelace' }),
    });
    const verified = verification.verify(validInitData);
    console.log(`Valid initData verified. Telegram user id: ${verified.user.id}, username: ${verified.user.username}`);
    try {
        const tampered = validInitData.replace('Ada', 'Eve');
        verification.verify(tampered);
        console.log('ERROR: tampered initData should have failed verification!');
    }
    catch (err) {
        console.log(`Tampered initData correctly rejected: ${err.message}`);
    }
    try {
        const staleInitData = buildSignedInitData(BOT_TOKEN, {
            auth_date: String(nowSeconds - 100000), // way older than the 86400s max age
            user: JSON.stringify({ id: 1, first_name: 'Old' }),
        });
        verification.verify(staleInitData);
        console.log('ERROR: stale initData should have failed!');
    }
    catch (err) {
        console.log(`Stale (replayed) initData correctly rejected: ${err.message}`);
    }
    line();
    console.log('2) LOGIN (find-or-create user + issue token pair)');
    line();
    const repo = new in_memory_auth_repository_1.InMemoryAuthRepository();
    const tokenService = new token_service_1.TokenService('access-secret', 'refresh-secret', 900, 2592000);
    const authService = new auth_service_1.AuthService(repo, tokenService, verification);
    const login1 = await authService.telegramLogin(validInitData);
    console.log(`User created: id=${login1.user.id}, role=${login1.user.role}`);
    console.log(`Access token (truncated): ${login1.tokens.accessToken.slice(0, 40)}...`);
    const loginAgain = await authService.telegramLogin(validInitData);
    console.log(`Second login with same Telegram identity reuses the SAME user id: ${loginAgain.user.id === login1.user.id}`);
    line();
    console.log('3) ACCESS TOKEN VERIFICATION');
    line();
    const accessPayload = tokenService.verifyAccessToken(login1.tokens.accessToken);
    console.log(`Access token verified. sub=${accessPayload.sub}, role=${accessPayload.role}`);
    try {
        tokenService.verifyAccessToken(login1.tokens.accessToken.slice(0, -2) + 'xx');
        console.log('ERROR: tampered access token should have failed!');
    }
    catch (err) {
        console.log(`Tampered access token correctly rejected: ${err.message}`);
    }
    line();
    console.log('4) REFRESH TOKEN ROTATION');
    line();
    const refreshed = await authService.refresh(login1.tokens.refreshToken);
    // Note: access tokens carry no jti, so two issued within the same second
    // with identical claims are byte-identical — that's fine, since only
    // refresh tokens need per-issuance uniqueness (they're single-use and
    // looked up by hash). What matters is the refresh token itself rotates.
    console.log(`New refresh token differs from old: ${refreshed.tokens.refreshToken !== login1.tokens.refreshToken}`);
    line();
    console.log('5) REFRESH TOKEN REUSE DETECTION (simulated theft)');
    line();
    try {
        // The ORIGINAL refresh token was already rotated away in step 4 — using it again simulates a stolen, replayed token.
        await authService.refresh(login1.tokens.refreshToken);
        console.log('ERROR: reused refresh token should have been rejected!');
    }
    catch (err) {
        console.log(`Reuse correctly detected: ${err instanceof auth_exceptions_1.RefreshTokenReuseDetectedException} (${err.message})`);
    }
    try {
        // Because reuse revokes the WHOLE family, even the legitimately-rotated token from step 4 should now be dead.
        await authService.refresh(refreshed.tokens.refreshToken);
        console.log('ERROR: token from a revoked family should have been rejected!');
    }
    catch (err) {
        console.log(`Entire family correctly revoked after theft signal: ${err.message}`);
    }
    line();
    console.log('6) LOGOUT revokes the family going forward');
    line();
    const freshLogin = await authService.telegramLogin(validInitData);
    await authService.logout(freshLogin.tokens.refreshToken);
    try {
        await authService.refresh(freshLogin.tokens.refreshToken);
        console.log('ERROR: refresh after logout should have failed!');
    }
    catch (err) {
        console.log(`Refresh after logout correctly rejected: ${err.message}`);
    }
    line();
    console.log('7) BANNED USER IS REJECTED AT LOGIN');
    line();
    repo._setUserBanned(login1.user.id, true);
    try {
        await authService.telegramLogin(validInitData);
        console.log('ERROR: banned user should not be able to log in!');
    }
    catch (err) {
        console.log(`Banned user correctly rejected: ${err instanceof auth_exceptions_1.UserBannedException} (${err.message})`);
    }
    repo._setUserBanned(login1.user.id, false);
    line();
    console.log('8) ROLE-BASED AUTHORIZATION (RolesGuard)');
    line();
    const adminOnlyGuard = new roles_guard_1.RolesGuard(new FakeReflector({ roles: [auth_types_1.Role.ADMIN] }));
    const openGuard = new roles_guard_1.RolesGuard(new FakeReflector({}));
    console.log(`PLAYER hitting an ADMIN-only route is rejected: ${safeGuardCheck(adminOnlyGuard, { role: auth_types_1.Role.PLAYER })}`);
    console.log(`ADMIN hitting an ADMIN-only route is allowed:   ${safeGuardCheck(adminOnlyGuard, { role: auth_types_1.Role.ADMIN })}`);
    console.log(`SUPER_ADMIN hitting an ADMIN-only route is allowed (implicit): ${safeGuardCheck(adminOnlyGuard, { role: auth_types_1.Role.SUPER_ADMIN })}`);
    console.log(`PLAYER hitting a route with no @Roles() is allowed: ${safeGuardCheck(openGuard, { role: auth_types_1.Role.PLAYER })}`);
}
function safeGuardCheck(guard, user) {
    try {
        return guard.canActivate(fakeContext(user)) ? 'ALLOWED' : 'DENIED';
    }
    catch {
        return 'DENIED';
    }
}
main().catch((err) => {
    console.error('DEMO FAILED:', err);
    process.exit(1);
});
