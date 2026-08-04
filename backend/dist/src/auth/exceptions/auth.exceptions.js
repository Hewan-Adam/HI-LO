"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenReuseDetectedException = exports.UserBannedException = exports.InvalidRefreshTokenException = void 0;
const common_1 = require("@nestjs/common");
class InvalidRefreshTokenException extends common_1.UnauthorizedException {
    constructor() {
        super('Refresh token is invalid, expired, or has already been used');
    }
}
exports.InvalidRefreshTokenException = InvalidRefreshTokenException;
class UserBannedException extends common_1.ForbiddenException {
    constructor(reason) {
        super(`This account has been banned${reason ? `: ${reason}` : ''}`);
    }
}
exports.UserBannedException = UserBannedException;
class RefreshTokenReuseDetectedException extends common_1.UnauthorizedException {
    constructor() {
        super('Refresh token reuse detected — all sessions for this account have been revoked. Please log in again.');
    }
}
exports.RefreshTokenReuseDetectedException = RefreshTokenReuseDetectedException;
