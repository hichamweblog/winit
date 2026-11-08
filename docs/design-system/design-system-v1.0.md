# Design System: تركيز (Tarkeez) — "Calm Sea" / بحر هادئ

Version 1.0 · Arabic-first, RTL-native productivity app: tasks, projects, habits, focus timer.
Goals tracked: programming, English, Islamic sciences, Arabic, general culture, Quran, sports.

> Working name "تركيز" is a placeholder used in mockups. Rename freely; nothing here depends on it.

## 0. Changes from the approved mockups

Three values were adjusted after a contrast audit. Use the values in this document, not the mockups.

| Item | Mockup | Now | Why |
|---|---|---|---|
| Light muted text | `#5F7780` | `#52696F` | 4.08:1 on page background failed AA for small text; now 5.01:1 |
| Text on orange (accent 2) | white | `#2A1206` | White on `#E8683A` is 3.24:1; dark text is 5.45:1 |
| Orange used as text | `#E8683A` | `#B04518` ("accent-2 strong") | Orange on light surfaces was ~3:1; now 5.4:1 |

Also: the mockups used Arabic-Indic digits (٤). This system uses Western digits (see 1.3).

---

## 1. Principles

1. **Calm over loud.** One primary hue (deep teal), one energetic accent (orange) used sparingly. No gradients, no glow, no decorative blobs.
2. **Arabic first, not translated.** Layout, spacing, type and icons are designed in RTL. LTR is a derived case.
3. **Reading is a first-class mode.** Quran, creed and lesson text get their own typographic treatment (Naskh), separate from UI text.
4. **Color carries category, never status.** Goal colors identify a goal. Status colors (success, warning, danger) are separate and never reused for goals.
5. **Quiet density.** Lists are compact but breathable. Borders do most of the structural work; shadows are rare.
6. **Accessible by default.** Every text/background pair in this document passes WCAG AA (4.5:1 text, 3:1 non-text).

---

## 2. Foundations

### 2.1 RTL rules

- Set `<html lang="ar" dir="rtl">`. Use **logical CSS properties** everywhere: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `border-inline-end`, `text-align: start`. Never `left`/`right`.
- Flexbox and grid follow `dir` automatically. Do not reverse rows manually.
- **Mirror** directional icons: arrows, chevrons, back/forward, indent/outdent, list-with-bullet, progress direction.
- **Do not mirror**: clocks, checkmarks, plus, search, play/pause glyphs, charts' time axis semantics (see below), logos, phone/number glyphs.
- Time-based charts run **right to left** (past on the right, present on the left), matching reading direction. Bars grow from the baseline upward; horizontal progress bars fill from the **inline-start** (right).
- Mixed Arabic/English content (e.g. a task titled "مراجعة React hooks"): render user text with `dir="auto"` and wrap embedded fragments from data in `<bdi>`. Use `unicode-bidi: isolate` on chips and inline tags.
- Latin text inside Arabic UI (code, URLs, product names) keeps its own direction; don't force it to RTL.

### 2.2 Language & microcopy

- Modern Standard Arabic, short and imperative: "أضف مهمة", "ابدأ جلسة", "تم".
- No tashkeel (diacritics) in UI text. Tashkeel only in Quran/religious reading content.
- Prefer gender-neutral phrasing; avoid "حسابك مُرحَّب به" style forms. Use infinitives or imperatives.
- Empty states: one short sentence + one action. No jokes, no emoji.
- Never truncate Quran text with an ellipsis; show it in full or link to the full view.

### 2.3 Numerals

- **Default: Western digits (0–9)** for times, dates, counts, stats and timers. Reasons: consistent with English and code content in the same screens, easier for tabular data.
- Provide an optional setting later for Arabic-Indic digits. Tokenize it now: all numbers go through a formatter, never hardcoded strings.
- Timer and stats digits render `direction: ltr` inside their own element so "18:40" never reorders.

---

## 3. Typography

### 3.1 Families

| Role | Family | Weights | Use |
|---|---|---|---|
| Headings | **El Messiri** | 600, 700 | Screen titles, section headings, card titles, big numbers (timer, streaks) |
| UI & body | **Readex Pro** | 400, 500, 600 | Everything in the interface: body, buttons, labels, chips, captions, inputs |
| Reading | **Noto Naskh Arabic** | 400, 500 | Reading mode only: lesson notes, creed text, long descriptions, Quran-related text |

Optional upgrade: for Quranic verses specifically, **Amiri Quran** gives more faithful Uthmani letterforms and diacritic stacking. Use it only for verse text, in the same reading-card sizes.

Fallback stacks:

```css
--font-heading: "El Messiri", "Noto Naskh Arabic", Tahoma, serif;
--font-ui:      "Readex Pro", "Segoe UI", Tahoma, system-ui, sans-serif;
--font-reading: "Noto Naskh Arabic", "Amiri", Tahoma, serif;
```

Loading: self-host (e.g. `@fontsource/readex-pro`, `@fontsource/el-messiri`, `@fontsource/noto-naskh-arabic`) with `arabic` and `latin` subsets only, `font-display: swap`. Self-hosting also makes the app work offline as a PWA. Preload Readex Pro 400/500 and El Messiri 700; load Naskh lazily when the first reading card appears.

### 3.2 Type scale

Base 16px. Sizes in `rem`; px shown for reference. Letter-spacing is always `0` (tracking breaks Arabic joins).

| Token | Font | Weight | Size / line-height | Use |
|---|---|---|---|---|
| `--text-timer` | El Messiri | 700 | 64 / 1.0 | Full-screen focus timer |
| `--text-stat` | El Messiri | 700 | 40 / 1.1 | Timer card, streak count, big stats |
| `--text-h1` | El Messiri | 700 | 32 / 1.3 | Screen title (mobile: 28) |
| `--text-h2` | El Messiri | 700 | 24 / 1.4 | Section title |
| `--text-h3` | El Messiri | 600 | 18 / 1.5 | Card title, dialog title |
| `--text-body-lg` | Readex Pro | 400 | 17 / 1.7 | Task detail text, long descriptions |
| `--text-body` | Readex Pro | 400 | 15 / 1.7 | Default body, task titles |
| `--text-ui` | Readex Pro | 500 | 14 / 1.5 | Buttons, nav items, inputs, labels |
| `--text-small` | Readex Pro | 400 | 12.5 / 1.6 | Descriptions, dates, helper text |
| `--text-micro` | Readex Pro | 500 | 11.5 / 1.2 | Chips and badges only |
| `--text-reading` | Noto Naskh Arabic | 400 | 18 / 1.95 | Reading mode |
| `--text-reading-lg` | Noto Naskh Arabic | 400 | 20 / 2.0 | Reading mode, large setting |

### 3.3 Rules

1. **Never below 11.5px**, and 11.5px is for chips only. Captions are 12.5px minimum.
2. El Messiri is for headings and large numerals only. Never for body, buttons or inputs.
3. **Naskh never appears in UI chrome.** Not in buttons, tags, nav, tables, captions. Only inside a reading container at 18px or more.
4. Emphasis in Readex Pro: use weight 600, not 700 and not italic. Arabic has no true italic; browsers fake a slant that looks wrong.
5. No uppercase/lowercase tricks, no letter-spacing, no underline for emphasis (underline is for links only).
6. Line length: UI text up to ~70 characters; reading mode 55–65 characters (`max-width: 36rem`).
7. Respect user font scaling: all sizes in `rem`, layouts must survive 200%.
8. Tabular numbers: `font-variant-numeric: tabular-nums` on stats, and give the timer a fixed-width container so it doesn't jitter each second.

---

## 4. Color

### 4.1 Core tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#E9EFF1` | `#0B1A20` | App background |
| `--surface` | `#F7FAFB` | `#12262E` | Cards, sidebar, rows |
| `--surface-raised` | `#FFFFFF` | `#183139` | Menus, popovers, dialogs |
| `--surface-sunken` | `#DCE6E9` | `#08141A` | Inputs wells, progress tracks |
| `--text` | `#0E2A33` | `#E3EEF1` | Primary text |
| `--text-muted` | `#52696F` | `#86A0A8` | Secondary text, placeholders |
| `--text-disabled` | `#8AA2AA` | `#4B6670` | Disabled (exempt from contrast) |
| `--line` | `#CCDADF` | `#223A44` | Dividers, card borders |
| `--line-strong` | `#76919A` | `#527682` | Input borders, checkbox borders (≈3:1) |
| `--accent` | `#0F5566` | `#4FB3C8` | Primary actions, links, active nav, focus ring |
| `--accent-hover` | `#0B4553` | `#6CC3D5` | Hover |
| `--accent-pressed` | `#08343F` | `#8AD0DF` | Pressed |
| `--accent-soft` | `#D5E5E9` | `#153843` | Selected row, soft button fill |
| `--on-accent` | `#FFFFFF` | `#06222A` | Text/icon on accent |
| `--accent-2` | `#E8683A` | `#F08A5D` | Energy: timer progress, streak flame, primary highlight |
| `--accent-2-strong` | `#B04518` | `#F08A5D` | Orange as **text** on light surfaces |
| `--accent-2-soft` | `#F6E1D8` | `#3A2A24` | Soft orange background |
| `--on-accent-2` | `#2A1206` | `#2A1206` | Text on accent-2 fills |

Rule of proportion: ~85% neutrals, ~12% teal, ~3% orange. Orange is a highlight, never a surface.

### 4.2 Status colors

Used only for state (saved, overdue, error). Each has a solid, a soft background and a text color.

| Status | Solid L | Soft bg L | Text L | Solid D | Soft bg D |
|---|---|---|---|---|---|
| Success | `#2E7D4F` | `#DFEBE6` | `#297047` | `#5FC48B` | `#20423F` |
| Warning | `#9A6700` | `#ECE8DD` | `#8B5D00` | `#E0B14A` | `#373F33` |
| Danger | `#B3261E` | `#EFE1E0` | `#B3261E` | `#F2877F` | `#3A373D` |
| Info | `#2F6FB0` | `#DFE9F2` | `#2D69A7` | `#7FB2E8` | `#263F4F` |

In dark mode, text on the soft background uses the solid color itself.
Solid danger button: light = white on `#B3261E` (6.5:1); dark = `#2A0A08` on `#F2877F` (7.5:1).

### 4.3 Goal colors

Seven hues, chosen to be distinguishable by hue **and** lightness, muted enough to sit beside teal and orange. Each goal has a solid (dots, bars, ring accents), a soft background (chips) and a text color (chip text, ≥4.5:1 on its soft background).

| Goal (id) | Arabic | Solid L | Soft bg L | Text L | Solid D | Soft bg D | Text D |
|---|---|---|---|---|---|---|---|
| `code` | البرمجة | `#3B6EA8` | `#DDE6EF` | `#3868A0` | `#6FA3DE` | `#253F51` | `#7DACE1` |
| `english` | الإنجليزية | `#8B5A8C` | `#E8E4EB` | `#845685` | `#C093C2` | `#353C4C` | `#C398C5` |
| `sharia` | العلوم الشرعية | `#5E7A3A` | `#E2E8E0` | `#556E34` | `#9DBB75` | `#2E443C` | `#9DBB75` |
| `arabic` | العربية | `#A9792B` | `#ECE8DE` | `#876122` | `#D9A857` | `#3A4036` | `#D9A857` |
| `culture` | الثقافة العامة | `#B8577A` | `#EEE3E9` | `#9C4A68` | `#E38AA9` | `#3C3A47` | `#E490AD` |
| `quran` | القرآن | `#2A7A55` | `#DAE8E4` | `#266E4C` | `#5FBF93` | `#214542` | `#5FBF93` |
| `sport` | الرياضة | `#CF5C36` | `#F1E4DF` | `#A64A2B` | `#F2906B` | `#3F3B3A` | `#F2906B` |

Soft backgrounds are tinted over `--surface` (14% in light, 20% in dark). Solid-on-surface contrast is ≥3.6:1 for all goals in both themes, so dots and bars are legible.

Usage rules:
- A goal color is always accompanied by its **name or icon**. Color is never the only signal.
- Custom user goals (beyond the seven): offer 6 extra slots from a neutral set (slate, teal-gray, brown, indigo-gray, sand, graphite), not free color pickers.
- Goal colors are never used for success/warning/danger.
- In charts with more than 4 series, add direct labels and pattern or marker differences.

### 4.4 Priority

Priority is not a color family. It uses icon + weight + the existing palette:

| Priority | Treatment |
|---|---|
| High | Flag icon in `--accent-2-strong`, title weight 500 |
| Medium | Flag icon in `--accent` |
| Low | Flag icon in `--text-muted` |
| None | No icon |

### 4.5 Contrast report (post-audit)

| Pair | Light | Dark |
|---|---|---|
| `--text` on `--bg` | 12.9:1 | 15.0:1 |
| `--text` on `--surface` | 14.3:1 | 13.2:1 |
| `--text-muted` on `--bg` | 5.0:1 | 6.4:1 |
| `--text-muted` on `--surface` | 5.5:1 | 5.7:1 |
| `--accent` on `--bg` | 7.2:1 | 7.3:1 |
| `--on-accent` on `--accent` | 8.4:1 | 6.8:1 |
| `--on-accent-2` on `--accent-2` | 5.5:1 | 7.2:1 |
| `--accent-2-strong` on `--surface` | 5.4:1 | 6.3:1 |
| Goal text on goal soft bg | ≥4.5:1 | ≥4.5:1 |
| Status text on status soft bg | ≥4.6:1 | ≥4.7:1 |
| `--line-strong` on `--surface` (non-text) | ≈3:1 | ≈3.2:1 |

Note: `--accent-2` (`#E8683A`) alone on light surfaces is ~3:1. Use it for fills, rings and icons (non-text, 3:1 is enough), and use `--accent-2-strong` for any orange text.

---

## 5. Space, shape, elevation, motion

### 5.1 Spacing (4px base)

`--space-1: 4px` · `2: 8px` · `3: 12px` · `4: 16px` · `5: 20px` · `6: 24px` · `8: 32px` · `10: 40px` · `12: 48px` · `16: 64px`

- Component inner padding: 12–16px. Card padding: 16px (mobile) / 20px (desktop).
- Gap between list rows: 6px (compact) / 8px (comfortable).
- Screen horizontal padding: 16px (mobile), 24px (tablet), 32px (desktop).

### 5.2 Radius

`--radius-sm: 6px` (checkbox, chip inner) · `--radius-md: 10px` (inputs, buttons, task rows) · `--radius-lg: 14px` (cards, sheets) · `--radius-xl: 20px` (dialogs, large cards) · `--radius-full: 999px` (chips, avatars, dots)

### 5.3 Borders & elevation

Structure comes from 1px `--line` borders. Shadows only for things that float.

| Level | Use | Light | Dark |
|---|---|---|---|
| 0 | Cards, rows | border only | border only |
| 1 | Sticky bars | `0 1px 2px rgba(14,42,51,.06)` | `0 1px 2px rgba(0,0,0,.4)` |
| 2 | Menus, popovers | `0 6px 20px rgba(14,42,51,.10)` | `0 6px 20px rgba(0,0,0,.45)` |
| 3 | Dialogs, sheets | `0 16px 48px rgba(14,42,51,.16)` | `0 16px 48px rgba(0,0,0,.55)` |

In dark mode, elevation is mostly expressed by lighter surface tokens (`surface` → `surface-raised`), with shadow as a secondary cue.

### 5.4 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | Hover, press, checkbox |
| `--dur-base` | 200ms | Menus, chips, row state |
| `--dur-slow` | 320ms | Sheets, dialogs, page transitions |
| `--ease` | `cubic-bezier(.2, 0, 0, 1)` | Default |
| `--ease-in-out` | `cubic-bezier(.4, 0, .2, 1)` | Large moves |

- Task completion: checkbox fills (120ms), title strikes through, row fades to 60% and moves to "Done" after 600ms (undo toast appears).
- Timer ring animates with `linear` 1s steps; no bounce.
- `@media (prefers-reduced-motion: reduce)`: disable movement, keep opacity fades at 80ms.

### 5.5 Z-index

`base 0` · `sticky 10` · `dropdown 20` · `sheet 30` · `modal 40` · `toast 50`

---

## 6. Layout & navigation

### 6.1 Breakpoints

| Name | Width | Layout |
|---|---|---|
| Compact | < 768px | Single column, bottom tab bar |
| Medium | 768–1099px | Collapsed sidebar (72px icons) + content |
| Expanded | ≥ 1100px | Full sidebar (240px) + content (+ optional detail pane 360px) |

- Sidebar sits on the **inline-start** edge (right in RTL). Detail pane on the inline-end (left).
- Content max-width: 720px for lists, 1040px for dashboards, 36rem for reading.

### 6.2 Navigation

Five primary destinations, same order everywhere (right to left): **اليوم · المشاريع · العادات · التركيز · الإحصاءات**.

- Desktop sidebar: app mark at top, 5 items (icon 20px + label `--text-ui`), goals list below a divider (colored dot + name), settings at the bottom.
- Mobile bottom bar: 5 items, 56px high plus safe-area inset, icon 24px + label 11.5px (the only non-chip use of micro size), active = `--accent` icon and label with a 2px indicator bar on top.
- Active item (sidebar): `--accent` fill with `--on-accent` text, radius 10px.
- Hover (sidebar): `--accent-soft` background.

### 6.3 Touch targets

Minimum 44×44px for anything tappable, with at least 8px between adjacent targets. Checkbox visual is 20px but its hit area is the full 44px row start.

---

## 7. Iconography

- Style: outline, 1.75px stroke, rounded caps and joins, 24px grid (20px in dense UI). Recommended set: Lucide.
- Color: `currentColor`. Default `--text-muted`, active `--accent`.
- Mirror directional icons in RTL (section 2.1).
- Goal icons (one per goal, shown next to the name in the sidebar and chips ≥ 14px): `code` → code brackets, `english` → speech bubble with "A", `sharia` → book, `arabic` → feather/pen, `culture` → globe, `quran` → open book on stand, `sport` → dumbbell.
- No emoji in the UI chrome.

---

## 8. Components

All sizes in px; all colors reference tokens.

### 8.1 Button

| Variant | Background | Text | Border |
|---|---|---|---|
| Primary | `--accent` | `--on-accent` | none |
| Secondary | `--accent-soft` | `--accent` | none |
| Outline | transparent | `--text` | 1px `--line-strong` |
| Ghost | transparent | `--accent` | none |
| Highlight | `--accent-2` | `--on-accent-2` | none (max one per screen, e.g. "ابدأ التركيز") |
| Danger | `--danger` solid | on-danger | none |

- Height 44 (default), 36 (compact, desktop only). Padding-inline 16. Radius 10. Font `--text-ui`.
- Icon + label: 8px gap, icon on the inline-start side.
- States: hover → `--accent-hover`; pressed → `--accent-pressed` and no scale; focus-visible → 2px `--accent` outline, 2px offset; disabled → `--surface-sunken` bg, `--text-disabled` text.

### 8.2 Text input

- Height 44, radius 10, 1px `--line-strong` border, `--surface` background (`--surface-sunken` in dark if needed for separation).
- Label above (`--text-ui`, `--text`), helper below (`--text-small`, `--text-muted`).
- Focus: border `--accent` + 2px `--accent` ring at 25% alpha. Error: border `--danger`, helper text in danger text color with an icon.
- Placeholder: `--text-muted`. Use `dir="auto"` on free-text fields.

### 8.3 Checkbox / completion circle

- 20px, radius 6 (task checkbox may be circular, radius full, if the team prefers a TickTick-like feel; pick one and keep it).
- Unchecked: 2px `--line-strong` border (or the goal's solid color border when inside a goal-filtered view). Checked: filled with `--accent`, white/dark check glyph.
- Hit area 44px.

### 8.4 Task row

```
[checkbox] Title (15/400)                       [goal chip] [due date]
           Subtask count · note icon (12.5 muted)
```

- Min-height 52, padding 12 16, radius 10, `--surface` + 1px `--line`.
- Selected: `--accent-soft` background, 2px `--accent` on the inline-start edge.
- Done: title `--text-muted`, line-through, row opacity 0.7.
- Overdue date: `--danger` text with a calendar-alert icon (icon + text, not color alone).
- Swipe (mobile): toward inline-end = complete, toward inline-start = more actions. Both have non-gesture alternatives.

### 8.5 Chips & tags

- **Goal chip:** height 22, padding-inline 10, radius full, `--text-micro`, background = goal soft bg, text = goal text. Optional 12px icon.
- **Neutral chip (due, label):** transparent, 1px `--line`, `--text-muted`.
- **Filter chip (selectable):** height 32, `--text-ui`; selected = `--accent-soft` bg + `--accent` text + check icon.

### 8.6 Card

- `--surface`, 1px `--line`, radius 14, padding 16–20. No shadow.
- Title in `--text-h3`; optional trailing action ghost button.
- Interactive card: hover border `--line-strong`; pressed `--accent-soft`.

### 8.7 Habit tracker

- **Week strip:** 7 circles, 28px (compact 14px dots in cards), spaced 8px. Default week start Saturday (user setting). Filled = goal solid color; today = 2px `--accent` ring; missed = `--line` fill; future = outline only.
- **Streak:** El Messiri `--text-stat` number + "يوم" label in `--text-small`. A small flame glyph in `--accent-2` marks active streaks of 3+ days.
- Completing a habit: circle fills (120ms) with a soft 200ms scale 1 → 1.08 → 1.

### 8.8 Focus timer

- **Ring:** 220px (desktop) / 192px (mobile), stroke 10, round caps, track `--line`, progress `--accent` (focus) or `--accent-2` (break).
- **Digits:** El Messiri 700, `--text-timer`, `direction: ltr`, fixed-width container, centered.
- **Below the ring:** current task title (`--text-body`), goal chip, then controls.
- **Controls:** primary round button 64px (start/pause, Highlight style), secondary 44px (reset, skip). Default session 25/5, configurable.
- Session log row: goal chip + duration + time of day.
- A completed session plays a short soft tone (optional, off by default) and vibrates once on mobile. No confetti.

### 8.9 Reading card (Naskh)

- Container `--surface`, 1px `--line`, radius 14, padding 20 24, `max-width: 36rem`.
- Header: title in El Messiri 700 18px colored `--accent`; trailing meta (lesson number, reading time) in Readex 12.5 muted.
- Body: Naskh 18px/1.95, `--text`. Paragraph spacing 1em. Diacritics allowed.
- Footer actions (ghost buttons): size toggle (18/20), mark as read, add note.
- This is the **only** component allowed to use `--font-reading`.

### 8.10 Stats & charts

- Bars use goal solids; one series per goal, max 7. Gridlines `--line`, axis text `--text-small` muted.
- Week view: 7 bars, right to left. Heatmap cells 14px, radius 3, five steps from `--line` to the goal solid (or `--accent` for combined).
- Direct labels over legends; tooltip uses `--surface-raised` + elevation 2.
- Numbers in `--text-stat`, units in `--text-small`.

### 8.11 Dialog, sheet, menu, toast

- **Dialog (desktop):** `--surface-raised`, radius 20, padding 24, width 440 (max 90vw), elevation 3, scrim `rgba(8,20,26,.5)`.
- **Bottom sheet (mobile):** same surface, top radius 20, 40×4 grabber in `--line-strong`, safe-area padding.
- **Menu / popover:** `--surface-raised`, radius 12, padding 6, items 40px high, elevation 2.
- **Toast:** bottom-center, `--text` background with `--bg` text (inverted), radius 12, 4s, one action ("تراجع") in `--accent-2` (light) / `--accent-2-strong` equivalent for contrast. Never stack more than one.

### 8.12 Empty states

- 48px outline icon in `--text-muted`, one line in `--text-h3`, one line in `--text-small`, one Primary button. Centered, max-width 320.

### 8.13 Quick-add bar

- Persistent at the top of "اليوم" and inside projects: input with leading "+" icon, placeholder "أضف مهمة…".
- Inline parsing hints (chips appear as the user types): `#goal`, `!priority`, date words ("غدًا", "الأحد"). Parsed tokens turn into chips; Esc undoes parsing.

---

## 9. Screens (summary)

| Screen | Contents |
|---|---|
| اليوم | Date header (El Messiri h1) + quick-add + grouped list (Overdue / Today / Done), today's habits strip, floating "ابدأ التركيز" Highlight button on mobile |
| المشاريع | Goal list with progress; project = list with sections; kanban optional on desktop |
| العادات | Habit cards with week strip and streak; detail view with month heatmap |
| التركيز | Timer ring, task picker, session log, today's focus total |
| الإحصاءات | Focus time per goal (bars), completion trend, habit consistency heatmap |

---

## 10. Accessibility checklist

- All text/background pairs in section 4.5 meet AA. Do not introduce new pairs without testing.
- Visible focus on every interactive element: 2px `--accent` outline, 2px offset, never removed.
- Minimum touch target 44px; no hover-only interactions.
- Color is never the sole carrier of meaning (goal = color + name/icon; overdue = color + icon + text).
- Support OS dark mode, manual theme override, reduced motion, and font scaling to 200%.
- Screen readers: set `lang="ar"` on the document and `lang="en"` on embedded English fragments; announce task completion with a polite live region ("تم إنجاز المهمة، تراجع").
- Timer: announce start/pause/end, not every second.
- Gestures always have a button equivalent.

---

## 11. Implementation

### 11.1 Theme switching

Set the theme before first paint to avoid a flash:

```html
<script>
  (function () {
    try {
      var saved = localStorage.getItem("theme"); // "light" | "dark" | null
      var dark = saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    } catch (e) {}
  })();
</script>
```

### 11.2 Token file (`tokens.css`)

```css
:root {
  /* fonts */
  --font-heading: "El Messiri", "Noto Naskh Arabic", Tahoma, serif;
  --font-ui: "Readex Pro", "Segoe UI", Tahoma, system-ui, sans-serif;
  --font-reading: "Noto Naskh Arabic", "Amiri", Tahoma, serif;

  /* type scale */
  --text-timer: 4rem;     --lh-timer: 1;
  --text-stat: 2.5rem;    --lh-stat: 1.1;
  --text-h1: 2rem;        --lh-h1: 1.3;
  --text-h2: 1.5rem;      --lh-h2: 1.4;
  --text-h3: 1.125rem;    --lh-h3: 1.5;
  --text-body-lg: 1.0625rem; --lh-body-lg: 1.7;
  --text-body: 0.9375rem; --lh-body: 1.7;
  --text-ui: 0.875rem;    --lh-ui: 1.5;
  --text-small: 0.78rem;  --lh-small: 1.6;   /* 12.5px */
  --text-micro: 0.72rem;  --lh-micro: 1.2;   /* 11.5px */
  --text-reading: 1.125rem; --lh-reading: 1.95;

  /* space */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px;
  --space-12: 48px; --space-16: 64px;

  /* shape */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px;
  --radius-xl: 20px; --radius-full: 999px;

  /* motion */
  --dur-fast: 120ms; --dur-base: 200ms; --dur-slow: 320ms;
  --ease: cubic-bezier(.2, 0, 0, 1);
  --ease-in-out: cubic-bezier(.4, 0, .2, 1);

  /* z */
  --z-sticky: 10; --z-dropdown: 20; --z-sheet: 30; --z-modal: 40; --z-toast: 50;

  /* ===== light theme (default) ===== */
  color-scheme: light;
  --bg: #E9EFF1;  --surface: #F7FAFB;  --surface-raised: #FFFFFF;  --surface-sunken: #DCE6E9;
  --text: #0E2A33;  --text-muted: #52696F;  --text-disabled: #8AA2AA;
  --line: #CCDADF;  --line-strong: #76919A;
  --accent: #0F5566;  --accent-hover: #0B4553;  --accent-pressed: #08343F;
  --accent-soft: #D5E5E9;  --on-accent: #FFFFFF;
  --accent-2: #E8683A;  --accent-2-strong: #B04518;  --accent-2-soft: #F6E1D8;  --on-accent-2: #2A1206;

  --success: #2E7D4F;  --success-bg: #DFEBE6;  --success-text: #297047;
  --warning: #9A6700;  --warning-bg: #ECE8DD;  --warning-text: #8B5D00;
  --danger:  #B3261E;  --danger-bg:  #EFE1E0;  --danger-text:  #B3261E;  --on-danger: #FFFFFF;
  --info:    #2F6FB0;  --info-bg:    #DFE9F2;  --info-text:    #2D69A7;

  --goal-code: #3B6EA8;     --goal-code-bg: #DDE6EF;     --goal-code-fg: #3868A0;
  --goal-english: #8B5A8C;  --goal-english-bg: #E8E4EB;  --goal-english-fg: #845685;
  --goal-sharia: #5E7A3A;   --goal-sharia-bg: #E2E8E0;   --goal-sharia-fg: #556E34;
  --goal-arabic: #A9792B;   --goal-arabic-bg: #ECE8DE;   --goal-arabic-fg: #876122;
  --goal-culture: #B8577A;  --goal-culture-bg: #EEE3E9;  --goal-culture-fg: #9C4A68;
  --goal-quran: #2A7A55;    --goal-quran-bg: #DAE8E4;    --goal-quran-fg: #266E4C;
  --goal-sport: #CF5C36;    --goal-sport-bg: #F1E4DF;    --goal-sport-fg: #A64A2B;

  --shadow-1: 0 1px 2px rgba(14, 42, 51, .06);
  --shadow-2: 0 6px 20px rgba(14, 42, 51, .10);
  --shadow-3: 0 16px 48px rgba(14, 42, 51, .16);
  --scrim: rgba(8, 20, 26, .5);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #0B1A20;  --surface: #12262E;  --surface-raised: #183139;  --surface-sunken: #08141A;
  --text: #E3EEF1;  --text-muted: #86A0A8;  --text-disabled: #4B6670;
  --line: #223A44;  --line-strong: #527682;
  --accent: #4FB3C8;  --accent-hover: #6CC3D5;  --accent-pressed: #8AD0DF;
  --accent-soft: #153843;  --on-accent: #06222A;
  --accent-2: #F08A5D;  --accent-2-strong: #F08A5D;  --accent-2-soft: #3A2A24;  --on-accent-2: #2A1206;

  --success: #5FC48B;  --success-bg: #20423F;  --success-text: #5FC48B;
  --warning: #E0B14A;  --warning-bg: #373F33;  --warning-text: #E0B14A;
  --danger:  #F2877F;  --danger-bg:  #3A373D;  --danger-text:  #F2877F;  --on-danger: #2A0A08;
  --info:    #7FB2E8;  --info-bg:    #263F4F;  --info-text:    #7FB2E8;

  --goal-code: #6FA3DE;     --goal-code-bg: #253F51;     --goal-code-fg: #7DACE1;
  --goal-english: #C093C2;  --goal-english-bg: #353C4C;  --goal-english-fg: #C398C5;
  --goal-sharia: #9DBB75;   --goal-sharia-bg: #2E443C;   --goal-sharia-fg: #9DBB75;
  --goal-arabic: #D9A857;   --goal-arabic-bg: #3A4036;   --goal-arabic-fg: #D9A857;
  --goal-culture: #E38AA9;  --goal-culture-bg: #3C3A47;  --goal-culture-fg: #E490AD;
  --goal-quran: #5FBF93;    --goal-quran-bg: #214542;    --goal-quran-fg: #5FBF93;
  --goal-sport: #F2906B;    --goal-sport-bg: #3F3B3A;    --goal-sport-fg: #F2906B;

  --shadow-1: 0 1px 2px rgba(0, 0, 0, .4);
  --shadow-2: 0 6px 20px rgba(0, 0, 0, .45);
  --shadow-3: 0 16px 48px rgba(0, 0, 0, .55);
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 80ms; --dur-slow: 80ms; }
}

html { font-family: var(--font-ui); color: var(--text); background: var(--bg); }
```

### 11.3 Component snippets

```css
.btn { min-height: 44px; padding-inline: var(--space-4); border-radius: var(--radius-md);
  font: 500 var(--text-ui)/var(--lh-ui) var(--font-ui);
  background: var(--accent); color: var(--on-accent); border: 0;
  transition: background var(--dur-fast) var(--ease); }
.btn:hover { background: var(--accent-hover); }
.btn:active { background: var(--accent-pressed); }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.btn--highlight { background: var(--accent-2); color: var(--on-accent-2); }

.chip { display: inline-flex; align-items: center; height: 22px; padding-inline: 10px;
  border-radius: var(--radius-full); font: 500 var(--text-micro)/1 var(--font-ui);
  unicode-bidi: isolate; }
.chip[data-goal="code"] { background: var(--goal-code-bg); color: var(--goal-code-fg); }
/* repeat per goal id: english, sharia, arabic, culture, quran, sport */

.task { display: flex; align-items: center; gap: var(--space-3); min-height: 52px;
  padding: var(--space-3) var(--space-4); background: var(--surface);
  border: 1px solid var(--line); border-radius: var(--radius-md); }
.task[aria-selected="true"] { background: var(--accent-soft);
  border-inline-start: 2px solid var(--accent); }
.task[data-done="true"] .task__title { color: var(--text-muted); text-decoration: line-through; }

.reading { max-width: 36rem; padding: var(--space-5) var(--space-6);
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-lg); }
.reading__body { font: 400 var(--text-reading)/var(--lh-reading) var(--font-reading); }

.timer__digits { font: 700 var(--text-timer)/var(--lh-timer) var(--font-heading);
  direction: ltr; font-variant-numeric: tabular-nums; min-width: 5ch; text-align: center; }
```

---

## 12. Do / Don't

| Do | Don't |
|---|---|
| Use teal for the primary action, orange for one highlight per screen | Put orange and teal buttons side by side as equals |
| Pair every goal color with its name or icon | Use goal colors to mean success or error |
| Keep Naskh inside reading cards at 18px+ | Use Naskh for tags, captions or buttons |
| Use logical properties (`inline-start`) | Use `left` / `right` or manual row reversal |
| Mirror arrows and chevrons | Mirror clocks, checkmarks or the logo |
| Use weight 600 for emphasis | Use italics, underline emphasis or letter-spacing |
| Use `--accent-2-strong` for orange text | Set text in `--accent-2` on light surfaces |
| Use soft backgrounds for chips | Use saturated solid fills for tags |
| Use borders for structure, shadows for floating layers | Add shadows to every card |
| Provide Western digits by default | Mix Arabic-Indic and Western digits on one screen |

---

## 13. Next steps (suggested)

1. Build a small component playground page that renders every component above in light and dark, to catch token mistakes early.
2. Wire `tokens.css` into the real project and map tokens to your styling layer (CSS variables work directly with Tailwind or plain CSS).
3. Test the Naskh reading card on a real phone at 100% and 130% system font scale.
4. Decide the checkbox shape (rounded square vs circle) and week start day, then freeze v1.0.
