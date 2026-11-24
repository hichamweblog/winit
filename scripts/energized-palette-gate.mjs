#!/usr/bin/env node
/** Contrast checks for the optional Energized palette layer. */
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
function varsFor(css, selector) {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Missing palette selector: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return Object.fromEntries([...css.slice(open + 1, close).matchAll(/(--[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((match) => [match[1], match[2]]));
}
const linear = (value) => { const c = parseInt(value, 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex) => {
  const rgb = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map(linear);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
const contrast = (a, b) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const base = read('src/app/tokens.css');
const vibe = read('src/app/vibes.css');
const selectedPalette = ['#3E3758', '#8AB946', '#B0CFDD', '#C1F0EC'];
const missingPaletteColors = selectedPalette.filter((color) => !vibe.toLowerCase().includes(color.toLowerCase()));
if (missingPaletteColors.length) throw new Error(`Selected palette color(s) missing from app theme: ${missingPaletteColors.join(', ')}`);
console.log(`Selected four-color palette is present: ${selectedPalette.join(' / ')}`);
const lightBase = varsFor(base, ':root {');
const darkBase = { ...lightBase, ...varsFor(base, ':root[data-mode="dark"]') };
const themes = {
  light: { ...lightBase, ...varsFor(vibe, ':root[data-vibe="energy"] {') },
  dark: { ...darkBase, ...varsFor(vibe, ':root[data-vibe="energy"][data-mode="dark"]') },
};
const pairs = [
  ['--text', '--bg', 4.5], ['--text', '--surface', 4.5], ['--text', '--surface-raised', 4.5],
  ['--text-muted', '--bg', 4.5], ['--text-muted', '--surface', 4.5], ['--text-muted', '--surface-raised', 4.5],
  ['--text-muted', '--surface-sunken', 4.5], ['--accent', '--bg', 4.5], ['--accent', '--surface', 4.5],
  ['--accent', '--accent-soft', 4.5], ['--on-accent', '--accent', 4.5], ['--on-accent-2', '--accent-2', 4.5],
  ['--accent-2-strong', '--surface', 4.5], ['--accent-2-on-soft', '--accent-2-soft', 4.5],
  ['--accent-2-line', '--bg', 3], ['--line-strong', '--bg', 3], ['--line-strong', '--surface', 3],
  ['--toast-action', '--text', 4.5], ['--bg', '--text', 4.5],
  ['--energy-sidebar-text', '--energy-sidebar-bg', 4.5],
  ['--energy-sidebar-muted', '--energy-sidebar-bg', 4.5],
  ['--energy-sidebar-active-text', '--energy-sidebar-active', 4.5],
  ['--energy-sidebar-muted', '--energy-sidebar-hover', 4.5],
  ['--energy-sidebar-active-text', '--energy-sidebar-accent', 4.5],
  ['--text', '--energy-card-blue', 4.5], ['--text', '--energy-card-mint', 4.5], ['--text', '--energy-card-green', 4.5],
  ['--energy-hero-text', '--energy-hero-bg', 4.5],
  ['--energy-hero-muted', '--energy-hero-bg', 4.5],
];
for (const kind of ['success', 'warning', 'danger', 'info']) {
  pairs.push([`--${kind}-text`, `--${kind}-bg`, 4.5], [`--on-${kind}`, `--${kind}`, 4.5]);
}
const goals = ['code', 'english', 'sharia', 'arabic', 'culture', 'quran', 'sport', 'neutral-1', 'neutral-2', 'neutral-3', 'neutral-4', 'neutral-5', 'neutral-6', 'teal', 'violet', 'crimson', 'copper', 'magenta', 'lime'];
for (const goal of goals) {
  pairs.push([`--goal-${goal}-fg`, `--goal-${goal}-bg`, 4.5], [`--goal-${goal}`, '--surface', 3], ['--on-goal', `--goal-${goal}`, 3]);
}
for (const [name, values] of Object.entries(themes)) {
  const failures = [];
  for (const [fg, bg, minimum] of pairs) {
    if (!values[fg] || !values[bg]) { failures.push(`${fg}/${bg}: missing token`); continue; }
    const actual = contrast(values[fg], values[bg]);
    if (actual + 1e-9 < minimum) failures.push(`${fg} ${values[fg]} on ${bg} ${values[bg]} = ${actual.toFixed(2)}:1 (needs ${minimum}:1)`);
  }
  if (failures.length) {
    console.error(`${name} Energized palette: ${failures.length} contrast failure(s)`);
    for (const failure of failures) console.error(`  FAIL ${failure}`);
    process.exitCode = 1;
  } else console.log(`${name} Energized palette: ${pairs.length}/${pairs.length} contrast pairs pass`);
}

const readCssBundle = (entry) =>
  read(entry).replace(/@import "\.\/([^"]+)";/g, (_, file) => read(`src/app/${file}`));
const appCss = readCssBundle('src/app/globals.css');
const layout = read('src/app/layout.tsx');
const app = read('src/app/page.tsx');
const locale = read('src/app/locale.tsx');
for (const [name, selector] of [['winit-energy', 'winit-energy --default'], ['winit-energy-dark', 'winit-energy-dark --prefersdark']]) {
  if (!appCss.includes(selector)) throw new Error(`DaisyUI theme registration missing: ${name}`);
  const marker = `name: "${name}";`;
  const markerIndex = appCss.indexOf(marker);
  const blockStart = appCss.lastIndexOf('@plugin "daisyui/theme"', markerIndex);
  const blockEnd = appCss.indexOf('\n}', markerIndex);
  if (markerIndex < 0 || blockStart < 0 || blockEnd < 0) throw new Error(`DaisyUI theme definition missing: ${name}`);
  const themeBlock = appCss.slice(markerIndex + marker.length, blockEnd);
  const values = Object.fromEntries([...themeBlock.matchAll(/(--color-[\w-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((match) => [match[1], match[2]]));
  const checks = [
    ['--color-primary-content', '--color-primary'], ['--color-secondary-content', '--color-secondary'],
    ['--color-accent-content', '--color-accent'], ['--color-neutral-content', '--color-neutral'],
    ['--color-info-content', '--color-info'], ['--color-success-content', '--color-success'],
    ['--color-warning-content', '--color-warning'], ['--color-error-content', '--color-error'],
    ['--color-base-content', '--color-base-100'], ['--color-base-content', '--color-base-200'],
  ];
  const failures = checks.flatMap(([fg, bg]) => {
    if (!values[fg] || !values[bg]) return [`${fg}/${bg}: missing DaisyUI token`];
    const actual = contrast(values[fg], values[bg]);
    return actual < 4.5 ? [`${fg} on ${bg} = ${actual.toFixed(2)}:1`] : [];
  });
  if (failures.length) throw new Error(`${name} DaisyUI contrast failed: ${failures.join('; ')}`);
  console.log(`${name} DaisyUI theme: ${checks.length}/${checks.length} contrast pairs pass`);
}
if (!layout.includes("dataset.theme=d?'winit-energy-dark':'winit-energy'")) throw new Error('DaisyUI theme is not set before first paint');
if (!app.includes("dataset.theme = nextMode === 'dark' ? 'winit-energy-dark' : 'winit-energy'")) throw new Error('DaisyUI theme does not follow the appearance toggle');
if (!layout.includes('document.documentElement.dataset.language=l')) throw new Error('Saved language is not exposed before first paint');
if (!locale.includes("document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'")) throw new Error('Locale does not set the root text direction');
if (!readCssBundle('src/app/globals.css').includes(':root[data-language="en"] .sidebar { transform: translateX(-105%); }')) throw new Error('English sidebar does not open from the LTR inline-start edge');
console.log('DaisyUI theme switching and English LTR layout checks pass');
