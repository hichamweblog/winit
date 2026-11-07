import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, filterTaskIds, formatClock, getHabitStreak, getRemainingSeconds, getTaskQuadrant, getWeekStart, localDateKey } from './core';

test('clock timer uses elapsed time rather than ticking intervals', () => {
  assert.equal(getRemainingSeconds(1_000, 1_500, 0, 31_000), 1_470);
  assert.equal(getRemainingSeconds(1_000, 1_500, 0, 2_000_000), 0);
  assert.equal(formatClock(3661), '61:01');
});

test('date helpers format local dates and move calendar days', () => {
  const date = new Date(2025, 0, 31, 12);
  assert.equal(localDateKey(date), '2025-01-31');
  assert.equal(localDateKey(addDays(date, 1)), '2025-02-01');
  assert.equal(getWeekStart(new Date(2025, 0, 8, 12)).getDay(), 1);
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

test('Eisenhower quadrants combine importance and deadline urgency', () => {
  assert.equal(getTaskQuadrant({ priority: 'high', dueDate: null }, '2025-01-01'), 'do');
  assert.equal(getTaskQuadrant({ priority: 'medium', dueDate: null }, '2025-01-01'), 'schedule');
  assert.equal(getTaskQuadrant({ priority: 'none', dueDate: '2024-12-31' }, '2025-01-01'), 'delegate');
  assert.equal(getTaskQuadrant({ priority: 'low', dueDate: null }, '2025-01-01'), 'later');
});
