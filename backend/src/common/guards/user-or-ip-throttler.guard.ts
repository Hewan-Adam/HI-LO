import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  /**
   * Default @nestjs/throttler tracks solely by IP. That's the right first
   * line of defense for unauthenticated endpoints (login spam), but for
   * authenticated routes it under-protects against a single account
   * spamming from a rotating/shared IP (e.g. mobile carrier NAT, which
   * would otherwise throttle every other player behind the same IP along
   * with the offender) and over-protects legitimate users who happen to
   * share an IP. Tracking by user id when we have one is strictly better
   * for both correctness and fairness.
   *
   * This depends on `req.user` already being populated, i.e. on this guard
   * running AFTER JwtAuthGuard in the actual global-guard execution order
   * (see AppModule for the intended ordering). If it ever runs before
   * JwtAuthGuard instead, it degrades gracefully to IP-based tracking
   * rather than erroring — not incorrect, just less precise than intended.
   * Cross-module APP_GUARD ordering in Nest follows module resolution
   * order, which is somewhat implementation-dependent; I was not able to
   * boot a live server in this delivery to empirically confirm the actual
   * runtime order (see backend README). Worth a real integration test
   * (e.g. supertest: authenticate, then hammer a route, then confirm the
   * throttle bucket key was the user id, not the IP) before relying on
   * per-user precision in production.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.sub;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  }
}
