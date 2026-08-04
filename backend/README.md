# Hi-Lo (Kef-Zk) — Phase 1: Database Schema + Provably-Fair Game Engine

This is phase 1 of the build (see project plan). It contains:

- `prisma/schema.prisma` — full data model: User, Wallet, Game, GameMove,
  Transaction, Leaderboard, Statistics, Referral, Promotion, AuditLog,
  AdminSettings, with relations, indexes, and an optimistic-locking
  `version` column on `Wallet` for safe concurrent balance updates.
- `src/game-engine/` — the game engine itself, as **pure domain logic with
  zero I/O** (no database, no HTTP). This is a deliberate architecture
  choice: the provably-fair math, Ace-mode handling, equal-card rules, and
  multiplier calculation are the most safety/correctness-critical part of a
  wagering product, so they're isolated where they can be unit-tested and
  audited independent of the persistence layer. Phase 2 (wallet) and the API
  phase will wrap `GameEngineService` with a Prisma-backed repository that
  loads/saves `GameState` and performs the matching wallet debit/credit
  inside the same DB transaction — nothing here is a stub or placeholder,
  it's a complete, working layer that the next phases build on top of.

## What's implemented

- **Provably fair** (`provably-fair.service.ts`): server seed generation,
  SHA-256 hash publication, and a deterministic HMAC-SHA256 cursor-based
  float stream driving the shuffle — the same algorithm family used by
  major provably-fair platforms. Verified in this phase: same seeds always
  reproduce the same deck; a tampered card sequence is correctly rejected.
- **Deck** (`deck.service.ts`): 52-card deck, Fisher-Yates shuffle driven by
  the provably-fair floats. Cards can't repeat because a game deals from a
  single shuffled permutation, not draw-with-replacement.
- **Ace mode** (`card-comparator.service.ts`): configurable HIGH (14) or LOW
  (1), applied at comparison time so the same deck works under either rule.
- **Equal-card rules**: `PUSH` (continue, no move recorded against streak),
  `LOSS` (ends game), `REDRAW` (silently discard the tie and draw the next
  card — never surfaces to the player as a move).
- **Multiplier system** (`multiplier.service.ts`): configurable table
  (defaults to the spec's example values), with automatic extrapolation
  beyond the last configured streak using the growth ratio of the last two
  entries, so long streaks don't flatline or throw.
- **Game engine** (`game-engine.service.ts`): `startGame`, `submitGuess`,
  `cashout`, and fairness reveal/verification (`getFairnessProof`,
  `verifyFairness`).

## Verified behavior (not just "should work")

I ran this end-to-end in a sandboxed Node environment (300+ randomized
games) before delivering it, confirming:

- Same `(serverSeed, clientSeed, nonce)` always produces an identical deck;
  a different nonce produces a different deck.
- Every generated deck has exactly 52 unique card codes — no repeats.
- `AceMode.LOW` correctly treats Ace as rank 1; `AceMode.HIGH` as rank 14.
- `EqualRule.REDRAW` never leaks out as a visible move result.
- `EqualRule.LOSS` correctly ends the game on a tie.
- Fairness verification passes on a genuine proof and correctly **fails**
  on a tampered one.
- A full game (start → win → push → loss) and a full game (start → win →
  win → win → cashout) both produce internally consistent multiplier/payout
  math.

## Running it yourself

```bash
npm install
npm run demo            # runs test/demo.ts — full game, cashout, fairness proof
npm run prisma:generate # generate the Prisma client
# npm run prisma:migrate  -- once DATABASE_URL is set, applies the schema
```

`test/demo.ts` instantiates the services directly (no Nest DI container
needed to exercise pure classes) and prints a full game trace including the
published seed hash, the revealed seed, and an independent recomputation
that proves the dealt cards match.

## Notable design decisions worth knowing about

- **Rule config is snapshotted per-game** (`Game.aceMode`, `Game.equalRule`
  columns) rather than always read live from `AdminSettings` — so an admin
  changing the house rules mid-session never silently alters a game already
  in progress.
- **`serverSeed` is nullable in the DB** and only populated once the game
  ends — it must never be queryable while `status = ACTIVE`, or the shuffle
  becomes predictable. The API/persistence phase needs to enforce this at
  the query level (e.g. a `select` that omits it unless status ≠ ACTIVE).
- **`Wallet.version`** exists now so the wallet phase can use optimistic
  locking (`WHERE id = ? AND version = ?`) instead of a raw balance update,
  which is what actually prevents two concurrent bets/cashouts from
  corrupting a balance.

## Compliance note

This schema and engine assume you'll add licensing/KYC/AML/responsible-
gambling controls before any real-money deployment — those aren't in this
phase's scope but should be a hard requirement before launch, not a "later."

## Next phase

Wallet/transaction engine (atomic bet deduction, cashout payout, refunds,
bonus wallet) — wired against `Wallet.version` for safe concurrency.

---

# Phase 2: Wallet / Transaction Engine

Adds `src/wallet/` and `src/database/`.

## What's implemented

- **`WalletService`** (`src/wallet/services/wallet.service.ts`) — the single
  place every balance mutation goes through: `deposit`, `withdraw`,
  `placeBet`, `settleCashout`, `refundBet`, `creditBonus`,
  `creditReferralReward`, `getTransactionHistory`.
- **Optimistic locking with retry + jittered backoff**: every mutation reads
  a wallet snapshot (balance + `version`), validates it (sufficient funds,
  positive amount), then attempts a single atomic operation that updates the
  balance **and** inserts the ledger row together, conditioned on the
  `version` it read. If another request already advanced the version, the
  attempt is retried from a fresh read (up to 10 attempts, with jittered
  backoff) rather than silently overwriting the other update.
- **One atomic commit, not two separate calls**: `WalletRepository.commitBalanceChange()`
  performs the conditional wallet update and the `Transaction` insert as one
  unit (`prisma.$transaction([...])` in the real repository) — a balance
  change is never persisted without its ledger row, or vice versa.
- **Idempotency**: `deposit`/`withdraw`/`creditBonus` accept an optional
  `reference`. Submitting the same reference twice (e.g. a retried payment
  webhook) returns the original transaction instead of double-applying it,
  backed by a real unique constraint on `Transaction.reference` — not just
  an application-level check that a race could slip past.
- **Bonus wallet**: `placeBet(..., useBonusFirst: true)` consumes available
  bonus balance before touching the real balance, and records the exact
  split in the transaction's `metadata` so it's auditable even though the
  ledger's `balanceBefore`/`balanceAfter` columns track the main balance only.
- **Refunds** restore exactly what was deducted, including the bonus-balance
  portion, for aborted/errored games.
- **Two repository implementations** behind the same `WalletRepository`
  interface: `PrismaWalletRepository` (real, Postgres-backed, used in
  production) and `InMemoryWalletRepository` (a faithful test double used
  for the demo and for fast unit tests without a database).

## Verified behavior

Run via `npm run demo:wallet` (uses the in-memory repository so it needs no
database):

- A deposit, a bet, a cashout, a bonus credit, and a refund all produce
  mathematically correct running balances.
- Betting more than the available balance is correctly rejected with
  `InsufficientFundsException`, and no partial state is written.
- Submitting the same `reference` twice returns the *same* transaction and
  does **not** double-credit the wallet.
- A bonus-first bet correctly splits across bonus and real balance, and a
  matching refund restores both portions.
- **Concurrency stress test**: 20 simultaneous bet requests fired at the
  same wallet at once, with an artificial delay forced between each
  request's read and its conditional write (to guarantee real interleaving,
  not just a hopeful assumption about Node's event loop). Result: the final
  balance always exactly equals `starting_balance - (successful_bets × bet_amount)`
  and the number of `BET` ledger rows always exactly equals the number of
  successful bets — i.e. **no lost updates and no double-spend**, verified
  by assertion, every run.

### An honest note on that concurrency test

Under this artificial worst-case (20 truly simultaneous writers to one row,
each with a forced delay), some attempts legitimately exhaust their retries
and fail with `WalletConcurrencyException` rather than every single one
eventually succeeding. That's the expected trade-off of optimistic locking
under heavy same-row contention — it guarantees correctness, not that every
attempt succeeds. In practice a single Telegram user's own client isn't
firing 20 truly simultaneous bets at itself (the UI disables the button
while a request is in flight), so this level of contention is a deliberate
stress test, not the expected traffic pattern. If a future load test shows
this matters for a specific hot path (e.g. a promo that mass-credits many
users' wallets at once), the fix is either client-side retry-on-409 or
serializing writes to that specific wallet through a short-lived Redis lock
— not something to bolt onto this phase speculatively.

## Running it yourself

```bash
npm install
npm run demo:wallet     # in-memory repository, no DB needed
npm run prisma:generate # generates the real Prisma client for PrismaWalletRepository
```

`PrismaWalletRepository` is real production code (not a stub) but wasn't
executed against a live Postgres instance in this delivery — there's no
database available in the environment this was built in. It's written
against the actual Prisma API (`updateMany` for the conditional update,
`$transaction` for atomicity, `findUniqueOrThrow` for the post-update read)
and should be run against a real `DATABASE_URL` as part of your own
integration testing before relying on it.

## Next phase

Auth (Telegram Login + JWT + refresh tokens + role-based guards), then the
REST API layer that exposes the game engine and wallet service through
`/game/*` and `/wallet` endpoints.

---

# Phase 3: Auth (Telegram Login + JWT + Roles)

Adds `src/auth/`, plus the `RefreshToken` model in the Prisma schema.

## What's implemented

- **Telegram Mini App `initData` verification** (`telegram-verification.service.ts`)
  — implements Telegram's actual documented algorithm: strip `hash`, build
  the sorted `key=value` data-check string, derive `secretKey =
  HMAC-SHA256("WebAppData", botToken)`, compute `HMAC-SHA256(dataCheckString,
  secretKey)`, and constant-time-compare it to the provided hash. Also
  enforces `auth_date` freshness so a captured `initData` string can't be
  replayed indefinitely.
- **Hand-rolled HS256 JWT** (`token.service.ts`) — access tokens (short-lived,
  15 min default) and refresh tokens (30 days default), signed/verified
  directly against Node's `crypto`, following the actual JWT spec
  (base64url header.payload.signature, constant-time signature comparison).
  Same "no external dependency for the security-critical primitive" approach
  as the provably-fair engine in phase 1.
- **Refresh token rotation with reuse/theft detection** (`auth.service.ts`)
  — every refresh token is single-use. A successful refresh revokes the
  presented token and issues a new one in the same `familyId`. If a refresh
  token that's already been rotated away (or logged out) is ever presented
  again, that's treated as a theft signal: the **entire family** is revoked,
  not just that one token — every device on that session chain is forced to
  re-login, rather than quietly rejecting one request and leaving a stolen
  token line still valid for the next one.
- **Refresh tokens are stored as a SHA-256 hash only** — the same principle
  as password storage. A stolen database dump doesn't hand over usable
  session tokens.
- **`JwtAuthGuard`** — registered as a global `APP_GUARD`, so *every* route
  requires a valid access token by default; individual routes opt out with
  `@Public()` (used on `/auth/telegram-login`, `/auth/refresh`, `/auth/logout`).
- **`RolesGuard`** + `@Roles(Role.ADMIN)` — `SUPER_ADMIN` implicitly
  satisfies any `ADMIN`-restricted route; a route with no `@Roles()` allows
  any authenticated user.
- **`AuthController`**: `POST /auth/telegram-login`, `POST /auth/refresh`,
  `POST /auth/logout`, `GET /auth/me` (this one deliberately not `@Public()`,
  so it doubles as a smoke test that `JwtAuthGuard` is wired correctly).
- Two repository implementations behind `AuthRepository`, same pattern as
  the wallet module: `PrismaAuthRepository` (real) and
  `InMemoryAuthRepository` (test double, used by the demo).

## Verified behavior

Run via `npm run demo:auth` (no database needed):

- A genuinely-signed Telegram `initData` string verifies successfully;
  tampering with any field (even just the name inside the JSON `user`
  field) correctly fails signature verification.
- A stale `initData` (`auth_date` older than the configured max age) is
  correctly rejected as an anti-replay measure.
- Logging in with the same Telegram identity twice returns the same user
  (find-or-create, not a duplicate).
- A tampered access token is correctly rejected by signature check.
- Refreshing rotates the refresh token (new token issued, old one dead).
- **Reusing an already-rotated refresh token is correctly detected**, and
  correctly revokes the *entire* token family — verified by then also
  confirming the legitimately-rotated newer token from the same family no
  longer works either.
- Logout revokes the family; a subsequent refresh attempt with the
  logged-out token is correctly rejected.
- A banned user is correctly rejected at login, even with valid `initData`.
- `RolesGuard`: a `PLAYER` is denied on an `ADMIN`-only route, an `ADMIN` is
  allowed, a `SUPER_ADMIN` is allowed via implicit escalation, and any
  authenticated role is allowed through a route with no `@Roles()` applied.

## Configuration

Copy `.env.example` to `.env` and fill in real values. `AuthModule` calls
`loadAuthConfig()` at import time, which throws immediately if
`TELEGRAM_BOT_TOKEN`, `JWT_ACCESS_SECRET`, or `JWT_REFRESH_SECRET` are
missing — deliberately fail-fast on boot rather than starting an app that
can silently mis-authenticate.

## Running it yourself

```bash
npm install
npm run demo:auth   # in-memory repository, no DB or real Telegram bot needed
```

The demo signs its own test `initData` using a fake bot token, so it's
exercising the verification *algorithm* end-to-end — the only thing that
changes in production is swapping in your real `TELEGRAM_BOT_TOKEN`, which
must match the bot your Mini App is registered under.

## Notable design decisions worth knowing about

- **Access tokens carry no `jti`** and are otherwise deterministic — two
  issued within the same second with identical claims are byte-identical.
  This is intentional and harmless: access tokens are stateless and
  short-lived by design; only refresh tokens need per-issuance uniqueness,
  since they're the ones that are single-use and looked up by hash.
- **`RolesGuard` runs after `JwtAuthGuard`** in the `APP_GUARD` provider
  order in `AuthModule` — if it ever runs first, it throws with an explicit
  "is JwtAuthGuard registered first?" message rather than silently treating
  a missing `request.user` as "no restriction."
- **User creation on login is an `upsert`, not a `create`** — two
  near-simultaneous first logins from a brand-new Telegram user (e.g. a
  double-tapped Mini App launch) resolve to the same user instead of racing
  into a duplicate-key error.

## Next phase

The REST API layer proper: wiring `GameEngineService` and `WalletService`
behind `/game/*` and `/wallet` controllers (start/guess/cashout/history),
with Swagger documentation, validation pipes, and exception filters.

---

# Phase 4: REST API Layer

Adds `src/game/`, `src/statistics/`, `src/leaderboard/`, `src/common/`,
`src/app.module.ts`, `src/main.ts`, plus the `cursor` column on `Game`.

This is the integration phase: everything built in phases 1-3 (the pure
game engine, the wallet, auth) gets wired together behind real HTTP
endpoints, with a real persistence strategy for a stateless API serving a
stateful, multi-step game.

## The core design problem this phase solves

`GameEngineService` (phase 1) is pure in-memory domain logic — it has no
idea an HTTP request even exists. But a Hi-Lo game is a multi-step
conversation (start → guess → guess → ... → cashout) played across several
separate HTTP requests, and Nest controllers are stateless between them. So
where does the live `GameState` (including the full shuffled deck and the
still-secret `serverSeed`) live in between requests?

**Answer: Redis, not Postgres**, and this is deliberate, not incidental:

- `GameStateStore` (Redis-backed, `RedisGameStateStore`) holds the *entire*
  live `GameState` — deck, cursor, the real `serverSeed` — for exactly as
  long as the game is `ACTIVE`, with a TTL refreshed on every guess.
- The durable `Game` row in Postgres (`GameRepository`) never receives
  `serverSeed` until `finalizeGame()` is called — i.e., never while a game
  is `ACTIVE`. This makes the phase-1 security promise ("serverSeed is
  never queryable while ACTIVE") a property of *where the data lives*, not
  just an application-level `SELECT` convention someone could forget.
  `GameMove` rows are still written to Postgres incrementally, after every
  single guess — so even a mid-game crash leaves a complete move-by-move
  audit trail; only the not-yet-revealed seed and the reconstructable deck
  stay out of Postgres.

**A caught design conflict, fixed before finalizing**: partway through
this phase I found leftover files from an earlier draft of the game
repository that took the opposite approach — storing `serverSeed` in
Postgres immediately at game creation. That would have quietly broken the
phase-1 security guarantee. I rewrote both repository implementations
(`PrismaGameRepository`, `InMemoryGameRepository`) to match the Redis-based
design before wiring anything else to them.

## What's implemented

- **`GameApiService`** — the orchestrator: `startGame` (build engine state →
  create durable row → debit wallet, with a **compensating delete** of the
  row if the debit fails, since this spans two aggregates rather than one
  DB transaction — see below), `submitGuess` (persist move, settle if the
  game ended), `cashout`, `getHistory`, `getFairnessProof`.
- **Ownership + state guards** on every game action: wrong user →
  `NotYourGameException` (403); game not `ACTIVE` → `GameNotActiveException`
  (409); unknown game → `GameNotFoundException` (404).
- **Session-expiry handling**: if Redis's TTL beats a game to completion
  (abandoned mid-session), the next action against it detects the missing
  state, **automatically refunds the bet**, and marks the durable row
  `ABANDONED` — with an honest caveat: the `serverSeed` in that case was
  never durably stored anywhere and is genuinely unrecoverable, so that one
  game's fairness can't be verified after the fact. `/game/:id/fairness`
  reports this explicitly (`verifiable: false` with a reason) rather than
  fabricating a value.
- **Settlement side-effects**: every ended game updates `StatisticsService`
  (games played/won/lost, wagered, best multiplier, longest streak); every
  cashout also updates `LeaderboardService` for both the `ALL_TIME` and the
  current UTC daily period.
- **`GameRulesProvider`** — Ace mode / equal-card rule / multiplier table
  are deliberately *not* part of `StartGameDto`. If a player could choose
  their own house rules per bet, they'd always pick whichever configuration
  currently favors them, silently defeating the house edge the admin
  dashboard (a later phase) is meant to control. `GameApiService` reads
  these from `GameRulesProvider`, never from client input;
  `DefaultGameRulesProvider` returns the spec's static defaults for now,
  and a future `AdminSettingsGameRulesProvider` swaps in without touching
  `GameApiService`.
- **Controllers**: `GameController` (`/game/start`, `/game/guess`,
  `/game/cashout`, `/game/history`, `/game/:gameId/fairness`),
  `WalletController` (`/wallet`, `/wallet/history`),
  `StatisticsController` (`/statistics`), `LeaderboardController`
  (`/leaderboard`, public — no login needed to view standings).
- **Global `ValidationPipe`** (`whitelist`, `forbidNonWhitelisted`,
  `transform`) in `main.ts`, so every DTO's `class-validator` decorators
  actually run and unexpected extra fields are rejected outright rather
  than silently dropped.
- **`GlobalExceptionFilter`** — every error response gets one consistent
  JSON shape (`statusCode`, `error`, `message`, `path`, `timestamp`); 5xx
  errors log full detail (including stack) server-side but return a generic
  "unexpected error" message to the client, so internals never leak.
- **`LoggingInterceptor`** — logs method/route/user/duration for every
  request, and the outcome status on failures.
- **Swagger** wired at `/docs` in `main.ts` via `@nestjs/swagger`.

## Why `startGame` uses a compensating action, not one DB transaction

Creating a `Game` row and debiting the wallet are writes to two different
aggregates (in a larger system, plausibly two different services). Doing
that inside one Postgres transaction would require `WalletService` to
accept an ambient transaction handle from `GameApiService` — a real option,
but one that couples the two modules' persistence layers together. Instead:
create the (harmless, moneyless) `Game` row first, then debit; if the debit
fails, delete the row. This is a standard saga-style compensating action,
verified in the demo to actually clean up (`getGameById` returns `null`
afterward on an insufficient-funds rejection) rather than just asserted.

## Verified behavior

Run via `npm run demo:api` (all in-memory repositories, no database or
Redis needed):

- Starting a game correctly debits the wallet immediately.
- A full play-guess-cashout sequence produces mathematically consistent
  wallet balances, multiplier, and payout (the demo actually reads each
  card's rank from its code and predicts the mathematically favored side,
  retrying fresh games as needed, rather than hard-coding an outcome).
- History and the fairness-proof endpoint reflect the completed game
  correctly, and the fairness proof is independently verified as valid.
- A different user id is correctly rejected from acting on someone else's
  game; guessing again on an already-finished game is correctly rejected.
- An oversized bet is rejected, confirmed via the *next* step that no
  orphaned `Game` row is left lying around in an inconsistent state.
- **Simulated Redis session expiry**: deleting the state-store entry out
  from under an `ACTIVE` game and then guessing against it correctly
  triggers auto-refund + `ABANDONED`, with the balance verified to return
  to its pre-bet value and the fairness endpoint correctly reporting
  `verifiable: false`.
- Statistics and leaderboard reflect exactly the settled (non-abandoned)
  games — the abandoned game's stake is correctly excluded from both,
  since it was refunded rather than actually played to a result.
- The entire project — including `app.module.ts`, `main.ts`, and every
  controller — was full-project type-checked (`tsc --noEmit`) with zero
  errors, on top of the four demo scripts (`demo`, `demo:wallet`,
  `demo:auth`, `demo:api`) all still passing together.

## Running it yourself

```bash
npm install
npm run demo:api      # in-memory repositories, no DB/Redis needed
npm run prisma:generate
# with DATABASE_URL and REDIS_URL / TELEGRAM_BOT_TOKEN / JWT secrets set in .env:
npm run start         # boots the real HTTP server, Swagger at /docs
```

`npm run start` is real, standard NestJS bootstrap code, but wasn't run as
a live HTTP server in this delivery — there's no Postgres or Redis instance
available in the environment this was built in. What *was* verified is
every layer beneath the HTTP boundary (`GameApiService` and everything it
calls), via `demo:api`, and that the whole project — controllers included —
type-checks cleanly.

## Notable design decisions worth knowing about

- **`GameEngineService` still has zero persistence knowledge.** Nothing in
  phase 1 changed. `GameApiService` is the only thing that knows about
  Redis, Postgres, or the wallet — the provably-fair math stays exactly as
  auditable and unit-testable in isolation as it was in phase 1.
- **`GameMove` rows are written after every guess, not batched at game
  end** — a crash mid-game still leaves a complete, honest partial audit
  trail instead of losing everything since the last checkpoint.
- **Leaderboard reflects winnings (payouts), not activity** — a loss moves
  `Statistics` (games played, losses, wagered) but never touches the
  leaderboard, which tracks cumulative winnings by design.

## Next phase

The Admin Dashboard: user management (search/ban), wallet oversight, game
configuration (multiplier table / house edge / Ace mode / equal-card rule
via `AdminSettings`, replacing `DefaultGameRulesProvider`), transaction
oversight, and analytics — plus the audit logging (`AuditLog`, already
modeled in the schema) that admin actions should write to.

---

# Phase 5: Admin Dashboard (backend)

Adds `src/admin-settings/`, `src/audit-log/`, `src/admin/`.

## What's implemented

- **`AdminSettingsService`** — typed getters/setters over the generic
  `AdminSettings` key/value table for Ace mode, equal-card rule, multiplier
  table, and a target-RTP figure. Multiplier table writes are validated with
  the *same* monotonic-table check `MultiplierService` itself uses — I
  refactored that check into a standalone exported
  `assertMonotonicMultiplierTable()` in phase 1's `multiplier.service.ts`
  rather than duplicating the rule in two places that could drift apart.
- **`AdminSettingsGameRulesProvider`** — a second, real implementation of
  the `GameRulesProvider` interface from phase 4, now wired into
  `GameModule` in place of `DefaultGameRulesProvider`. `GameApiService`
  needed **zero changes** to pick this up — it only ever depended on the
  interface. This is the concrete payoff of that design choice.
- **Ban privilege hierarchy** (`AdminUsersService`) — an actor can only ban
  a target whose role ranks strictly below their own: `ADMIN` can ban a
  `PLAYER` but not a peer `ADMIN` or a `SUPER_ADMIN`; `SUPER_ADMIN` can act
  on anyone below it. This stops a compromised or rogue admin account from
  disabling other admin accounts.
- **`AdminAnalyticsService`** — revenue, win/loss ratio, active players, and
  average session duration, computed by reusing the existing
  `GameRepository` (two new query methods added to it) rather than building
  a parallel analytics-specific repository.
- **Sensitivity-tiered RBAC**: viewing users/analytics/transactions is
  `ADMIN`+; *mutating* game rules (Ace mode, equal-card rule, multiplier
  table, target RTP — anything that moves house edge or player payout) is
  `SUPER_ADMIN`-only; viewing the audit log itself is `SUPER_ADMIN`-only,
  since the audit trail is itself a sensitive security surface.
- **Every mutating admin action is audit-logged** — ban/unban and every
  game-settings change writes an `AuditLogService.record()` entry with the
  actor, action, entity, and a metadata snapshot of what changed.
- **Cross-user transaction search** (`AdminTransactionsService`) — added a
  `searchTransactions()` method to the existing `WalletRepository`/
  `WalletService` rather than a new repository, since it's the same data,
  just unscoped from a single user.

## Two real bugs caught and fixed while building this

1. **`AdminAnalyticsService` initially counted refunded `ABANDONED` games
   toward wagered/profit totals.** Since those bets are fully refunded (see
   phase 4's session-expiry handling), counting them as revenue would have
   been a genuine accounting error, not just a cosmetic one. Fixed to
   exclude `ABANDONED` games from wagered/paid-out/profit math while still
   counting them toward `activePlayers` (a refunded session is still real
   activity, just not revenue).
2. **`AdminSettingsService` was throwing plain `Error`s** for invalid input
   (a non-monotonic multiplier table, an out-of-range RTP percentage).
   Since `GlobalExceptionFilter` only gives clean-message treatment to
   `HttpException` subclasses, a plain `Error` would have surfaced to an
   admin as an opaque 500 instead of a clear 400. Fixed to throw
   `BadRequestException`, translating the framework-agnostic validation
   error (which stays a plain `Error` inside `game-engine`, deliberately,
   per phase 1's design) at the one boundary that's aware of HTTP.

## Verified behavior

Run via `npm run demo:admin` (all in-memory repositories, no database
needed):

- Setting Ace mode / equal-card rule via `AdminSettingsService` is
  immediately visible through `AdminSettingsGameRulesProvider` — proving
  the provider genuinely reads live settings rather than a cached or
  hardcoded default.
- A non-monotonic multiplier table is rejected before being persisted; a
  valid custom table is accepted and immediately live via the provider.
- An `ADMIN` attempting to ban a peer `ADMIN` is correctly rejected; an
  `ADMIN` banning a `PLAYER` succeeds; a `SUPER_ADMIN` banning an `ADMIN`
  succeeds. Both successful bans are confirmed present in the audit log.
- A small fabricated set of games (one cashout, two losses, one abandoned)
  produces the exact expected `gamesPlayed` (3, excluding the abandoned
  one), `totalWagered`/`totalPaidOut`/`houseProfit`, and `activePlayers`
  (4, including the abandoned session's player) — the abandoned-exclusion
  fix above is directly exercised, not just asserted.
- Cross-user transaction search correctly returns deposits from multiple
  users at once, and correctly narrows to one user when filtered — the
  distinction from a regular user's own scoped transaction history.
- All five demo scripts (`demo`, `demo:wallet`, `demo:auth`, `demo:api`,
  `demo:admin`) pass together, and the entire project — every controller
  and module across all five phases — type-checks cleanly
  (`tsc --noEmit`, zero errors).

## Running it yourself

```bash
npm install
npm run demo:admin    # in-memory repositories, no DB needed
```

## Notable design decisions worth knowing about

- **`AdminSettingsModule` has no dependency on auth/RBAC.** It's
  deliberately slim so `GameModule` can depend on it directly (to build
  `AdminSettingsGameRulesProvider`) without pulling in the entire admin
  dashboard, controllers included, just to read three settings values.
- **`AdminModule` imports the whole `GameModule`** to reuse
  `GAME_REPOSITORY` for analytics, rather than standing up a parallel
  repository. The trade-off: this also pulls in `GameModule`'s Redis client
  construction, which isn't otherwise needed for analytics. Accepted here
  since `ioredis` connects lazily and this avoids a second, drifting copy
  of game-persistence logic — but worth knowing about if `AdminModule` is
  ever split into its own deployable service.
- **RBAC tiers are a genuine design decision, not an afterthought**: the
  spec's admin dashboard lists "RTP configuration" and "house edge" as
  settings alongside "search users" and "ban users" as if they were the
  same tier of sensitivity. They aren't — one changes house economics for
  every player, the other is routine moderation — so this phase splits them
  into `ADMIN` (moderation, viewing) and `SUPER_ADMIN` (anything that moves
  money) rather than gating the whole dashboard behind one role.

## Next phase

Frontend: the Telegram Mini App (Next.js + React + TypeScript + Tailwind +
Framer Motion) — home, lobby, betting screen, gameplay screen with animated
cards, cashout screen, history, leaderboard, wallet — consuming the API
surface built across phases 1-5. Referral and promotion features (already
modeled in the schema as `Referral`/`Promotion`) are also still open.

---

# Phase 7: Rate Limiting, Security Headers, and the Abandoned-Game Sweep Job

Adds `@nestjs/throttler`, `@nestjs/schedule`, `helmet`, and
`src/common/guards/user-or-ip-throttler.guard.ts`; adds `Game.updatedAt`
and `GameSweepScheduler`.

## What's implemented

- **Helmet** (`main.ts`) — standard security headers on every response.
- **Rate limiting** (`@nestjs/throttler`) — a generous app-wide default
  (100 req/min), with tighter per-route limits on the endpoints that
  actually need them: `/auth/telegram-login` (10/min) and `/auth/refresh`
  (20/min) to slow down credential/initData brute-forcing, and
  `/game/start`, `/game/guess`, `/game/cashout` (30/min each) since no
  legitimate human plays faster than that — this doubles as a cheap first
  line of defense against a scripted client, on top of plain anti-spam.
- **`UserOrIpThrottlerGuard`** — tracks by authenticated user id when
  available, falling back to IP. The default IP-only tracking under-
  protects against one account spamming from a shared/rotating IP (mobile
  carrier NAT) and over-protects everyone else sharing that IP; bucketing
  by user id is strictly better once we know who's making the request.
- **The abandoned-game sweep job** (`GameSweepScheduler`, `@Cron` every 5
  minutes) — proactively finds `ACTIVE` games whose `updatedAt` is older
  than the Redis TTL plus a 5-minute safety buffer, refunds the bet, and
  marks each `ABANDONED`. Before phase 7, this only happened *reactively*
  — a player who simply closed the app mid-round left their bet debited
  indefinitely, since nothing would ever touch that game again to trigger
  the existing reactive check in `submitGuess`/`cashout`.
- **Double-checked before abandoning**: `updatedAt` being old is strong
  evidence the Redis-held session expired, but isn't proof by itself
  (clock skew, or a session that's just genuinely idle but still cached)
  — the sweep re-checks Redis for each candidate and skips any that are
  still actually live, rather than trusting the timestamp alone.

## A real design tension, resolved and documented rather than hidden

`UserOrIpThrottlerGuard` needs `req.user` already populated to bucket by
user id, which means it needs to run **after** `JwtAuthGuard` in the global
guard chain. Nest's cross-module `APP_GUARD` ordering follows module
resolution order, which isn't something I could fully pin down without
booting a live server. Rather than split three interdependent guards
(`JwtAuthGuard`, `UserOrIpThrottlerGuard`, `RolesGuard`) across two modules
and hope Nest resolves them in the intended order, I refactored so
`AuthModule` now just *exports* the guard classes, and **`AppModule`
registers all three as `APP_GUARD` itself, in one explicit array, in the
exact order intended**. This is a real architectural change made mid-phase
once I recognized the ordering dependency, not something I got right on
the first pass.

Even so: I was not able to boot a live server to empirically confirm the
guards actually execute in that order at runtime (see the honest caveat
already in the backend README about `npm run start` never having been
run). The graceful-degradation behavior means this isn't a correctness
risk even if the order turns out different than intended — worst case,
`UserOrIpThrottlerGuard` falls back to IP-tracking on authenticated routes
too, which is safe, just less precise than designed. Documented directly in
the guard's own doc comment as something worth confirming with a real
integration test before relying on the per-user precision in production.

## Verified behavior

Run via `npm run demo:sweep` (in-memory repositories, no database or Redis
needed):

- Three games fabricated in different staleness states: fresh (untouched),
  truly stale (old timestamp *and* no Redis state), and a deliberate false
  positive (old timestamp but Redis state still present). The sweep
  correctly refunds and abandons only the truly-stale one, correctly
  skips the false positive, and correctly leaves the fresh game untouched.
- The refunded amount is verified against the wallet balance directly
  (not just "a refund happened," but the exact right amount), and a
  `REFUND` transaction row is confirmed present for the correct game id.
- `UserOrIpThrottlerGuard.getTracker` is called directly (bypassing the
  need for a live HTTP pipeline, same approach as unit-testing `RolesGuard`
  in phase 3) and confirmed to return `user:<id>` when `req.user` is
  present and `ip:<address>` when it isn't.
- All six demo scripts (`demo`, `demo:wallet`, `demo:auth`, `demo:api`,
  `demo:admin`, `demo:sweep`) pass together, and the entire project —
  every controller and module across all seven phases, including the
  `AppModule` guard-ordering refactor — type-checks cleanly
  (`tsc --noEmit`, zero errors).

## Known limitation, stated plainly

**Single-instance rate limiting only.** `ThrottlerModule.forRoot(...)` uses
in-memory storage by default — correct for one running instance, but if
this API is ever horizontally scaled behind a load balancer, each instance
would enforce its own independent counter, silently multiplying the
effective rate limit by the instance count. `@nestjs/throttler` has a Redis
storage adapter for exactly this case, and `ioredis` is already a
dependency — this is a concrete, bounded follow-up, not a fundamental
redesign, if/when horizontal scaling is actually needed.

## Running it yourself

```bash
npm install
npm run demo:sweep
```

## Next phase

Referral & promotion features (schema exists, no service/API layer yet),
or a real deployment pass (Dockerfile, docker-compose for
Postgres+Redis+API together, CI). And, unchanged from every prior phase's
note: KYC/AML, age verification, and responsible-gambling controls remain
the hard blocker before any real-money deployment.

---

# Phase 4: REST API Layer

Adds `src/game/` (the API orchestration layer, distinct from the pure
`src/game-engine/`), `src/statistics/`, `src/leaderboard/`, `src/common/`,
plus `app.module.ts` and `main.ts`.

This is the integration phase: every previous phase's pure logic gets wired
to persistence and exposed over HTTP.

## The core design problem this phase solves

`GameEngineService` (phase 1) is pure in-memory domain logic — it has no
idea HTTP requests are stateless. Between a player's `/game/start` and their
next `/game/guess`, the server process may have forgotten everything unless
something persists the full `GameState` (including the deck and, most
sensitively, the revealed `serverSeed`) somewhere durable.

The design used here, leaning on Redis being in the specified stack for
exactly this kind of thing:

- **Redis holds the full live `GameState`** (`GameStateStore` /
  `RedisGameStateStore`) for exactly as long as a game is `ACTIVE`, keyed by
  `gameId`, with a refreshed TTL. This is where `serverSeed` and the deck
  actually live while play is in progress.
- **Postgres holds the durable, audit-relevant row** (`GameRepository` /
  `PrismaGameRepository`) — `betAmount`, config snapshot, `streak`,
  `cursor`, `currentMultiplier` — updated after every move, but with
  `serverSeed` staying `NULL` until the game ends. This is the concrete
  mechanism behind the promise made in phase 1's README ("serverSeed must
  never be queryable while ACTIVE") — it's not an app-level `SELECT` omission,
  it's simply not in Postgres yet.
- `finalizeGame()` is the one moment `serverSeed` moves from Redis into
  Postgres, at which point the Redis key is deleted.

**A real bug I caught while building this phase**: an earlier draft of
`PrismaGameRepository`/`InMemoryGameRepository` (written before I'd fully
thought through the Redis split) stored `serverSeed` directly in Postgres
at game creation — exactly the thing phase 1 said would never happen. I
found this by re-reading my own interface before wiring the controller, and
rewrote both repositories to match the corrected interface (`serverSeed`
absent from `createGame`, only ever set in `finalizeGame`) before moving on.

## What's implemented

- **`GameApiService`** — the orchestrator: `startGame` (create durable row →
  debit wallet → **compensating delete of the row if the debit fails**, so
  an insufficient-funds rejection never leaves an orphan `ACTIVE` game with
  no matching bet), `submitGuess`, `cashout`, `getHistory`,
  `getFairnessProof`.
- **Ownership + state guards**: every guess/cashout checks the durable row
  first — wrong user gets `NotYourGameException` (403), a non-`ACTIVE` game
  gets `GameNotActiveException` (409), regardless of what Redis has.
- **Honest handling of session expiry**: if the Redis-held state is gone
  (TTL expired) but Postgres still shows `ACTIVE`, `abandonExpiredGame()`
  refunds the bet via `WalletService.refundBet`, marks the row `ABANDONED`,
  and stores `serverSeed: null` — that game's fairness is genuinely
  unverifiable after the fact, and `getFairnessProof` reports that plainly
  (`{ verifiable: false, reason: ... }`) instead of faking a value.
  In practice this should be rare (TTL is refreshed on every action and set
  generously); if it ever fires in production it's worth alerting on.
- **`GameRulesProvider`** (`DefaultGameRulesProvider` for now) — Ace mode,
  equal-card rule, and the multiplier table are deliberately **not** part of
  `StartGameDto`. If a player could choose them per bet, they'd simply
  always pick whatever currently favors them, silently inverting the house
  edge the (future) admin dashboard is meant to control. The admin phase
  swaps in an `AdminSettingsGameRulesProvider` reading from the
  already-modeled `AdminSettings` table, with no change needed anywhere
  else — that's the point of depending on the interface.
- **Statistics & Leaderboard settlement**, wired into `GameApiService`: every
  settled game updates `Statistics` (games played, win/loss counts, wagered/
  won totals, best multiplier, longest streak — using `increment` for the
  additive fields so concurrent settlements for the same user can't race,
  and a conditional-retry "raise if higher" pattern for the two max-valued
  fields, same spirit as the wallet's optimistic locking); every **win**
  additionally updates the `Leaderboard` for both `ALL_TIME` and the current
  daily period.
- **Full endpoint set**: `POST /game/start`, `POST /game/guess`,
  `POST /game/cashout`, `GET /game/history`, `GET /game/:gameId/fairness`,
  `GET /wallet`, `GET /wallet/history`, `GET /leaderboard`,
  `GET /statistics` — matching the spec's Game API list.
- **`GlobalExceptionFilter`** — every error response gets a consistent shape
  (`statusCode`, `error`, `message`, `path`, `timestamp`); unexpected (5xx)
  errors log full detail (including stack) server-side but return a generic
  message to the client, never leaking internals.
- **`LoggingInterceptor`** — logs method/route/user/duration for every
  request.
- **`main.ts`**: global `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`
  so unexpected fields are rejected, not silently dropped; `transform` so
  DTO decorators actually run against real class instances), CORS, and
  Swagger docs served at `/docs`.

## Verified behavior

Run via `npm run demo:api` (fully in-memory — no Redis or Postgres needed):

- Starting a game debits the wallet immediately; the returned payload
  contains `serverSeedHash` and the current card code, never the seed or
  the deck.
- A full win → cashout sequence (the demo retries with small, disposable
  bets until one lands, so this path is exercised deterministically rather
  than left to chance) correctly credits the payout and updates the wallet.
- Game history reflects the settled game's final status and payout.
- The fairness proof for that same game verifies as `valid: true`.
- A different user attempting to guess on someone else's game is rejected
  with `NotYourGameException`; guessing on an already-finished game is
  rejected with `GameNotActiveException`.
- Betting more than the wallet balance is rejected, **and the game row it
  briefly created is gone afterward** — confirmed by checking the repository
  directly, not just trusting the exception was thrown.
- Simulating a Redis session expiry (deleting the in-memory store entry
  mid-game) correctly triggers an automatic refund, marks the game
  `ABANDONED`, and reports that specific game's fairness as unverifiable.
- Statistics and the all-time leaderboard both reflect the settled games
  afterward (1 win, 1 loss, correct wagered total; one leaderboard entry
  with the correct winnings).

All four phases' demos (`demo`, `demo:wallet`, `demo:auth`, `demo:api`) were
re-run together after this phase to confirm nothing regressed.

## Running it yourself

```bash
npm install
npm run demo:api        # fully in-memory, no external services needed
npm run prisma:generate # generate the real Prisma client
# npm run start          -- boots the real HTTP server (needs DATABASE_URL, Redis, and the auth .env vars)
```

`main.ts`, `app.module.ts`, and all the Prisma-backed repositories are real
production code but — like the Prisma/Redis pieces in earlier phases —
weren't executed against a live Postgres/Redis instance in this delivery,
since neither is available in the environment this was built in. Run them
against real infrastructure as part of your own integration testing before
relying on them.

## Notable design decisions worth knowing about

- **`GameEngineService` stays completely decoupled from persistence.** It
  never sees `GameRepository`, `GameStateStore`, or `WalletService` — only
  `GameApiService` knows about all of them. This is why phase 1's demo still
  works completely unchanged; the pure engine was never touched by any of
  the persistence work in this phase.
- **The wallet debit and the Postgres row creation are two separate writes,
  not one cross-aggregate transaction** — `createGame()` happens first (cheap,
  reversible), then the wallet debit, with a compensating delete on failure.
  This is a deliberate saga-style choice, not an oversight: Wallet and Game
  are different bounded contexts here, and a single distributed transaction
  across them would need two-phase commit machinery this stack doesn't have.
  The compensating-delete approach gives the same observable guarantee
  (never an `ACTIVE` game with no matching bet) with far less complexity.
- **`appendMove` is written on every single guess**, not batched until the
  game ends — so a server crash mid-game still leaves a complete move
  history in Postgres up to the last successful guess, even though the
  seed itself would be lost with the Redis key in that scenario.

## Next phase

The admin dashboard and settings API: user/wallet/game management, the
`AdminSettingsGameRulesProvider` replacing `DefaultGameRulesProvider`,
analytics endpoints, and audit logging — plus the role-gated `@Roles(Role.ADMIN)`
routes that phase 3's `RolesGuard` was built for but nothing has used yet.
