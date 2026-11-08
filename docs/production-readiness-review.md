# Winit — Production-Readiness Review & Improvement Plan

**Review date:** 7 November 2026  
**Reviewed commit:** `f6bbc52dacf16931f6ab490a1e890f7c4e66e7b2`  
**Scope:** UI, UX, Arabic RTL/responsive behavior, accessibility, domain logic, API, persistence, security/privacy, and release operations.  
**Method:** source walkthrough + production build/typecheck/unit tests + Chromium browser checks at 320/390/768/1024/1440 px + axe scans + HTTP/API and failure-injection probes. Evidence is in [`review-assets/`](./review-assets/).

> **Verdict: a promising local MVP, not a public production service.** The Arabic-first interface and the main task/habit/journal/focus journeys work, but the running API has no authentication boundary, several core logic paths can corrupt progress or statistics, and deployment/data-recovery fundamentals are missing. Do not expose real user data publicly until the P0 gates below pass.

This review is an audit and plan only; application behavior was not changed in this pass. It complements the earlier [`product-review.md`](./product-review.md), which did not include browser/device verification.

## Severity and readiness

| Priority | Meaning |
|---|---|
| **P0** | Launch blocker: unsafe exposure, data ownership/loss risk, or unsafe deployment. |
| **P1** | Must fix before general production use: core correctness, recovery, accessibility, or durable storage. |
| **P2** | Important polish/product work; schedule for beta or shortly after the core is stable. |

| Area | Current assessment |
|---|---|
| Visual foundation | Good Arabic RTL identity, consistent tokens, light/dark themes. Needs hierarchy, typography, and responsive refinements. |
| Core UX | Main CRUD journeys work. Drawer/modal interaction, dirty-form safety, recovery states, and feature discoverability need work. |
| Domain logic | Partially correct. Timer accounting, habit progress, completion timestamps, and aggregate statistics have confirmed defects. |
| Security/privacy | **Blocked.** Fixed demo identity; all visitors share readable/writable data, including journal content. |
| Data/operations | **Blocked for hosted production.** No versioned migration/backup/restore/export/deletion path; the development startup command mutates schema and reseeds data. |
| Quality engineering | Build/typecheck/5 helper tests pass. No API, browser, accessibility, load, or restore gates in CI. |

## What already works (validated)

- Task create/edit/delete with confirmation; project deletion preserves tasks by moving them to Inbox.
- Journal create/edit/search/delete, strict journal date validation, unsaved-change confirmation, and stale-search-response guarding.
- Focus start/finish happy path; timestamp-based countdown rather than counting interval callbacks.
- Theme persistence, customizable mobile tabs, overdue tasks included in Today, and habit streaks requiring the target value.
- Production build, TypeScript, and all 5 existing unit tests pass.
- 15 axe scans across mobile/desktop, both themes, key pages and dialogs reported **0 violations** in the tested states. This is not an accessibility certification; manual checks still found focus/layering defects and contrast risks automated scans do not cover.

---

# 1. P0 — Release blockers

## P0-01 · Authentication, authorization, and journal privacy

**Evidence:** `src/db/index.ts:18-19` exports fixed demo IDs; `src/app/api/[...path]/route.ts` uses them for every read/write. Runtime probes created and searched a journal entry without a session, and read all tasks unauthenticated. The UI says “نسخة خاصة بك” while the deployment is shared. Journal content is plain text in SQLite.

**Impact:** any visitor can read/modify/delete another visitor’s tasks, habits, and reflections. `workspaceId` columns are not isolation when every request receives the same workspace.

**Required change**
1. Choose a maintained auth provider/library compatible with Next 15/React 19, or implement a reviewed credential flow (Argon2id, verification/reset, throttling). Do not hand-roll cryptography.
2. Derive user and workspace from a verified server-side session; never from client constants or body fields. Use Secure/HttpOnly/SameSite cookies, expiry, rotation, logout/revocation; store only hashed session tokens if tokens are persisted.
3. Authorize every resource against membership and role, with composite tenant constraints or equivalent service-level checks so child rows cannot reference another tenant’s parent. Keep journal entries **owner-only by default**, even inside a shared workspace, unless explicit sharing is designed.
4. Add cross-user/cross-workspace denial tests, CSRF/origin checks for cookie-authenticated writes, rate limits, and redacted audit logs.
5. Replace “private” demo copy with an explicit shared-demo warning; isolate demo data from real accounts.

**Acceptance:** unauthenticated protected requests return 401/redirect; user A cannot read/update/delete user B’s IDs (404/403); revoked membership loses access; logout/expiry invalidate sessions; cross-origin writes are rejected; journal privacy tests pass.

## P0-02 · Durable data lifecycle: migrations, backup, restore, export, deletion

**Evidence:** no `drizzle/` migration history or CI; `db:push` uses `strict:false`; `db:reset` deletes only the main SQLite file; no backup/export/account-deletion flows. README documents local persistence only.

**Impact:** schema changes are not safely repeatable; a host/disk failure can lose journals and history; users cannot retrieve or erase their data.

**Required change**
- Generate and review versioned migrations; test fresh install and upgrade from the previous release. Separate migrate from application startup.
- Define backup encryption, retention, monitoring, and a restore drill with initial targets (e.g. RPO ≤ 24 h, RTO ≤ 4 h, then tighten). For SQLite include WAL-safe backup/restore, not just copying/removing the `.db` file while running.
- Provide user-facing export (tasks/habits/focus JSON; journal JSON/Markdown) and verified account deletion with cascade/retention rules.
- Document data classification, encryption at rest/in transit, access controls, and privacy/retention policy. Do not market application-level encryption or E2EE unless implemented.

**Acceptance:** migration up/upgrade tests pass in CI; a backup restores to a clean environment with verified counts/checksums; export round-trips; account deletion removes owned data and sessions within policy.

## P0-03 · Safe deployment/bootstrap and demo seeding

**Evidence:** `package.json` `dev` runs `db:push && db:seed` on every start. On the initial clean checkout, `db:push` failed because `data/` did not exist, then seeding failed with “no such table: users”; creating `data/` was required. `drizzle.config.ts` hard-codes `./data/winit.db` and ignores the documented `DATABASE_URL`. An isolated-copy probe confirmed deleting a seeded habit and rerunning `db:seed` recreates it.

**Impact:** first-run setup is unreliable; the development startup command mutates schema and can resurrect user-deleted starter data, and copying that pattern into production would be unsafe; reset tooling is destructive and environment-blind. The current `start` script itself does not push/seed.

**Required change**
- Make first-run setup explicit and idempotent; create/validate the data directory or use migrations that own setup.
- Honor one validated database URL across runtime, migrations, seed, and reset; guard reset to non-production with confirmation.
- Run demo seeding only on explicit command/flag, once per demo workspace, with a persisted seed marker. Never reseed production user data on boot.
- Pin Node 22 (the native dependency requires `>=22`, while README says Node 20), add `.nvmrc`/container baseline, and verify `npm ci` on a clean machine.

**Acceptance:** clean checkout → install → migrate → start works without manual directory fixes; restarting does not change user data; production start performs no schema push/seed; reset cannot target production.

---

# 2. Logic and data-integrity findings

## P1-01 · Focus sessions silently replace and miscount work

**Evidence:** `route.ts:151-165` closes every running session as `isCompleted:true` when a new one starts. Probe: starting a second session marked the first completed after ~1 s without confirmation. `route.ts:168-170` trusts client `actualSeconds`; a finish request claiming 14,400 s immediately after start was accepted. `page.tsx:219` adds uncapped wall-clock time for an active Pomodoro to Today, while the weekly chart uses only stored `actualSeconds`.

**Impact:** abandoned timers inflate completed-session counts and focus statistics; concurrent tabs/tasks overwrite sessions; clients can fabricate duration; Today and week totals disagree.

**Fix:** model explicit states (`running`, `paused`, `completed`, `abandoned`, `expired`), one active session per user/workspace enforced transactionally, server-authoritative elapsed time, idempotent finish, and a conflict/replace confirmation. Split duration across midnight consistently; define stopwatch limits instead of silently truncating at 4 h.

**Acceptance:** starting during an active session requires an explicit decision; abandoned ≠ completed; finish duration matches server elapsed time; repeated finish is idempotent; Today/week/project totals reconcile across midnight and reload.

## P1-02 · Automatic timer completion fails once and never retries

**Evidence:** `page.tsx:597-603` sets `autoFinishedSession` before the request. Failure injection returned 503 once: the dock stayed at `00:00`, the session remained active, and only one attempt occurred.

**Fix:** separate “completion requested” from “completion persisted”; show pending/retry state; retry with backoff/idempotency key; reconcile on reload/visibility change. Do not mark local completion until the server confirms.

**Acceptance:** a transient finish failure recovers automatically or exposes a retry action; no duplicate completion; expired sessions reconcile after reopening the app.

## P1-03 · Habit progress can be destroyed or overstated from Today

**Evidence:** `page.tsx:281-284`: any existing log toggles to 0; an unchecked quantity/duration habit logs the full target. Browser probe: 2/5 pages became 0 after one Today tap. Streaks use only the fetched 21-day window (`page.tsx:505-513`), and changing a target reinterprets old logs. `reminderTime` is stored/displayed but no notification scheduler exists.

**Fix:** add compact partial-progress logging on Today; never silently replace a partial value with 0/full target. Version habit targets/schedules or snapshot completion rules so history is stable. Compute streaks from authoritative history (or label a bounded estimate). Either implement opt-in reminders with permission/timezone handling or label the field as a time note, not an active reminder.

**Acceptance:** partial logs survive toggles; one tap cannot fabricate quantity/duration completion; target edits do not rewrite historical achievement; streaks beyond 21 days are correct; reminder copy matches implemented behavior.

## P1-04 · Task completion history and Today statistics are inconsistent

**Evidence:** repeated `/complete` calls reset `completedAt`; saving an already-completed task through the UI sends `status:'completed'` and also resets it (`route.ts:114-116,192`, confirmed by probes). Today’s denominator is `completedToday + remaining due/overdue tasks` (`page.tsx:404`), so completing an unscheduled task mixes unrelated work into the ratio.

**Fix:** make completion idempotent; only set `completedAt` on the todo/in_progress → completed transition. Define Today metrics explicitly (e.g. “completed today” as a count, plus “due today remaining”), and provide a completed-history view with restore/undo.

**Acceptance:** duplicate completion and editing notes preserve the original timestamp; metric labels match their queries; completed tasks remain discoverable.

## P1-05 · Mutation success is reported even when the UI refresh fails

**Evidence:** `refresh()` catches errors internally (`page.tsx:134-138`); `mutate()` then returns true and closes the editor (`227-234`). Injection: POST succeeded, overview refresh returned 503, the modal closed, the new task was absent from the UI, and only a short error toast appeared; reload revealed the committed task.

**Fix:** use a server-state layer (e.g. TanStack Query/SWR or equivalent) with explicit mutation/refresh states, request cancellation/timeouts, retry/reconciliation, and per-entity pending guards. Return the created/updated entity from writes and update the cache directly. Add idempotency keys for creates and optimistic-concurrency versions for multi-tab edits.

**Acceptance:** a committed write is never presented as lost; refresh failure shows a persistent recovery action; double submits cannot duplicate; stale tabs cannot silently overwrite newer edits.

## P1-06 · API validation and route contracts are too loose

**Evidence:** task `dueDate` accepted `"not-a-date"` (201); overview accepted `date=banana`; habit log accepted `2026-99-99`; `/tasks/:id/restore/extra` and `DELETE /journal/:id/extra` succeeded; Zod messages surface in English; JSON writes accept `text/plain` and arbitrary `Origin`.

**Fix:** share strict Zod DTOs between client/server; validate real calendar dates and bounded ranges; match exact route shapes/methods; reject unsupported media types; map errors to stable Arabic codes/messages. Add request-size limits and pagination bounds before parsing large bodies. Wrap multi-step writes such as project deletion (move tasks, then delete project) in a transaction, and decide whether historical focus sessions need a preserved project name/snapshot instead of losing attribution via `SET NULL`.

**Acceptance:** invalid dates/ranges/routes/media types return correct 4xx codes with localized messages; contract tests cover every endpoint and method.

## P1-07 · Timezone/day boundaries are implicit

**Evidence:** client supplies `today`; server fallback uses process-local time; timestamps are rendered in browser-local time; an open tab keeps `data.today` until a mutation refresh. No account timezone or midnight rollover handling exists.

**Fix:** persist an explicit user timezone, validate date keys server-side, keep civil dates distinct from instants, and recompute “today” on midnight/visibility/timezone changes. Test DST transitions and travel across timezones.

**Acceptance:** Today, habit logs, completion counts, and focus-day attribution agree for the same user timezone around midnight/DST.

## P2-01 · Matrix/calendar semantics need product decisions

- The Eisenhower matrix infers importance from priority and urgency from priority/due date (`core.ts:56-63`); a future high-priority task is always “do now”, and “delegate” has no assignee. Add an explicit importance field or explain the heuristic/rename the quadrants.
- The calendar is a due-date week, not time blocking (`scheduledStart/End` are unused). Either label it “مواعيد الاستحقاق” or implement scheduling with times, conflicts, and drag/keyboard alternatives.
- Project weekly targets are displayed but never compared with actual focus time; estimated Pomodoros are not tracked against sessions; tags are saved but not surfaced/searchable.

## P2-02 · Journal search/pagination and large datasets

**Evidence:** offset pagination duplicated entries after a concurrent insert in a 45-entry probe; `%` acts as a LIKE wildcard (query `%` matched all 47 entries); overview loads all tasks and only the latest 200 focus sessions, so aggregate totals can silently truncate.

**Fix:** cursor pagination keyed by `(entryDate, updatedAt, id)` or equivalent stable ordering; define/escape search wildcards and Arabic normalization expectations; paginate tasks/logs and compute aggregates in SQL rather than from a truncated client list. Add composite tenant indexes and measure query plans.

---

# 3. UI / UX findings

## P1-08 · Phone drawer and modal layering/focus are broken

**Evidence:** at 390 px, first Tab focuses the closed drawer’s off-screen close button (x≈420 outside a 390 px viewport). Opening the drawer leaves focus on the menu trigger and the background interactive. “Add project” from the drawer opens a modal at z-index 400 beneath the still-open sidebar at z-index 600; the sidebar covers the dialog center. Screenshot: [`390-drawer-project-conflict.png`](./review-assets/390-drawer-project-conflict.png).

**Fix:** use one overlay manager: opening a modal closes the drawer; closed overlays are `inert`/removed from focus order; open overlays trap focus, lock background, mark background inert, and restore focus to the trigger. Prefer native `<dialog>`/a tested primitive over the custom hook alone.

**Acceptance:** keyboard/screen-reader users cannot reach hidden/background controls; every drawer action opens an operable dialog; Escape/backdrop dismissal returns focus correctly.

## P1-09 · Responsive breakpoints hide content or crush the calendar

**Evidence:** bottom navigation remains visible until 960 px, but content bottom padding is removed at 640 px; at 768 px the footer overlapped the fixed nav by ~48 px ([screenshot](./review-assets/768-bottom-navigation.png)). The calendar switches to seven columns at 960 px while the sidebar consumes 256 px, producing unreadably narrow day cards at 1024 px ([screenshot](./review-assets/1024-calendar.png)); the horizontal-card layout only returns at 1440 px.

**Fix:** tie nav clearance to the same breakpoint as nav visibility; use container queries or content-width breakpoints for the calendar; keep horizontal day cards until seven columns have usable width. Verify 320 px, 640–959 px, 960–1439 px, and zoom/reflow states.

**Acceptance:** no fixed control covers content at any supported width; calendar text remains readable without per-character wrapping; intentional scrolling regions are keyboard accessible.

## P1-10 · Forms discard edits and initialize focus poorly

**Evidence:** Task/project/habit editors close on Escape/backdrop without a dirty check (Journal already warns). Browser probe confirmed a dirty task closed with zero confirmations. The focus hook overrides `autoFocus` and lands on the close button instead of the title field.

**Fix:** shared dirty-state/close guard, initial focus on the first meaningful field, inline Arabic validation, pending/disabled states during save, and consistent confirmation dialogs instead of browser-native `confirm()`.

**Acceptance:** no accidental loss of typed content; keyboard users land in the field they came to edit; validation errors are announced and localized.

## P1-11 · Navigation, deep links, and recovery states

**Evidence:** invalid `?project=does-not-exist` renders a generic “المشروع” empty task list rather than a missing-project state. Navigation uses buttons + `pushState`, so no real links/open-in-new-tab semantics; desktop active items lack `aria-current`; route changes do not move focus/announce the new page. Completed tasks disappear from all lists except calendar cards.

**Fix:** use links/router navigation with validated params, not-found/recovery UI, document titles per view, focus/announcement on navigation, and a completed/archive history. Add persistent offline/refresh-failure banners with retry rather than only 3.5 s toasts.

## P2-03 · Visual hierarchy and Arabic typography

**Evidence:** the desktop headline wraps to three lines while constrained by a `ch`-based max width with Arabic display fonts; stats align away from the heading; project names truncate heavily beside always-visible edit/delete buttons; dense metadata drops to 10–12 px Naskh; every card repeats a 4 px edge + hard shadow. Screenshots: [desktop](./review-assets/1440-today.png), [mobile](./review-assets/390-today.png), [dark](./review-assets/1440-today-dark.png).

**Recommendations**
- Keep the calm Arabic-first identity, but reserve the tactile sticker treatment for primary actions/feature cards; use quieter containers for dense lists.
- Size Arabic headings with rem/container widths rather than `ch`; align summary cards with the content start; raise small metadata to a readable minimum and test diacritics/line height.
- Move project edit/delete into an overflow menu or reveal-on-focus/hover pattern that remains touch accessible; allow two-line names where space permits.
- Consolidate repeated CSS overrides and dead selectors; keep semantic theme tokens but remove duplicated dark-mode blocks.

## P1-12 · Accessibility beyond axe

**Evidence:** automated scans were clean, but manual/runtime checks found the drawer focus defects above. In light mode, the completed Today habit check uses a near-white icon on user-selected colors; the orange palette choice `#D4894D` gives ≈2.78:1 against near-white, below the 3:1 non-text target. Calendar had `aria-prohibited-attr` items flagged for manual review.

**Fix/verify:** WCAG 2.2 AA contrast for text/icons in both themes and all palette choices; visible focus and logical tab order; labels/pressed state for habit checks; accessible chart values; keyboard-operable calendar/heatmap details; 200% zoom/320 px reflow; reduced motion; NVDA/VoiceOver passes. Treat 44 px touch targets as the product goal (24 px is the AA minimum, not the design target).

## P2-04 · Copy, onboarding, and expectation management

- Replace the always-morning greeting with time-aware or neutral copy; make motivational/religious content optional.
- Label starter data as examples and offer “start empty” vs “use templates”; do not mix samples into real progress unnoticed.
- Clarify shared-demo privacy in the UI, not only README; avoid “private” until auth exists.
- Timer copy hard-codes 25 minutes even when 90 is selected (confirmed); derive all labels from the selected duration.
- Add task search/filters, undo, archive recovery, and journal export/date filters before adding heavier features.

---

# 4. Engineering, security hardening, and operations

## P1-13 · Quality gates and maintainability

**Current:** one 606-line client component, a catch-all API route, duplicated client/domain types, UI filtering duplicated from tested helpers, only 5 helper tests, no lint/CI/E2E.

**Plan:** split by feature (`tasks`, `habits`, `focus`, `journal`, `navigation`, `ui`) behind shared DTOs and domain services; keep helpers pure and use them in the UI. Add ESLint, CI on Node 22 (`npm ci`, lint, typecheck, unit, API integration, build, browser/a11y smoke, audit), coverage thresholds on domain/auth code, and visual regression for key breakpoints/themes.

## P1-14 · Observability and resilient release

Add Arabic error boundaries and route-level recovery; structured redacted logs with request IDs; metrics/alerts for API latency/errors, auth failures, DB/backup health, and client errors; health/readiness checks; staging/production separation; feature flags and rollback; dependency update policy. Define SLOs before beta and test failover/restore, not just uptime.

## P1-15 · HTTP/security and performance hygiene

- Add CSP (compatible with the theme bootstrap), HSTS on the production TLS edge, `nosniff`, referrer policy, frame/permissions policy; disable `X-Powered-By`; set `private, no-store` on authenticated data responses; `noindex` the demo.
- Rate-limit auth and writes; bound body sizes and list ranges; review logs so journal content/SQL parameters are not emitted on errors.
- Proposed performance targets to validate: p75 mobile LCP < 2.5 s, INP < 200 ms, CLS < 0.1; p95 overview < 300 ms at an agreed dataset (e.g. 5k tasks/1k sessions per workspace). Current build reports ~125 kB first-load JS and ~216 kB of WOFF2 assets; consider variable-font subsets, but measure before optimizing.
- Load-test authenticated reads/writes and journal search; add indexes from measured query plans. Keep SQLite only for a single-instance/self-host target with proper backups; choose PostgreSQL for hosted multi-user/multi-instance growth. Do not migrate merely because the schema has tenant columns.

## P2-05 · Dependencies/runtime

`npm audit --omit=dev` reported 0 vulnerabilities; the full audit reported 4 moderate findings in the `drizzle-kit → @esbuild-kit → esbuild` dev chain (esbuild dev-server advisory). Do not apply npm’s suggested major downgrade blindly; update/override to a compatible patched toolchain and retest migrations. Align README, CI, container, and `better-sqlite3` on Node 22.

---

# 5. Target architecture and decision gates

```text
Arabic RTL client (feature components + server-state cache)
        │ shared Zod DTOs / typed API client
        ▼
Next route handlers → verified session → workspace/role + journal-owner checks
        │
        ▼
Domain services (transactions, idempotency, timer state machine, aggregates)
        │
        ▼
Drizzle → SQLite (single-instance/self-host) OR PostgreSQL (hosted multi-user)
        │
        ├── versioned migrations / backup & restore drills
        ├── export / deletion / retention policy
        └── redacted logs, metrics, alerts, audit trail
```

Decide these in Phase 0 rather than discovering them mid-build:

| Decision | Recommendation |
|---|---|
| Deployment model | If public/multi-user: hosted auth + PostgreSQL path. If strictly local/self-host: SQLite is acceptable, but network exposure still needs auth and backups. |
| Journal sharing | Owner-only default; sharing is a separate explicit feature with its own authorization tests. |
| Calendar | Due-date overview now; time blocking only with scheduled times, conflict rules, and accessible interactions. |
| Matrix | Add explicit importance rather than overloading priority; explain urgency rules. |
| Reminders | Either implement opt-in notifications with timezone/permission handling or rename to a time label. |
| Offline | Start with resilient reads/retry and clear offline state; defer full offline sync/conflict resolution. |
| Demo | Separate read-only or isolated demo account; never share real user storage. |

---

# 6. Phased improvement plan

Indicative for **2 developers + part-time design/QA: ~5–7 calendar weeks** after Phase 0 decisions. Re-estimate after the auth/data spike; this is not a release promise.

### Phase 0 — Baseline and decisions (2–3 days)
- Confirm deployment model, auth approach, privacy/retention, calendar/matrix/reminder semantics.
- Fix clean bootstrap, Node 22 baseline, config URL consistency, explicit migrations/seed commands (P0-03).
- Add CI skeleton and record current performance/test baseline.
- **Exit:** clean install/migrate/start is repeatable; production startup is side-effect-free; decisions written down.

### Phase 1 — Identity and data safety (1–2 weeks)
- Auth/session flows, workspace authorization, owner-only journal, CSRF/rate limits (P0-01).
- Versioned migrations, backup/restore drill, export/deletion, privacy policy (P0-02).
- Cross-user API integration suite and redacted audit logging.
- **Exit:** P0 security/data tests pass; restore drill succeeds; no shared real data.

### Phase 2 — Correctness and recovery (1–2 weeks)
- Timer state machine/server time/idempotent finish/retry (P1-01/02).
- Habit partial logging, stable history/streaks, reminder truthfulness (P1-03).
- Completion idempotency/metrics, mutation reconciliation, strict DTOs/routes, timezone rules (P1-04–07).
- Cursor pagination and SQL aggregates (P2-02 pulled forward if datasets grow).
- **Exit:** domain/API test matrix passes, including failure injection, concurrency, midnight/DST, and reload recovery.

### Phase 3 — UI/UX and accessibility (1–2 weeks, partly parallel)
- Overlay/focus manager and dirty-form guards (P1-08/10).
- Responsive nav clearance/calendar containers, navigation/deep-link recovery (P1-09/11).
- Typography/hierarchy, contrast/palette fixes, manual screen-reader/zoom/device passes (P2-03, P1-12).
- Onboarding, copy, completed/undo/archive discovery (P2-04).
- **Exit:** critical journeys pass keyboard + touch + screen-reader scripts; no overlap at supported widths; WCAG 2.2 AA checklist signed off.

### Phase 4 — Operational readiness and beta (1–2 weeks)
- Observability, security headers, load tests, dependency policy, staging/rollback (P1-14/15).
- Invite a small beta cohort with synthetic/consented data; monitor errors, latency, recovery, and support feedback.
- Run backup restore and account-deletion drills again on staging.
- **Exit:** all P0 closed, P1 closed or formally risk-accepted with owner/expiry, SLOs met during beta, rollback rehearsed.

### After launch (P2 roadmap)
Task search/filters and subtasks/recurrence; real time blocking; project focus reports; journal date filters/export improvements; optional offline sync; collaboration/billing only if the product model requires them. Do not add these ahead of the release gates.

## Sprint-ready backlog summary

| ID | Priority | Work | Primary owner | Depends on |
|---|---|---|---|---|
| P0-01 | P0 | Auth + tenant/journal authorization + CSRF/rate limits | Backend/security | Phase 0 decisions |
| P0-02 | P0 | Migrations, backup/restore, export/deletion | Backend/ops | Storage decision |
| P0-03 | P0 | Clean bootstrap, Node 22, safe seed/reset/config | Backend/DevEx | — |
| P1-01/02 | P1 | Timer state machine, server time, retry/idempotency | Backend + frontend | DTOs |
| P1-03 | P1 | Habit partial logging/history/streaks/reminders | Full-stack + design | Domain rules |
| P1-04/05 | P1 | Completion metrics + mutation reconciliation | Full-stack | Server-state layer |
| P1-06/07 | P1 | Strict API contracts + timezone/day rollover | Backend | Shared DTOs |
| P1-08/10 | P1 | Overlay/focus/dirty-form system | Frontend | UI primitives |
| P1-09/11 | P1 | Responsive layout + navigation/recovery | Frontend/design | Breakpoint rules |
| P1-12 | P1 | Manual a11y/contrast/zoom/device verification | Design + QA | UI fixes |
| P1-13 | P1 | Feature split, CI, integration/E2E/a11y gates | Full-stack/QA | Phase 0 |
| P1-14/15 | P1 | Observability, headers, load/rollback/restore drills | DevOps/backend | Staging |
| P2-01/02 | P2 | Matrix/calendar semantics, cursor search/aggregates | Product + full-stack | Decisions |
| P2-03/04/05 | P2 | Visual/copy/onboarding polish, dependency updates | Design/frontend | Core stable |

## Definition of “production ready” for Winit

1. No unauthenticated or cross-tenant access to real data; journal owner-only by default.
2. Repeatable clean install and versioned migrations; production boot never pushes schema or reseeds.
3. Backup restore, export, and account deletion demonstrated against policy targets.
4. Timer/habit/task statistics reconcile after retries, concurrency, reloads, and midnight/DST.
5. Critical journeys pass API + browser + keyboard/screen-reader + responsive checks in CI/manual QA.
6. Persistent, localized recovery states for network/server failures; no silent data loss.
7. Monitoring/alerts, security headers, rate/size limits, staging, rollback, and dependency policy in place.
8. Beta SLOs met and every remaining P1 has a named owner and explicit risk decision.

---

# 7. Validation evidence and limits

| Check | Result |
|---|---|
| `npm run typecheck` | Pass |
| `npm test` | Pass, 5/5 helper tests |
| `npm run build` | Pass, Next.js 15.5.29; `/` first-load JS 125 kB |
| Database setup | Initial clean `db:push` failed on missing `data/`; after creating it, push/seed passed. Isolated seed probe confirmed deleted-habit resurrection. |
| `npm audit --omit=dev` | 0 reported vulnerabilities |
| `npm audit` (all) | 4 moderate dev-chain findings (esbuild advisory via drizzle-kit) |
| Browser layout | 40 states: 5 widths × 8 views; Chromium 133 harness; screenshots in `review-assets/` |
| axe | 15 scans, 0 violations; calendar `aria-prohibited-attr` marked incomplete for manual review |
| API probes | 17 probes confirming defects/positive controls; see [`api-results.json`](./review-assets/api-results.json) |
| Browser journeys/failure injection | 12 recorded checks; see [`journey-results.json`](./review-assets/journey-results.json) |
| Page errors during layout sweep | 0 |

Key screenshots: [desktop Today](./review-assets/1440-today.png), [mobile Today](./review-assets/390-today.png), [dark desktop](./review-assets/1440-today-dark.png), [drawer/modal conflict](./review-assets/390-drawer-project-conflict.png), [1024 px calendar](./review-assets/1024-calendar.png), [768 px nav overlap](./review-assets/768-bottom-navigation.png), [task editor](./review-assets/390-task-editor.png), [journal editor](./review-assets/1440-journal-editor.png). Raw layout/accessibility results: [`browser-results.json`](./review-assets/browser-results.json).

**Environment notes:** the sandbox blocked Node header downloads during the first `npm ci`; the audit rebuilt the native SQLite binding against the already-installed matching Node headers without changing manifests. The browser harness also needed a sandbox-specific fontconfig path. These are audit-environment workarounds, not application fixes.

**Not performed:** real iOS/Android device lab, human screen-reader audit, Firefox/WebKit runs, penetration test, production load test, external deployment, or backup restore drill (no backup system exists yet). Automated accessibility passes do not replace those checks.
