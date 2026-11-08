/**
 * Statistics — pure functions over the workspace dataset.
 *
 * Kept out of the component so the numbers are unit tested: an off-by-one in a
 * streak or a week boundary is invisible in a screenshot but wrong on screen.
 * All date maths uses local-date keys ("YYYY-MM-DD") so a session started at
 * 23:50 counts on the day it started, in the user's timezone.
 */
import { addDays, getWeekStart, localDateKey } from './core';
import type { FocusSession, Habit, Log, Task } from './types';

export type DayBucket = { date: string; seconds: number; sessions: number; completedTasks: number };

export type StatsSummary = {
  focusSeconds: number;
  sessionCount: number;
  completedTasks: number;
  /** Completed / (completed + still open) in the window, 0 when nothing exists. */
  completionRate: number;
  /** 0..1 — logged habit-days over expected habit-days in the window. */
  habitConsistency: number;
  activeDays: number;
  averageSessionSeconds: number;
  bestDay: DayBucket | null;
};

const sessionDay = (session: FocusSession) => localDateKey(new Date(session.startedAt));
const completionDay = (task: Task) => (task.completedAt ? localDateKey(new Date(task.completedAt)) : null);

/** Inclusive [from, to] window test on local-date keys. */
function inWindow(key: string | null, from: string, to: string) {
  return key !== null && key >= from && key <= to;
}

/** One bucket per day, oldest first — ready to plot left-to-right in LTR terms. */
export function dailyBuckets(tasks: Task[], sessions: FocusSession[], from: string, to: string): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  for (let cursor = new Date(`${from}T12:00:00`); localDateKey(cursor) <= to; cursor = addDays(cursor, 1)) {
    const key = localDateKey(cursor);
    buckets.set(key, { date: key, seconds: 0, sessions: 0, completedTasks: 0 });
  }
  for (const session of sessions) {
    const bucket = buckets.get(sessionDay(session));
    if (!bucket) continue;
    bucket.seconds += Math.max(0, session.actualSeconds);
    if (session.isCompleted) bucket.sessions += 1;
  }
  for (const task of tasks) {
    if (task.status !== 'completed') continue;
    const bucket = buckets.get(completionDay(task) ?? '');
    if (bucket) bucket.completedTasks += 1;
  }
  return [...buckets.values()];
}

export function summarise(
  tasks: Task[], sessions: FocusSession[], habits: Habit[], logs: Log[], from: string, to: string,
): StatsSummary {
  const buckets = dailyBuckets(tasks, sessions, from, to);
  const windowSessions = sessions.filter((session) => inWindow(sessionDay(session), from, to));
  const focusSeconds = windowSessions.reduce((sum, session) => sum + Math.max(0, session.actualSeconds), 0);
  const sessionCount = windowSessions.filter((session) => session.isCompleted).length;
  const completedTasks = tasks.filter((task) => task.status === 'completed' && inWindow(completionDay(task), from, to)).length;
  // Open tasks are only counted when they were created inside the window, so an
  // old backlog does not permanently depress the rate.
  const createdHere = tasks.filter((task) => inWindow(localDateKey(new Date(task.createdAt)), from, to));
  const doneHere = createdHere.filter((task) => task.status === 'completed').length;
  const completionRate = createdHere.length ? doneHere / createdHere.length : 0;

  const loggedDays = new Set(logs.filter((log) => log.value > 0 && inWindow(log.logDate, from, to)).map((log) => `${log.habitId}:${log.logDate}`));
  const days = buckets.length;
  const expected = habits.length * days;
  const habitConsistency = expected ? Math.min(1, loggedDays.size / expected) : 0;

  const activeDays = buckets.filter((bucket) => bucket.seconds > 0 || bucket.completedTasks > 0).length;
  const bestDay = buckets.reduce<DayBucket | null>(
    (best, bucket) => (bucket.seconds > (best?.seconds ?? 0) ? bucket : best), null,
  );

  return {
    focusSeconds, sessionCount, completedTasks, completionRate, habitConsistency, activeDays,
    averageSessionSeconds: sessionCount ? Math.round(focusSeconds / sessionCount) : 0,
    bestDay,
  };
}

/** Rolling weeks, oldest first. Each week starts on the app's week start. */
export function weeklyFocus(sessions: FocusSession[], today: string, weeks: number): { start: string; seconds: number }[] {
  const thisWeek = getWeekStart(new Date(`${today}T12:00:00`));
  const out: { start: string; seconds: number }[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = localDateKey(addDays(thisWeek, -7 * i));
    const end = localDateKey(addDays(new Date(`${start}T12:00:00`), 6));
    out.push({
      start,
      seconds: sessions
        .filter((session) => inWindow(sessionDay(session), start, end))
        .reduce((sum, session) => sum + Math.max(0, session.actualSeconds), 0),
    });
  }
  return out;
}

/** Completed tasks grouped by priority, for the flag-coloured breakdown. */
export function completionByPriority(tasks: Task[], from: string, to: string) {
  const counts = { high: 0, medium: 0, low: 0, none: 0 };
  for (const task of tasks) {
    if (task.status !== 'completed' || !inWindow(completionDay(task), from, to)) continue;
    counts[task.priority] += 1;
  }
  return counts;
}

export type HabitStanding = { habit: Habit; loggedDays: number; rate: number; streak: number };

/**
 * Per-habit consistency and current streak. The streak may end yesterday — a
 * habit is not "broken" until the day is actually over.
 */
export function habitStandings(habits: Habit[], logs: Log[], today: string, from: string): HabitStanding[] {
  const byHabit = new Map<string, Set<string>>();
  for (const log of logs) {
    if (log.value <= 0 || log.logDate < from || log.logDate > today) continue;
    if (!byHabit.has(log.habitId)) byHabit.set(log.habitId, new Set());
    byHabit.get(log.habitId)!.add(log.logDate);
  }
  let days = 0;
  for (let cursor = new Date(`${from}T12:00:00`); localDateKey(cursor) <= today; cursor = addDays(cursor, 1)) days += 1;

  return habits.map((habit) => {
    const set = byHabit.get(habit.id) ?? new Set<string>();
    let streak = 0;
    let cursor = new Date(`${today}T12:00:00`);
    if (!set.has(localDateKey(cursor))) cursor = addDays(cursor, -1);
    while (set.has(localDateKey(cursor))) { streak += 1; cursor = addDays(cursor, -1); }
    return { habit, loggedDays: set.size, rate: days ? Math.min(1, set.size / days) : 0, streak };
  }).sort((a, b) => b.rate - a.rate || b.streak - a.streak);
}

/** Longest run of consecutive days with any focus or completed task. */
export function longestActiveStreak(buckets: DayBucket[]): number {
  let best = 0;
  let run = 0;
  for (const bucket of buckets) {
    if (bucket.seconds > 0 || bucket.completedTasks > 0) { run += 1; best = Math.max(best, run); }
    else run = 0;
  }
  return best;
}
