import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PRIORITIES, PRIORITY_IDS, prioritySemantics, sessionsLabel, tasksLabel } from './semantics';

test('each priority has a distinct colour token and an Arabic accessible name', () => {
  const colors = PRIORITY_IDS.map((id) => PRIORITIES[id].color);
  assert.equal(new Set(colors).size, PRIORITY_IDS.length);
  for (const id of PRIORITY_IDS) {
    assert.match(PRIORITIES[id].color, /^var\(--[a-z-]+\)$/, `${id} is not a semantic token`);
    assert.match(PRIORITIES[id].label, /[\u0600-\u06FF]/);
  }
});

test('ranks sort high before medium before low before none', () => {
  const sorted = [...PRIORITY_IDS].sort((a, b) => PRIORITIES[a].rank - PRIORITIES[b].rank);
  assert.deepEqual(sorted, ['high', 'medium', 'low', 'none']);
});

test('unknown, null and empty values degrade to none rather than throwing', () => {
  for (const value of ['urgent', '', null, undefined, 'HIGH']) {
    assert.equal(prioritySemantics(value).id, 'none', `mishandled ${String(value)}`);
  }
  assert.equal(prioritySemantics('high').id, 'high');
});

test('session counts use correct Arabic singular, dual and plural', () => {
  assert.equal(sessionsLabel(1), 'جلسة تركيز واحدة');
  assert.equal(sessionsLabel(2), 'جلستا تركيز');
  assert.equal(sessionsLabel(3), '3 جلسات تركيز');
  assert.equal(sessionsLabel(10), '10 جلسات تركيز');
  assert.equal(sessionsLabel(11), '11 جلسة تركيز');
});

test('task counts use correct Arabic forms including zero', () => {
  assert.equal(tasksLabel(0), 'لا مهام');
  assert.equal(tasksLabel(1), 'مهمة واحدة');
  assert.equal(tasksLabel(2), 'مهمتان');
  assert.equal(tasksLabel(5), '5 مهام');
  assert.equal(tasksLabel(25), '25 مهمة');
});

test('accessible counts use Western digits, matching the rest of the app', () => {
  for (const label of [sessionsLabel(7), tasksLabel(7)]) {
    assert.doesNotMatch(label, /[\u0660-\u0669]/);
  }
});
