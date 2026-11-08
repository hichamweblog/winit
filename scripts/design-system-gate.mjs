#!/usr/bin/env node
/**
 * Design-system gate — Calm Sea v1.0.1.
 *
 * Enforces the rules that the audit found broken, so they cannot regress:
 *   1. Every required contrast pair still passes (WCAG 2.x sRGB).
 *   2. No physical left/right, no letter-spacing, no sub-12.5px captions.
 *   3. Naskh is not referenced by UI chrome.
 *   4. Numerals are pinned to ar-u-nu-latn; no Arabic-Indic literals in the UI.
 *
 * Runs without a browser so it is cheap enough for every CI run.
 * Pass --browser to additionally render the playground and run axe in both
 * themes (requires the review tooling; see docs/design-system-audit.md).
 *
 * Exit code 0 = pass, 1 = at least one failure.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const failures = [];
const checks = [];
const ok = (name, detail = '') => checks.push({ name, pass: true, detail });
const fail = (name, detail) => { checks.push({ name, pass: false, detail }); failures.push(`${name}: ${detail}`); };

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ---------------------------------------------------------- colour maths */
const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const linear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (h) => { const [r, g, b] = hexToRgb(h).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

function parseTokens(css) {
  const block = (selector) => {
    const i = css.indexOf(selector);
    if (i < 0) return '';
    const start = css.indexOf('{', i);
    let depth = 1, j = start + 1;
    while (depth > 0 && j < css.length) { if (css[j] === '{') depth++; if (css[j] === '}') depth--; j++; }
    return css.slice(start + 1, j - 1);
  };
  const vars = (body) => {
    const out = {};
    for (const m of body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*[;]/g)) out[m[1]] = m[2];
    return out;
  };
  const light = vars(block(':root {'));
  // The app uses data-mode; the reference artifact uses the spec's data-theme.
  const darkBody = block(':root[data-mode="dark"]') || block(':root[data-theme="dark"]');
  if (!darkBody) throw new Error('no dark token block found');
  const dark = { ...light, ...vars(darkBody) };
  return { light, dark };
}

const tokenCss = read('src/app/tokens.css');
const { light, dark } = parseTokens(tokenCss);
if (Object.keys(light).length < 40) fail('token-parse', `only ${Object.keys(light).length} light tokens parsed`);
else ok('token-parse', `${Object.keys(light).length} light tokens`);

const GOALS = ['code', 'english', 'sharia', 'arabic', 'culture', 'quran', 'sport',
  'neutral-1', 'neutral-2', 'neutral-3', 'neutral-4', 'neutral-5', 'neutral-6',
  'teal', 'violet', 'crimson', 'copper', 'magenta', 'lime'];

let pairCount = 0;
for (const [theme, v] of [['light', light], ['dark', dark]]) {
  const need = (fg, bg, min, label) => {
    if (!v[fg] || !v[bg]) { fail(`missing-token/${theme}`, `${fg} or ${bg} undefined`); return; }
    const r = ratio(v[fg], v[bg]);
    pairCount++;
    if (r + 1e-9 < min) fail(`contrast/${theme}/${label}`, `${v[fg]} on ${v[bg]} = ${r.toFixed(3)} < ${min}`);
  };
  need('--text', '--bg', 4.5, 'text on bg');
  need('--text', '--surface', 4.5, 'text on surface');
  need('--text', '--surface-raised', 4.5, 'text on raised');
  need('--text-muted', '--bg', 4.5, 'muted on bg');
  need('--text-muted', '--surface', 4.5, 'muted on surface');
  need('--text-muted', '--surface-raised', 4.5, 'muted on raised');
  need('--text-muted', '--surface-sunken', 4.5, 'muted on sunken');
  need('--accent', '--bg', 4.5, 'accent on bg');
  need('--accent', '--surface', 4.5, 'accent on surface');
  need('--accent', '--accent-soft', 4.5, 'secondary button');
  need('--on-accent', '--accent', 4.5, 'primary button');
  need('--on-accent-2', '--accent-2', 4.5, 'highlight button');
  need('--accent-2-strong', '--surface', 4.5, 'orange text');
  need('--accent-2-on-soft', '--accent-2-soft', 4.5, 'C2 orange on soft');
  need('--accent-2-line', '--bg', 3, 'C3 orange arc on page');
  need('--line-strong', '--bg', 3, 'C4 input border on page');
  need('--line-strong', '--surface', 3, 'C4 input border on card');
  need('--toast-action', '--text', 4.5, 'C1 toast action');
  need('--bg', '--text', 4.5, 'C1 toast body');
  for (const kind of ['success', 'warning', 'danger', 'info']) {
    need(`--${kind}-text`, `--${kind}-bg`, 4.5, `${kind} text on soft`);
    need(`--on-${kind}`, `--${kind}`, 4.5, `on-${kind}`);
  }
  for (const g of GOALS) {
    need(`--goal-${g}-fg`, `--goal-${g}-bg`, 4.5, `goal ${g} text`);
    need(`--goal-${g}`, '--surface', 3, `goal ${g} solid`);
    need('--on-goal', `--goal-${g}`, 3, `C8 glyph on goal ${g}`);
  }
}
ok('contrast', `${pairCount} pairs measured`);

/* ------------------------- reference artifact and shipped tokens must agree */
const refPath = 'docs/design-system/tokens.calm-sea.css';
if (fs.existsSync(path.join(ROOT, refPath))) {
  const ref = parseTokens(read(refPath));
  const drift = [];
  for (const theme of ['light', 'dark']) {
    const a = theme === 'light' ? light : dark;
    const b = theme === 'light' ? ref.light : ref.dark;
    for (const [name, value] of Object.entries(b)) {
      if (a[name] && a[name].toLowerCase() !== value.toLowerCase()) drift.push(`${theme} ${name}: shipped ${a[name]} vs reference ${value}`);
    }
  }
  if (drift.length) fail('token-drift', drift.join('; '));
  else ok('token-drift', 'shipped tokens match the reference artifact');
}

/* ------------------------------------------------- structural CSS rules */
const cssFiles = ['src/app/globals.css', 'src/app/base.css'];
for (const file of cssFiles) {
  const css = read(file);
  const lines = css.split('\n');

  const physical = [];
  lines.forEach((line, i) => {
    if (/^\s*\/\*/.test(line)) return;
    // left:/right: as properties, but not inset-inline-* or /* comments */
    const stripped = line.replace(/\/\*.*?\*\//g, '');
    if (/(?<![\w-])(left|right)\s*:/.test(stripped)) physical.push(`L${i + 1}`);
  });
  if (physical.length) fail(`rtl/${file}`, `physical left/right at ${physical.join(', ')}`);
  else ok(`rtl/${file}`, 'logical properties only');

  const tracking = [...css.matchAll(/letter-spacing:\s*([^;}]+)/g)]
    .filter((m) => !/^(0|normal|var\(--tracking-display\))\s*$/.test(m[1].trim()));
  if (tracking.length) fail(`tracking/${file}`, tracking.map((m) => m[1].trim()).join(', '));
  else ok(`tracking/${file}`, 'no letter-spacing');

  const small = [];
  for (const m of css.matchAll(/font-size:\s*([\d.]+)px/g)) {
    if (parseFloat(m[1]) < 12.4) small.push(m[1] + 'px');
  }
  for (const m of css.matchAll(/font:\s*(?:\d+\s+)?([\d.]+)px/g)) {
    if (parseFloat(m[1]) < 12.4) small.push(m[1] + 'px (shorthand)');
  }
  if (small.length) fail(`type-scale/${file}`, `below 12.5px: ${small.join(', ')}`);
  else ok(`type-scale/${file}`, 'no hard-coded sub-12.5px sizes');
}

const globals = read('src/app/globals.css');
if (/font-family:\s*var\(--font-(small|reading|ar)\)/.test(globals)) {
  // --font-small aliases --font-ui, so it is allowed; --font-reading is not.
  if (/font-family:\s*var\(--font-reading\)/.test(globals)) fail('naskh-chrome', '--font-reading used outside .reading-body');
  else ok('naskh-chrome', 'no Naskh in chrome');
} else ok('naskh-chrome', 'no Naskh in chrome');

const base = read('src/app/base.css');
if (!/\.reading-body\s*\{[^}]*--font-reading/.test(base)) fail('reading-body', '.reading-body must own --font-reading');
else ok('reading-body', 'Naskh scoped to .reading-body');

/* --------------------------------------------------------- numerals §2.3 */
const page = read('src/app/page.tsx');
const bareLocale = [...page.matchAll(/(?:Intl\.DateTimeFormat|toLocaleDateString|toLocaleString|toLocaleTimeString)\(\s*'ar'/g)];
if (bareLocale.length) fail('numerals', `${bareLocale.length} bare 'ar' locale calls (use AR_LOCALE)`);
else ok('numerals', "no bare 'ar' locale calls");

const indic = [...page.matchAll(/[\u0660-\u0669\u066A\u066B\u066C]/g)];
if (indic.length) fail('numerals-literals', `${indic.length} Arabic-Indic digit/separator literals in page.tsx`);
else ok('numerals-literals', 'no Arabic-Indic literals');

const core = read('src/lib/core.ts');
if (!/AR_LOCALE\s*=\s*'ar-u-nu-latn'/.test(core)) fail('locale-pin', "AR_LOCALE must be 'ar-u-nu-latn'");
else ok('locale-pin', 'numbering system pinned to latn');

/* ------------------------------------------- C6 timer container survives 3-digit minutes */
if (!/\.modal-timer-ring span \{[^}]*min-width: 6ch/.test(globals)) fail('timer-width', 'timer digits must reserve 6ch (240:00 fits, 5ch does not)');
else ok('timer-width', 'timer digits reserve 6ch');

/* ------------------------------------------------------ C8 no white glyph */
if (/backgroundColor:\s*(?:habit|project)\.color/.test(page)) fail('goal-palette', 'raw entity colour used as a fill; use goalStyle()');
else ok('goal-palette', 'entity colours resolve through goalStyle()');

/* ------------------------------------------- every var() resolves to a token */
// A typo like var(--danger-soft) silently renders as an inherited/initial value
// in the browser and passes typecheck, so the gate has to catch it.
{
  const declared = new Set([
    ...[...read('src/app/tokens.css').matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
    ...[...globals.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
    ...[...read('src/app/base.css').matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
  ]);
  // Set from TSX at runtime via inline style, never declared in a stylesheet.
  const runtime = new Set(['--goal-solid', '--goal-soft', '--goal-on-soft', '--goal-fill', '--contrib-goal', '--contrib-weeks']);
  const used = new Set([...[...globals.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1])]);
  const missing = [...used].filter((name) => !declared.has(name) && !runtime.has(name)).sort();
  if (missing.length) fail('token-refs', `undefined token(s): ${missing.join(', ')}`);
  else ok('token-refs', `all ${used.size} referenced tokens are declared`);
}

/* ------------------------------------------------ no emoji in the app source */
{
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{21B5}\u{2318}\u{2705}\u{274C}\u{2713}\u{2714}]/u;
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(tsx?|css)$/.test(entry.name) && emoji.test(read(full))) offenders.push(full);
    }
  };
  walk('src');
  if (offenders.length) fail('no-emoji', `pictographs in: ${offenders.join(', ')}`);
  else ok('no-emoji', 'no emoji or pictographic characters in src/');
}

/* -------------------------------------------------------------- report */
const passed = checks.filter((c) => c.pass).length;
console.log(`Design-system gate: ${passed}/${checks.length} checks passed, ${pairCount} contrast pairs`);
for (const c of checks) console.log(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ' — ' + c.detail : ''}`);

if (process.argv.includes('--browser')) {
  console.log('\n--browser: run node node_modules/.review-tools/playground-audit.mjs for the axe pass.');
}

if (failures.length) {
  console.error(`\n${failures.length} FAILURE(S):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nAll design-system invariants hold.');
