import { Inject, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { TokenService } from './token.service';
import { TelegramVerificationService } from './telegram-verification.service';
import { AUTH_REPOSITORY, AuthRepository } from '../interfaces/auth-repository.interface';
import { AuthenticatedUser, TokenPair } from '../interfaces/auth-types';
import { InvalidRefreshTokenException, RefreshTokenReuseDetectedException, UserBannedException } from '../exceptions/auth.exceptions';

export interface LoginResult {
  user: AuthenticatedUser;
  tokens: TokenPair;
}

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
@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly telegramVerification: TelegramVerificationService,
  ) {}

  async telegramLogin(initData: string): Promise<LoginResult> {
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
      throw new UserBannedException();
    }

    const familyId = crypto.randomUUID();
    const tokens = await this.issueTokenPair(user, familyId);

    return { user, tokens };
  }

  async refresh(presentedRefreshToken: string): Promise<LoginResult> {
    const payload = this.tokenService.verifyRefreshToken(presentedRefreshToken); // throws if malformed/expired/bad signature
    const tokenHash = this.tokenService.hashToken(presentedRefreshToken);

    const stored = await this.repository.findRefreshTokenByHash(tokenHash);
    if (!stored) {
      throw new InvalidRefreshTokenException();
    }

    if (stored.revoked) {
      // Reuse of an already-rotated (or already-logged-out) token: treat as compromise.
      await this.repository.revokeFamily(stored.familyId);
      throw new RefreshTokenReuseDetectedException();
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new InvalidRefreshTokenException();
    }

    const user = await this.repository.findUserById(payload.sub);
    if (!user) {
      throw new InvalidRefreshTokenException();
    }
    if (user.isBanned) {
      throw new UserBannedException();
    }

    // Rotate: the presented token is now spent, a new one takes its place in the same family.
    const tokens = await this.issueTokenPair(user, stored.familyId);
    const newRefreshHash = this.tokenService.hashToken(tokens.refreshToken);
    await this.repository.markRotated(tokenHash, newRefreshHash);

    return { user, tokens };
  }

  async logout(presentedRefreshToken: string): Promise<void> {
    const payload = this.tokenService.verifyRefreshToken(presentedRefreshToken);
    void payload; // signature/expiry check is enough here; we revoke by family regardless of per-token state
    const tokenHash = this.tokenService.hashToken(presentedRefreshToken);
    const stored = await this.repository.findRefreshTokenByHash(tokenHash);
    if (stored) {
      await this.repository.revokeFamily(stored.familyId);
    }
  }
 async devLogin(): Promise<LoginResult> {
  let user = await this.repository.findFirstUser();

  if (!user) {
    user = await this.repository.createUser({
      telegramId: '999999999',
      username: 'dev_player',
      firstName: 'Dev',
      lastName: 'User',
    });
  }

  if (user.isBanned) {
    throw new UserBannedException();
  }

  const familyId = crypto.randomUUID();
  const tokens = await this.issueTokenPair(user, familyId);

  return {
    user,
    tokens,
  };
}

  private async issueTokenPair(user: AuthenticatedUser, familyId: string): Promise<TokenPair> {
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
}
