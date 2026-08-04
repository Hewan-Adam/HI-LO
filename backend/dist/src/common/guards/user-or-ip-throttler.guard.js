"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOrIpThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
let UserOrIpThrottlerGuard = class UserOrIpThrottlerGuard extends throttler_1.ThrottlerGuard {
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
    async getTracker(req) {
        const userId = req.user?.sub;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
    }
};
exports.UserOrIpThrottlerGuard = UserOrIpThrottlerGuard;
exports.UserOrIpThrottlerGuard = UserOrIpThrottlerGuard = __decorate([
    (0, common_1.Injectable)()
], UserOrIpThrottlerGuard);
