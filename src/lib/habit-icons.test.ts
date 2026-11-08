import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  DEFAULT_HABIT_ICON, HABIT_ICON_GROUPS, HABIT_ICON_IDS, HABIT_ICON_LABELS, isHabitIcon,
} from './habit-icons';

test('every catalogue id has a non-empty Arabic label', () => {
  for (const id of HABIT_ICON_IDS) {
    const label = HABIT_ICON_LABELS[id];
    assert.ok(label && label.trim().length > 0, `missing label for ${id}`);
    assert.match(label, /[\u0600-\u06FF]/, `label for ${id} is not Arabic`);
  }
  assert.equal(Object.keys(HABIT_ICON_LABELS).length, HABIT_ICON_IDS.length);
});

test('ids are unique', () => {
  assert.equal(new Set(HABIT_ICON_IDS).size, HABIT_ICON_IDS.length);
});

test('the original four ids keep their position and meaning', () => {
  assert.deepEqual(HABIT_ICON_IDS.slice(0, 4), ['book-open', 'activity', 'languages', 'target']);
  assert.equal(HABIT_ICON_LABELS['book-open'], 'قراءة');
  assert.equal(HABIT_ICON_LABELS.target, 'هدف');
});

test('groups partition the catalogue exactly once', () => {
  const grouped = HABIT_ICON_GROUPS.flatMap((group) => group.ids);
  assert.equal(grouped.length, HABIT_ICON_IDS.length);
  assert.equal(new Set(grouped).size, grouped.length);
  assert.deepEqual([...grouped].sort(), [...HABIT_ICON_IDS].sort());
  for (const group of HABIT_ICON_GROUPS) {
    assert.ok(group.label.trim().length > 0);
    assert.ok(group.ids.length > 0);
  }
});

test('the default is a member of the catalogue', () => {
  assert.ok(isHabitIcon(DEFAULT_HABIT_ICON));
});

test('isHabitIcon rejects anything outside the catalogue', () => {
  for (const value of ['', 'nope', 'BOOK-OPEN', null, undefined, 42, {}, []]) {
    assert.equal(isHabitIcon(value), false, `accepted ${String(value)}`);
  }
  assert.equal(isHabitIcon('run'), true);
});

test('the component map covers every id — no silent fallback', () => {
  const source = readFileSync(new URL('../app/habit-icons.tsx', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('export const habitIcons'), source.indexOf('/** Never throws'));
  for (const id of HABIT_ICON_IDS) {
    const key = /^[a-z]+$/.test(id) ? `${id}:` : `'${id}':`;
    assert.ok(block.includes(key), `no component mapped for ${id}`);
  }
});

test('the catalogue is substantially larger than the original four', () => {
  assert.ok(HABIT_ICON_IDS.length >= 30, `only ${HABIT_ICON_IDS.length} icons`);
  assert.ok(HABIT_ICON_GROUPS.length >= 5);
});

test('the server DTO derives its enum from this catalogue', () => {
  const dto = readFileSync(new URL('./server/dto.ts', import.meta.url), 'utf8');
  assert.ok(dto.includes('z.enum(HABIT_ICON_IDS)'), 'habit icon enum is hard-coded again');
});
