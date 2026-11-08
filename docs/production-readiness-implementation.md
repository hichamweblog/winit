# Implementation record — habit history, icons, and production readiness

This document records the four changes requested after the Calm Sea adoption, what
was verified, and **what is still not done**. It is the companion to
[`production-readiness-review.md`](./production-readiness-review.md) (the gap
analysis) and [`design-system-adoption.md`](./design-system-adoption.md) (the
design-system record).

---

## Verification summary

Everything below was run against a real production build, not a dev server.

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` | **36 pass / 0 fail** |
| `npm run test:design` | **18/18 checks, 132 contrast pairs** |
| `npm run build` | pass · First Load JS **131 kB** (was 103 kB) |
| `npm audit --omit=dev --audit-level=high` | **0 vulnerabilities** |
| `scripts/api-smoke.mjs` (security regression, real server) | **92/92** |
| `auth-journey.mjs` (browser: register → use → sign out) | **21/21** |
| `history-check.mjs` (contribution graph + sidebar actions) | **31/31** |
| `history-mobile.mjs` (390 / 768 / 1100 px, touch + fine pointer) | **15/15** |
| `adopt-audit.mjs`, `views-audit.mjs`, `smoke.mjs` (pre-existing suites) | all still pass · **26 axe scans clean** |
| `npm run db:backup` → `db:reset --yes` → `db:migrate` → `db:seed` | pass · backup integrity `ok` |

The API suite runs against a server with **demo mode off**, so the authentication
boundary is genuinely exercised rather than bypassed.

---

## 1. Habit history as a GitHub-style contribution graph

The old flat 21-square strip is gone. Each habit now has a real contribution
graph.

**Layout** — 7 weekday rows × N week columns, Saturday-first. Because the app is
RTL, the oldest week sits at the right edge and time flows right-to-left with
Arabic reading order. On narrow cards the grid scrolls, and it **opens on the
most recent weeks** (in RTL that is the far end of the scroll range, so the
browser default would otherwise have shown the oldest months first).

**Five intensity levels** driven by the share of the daily target met:
`0` empty · `1` < ⅓ · `2` ≥ ⅓ · `3` ≥ ⅔ · `4` met. A binary check-in habit is
therefore either empty or full, like a GitHub day with or without contributions.
Levels are `color-mix(in oklab, …)` against the habit's own goal colour, so each
habit keeps its identity in both themes.

**Range presets** — 3 أشهر / 6 أشهر / سنة (91 / 182 / 364 days), fetched on demand
and cached per habit + range so switching views does not refetch.

**Also included** — month labels, alternating weekday labels, an
`أقل ▢▢▢▢ أكثر` legend, a hover/focus tooltip, a live readout, and a four-stat
summary (completed days, completion rate, current streak, longest streak).

**Accessibility** — a real ARIA grid (`role="grid"` / `row"` / `gridcell"`) with
roving tabindex and arrow-key navigation. In RTL, `ArrowRight` walks *back* to an
older week; `Home`/`End` jump to the oldest/newest week; `PageUp`/`PageDown` jump
to the first/last weekday. Every in-range cell carries an exact text label
(`الأحد، 8 نوفمبر 2026: 5 صفحات، اكتمل الهدف`), so colour is never the only
carrier. axe reports zero violations.

**New endpoint** — `GET /api/habits/:id/history?days=…`, clamped to 7–730 days.
`overview` only returns logs from the 1st of the current month, which is not
enough for a year view; keeping history separate also keeps the initial payload
small.

**Files** — `src/lib/habit-history.ts` (pure grid/streak maths, 7 unit tests),
`src/app/components/HabitHistory.tsx`, `.contrib*` rules in `globals.css`.

### One deliberate removal

The habit card header used to show a streak pill computed from a **21-day**
window. The graph computes streaks over up to a year. Two different numbers for
the same concept is a bug, so the pill was removed and the graph's stats row is
now the single source of truth. `getHabitStreak()` remains in `core.ts` (still
tested) but is no longer used by the UI.

---

## 2. Sidebar project actions hidden until needed

`.project-manage` is `opacity: 0` at rest and revealed by `.project-item-row:hover`
or `:focus-within`, so the row is quiet until you point at it or tab into it. The
buttons stay in the tab order and are never `display: none` — keyboard users get
them on focus.

Under `@media (pointer: coarse)` they are always visible, because a touch user
cannot hover.

**Why not `(hover: none)`?** It was tried and rejected: that query also matches
remote-desktop and headless sessions where a real mouse *does* hover, which
defeated the hide-by-default behaviour on those machines. `pointer: coarse` is
the reliable "primary input is touch" signal.

---

## 3. Icon library replaced, emoji removed

**Lucide → Tabler Icons** (`@tabler/icons-react@^3.50.0`). Tabler is the closest
match to design-system §7: outline only, 24 px grid, rounded caps and joins. Its
default stroke is 2; the wrapper sets **1.75** to match the spec.

All icons are imported from **`src/app/icons.tsx`**, never from the vendor
package. Call sites use semantic names (`Logout`, `ChartBar`, `CircleCheck`), so
the vendor, stroke weight and default size can be changed in one place. The
wrapper translates Lucide-style `strokeWidth` to Tabler's `stroke` prop and adds
`aria-hidden` unless an `aria-label` is present.

Each wrapper is annotated `/*#__PURE__*/` so the bundler drops unused icons.
Verified: the shipped icon chunk is **12 kB raw / 2.7 kB gzipped**, and probes for
`IconAbacus`, `IconZzz`, `IconBrandTwitter`, `IconBallFootball` are all absent —
tree-shaking works, the full 5 000-icon set does not ship.

**Emoji sweep** — the only pictographs in the app were `↵` and `⌘` in the
keyboard hint; they are now plain `Ctrl + Enter` (the real modifier combination
is still exposed via `aria-keyshortcuts`). Docs used ✅/❌ → `PASS`/`FAIL`; the
playground's `✓` glyph → an inline SVG check. A new gate check (`no-emoji`) fails
the build if any pictograph reappears in `src/`.

**Bundle cost** — First Load JS went 103 → 131 kB. The icon chunk accounts for
only ~2.7 kB gzipped of that; the rest is the new history component, its grid
library, the auth gate and the client API layer. This is a real increase and is
reported rather than hidden.

Also fixed in passing: the priority-matrix quadrants used four hand-picked hex
values outside the palette; they now use `--danger` / `--accent` / `--warning` /
`--text-muted`.

---

## 4. Production readiness

### 4.1 Real authentication and tenant isolation (was P0-01)

The API previously hardcoded `DEMO_USER_ID` / `DEMO_WORKSPACE_ID`: anyone could
read and write every task and journal entry. That is now closed.

- **Passwords** — scrypt (N=16384, r=8, p=1, 64-byte key, 16-byte random salt) via
  `node:crypto`. Parameters are stored with the digest so they can be raised
  later. Comparison is `timingSafeEqual`. Unknown emails still run scrypt against
  a dummy digest, so response time does not reveal whether an account exists, and
  the error message is identical in both cases.
- **Sessions** — 32 random bytes; only the **SHA-256 digest** is stored, so a
  database leak does not hand over usable sessions. 30-day expiry,
  `HttpOnly` + `SameSite=Lax` + `Secure` cookie. Expired rows are purged on login
  and via `npm run sessions:purge`.
- **Registration** creates the user, their personal workspace and the owner
  membership in a single transaction, using the `users` / `workspaces` /
  `memberships` tables that already existed but were unused.
- **Every data route** derives `userId` / `workspaceId` from the session — never
  from a constant, never from the request body. Cross-tenant reads, writes,
  deletes and foreign-key references all return 404 (verified in both directions
  with two real accounts).
- **CSRF** — double-submit token: a script-readable `winit_csrf` cookie echoed in
  `x-csrf-token`. Mutations also require `content-type: application/json` (415
  otherwise) and a same-host `Origin`, which together block simple cross-site
  form posts. The origin check compares **hosts, not full origins**: behind a
  TLS-terminating proxy the browser sends `https://app.example.com` while Next
  may reconstruct `http://…` internally, and an exact-scheme match would 403
  every mutation in that very common deployment. A look-alike host such as
  `app.example.com.evil.test` is still rejected (both cases are regression-tested).
- **Rate limiting** — fixed-window counters: login 10/15 min, registration
  5/15 min, writes 240/min, reads 600/min. `429` carries `Retry-After`.
  `X-Forwarded-For` is only trusted when `WINIT_TRUST_PROXY=1`.
- **UI** — an auth gate with sign-in / create-account, password reveal, inline
  server errors, and a sign-out button in the sidebar. A 401 from any request
  dispatches an event that returns the user to the login screen instead of
  leaving a broken board.

**Demo mode.** `WINIT_DEMO_MODE=1` serves one shared, passwordless, **public**
scratch workspace to anonymous visitors — this is what the live preview runs so
the app is still clickable without an account. It is off by default, reported by
`/api/health`, surfaced as a warning banner in the UI, and logged loudly at
bootstrap. **Never enable it where real data lives.**

### 4.2 Strict validation and exact routing

- All DTOs are `.strict()`: an unknown key is a 400, so `workspaceId` / `id` /
  `createdBy` cannot be mass-assigned.
- Dates are validated as **real calendar dates** by round-tripping through UTC —
  `2026-02-31` and `2025-02-29` are rejected, not just regex-matched.
- Route branches match an **exact segment count**, so `/api/tasks/a/b/c` is a 404
  rather than silently matching `/api/tasks/:id`.
- Body size capped at 64 kB (413).
- Journal search escapes `%`, `_` and `\` and supplies an explicit `ESCAPE`
  clause, so `q=%` searches for a literal percent sign instead of matching every
  entry.

### 4.3 Correctness fixes from the review

- **Idempotent `/complete`** — `COALESCE(completed_at, now)` keeps the original
  completion timestamp on retry. Same for `PATCH {status:"completed"}`.
- **Focus duration cannot be inflated** — the server clamps the client-reported
  `actualSeconds` to wall-clock elapsed time (+5 s grace). A claimed 14 400 s
  seconds after starting is now stored as 5 s.
- **Project deletion** moves tasks to Inbox and deletes the project in one
  transaction instead of two unguarded statements.

### 4.4 Headers, health, observability, failure states

- **CSP** (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri`/`form-action 'self'`), HSTS, `nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, COOP/CORP. `X-Powered-By` removed.
  Fonts are self-hosted, so no third-party host is allowed.
- **`GET /api/health`** — liveness + a real `SELECT 1` readiness probe, latency,
  and the demo-mode warning flag. No version, path or config detail.
- **Request-id logging** — one structured JSON line per request with method,
  pathname, status and duration. Query strings are deliberately excluded because
  they can contain journal search terms. Stack traces never reach the client.
- **`error.tsx`, `global-error.tsx`, `not-found.tsx`** — retry instead of a blank
  screen; only the digest is shown, which correlates with the server log.

### 4.5 Bootstrap, migrations, operations

- **Committed migrations** — `drizzle/0000_init.sql` + journal.
  `npm run db:migrate` applies them; `drizzle-kit push` is no longer part of any
  startup path. CI fails if the schema changes without a committed migration.
- **`npm run dev` no longer auto-seeds or auto-pushes.** Setup is an explicit
  `npm run dev:setup`.
- **`npm run bootstrap`** — checks Node ≥ 22, creates the data directory, applies
  migrations, and stops. It never seeds.
- **`npm run db:seed` refuses to run in production** unless
  `WINIT_ALLOW_PRODUCTION_SEED=1`.
- **`npm run db:reset` refuses to run in production**, requires `--yes`, and takes
  a verified backup first.
- **`npm run db:backup`** uses SQLite's online backup API (safe while the app is
  writing, unlike a file copy of a WAL database) and runs `integrity_check` on the
  result.
- **Node pinning** — `engines.node >= 22`, `.nvmrc`, `packageManager`.
- **CI** (`.github/workflows/ci.yml`) — typecheck, unit tests, design gate,
  migration-drift check, build, production audit, then a second job that boots a
  real server and runs the 92-check API suite.
- **Dockerfile** — multi-stage, non-root `node` user, tini for signal handling,
  `/app/data` volume, and a `HEALTHCHECK` against `/api/health`. Migrations run at
  container start, not build time. `output: 'standalone'` is gated behind
  `WINIT_STANDALONE=1`, set only in the image's build stage — `next start` warns
  and misbehaves with standalone output, so local and CI production runs keep the
  default output.
- **`.env.example`** documents every switch, with the dangerous ones marked.

### 4.6 Two bugs found by the new tests

1. **Fail-open password verification.** `Buffer.from(str, 'base64url')` silently
   drops invalid characters, so a corrupt digest could decode to an *empty* key.
   A zero-length derivation compared equal to a zero-length key and
   `timingSafeEqual` returned true — authenticating **any** password against that
   digest. Fixed with minimum length floors (salt ≥ 16 bytes, key ≥ 32 bytes) and
   a regression test.
2. **Session cleanup deleted live sessions.** The opportunistic purge in
   `createSession` matched every row for the user, including the session just
   created. Scoped to `expiresAt < now` before it ever shipped.

Two further deployment issues were found by running the real server rather than
reading the code: the exact-scheme origin check (above) would have broken every
mutation behind the preview's TLS proxy, and `output: 'standalone'` made
`next start` emit a warning on every local production run.

A fifth issue was caught by the new `token-refs` gate check: three CSS rules
referenced `--danger-soft`, `--warning-soft` and `--lh-heading`, which do not
exist. A typo in `var()` renders silently in the browser and passes typecheck, so
the gate now verifies that every referenced token is declared.

---

## Deployment

```bash
npm ci
npm run bootstrap          # Node check + migrations, no seed
npm run build
npm start                  # or: node .next/standalone/server.js
```

Set at minimum:

| Variable | Production value |
| --- | --- |
| `DATABASE_URL` | absolute path on a **persistent volume** |
| `WINIT_PUBLIC_ORIGIN` | `https://your.domain` (required behind a proxy) |
| `WINIT_TRUST_PROXY` | `1` only if a trusted proxy sets `X-Forwarded-For` |
| `WINIT_DEMO_MODE` | **unset** |
| `WINIT_INSECURE_COOKIES` | **unset** (keeps session cookies `Secure`) |

Schedule `npm run sessions:purge` daily and `npm run db:backup` on whatever
cadence your recovery-point objective needs, and **test a restore** — a backup
you have never restored is a hypothesis, not a backup.

---

## What is still not done

These are real gaps, not polish. The app is now safe to put behind authentication
on a single instance; it is not yet a hardened multi-tenant SaaS.

**Security**

- **CSP still allows `unsafe-inline`** for scripts and styles. Next's inline theme
  bootstrap and hydration payload need it. Moving to a nonce-based `script-src`
  requires middleware to inject a per-request nonce.
- **Rate limiting is in-process memory.** Correct for one instance, useless
  across replicas. Needs Redis or equivalent before horizontal scaling.
- **No email verification, password reset, or MFA.** A user who forgets their
  password has no recovery path.
- **No account deletion or data export endpoint.** Required for GDPR-style
  requests; backup/restore exists but per-user export does not.
- **No session listing / "sign out everywhere".** Logout ends only the current
  session.
- **No audit log** of security-relevant events beyond request logs.
- Password policy is length-only. Fine by current guidance, but there is no
  breach-password check.

**Data and scale**

- **SQLite on a single node.** WAL handles concurrent reads well, but this is not
  a multi-writer or multi-region database. The schema is already tenant-scoped,
  so a Postgres port is mechanical but has not been done.
- **Journal pagination is still offset-based**, so an insert between pages can
  duplicate a row. Cursor pagination is the fix.
- Starting a focus session still silently completes any previous running one.
  That is now transactional-ish but remains a product decision worth revisiting.
- No retention policy for old focus sessions or request logs.

**Frontend**

- The contribution graph is verified by axe and by keyboard simulation, but
  **not by a real screen reader**. NVDA/VoiceOver announcement quality is
  unverified.
- 200 % zoom and real-device Naskh rendering at 130 % are still untested.
- The 768 px nav/footer overlap noted in the original review is **not fixed**.
- Six design-system items remain deliberately unimplemented (§6.1 collapsed
  rail, §8.13 quick-add parsing, §9 Projects/Focus/Stats screens, §8.10 charts,
  §8.4 swipe gestures, §8.8 completion tone) — see the adoption record.

**Operations**

- The Dockerfile is written and reviewed but **has not been built in this
  environment** (no Docker daemon). Treat it as unverified until CI or a local
  `docker build` runs it.
- The CI workflow has not executed on GitHub yet; it is validated only by running
  the same commands locally.
- No error tracking (Sentry or similar), no metrics, no alerting.
- `npm audit` with dev dependencies still reports 4 moderate advisories in the
  `drizzle-kit → @esbuild-kit → esbuild` chain. Production dependencies are clean.
