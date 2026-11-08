import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dateKey,
  habitLogInput,
  journalInput,
  likeTerm,
  passwordInput,
  registerInput,
  taskInput,
  taskPatch,
} from './dto';

test('dateKey accepts real dates and rejects impossible ones', () => {
  for (const good of ['2026-01-01', '2026-12-31', '2024-02-29', '2026-11-07']) {
    assert.equal(dateKey.safeParse(good).success, true, good);
  }
  for (const bad of ['2026-02-31', '2026-13-01', '2026-00-10', '2026-01-32', '2025-02-29', '2026-1-1', '26-01-01', 'tomorrow', '', '2026/01/01']) {
    assert.equal(dateKey.safeParse(bad).success, false, bad);
  }
});

test('DTOs are strict: an unknown key is rejected, not ignored', () => {
  assert.equal(taskInput.safeParse({ title: 'ok' }).success, true);
  // Mass-assignment attempts must not slip through.
  for (const extra of [{ workspaceId: 'other' }, { id: 'forged' }, { createdBy: 'someone' }, { status: 'completed' }]) {
    assert.equal(taskInput.safeParse({ title: 'ok', ...extra }).success, false, JSON.stringify(extra));
  }
  assert.equal(taskPatch.safeParse({ title: 'ok', status: 'completed' }).success, true);
  assert.equal(taskPatch.safeParse({ title: 'ok', completedAt: 0 }).success, false);
});

test('task validation keeps the existing bounds', () => {
  assert.equal(taskInput.safeParse({ title: '   ' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'a'.repeat(241) }).success, false);
  assert.equal(taskInput.safeParse({ title: 'ok', estimatedPomodoros: 0 }).success, false);
  assert.equal(taskInput.safeParse({ title: 'ok', estimatedPomodoros: 21 }).success, false);
  assert.equal(taskInput.safeParse({ title: 'ok', priority: 'urgent' }).success, false);
  assert.equal(taskInput.safeParse({ title: 'ok', dueDate: null }).success, true);
});

test('habit log requires a real date and a bounded integer', () => {
  assert.equal(habitLogInput.safeParse({ date: '2026-11-07', value: 3 }).success, true);
  assert.equal(habitLogInput.safeParse({ date: '2026-02-31', value: 3 }).success, false);
  assert.equal(habitLogInput.safeParse({ date: '2026-11-07', value: -1 }).success, false);
  assert.equal(habitLogInput.safeParse({ date: '2026-11-07', value: 1.5 }).success, false);
  assert.equal(habitLogInput.safeParse({ date: '2026-11-07', value: 10001 }).success, false);
  // The old, wrong key must not be silently accepted.
  assert.equal(habitLogInput.safeParse({ logDate: '2026-11-07', value: 1 }).success, false);
});

test('journal content is required and bounded', () => {
  assert.equal(journalInput.safeParse({ entryDate: '2026-11-07', content: 'سطر' }).success, true);
  assert.equal(journalInput.safeParse({ entryDate: '2026-11-07', content: '   ' }).success, false);
  assert.equal(journalInput.safeParse({ entryDate: '2026-11-07', content: 'x', mood: 'happy' }).success, false);
  assert.equal(journalInput.safeParse({ entryDate: '2026-11-07', content: 'x', mood: null }).success, true);
});

test('password policy is length-based with an upper bound', () => {
  assert.equal(passwordInput.safeParse('123456789').success, false);
  assert.equal(passwordInput.safeParse('1234567890').success, true);
  assert.equal(passwordInput.safeParse('a long passphrase with spaces').success, true);
  assert.equal(passwordInput.safeParse('x'.repeat(129)).success, false);
});

test('registration normalises the email and validates every field', () => {
  const parsed = registerInput.parse({ email: '  MiXeD@Example.COM  ', name: ' اسم ', password: 'longenough1' });
  assert.equal(parsed.email, 'mixed@example.com');
  assert.equal(parsed.name, 'اسم');
  assert.equal(registerInput.safeParse({ email: 'nope', name: 'x', password: 'longenough1' }).success, false);
  assert.equal(registerInput.safeParse({ email: 'a@b.co', name: '', password: 'longenough1' }).success, false);
  assert.equal(registerInput.safeParse({ email: 'a@b.co', name: 'x', password: 'longenough1', role: 'owner' }).success, false);
});

test('likeTerm escapes wildcards so a search cannot become match-all', () => {
  assert.equal(likeTerm('abc'), '%abc%');
  assert.equal(likeTerm('%'), '%\\%%');
  assert.equal(likeTerm('_'), '%\\_%');
  assert.equal(likeTerm('a\\b'), '%a\\\\b%');
  assert.equal(likeTerm('50%'), '%50\\%%');
});
