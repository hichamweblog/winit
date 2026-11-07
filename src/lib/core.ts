import type { Priority, Task } from '@/db/schema';

export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function getWeekStart(date = new Date()): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export function getRemainingSeconds(
  startedAtMs: number,
  plannedSeconds: number,
  pausedSeconds = 0,
  nowMs = Date.now(),
): number {
  const elapsed = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000) - pausedSeconds);
  return Math.max(0, plannedSeconds - elapsed);
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}س ${minutes}د`;
  return `${minutes}د`;
}

export function getHabitStreak(values: Array<number | null | undefined>, target: number): number {
  const completed = values.map((value) => value !== null && value !== undefined && value >= target);
  let index = completed.length - 1;
  if (index >= 0 && !completed[index]) index -= 1;
  let streak = 0;
  while (index >= 0 && completed[index]) { streak += 1; index -= 1; }
  return streak;
}

export function getTaskQuadrant(task: Pick<Task, 'priority' | 'dueDate'>, today = localDateKey()) {
  const important = task.priority === 'high' || task.priority === 'medium';
  const urgent = task.priority === 'high' || Boolean(task.dueDate && task.dueDate <= today);
  if (important && urgent) return 'do' as const;
  if (important) return 'schedule' as const;
  if (urgent) return 'delegate' as const;
  return 'later' as const;
}

export function filterTaskIds<T extends Pick<Task, 'status' | 'dueDate' | 'priority' | 'projectId'>>(
  tasks: T[],
  view: string,
  today = localDateKey(),
): T[] {
  const active = tasks.filter((task) => task.status !== 'completed');
  switch (view) {
    case 'today': return active.filter((task) => Boolean(task.dueDate && task.dueDate <= today));
    case 'upcoming': {
      const end = localDateKey(addDays(new Date(`${today}T12:00:00`), 7));
      return active.filter((task) => Boolean(task.dueDate && task.dueDate >= today && task.dueDate <= end));
    }
    case 'important': return active.filter((task) => task.priority === 'high' || task.priority === 'medium');
    case 'inbox': return active.filter((task) => !task.projectId);
    default: return active;
  }
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}
