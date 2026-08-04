"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_TIME_PERIOD = exports.LEADERBOARD_REPOSITORY = void 0;
exports.currentDailyPeriod = currentDailyPeriod;
exports.LEADERBOARD_REPOSITORY = Symbol('LEADERBOARD_REPOSITORY');
exports.ALL_TIME_PERIOD = 'ALL_TIME';
/** Returns the period key for "today" in UTC, e.g. "DAILY-2026-07-26". */
function currentDailyPeriod(now = new Date()) {
    return `DAILY-${now.toISOString().slice(0, 10)}`;
}
