# Winit — UI/UX, logic, journey, and phone usability review

**Review date:** 6 November 2026  
**Scope:** the Arabic RTL productivity app in this repository, including the Journaling feature added in this work.  
**Review type:** source walkthrough, responsive-CSS review, production build/typecheck/tests, and HTTP/API smoke tests. This is not a device-lab or assistive-technology certification.

## Executive summary

Winit already has the outline of a useful personal productivity system: Today, upcoming work, an inbox, projects, an Eisenhower matrix, a week calendar, habit tracking, and a persistent focus timer. Its strongest product decision is its calm, Arabic-first RTL presentation, with personal study and wellbeing projects represented in the starter data. A real journal now completes an important reflection loop: a user can enter from Today, record a dated reflection and optional mood, search older entries, edit them, or delete them.

The main release blocker is not the interface; it is the demo's security boundary. **There is no sign-in or tenant isolation in the running API. All visitors to the same deployment share one fixed user/workspace and the journal is stored as ordinary text in SQLite.** The privacy note is intentionally explicit. This is acceptable for a local prototype with sample data, not for a public or multi-user service.

The work also addresses several concrete usability/logic defects found during the review: the Today queue now includes overdue work, project pages display the selected project name, task deletion asks before removing data, habit streaks require meeting the target, search responses cannot overwrite newer results, notification colors distinguish success from failure, and dialogs manage focus and background scrolling. Phone navigation keeps Journal reachable and the sidebar can scroll vertically.

**Overall assessment:** promising local MVP; do not deploy publicly with real users or sensitive journal content until the P0 security work below is complete.

## How to read this review

- **P0 — release blocker:** must be resolved before public or multi-user deployment.
- **P1 — important:** materially affects correctness, safety, or a core journey; resolve before calling the feature production-ready.
- **P2 — follow-up:** useful improvements that can be planned after the prototype's core boundary is clear.
- **Completed** means implemented and validated with the checks listed near the end. It does not mean visually verified on a real phone.

## Product map and core journeys

### Existing work-planning journey

1. Open Today and review the due/overdue task queue, focus progress, and habits.
2. Add a task with project, priority, due date, notes, and estimated Pomodoro sessions.
3. Start a focus session from the task or focus control; the dock remains visible while navigating.
4. Complete the task and log a habit; use upcoming, project, matrix, or calendar views to plan the next step.

### Journaling journey

1. Enter Journal from the mobile tab, desktop navigation, or the Today reflection link.
2. Start from the daily prompt or an empty page; add a date, optional title, optional mood, and free-form text.
3. Save and return to the searchable, paginated entry list.
4. Reopen an entry to edit it, or confirm before deleting it.

The path is intentionally low-pressure: the title and mood are optional, the prompt says a single line is enough, and the list offers search and “load older” rather than an endless request. The UI also discloses that this unauthenticated demo is not a place for highly sensitive content.

### Customization delivered in the follow-up

- **Tasks:** edit title, notes, tags, project, priority, due date, estimate, and status from Today, lists, matrix, and calendar. Deletion remains explicit and confirmed.
- **Projects:** create/edit name, description, weekly focus target, icon, and color; delete with confirmation. Deleting a project moves its tasks to Inbox instead of cascading them away.
- **Habits:** create/edit name, description, check/quantity/duration target, unit, reminder time, icon, and color; delete with confirmation (including its stored logs).
- **Timer:** choose and persist a Pomodoro duration from 10 to 90 minutes; active sessions retain the duration with which they started.
- **Phone navigation:** select up to four bottom-bar destinations; the remainder stay accessible from the More drawer. The preference is stored in local browser storage.
- **Calendar and habits:** redesigned the week into scrollable, tactile day cards and the habit view into progress cards with clear progress, 21-day history, streak, and edit/delete controls.
- **Dark mode:** shifted the palette to blue-navy surfaces and blue accents, while keeping the same card edges, outlines, spacing, and sticker-like shadows as light mode.

## Findings and actions

### P0 — Security, privacy, and data ownership

**Finding:** the API uses fixed `DEMO_USER_ID` and `DEMO_WORKSPACE_ID` values, and write routes do not require a session. Workspace scoping is present in the SQL, but it is not user isolation when every request is assigned the same demo identity. Journal content is plain text in SQLite; the application does not encrypt it. Anyone who can reach a shared deployment can read, create, change, or delete the shared demo data through the UI/API.

**Impact:** users could mistake a “personal” workspace or the word “private” for account-level privacy. Journal entries can contain sensitive personal information. A public deployment would expose all visitors to a shared mutable dataset.

**Action taken:** removed/avoided claims of authenticated privacy; added a visible Journal caveat and a more explicit README warning that all visitors share one dataset and that entries are not encrypted.

**Required before public deployment:** implement authentication and session expiry; derive user/workspace identity from the verified session; authorize every read and write against membership; test cross-user access denial; define backup/retention/export/deletion policies; add rate limits and security monitoring. Keep the demo local-only until then. Encryption at rest should be addressed at the storage/deployment level and in the threat model.

### P1 — Correctness and destructive-action safety

- **Overdue tasks were omitted from Today.** Today now includes active tasks due on or before the local date, and overdue work is grouped distinctly in task lists. This better matches the user's mental model of “what needs attention now.”
- **Project filtering could show the generic “All tasks” heading.** The selected project's name now takes precedence in the page heading while the task list remains scoped to that project.
- **Task deletion had no confirmation.** A confirmation now names the task and warns that the action cannot be undone. Journal deletion already uses a confirmation. A custom in-app confirmation and an undo window would be a better long-term phone experience than the browser-native prompt.
- **Habit streaks could count any log as a success.** Streaks now require `value >= targetValue`; an unfinished current day is allowed to continue a streak from yesterday. This rule is extracted to a pure helper and covered by tests.
- **Search result races could show stale Journal results.** Journal loads now carry a monotonically increasing request ID, and obsolete responses/errors are ignored.
- **Success and failure messages shared error styling.** Notifications now have distinct success/error states, with polite status announcements for success and assertive alerts for errors.
- **Dialogs did not consistently identify themselves or contain keyboard focus.** Task, project, habit, focus, and Journal dialogs now have dialog semantics, focus trapping, focus restoration, Escape handling, and body-scroll locking. Journal also warns before discarding unsaved edits.
- **Repeated timer completion could be triggered by repeated renders.** The focus dock now guards automatic completion by session ID; the API also only finishes an active session.

### P1 — Phone navigation and interaction

- Journal is reachable through a dedicated bottom tab on phones and remains in the desktop navigation. Today also offers a direct reflection link.
- Coarse-pointer controls target at least 48 CSS pixels where practical; mobile tab controls include safe-area padding.
- The mobile sidebar is a vertically scrollable drawer, so a long list of seeded or user-created projects does not hide later navigation items below the viewport.
- The week calendar is horizontally scrollable with snap points at narrow widths; it becomes a seven-column grid on wide screens.
- Quick-add can be invoked with Command/Control+Enter when focus is not inside a text/edit control. The add action announces the shortcut to assistive technology.
- The focus dock and toast sit above the mobile navigation and account for safe-area insets.

**Still to verify:** exact touch target sizes, clipping, safe-area behavior, and focus handling on actual iOS/Android devices. The CSS has narrow-width rules, but no device screenshot/visual browser audit was available in this run.

### P1 — Journal implementation and boundaries

**Implemented:** SQLite/Drizzle schema and indexes; workspace/user-scoped API queries; Zod validation for dates, text length, and mood; create/read/update/delete; text search across title/content; newest-date ordering; 40-entry offset pagination; empty/loading states; a date/title/content editor; optional mood; unsaved-change confirmation; deletion confirmation; Arabic copy; Today/mobile/desktop entry points; privacy caveat.

**Limitations to resolve before production:** no authentication/tenant isolation (P0 above), no encryption, no backup/export or account-level deletion, no autosave or recovery draft, no mood history/analytics, and no automated end-to-end browser tests. Search uses SQLite `LIKE`; this is suitable for a small local journal but will need indexing/query changes for a large dataset or more demanding search semantics. The Journal is plain text, not Markdown or rich text.

### P2 — Product and interaction opportunities

1. **Habit workflow:** the Habits page supports quantity/duration values, but Today remains optimized for one-tap completion. Consider a compact partial-progress control on Today and an explicit “log value” explanation, especially for Quran pages and exercise minutes.
2. **Undo:** offer a short undo affordance after task completion/deletion and journal deletion; a toast can reduce destructive-action friction without making the main path noisy.
3. **Journal drafts and search:** add local draft recovery for accidental tab closes, a clear-search button, and explicit “searching” feedback when a query changes. Keep draft storage opt-in/clearly described because entries may be personal.
4. **Journal exploration:** add date-range filtering, month grouping, and export once account ownership and privacy policies exist. Avoid adding streak pressure to reflective writing by default.
5. **Calendar semantics:** the current calendar is a due-date overview, not a time-blocking calendar. Label it accordingly in product copy or add scheduled times before promising daily time planning.
6. **Projects:** archived projects/habits are hidden; there is not yet an archive-management screen or unarchive action. Add a recoverable archive view before users depend on archiving as long-term storage.
7. **Mobile drawer:** trap focus and return it to the menu trigger while the drawer is open; consider closing it on route selection consistently and supporting swipe dismissal only if it can be implemented without accidental closes.
8. **Accessibility:** run axe or equivalent automated checks plus keyboard-only and screen-reader sessions. Verify both themes for contrast, check text scaling/reflow at 200%, and provide labels/status for calendar and heatmap cells beyond hover-only `title` text.
9. **Language and timezone:** test date formatting around midnight, daylight-saving changes, Arabic numerals, and database-server/browser timezone differences. Keep persisted task and journal dates as user-local date keys, and make the user's timezone explicit when accounts arrive.
10. **Observability and resilience:** add API integration tests, an offline/retry state, request cancellation for unmounted views, and visible recovery for failed mutations. Avoid silently presenting an old search result as the current query if a request fails.

## Visual and content review

- Light mode keeps the Sticker-inspired tactile surfaces. Dark mode now uses cool blue/navy surfaces but retains the same outlined cards, spacing, and sticker-like shadow language, rather than switching to a separate visual system.
- Tajawal remains the display/headline face. **Reader Pro was not available as an installable font package; Readex Pro is used as the disclosed body-text substitute.** Noto Naskh Arabic is used for compact/small text.
- RTL is applied at the document level, and layout rules favor logical inline/block properties. Dates and timer values deliberately use LTR direction where that improves numeric input/readability.
- Primary actions, prompts, and entry cards have stronger surfaces than metadata; secondary metadata uses smaller Naskh text. Journal entries remain readable at narrow widths and become a two-column list only on wide viewports.
- Formal contrast ratios and actual device typography have not been measured. Theme tokens are used consistently, but that is not a substitute for contrast testing.

## Validation performed

- `npm run typecheck` — passed.
- `npm test` — passed, 5 tests including overdue-task filtering and habit target/streak semantics.
- `npm run db:push` — applied the `journal_entries` table and indexes to the local SQLite database; a subsequent startup reported no schema changes.
- `npm run build` — passed on the final source state.
- `npm audit --omit=dev --audit-level=high` — 0 production vulnerabilities reported.
- Hallmark `sloplint` on `src/app` — 0 FAIL, 0 REFLEX, 1 WARN. The remaining warning concerns pill radii used on non-control badges/progress decorations; the tool's render mode was off.
- HTTP/API smoke — Journal create/search/update/delete and invalid-date rejection passed. Project/task/habit create/update/delete passed; deleting a project preserved its task in Inbox, and deleting a habit removed its log. Production routes `/`, `/api/overview`, `/api/projects`, `/api/habits`, and `/api/journal` returned 200.
- The development server selected port 3001 because port 3000 was already occupied by an unknown process. Port 3002 was also occupied at final startup, so the production preview is running on port 3003 and accepted requests; preview-host development configuration is in `next.config.ts`.
- **Not performed:** real-browser visual inspection, screenshots at phone breakpoints, automated accessibility scan, screen-reader testing, cross-tenant security tests (there is no auth boundary yet), or external production deployment testing.

## Recommended next sequence

1. Complete authentication, tenant authorization, and privacy/deployment controls before any public launch.
2. Add API integration and browser E2E coverage for task, habit, focus, project, and Journal journeys.
3. Verify mobile layouts and focus flows on real devices and assistive technologies; fix any contrast/touch/reflow findings.
4. Add backup/export and account-level delete flows before treating Journal as durable personal storage.
5. Then consider partial habit logging from Today, undo actions, archive recovery, and richer calendar/search features.
