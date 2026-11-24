#!/usr/bin/env node
/**
 * i18n gate — fails when UI copy bypasses the dictionary.
 *
 * Every Arabic string in a `.tsx` file must be passed through `t(...)`, or sit
 * on a line carrying `i18n-exempt` with the reason (label data, server
 * metadata). Without this gate the English locale drifts back into a patchwork:
 * the critique of 2026-11-24 found the home screen itself half-translated.
 *
 *   node scripts/i18n-gate.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ARABIC = /[\u0600-\u06FF]/;
const ROOT = 'src/app';

/**
 * Replaces each `t(...)` call with `t()` while respecting quotes, escapes and
 * nested brackets, so `t(a ? 'x' : 'y', { a: 1 })` counts as translated.
 */
function stripTCalls(line) {
  let out = '';
  let i = 0;
  while (i < line.length) {
    const isCall = line[i] === 't' && line[i + 1] === '(' &&
      (i === 0 || /[^\w$.]/.test(line[i - 1]));
    if (!isCall) { out += line[i]; i += 1; continue; }

    let depth = 0;
    let quote = null;
    let j = i + 1;
    for (; j < line.length; j += 1) {
      const ch = line[j];
      if (quote) {
        if (ch === '\\') { j += 1; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
      if (ch === '(') depth += 1;
      else if (ch === ')') { depth -= 1; if (depth === 0) { j += 1; break; } }
    }
    out += 't()';
    i = j;
  }
  return out;
}

const violations = [];
let scanned = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!entry.name.endsWith('.tsx')) continue;
    if (entry.name === 'locale.tsx') continue; // the dictionary itself
    scanned += 1;

    const lines = fs.readFileSync(full, 'utf8').split('\n');
    let inBlockComment = false;

    lines.forEach((line, index) => {
      // `i18n-exempt` covers its own line and the line after it, so a reason can
      // sit above the statement it explains.
      if (line.includes('i18n-exempt') || (lines[index - 1] ?? '').includes('i18n-exempt')) return;
      let text = line;

      // Strip comments: Arabic in a comment is explanation, not UI copy.
      if (inBlockComment) {
        const end = text.indexOf('*/');
        if (end === -1) return;
        text = text.slice(end + 2);
        inBlockComment = false;
      }
      text = text.replace(/\/\*[\s\S]*?\*\//g, '');
      const open = text.indexOf('/*');
      if (open !== -1) { text = text.slice(0, open); inBlockComment = true; }
      text = text.replace(/\/\/.*$/, '');

      // Remove the argument list of every t(...) call, balancing parens so
      // ternaries and vars objects inside the call are handled too.
      const cleaned = stripTCalls(text);
      if (!ARABIC.test(cleaned)) return;

      violations.push({ file: full, line: index + 1, text: line.trim().slice(0, 140) });
    });
  }
}

walk(ROOT);

if (violations.length === 0) {
  console.log(`i18n gate: ${scanned} files, every Arabic string goes through t().`);
  process.exit(0);
}

console.error(`i18n gate: ${violations.length} untranslated string(s) in ${new Set(violations.map((v) => v.file)).size} file(s)\n`);
for (const v of violations) console.error(`  ${v.file}:${v.line}\n    ${v.text}`);
console.error('\nWrap the copy in t(...), or add an `i18n-exempt: <reason>` comment for label data.');
process.exit(1);
