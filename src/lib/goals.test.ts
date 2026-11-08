import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_GOAL_KEY, GOAL_SLOTS, goalLabel, goalStyle, resolveGoalId } from './goals';

test('the palette is a fixed set of slots, never a free colour picker', () => {
  // 7 named + 6 neutral from Calm Sea v1.0.1, plus 6 app-extension hues.
  // The invariant that matters is "every option is a declared slot": the count
  // may grow, but nothing may resolve to a raw hex.
  const EXTENSION = ['teal', 'violet', 'crimson', 'copper', 'magenta', 'lime'];
  const neutral = GOAL_SLOTS.filter((slot) => slot.id.startsWith('neutral-'));
  const extension = GOAL_SLOTS.filter((slot) => (EXTENSION as string[]).includes(slot.id));
  const named = GOAL_SLOTS.filter((slot) => !slot.id.startsWith('neutral-') && !(EXTENSION as string[]).includes(slot.id));
  assert.equal(named.length, 7, 'the seven original goal colours must survive');
  assert.equal(neutral.length, 6, 'the six neutral slots must survive');
  assert.equal(extension.length, 6);
  assert.equal(GOAL_SLOTS.length, 19);
  assert.equal(new Set(GOAL_SLOTS.map((slot) => slot.key)).size, GOAL_SLOTS.length);
  assert.equal(DEFAULT_GOAL_KEY, '#3B6EA8');
  // Every key is a concrete hex, so a slot can never be an arbitrary CSS value.
  for (const slot of GOAL_SLOTS) assert.match(slot.key, /^#[0-9A-F]{6}$/i);
});

test('canonical keys resolve to their own slot', () => {
  for (const slot of GOAL_SLOTS) assert.equal(resolveGoalId(slot.key), slot.id);
  assert.equal(resolveGoalId('#3b6ea8'), 'code'); // case-insensitive
});

test('legacy seed colours keep their intended meaning', () => {
  assert.equal(resolveGoalId('#5477E8'), 'code');      // البرمجة
  assert.equal(resolveGoalId('#D69353'), 'english');   // اللغة الإنجليزية
  assert.equal(resolveGoalId('#229789'), 'sharia');    // العلوم الشرعية
  assert.equal(resolveGoalId('#956BC7'), 'arabic');    // اللغة العربية
  assert.equal(resolveGoalId('#CC6D78'), 'culture');   // الثقافة العامة
  assert.equal(resolveGoalId('#138A78'), 'quran');     // ورد القرآن الكريم
  assert.equal(resolveGoalId('#D4894D'), 'sport');     // الرياضة والحركة
});

test('unknown or malformed colours fall back to a palette slot, never a raw hex', () => {
  const valid = new Set(GOAL_SLOTS.map((slot) => slot.id as string));
  for (const input of [null, undefined, '', 'not-a-colour', '#12', 'rgb(1,2,3)', '#FF0000']) {
    assert.ok(valid.has(resolveGoalId(input)), `${input} resolved outside the palette`);
  }
  assert.equal(resolveGoalId(null), 'neutral-6');
  // Pure red now lands on the crimson extension slot rather than the orange
  // 'sport' slot — a closer match, and still inside the palette.
  assert.equal(resolveGoalId('#FF0000'), 'crimson');
});

test('goalStyle returns theme-aware custom properties and never hardcodes white (C8)', () => {
  const style = goalStyle('#138A78');
  assert.equal(style.solid, 'var(--goal-quran)');
  assert.equal(style.soft, 'var(--goal-quran-bg)');
  assert.equal(style.onSoft, 'var(--goal-quran-fg)');
  assert.equal(style.onSolid, 'var(--on-goal)');
  for (const slot of GOAL_SLOTS) {
    assert.equal(goalStyle(slot.key).onSolid, 'var(--on-goal)');
    assert.ok(!/#[0-9a-f]{3,6}/i.test(JSON.stringify(goalStyle(slot.key))), 'no literal hex escapes the palette');
  }
});

test('every slot carries a name so colour is never the only label (§10)', () => {
  for (const slot of GOAL_SLOTS) {
    assert.ok(slot.label.length > 0);
    assert.equal(goalLabel(slot.key), slot.label);
  }
});

test('the six extension slots resolve to their own tokens, not a neighbour', () => {
  const extensions = [
    ['teal', '#0F7480'], ['violet', '#6A4CA3'], ['crimson', '#A62F45'],
    ['copper', '#9C5228'], ['magenta', '#A32E93'], ['lime', '#6E8C10'],
  ] as const;
  for (const [id, key] of extensions) {
    assert.equal(resolveGoalId(key), id, `${key} should resolve to ${id}`);
    const style = goalStyle(key);
    assert.equal(style.solid, `var(--goal-${id})`);
    assert.equal(style.soft, `var(--goal-${id}-bg)`);
    assert.equal(style.onSoft, `var(--goal-${id}-fg)`);
    // C8 still applies to the new slots.
    assert.equal(style.onSolid, 'var(--on-goal)');
    assert.ok(goalLabel(key).length > 0, `${id} has no Arabic label`);
  }
});

test('every palette slot has a unique key and a label, and resolves to itself', () => {
  const keys = GOAL_SLOTS.map((slot) => slot.key.toLowerCase());
  assert.equal(new Set(keys).size, keys.length, 'two slots share a key');
  const ids = GOAL_SLOTS.map((slot) => slot.id);
  assert.equal(new Set(ids).size, ids.length, 'two slots share an id');
  for (const slot of GOAL_SLOTS) {
    assert.ok(slot.label.trim().length > 0, `${slot.id} has no label`);
    assert.equal(resolveGoalId(slot.key), slot.id);
  }
  assert.ok(GOAL_SLOTS.length >= 19, 'the picker should offer the extended palette');
});

test('adding slots did not remap any explicitly-mapped legacy colour', () => {
  // These were the seed values; nearest-colour fallback must never override them.
  const legacy = [
    ['#5477e8', 'code'], ['#d69353', 'english'], ['#229789', 'sharia'],
    ['#956bc7', 'arabic'], ['#cc6d78', 'culture'], ['#138a78', 'quran'],
    ['#d4894d', 'sport'], ['#6d78d8', 'english'], ['#2584a7', 'neutral-2'],
  ] as const;
  for (const [key, id] of legacy) assert.equal(resolveGoalId(key), id, `legacy ${key} drifted`);
});
