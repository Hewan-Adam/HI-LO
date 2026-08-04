import 'reflect-metadata';
import * as crypto from 'crypto';
import { TelegramVerificationService } from '../src/auth/services/telegram-verification.service';
import { TokenService } from '../src/auth/services/token.service';
import { AuthService } from '../src/auth/services/auth.service';
import { InMemoryAuthRepository } from '../src/auth/repositories/in-memory-auth.repository';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Role } from '../src/auth/interfaces/auth-types';
import { RefreshTokenReuseDetectedException, UserBannedException } from '../src/auth/exceptions/auth.exceptions';

function line() {
  console.log('-'.repeat(72));
}

/** Builds a genuine Telegram-style initData string, signed exactly the way Telegram itself signs it — used here to test our OWN verification logic, not to fake real Telegram data. */
function buildSignedInitData(botToken: string, fields: Record<string, string>): string {
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
  constructor(private readonly metadata: Record<string, unknown>) {}
  getAllAndOverride<T>(key: string): T | undefined {
    return this.metadata[key] as T | undefined;
  }
}

function fakeContext(user: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

async function main() {
  const BOT_TOKEN = 'fake-bot-token-for-testing-only';

  line();
  console.log('1) TELEGRAM initData VERIFICATION');
  line();

  const verification = new TelegramVerificationService(BOT_TOKEN, 86400);
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
  } catch (err) {
    console.log(`Tampered initData correctly rejected: ${(err as Error).message}`);
  }

  try {
    const staleInitData = buildSignedInitData(BOT_TOKEN, {
      auth_date: String(nowSeconds - 100000), // way older than the 86400s max age
      user: JSON.stringify({ id: 1, first_name: 'Old' }),
    });
    verification.verify(staleInitData);
    console.log('ERROR: stale initData should have failed!');
  } catch (err) {
    console.log(`Stale (replayed) initData correctly rejected: ${(err as Error).message}`);
  }

  line();
  console.log('2) LOGIN (find-or-create user + issue token pair)');
  line();

  const repo = new InMemoryAuthRepository();
  const tokenService = new TokenService('access-secret', 'refresh-secret', 900, 2592000);
  const authService = new AuthService(repo as any, tokenService, verification);

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
  } catch (err) {
    console.log(`Tampered access token correctly rejected: ${(err as Error).message}`);
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
  } catch (err) {
    console.log(`Reuse correctly detected: ${err instanceof RefreshTokenReuseDetectedException} (${(err as Error).message})`);
  }
  try {
    // Because reuse revokes the WHOLE family, even the legitimately-rotated token from step 4 should now be dead.
    await authService.refresh(refreshed.tokens.refreshToken);
    console.log('ERROR: token from a revoked family should have been rejected!');
  } catch (err) {
    console.log(`Entire family correctly revoked after theft signal: ${(err as Error).message}`);
  }

  line();
  console.log('6) LOGOUT revokes the family going forward');
  line();
  const freshLogin = await authService.telegramLogin(validInitData);
  await authService.logout(freshLogin.tokens.refreshToken);
  try {
    await authService.refresh(freshLogin.tokens.refreshToken);
    console.log('ERROR: refresh after logout should have failed!');
  } catch (err) {
    console.log(`Refresh after logout correctly rejected: ${(err as Error).message}`);
  }

  line();
  console.log('7) BANNED USER IS REJECTED AT LOGIN');
  line();
  repo._setUserBanned(login1.user.id, true);
  try {
    await authService.telegramLogin(validInitData);
    console.log('ERROR: banned user should not be able to log in!');
  } catch (err) {
    console.log(`Banned user correctly rejected: ${err instanceof UserBannedException} (${(err as Error).message})`);
  }
  repo._setUserBanned(login1.user.id, false);

  line();
  console.log('8) ROLE-BASED AUTHORIZATION (RolesGuard)');
  line();

  const adminOnlyGuard = new RolesGuard(new FakeReflector({ roles: [Role.ADMIN] }) as any);
  const openGuard = new RolesGuard(new FakeReflector({}) as any);

  console.log(`PLAYER hitting an ADMIN-only route is rejected: ${safeGuardCheck(adminOnlyGuard, { role: Role.PLAYER })}`);
  console.log(`ADMIN hitting an ADMIN-only route is allowed:   ${safeGuardCheck(adminOnlyGuard, { role: Role.ADMIN })}`);
  console.log(`SUPER_ADMIN hitting an ADMIN-only route is allowed (implicit): ${safeGuardCheck(adminOnlyGuard, { role: Role.SUPER_ADMIN })}`);
  console.log(`PLAYER hitting a route with no @Roles() is allowed: ${safeGuardCheck(openGuard, { role: Role.PLAYER })}`);
}

function safeGuardCheck(guard: RolesGuard, user: any): string {
  try {
    return guard.canActivate(fakeContext(user)) ? 'ALLOWED' : 'DENIED';
  } catch {
    return 'DENIED';
  }
}

main().catch((err) => {
  console.error('DEMO FAILED:', err);
  process.exit(1);
});
