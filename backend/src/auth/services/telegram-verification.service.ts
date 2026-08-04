import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { TelegramWebAppUser } from '../interfaces/auth-types';

export interface VerifiedTelegramInitData {
  user: TelegramWebAppUser;
  authDate: number; // unix seconds
}

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
@Injectable()
export class TelegramVerificationService {
  constructor(
    private readonly botToken: string,
    private readonly maxAgeSeconds: number,
  ) {}

  verify(initData: string): VerifiedTelegramInitData {
    const params = new URLSearchParams(initData);

    const hash = params.get('hash');
    if (!hash) {
      throw new UnauthorizedException('initData is missing the hash field');
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
      throw new UnauthorizedException('initData signature verification failed');
    }

    const authDateRaw = params.get('auth_date');
    if (!authDateRaw) {
      throw new UnauthorizedException('initData is missing auth_date');
    }
    const authDate = Number(authDateRaw);
    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > this.maxAgeSeconds) {
      throw new UnauthorizedException('initData has expired — please reopen the Mini App');
    }
    if (ageSeconds < -60) {
      // Small negative tolerance for clock skew; anything further in the "future" is suspicious.
      throw new UnauthorizedException('initData auth_date is in the future');
    }

    const userRaw = params.get('user');
    if (!userRaw) {
      throw new UnauthorizedException('initData is missing the user field');
    }

    let user: TelegramWebAppUser;
    try {
      user = JSON.parse(userRaw);
    } catch {
      throw new UnauthorizedException('initData user field is not valid JSON');
    }

    if (!user.id) {
      throw new UnauthorizedException('initData user field is missing an id');
    }

    return { user, authDate };
  }
}
