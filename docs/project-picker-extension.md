# Project picker — extended icons and colours

Requested after the production-readiness work: **more icons and colours when
creating a project.** The picker went from **6 icons / 13 colours** to
**24 icons / 19 colours**.

---

## Verification

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm test` | **46 pass / 0 fail** (was 36) |
| `npm run test:design` | **18/18 checks, 168 contrast pairs** (was 132) |
| `npm run build` | pass · First Load JS **133 kB** (was 131 kB) |
| `picker-check.mjs` (browser, end to end) | **29/29** |
| Habit picker regression | **5/5** |
| `scripts/api-smoke.mjs` | **95/95** (was 92) |
| `views-audit` / `adopt-audit` / `smoke` / `history-check` | all still pass · axe clean |

---

## Icons: 6 → 24

Grouped in the picker so two dozen options stay scannable:

| Group | Icons |
| --- | --- |
| الأساسية | برمجة، لغات، قراءة، كتابة، ثقافة، عام |
| العمل والدراسة | عمل، دراسة، مهارات، علوم، ملاحظات، أفكار |
| العبادة والصحة | عبادة، صحة، رياضة |
| الإبداع | فن، صوتيات، تصوير |
| الحياة | مال، مشاريع، فريق، منزل، سفر، طبيعة |

The original six keep their ids **and their position**, so an already-saved
project renders exactly as before.

### Single source of truth

The icon list previously lived in three places that could drift: a TS array in
`page.tsx`, a component map beside it, and a hand-written `z.enum` in the API.
Adding an icon meant editing all three, and forgetting one produced either a
silent folder fallback or a 400 on a choice the UI had just offered.

Now:

- **`src/lib/project-icons.ts`** — React-free catalogue: `PROJECT_ICON_IDS`,
  `PROJECT_ICON_LABELS`, `PROJECT_ICON_GROUPS`.
- **`src/app/project-icons.tsx`** — maps ids to Tabler components, plus
  `projectIconFor()` which falls back to the folder for unknown legacy values.
- **The API DTO** derives its enum from `PROJECT_ICON_IDS`, so the server can
  never lag behind the picker.

Seven unit tests enforce the wiring: every id has an Arabic label, every id has a
component, the groups cover the catalogue exactly once with no duplicates, the
original six are unchanged, and the API accepts every catalogue id while
rejecting anything else.

`icon` is a plain `TEXT` column, so **no migration was needed**.

---

## Colours: 13 → 19

Six new slots fill gaps the original palette left open:

| Slot | الاسم | Light | Dark |
| --- | --- | --- | --- |
| `teal` | تركوازي | `#0F7480` | `#74AEB5` |
| `violet` | بنفسجي | `#6A4CA3` | `#A997CA` |
| `crimson` | قرمزي | `#A62F45` | `#CB8693` |
| `copper` | نحاسي | `#9C5228` | `#C69B82` |
| `magenta` | أرجواني | `#A32E93` | `#CA86C0` |
| `lime` | ليموني | `#6E8C10` | `#ABBC74` |

Each slot needs **six** values — solid, soft background and text foreground, in
both themes — and each has to clear three contrast rules. Guessing eighteen
numbers is how contrast bugs ship, so `scripts/derive-goal-colors.mjs` derives
them from a single seed hue and proves every ratio:

- solid vs `--surface` ≥ 3.0 (DS-07, non-text)
- `--on-goal` vs solid ≥ 3.0 (C8, glyph inside a filled shape)
- foreground vs soft background ≥ 4.5 (text)

The lowest margin across the new slots is **3.69** (lime solid on surface) and
**4.61** for text — all above the required floors. The gate now measures **168
pairs**, up 36 (6 slots × 3 rules × 2 themes).

### Rejected candidates

The script also measures perceptual distance to every existing slot. The first
pass proposed ten colours; **six were rejected as near-duplicates**:

| Rejected | Too close to |
| --- | --- |
| amber | arabic (57) |
| olive | sharia (42) |
| sky | code (42) |
| rose | culture (30) |
| forest | quran (33) |
| indigo | neutral-4 (59), violet (51) |

Shipping those would have made the picker harder to use, not easier — two
swatches a user cannot tell apart is worse than one. The candidates were
retargeted at genuine hue gaps until all six cleared a separation threshold of
60. The script is committed so the next addition goes through the same filter.

### Compatibility

- Nothing in the database was rewritten. `resolveGoalId()` still maps the
  explicitly-listed legacy seed colours to their original slots; a test asserts
  none of them drifted when the palette grew.
- One intentional change: an unknown pure red (`#FF0000`) now resolves to
  `crimson` instead of `sport`, because crimson is the closer match. It still
  lands inside the palette, never on a raw hex.
- The habit colour picker reads the same `GOAL_SLOTS`, so it gained the six new
  colours automatically.

### Spec note

Calm Sea v1.0.1 §4.3 defines 7 named + 6 neutral slots. These six are an **app
extension**, marked as such in `tokens.css` and `goals.ts`. The rule that actually
matters — *a fixed palette, never a free colour picker* — is unchanged and now
asserted by a test: every option is a declared slot and every key is a concrete
`#RRGGBB`. The published reference artifact is left untouched, so the token-drift
gate still compares like with like.

---

## Layout

The fieldsets now hold a grid of fixed 44 px tiles (§6.3 hit area) instead of a
flat wrapping row, with a small Arabic caption per icon group. The modal already
had `max-height: 90dvh; overflow-y: auto`, so the taller picker scrolls rather
than overflowing on short screens.

Two details worth recording:

- **A layout bug the first test run missed.** The legacy rules
  `.project-icon-field > div { display: flex }` and
  `.project-color-field > div { … }` were written when each fieldset held one flat
  `<div>` of tiles. They matched the new `.picker-group` wrappers, making them
  flex containers and collapsing `.picker-grid` to min-content — **all 24 icons
  stacked in a single column.** The initial 26 checks still passed because they
  counted elements and colours, not geometry. Fixed by scoping the legacy rules
  with `:not(.picker-group)` / `:not(.picker-grid)` and giving the grid a definite
  inline size; the suite now asserts column and row counts (6 icon columns,
  10 colour columns, 5 icon rows).
- **Editing a project with an unknown legacy icon** preselects it in a separate
  "الأيقونة الحالية" row, so opening the editor and saving never silently changes
  the icon to the default folder.

---

## Accessibility

Every icon and every colour carries an Arabic `aria-label` and a `title`; colour
names are real names (`تركوازي`), not `لون 3`, so colour is never the only carrier
(§10). Radio semantics, `:checked` and `:focus-visible` styling are unchanged.
axe reports **zero violations** on the open picker in both themes, and the
24-icon grid is reachable by keyboard with the native arrow-key radio behaviour.
