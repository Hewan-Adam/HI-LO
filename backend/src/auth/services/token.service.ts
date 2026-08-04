import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AccessTokenPayload, RefreshTokenPayload, Role } from '../interfaces/auth-types';

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(input: string): Buffer {
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
@Injectable()
export class TokenService {
  constructor(
    private readonly accessSecret: string,
    private readonly refreshSecret: string,
    private readonly accessTtlSeconds: number,
    private readonly refreshTtlSeconds: number,
  ) {}

  private sign(payload: object, secret: string): string {
    const encodedPayload = base64url(JSON.stringify(payload));
    const signature = base64url(
      crypto.createHmac('sha256', secret).update(`${JWT_HEADER}.${encodedPayload}`).digest(),
    );
    return `${JWT_HEADER}.${encodedPayload}.${signature}`;
  }

  private verify<T extends { exp: number }>(token: string, secret: string): T {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed token');
    }
    const [header, encodedPayload, signature] = parts;

    const expectedSignature = base64url(crypto.createHmac('sha256', secret).update(`${header}.${encodedPayload}`).digest());

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    const signatureValid = sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);

    if (!signatureValid) {
      throw new UnauthorizedException('Invalid token signature');
    }

    let payload: T;
    try {
      payload = JSON.parse(base64urlDecode(encodedPayload).toString('utf8'));
    } catch {
      throw new UnauthorizedException('Malformed token payload');
    }

    if (Math.floor(Date.now() / 1000) >= payload.exp) {
      throw new UnauthorizedException('Token has expired');
    }

    return payload;
  }

  issueAccessToken(userId: string, role: Role, telegramId: string): { token: string; expiresAt: Date } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.accessTtlSeconds;
    const payload: AccessTokenPayload = { sub: userId, role, telegramId, iat: now, exp, type: 'access' };
    return { token: this.sign(payload, this.accessSecret), expiresAt: new Date(exp * 1000) };
  }

  issueRefreshToken(userId: string, familyId: string): { token: string; jti: string; expiresAt: Date } {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.refreshTtlSeconds;
    const jti = crypto.randomUUID();
    const payload: RefreshTokenPayload = { sub: userId, jti, familyId, iat: now, exp, type: 'refresh' };
    return { token: this.sign(payload, this.refreshSecret), jti, expiresAt: new Date(exp * 1000) };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.verify<AccessTokenPayload>(token, this.accessSecret);
    if (payload.type !== 'access') throw new UnauthorizedException('Not an access token');
    return payload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verify<RefreshTokenPayload>(token, this.refreshSecret);
    if (payload.type !== 'refresh') throw new UnauthorizedException('Not a refresh token');
    return payload;
  }

  /** Refresh tokens are stored (and looked up) only as a SHA-256 hash — never the raw token. */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
