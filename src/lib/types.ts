/**
 * Client-side dataset shapes returned by /api/workspace.
 *
 * Shared so the statistics and calendar views can be typed (and unit tested)
 * without importing the page component.
 */

export type Project = { id: string; name: string; color: string; icon: string; description: string | null; targetWeeklyMinutes: number };
export type Task = { id: string; title: string; projectId: string | null; priority: 'none' | 'low' | 'medium' | 'high'; status: 'todo' | 'in_progress' | 'completed'; dueDate: string | null; estimatedPomodoros: number; tags: string; notes: string | null; createdAt: string; completedAt: string | null };
export type Habit = { id: string; name: string; description: string | null; icon: string; color: string; recordType: 'check' | 'quantity' | 'duration'; targetValue: number; unit: string; reminderTime: string | null };
export type Log = { id: string; habitId: string; logDate: string; value: number };
export type FocusSession = { id: string; projectId: string | null; taskId: string | null; mode: 'pomodoro' | 'stopwatch'; plannedSeconds: number; actualSeconds: number; startedAt: string; endedAt: string | null; isCompleted: boolean };
export type JournalMood = 'grateful' | 'calm' | 'energized' | 'tired' | 'anxious' | 'reflective';
export type JournalEntry = { id: string; entryDate: string; title: string | null; content: string; mood: JournalMood | null; createdAt: string; updatedAt: string };
