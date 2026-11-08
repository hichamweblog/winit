# Design System Audit — تركيز (Tarkeez) · "Calm Sea" v1.0

**Audit date:** 7 November 2026
**Spec reviewed:** [`design-system/design-system-v1.0.md`](./design-system/design-system-v1.0.md) (600 lines, as supplied)
**Codebase compared:** `hichamweblog/winit` @ `f6bbc52dacf16931f6ab490a1e890f7c4e66e7b2`
**Method:** WCAG 2.x sRGB relative-luminance computation over **139 colour pairs** + a working component playground rendered in Chromium with **axe-core** in both themes + a rule-by-rule diff against the app's actual CSS/TSX.

> **Status: adopted.** Calm Sea v1.0.1 shipped into the app on 7 November 2026 with all eight corrections below.
> See [`design-system-adoption.md`](./design-system-adoption.md) for what changed, the decisions taken, and the verification results.

**Deliverables from this audit**

| Artifact | Purpose |
|---|---|
| [`design-system/tokens.calm-sea.css`](./design-system/tokens.calm-sea.css) | v1.0.1 token file — 8 documented corrections, 100/100 pairs pass |
| [`design-system/playground.html`](./design-system/playground.html) | Every component in both themes, live contrast readouts — **0 axe violations** |
| [`review-assets/design-system-light.png`](./review-assets/design-system-light.png) · [dark](./review-assets/design-system-dark.png) · [mobile](./review-assets/design-system-mobile.png) | Rendered evidence |
| [`review-assets/design-system-contrast.json`](./review-assets/design-system-contrast.json) | All 139 measured pairs |
| [`review-assets/design-system-goal-glyphs.json`](./review-assets/design-system-goal-glyphs.json) | White-glyph-on-goal-solid measurements |
| [`review-assets/design-system-playground.json`](./review-assets/design-system-playground.json) | axe results, font load status, overflow checks |

---

## Verdict

**This is a genuinely good design system — adopt it, with eight fixes.** The colour maths are honest, the RTL and Arabic typography rules are more rigorous than most production systems, and the token architecture is sound. It is not a spec that needs rethinking; it needs a short correction pass and an implementation plan.

The important caveat: **the published contrast report only tests the pairs it lists.** The failures below all live in pairs the report never measured — colours that are individually compliant but fail *in the combination a component actually puts them in*. Two of them affect every goal colour in dark mode.

| Area | Assessment |
|---|---|
| Colour foundations | **Strong.** All 18 published ratios verified accurate. All 14 goal tints match the stated formula exactly. |
| Contrast completeness | **Incomplete.** 8 real defects in undocumented component combinations (below). |
| Arabic / RTL rules | **Excellent.** Logical properties, `dir="auto"`, no fake italic, no letter-spacing, Naskh quarantined. |
| Internal consistency | **Needs a pass.** 8 self-contradictions, mostly touch targets and fallback rules. |
| Token completeness | **Gaps.** ~15 tokens referenced by prose but absent from `tokens.css`. |
| Fit to current Winit | **Full re-skin + IA change**, not a token swap. Details in §5. |

---

## 1. What the spec gets right (verified, not assumed)

Every number in §4.5 was recomputed from the hex values. **All of them are correct** within rounding:

| Pair | Doc | Measured | Doc | Measured |
|---|---|---|---|---|
| | **Light** | | **Dark** | |
| `--text` on `--bg` | 12.9 | **12.94** | 15.0 | **15.02** |
| `--text` on `--surface` | 14.3 | **14.33** | 13.2 | **13.23** |
| `--text-muted` on `--bg` | 5.0 | **5.01** | 6.4 | **6.43** |
| `--text-muted` on `--surface` | 5.5 | **5.55** | 5.7 | **5.67** |
| `--accent` on `--bg` | 7.2 | **7.20** | 7.3 | **7.28** |
| `--on-accent` on `--accent` | 8.4 | **8.36** | 6.8 | **6.78** |
| `--on-accent-2` on `--accent-2` | 5.5 | **5.45** | 7.2 | **7.16** |
| `--accent-2-strong` on `--surface` | 5.4 | **5.40** | 6.3 | **6.33** |

Also confirmed:

- **The §0 changelog is truthful.** Old muted `#5F7780` really was 4.08:1 (fail); white on `#E8683A` really is 3.24:1 (fail); the replacements really do pass at 5.01 and 5.45.
- **The tint formula is exact.** 14% goal colour over `--surface` (light) and 20% (dark) reproduces all 14 published soft backgrounds to within one channel. **14/14 match.** This is unusually disciplined.
- **All 14 goal text-on-soft pairs pass**, minimum 4.65 (light sport). The doc's "≥4.5" is a floor, not a claim of equality — the higher measured values are not errors.
- **Status text minimums hold:** light min 4.63 (info), dark min 4.77 (danger), matching the claimed ≥4.6 / ≥4.7.
- **The `--on-accent-2` decision is the right one.** Dark ink `#2A1206` on orange (5.45) instead of white (3.24) is exactly the call most systems get wrong.

The §12 Do/Don't table is the strongest part of the document. "Pair every goal colour with its name or icon", "use logical properties", "don't mix Arabic-Indic and Western digits on one screen" — these are the rules that actually prevent Arabic UI defects.

---

## 2. Contrast defects (measured, ranked)

Ratios below are computed, not estimated. Text needs **4.5:1**; meaningful non-text graphics and UI boundaries need **3:1** (WCAG 1.4.11).

### DS-01 · Every dark-mode goal colour fails with a white check inside it — **High**

§4.3 verifies `--goal-X` against `--surface`. But §8.7 specifies the habit week strip as *"Filled = goal solid color"* with a check glyph, and §8.3 says *"white/dark check glyph"*. In dark mode all seven goal solids are light pastels, so a white glyph fails on **all seven**:

| Goal (dark) | Solid | White glyph | Required |
|---|---|---|---|
| code | `#6FA3DE` | **2.64** | 3.0 |
| english | `#C093C2` | **2.56** | 3.0 |
| sharia | `#9DBB75` | **2.14** | 3.0 |
| arabic | `#D9A857` | **2.17** | 3.0 |
| culture | `#E38AA9` | **2.48** | 3.0 |
| quran | `#5FBF93` | **2.24** | 3.0 |
| sport | `#F2906B` | **2.34** | 3.0 |

**Fix [C8]:** add `--on-goal` — `#FFFFFF` in light, `#0B1A20` in dark — mirroring the `--on-accent` pattern the spec already uses. One token covers all 13 goal colours: light minimum **3.85**, dark minimum **6.58**. Never hardcode white inside a goal-coloured fill.

### DS-02 · The dark-mode toast action is unreadable — **High**

§8.11 inverts the toast (`--text` background, `--bg` text) and specifies the action in *"`--accent-2` (light) / `--accent-2-strong` equivalent for contrast"*. The inversion is the trap: **in dark mode the toast background becomes light** (`#E3EEF1`), and both oranges fail against it.

| Theme | Action colour | Toast bg | Ratio |
|---|---|---|---|
| Light | `--accent-2` `#E8683A` | `#0E2A33` | 4.63 PASS |
| Dark | `--accent-2-strong` `#F08A5D` | `#E3EEF1` | **2.09** FAIL |
| Dark (using `--accent-2` instead) | `#F08A5D` | `#E3EEF1` | **2.09** FAIL |

Note that in dark mode `--accent-2` and `--accent-2-strong` are *the same value*, so the spec's fallback provides no escape.

**Fix [C1]:** `--toast-action` — light `#E8683A` (4.63), dark `#9C3D14` (**5.75**). A toast action must be tokenised separately from the accent scale precisely because the surface inverts.

### DS-03 · Orange text on orange soft background rounds to a pass but isn't — **Medium**

`--accent-2-strong` `#B04518` on `--accent-2-soft` `#F6E1D8` = **4.4955:1**. It displays as "4.50" and will be signed off as compliant; it fails AA by 0.0045. This combination is what a "highlight" chip or badge naturally becomes.

**Fix [C2]:** `--accent-2-on-soft` = `#A84116` → **4.86**. (Dark equivalent `#F08A5D` on `#3A2A24` = 5.53.)

### DS-04 · Orange rings and arcs fail on the page background — **Medium**

The §4.5 note says `--accent-2` is safe for *"fills, rings and icons (non-text, 3:1 is enough)"* — true **on `--surface` (3.09)** but false **on `--bg` (2.79)**. §8.8 puts the break-progress arc in `--accent-2`, and a full-screen focus view sits on `--bg`.

**Fix [C3]:** `--accent-2-line` = `#C24E22` → **4.10** on `--bg`. Keep `--accent-2` for fills. Add the usage rule: *orange arcs on the page background use `--accent-2-line`; on a card, `--accent-2` is fine.* Avoid reusing `--goal-sport` (`#CF5C36`) here — it would make the break ring look like a goal marker.

### DS-05 · Input borders fail against the page, not the card — **Medium**

§4.5 measures `--line-strong` on `--surface` (3.18 PASS) but an input rendered directly on the page has its border adjacent to `--bg`, where `#76919A` = **2.88** FAIL. The input's own fill differs from the page by only **1.11:1**, so the border is the *only* thing identifying the field — it must clear 3:1 against the page.

**Fix [C4]:** light `--line-strong` `#76919A` → **`#6E8992`** = 3.20 on `--bg`, 3.54 on `--surface`. Dark value already passes both (3.61 / 3.18) and is unchanged. **This is the only published colour value the audit changes.**

### DS-06 · The specified focus ring is invisible — **Medium**

§8.2 asks for *"2px `--accent` ring at 25% alpha"*. Composited over the surface that produces:

| Theme | Blended ring | vs surface | Solid `--accent` instead |
|---|---|---|---|
| Light | `#BDD1D6` | **1.51** | 7.97 |
| Dark | `#214955` | **1.60** | 6.42 |

§10 separately mandates *"2px `--accent` outline, 2px offset, never removed"* — solid. The two sections disagree, and the §8.2 version fails 1.4.11 / 2.4.11.

**Fix:** keep the solid outline from §10 and §11.3 (`.btn:focus-visible`). If a soft halo is wanted for depth, add it *in addition to* the solid outline, never instead of it. The playground uses the solid rule.

### DS-07 · `--line` cannot be the sole boundary of an interactive card — **Judgment call**

§5.3 makes structure come from 1px `--line`, which measures **1.37** on surface and **1.23** on bg (light); **1.31 / 1.49** (dark).

This is **not automatically a violation**: purely decorative grouping borders are exempt from 1.4.11. A task row whose only control is its checkbox is fine. But where the *card or row itself* is the click target (project cards, selectable rows, kanban cards), the boundary is the affordance and needs 3:1 — or a second cue (elevation, fill difference, hover state, an explicit control).

**Recommendation:** state the exemption explicitly in §5.3 — *"`--line` is decorative grouping. Any surface that is itself a control must use `--line-strong` or a non-border affordance."* Otherwise implementers will read "structure comes from `--line`" as universal.

### DS-08 · Two thin margins worth recording — **Low**

- `--text-muted` on `--surface-sunken` (light) = **4.58**. §4.1 suggests sunken for input wells; placeholder text there has only 0.08 of headroom. Prefer `--surface` for inputs, as §8.2 already says.
- §8.7 "missed = `--line` fill" = **1.37 / 1.31** against the card. Acceptable *only because* the absence of the check glyph carries the state. Don't let colour-fill alone distinguish missed from future.

---

## 3. Internal contradictions

These are spec-vs-spec conflicts. Each needs a decision before v1.0 is frozen, because two developers reading different sections will build different things.

| # | Conflict | Sections | Recommended resolution |
|---|---|---|---|
| 1 | **44px minimum vs four smaller components.** Menu items 40px, filter chips 32px, compact buttons 36px, habit circles 28px/14px — all tappable. | §6.3 vs §8.11, §8.5, §8.1, §8.7 | Keep the *visual* size; guarantee a 44px hit area via padding or a pseudo-element. Compact 36px is desktop-pointer-only, which §8.1 already says — extend that qualifier to menu items and filter chips. Playground uses 44px throughout. |
| 2 | **Naskh banned in chrome, but named as the heading fallback.** A failed El Messiri load silently puts Naskh in every heading. | §3.3 rule 3 vs §3.1 / §11.2 | **[C5]** drop `"Noto Naskh Arabic"` from `--font-heading`; fall back to Tahoma/Segoe UI. |
| 3 | **Input background: sunken or surface?** §4.1 calls `--surface-sunken` "input wells"; §8.2 says `--surface`. | §4.1 vs §8.2 | Use `--surface` (better muted-text margin, see DS-08). Reserve sunken for read-only/disabled and inset group backgrounds. |
| 4 | **Focus ring: 25% alpha or solid?** | §8.2 vs §10 / §11.3 | Solid. See DS-06. |
| 5 | **Reduced motion only shortens durations.** Setting `--dur-*` to 80ms still animates transforms, scale and slides; §5.4 asks to *"disable movement, keep opacity fades"*. The §8.7 habit `scale 1 → 1.08 → 1` would still run. | §5.4 prose vs §11.2 code | **[C7]** add an explicit `transition-property: opacity, color, background-color, border-color` override plus `animation-iteration-count: 1` and `scroll-behavior: auto`. |
| 6 | **11.5px "for chips only" — but also nav labels.** | §3.3 rule 1 vs §6.2 | Reword rule 1: *"11.5px is permitted only for goal chips and mobile tab-bar labels."* §6.2 already calls it "the only non-chip use". |
| 7 | **`.task[aria-selected="true"]` is invalid ARIA.** §11.3 styles selection with `aria-selected` on a plain `div`. **Browser-confirmed:** axe raised `aria-allowed-attr` on exactly this markup in the first playground run. | §11.3 vs §10 | Either give the row a role that permits it (`option` inside `listbox`, or `row` inside `grid`), or style with `data-selected` and expose state on the actual control. The playground uses `data-selected`. |
| 8 | **`min-width: 5ch` on the timer breaks at 100 minutes.** §11.3 fixes the digits container at 5ch, which fits `25:00` but not `240:00`. Winit's `formatClock` emits unpadded minutes, and its stopwatch can exceed an hour. | §11.3 vs §3.3 rule 8 | **[C6]** `min-width: 6ch`. Keeps the anti-jitter intent, survives three-digit minutes. |

---

## 4. Missing tokens

Prose in the spec requires these; §11.2 does not define them. All are added in v1.0.1 and verified (**100/100 pairs pass**).

| Missing | Required by | Added |
|---|---|---|
| `--text-reading-lg` / `--lh-reading-lg` | §3.2, §8.9 size toggle (18/20) | `1.25rem` / `2` |
| Mobile `--text-h1` (28px) | §3.2 "mobile: 28" | `--text-h1-compact: 1.75rem` |
| 6 neutral custom-goal slots | §4.3 "6 extra slots" | `--goal-neutral-1..6` + `-bg` / `-fg`, all ≥4.5 text and ≥3 solid |
| `--on-success` / `--on-warning` / `--on-info` | Only `--on-danger` existed; solid status buttons had no text colour | All four now defined, 4.87–8.14 |
| `--on-goal` | DS-01 | Per theme |
| `--tap-min`, `--focus-width`, `--focus-offset` | §6.3, §10 | `44px`, `2px`, `2px` |
| `--row-gap-compact/comfortable`, `--screen-pad` | §5.1, §6.1 | 6/8px; 16→24→32px across breakpoints |
| `--sidebar-collapsed/expanded`, `--bottom-bar-h`, `--content-max-*` | §6.1, §6.2, §3.3 | 72/240px, 56px, 720/1040px/36rem |
| Breakpoints | §6.1 | Documented as `--bp-*` for JS, **with a note that CSS media queries cannot read `var()`** — the queries must hardcode 768/1100 |

Two smaller notes: the dark block never redefines `--scrim` (it inherits correctly — not a bug, but worth a comment), and §8.10 charts have no token for axis/gridline colour, which will otherwise be invented per-chart.

---

## 5. Divergence from the current Winit implementation

**This is not a token swap.** Winit today is a warm-paper palette with hot-pink and lime accents; Calm Sea is deep teal and orange. Adopting it is a re-skin plus an information-architecture change.

| Area | Winit today (evidence) | Calm Sea requires | Effort |
|---|---|---|---|
| **Palette** | `--color-paper-*`, `--color-ink-*`, hot-pink/lime accents (`src/app/tokens.css`) | Entirely new token set | Full re-skin |
| **Display font** | `--font-display: "Tajawal"` (`tokens.css:40`); **El Messiri is not installed** | El Messiri 600/700 | `@fontsource/el-messiri@5.3.0` exists; Arabic 600+700 = 25 KB, Latin 600+700 = 28 KB. Vendored for the playground under `design-system/fonts/` (OFL licence included) |
| **Naskh in chrome** | `--font-small: "Noto Naskh Arabic"` applied to **~25 chrome selectors** — nav labels, counts, dates, task meta, captions, footer (`globals.css:355–364`) | §3.3 rule 3 forbids this outright | Rewrite that selector list to `--font-ui`; keep Naskh only in a reading container |
| **Physical properties** | `left: 50%; right: auto` on `.focus-dock` (`globals.css:284`) and `.toast` (`:291`), plus the desktop override (`:337`) | §2.1 forbids `left`/`right` | `inset-inline-start` + logical transform |
| **Letter-spacing** | `base.css:19` headings use `--tracking-display`; `.brand-name` uses `-0.04em` (`globals.css:37`) | §3.3 rule 5: never | Set to 0 (the token is already 0; the brand rule is the live offender) |
| **Font sizes** | `globals.css` contains **13 declarations at 11px**, **62 at 12px**, **4 at 10px** — e.g. `.task-priority-label` at 11px (`:123`) | Captions ≥12.5px; 11.5px only chips + tab labels | Raise to `--text-small` / `--text-micro` |
| **Numerals** | Bare `Intl.DateTimeFormat('ar')` / `toLocaleDateString('ar')` in 10 places. In this Node/ICU build `ar` yields Western digits, but `ar-EG` yields `٧ نوفمبر` — **the result is implementation-dependent**. Worse, `page.tsx:476` renders `{content.length.toLocaleString('ar')} / ٢٠٬٠٠٠ حرف`: a locale-formatted count next to a **hardcoded Arabic-Indic literal**, so the same line mixes digit systems whenever the locale resolves to `latn`. Two more `٪` literals at `:491` and `:518` | §2.3 Western digits; §12 "never mix Arabic-Indic and Western digits on one screen" | Pin **`ar-u-nu-latn`** everywhere; replace the 3 literals (`20,000`, `%`) |
| **Bidi isolation** | **0** uses of `<bdi>` or `dir="auto"` in `page.tsx` | §2.2 / §8.2 require `dir="auto"` on free text | Add to titles, notes, project names, inputs |
| **Navigation / IA** | 8 views: today, upcoming, inbox, all, matrix, calendar, habits, journal | 5 destinations: اليوم · المشاريع · العادات · التركيز · الإحصاءات | **Biggest decision.** The spec has no home for **Journal**, which exists and works today; and المشاريع / التركيز / الإحصاءات are not screens yet (focus is a dock/modal) |
| **Breakpoints** | 40rem (640), 60rem (960), 90rem (1440); bottom bar 64px | 768 / 1100; bottom bar 56px | Re-cut media queries. Note the confirmed 768px nav/footer overlap in the production review lands exactly in the spec's new "medium" band |
| **Z-order** | `--z-modal: 400`, drawer/tooltip `600` — the drawer renders **above** the modal (confirmed bug P1-06) | `sheet 30 < modal 40` | **The spec fixes this bug by construction.** Adopt its scale |
| **Week start** | `getWeekStart` uses `(getDay()+6)%7` → **Monday**; labels start الاثنين (`page.tsx:48`) | **Saturday** default (§8.7) | Change the offset and label order, or make it the user setting the spec mentions |
| **Reading mode** | Does not exist | §8.9 Naskh reading card, 18/20px toggle | New component + content source |
| **Timer digits** | `formatClock` returns unpadded minutes (`core.ts:83`) | Fixed-width container | 6ch, per contradiction #8 |

**Information architecture is the real decision, not the colours.** Before implementing, decide whether Journal becomes a sixth destination, moves under المشاريع, or is reached from اليوم. Five destinations with an orphaned feature is worse than six coherent ones.

---

## 6. Recommended sequence

Ordered so that cheap, high-certainty work lands first and the expensive IA decision is made deliberately rather than mid-refactor.

**Phase 1 — freeze the spec (≈1 day)**
Apply corrections C1–C8, resolve the 8 contradictions, add the missing tokens. Adopt [`tokens.calm-sea.css`](./design-system/tokens.calm-sea.css) as v1.0.1. Decide checkbox shape and week start (§13.4 of the spec) at the same time.

**Phase 2 — typography and RTL hygiene (≈2–3 days, no palette change)**
Install El Messiri; remove Naskh from the ~25 chrome selectors; eliminate `left`/`right` and letter-spacing; raise sub-12.5px sizes; pin `ar-u-nu-latn` and fix the 3 literals; add `dir="auto"`/`<bdi>`. This is independently valuable even if Calm Sea is never adopted, and it is where most Arabic UI defects actually live.

**Phase 3 — decide IA, then re-skin (≈1–2 weeks)**
Resolve Journal's home and whether Projects/Focus/Stats become screens. Then map the old palette to the new tokens component by component, re-cut breakpoints to 768/1100, and adopt the spec's z-scale (which retires the drawer-over-modal bug).

**Phase 4 — new components and gates (≈1 week)**
Reading card, quick-add parsing chips, stats charts. Add a CI gate that runs the playground through axe in both themes and fails on any new contrast pair — the spec's own §10 rule *"do not introduce new pairs without testing"* is only enforceable mechanically.

**Suggested CI gate:** the playground already computes every ratio in-browser and exposes `data-ok` on each. A single assertion that no `[data-ok="false"]` exists, plus an axe run, catches DS-01 through DS-06 regressions permanently.

---

## 7. Validation and limits

**What was actually run**

- 139 contrast pairs computed from the spec's own hex values (WCAG 2.x sRGB formula), including all §4.5 claims, the §0 changelog, all 7 goals × 2 themes × 4 contexts, and 31 component-required pairs the spec never documents.
- The v1.0.1 token file re-parsed and re-measured: **100 checks, 0 failures** ([`design-system-corrections.json`](./review-assets/design-system-corrections.json)).
- The playground rendered in Chromium 133 at 1280px and 390px: **all 11 font faces loaded**, **0 failed requests**, **0 page errors**, **0 horizontal overflow at 390px**, **0 axe violations in light and dark** (WCAG 2.0/2.1/2.2 A+AA tags).
- The `aria-selected` finding (contradiction #7) was **discovered by axe in the browser**, not by reading — the first playground run faithfully reproduced the spec's snippet and failed.

**Limits — please read**

- axe reports **4 `color-contrast` items as `incomplete`** in each theme (SVG/icon-adjacent nodes it cannot resolve). These need a human check; they are not passes.
- Contrast maths is exact, but **WCAG compliance is not only contrast**. Keyboard order, screen-reader announcement, 200% font scaling and real-device Naskh rendering (§13.3 of the spec) were **not** tested here.
- The playground is a **static component reference, not the app**. It proves the tokens work together; it does not prove Winit works after migration.
- No application source was modified in this pass. `src/` is untouched; the only changes are new files under `docs/` plus a README link.
- The playground reads Readex Pro and Noto Naskh from `node_modules`, so run `npm ci` first. El Messiri is vendored locally because it is not yet an app dependency.

**To view the playground**

```bash
node node_modules/.review-tools/static-server.mjs   # http://localhost:3001/
```

It is currently running as a live preview on port 3001. The app preview on port 3000 was left untouched.

---

## 8. One-paragraph summary

Calm Sea is a well-built system whose published numbers are all correct — the audit changed exactly **one** existing colour value (`--line-strong` light). Everything else is *addition*: eight corrections, mostly tokens for combinations the spec's contrast report never tested. The two that matter most are the **white check on dark-mode goal fills** (fails on all seven goals) and the **dark toast action** (2.09:1), both invisible to the published report and both fixed by a single token each. Resolve the eight internal contradictions — especially the 44px touch-target rule and the invalid `aria-selected` snippet — then treat adoption as a typography/RTL pass followed by a deliberate IA decision and re-skin, not a find-and-replace on colour variables.
