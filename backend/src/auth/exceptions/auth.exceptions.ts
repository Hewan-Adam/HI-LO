import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export class InvalidRefreshTokenException extends UnauthorizedException {
  constructor() {
    super('Refresh token is invalid, expired, or has already been used');
  }
}

export class UserBannedException extends ForbiddenException {
  constructor(reason?: string) {
    super(`This account has been banned${reason ? `: ${reason}` : ''}`);
  }
}

export class RefreshTokenReuseDetectedException extends UnauthorizedException {
  constructor() {
    super('Refresh token reuse detected — all sessions for this account have been revoked. Please log in again.');
  }
}

export class DevLoginDisabledException extends ForbiddenException {
  constructor() {
    super('Dev login is disabled in this environment');
  }
}