# Hi-Lo (Kef-Zk) — Admin Dashboard (frontend)

Next.js 14 + TypeScript + Tailwind, consuming the `/admin/*` API built in
backend phase 5. This is the back-office view of the same product as
`frontend/` (the player Mini App) — same design tokens (felt/brass/brick/
parchment/sage, Manrope + IBM Plex Mono), different register: dense tables
built for scanning, not a single hero moment. There's no equivalent of the
player app's Streak Ladder; the signature element here is the dashboard's
live ticker strip (a pulsing "live" indicator next to auto-refreshing
analytics) and disciplined tabular alignment throughout.

## The one real assumption made here

**Admins log in the same way players do: through Telegram.** There's no
separate username/password system. `useAdminAuth` reuses the exact
`/auth/telegram-login` flow from the player app, then gates on role —
a real `PLAYER` account gets a clear "Access denied" screen (distinguished
in the code from an actual login failure), not a broken page.

This means **the admin dashboard must be opened from inside Telegram**
(desktop or mobile — Telegram Desktop supports Mini Apps too), via a link
your bot presents to admin accounts, not a plain browser bookmark. If you
want ops staff to access this from an ordinary browser tab instead, that's
a real, reasonable follow-up — it would mean adding a second login path to
the backend (e.g. the Telegram Login *Widget* for websites, which uses a
different verification scheme than the Mini App `initData` check the
backend deliberately implements today — see the phase 3 README for why
those two aren't interchangeable) or a conventional password login for
staff accounts. Flagging this now rather than presenting the Telegram-only
approach as the only possible design.

## Pages

- `/` — Dashboard: house profit, wagered/paid-out, games settled, active
  players, win/loss ratio, actual RTP (computed live, to compare against
  the *target* RTP set in Game Settings), average session duration. Has a
  date-range picker and auto-refreshes every 30 seconds.
- `/users` — search by Telegram ID or username, list results, click through
  to detail.
- `/users/[userId]` — wallet balance, activity stats, ban/unban. Ban
  requires a reason (stored in the audit log). A ban attempt the backend
  rejects for privilege-hierarchy reasons (an ADMIN trying to ban a peer
  ADMIN) surfaces the backend's actual message rather than a generic error.
- `/game-settings` — Ace mode, equal-card rule, multiplier table (editable
  row-by-row), target RTP. Viewable by any admin; every mutating control is
  wrapped in `RoleGate` and shows *why* it's disabled for a non-Super-Admin
  rather than just hiding it — the backend enforces this server-side
  regardless (`RolesGuard`), this is purely UX.
- `/transactions` — cross-user transaction search (unlike a player's own
  scoped wallet history).
- `/audit-log` — Super Admin only, matching the backend's own
  `@Roles(SUPER_ADMIN)` on this controller (the audit trail is itself a
  sensitive security surface).

## Verified

Same approach as the player frontend: the entire project — every page,
hook, and component — was type-checked (`tsc --noEmit`) against real
React/Next.js type definitions, zero errors. Not run in a real browser;
see the player frontend's README for the general caveat about what a
type-check can and can't catch (it confirms structural correctness — props
line up, API response shapes match what's destructured — not visual or
runtime behavior).

## Running it yourself

```bash
npm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_BASE_URL at your running backend
npm run dev                  # runs on :3001 so it can run alongside the player app's :3000
```

Needs the backend running with an admin/super-admin user already seeded
(there's no signup flow for that — the first admin account has to be
promoted directly in the database, since granting ADMIN/SUPER_ADMIN through
the API would itself need to be gated by an existing admin, which is a
legitimate bootstrapping problem worth solving deliberately rather than
via a backdoor left in the code).
