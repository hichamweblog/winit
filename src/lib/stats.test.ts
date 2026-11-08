import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  completionByPriority, dailyBuckets, habitStandings, longestActiveStreak, summarise, weeklyFocus,
} from './stats';
import type { FocusSession, Habit, Log, Task } from './types';

const task = (over: Partial<Task> = {}): Task => ({
  id: 't1', title: 'مهمة', projectId: null, priority: 'none', status: 'todo',
  dueDate: null, estimatedPomodoros: 1, tags: '', notes: null,
  createdAt: '2026-01-01T09:00:00.000Z', completedAt: null, ...over,
});
const session = (over: Partial<FocusSession> = {}): FocusSession => ({
  id: 's1', projectId: null, taskId: null, mode: 'pomodoro', plannedSeconds: 1500,
  actualSeconds: 1500, startedAt: '2026-01-03T10:00:00.000Z', endedAt: null, isCompleted: true, ...over,
});
const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h1', name: 'قراءة', description: null, icon: 'book-open', color: 'quran',
  recordType: 'check', targetValue: 1, unit: 'مرة', reminderTime: null, ...over,
});
const log = (over: Partial<Log> = {}): Log => ({ id: 'l1', habitId: 'h1', logDate: '2026-01-03', value: 1, ...over });

test('dailyBuckets emits one bucket per day, inclusive, oldest first', () => {
  const buckets = dailyBuckets([], [], '2026-01-01', '2026-01-05');
  assert.equal(buckets.length, 5);
  assert.equal(buckets[0].date, '2026-01-01');
  assert.equal(buckets[4].date, '2026-01-05');
  assert.deepEqual(buckets.map((b) => b.seconds), [0, 0, 0, 0, 0]);
});

test('a single-day window yields exactly one bucket', () => {
  assert.equal(dailyBuckets([], [], '2026-01-01', '2026-01-01').length, 1);
});

test('focus seconds accrue on the start day; only completed sessions count as sessions', () => {
  const buckets = dailyBuckets([], [
    session({ id: 'a', startedAt: '2026-01-02T23:50:00', actualSeconds: 600 }),
    session({ id: 'b', startedAt: '2026-01-02T08:00:00', actualSeconds: 300, isCompleted: false }),
  ], '2026-01-01', '2026-01-03');
  assert.equal(buckets[1].seconds, 900);
  assert.equal(buckets[1].sessions, 1);
});

test('out-of-window sessions and completions are ignored', () => {
  const buckets = dailyBuckets(
    [task({ status: 'completed', completedAt: '2025-12-31T12:00:00' })],
    [session({ startedAt: '2026-01-09T10:00:00' })],
    '2026-01-01', '2026-01-03',
  );
  assert.equal(buckets.reduce((sum, b) => sum + b.seconds, 0), 0);
  assert.equal(buckets.reduce((sum, b) => sum + b.completedTasks, 0), 0);
});

test('completed tasks land on their completion day, not their due date', () => {
  const buckets = dailyBuckets(
    [task({ status: 'completed', dueDate: '2026-01-01', completedAt: '2026-01-03T12:00:00' })],
    [], '2026-01-01', '2026-01-03',
  );
  assert.equal(buckets[0].completedTasks, 0);
  assert.equal(buckets[2].completedTasks, 1);
});

test('negative recorded seconds never subtract from a total', () => {
  const buckets = dailyBuckets([], [session({ startedAt: '2026-01-02T10:00:00', actualSeconds: -50 })], '2026-01-01', '2026-01-03');
  assert.equal(buckets[1].seconds, 0);
});

test('empty dataset summarises to zeros without dividing by zero', () => {
  const summary = summarise([], [], [], [], '2026-01-01', '2026-01-07');
  assert.equal(summary.focusSeconds, 0);
  assert.equal(summary.completionRate, 0);
  assert.equal(summary.habitConsistency, 0);
  assert.equal(summary.averageSessionSeconds, 0);
  assert.equal(summary.bestDay, null);
});

test('completion rate uses tasks created in the window, not an old backlog', () => {
  const tasks = [
    task({ id: 'old', createdAt: '2025-06-01T09:00:00', status: 'todo' }),
    task({ id: 'new1', createdAt: '2026-01-02T09:00:00', status: 'completed', completedAt: '2026-01-02T11:00:00' }),
    task({ id: 'new2', createdAt: '2026-01-02T09:00:00', status: 'todo' }),
  ];
  assert.equal(summarise(tasks, [], [], [], '2026-01-01', '2026-01-07').completionRate, 0.5);
});

test('habit consistency counts habit-days, not raw log rows', () => {
  const habits = [habit({ id: 'h1' }), habit({ id: 'h2' })];
  const logs = [
    log({ id: 'a', habitId: 'h1', logDate: '2026-01-01' }),
    log({ id: 'b', habitId: 'h1', logDate: '2026-01-01' }), // duplicate day
    log({ id: 'c', habitId: 'h2', logDate: '2026-01-02' }),
    log({ id: 'd', habitId: 'h2', logDate: '2026-01-03', value: 0 }), // cleared
  ];
  // 2 logged habit-days out of 2 habits x 3 days = 6.
  assert.equal(summarise([], [], habits, logs, '2026-01-01', '2026-01-03').habitConsistency, 2 / 6);
});

test('average session length divides by completed sessions only', () => {
  const summary = summarise([], [
    session({ id: 'a', startedAt: '2026-01-01T10:00:00', actualSeconds: 1200 }),
    session({ id: 'b', startedAt: '2026-01-01T11:00:00', actualSeconds: 600, isCompleted: false }),
  ], [], [], '2026-01-01', '2026-01-02');
  assert.equal(summary.sessionCount, 1);
  assert.equal(summary.averageSessionSeconds, 1800);
});

test('weeklyFocus returns the requested number of weeks, oldest first, ending this week', () => {
  const weeks = weeklyFocus([session({ startedAt: '2026-01-03T10:00:00', actualSeconds: 900 })], '2026-01-03', 4);
  assert.equal(weeks.length, 4);
  assert.ok(weeks[0].start < weeks[3].start);
  // 2026-01-03 is a Saturday, so it starts the current week.
  assert.equal(weeks[3].start, '2026-01-03');
  assert.equal(weeks[3].seconds, 900);
  assert.equal(weeks[2].seconds, 0);
});

test('weeklyFocus does not leak a session into the following week', () => {
  const weeks = weeklyFocus([session({ startedAt: '2026-01-09T23:00:00', actualSeconds: 500 })], '2026-01-10', 2);
  assert.equal(weeks[0].start, '2026-01-03');
  assert.equal(weeks[0].seconds, 500);
  assert.equal(weeks[1].seconds, 0);
});

test('completionByPriority buckets every priority including none', () => {
  const tasks = (['high', 'medium', 'low', 'none'] as const).map((priority, index) =>
    task({ id: `t${index}`, priority, status: 'completed', completedAt: '2026-01-02T12:00:00' }));
  tasks.push(task({ id: 'open', priority: 'high' }));
  assert.deepEqual(completionByPriority(tasks, '2026-01-01', '2026-01-03'), { high: 1, medium: 1, low: 1, none: 1 });
});

test('a habit streak may end yesterday but breaks after two missed days', () => {
  const habits = [habit()];
  const today = '2026-01-10';
  const yesterdayEnd = [log({ id: 'a', logDate: '2026-01-08' }), log({ id: 'b', logDate: '2026-01-09' })];
  assert.equal(habitStandings(habits, yesterdayEnd, today, '2026-01-01')[0].streak, 2);
  const stale = [log({ id: 'a', logDate: '2026-01-07' }), log({ id: 'b', logDate: '2026-01-08' })];
  assert.equal(habitStandings(habits, stale, today, '2026-01-01')[0].streak, 0);
});

test('habit standings ignore future logs and zero values, and sort by rate', () => {
  const habits = [habit({ id: 'h1', name: 'أ' }), habit({ id: 'h2', name: 'ب' })];
  const logs = [
    log({ id: 'a', habitId: 'h1', logDate: '2026-01-01' }),
    log({ id: 'b', habitId: 'h2', logDate: '2026-01-01' }),
    log({ id: 'c', habitId: 'h2', logDate: '2026-01-02' }),
    log({ id: 'd', habitId: 'h1', logDate: '2026-01-02', value: 0 }),
    log({ id: 'e', habitId: 'h1', logDate: '2026-02-01' }),
  ];
  const standings = habitStandings(habits, logs, '2026-01-03', '2026-01-01');
  assert.equal(standings[0].habit.id, 'h2');
  assert.equal(standings[0].loggedDays, 2);
  assert.equal(standings[1].loggedDays, 1);
});

test('longestActiveStreak finds the longest run and resets on an idle day', () => {
  const buckets = dailyBuckets([], [
    session({ id: 'a', startedAt: '2026-01-01T10:00:00' }),
    session({ id: 'b', startedAt: '2026-01-02T10:00:00' }),
    session({ id: 'c', startedAt: '2026-01-04T10:00:00' }),
    session({ id: 'd', startedAt: '2026-01-05T10:00:00' }),
    session({ id: 'e', startedAt: '2026-01-06T10:00:00' }),
  ], '2026-01-01', '2026-01-07');
  assert.equal(longestActiveStreak(buckets), 3);
  assert.equal(longestActiveStreak([]), 0);
});

test('a completed task alone makes a day active', () => {
  const buckets = dailyBuckets([task({ status: 'completed', completedAt: '2026-01-02T12:00:00' })], [], '2026-01-01', '2026-01-03');
  assert.equal(longestActiveStreak(buckets), 1);
  assert.equal(summarise([task({ status: 'completed', completedAt: '2026-01-02T12:00:00' })], [], [], [], '2026-01-01', '2026-01-03').activeDays, 1);
});
