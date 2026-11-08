import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, AR_LOCALE, filterTaskIds, formatArDate, formatArNumber, formatClock, getHabitStreak, getRemainingSeconds, getWeekStart, localDateKey } from './core';

test('clock timer uses elapsed time rather than ticking intervals', () => {
  assert.equal(getRemainingSeconds(1_000, 1_500, 0, 31_000), 1_470);
  assert.equal(getRemainingSeconds(1_000, 1_500, 0, 2_000_000), 0);
  assert.equal(formatClock(3661), '61:01');
});

test('date helpers format local dates and move calendar days', () => {
  const date = new Date(2025, 0, 31, 12);
  assert.equal(localDateKey(date), '2025-01-31');
  assert.equal(localDateKey(addDays(date, 1)), '2025-02-01');
  assert.equal(getWeekStart(new Date(2025, 0, 8, 12)).getDay(), 6); // Saturday (§8.7)
});

test('habit streaks require meeting the target and allow today to remain unfinished', () => {
  assert.equal(getHabitStreak([2, 2, 2, null], 2), 3);
  assert.equal(getHabitStreak([2, 1, 2, null], 2), 1);
  assert.equal(getHabitStreak([1, 2, 2], 2), 2);
  assert.equal(getHabitStreak([null, null, null], 2), 0);
});

test('Today includes overdue active tasks but excludes unscheduled and completed tasks', () => {
  const tasks = [
    { id: 'overdue', status: 'todo' as const, dueDate: '2025-01-01', priority: 'none' as const, projectId: null },
    { id: 'today', status: 'in_progress' as const, dueDate: '2025-01-02', priority: 'low' as const, projectId: null },
    { id: 'future', status: 'todo' as const, dueDate: '2025-01-03', priority: 'high' as const, projectId: null },
    { id: 'unscheduled', status: 'todo' as const, dueDate: null, priority: 'none' as const, projectId: null },
    { id: 'done', status: 'completed' as const, dueDate: '2025-01-01', priority: 'high' as const, projectId: null },
  ];
  assert.deepEqual(filterTaskIds(tasks, 'today', '2025-01-02').map((task) => task.id), ['overdue', 'today']);
});

test('week start defaults to Saturday and honours an explicit override (§8.7)', () => {
  // 2025-01-08 is a Wednesday; the preceding Saturday is 2025-01-04.
  const wednesday = new Date(2025, 0, 8, 12);
  assert.equal(localDateKey(getWeekStart(wednesday)), '2025-01-04');
  // A Saturday is its own week start.
  assert.equal(localDateKey(getWeekStart(new Date(2025, 0, 4, 12))), '2025-01-04');
  // A Sunday belongs to the week that started the day before.
  assert.equal(localDateKey(getWeekStart(new Date(2025, 0, 5, 12))), '2025-01-04');
  // Monday override still works for callers that want it.
  assert.equal(getWeekStart(wednesday, 1).getDay(), 1);
});

test('Arabic formatting pins Western digits regardless of runtime defaults (§2.3)', () => {
  assert.equal(AR_LOCALE, 'ar-u-nu-latn');
  assert.equal(formatArNumber(20000), '20,000');
  assert.equal(formatArNumber(1234), '1,234');
  const label = formatArDate(new Date(2026, 10, 7, 12), { day: 'numeric', month: 'long' });
  assert.match(label, /7/);
  assert.doesNotMatch(label, /[\u0660-\u0669]/);
  assert.equal(formatArDate('not-a-date', { day: 'numeric' }), '');
});
