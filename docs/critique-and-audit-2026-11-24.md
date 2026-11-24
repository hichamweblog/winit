# Winit — Design Critique & Technical Audit

**Date:** 2026-11-24
**Target:** whole app (`src/app` + `src/lib` + config), primary surfaces: اليوم, كل المهام, المشاريع, الإحصائيات, الإعدادات
**Method:** ⚠️ DEGRADED: single-context (no sub-agent tool exposed in this harness; no browser in sandbox)

## Run notes (degradation disclosure)

- **Assessment A** (design review) ran manually over the real source of every surface, plus the three previously captured phone screenshots (1080 px wide).
- **Assessment B** (deterministic scan) ran as a source scan only: `impeccable detect --json src/` → `100 files scanned with regex matching only (.css, .ts, .tsx)`, **0 findings** (251 rules available). The engine itself reports that element rules — `tiny-text`, `low-contrast` and friends — **did not run**. The empty result is an **undercount, not a clean bill of health**.
- **Did not run:** URL/CDP scan of the live app, contrast/pixel reads, computed-style and layout-overflow detection, dead-rule detection, the `[Human]` overlay, per-viewport screenshots. No browser exists in this sandbox and `apt-get` is blocked.
- No `PRODUCT.md` / `DESIGN.md` exists (`impeccable context` → `NO_PRODUCT_MD`, `hasVisualImplementation: true`), so the critique is scored against the incumbent implementation and against `README.md`, `docs/design-system*.md` and `docs/mobile-pwa-review.md` as the project's stated intent.
- Verified green at review time: `npm run typecheck`, `npm run test:design` (25/25 gate rules, 168 contrast pairs), `npm run test:pwa` (8/8), `npm run build`.

---

# Part 1 — Design Critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Toasts, skeleton, optimistic rows, `aria-current`, live dock — but the dashboard timer prints a hardcoded `25:00` whatever duration you configured in Settings |
| 2 | Match System / Real World | 3 | Warm, idiomatic Arabic; correct RTL, Saturday-start week, humanised durations. But "صباح الخير" greets you at 11 p.m., and the greeting/formatters ignore user name and settings |
| 3 | User Control and Freedom | 3 | Escape + focus-trap stack, Cancel-autofocus on every destructive confirm, unsaved-changes guards in all four editors. No undo on delete/complete (confirm only); active-session CTA is a disabled dead end |
| 4 | Consistency and Standards | 2 | 274 `t()` calls, yet the home screen itself is half-hardcoded Arabic; `aria-label` strings bypass `t()`; task search doesn't exist while journal search does; empty states use two different components |
| 5 | Error Prevention | 3 | Five confirmation flows, `maxLength`, native validation, `localStorage` guarded. No drafts/autosave for a long journal entry; no guard on closing the focus modal mid-setup |
| 6 | Recognition Rather Than Recall | 2 | No search, no filters, no sort, no recents in the task lists; the one global shortcut (⌘/Ctrl+Enter) is invisible outside modal footers; 9 top-level nav items on desktop (mobile gets 4 + More) |
| 7 | Flexibility and Efficiency | 2 | Single keyboard accelerator, no bulk select/complete/move, no task reordering. Genuine wins: project reorder by buttons *and* drag, configurable mobile tab bar, pomodoro presets, two list-grouping modes |
| 8 | Aesthetic and Minimalist Design | 3 | Documented token system, one-saturated-CTA rule actually honoured, no gradient slop. But 6 stacked sections on اليوم, and the loudest element (timer halo + orbit dot) is not the most important one |
| 9 | Error Recovery | 2 | `error.tsx` / `global-error.tsx` with Arabic copy and a retry; form errors sit under the field. Server errors arrive as bare `message` toasts with no next step and no retry affordance |
| 10 | Help and Documentation | 1 | No help, no tour, no tooltips beyond `title=`, no FAQ. Empty states are the only onboarding |
| **Total** | | **24/40** | **Acceptable** (60 %) — significant improvements needed before users are happy |

No heuristic scored `n/a`; applicable maximum is 40.

## Design Specificity Verdict

**LLM assessment — authored at the token level, interchangeable at the structure level.**

This is not a template. The Calm Sea token set is real (semantic text/surface/border triads, a 4 px space scale, an explicit `--tap-min: 44px`, 13 px *minimum* micro copy), the palette is specific, and Arabic is treated as a first-class layout language rather than a translation: logical properties throughout, `dir="auto"` on free text, `<bdi>` isolation around every interpolated number, Arabic weekday initials ordered from Saturday, Latin digits chosen deliberately for scannability. The copy has a voice ("قائمتك هادئة الآن", "لا تبحث عن الكمال، فقط عُد كل يوم") that a SaaS starter would never produce. The logo mark, the focus timer's halo geometry and the weekly bar primitive are custom objects, not shadcn defaults.

Where it collapses into category-interchangeable: the information architecture. Today → tasks → projects → habits → focus → stats → journal is the standard productivity pentad, and the home screen is a vertical stack of equal panels rather than a point of view. Replace the Arabic with English and stop reading the CSS, and this is "calm Notion-lite #47". The product claims a **goal** layer (the README's use case is *programming + English + degree target*), but no screen anywhere shows progress toward a goal over time — `targetWeeklyMinutes` appears as a header number on a project page and nowhere else. That is the missed opportunity for product character: the app measures *activity* (minutes, sessions, streaks) and never *direction*.

**Deterministic scan:** 100 files, 0 findings, regex tier only. No `slop/*` signature matched (no side-tab cards, no border-accent-on-rounded, no overused font declarations, no gradient meshes). Because the element rules never ran, treat this as "no known class-name/CSS shortcuts", not "verified clean".

**Visual overlays:** none — no browser, no injection. Fallback signal: source-level review only.

## Overall Impression

A carefully built app with an unusually strong foundation — the design system, RTL craft, dialog focus management and test gates are better than most shipped products — aimed at a home screen that doesn't answer the user's real question. Winit's core loop is "what do I do next, and does it move my goal?", but اليوم answers "do you want to start a timer?" The single biggest opportunity: make اليوم a *decision* screen (next task, next habit, one number about direction) and push the timer to the dock where it already lives.

## What's Working

1. **Dialog and overlay discipline is genuinely excellent.** `useDialogFocus` maintains a module-level stack so a confirm on top of an editor doesn't double-handle Escape, nominates `[data-autofocus]` so Enter can't delete, restores focus to the trigger, and only the outermost layer restores scroll. The mobile drawer adds `inert` + `aria-hidden` + a Tab trap and skips trapping while a modal is open. This is the part most codebases get wrong.
2. **Arabic as a layout language, not a string table.** Logical CSS properties, `<bdi>` around every number inside Arabic prose, `ar-u-nu-latn` digits for density, `dir="auto"` on user content, `lang`/`dir` switched on `<html>` at runtime. The three phone screenshots confirm the RTL chrome holds up at 1080 px.
3. **Signals are encoded twice, never by colour alone.** `PriorityFlag` is a flag *plus* an `aria-label`; every chart bar is a `role="img"` with a label composed from the data ("التركيز اليومي خلال 30 يومًا. المجموع …"); `SessionCount` is a stopwatch glyph plus a digit. The design-system gate enforces 168 contrast pairs, so AA is a build failure, not an aspiration.

## Priority Issues

### [P1] The home screen states facts that are false

- **What:** `TodayDashboard` renders the focus card as `: '25:00'` — a literal — while Settings lets you pick 10–90 minutes and stores it in `winit-pomodoro-minutes`. The welcome line is the literal `'صباح الخير، لنصنع يوماً جميلاً.'` at 07:00 and at 23:00, with no user name (the authenticated name is available but never passed).
- **Why it matters:** the first screen is where trust is built. A timer that contradicts your own setting is the kind of small lie that makes every other number — streaks, minutes, completions — feel decorative. "Good morning" at midnight reads as a static mockup.
- **Fix:** pass `pomodoroMinutes` into `TodayDashboard` and render `formatClock(pomodoroMinutes * 60)`; derive the greeting from `new Date().getHours()` with three Arabic variants (صباح الخير / مساء الخير / ليلة هادئة) and interpolate `auth.user.name`.
- **Suggested command:** `/impeccable clarify`

### [P1] English mode is a half-translation, and the home screen is the worst offender

- **What:** 274 `t()` calls, but ~57 Arabic JSX text nodes and dozens of Arabic literals bypass the dictionary: panel headings ("عادات اليوم"), the entire focus panel copy and CTA ("أنت في قلب الإنجاز."، "جلسة جارية، تابعها من الشريط"), the "التقويم" link, Arabic weekday initials `['س','ح','ن','ث','ر','خ','ج']`, `aria-label="أضف مهمة جديدة"` and `aria-label={\`${minutes} دقيقة\`}`. `HabitsView` (12 nodes), `HabitModal` (13), `ProjectModal` (9), `HabitHistory` (8) are similar. `manifest.ts` declares `lang: 'en'` while the product default is Arabic.
- **Why it matters:** switching to EN yields a patchwork screen, and screen-reader users in EN mode get Arabic accessible names — an a11y defect, not just a copy gap. It also undermines the one claim the UI makes about being bilingual.
- **Fix:** move every literal into `locale.tsx` (mechanical, roughly two hours), including `aria-label`s; add a gate script in the style of `scripts/design-system-gate.mjs` that fails when a `.tsx` contains Arabic outside `t(` — the project already has the culture and the harness for it; set the manifest `lang` to `ar` (or drop it).
- **Suggested command:** `/impeccable clarify`

### [P1] The primary object has no search, no filters, no bulk actions

- **What:** `TaskListView` receives `tasks`, `title` and four callbacks — no query, no status filter, no sort, no selection. Every matching task renders at once (the repo's own seed data is 40+ tasks). Journal, by contrast, has a 260 ms-debounced search box. The only global accelerator is ⌘/Ctrl+Enter → new task; there is no `n`, no `⌘K`, no `?`, and no on-screen shortcut legend. `Search` is even imported into `page.tsx` and never used.
- **Why it matters:** at a few hundred tasks — normal for a student juggling a degree, English and a stack — "كل المهام" is an unscrollable wall. Alex (power user) looks for a search field, finds none, and leaves; Riley (stress tester) types 300 tasks and hits a 12 000 px page.
- **Fix:** header search that filters by title and notes (reuse the journal's debounce), a chip row for status/priority/due filters with a clear-all, `⌘K` to focus search, and bulk selection on the list (complete / move to project / delete with one confirm).
- **Suggested command:** `/impeccable shape`

### [P2] اليوم points at the timer, not at the next task — and dead-ends when the timer runs

- **What:** six stacked sections (welcome, 3 stat cards, tasks, habits, focus card, week chart, quote banner, footer). The only saturated element is "ابدأ جلسة تركيز"; adding a task is a 16 px icon button in a panel header. The moment a session starts, that button becomes `disabled` with the label "جلسة جارية، تابعها من الشريط" — it points to the dock but cannot take you there. The quote banner and the two-line footer occupy prime vertical space on every view.
- **Why it matters:** the page answers the wrong question. A user opening a task app at 09:00 wants "what's next", not "start timer". A disabled button whose label is instructions is a control that looks actionable and isn't.
- **Fix:** collapse the three stat cards into one quiet line, make the tasks panel the hero with the top task expanded (title, project, due, sessions, start), demote the timer to a compact card that links *into* the dock (or scrolls to it) instead of disabling, and drop the quote banner to the journal where it belongs.
- **Suggested command:** `/impeccable distill`

### [P2] Task rows greet screen readers with the edit action and lose their context

- **What:** `.task-body` is a `<button>` containing the title, project pill, due chip and session count, but it carries `aria-label={\`${t('تعديل')} ${task.title}\`}`. An explicit `aria-label` **replaces** descendant text, so the accessible name of the row is "تعديل …" and the project, due state ("متأخرة") and session estimate never reach the accessibility tree. There is also no skip-to-content link anywhere in `layout.tsx`/`page.tsx`, and the 9-item desktop sidebar has no grouping (the phone tab bar does: 4 + المزيد).
- **Why it matters:** Sam (keyboard/screen-reader) navigates a list of "edit this task" buttons with no idea which are overdue or which project they belong to, and must Tab through the whole 9-item nav on every view change.
- **Fix:** drop the `aria-label` on `.task-body` (its content already names it) and expose the edit verb on the pencil button only; if the verb matters, use `aria-describedby` pointing at a hidden hint. Add a skip link as the first focusable element. Group the sidebar as مساحتي / المشاريع / تحليلات.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

Selected for a dashboard/admin, phone-first app: **Alex, Sam, Casey**.

**Alex (power user).** No search, no filter, no bulk, no jump-to-project shortcut; one accelerator total. Reordering projects is keyboard-accessible (arrow buttons — genuinely good) but tasks can't be reordered at all. Nine flat nav items to scan. Will build a text file instead of using this.

**Sam (accessibility).** Row names are the edit verb (above); no skip link; the timer is announced as an `img`-free `<span>` inside static copy, so an active session's countdown is never announced and never announces its end (the dock updates visually only). Language switching leaves Arabic accessible names on English UI. Focus trap, `inert` drawer, `aria-live` counters and 44 px coarse-pointer targets are all correct — the floor is high, the ceiling is the row semantics.

**Casey (mobile, interrupted).** FAB sits in the thumb zone; the tab bar is configurable to 4 + المزيد; sessions are server-side so a reload keeps them. But: the manifest pins `orientation: 'portrait-primary'` (no landscape on a tablet), اليوم is a long one-handed scroll before you reach the timer, and the three stat cards stay 3-across at 360 px.

## Minor Observations

- `stats-grid` has no compact breakpoint (`repeat(3, minmax(0,1fr))` at every width), so at 360 px each card is ~100 px and "المهام المكتملة" wraps under a 2.5 rem number.
- Font payload: `globals.css` imports `@fontsource/tajawal/{arabic,latin}.css` and `noto-naskh-arabic/arabic.css` — 7 + 7 + 4 = 18 `@font-face` declarations for the 3 weights actually used (500/600/700). The build emits 384 KB of woff2; `font-display: swap` saves the blocking, not the bytes. Import per-weight files.
- `manifest.ts`: static `theme_color: '#3E3758'` (purple OS chrome in dark mode), `lang: 'en'`, `orientation: 'portrait-primary'`.
- Two number formatters coexist (`formatArNumber` in atoms/`core`, `formatNumber` in StatsView) — drift risk in Arabic percentages.
- `Search` is imported in `page.tsx` and unused; `noUnusedLocals` is off in `tsconfig.json`, so CI won't catch this class.
- `.row-actions .row-action` is 34 px when the pointer is fine; only `pointer: coarse` bumps it to `--tap-min` (44 px). Correct in spirit, but a touch laptop gets 34 px.
- The month calendar is `react-day-picker` with `ar`/`enGB` locales — good — while the rest of the app rolls its own date formatting (`AR_LOCALE`). Two date systems, one app.
- `TodayDashboard` re-renders the whole tree every second while a session is active (`setInterval` in the dashboard, not in the dock).
- `error.tsx` / `global-error.tsx` repeat four Arabic strings each outside `t()`.

---

# Part 2 — Technical Audit

## Implementation Integrity — **PASS**

What was verified, not assumed: `tsc --noEmit` clean; design gate 25/25 with 168 enforced contrast pairs; PWA gate 8/8; production build succeeds; every API route independently enforces session auth (the `AuthGate` explicitly documents that it is a UX gate, not the boundary); CSRF tokens issued per session; scrypt with explicit cost parameters; rate limiting on auth; `localStorage` reads wrapped in `try`; `useDialogFocus`, `ConfirmDialog` and the four modal dirty-guards are all real, not stubs. No fake data paths, no TODO-backed features, no `dangerouslySetInnerHTML`.

Two cosmetic dents, neither behavioural: the unused `Search` import, and duplicated number formatting between `core`/atoms and `StatsView`.

## Scores

| Dimension | Score | Notes |
|---|---|---|
| Implementation Integrity | **4/4** | Builds, typechecks, gates green, auth/CSRF/rate-limit enforced per route, no stubs |
| Accessibility | **3/4** | Excellent dialog/overlay model, `inert` drawer, `aria-live`, labelled charts, 44 px coarse targets, gated contrast. Loses a point on task-row `aria-label` swallowing content, no skip link, ungrouped 9-item nav, unannounced countdown |
| Performance | **3/4** | 103 kB shared JS, zero images, cache-first SW for `_next/static`, `React.memo` rows. Loses on 18 font faces for 3 weights (384 KB emitted), unsplit `sessions.filter()` loops ×8 per render, 1 s whole-dashboard re-render, no list virtualisation, no `<link rel=preload>` for the fonts |
| Theming | **3/4** | Semantic token triads with legacy aliases resolving through `var()`, `color-scheme` light/dark, inline bootstrap script (no flash), per-entity colours through `goalStyle` with contrast handling, `viewport.themeColor` light/dark pair. Loses on static manifest `theme_color`, and `#F4F7F8`/`#3E3758` hardcoded in `manifest.ts` |
| Responsive | **3/4** | Token breakpoints (768/1100), `--screen-pad` ladder, container max-widths (720/1040/36 rem), coarse-pointer target bumps, drawer `visibility`/`inert` fix, FAB in the thumb zone, configurable tab bar. Loses on the always-3 stat grid at 360 px, `orientation: portrait-primary`, 34 px row actions on fine pointers, and a six-section dashboard on small screens |
| **Total** | **16/20** | **Good** — solid foundation, weak spots are specific and cheap to fix |

## Detector findings

`impeccable detect --json src/` → `[]`, exit 0, "100 files scanned with regex matching only (.css, .ts, .tsx)". 251 rules registered. The engine's own caveat applies verbatim: element rules (`tiny-text`, `low-contrast`, layout/overflow) **did not run**, so 0 findings is an undercount. The only trustworthy reading of this result is "no known class-name/CSS slop signatures" — consistent with the hand review, which found none either. The project's own gates cover the gap the detector left: 168 contrast pairs and 25 structural assertions run in CI.

## What the audit did **not** cover

Live URL scan, computed contrast in dark mode, real-device touch behaviour, 200 % zoom reflow, keyboard-only traversal of the full flow, screen-reader output, Lighthouse/Core Web Vitals, offline behaviour under a real network drop. Each needs a browser, which this environment does not have.

---

*Scored against the incumbent implementation because no `PRODUCT.md` / `DESIGN.md` exists yet. Running `/impeccable init` would let later critiques measure drift from stated intent instead of from the code itself.*

---

# Resolution log — 2026-11-24

Everything in this report was acted on in the same session, at the user's
request ("fix them all", scope "everything incl. P3 minors"). Goal-direction
was deliberately deferred until `PRODUCT.md` exists.

| Finding | Status | Where |
|---|---|---|
| P1 home screen stated false facts (hardcoded `25:00`, all-day "صباح الخير") | Fixed | `TodayDashboard` takes `pomodoroMinutes` + `userName`; `greetingFor(hour)` covers morning/afternoon/evening/night; countdown moved into `LiveTimer` so only that span re-renders |
| P1 English mode half-translated (~57 text nodes, `aria-label`s bypassing `t()`) | Fixed | 156 literals wrapped by a TS-AST codemod; `t(key, vars)` now fills `{placeholders}`; 222 dictionary entries added; `scripts/i18n-gate.mjs` fails the build on Arabic outside `t()` (wired into `npm run check`) |
| P1 no search, filters or bulk actions on tasks | Fixed | Header search (Ctrl/⌘+K), status + priority filters, count + clear, selection mode with bulk complete / move / delete (sequential, confirmed) |
| P2 اليوم hierarchy + dead-end CTA | Fixed | Three stat cards → one line; tasks panel elevated with the next task expanded; timer became a compact card whose CTA *opens* the dock; quote moved to the journal; footer reduced to one line |
| P2 task-row `aria-label` swallowed row context; no skip link; flat 9-item nav; silent countdown | Fixed | `aria-label` removed from `.task-body`; skip link + `#main-content`; sidebar grouped مساحتي / المشاريع / المتابعة + settings; `role="timer"` on the dock and start/end toasts |
| Font payload: 18 faces for 3 used weights | Fixed | Per-weight, per-subset imports: **18 → 8 files, 384 KB → 180 KB** |
| Manifest: portrait lock, `lang: 'en'`, static theme colour | Fixed (partially) | Portrait lock removed, `lang` set to `ar`; `theme_color` must stay static per spec |
| 34 px row actions on fine pointers | Fixed | 40 px on fine pointers, 44 px on `pointer: coarse` |
| Two number formatters | Fixed | `formatNumber(value, language)` in `core`; StatsView binds it to the active language |
| Dead code (unused `Search`, `Logout`, `CalendarDays`, `ChevronLeft`, `cellAt`, stray `useLocale()` in `clearCache`) | Fixed | `noUnusedLocals` now enabled in `tsconfig.json` |
| `.stat-card` / `.quote-banner` CSS left behind by the redesign | Cleaned | Dead `.quote-banner` rules removed; `.stat-card` kept because the Statistics page composes it with `.kpi-card` |

Verification after the changes: `npm run check` → 119/120 tests (0 failing),
design gate 25/25 + 168 contrast pairs, PWA gate 8/8, i18n gate 32 files;
`npm run build` succeeds at 103 kB shared JS.

Still open by design: the goal layer (deferred), `react-day-picker` vs
`AR_LOCALE` date formatting (two date systems, cosmetic), nonce-based CSP
(behind `WINIT_STRICT_CSP=1`), password reset and email verification.

---

# Resolution log — round 2 (Impeccable review)

Second pass, driven by the phone/desktop screenshots and by
`impeccable foundations .`, which moved from **8 of 14** to **13 of 14** in
place. The remaining one is `no-generic-ai-patterns`, which needs the
element-level detector against a rendered page — not reachable here.

## Screenshot round

| Finding | Status | Fix |
|---|---|---|
| Page title clipped ("عادات…") with a stray grey pill under it | Fixed | The search pill, date and theme shared one `.topbar-end` group, so search wrapped into a three-line block. Header is now `start` / `search` / `end`, and under 720px it is two deliberate rows with the title ellipsing instead of pushing |
| User's initial drawn twice on desktop | Fixed | `.top-avatar` removed with its CSS; the sidebar `.workspace-avatar` is the single instance |
| Greeting name low contrast on the Energy hero | Fixed | `--energy-hero-muted` instead of `--color-ink-2` |
| FAB on top of empty states that already had a CTA | Fixed | The add button requires a non-empty list, and steps aside while a focus session is docked |
| Priority chips stacked three rows on a phone | Fixed | Status and priority share one sideways-scrolling row with an edge fade |
| Journal quote broke around its guillemets | Removed | The line, its string and `.journal-quote` are gone |

## Foundations

| Item | Status | Where |
|---|---|---|
| `social-previews` | Fixed | `scripts/make-og.mjs` → `public/og.png` (1200×630), `openGraph` + `twitter` + `metadataBase` in `layout.tsx` |
| `legal-pages` | Fixed (drafts) | `/privacy`, `/terms`, linked from the app footer; both carry a "draft — awaiting your review" badge and are not legal advice |
| `error-tracking` | Fixed | `@sentry/nextjs`, initialised in `instrumentation-client.ts`, dormant without `NEXT_PUBLIC_SENTRY_DSN`; the SDK and `reportError()` load lazily, so shared JS stays 103 kB |
| `dependency-scanning` | Fixed | `.github/dependabot.yml` (npm weekly, patch/minor grouped; Actions monthly) |
| `no-giant-files` | Fixed | `globals.css` 1,569 lines → four stylesheets behind an import manifest; the esbuild migration bundle moved to `node_modules/.cache/winit/` instead of being committed |

## UX list

- Phone: hero collapses below 720px (subtitle dropped, padding tightened).
- Date opens the calendar; the workspace avatar opens settings.
- A language toggle sits beside the theme.
- Settings: list density (comfortable / compact), root-applied and remembered.
- Completion settles over 120ms instead of jump-cutting (reduced motion respected).
- A search with no matches names the query and offers to clear it.
- First run can seed three sample tasks through the public API.
- An offline strip appears when the network drops.
- Empty states gained the action each one was missing.

Verification: `npm run check` green (typecheck, 120 tests / 119 pass, design gate
34/34 + 168 contrast pairs, PWA 8/8, i18n 36 files) and `npm run build` succeeds,
/privacy and /terms prerendered, 103 kB shared JS.

Known gap, pre-existing on `main`: the CI job "API smoke test against a real
server" fails on its "Start, migrate and probe" step on every branch, including
`main` before these changes. Log download is blocked in this environment, so the
cause is not yet diagnosed.

---

# Resolution log — round 3 (tokens, type, spacing, components)

A measurement pass over the token layer, every stylesheet and all 26
components, then the fixes it turned up. The design gate grew from 34 to 38
rules so these cannot drift back.

## Colours

| Finding | Status | Fix |
|---|---|---|
| Two colour dialects in parallel: 324 `--color-*` alias uses beside 222 semantic ones | Fixed | Every alias use rewritten to its Calm Sea target (317 uses + 11 declaration sites in the Energized sidebar remap); the alias block is gone, so a colour has one name |
| `--accent-strong` was a role spelled as an alias with a different value inside the sidebar | Fixed | Promoted to a real token (`--accent-strong: var(--accent)`), overridden explicitly by `.sidebar` in the Energized vibe — 26 call sites restored to it |
| The Energized palette was declared in a component stylesheet | Fixed | Moved into `tokens.css` beside the other colour tokens, after the dark block so the cascade is unchanged; `vibes.css` keeps only the "where each colour lands" rules |
| The logo read `var(--color-accent)`/`var(--color-ink)` — our aliases, shadowing daisyUI's same-named tokens | Fixed | Logo stops now read `--accent` / `--text` |

## Typography

| Finding | Status | Fix |
|---|---|---|
| `font-size: 1.375rem` off the scale | Fixed | Removed; the stats value uses the scale (not reachable — see gate `font-size-scale`) |
| 12 literal line-heights (1.6 ×5, 1.35 ×3, 1.4 ×3, 1.8, 1.9, 18px) | Fixed | Mapped to `--lh-*` by intent (journal editor → `--lh-reading`, h1 → `--lh-h1`, labels → `--lh-small`) |

## Spacing and shape

| Finding | Status | Fix |
|---|---|---|
| Six magic spacing numbers | Fixed | `--content-bottom-pad` (FAB band), `--project-action-col` / `--project-actions-col` / `--project-actions-col-compact` (row action columns), `--contrib-gutter` (chart gutter) |
| 8 off-scale radii across 30 uses (5/7/8/9/12/15/16/22px) | Fixed | Snapped to the scale; one new step `--radius-xs: 4px` formalises the kbd/code case |

## Components

| Finding | Status | Fix |
|---|---|---|
| 29 classes styled but never rendered | Fixed | 47 dead selectors removed (postcss, so grouped selectors kept their live members) |
| 4 static inline style objects | Fixed | `.project-reorder-buttons`, `.project-reorder-btn`, `.habit-summary-button`; the disabled opacity stays inline because it is state |
| 29 selectors defined twice | Verified, kept | All are deliberate layering (base → shell, or a `@media`/`[data-density]` variant); none contradict |

## Gate

Four new rules, all green: `radius-scale`, `line-height-scale`,
`font-size-scale`, `space-scale` (tokens, or a documented nudge ≤4px / em / %;
a `clamp()` passes only if its stops are tokens). Design gate: **38/38**.

Verification: `npm run check` green (120 tests / 119 pass, 38 rules, 168
contrast pairs, PWA 8/8, i18n 36 files), `npm run build` at 103 kB shared JS.
