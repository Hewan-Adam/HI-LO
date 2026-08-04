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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramVerificationService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
/**
 * Verifies the `initData` string a Telegram Mini App receives from
 * `window.Telegram.WebApp.initData`, per Telegram's documented algorithm:
 *
 *   1. Parse initData as a query string; extract and remove the `hash` field.
 *   2. Build a "data check string": every remaining key=value pair, sorted
 *      alphabetically by key, joined with `\n`.
 *   3. Compute secret_key = HMAC-SHA256(key="WebAppData", data=botToken).
 *   4. Compute HMAC-SHA256(data_check_string, secret_key) and hex-compare it
 *      to `hash`.
 *
 * A match proves Telegram itself produced this payload for our bot — the
 * client cannot forge it without knowing the bot token. `auth_date` is also
 * checked so a captured initData string can't be replayed indefinitely.
 *
 * NOTE: This intentionally does NOT implement the older Telegram Login
 * Widget's login-widget hash-check (which uses SHA256(botToken) as the key,
 * not HMAC("WebAppData", botToken)) — the spec targets a Telegram Mini App,
 * which always uses the WebApp `initData` scheme above.
 */
let TelegramVerificationService = class TelegramVerificationService {
    constructor(botToken, maxAgeSeconds) {
        this.botToken = botToken;
        this.maxAgeSeconds = maxAgeSeconds;
    }
    verify(initData) {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) {
            throw new common_1.UnauthorizedException('initData is missing the hash field');
        }
        params.delete('hash');
        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(this.botToken).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        const hashBuffer = Buffer.from(hash, 'hex');
        const computedBuffer = Buffer.from(computedHash, 'hex');
        const hashesMatch = hashBuffer.length === computedBuffer.length && crypto.timingSafeEqual(hashBuffer, computedBuffer);
        if (!hashesMatch) {
            throw new common_1.UnauthorizedException('initData signature verification failed');
        }
        const authDateRaw = params.get('auth_date');
        if (!authDateRaw) {
            throw new common_1.UnauthorizedException('initData is missing auth_date');
        }
        const authDate = Number(authDateRaw);
        const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
        if (ageSeconds > this.maxAgeSeconds) {
            throw new common_1.UnauthorizedException('initData has expired — please reopen the Mini App');
        }
        if (ageSeconds < -60) {
            // Small negative tolerance for clock skew; anything further in the "future" is suspicious.
            throw new common_1.UnauthorizedException('initData auth_date is in the future');
        }
        const userRaw = params.get('user');
        if (!userRaw) {
            throw new common_1.UnauthorizedException('initData is missing the user field');
        }
        let user;
        try {
            user = JSON.parse(userRaw);
        }
        catch {
            throw new common_1.UnauthorizedException('initData user field is not valid JSON');
        }
        if (!user.id) {
            throw new common_1.UnauthorizedException('initData user field is missing an id');
        }
        return { user, authDate };
    }
};
exports.TelegramVerificationService = TelegramVerificationService;
exports.TelegramVerificationService = TelegramVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, Number])
], TelegramVerificationService);
