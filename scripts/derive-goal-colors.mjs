#!/usr/bin/env node
/**
 * Derives and verifies new goal-palette slots.
 *
 * The design system forbids a free colour picker, so every slot needs six
 * hand-checked values (solid / soft background / text foreground, in both
 * themes). Guessing those is how contrast bugs get shipped, so this script
 * derives them from a single seed hue and proves every required ratio:
 *
 *   solid  vs --surface        >= 3.0   (DS-07, non-text)
 *   --on-goal vs solid         >= 3.0   (C8, glyph inside a filled shape)
 *   fg     vs bg               >= 4.5   (text on a soft chip)
 *
 * It also reports the perceptual distance to every existing slot so a new
 * colour cannot be a near-duplicate of one already in the picker.
 *
 * Usage: node scripts/derive-goal-colors.mjs
 */

const LIGHT = { surface: '#F7FAFB', onGoal: '#FFFFFF' };
const DARK = { surface: '#12262E', onGoal: '#0B1A20' };

const EXISTING = {
  code: '#3B6EA8', english: '#8B5A8C', sharia: '#5E7A3A', arabic: '#A9792B',
  culture: '#B8577A', quran: '#2A7A55', sport: '#CF5C36',
  'neutral-1': '#5A6B75', 'neutral-2': '#4A6B6E', 'neutral-3': '#7A5C46',
  'neutral-4': '#5C6383', 'neutral-5': '#8A7448', 'neutral-6': '#55595C',
};

/** Candidate extensions: id, Arabic label, light-theme seed hue. */
const CANDIDATES = [
  ['teal', 'تركوازي', '#0F7480'],
  ['violet', 'بنفسجي', '#6A4CA3'],
  ['crimson', 'قرمزي', '#A62F45'],
  ['copper', 'نحاسي', '#9C5228'],
  ['magenta', 'أرجواني', '#A32E93'],
  ['lime', 'ليموني', '#6E8C10'],
];

/* ---- colour maths ------------------------------------------------------ */
const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const hex = (parts) => '#' + parts.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase()).join('');
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));

const lum = (h) => {
  const [r, g, b] = rgb(h).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** Weighted RGB distance, same metric resolveGoalId() uses for legacy fallback. */
const distance = (a, b) => {
  const [x, y] = [rgb(a), rgb(b)];
  return Math.sqrt(2 * (x[0] - y[0]) ** 2 + 4 * (x[1] - y[1]) ** 2 + 3 * (x[2] - y[2]) ** 2);
};

/** Walk a colour toward a target until it clears `min` against `against`. */
function untilContrast(start, toward, against, min, step = 0.01) {
  for (let t = 0; t <= 1.0001; t += step) {
    const candidate = mix(start, toward, t);
    if (ratio(candidate, against) >= min) return { color: candidate, t: Number(t.toFixed(2)) };
  }
  return null;
}

/* ---- derivation -------------------------------------------------------- */
const results = [];
let failures = 0;

for (const [id, label, seed] of CANDIDATES) {
  // LIGHT: the seed is the solid; darken it if it cannot carry a white glyph.
  let lightSolid = seed;
  if (ratio(LIGHT.onGoal, lightSolid) < 3) {
    const fixed = untilContrast(seed, '#000000', LIGHT.onGoal, 3.05);
    if (!fixed) { console.log(`SKIP ${id}: cannot reach 3:1 under a white glyph`); failures += 1; continue; }
    lightSolid = fixed.color;
  }
  const lightBg = mix(lightSolid, '#FFFFFF', 0.86);
  const lightFg = untilContrast(lightSolid, '#000000', lightBg, 4.6);

  // DARK: lift the hue until it reads on the dark surface AND carries the dark glyph.
  let darkSolid = mix(seed, '#FFFFFF', 0.42);
  for (let i = 0; i < 60 && (ratio(darkSolid, DARK.surface) < 3.05 || ratio(DARK.onGoal, darkSolid) < 3.05); i += 1) {
    darkSolid = mix(darkSolid, '#FFFFFF', 0.04);
  }
  const darkBg = mix(darkSolid, DARK.surface, 0.80);
  const darkFg = untilContrast(darkSolid, '#FFFFFF', darkBg, 4.6);

  if (!lightFg || !darkFg) { console.log(`SKIP ${id}: no readable foreground`); failures += 1; continue; }

  const checks = [
    ['light solid/surface', ratio(lightSolid, LIGHT.surface), 3],
    ['light on-goal/solid', ratio(LIGHT.onGoal, lightSolid), 3],
    ['light fg/bg', ratio(lightFg.color, lightBg), 4.5],
    ['dark solid/surface', ratio(darkSolid, DARK.surface), 3],
    ['dark on-goal/solid', ratio(DARK.onGoal, darkSolid), 3],
    ['dark fg/bg', ratio(darkFg.color, darkBg), 4.5],
  ];
  const bad = checks.filter(([, got, min]) => got < min);
  if (bad.length) { failures += 1; console.log(`FAIL ${id}:`, bad.map(([n, g, m]) => `${n} ${g.toFixed(2)} < ${m}`).join(', ')); continue; }

  // Distinctness against everything already in the picker, in BOTH themes.
  const nearestLight = Object.entries(EXISTING).map(([k, v]) => [k, distance(lightSolid, v)]).sort((a, b) => a[1] - b[1])[0];
  const nearestNew = results.map((r) => [r.id, distance(lightSolid, r.light.solid)]).sort((a, b) => a[1] - b[1])[0];

  results.push({
    id, label, seed,
    light: { solid: lightSolid, bg: lightBg, fg: lightFg.color },
    dark: { solid: darkSolid, bg: darkBg, fg: darkFg.color },
    checks, nearestLight, nearestNew,
  });
}

/* ---- report ------------------------------------------------------------ */
console.log('\n=== derived slots ===');
for (const r of results) {
  console.log(`\n${r.id} (${r.label})  seed ${r.seed}`);
  console.log(`  light  solid ${r.light.solid}  bg ${r.light.bg}  fg ${r.light.fg}`);
  console.log(`  dark   solid ${r.dark.solid}  bg ${r.dark.bg}  fg ${r.dark.fg}`);
  console.log(`  ratios ${r.checks.map(([n, g]) => `${n}=${g.toFixed(2)}`).join('  ')}`);
  console.log(`  nearest existing: ${r.nearestLight[0]} at ${r.nearestLight[1].toFixed(0)}${r.nearestNew ? ` · nearest new: ${r.nearestNew[0]} at ${r.nearestNew[1].toFixed(0)}` : ''}`);
}

const MIN_SEPARATION = 60;
const tooClose = results.filter((r) => r.nearestLight[1] < MIN_SEPARATION || (r.nearestNew && r.nearestNew[1] < MIN_SEPARATION));
console.log(`\n=== distinctness (threshold ${MIN_SEPARATION}) ===`);
if (tooClose.length) {
  for (const r of tooClose) console.log(`  TOO CLOSE: ${r.id} — existing ${r.nearestLight[0]}=${r.nearestLight[1].toFixed(0)}${r.nearestNew ? `, new ${r.nearestNew[0]}=${r.nearestNew[1].toFixed(0)}` : ''}`);
} else console.log('  all candidates are sufficiently distinct');

console.log('\n=== token lines: LIGHT ===');
for (const r of results) console.log(`  --goal-${r.id}: ${r.light.solid}; --goal-${r.id}-bg: ${r.light.bg}; --goal-${r.id}-fg: ${r.light.fg};`);
console.log('\n=== token lines: DARK ===');
for (const r of results) console.log(`  --goal-${r.id}: ${r.dark.solid}; --goal-${r.id}-bg: ${r.dark.bg}; --goal-${r.id}-fg: ${r.dark.fg};`);
console.log('\n=== GOAL_SLOTS entries ===');
for (const r of results) console.log(`  { id: '${r.id}', label: '${r.label}', key: '${r.light.solid}' },`);

console.log(`\n${results.length} slot(s) derived, ${failures} rejected by contrast, ${tooClose.length} too close to an existing colour`);
if (failures) process.exit(1);
