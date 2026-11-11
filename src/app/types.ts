import type { FocusSession, Habit, JournalEntry, JournalMood, Log, Project, Task } from '@/lib/types';
import type { AppIcon } from './icons';
import {
  Activity,
  CalendarDays,
  ChartBar,
  Inbox,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Settings2,
} from './icons';

export type JournalInput = Pick<JournalEntry, 'entryDate' | 'content'> & Pick<JournalEntry, 'title' | 'mood'>;
export type JournalPage = { entries: JournalEntry[]; total: number; offset: number; limit: number };
export type View = 'today' | 'upcoming' | 'inbox' | 'all' | 'calendar' | 'habits' | 'journal' | 'stats' | 'settings';
export type Dataset = { projects: Project[]; tasks: Task[]; habits: Habit[]; logs: Log[]; focusSessions: FocusSession[]; today: string };

export type ViewOption = { id: View; label: string; icon: AppIcon };

export const views: ViewOption[] = [
  { id: 'today', label: 'اليوم', icon: LayoutDashboard },
  { id: 'upcoming', label: 'القادم', icon: CalendarDays },
  { id: 'inbox', label: 'صندوق الوارد', icon: Inbox },
  { id: 'all', label: 'كل المهام', icon: ListTodo },
  { id: 'calendar', label: 'التقويم', icon: CalendarDays },
  { id: 'habits', label: 'العادات', icon: Activity },
  { id: 'journal', label: 'اليوميات', icon: NotebookPen },
  { id: 'stats', label: 'إحصائيات', icon: ChartBar },
  { id: 'settings', label: 'الإعدادات', icon: Settings2 },
];

export const mobileViewOptions: ViewOption[] = [
  { id: 'today', label: 'اليوم', icon: LayoutDashboard },
  { id: 'upcoming', label: 'القادم', icon: CalendarDays },
  { id: 'inbox', label: 'الوارد', icon: Inbox },
  { id: 'all', label: 'المهام', icon: ListTodo },
  { id: 'calendar', label: 'التقويم', icon: CalendarDays },
  { id: 'habits', label: 'العادات', icon: Activity },
  { id: 'journal', label: 'اليوميات', icon: NotebookPen },
  { id: 'stats', label: 'إحصائيات', icon: ChartBar },
  { id: 'settings', label: 'الإعدادات', icon: Settings2 },
];

export const defaultMobileViews: View[] = ['today', 'upcoming', 'habits', 'journal'];

export const journalMoods: { id: JournalMood; label: string }[] = [
  { id: 'grateful', label: 'ممتن' },
  { id: 'calm', label: 'هادئ' },
  { id: 'energized', label: 'متحمس' },
  { id: 'tired', label: 'متعب' },
  { id: 'anxious', label: 'قلق' },
  { id: 'reflective', label: 'متأمل' },
];
