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
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
function base64url(input) {
    const buf = typeof input === 'string' ? Buffer.from(input) : input;
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlDecode(input) {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
    return Buffer.from(padded, 'base64');
}
const JWT_HEADER = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
/**
 * A minimal, spec-compliant HS256 JWT implementation (header.payload.signature,
 * base64url-encoded, HMAC-SHA256 signed, constant-time-compared on verify).
 * Written directly against Node's `crypto` rather than pulling in a JWT
 * library, in the same spirit as the provably-fair engine in phase 1 — the
 * entire signing/verification surface is ~40 lines and fully auditable here.
 */
let TokenService = class TokenService {
    constructor(accessSecret, refreshSecret, accessTtlSeconds, refreshTtlSeconds) {
        this.accessSecret = accessSecret;
        this.refreshSecret = refreshSecret;
        this.accessTtlSeconds = accessTtlSeconds;
        this.refreshTtlSeconds = refreshTtlSeconds;
    }
    sign(payload, secret) {
        const encodedPayload = base64url(JSON.stringify(payload));
        const signature = base64url(crypto.createHmac('sha256', secret).update(`${JWT_HEADER}.${encodedPayload}`).digest());
        return `${JWT_HEADER}.${encodedPayload}.${signature}`;
    }
    verify(token, secret) {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new common_1.UnauthorizedException('Malformed token');
        }
        const [header, encodedPayload, signature] = parts;
        const expectedSignature = base64url(crypto.createHmac('sha256', secret).update(`${header}.${encodedPayload}`).digest());
        const sigBuf = Buffer.from(signature);
        const expectedBuf = Buffer.from(expectedSignature);
        const signatureValid = sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
        if (!signatureValid) {
            throw new common_1.UnauthorizedException('Invalid token signature');
        }
        let payload;
        try {
            payload = JSON.parse(base64urlDecode(encodedPayload).toString('utf8'));
        }
        catch {
            throw new common_1.UnauthorizedException('Malformed token payload');
        }
        if (Math.floor(Date.now() / 1000) >= payload.exp) {
            throw new common_1.UnauthorizedException('Token has expired');
        }
        return payload;
    }
    issueAccessToken(userId, role, telegramId) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + this.accessTtlSeconds;
        const payload = { sub: userId, role, telegramId, iat: now, exp, type: 'access' };
        return { token: this.sign(payload, this.accessSecret), expiresAt: new Date(exp * 1000) };
    }
    issueRefreshToken(userId, familyId) {
        const now = Math.floor(Date.now() / 1000);
        const exp = now + this.refreshTtlSeconds;
        const jti = crypto.randomUUID();
        const payload = { sub: userId, jti, familyId, iat: now, exp, type: 'refresh' };
        return { token: this.sign(payload, this.refreshSecret), jti, expiresAt: new Date(exp * 1000) };
    }
    verifyAccessToken(token) {
        const payload = this.verify(token, this.accessSecret);
        if (payload.type !== 'access')
            throw new common_1.UnauthorizedException('Not an access token');
        return payload;
    }
    verifyRefreshToken(token) {
        const payload = this.verify(token, this.refreshSecret);
        if (payload.type !== 'refresh')
            throw new common_1.UnauthorizedException('Not a refresh token');
        return payload;
    }
    /** Refresh tokens are stored (and looked up) only as a SHA-256 hash — never the raw token. */
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, String, Number, Number])
], TokenService);
