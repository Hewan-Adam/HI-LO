# Hi-Lo (Kef-Zk) — Frontend (Telegram Mini App)

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion,
consuming the backend API built across phases 1-5.

## Design system: "a high-roller card table at 1am"

- **Color** — `felt` (near-black emerald, the table surface) as the base,
  `brass` (antique gold) reserved exclusively for *value* — multiplier,
  cashout, wallet balance — and `brick` (a muted red-brown, not an alarm
  red) for the "lower" direction and loss states. This deliberately avoids
  the generic green=win/red=lose gambling-app cliché (also a real
  accessibility problem for colorblind players): brass always means money,
  brick always means "down/lost," and the two never overlap in meaning.
- **Type** — Fraunces (a display serif with real presence) for the one
  big-number hero moments — the multiplier, the cashout amount, page
  headlines; Manrope for UI chrome; IBM Plex Mono for wallet/ledger figures,
  giving balances a distinct "precise financial" register from the flashy
  win moment.
- **Signature element** — the **Streak Ladder** (`components/StreakLadder.tsx`):
  the multiplier steps rendered as an actual ascending row of rungs the
  player visibly climbs, lit gold as reached, current rung pulsing. This is
  the one place the design spends its "boldness budget"; everything else —
  buttons, nav, panels — stays quiet and disciplined around it.

## Architecture

- **`lib/api.ts`** — a single fetch wrapper handling auth headers and
  **automatic, single-flight token refresh**: if any request 401s, it
  transparently calls `/auth/refresh` (deduplicated so five simultaneous
  401s trigger exactly one refresh call, not five racing ones) and retries
  the original request once before surfacing an error.
- **`lib/types.ts`** — mirrors the backend's DTOs/response shapes by hand,
  the same intentional decoupling the backend itself uses between its
  domain enums and Prisma's generated enums (see `backend/src/game/interfaces`).
- **`hooks/useTelegramWebApp.ts`** — wraps `window.Telegram.WebApp` (the
  global Telegram's own `telegram-web-app.js` injects) directly, rather than
  a third-party SDK wrapper. It degrades to harmless no-ops outside Telegram
  (e.g. local development in a normal browser), so the rest of the app never
  needs to branch on "am I actually inside Telegram right now?"
- **`hooks/useAuth.ts`** — on a fresh Telegram session, calls
  `/auth/telegram-login` with `initData`. On a *resumed* session (a token
  pair already in storage from a previous visit), it calls `GET /auth/me`
  to both confirm the session is still valid (an account can be banned, or
  a refresh-token family revoked, between visits) and populate `user` — an
  earlier draft left `user` null on resume, which I fixed before finalizing.
  One known cosmetic gap noted in the code: `/auth/me`'s JWT-derived payload
  doesn't carry `username`, so a resumed session shows a generic "Player"
  label until the next full Telegram login. Functionally harmless, worth
  knowing about.
- **`/play` seeds its initial state from the lobby's response** (game id,
  first card, bet amount passed as query params) rather than an extra round
  trip on mount, then every subsequent card/streak/multiplier update comes
  from the `submitGuess`/`cashout` response bodies directly.

## Verified

Unlike the backend phases, there's no Postgres/Redis/live-server
integration test possible here (a Telegram Mini App only really "runs"
inside Telegram, or in a WebView pointed at a dev server). What **was**
verified: the entire project — every page, hook, and component — was
type-checked end to end (`tsc --noEmit`) against real React/Next.js/Framer
Motion type definitions, with zero errors, and one real bug (`useAuth` not
populating `user` on session resume) was caught and fixed during that
process. I also found and fixed a build-breaking issue from experience with
Next.js's App Router: `/play` uses `useSearchParams()`, which throws a
build error under static export unless wrapped in a `<Suspense>` boundary —
fixed by splitting the page into an inner component and a
`Suspense`-wrapped default export.

**Not done**: actually running `next dev`/`next build` — there's no network
access in the environment this was built in to install the real `next`,
`react`, `framer-motion` packages, so nothing here was rendered in a real
browser or WebView. The type-check gives strong confidence the code is
structurally correct (props line up, hooks are called correctly, API
response shapes match what components destructure), but it cannot catch
runtime-only issues (a CSS class typo, an animation that looks wrong, a
layout that doesn't actually fit a 380px Telegram viewport). Treat this as
a strong first draft to run `npm install && npm run dev` against, not as
already visually confirmed.

## Pages

- `/` — Home: balance, quick stats, "Play" entry point. Doubles as the
  profile screen (Telegram already provides identity chrome, so a separate
  `/profile` route would just duplicate this).
- `/lobby` — bet amount selection, starts a game.
- `/play` — the core gameplay loop: card, streak ladder, Higher/Lower,
  cash out.
- `/wallet` — balance + transaction history.
- `/leaderboard` — today / all-time toggle.
- `/history` — past rounds.

## Running it yourself

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at your running backend
npm run dev
```

Needs the backend running (phases 1-5) with `CORS` enabled (already the
case in `main.ts`) and reachable at `NEXT_PUBLIC_API_BASE_URL`.

## Not yet built

Referral and promotion UI (the backend's `Referral`/`Promotion` models
exist but have no service/API layer yet either — this would be a backend
phase before it's a frontend one). The admin dashboard frontend (phase 5
built the backend API for it) is also not part of this phase; it would
reasonably be a separate internal tool rather than part of the player-facing
Mini App.
