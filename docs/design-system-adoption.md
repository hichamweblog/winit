# Calm Sea — Adoption Record

**Date:** 7 November 2026
**Branch:** `arena/f023bd64-winit`
**Spec:** [`design-system/design-system-v1.0.md`](./design-system/design-system-v1.0.md)
**Audit that produced the fixes:** [`design-system-audit.md`](./design-system-audit.md)

Calm Sea v1.0.1 is now the live design system of the app. This document records exactly what shipped, the decisions taken where the spec and the existing product disagreed, and what is deliberately still open.

---

## Verification

Everything below was run against the production build, not the dev server.

| Gate | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm test` | **13/13** (was 5; +8 for the goal palette, Saturday week start, and locale pinning) |
| `npm run test:design` | **16/16 checks, 132 contrast pairs**, 0 failures |
| `npm run build` | pass · First Load JS **103 kB** shared (was 103 kB — no regression) |
| axe, 4 viewports × light + 1440 dark | **0 violations**, 0 page errors, 0 horizontal overflow |
| axe, 8 views × 2 themes on desktop + 8 views on phone + focus modal | **26 scans, 0 violations** |
| Functional smoke (create/complete task, habit toggle, journal CRUD, reading toggle, timer, theme persistence) | **16/16** |
| Playground (reference components) | axe clean in both themes |
| Database baseline after all probing | 7 tasks · 5 projects · 3 habits · 0 logs · 0 sessions · 0 journal entries — unchanged |

Evidence: [`review-assets/calm-sea-adoption.json`](./review-assets/calm-sea-adoption.json), [`calm-sea-views.json`](./review-assets/calm-sea-views.json), [`calm-sea-smoke.json`](./review-assets/calm-sea-smoke.json), plus screenshots `calm-sea-*.png`.

The only text below 12.5px anywhere in the rendered app is **11.5px on mobile tab-bar labels** — the single exception §6.2 explicitly grants.

---

## The eight audit corrections, in place

| Fix | Where it lives | Verified by |
|---|---|---|
| **C1** `--toast-action` per theme | `tokens.css`; `.toast .toast-action` | gate: 4.63 light / 5.75 dark on the inverted toast |
| **C2** `--accent-2-on-soft` | `tokens.css`; used by `.journal-mood` | gate: 4.86 (the old pairing was 4.4955) |
| **C3** `--accent-2-line` | `tokens.css`; used by `.streak-flame` | gate: 4.10 on `--bg` |
| **C4** `--line-strong` → `#6E8992` | `tokens.css` | gate: 3.20 on `--bg`, 3.54 on `--surface` |
| **C5** no Naskh in the heading fallback | `tokens.css` `--font-heading` | gate: `naskh-chrome` |
| **C6** missing tokens added | `tokens.css` (reading-lg, h1-compact, tap-min, layout, neutrals, on-status) | gate: 132 pairs |
| **C7** reduced motion disables movement | `tokens.css` media block | `transition-property` restricted to opacity/colour |
| **C8** `--on-goal` instead of hardcoded white | `goals.ts` `goalStyle().onSolid`; habit check + week strip | gate: min 3.85 light / 6.58 dark across all 13 slots |

---

## What changed in the app

**Tokens** (`src/app/tokens.css`, rewritten)
Calm Sea semantic tokens for light and dark, plus a single block of **legacy aliases** (`--color-paper-*`, `--color-ink-*`, `--font-display`, `--radius-card`, …) that point at them. Because the aliases use `var()`, they resolve against the active theme automatically — the existing 550-line component layer inherited the new palette without being rewritten rule by rule. `--shadow-card` is now `none`: §5.3 makes level-0 surfaces border-only, so the old 4px "sticker" edge and hard offset shadow are gone.

**Typography** (`layout.tsx`, `base.css`)
El Messiri installed (`@fontsource/el-messiri@5.3.0`, arabic + latin 600/700) and used for headings and large numerals. Tajawal removed from the dependency tree. `--font-small` now aliases `--font-ui`, and the ~25-selector list that forced Naskh onto nav labels, counts, dates, captions and the footer has been deleted. Naskh survives in exactly one place: `.reading-body`.

Every hard-coded font size below the caption floor was mapped onto the scale — 13 declarations at 11px, 62 at 12px and 4 at 10px are gone. Emphasis in Readex is weight 600, not 700. `font-synthesis: none` stops the browser faking an Arabic italic.

**RTL and bidi** (`globals.css`, `page.tsx`)
No `left:` or `right:` remains in either stylesheet. The focus dock and toast are centred with `inset-inline` + `margin-inline: auto`, which needs no direction-dependent `translateX`. Free-text inputs carry `dir="auto"`; task titles, project names, habit names, notes and journal titles are wrapped in `<bdi>`.

**Numerals** (`core.ts`, `page.tsx`)
`AR_LOCALE = 'ar-u-nu-latn'` is pinned and used by all 10 date/number call sites — bare `'ar'` was resolving differently across ICU builds. The three Arabic-Indic literals are gone, including `page.tsx`'s character counter that rendered a locale-formatted count next to a hardcoded `٢٠٬٠٠٠` on the same line.

**Goal palette** (`src/lib/goals.ts`, new)
The database keeps its single `color` string; the light-theme solid hex is the canonical key and resolves to `var(--goal-*)` at render time, so dark mode gets the dark variant for free. Legacy seed and picker colours are mapped explicitly to their intended goal, with a nearest-colour fallback for anything unknown — **no data migration, nothing rewritten in the database**. Both colour pickers now offer the 13 spec slots instead of an ad-hoc hex list, and each swatch is labelled with its goal name.

**Components**
Buttons follow §8.1 (radius 10, no border, no scale on press) with secondary/outline/ghost/highlight/danger variants. Chips follow §8.5. Completion circles are a 20px visual inside a 44px hit area and expose `role="checkbox"` + `aria-checked`. The toast is inverted per §8.11 with the C1 action colour. Dialogs use `--surface-raised`, radius 20 and `--shadow-3`. The focus timer gained a real SVG progress ring (220px, stroke 10, round caps) with El Messiri digits in a **6ch** container so a three-digit stopwatch value cannot overflow.

**Reading card** (§8.9) applied to journal entries — Naskh 18px/1.95, a working 18→20px size toggle, paragraph spacing, and one centred 36rem column. This is the feature that finally gives Naskh a legitimate home instead of sprinkling it across chrome.

**Week strip** (§8.7) added to habit cards: seven circles, Saturday-first, fill encodes completion and the accent ring independently encodes "today". A flame in `--accent-2-line` marks streaks of 3+.

**Layout**
Breakpoints re-cut to 768 / 1100. Bottom bar is 56px with an top indicator on the active tab. The z-scale is the spec's, which means the mobile drawer (`--z-sheet: 30`) now sits **below** modals (`--z-modal: 40`) — the drawer-over-modal defect from the production review is fixed by construction rather than by a patch.

**Week start** is Saturday (`getWeekStart`, with an override parameter), and the calendar and week-bar labels were reordered to match.

---

## Decisions where spec and product disagreed

**1. Navigation kept the app's destinations.** The spec names five (اليوم · المشاريع · العادات · التركيز · الإحصاءات). The app has eight working views, and Projects/Focus/Stats do not exist as screens — focus is a dock plus a setup dialog. Inventing three screens would be fabricating product scope, and dropping Journal would delete a working feature. So the spec's navigation **styling** is adopted in full (56px bar, 11.5px labels, top indicator, accent-filled active sidebar item, goals list below a divider) while the destination set is unchanged. **This remains a product decision, not a design-system one.**

**2. Journal became the reading card.** Rather than leave §8.9 unimplemented, long-form journal content now renders in the reading container. It is the only natural long-form Arabic surface in the product.

**3. Legacy colours resolve, they do not migrate.** Existing rows keep their stored hex and render correctly through `goalStyle()`. New rows and the seed use canonical keys. Nothing destructive was run against the database.

**4. Stat cards stay neutral.** Aliasing turned the old lime stat card orange, which would have competed with the Highlight focus button. §12 allows one highlight per screen, so the card lost its fill.

---

## Deliberately not implemented

These are spec items that need product decisions or new features, not styling. They are listed so nothing is silently assumed done.

| Spec item | Status |
|---|---|
| §6.1 collapsed 72px icon rail at 768–1099px | The sidebar is still off-canvas below 1100px. The token exists; the rail does not. |
| §8.13 quick-add inline parsing (`#goal`, `!priority`, date words) | Quick-add still opens the task dialog. |
| §9 Projects / Focus / Stats as dedicated screens | Not built. See decision 1. |
| §8.10 charts beyond the existing week bars | No stats screen to host them. |
| §8.4 swipe gestures on task rows | Not implemented; the spec requires non-gesture equivalents, which do exist. |
| §8.8 completion tone / vibration | Not implemented (spec says off by default). |

---

## Keeping it honest

`npm run test:design` runs in well under a second and needs no browser. It fails the build if:

- any of the **132 contrast pairs** drops below its threshold;
- the shipped tokens drift from the reference artifact in `docs/design-system/`;
- a physical `left`/`right`, a `letter-spacing`, or a hard-coded sub-12.5px size reappears;
- Naskh leaks outside `.reading-body`;
- a bare `'ar'` locale call or an Arabic-Indic literal comes back;
- the timer container stops reserving 6ch;
- an entity colour is used as a raw fill instead of going through `goalStyle()`.

`npm run check` chains typecheck, unit tests and this gate.

**Still not covered by automation:** keyboard order, screen-reader announcements, 200% font scaling, and Naskh rendering on a real phone at 130% system scale (the spec's own §13.3). axe also reports a small number of `color-contrast` nodes as *incomplete* — those need human eyes and are not passes.
