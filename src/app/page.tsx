'use client';

import {
  Activity, ArrowDown, ArrowDownLeft, ArrowLeft, ArrowUp, Bolt, BookOpen, CalendarDays, ChartBar, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3, Code2, Feather, Flag, Flame, FolderKanban, Globe2, Grid2X2, GripVertical, Inbox, Info, Languages, LayoutDashboard, ListTodo, Logout, Menu, Moon, MoreHorizontal, NotebookPen, Pause, Pencil, Play, Plus, Search, Settings2, Sparkles, Stopwatch, Sun, Target, Timer, Trash2, X,
} from './icons';
import type { AppIcon } from './icons';
import HabitHistory from './components/HabitHistory';
import CalendarView from './components/CalendarView';
import { WinItLogo } from './components/Logo';
import { useConfirm } from './components/ConfirmDialog';
import useDialogFocus from './components/useDialogFocus';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import { CountBadge, DueChip, PriorityFlag, RowActions, SessionCount } from './components/atoms';
import { habitIconFor, habitIcons } from './habit-icons';
import { DEFAULT_HABIT_ICON, HABIT_ICON_GROUPS, HABIT_ICON_LABELS, isHabitIcon } from '@/lib/habit-icons';
import { tasksLabel } from '@/lib/semantics';
import { truncateWords } from '@/lib/label';
import AuthGate, { useAuth } from './components/AuthGate';
import { projectIcons, projectIconFor } from './project-icons';
import { DEFAULT_PROJECT_ICON, PROJECT_ICON_GROUPS, PROJECT_ICON_LABELS, isProjectIcon } from '@/lib/project-icons';
import { api } from '@/lib/client-api';
import type { FocusSession, Habit, JournalEntry, JournalMood, Log, Project, Task } from '@/lib/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, AR_LOCALE, formatArNumber, formatClock, formatDuration, getRemainingSeconds, getWeekStart, localDateKey, PRIORITY_ORDER } from '@/lib/core';
import { DEFAULT_GOAL_KEY, GOAL_SLOTS, goalStyle } from '@/lib/goals';
import type { CSSProperties } from 'react';

type JournalInput = Pick<JournalEntry, 'entryDate' | 'content'> & Pick<JournalEntry, 'title' | 'mood'>;
type JournalPage = { entries: JournalEntry[]; total: number; offset: number; limit: number };
type View = 'today' | 'upcoming' | 'inbox' | 'all' | 'calendar' | 'habits' | 'journal' | 'stats' | 'settings';
type Dataset = { projects: Project[]; tasks: Task[]; habits: Habit[]; logs: Log[]; focusSessions: FocusSession[]; today: string };

const views: { id: View; label: string; icon: AppIcon }[] = [
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
const mobileViewOptions: { id: View; label: string; icon: AppIcon }[] = [
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
const defaultMobileViews: View[] = ['today', 'upcoming', 'habits', 'journal'];
const priorityLabel = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة', none: '' };
const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
// §8.7: the week starts on Saturday, so labels are ordered Saturday-first.
const weekdays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const journalMoods: { id: JournalMood; label: string }[] = [
  { id: 'grateful', label: 'ممتن' }, { id: 'calm', label: 'هادئ' },
  { id: 'energized', label: 'متحمس' }, { id: 'tired', label: 'متعب' },
  { id: 'anxious', label: 'قلق' }, { id: 'reflective', label: 'متأمل' },
];

function WinitApp() {
  const auth = useAuth();
  const avatarLetter = (auth.user?.name ?? 'و').trim().charAt(0) || 'و';
  const [data, setData] = useState<Dataset | null>(null);
  const [view, setViewState] = useState<View>('today');
  const [selectedProject, setSelectedProjectState] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showHabitAdd, setShowHabitAdd] = useState(false);
  const [showProjectAdd, setShowProjectAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [mobileViews, setMobileViews] = useState<View[]>(defaultMobileViews);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [showFocus, setShowFocus] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const notify = (message: string, kind: 'success' | 'error' = 'success') => setNotice({ message, kind });
  const [focusTaskId, setFocusTaskId] = useState('');
  const [focusMode, setFocusMode] = useState<'pomodoro' | 'stopwatch'>('pomodoro');
  const [focusTick, setFocusTick] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalTotal, setJournalTotal] = useState(0);
  const [journalSearch, setJournalSearch] = useState('');
  const [journalQuery, setJournalQuery] = useState('');
  const [journalLoading, setJournalLoading] = useState(false);
  const journalRequestId = useRef(0);
  const [journalSaving, setJournalSaving] = useState(false);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [editingJournal, setEditingJournal] = useState<JournalEntry | null>(null);
  const navigate = useCallback((next: View, projectId: string | null = null) => {
    setViewState(next);
    setSelectedProjectState(projectId);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', next);
    if (projectId) url.searchParams.set('project', projectId);
    else url.searchParams.delete('project');
    window.history.pushState(null, '', url);
  }, []);
  const setView = useCallback((next: View) => navigate(next), [navigate]);
  const switchView = useCallback((next: View, projectId: string | null = null) => {
    navigate(next, projectId);
    setMobileMenu(false);
  }, [navigate]);

  const refresh = useCallback(async () => {
    try { const now = new Date(); const todayKey = localDateKey(now); const fromKey = localDateKey(addDays(new Date(`${todayKey}T12:00:00`), -20)); setData(await api<Dataset>(`/api/overview?date=${encodeURIComponent(todayKey)}&from=${encodeURIComponent(fromKey)}`)); }
    catch (error) { notify(error instanceof Error ? error.message : 'تعذر الاتصال', 'error'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const loadJournal = useCallback(async (offset = 0, append = false) => {
    const requestId = ++journalRequestId.current;
    setJournalLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(offset) });
      if (journalQuery) params.set('q', journalQuery);
      const page = await api<JournalPage>(`/api/journal?${params}`);
      if (requestId !== journalRequestId.current) return;
      setJournalEntries((current) => append ? [...current, ...page.entries] : page.entries);
      setJournalTotal(page.total);
    } catch (error) {
      if (requestId === journalRequestId.current) notify(error instanceof Error ? error.message : 'تعذر تحميل اليوميات', 'error');
    } finally {
      if (requestId === journalRequestId.current) setJournalLoading(false);
    }
  }, [journalQuery]);
  useEffect(() => {
    const timer = window.setTimeout(() => setJournalQuery(journalSearch.trim()), 260);
    return () => window.clearTimeout(timer);
  }, [journalSearch]);
  useEffect(() => { if (view === 'journal') void loadJournal(); }, [view, loadJournal]);
  useEffect(() => {
    const syncRoute = () => {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get('view') as View | null;
      const validViews: View[] = ['today', 'upcoming', 'inbox', 'all', 'calendar', 'habits', 'journal', 'stats', 'settings'];
      setViewState(requested && validViews.includes(requested) ? requested : 'today');
      setSelectedProjectState(params.get('project'));
    };
    syncRoute();
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);
  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenu) { setMobileMenu(false); return; }
      if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey) || showAdd || showHabitAdd || showProjectAdd || showFocus || showJournalEditor) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]') || target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault(); setFocusTaskId(''); setShowAdd(true);
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [mobileMenu, showAdd, showHabitAdd, showProjectAdd, showFocus, showJournalEditor]);
  useEffect(() => {
    const mode = document.documentElement.dataset.mode ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setDarkMode(mode === 'dark');
    try {
      const stored = JSON.parse(window.localStorage.getItem('winit-mobile-views') ?? 'null');
      if (Array.isArray(stored)) {
        const valid = [...new Set(stored.filter((id): id is View => mobileViewOptions.some((option) => option.id === id)))].slice(0, 4);
        if (valid.length) setMobileViews(valid);
      }
      const minutes = Number(window.localStorage.getItem('winit-pomodoro-minutes'));
      if (Number.isInteger(minutes) && minutes >= 5 && minutes <= 90) setPomodoroMinutes(minutes);
    } catch { /* retain defaults if browser storage is unavailable */ }
  }, []);
  useEffect(() => {
    if (!notice || !data) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice, data]);

  const today = data?.today ?? localDateKey();
  const tasks = data?.tasks ?? [];
  const projects = data?.projects ?? [];
  const getProject = (id: string | null) => projects.find((project) => project.id === id);
  const habits = data?.habits ?? [];
  const logs = data?.logs ?? [];
  const sessions = data?.focusSessions ?? [];
  const activeSession = [...sessions].reverse().find((s) => !s.endedAt && !s.isCompleted);
  useEffect(() => {
    if (!activeSession) return;
    setFocusTick(Date.now());
    const timer = window.setInterval(() => setFocusTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeSession?.id]);
  const todayTasks = tasks.filter((task) => task.status !== 'completed' && task.dueDate !== null && task.dueDate <= today);
  const completedToday = tasks.filter((task) => task.status === 'completed' && (task.completedAt ? localDateKey(new Date(task.completedAt)) : '') === today).length;
  const todayLogs = habits.map((habit) => ({ habit, log: logs.find((log) => log.habitId === habit.id && log.logDate === today) }));
  const todayFocusSeconds = sessions.filter((s) => localDateKey(new Date(s.startedAt)) === today).reduce((total, s) => total + s.actualSeconds, 0) + (activeSession && localDateKey(new Date(activeSession.startedAt)) === today ? Math.max(0, Math.floor((focusTick - new Date(activeSession.startedAt).getTime()) / 1000)) : 0);
  const toggleTheme = () => {
    const nextMode = darkMode ? 'light' : 'dark';
    document.documentElement.dataset.mode = nextMode;
    try { window.localStorage.setItem('winit-mode', nextMode); } catch { /* keep the current-page choice if storage is unavailable */ }
    setDarkMode(nextMode === 'dark');
  };

  const mutate = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      await api(url, { method, body });
      await refresh();
      return true;
    } catch (error) { notify(error instanceof Error ? error.message : 'تعذر حفظ التغييرات', 'error'); return false; }
    finally { setBusy(false); }
  };

  const openTaskEditor = (task: Task | null = null) => { setEditingTask(task); setShowAdd(true); };
  const deleteTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const okToDelete = await confirm({
      title: 'حذف المهمة',
      message: `ستُحذف مهمة «${task?.title ?? ''}» نهائياً. لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'حذف المهمة',
    });
    if (!okToDelete) return;
    setData((prev) =>
      prev
        ? {
            ...prev,
            tasks: prev.tasks.filter((t) => t.id !== taskId),
            focusSessions: prev.focusSessions.map((s) => (s.taskId === taskId ? { ...s, taskId: null } : s)),
          }
        : prev,
    );
    const ok = await mutate(`/api/tasks/${taskId}`, 'DELETE');
    if (!ok) void refresh();
    else notify('حُذفت المهمة');
  };

  const addTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim(); if (!title) return;
    const payload = { title, projectId: String(form.get('projectId') ?? '') || null, priority: String(form.get('priority') || 'none'), dueDate: String(form.get('dueDate') || (view === 'today' ? today : '')) || null, estimatedPomodoros: Number(form.get('estimatedPomodoros') || 1), notes: String(form.get('notes') || '') || null, tags: String(form.get('tags') || ''), ...(editingTask ? { status: String(form.get('status') || editingTask.status) } : {}) };
    const ok = await mutate(editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks', editingTask ? 'PATCH' : 'POST', payload);
    if (ok) { setShowAdd(false); setEditingTask(null); }
  };
  const addProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return;
    const payload = { name, description: String(form.get('description') ?? '').trim() || null, color: String(form.get('color') ?? '#9b315f'), icon: String(form.get('icon') ?? 'folder'), targetWeeklyMinutes: Math.max(0, Number(form.get('targetWeeklyMinutes') ?? 0)) };
    const ok = await mutate(editingProject ? `/api/projects/${editingProject.id}` : '/api/projects', editingProject ? 'PATCH' : 'POST', payload);
    if (ok) { setShowProjectAdd(false); setEditingProject(null); }
  };
  const saveHabit = async (body: unknown) => {
    const ok = await mutate(editingHabit ? `/api/habits/${editingHabit.id}` : '/api/habits', editingHabit ? 'PATCH' : 'POST', body);
    if (ok) { setShowHabitAdd(false); setEditingHabit(null); }
  };
  const deleteProject = async (project: Project) => {
    const okToDelete = await confirm({
      title: 'حذف المشروع',
      message: `سيُحذف مشروع «${project.name}». مهامه لن تُحذف، بل تُنقل إلى صندوق الوارد.`,
      confirmLabel: 'حذف المشروع',
    });
    if (!okToDelete) return;
    const ok = await mutate(`/api/projects/${project.id}`, 'DELETE');
    if (ok && selectedProject === project.id) switchView('all');
  };
  const deleteHabit = async (habit: Habit) => {
    const okToDelete = await confirm({
      title: 'حذف العادة',
      message: `ستُحذف عادة «${habit.name}» مع كامل سجلّها التاريخي. لا يمكن التراجع.`,
      confirmLabel: 'حذف العادة',
    });
    if (!okToDelete) return;
    await mutate(`/api/habits/${habit.id}`, 'DELETE');
  };
  const reorderProjects = async (nextProjects: Project[]) => {
    setData((prev) => (prev ? { ...prev, projects: nextProjects } : prev));
    try {
      await api('/api/projects/reorder', {
        method: 'POST',
        body: { ids: nextProjects.map((p) => p.id) },
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حفظ ترتيب المشاريع', 'error');
      void refresh();
    }
  };
  const reorderHabits = async (nextHabits: Habit[]) => {
    setData((prev) => (prev ? { ...prev, habits: nextHabits } : prev));
    try {
      await api('/api/habits/reorder', {
        method: 'POST',
        body: { ids: nextHabits.map((h) => h.id) },
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حفظ ترتيب العادات', 'error');
      void refresh();
    }
  };
  const setTimerMinutes = (minutes: number) => {
    setPomodoroMinutes(minutes);
    try { window.localStorage.setItem('winit-pomodoro-minutes', String(minutes)); } catch { /* keep this session's selection */ }
  };
  const saveMobileViews = (nextViews: View[]) => {
    setMobileViews(nextViews);
    try { window.localStorage.setItem('winit-mobile-views', JSON.stringify(nextViews)); } catch { /* keep this session's selection */ }
  };
  const completeTask = async (taskId: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed', completedAt: t.status === 'completed' ? null : new Date().toISOString() }
            : t,
        ),
      };
    });
    const ok = await mutate(`/api/tasks/${taskId}/complete`, 'POST');
    if (!ok) void refresh();
  };
  const toggleHabit = async (habit: Habit, existing?: Log) => {
    const value = existing && existing.value >= habit.targetValue ? 0 : (habit.recordType === 'check' ? 1 : habit.targetValue);
    setData((prev) => {
      if (!prev) return prev;
      const filtered = prev.logs.filter((l) => !(l.habitId === habit.id && l.logDate === today));
      return {
        ...prev,
        logs: [...filtered, { id: existing?.id ?? 'optimistic', habitId: habit.id, logDate: today, value }],
      };
    });
    const ok = await mutate(`/api/habits/${habit.id}/log`, 'POST', { date: today, value });
    if (!ok) void refresh();
  };
  const exportAccountData = async () => {
    try {
      const payload = await api('/api/account/export');
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `winit-export-${today}.json`;
      link.click();
      URL.revokeObjectURL(url);
      notify('تم تنزيل نسخة كاملة من بياناتك بنجاح');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر تصدير البيانات', 'error');
    }
  };
  const deleteAccount = async () => {
    const okToDelete = await confirm({
      title: 'حذف الحساب نهائياً',
      message: 'هل أنت متأكد من رغبتك في حذف حسابك نهائياً؟ سيتم مسح كافة البيانات والمشاريع فوراً دون إمكانية استرجاع.',
      confirmLabel: 'حذف الحساب نهائياً',
    });
    if (!okToDelete) return;
    try {
      await api('/api/account', { method: 'DELETE' });
      window.location.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حذف الحساب', 'error');
    }
  };
  const startFocus = async (taskId?: string) => {
    const task = tasks.find((item) => item.id === (taskId || focusTaskId));
    const result = await mutate('/api/focus/start', 'POST', { taskId: task?.id ?? null, projectId: task?.projectId ?? null, mode: focusMode, plannedSeconds: focusMode === 'pomodoro' ? pomodoroMinutes * 60 : 4 * 60 * 60 });
    if (result) setShowFocus(false);
  };
  const finishFocus = async (completed: boolean) => {
    if (!activeSession) return;
    const elapsed = Math.max(0, Math.floor((focusTick - new Date(activeSession.startedAt).getTime()) / 1000));
    await mutate(`/api/focus/${activeSession.id}/finish`, 'POST', { actualSeconds: Math.min(elapsed, activeSession.plannedSeconds), completed });
  };
  const saveJournal = async (input: JournalInput, entryId?: string) => {
    setJournalSaving(true);
    try {
      await api<JournalEntry>(entryId ? `/api/journal/${entryId}` : '/api/journal', {
        method: entryId ? 'PATCH' : 'POST', body: input,
      });
      setShowJournalEditor(false);
      setEditingJournal(null);
      notify(entryId ? 'حُفظت تعديلاتك' : 'حُفظت التدوينة');
      await loadJournal();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حفظ التدوينة', 'error');
    } finally { setJournalSaving(false); }
  };
  const deleteJournal = async (entryId: string) => {
    const okToDelete = await confirm({
      title: 'حذف التدوينة',
      message: 'ستُحذف هذه التدوينة نهائياً. لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'حذف التدوينة',
    });
    if (!okToDelete) return;
    try {
      await api(`/api/journal/${entryId}`, { method: 'DELETE' });
      setJournalEntries((current) => current.filter((entry) => entry.id !== entryId));
      setJournalTotal((current) => Math.max(0, current - 1));
      notify('حُذفت التدوينة');
    } catch (error) { notify(error instanceof Error ? error.message : 'تعذر حذف التدوينة', 'error'); }
  };

  const heading = selectedProject ? getProject(selectedProject)?.name ?? 'المشروع' : view === 'today' ? 'اليوم' : view === 'upcoming' ? 'القادم' : view === 'inbox' ? 'صندوق الوارد' : view === 'all' ? 'كل المهام' : view === 'stats' ? 'إحصائيات' : view === 'settings' ? 'الإعدادات' : view === 'calendar' ? 'التقويم' : view === 'habits' ? 'عاداتي' : view === 'journal' ? 'اليوميات' : 'المشروع';
  const filteredTasks = useMemo(() => {
    const active = tasks.filter((task) => task.status !== 'completed');
    if (selectedProject) return active.filter((task) => task.projectId === selectedProject);
    if (view === 'today') return active.filter((task) => task.dueDate !== null && task.dueDate <= today);
    if (view === 'upcoming') { const end = localDateKey(addDays(new Date(`${today}T12:00:00`), 7)); return active.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= end); }
    if (view === 'inbox') return active.filter((task) => !task.projectId);
    if (view === 'all') return active;
    return active;
  }, [tasks, view, selectedProject, today]);

  if (!data && notice) return <div className="app-error"><h1>تعذر فتح مساحتك.</h1><p>{notice.message}</p><button className="primary-button" onClick={() => { setNotice(null); void refresh(); }}>أعد المحاولة</button></div>;
  if (!data) return <div className="app-loading" aria-label="جارٍ تحميل مساحة العمل"><div className="loading-skeleton loading-title" /><div className="loading-skeleton loading-row" /><div className="loading-skeleton loading-row" /><div className="loading-skeleton loading-panel" /></div>;

  return (
    <div className="app-shell">
      <aside id="app-sidebar" className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`} aria-label="القائمة الرئيسية">
        <div className="brand-row"><WinItLogo height={32} /><button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label="إغلاق القائمة"><X size={18} /></button></div>
        <div className="workspace-switch"><span className="workspace-avatar" aria-hidden="true">{avatarLetter}</span><span className="workspace-txt"><b><bdi>{auth.user?.demo ? 'مساحة تجريبية' : auth.user?.name ?? 'حسابي'}</bdi></b><small><bdi>{auth.user?.demo ? 'مشتركة، غير خاصة' : auth.user?.email ?? 'نسخة خاصة بك'}</bdi></small></span>{!auth.user?.demo && <button type="button" className="icon-button sign-out" onClick={() => void auth.signOut()} aria-label="تسجيل الخروج" title="تسجيل الخروج"><Logout size={16} /></button>}</div>
        <nav className="main-nav" aria-label="التنقل بين الصفحات">
          {views.map((item, index) => {
            const Icon = item.icon; const active = view === item.id && !selectedProject;
            const count = index === 0 ? todayTasks.length : index === 2 ? tasks.filter((t) => t.status !== 'completed' && !t.projectId).length : null;
            return <button key={item.id} className={`nav-item ${active ? 'nav-active' : ''}`} onClick={() => switchView(item.id)}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{count ? <i className="nav-count">{count}</i> : null}</button>;
          })}
        </nav>
        <div className="project-head"><div className="nav-label">المشاريع</div><button className="tiny-add" aria-label="إضافة مشروع" onClick={() => { setEditingProject(null); setShowProjectAdd(true); }}><Plus size={16} /></button></div>
        <nav className="project-nav" aria-label="قائمة المشاريع">
          {projects.map((project, index) => {
            const Icon = projectIconFor(project.icon);
            const active = selectedProject === project.id;
            const count = tasks.filter((t) => t.projectId === project.id && t.status !== 'completed').length;
            const isDragging = draggedProjectId === project.id;
            const isOver = dragOverProjectId === project.id;
            return (
              <div
                key={project.id}
                className={`project-item-row ${isDragging ? 'is-dragging' : ''} ${isOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', project.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedProjectId(project.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverProjectId !== project.id) setDragOverProjectId(project.id);
                }}
                onDragLeave={() => {
                  if (dragOverProjectId === project.id) setDragOverProjectId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverProjectId(null);
                  const fromId = draggedProjectId || e.dataTransfer.getData('text/plain');
                  if (!fromId || fromId === project.id) return;
                  const fromIndex = projects.findIndex((p) => p.id === fromId);
                  const toIndex = projects.findIndex((p) => p.id === project.id);
                  if (fromIndex < 0 || toIndex < 0) return;
                  const updated = [...projects];
                  const [moved] = updated.splice(fromIndex, 1);
                  updated.splice(toIndex, 0, moved);
                  void reorderProjects(updated);
                  setDraggedProjectId(null);
                }}
                onDragEnd={() => {
                  setDraggedProjectId(null);
                  setDragOverProjectId(null);
                }}
              >
                <span
                  className="project-drag-handle"
                  role="button"
                  tabIndex={0}
                  aria-label={`إعادة ترتيب مشروع ${project.name}`}
                  title="اسحب لإعادة الترتيب (أو الأسهم)"
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' && index > 0) {
                      e.preventDefault();
                      const updated = [...projects];
                      const [moved] = updated.splice(index, 1);
                      updated.splice(index - 1, 0, moved);
                      void reorderProjects(updated);
                      notify(`تم نقل مشروع «${project.name}» للأعلى`);
                    } else if (e.key === 'ArrowDown' && index < projects.length - 1) {
                      e.preventDefault();
                      const updated = [...projects];
                      const [moved] = updated.splice(index, 1);
                      updated.splice(index + 1, 0, moved);
                      void reorderProjects(updated);
                      notify(`تم نقل مشروع «${project.name}» للأسفل`);
                    }
                  }}
                >
                  <GripVertical size={13} />
                </span>
                <button className={`project-item ${active ? 'project-active' : ''}`} onClick={() => switchView('all', project.id)}>
                  <span className="project-icon" style={{ color: goalStyle(project.color).onSoft, backgroundColor: goalStyle(project.color).soft }}><Icon size={14} /></span>
                  <span className="project-item-name" title={project.name}><bdi aria-hidden="true">{truncateWords(project.name)}</bdi><span className="sr-only">{project.name}</span></span>
                  <span className="project-count">{count}</span>
                </button>
                <button className="project-manage" aria-label={`تعديل ${project.name}`} title="تعديل المشروع" onClick={() => { setEditingProject(project); setShowProjectAdd(true); }}><Pencil size={14} /></button>
                <button className="project-manage project-remove" aria-label={`حذف ${project.name}`} title="حذف المشروع" onClick={() => void deleteProject(project)}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-quote"><p>خطوة صغيرة كل يوم<br />تصنع طريقاً عظيماً.</p><span>استمر، أنت في الطريق الصحيح</span></div></div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileMenu(false)} />}

      <main className="main-area">
        <header className="topbar"><div className="topbar-start"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="فتح القائمة" aria-expanded={mobileMenu} aria-controls="app-sidebar"><Menu size={20} /></button><div className="breadcrumbs"><b>{heading}</b></div></div><div className="topbar-end"><span className="today-date">{new Intl.DateTimeFormat(AR_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${today}T12:00:00`))}</span><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={darkMode ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الداكن'} aria-pressed={darkMode}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><div className="top-avatar" aria-hidden="true">{avatarLetter}</div></div></header>
        <div className="page-content">
          {view === 'today' && !selectedProject && <TodayDashboard {...{ today, todayTasks, tasks, projects, habits, todayLogs, todayFocusSeconds, completedToday, activeSession, focusTick, startFocus, finishFocus, setShowFocus, setShowAdd, setFocusTaskId, setView, switchView, mutate, toggleHabit, completeTask, logs, sessions }} setShowAdd={(show) => show ? openTaskEditor() : setShowAdd(false)} onEditTask={openTaskEditor} />}
          {view === 'journal' && <JournalView entries={journalEntries} total={journalTotal} search={journalSearch} loading={journalLoading} onSearch={setJournalSearch} onNew={() => { setEditingJournal(null); setShowJournalEditor(true); }} onEdit={(entry) => { setEditingJournal(entry); setShowJournalEditor(true); }} onDelete={(id) => void deleteJournal(id)} onLoadMore={() => void loadJournal(journalEntries.length, true)} />}
          {view !== 'today' && view !== 'journal' && (view === 'stats' ? <StatsView tasks={tasks} sessions={sessions} habits={habits} logs={logs} today={today} /> : view === 'settings' ? <SettingsView darkMode={darkMode} onToggleTheme={toggleTheme} pomodoroMinutes={pomodoroMinutes} onPomodoroChange={setTimerMinutes} mobileViews={mobileViews} mobileViewOptions={mobileViewOptions} onMobileViewsChange={(next) => saveMobileViews(next as View[])} onExportData={exportAccountData} onDeleteAccount={deleteAccount} /> : view === 'calendar' ? <CalendarView tasks={tasks} projects={projects} today={today} month={calendarMonth} setMonth={setCalendarMonth} onEdit={openTaskEditor} onAdd={() => openTaskEditor()} /> : view === 'habits' ? <HabitsView habits={habits} logs={logs} today={today} onToggle={toggleHabit} onSetValue={(habit, value) => void mutate(`/api/habits/${habit.id}/log`, 'POST', { date: today, value })} onEdit={(habit) => { setEditingHabit(habit); setShowHabitAdd(true); }} onDelete={(habit) => void deleteHabit(habit)} onAdd={() => { setEditingHabit(null); setShowHabitAdd(true); }} onReorder={(next) => void reorderHabits(next)} /> : <TaskListView title={heading} tasks={filteredTasks} projects={projects} project={selectedProject ? projects.find((item) => item.id === selectedProject) : undefined} today={today} onComplete={(id) => void completeTask(id)} onDelete={(id) => void deleteTask(id)} onStart={(id) => { setFocusTaskId(id); void startFocus(id); }} onEdit={openTaskEditor} onAdd={() => openTaskEditor()} />)}
        </div>
        <footer className="app-footer"><span>مصمّم لأيامك، لا لمزيد من الضجيج.</span><span>أنجز ما يهمّك</span></footer>
        {/* Phone-first add affordance: a thumb-reachable button instead of a
            keyboard shortcut hint. Hidden on views that have their own add. */}
        {(view === 'today' || view === 'upcoming' || view === 'inbox' || view === 'all' || selectedProject) && (
          <button className="fab-add" onClick={() => openTaskEditor()} aria-label="أضف مهمة جديدة"><Plus size={24} /></button>
        )}
        <nav className="mobile-tabs" aria-label="التنقل الرئيسي" style={{ gridTemplateColumns: `repeat(${mobileViews.length + 1}, minmax(0, 1fr))` }}>
          {mobileViews.map((id) => { const item = mobileViewOptions.find((option) => option.id === id); if (!item) return null; const Icon = item.icon; return <button key={id} className={view === id && !selectedProject ? 'mobile-tab-active' : ''} onClick={() => switchView(id)} aria-current={view === id && !selectedProject ? 'page' : undefined}><Icon size={19} /><span>{item.label}</span></button>; })}
          <button className={selectedProject || !mobileViews.includes(view) ? 'mobile-tab-active' : ''} onClick={() => setMobileMenu(true)} aria-label="المزيد من القوائم" aria-expanded={mobileMenu}><MoreHorizontal size={20} /><span>المزيد</span></button>
        </nav>
      </main>

      {confirmDialog}
      {showAdd && <TaskModal key={editingTask?.id ?? 'new'} projects={projects} selectedProject={selectedProject} today={today} task={editingTask} onClose={() => { setShowAdd(false); setEditingTask(null); }} onSubmit={addTask} busy={busy} />}
      {showHabitAdd && <HabitModal key={editingHabit?.id ?? 'new'} habit={editingHabit} onClose={() => { setShowHabitAdd(false); setEditingHabit(null); }} onSubmit={saveHabit} busy={busy} />}
      {showProjectAdd && <ProjectModal key={editingProject?.id ?? 'new'} project={editingProject} onClose={() => { setShowProjectAdd(false); setEditingProject(null); }} onSubmit={addProject} onDelete={(target) => { setShowProjectAdd(false); setEditingProject(null); void deleteProject(target); }} busy={busy} />}
      {showJournalEditor && <JournalEditor key={editingJournal?.id ?? 'new'} entry={editingJournal} today={today} busy={journalSaving} onClose={() => setShowJournalEditor(false)} onSave={saveJournal} />}
      {showFocus && <FocusModal tasks={tasks.filter((t) => t.status !== 'completed')} selectedId={focusTaskId} setSelectedId={setFocusTaskId} mode={focusMode} setMode={setFocusMode} pomodoroMinutes={pomodoroMinutes} setPomodoroMinutes={setTimerMinutes} onClose={() => setShowFocus(false)} onStart={() => void startFocus()} />} 
      {activeSession && <FocusDock session={activeSession} tick={focusTick} tasks={tasks} busy={busy} onFinish={() => void finishFocus(true)} onStop={() => void finishFocus(false)} />}
      {notice && <div className={`toast toast-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'} aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}>{notice.message}<button onClick={() => setNotice(null)} aria-label="إغلاق"><X size={15} /></button></div>}
    </div>
  );
}

type DashboardProps = {
  today: string; todayTasks: Task[]; tasks: Task[]; projects: Project[]; habits: Habit[];
  todayLogs: { habit: Habit; log: Log | undefined }[]; todayFocusSeconds: number; completedToday: number;
  activeSession?: FocusSession; focusTick: number; startFocus: (id?: string) => Promise<void>; finishFocus: (completed: boolean) => Promise<void>;
  setShowFocus: (show: boolean) => void; setShowAdd: (show: boolean) => void; setFocusTaskId: (id: string) => void; setView: (view: View) => void;
  switchView: (view: View, projectId?: string | null) => void; mutate: (url: string, method: string, body?: unknown) => Promise<boolean>;
  toggleHabit: (habit: Habit, log?: Log) => Promise<void>; completeTask: (taskId: string) => Promise<void>; logs: Log[]; sessions: FocusSession[];
  onEditTask: (task: Task) => void;
};

function TodayDashboard(props: DashboardProps) {
  const { today, todayTasks, tasks, projects, habits, todayLogs, todayFocusSeconds, completedToday, activeSession, focusTick, startFocus, setShowFocus, setShowAdd, setFocusTaskId, setView, switchView, mutate, toggleHabit, completeTask, logs, sessions, onEditTask } = props;
  const sorted = [...todayTasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const doneHabits = todayLogs.filter(({ habit, log }) => log && log.value >= habit.targetValue).length;
  const weekStartDate = getWeekStart(new Date(`${today}T12:00:00`));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const currentProject = (id: string | null) => projects.find((project) => project.id === id);
  return <>
    <section className="welcome-row"><div><h1>صباح الخير، لنصنع يوماً جميلاً.</h1><p>رتّب أفكارك، خذ نفساً عميقاً، وابدأ بما يهمّ حقاً.</p></div></section>
    <section className="stats-grid" aria-label="ملخص اليوم">
      <div className="stat-card"><span className="stat-label">المهام المكتملة</span><strong className="stat-value">{completedToday}<small> من {completedToday + todayTasks.length}</small></strong></div>
      <div className="stat-card"><span className="stat-label">وقت التركيز</span><strong className="stat-value">{formatDuration(todayFocusSeconds)}<small> اليوم</small></strong></div>
      <div className="stat-card"><span className="stat-label">العادات المكتملة</span><strong className="stat-value">{doneHabits}<small> من {habits.length}</small></strong></div>
    </section>
    <div className="dashboard-grid">
      <section className="panel tasks-panel"><div className="panel-heading"><div><h2>مهام اليوم <CountBadge count={todayTasks.length} /></h2></div><div className="panel-heading-actions"><button className="text-link" onClick={() => setView('all')}>كل المهام</button><button className="icon-button soft-button add-task-compact" onClick={() => { setFocusTaskId(''); setShowAdd(true); }} aria-label="أضف مهمة جديدة"><Plus size={16} /></button></div></div>
        {sorted.length ? <div className="task-list">{sorted.slice(0, 6).map((task) => <TaskRow key={task.id} task={task} project={currentProject(task.projectId)} today={today} onComplete={() => void completeTask(task.id)} onStart={() => { setFocusTaskId(task.id); void startFocus(task.id); }} onEdit={() => onEditTask(task)} />)}</div> : <div className="empty-state"><b>قائمتك هادئة الآن</b><span>لحظة جميلة لتضيف مهمة تخدم أهدافك.</span></div>}
      </section>
      <section className="panel habits-panel"><div className="panel-heading"><div><h2>عادات اليوم <span className="heading-count">{doneHabits}/{habits.length}</span></h2></div><button className="icon-button soft-button" onClick={() => setView('habits')} aria-label="عرض العادات"><ArrowLeft size={16} /></button></div>
        <div className="habit-list">{todayLogs.map(({ habit, log }) => <HabitRow key={habit.id} habit={habit} log={log} onToggle={() => void toggleHabit(habit, log)} />)}</div>
        <div className="habit-note"><span>لا تبحث عن الكمال، فقط عُد كل يوم.</span></div>
      </section>
    </div>
    <div className="lower-grid"><section className="panel focus-panel"><div className="focus-copy"><span className="focus-label">{activeSession && <span className="live-dot" />} {activeSession ? 'جلسة تركيز جارية' : 'مؤقت التركيز'}</span><h3>{activeSession ? 'أنت في قلب الإنجاز.' : 'امنح هدفك انتباهك.'}</h3><p>{activeSession ? 'اترك المشتتات جانباً، أنت تقوم بعمل رائع.' : 'جلسة واحدة هادئة قد تغيّر شكل يومك.'}</p><button className="primary-button focus-cta-position" disabled={Boolean(activeSession)} onClick={() => { if (!activeSession) setShowFocus(true); }}><Play size={15} fill="currentColor" />{activeSession ? 'جلسة جارية، تابعها من الشريط' : 'ابدأ جلسة تركيز'}</button></div><div className="focus-visual"><div className="timer-halo halo-outer" /><div className="timer-halo halo-inner" /><div className="timer-center"><Timer size={23} /><span>{activeSession ? activeSession.mode === 'stopwatch' ? formatClock(Math.floor((focusTick - new Date(activeSession.startedAt).getTime()) / 1000)) : formatClock(getRemainingSeconds(new Date(activeSession.startedAt).getTime(), activeSession.plannedSeconds, 0, focusTick)) : '25:00'}</span></div><span className="focus-orbit-dot" /></div></section>
      <section className="panel week-panel"><div className="week-heading"><div><h3>التركيز خلال الأسبوع</h3></div><button className="text-link" onClick={() => setView('calendar')}>التقويم</button></div><div className="week-bars">{weekDays.map((day, index) => { const key = localDateKey(day); const count = sessions.filter((s) => localDateKey(new Date(s.startedAt)) === key).reduce((acc, s) => acc + s.actualSeconds, 0); const height = Math.min(48, Math.max(count ? 12 : 5, count / 60 * 1.3)); return <div className={`week-day ${key === today ? 'week-day-current' : ''}`} key={key}><span className="week-bar-track"><i style={{ height: `${height}px` }} /></span><span className="week-day-label">{['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'][index]}</span></div>; })}</div><div className="week-summary"><span>{formatDuration(sessions.filter((s) => localDateKey(new Date(s.startedAt)) >= localDateKey(weekStartDate) && localDateKey(new Date(s.startedAt)) <= today).reduce((acc, s) => acc + s.actualSeconds, 0))} تركيز هذا الأسبوع</span><SessionCount count={sessions.filter((s) => s.isCompleted && localDateKey(new Date(s.startedAt)) >= localDateKey(weekStartDate) && localDateKey(new Date(s.startedAt)) <= today).length} size={13} /></div></section></div>
    <section className="quote-banner"><div><p>«أحب الأعمال إلى الله أدومها وإن قل»</p><span>تذكير لطيف: الثبات أجمل من السرعة.</span></div><button className="journal-quick-link" onClick={() => switchView('journal')}><NotebookPen size={15} />دوّن فكرة</button></section>
  </>;
}

function TaskRow({ task, project, today, onComplete, onStart, onEdit }: { task: Task; project?: Project; today: string; onComplete: () => void; onStart: () => void; onEdit: () => void }) {
  return <div className="task-row row-interactive"><button className="task-check" role="checkbox" aria-checked={task.status === 'completed'} onClick={onComplete} aria-label={`إكمال ${task.title}`}><Check size={13} /></button><button type="button" className="task-body" onClick={onEdit}><span className="task-title"><bdi>{task.title}</bdi></span><span className="task-meta">{project && <span className="task-project"><i style={{ background: goalStyle(project.color).solid }} />{project.name}</span>}{task.dueDate && <DueChip date={task.dueDate} today={today} />}<SessionCount count={task.estimatedPomodoros} /><PriorityFlag priority={task.priority} /></span></button><RowActions><button className="icon-button row-action" onClick={onEdit} aria-label={`تعديل ${task.title}`}><Pencil size={14} /></button><button className="icon-button row-action" onClick={onStart} aria-label={`التركيز على ${task.title}`}><Play size={13} /></button></RowActions></div>;
}
function HabitRow({ habit, log, onToggle }: { habit: Habit; log?: Log; onToggle: () => void }) {
  const complete = Boolean(log && log.value >= habit.targetValue);
  const Icon = habitIconFor(habit.icon);
  return <div className={`habit-row ${complete ? 'habit-complete' : ''}`}><span className="habit-icon" style={{ color: goalStyle(habit.color).onSoft, background: goalStyle(habit.color).soft }}><Icon size={16} /></span><div className="habit-copy"><b><bdi>{habit.name}</bdi></b><span>{complete ? 'أُنجزت اليوم، أحسنت!' : `${habit.targetValue} ${habit.unit}${habit.reminderTime ? `، ${habit.reminderTime}` : ''}`}</span></div><button className={`habit-check ${complete ? 'habit-check-done' : ''}`} style={{ '--goal-fill': goalStyle(habit.color).solid } as CSSProperties} onClick={onToggle} role="checkbox" aria-checked={complete} aria-label={complete ? 'إلغاء إنجاز العادة' : 'تسجيل إنجاز العادة'}>{complete && <Check size={14} />}</button></div>;
}

function TaskListView({ title, tasks, projects, project, today, onComplete, onDelete, onStart, onEdit, onAdd }: { title: string; tasks: Task[]; projects: Project[]; project?: Project; today: string; onComplete: (id: string) => void; onDelete: (id: string) => void; onStart: (id: string) => void; onEdit: (task: Task) => void; onAdd: () => void }) {
  const groups = new Map<string, Task[]>();
  for (const task of [...tasks].sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])) {
    const key = task.dueDate && task.dueDate < today ? 'متأخرة' : task.dueDate === today ? 'اليوم' : task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString(AR_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }) : 'بلا موعد';
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return <section className="list-page"><div className="page-title-row"><div><h1>{title}</h1><p>{project?.description || (tasks.length ? <span aria-label={tasksLabel(tasks.length)}><bdi>{formatArNumber(tasks.length)}</bdi> تنتظر وقتك</span> : 'مساحة واضحة لما يستحق انتباهك.')}</p>{project?.targetWeeklyMinutes ? <span className="project-target"><Timer size={13} />هدف التركيز الأسبوعي: {formatDuration(project.targetWeeklyMinutes * 60)}</span> : null}</div><button className="primary-button" onClick={onAdd}><Plus size={17} />مهمة جديدة</button></div>
    {tasks.length ? <div className="task-groups">{[...groups].map(([label, list]) => <section className="task-group" key={label}><div className="group-title"><span>{label}</span><CountBadge count={list.length} /></div>{list.map((task) => { const project = projects.find((p) => p.id === task.projectId); return <div className="expanded-task row-interactive" key={task.id}><button className="task-check" role="checkbox" aria-checked={task.status === 'completed'} onClick={() => onComplete(task.id)} aria-label={`إكمال ${task.title}`}><Check size={13} /></button><button type="button" className="expanded-task-copy" onClick={() => onEdit(task)}><b><bdi>{task.title}</bdi></b><span className="expanded-meta">{project && <span><i style={{ background: goalStyle(project.color).solid }} />{project.name}</span>}{task.dueDate && <DueChip date={task.dueDate} today={today} />}<SessionCount count={task.estimatedPomodoros} /><PriorityFlag priority={task.priority} /></span>{task.notes && <p dir="auto"><bdi>{task.notes}</bdi></p>}</button><RowActions><button className="icon-button row-action" onClick={() => onEdit(task)} aria-label={`تعديل ${task.title}`}><Pencil size={14} /></button><button className="icon-button row-action" onClick={() => onStart(task.id)} aria-label={`بدء التركيز على ${task.title}`}><Play size={13} /></button><button className="icon-button row-action row-action-danger" onClick={() => onDelete(task.id)} aria-label={`حذف ${task.title}`}><Trash2 size={15} /></button></RowActions></div>; })}</section>)}</div> : <div className="empty-page"><h3>لا توجد مهام هنا بعد</h3><p>أضف أول مهمة، وسنساعدك على إبقاء الصورة واضحة.</p><button className="primary-button" onClick={onAdd}><Plus size={16} />أضف مهمة</button></div>}
  </section>;
}

function JournalView({ entries, total, search, loading, onSearch, onNew, onEdit, onDelete, onLoadMore }: {
  entries: JournalEntry[]; total: number; search: string; loading: boolean;
  onSearch: (value: string) => void; onNew: () => void; onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void; onLoadMore: () => void;
}) {
  // §8.9: the reading card is the only place Naskh is allowed, at 18px or 20px.
  const [readingSize, setReadingSize] = useState<'normal' | 'large'>('normal');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const dateLabel = (value: string) => new Intl.DateTimeFormat(AR_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  const moodLabel = (value: JournalMood | null) => journalMoods.find((mood) => mood.id === value)?.label;
  return <section className="list-page journal-page" aria-labelledby="journal-heading">
    <div className="page-title-row journal-title-row"><div><h1 id="journal-heading">دفتر اليوميات</h1><p>اكتب ما تريد تذكّره، بلا ضغط ولا قالب مفروض.</p></div><button className="primary-button" onClick={onNew}><NotebookPen size={17} />تدوينة جديدة</button></div>
    <div className="journal-prompt"><div><span>سؤال اليوم</span><h2>ما الشيء الذي تود أن تحتفظ به من هذا اليوم؟</h2><p>سطر واحد يكفي. يمكنك العودة إليه متى شئت.</p></div><button className="journal-prompt-action" onClick={onNew}>ابدأ الكتابة <Pencil size={15} /></button></div>
    <aside className="journal-privacy-note" role="note"><Info size={16} /><p>ملاحظة خصوصية: هذه نسخة تجريبية بلا تسجيل دخول. تجنّب تدوين معلومات شديدة الحساسية.</p></aside>
    <div className="journal-toolbar"><span className="journal-count">{formatArNumber(total)} {total === 1 ? 'تدوينة' : 'تدوينات'}</span><button className="ghost-button" onClick={() => setReadingSize((size) => size === 'normal' ? 'large' : 'normal')} aria-pressed={readingSize === 'large'}>{readingSize === 'normal' ? 'تكبير خط القراءة' : 'تصغير خط القراءة'}</button><label className="journal-search"><Search size={17} /><input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="ابحث في تدويناتك" aria-label="ابحث في التدوينات" /></label></div>
    {loading && !entries.length ? <div className="journal-loading" role="status" aria-live="polite" aria-label="جارٍ تحميل اليوميات"><div /><div /><div /></div> : entries.length ? <div className="journal-list" aria-busy={loading}>
      {entries.map((entry) => <article className="journal-entry reading-card row-interactive" key={entry.id} data-expanded={Boolean(expanded[entry.id])}><div className="journal-entry-head"><div><time dateTime={entry.entryDate}>{dateLabel(entry.entryDate)}</time><h2><bdi>{entry.title || 'تدوينة يومية'}</bdi></h2></div>{moodLabel(entry.mood) && <span className={`journal-mood mood-${entry.mood}`}>{moodLabel(entry.mood)}</span>}</div><div className="reading-card__body reading-body" data-size={readingSize} dir="auto">{entry.content}</div>{entry.content.length > 320 && <button className="ghost-button" onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))} aria-expanded={Boolean(expanded[entry.id])}>{expanded[entry.id] ? 'عرض أقل' : 'اقرأ المزيد'}</button>}<div className="journal-entry-foot"><span>آخر تعديل {new Intl.DateTimeFormat(AR_LOCALE, { hour: 'numeric', minute: '2-digit' }).format(new Date(entry.updatedAt))}</span><RowActions><button className="icon-button row-action" onClick={() => onEdit(entry)} aria-label={`تعديل تدوينة ${entry.title}`}><Pencil size={14} /></button><button className="icon-button row-action row-action-danger" onClick={() => onDelete(entry.id)} aria-label={`حذف تدوينة ${dateLabel(entry.entryDate)}`}><Trash2 size={15} /></button></RowActions></div></article>)}
    </div> : <div className="empty-page journal-empty"><span className="journal-empty-icon"><NotebookPen size={22} /></span><h3>{search ? 'لم نعثر على تدوينة مطابقة' : 'دفترك ما زال فارغاً'}</h3><p>{search ? 'جرّب كلمات أخرى أو امسح البحث.' : 'ابدأ بملاحظة صغيرة عن يومك، ثم عُد إليها وقتما تشاء.'}</p>{!search && <button className="primary-button" onClick={onNew}><Plus size={16} />اكتب أول تدوينة</button>}</div>}
    {entries.length < total && <button className="journal-load-more" onClick={onLoadMore} disabled={loading}>{loading ? 'جارٍ التحميل…' : 'تحميل تدوينات أقدم'}</button>}
  </section>;
}

function JournalEditor({ entry, today, busy, onClose, onSave }: { entry: JournalEntry | null; today: string; busy: boolean; onClose: () => void; onSave: (input: JournalInput, entryId?: string) => void }) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? today);
  const [mood, setMood] = useState<JournalMood | null>(entry?.mood ?? null);
  const dirty = title !== (entry?.title ?? '') || content !== (entry?.content ?? '') || entryDate !== (entry?.entryDate ?? today) || mood !== (entry?.mood ?? null);
  const { confirm, confirmDialog } = useConfirm();
  const requestClose = async () => {
    if (busy) return;
    if (dirty) {
      const discard = await confirm({
        title: 'تغييرات غير محفوظة',
        message: 'لديك تغييرات لم تُحفظ في هذه التدوينة. إن أغلقت المحرر الآن ستفقد ما كتبته.',
        confirmLabel: 'أغلق دون حفظ',
        cancelLabel: 'تابع التحرير',
      });
      if (!discard) return;
    }
    onClose();
  };
  const close = () => { void requestClose(); };
  const dialogRef = useDialogFocus<HTMLFormElement>(close);
  return <div className="modal-backdrop journal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><form ref={dialogRef} className="task-modal journal-editor-modal" role="dialog" aria-modal="true" aria-labelledby="journal-editor-heading" onSubmit={(event) => { event.preventDefault(); if (!content.trim()) return; onSave({ entryDate, title: title.trim() || null, content, mood }, entry?.id); }}><div className="modal-topline"><span className="modal-icon"><NotebookPen size={17} /></span><span id="journal-editor-heading">{entry ? 'تعديل التدوينة' : 'تدوينة جديدة'}</span><button type="button" className="icon-button" onClick={close} aria-label="إغلاق المحرر" disabled={busy}><X size={18} /></button></div><label className="journal-field-label" htmlFor="journal-title">عنوان اختياري</label><input id="journal-title" className="journal-title-input" dir="auto" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="كلمة تلخّص يومك" /><div className="journal-date-field"><label className="journal-field-label" htmlFor="journal-date">تاريخ التدوينة</label><input id="journal-date" type="date" required value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></div><fieldset className="journal-mood-field"><legend>كيف كان شعورك؟ <span>اختياري</span></legend><div className="journal-mood-options">{journalMoods.map((option) => <button key={option.id} type="button" className={`journal-mood-option ${mood === option.id ? 'mood-selected' : ''}`} aria-pressed={mood === option.id} onClick={() => setMood(mood === option.id ? null : option.id)}>{option.label}</button>)}</div></fieldset><label className="journal-field-label" htmlFor="journal-content">ما الذي تود تدوينه؟</label><textarea id="journal-content" className="journal-content-input" dir="auto" value={content} onChange={(event) => setContent(event.target.value)} maxLength={20000} required placeholder="اكتب بحرية. لا تحتاج إلى صياغة مثالية…" /><div className="journal-editor-foot"><span>{formatArNumber(content.length)} / {formatArNumber(20000)} حرف</span><button className="primary-button" type="submit" disabled={busy || !content.trim()}>{busy ? 'جارٍ الحفظ…' : 'حفظ التدوينة'}</button></div></form>{confirmDialog}</div>;
}

function HabitsView({ habits, logs, today, onToggle, onSetValue, onEdit, onDelete, onAdd, onReorder }: {
  habits: Habit[];
  logs: Log[];
  today: string;
  onToggle: (habit: Habit, log?: Log) => void;
  onSetValue: (habit: Habit, value: number) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  onAdd: () => void;
  onReorder: (next: Habit[]) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [draggedHabitId, setDraggedHabitId] = useState<string | null>(null);
  const [dragOverHabitId, setDragOverHabitId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded = habits.length > 0 && habits.every((h) => expanded[h.id]);
  const toggleAll = () => {
    if (allExpanded) {
      setExpanded({});
    } else {
      const all: Record<string, boolean> = {};
      habits.forEach((h) => { all[h.id] = true; });
      setExpanded(all);
    }
  };

  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= habits.length) return;
    const updated = [...habits];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onReorder(updated);
  };

  return (
    <section className="list-page habits-page" aria-labelledby="habits-heading">
      <div className="page-title-row">
        <div>
          <h1 id="habits-heading">مساحة العادات</h1>
          <p>تابع تقدّمك من دون ضغط؛ كل عودة هي بداية جديدة.</p>
        </div>
        <div className="page-title-actions">
          {habits.length > 0 && (
            <button
              type="button"
              className="ghost-button habit-expand-all-btn"
              onClick={toggleAll}
              aria-label={allExpanded ? 'طي كل التفاصيل' : 'عرض كل التفاصيل'}
            >
              {allExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span>{allExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}</span>
            </button>
          )}
          <button className="primary-button" onClick={onAdd}>
            <Plus size={17} />عادة جديدة
          </button>
        </div>
      </div>
      <div className="habit-dashboard-list">
        {habits.map((habit, index) => {
          const log = logs.find((item) => item.habitId === habit.id && item.logDate === today);
          const done = Boolean(log && log.value >= habit.targetValue);
          const Icon = habitIconFor(habit.icon);
          const weekStart = getWeekStart(new Date(`${today}T12:00:00`));
          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          const progress = habit.recordType === 'check' ? (done ? 100 : 0) : Math.min(100, Math.round(((log?.value ?? 0) / habit.targetValue) * 100));
          const kind = habit.recordType === 'duration' ? 'مدة يومية' : habit.recordType === 'quantity' ? 'هدف يومي' : 'إنجاز يومي';
          const isExpanded = Boolean(expanded[habit.id]);
          const isDragging = draggedHabitId === habit.id;
          const isOver = dragOverHabitId === habit.id;

          return (
            <article
              className={`habit-card ${isExpanded ? 'habit-card-expanded' : 'habit-card-compact'} ${isDragging ? 'is-dragging' : ''} ${isOver ? 'drag-over' : ''}`}
              key={habit.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', habit.id);
                e.dataTransfer.effectAllowed = 'move';
                setDraggedHabitId(habit.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverHabitId !== habit.id) setDragOverHabitId(habit.id);
              }}
              onDragLeave={() => {
                if (dragOverHabitId === habit.id) setDragOverHabitId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverHabitId(null);
                const fromId = draggedHabitId || e.dataTransfer.getData('text/plain');
                if (!fromId || fromId === habit.id) return;
                const fromIndex = habits.findIndex((h) => h.id === fromId);
                const toIndex = habits.findIndex((h) => h.id === habit.id);
                if (fromIndex < 0 || toIndex < 0) return;
                const updated = [...habits];
                const [moved] = updated.splice(fromIndex, 1);
                updated.splice(toIndex, 0, moved);
                onReorder(updated);
                setDraggedHabitId(null);
              }}
              onDragEnd={() => {
                setDraggedHabitId(null);
                setDragOverHabitId(null);
              }}
            >
              <div
                className="habit-card-summary"
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-controls={`habit-details-${habit.id}`}
                aria-label={`${habit.name}، ${isExpanded ? 'انقر لطي التفاصيل' : 'انقر لعرض التفاصيل'}`}
                onClick={() => toggleExpand(habit.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(habit.id);
                  }
                }}
              >
                <div className="habit-summary-main">
                  <span
                    className="habit-drag-handle"
                    role="button"
                    tabIndex={0}
                    aria-label={`إعادة ترتيب عادة ${habit.name}`}
                    title="اسحب لإعادة الترتيب (أو الأسهم)"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        moveHabit(index, 'up');
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        moveHabit(index, 'down');
                      }
                    }}
                  >
                    <GripVertical size={16} />
                  </span>
                  <span
                    className="habit-icon"
                    style={{ color: goalStyle(habit.color).onSoft, background: goalStyle(habit.color).soft }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="habit-summary-info">
                    <strong className="habit-summary-title">
                      <bdi>{habit.name}</bdi>
                    </strong>
                    <div className="habit-summary-meta-row">
                      {done ? (
                        <span className="habit-summary-badge habit-badge-done">
                          <Check size={12} /> اكتمل هدف اليوم
                        </span>
                      ) : habit.recordType === 'check' ? (
                        <span className="habit-summary-badge">{habit.targetValue} {habit.unit} كل يوم</span>
                      ) : (
                        <span className="habit-summary-badge">
                          {log ? `${log.value} من ${habit.targetValue} ${habit.unit}` : `هدف اليوم: ${habit.targetValue} ${habit.unit}`} ({progress}%)
                        </span>
                      )}
                      {habit.reminderTime && (
                        <span className="habit-summary-time">
                          <Clock3 size={12} /> {habit.reminderTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="habit-summary-end">
                  {habit.recordType === 'check' ? (
                    <button
                      className={`habit-check ${done ? 'habit-check-done' : ''}`}
                      style={{ '--goal-fill': goalStyle(habit.color).solid } as CSSProperties}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggle(habit, log);
                      }}
                      role="checkbox"
                      aria-checked={done}
                      aria-label={done ? `إلغاء إنجاز ${habit.name}` : `تسجيل إنجاز ${habit.name}`}
                    >
                      {done && <Check size={14} />}
                    </button>
                  ) : (
                    <span
                      className="habit-progress-pill"
                      style={{ color: goalStyle(habit.color).onSoft, background: goalStyle(habit.color).soft }}
                    >
                      {progress}%
                    </span>
                  )}
                  <span className="habit-expand-icon" aria-hidden="true">
                    <ChevronDown className={`habit-chevron ${isExpanded ? 'is-expanded' : ''}`} size={18} />
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div id={`habit-details-${habit.id}`} className="habit-card-details">
                  <div className="habit-card-top">
                    <div className="habit-card-title">
                      <span className="habit-type-label">{kind}</span>
                      {habit.description && <p className="habit-details-desc">{habit.description}</p>}
                    </div>
                    <div className="habit-card-tools">
                      <RowActions>
                        <button
                          type="button"
                          className="icon-button row-action"
                          onClick={() => moveHabit(index, 'up')}
                          disabled={index === 0}
                          aria-label={`تحريك عادة ${habit.name} لأعلى`}
                          title="تحريك لأعلى"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button row-action"
                          onClick={() => moveHabit(index, 'down')}
                          disabled={index === habits.length - 1}
                          aria-label={`تحريك عادة ${habit.name} لأسفل`}
                          title="تحريك لأسفل"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button row-action"
                          onClick={() => onEdit(habit)}
                          aria-label={`تعديل عادة ${habit.name}`}
                          title="تعديل"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button row-action row-action-danger"
                          onClick={() => onDelete(habit)}
                          aria-label={`حذف عادة ${habit.name}`}
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </RowActions>
                    </div>
                  </div>
                  <div className="habit-progress-copy">
                    <span>
                      {done
                        ? 'اكتمل هدف اليوم'
                        : log
                        ? `${log.value} من ${habit.targetValue} ${habit.unit}`
                        : `هدف اليوم: ${habit.targetValue} ${habit.unit}`}
                    </span>
                    <b>
                      <bdi>{progress}%</bdi>
                    </b>
                  </div>
                  <div
                    className="habit-progress-track"
                    role="progressbar"
                    aria-label={`تقدم ${habit.name} اليوم`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <span
                      style={{
                        transform: `scaleX(${progress / 100})`,
                        background: goalStyle(habit.color).solid,
                      }}
                    />
                  </div>
                  <div className="habit-week">
                    {weekDays.map((day, i) => {
                      const key = localDateKey(day);
                      const entry = logs.find((item) => item.habitId === habit.id && item.logDate === key);
                      const met = (entry?.value ?? 0) >= habit.targetValue;
                      const state = met ? 'done' : key >= today ? 'future' : 'missed';
                      const label = `${['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][i]}: ${met ? 'اكتمل' : key > today ? 'قادم' : 'لم يسجّل'}`;
                      return (
                        <span
                          key={key}
                          className="week-strip__day"
                          data-state={state}
                          data-today={key === today}
                          title={label}
                          aria-label={label}
                          role="img"
                          style={{ '--goal-solid': goalStyle(habit.color).solid } as CSSProperties}
                        >
                          {met ? <Check size={13} /> : null}
                        </span>
                      );
                    })}
                  </div>
                  <HabitHistory habitId={habit.id} habitName={habit.name} color={habit.color} unit={habit.unit} />
                  <div className="habit-card-bottom">
                    {habit.recordType === 'check' ? (
                      <span>تسجيل بنقرة واحدة</span>
                    ) : (
                      <div className="habit-log-editor">
                        <label htmlFor={`habit-value-${habit.id}`}>قيمة اليوم</label>
                        <input
                          id={`habit-value-${habit.id}`}
                          type="number"
                          min="0"
                          max="10000"
                          step="1"
                          value={values[habit.id] ?? String(log?.value ?? '')}
                          onChange={(event) => setValues({ ...values, [habit.id]: event.target.value })}
                        />
                        <span>{habit.unit}</span>
                        <button
                          className="habit-action"
                          onClick={() => onSetValue(habit, Math.max(0, Number(values[habit.id] ?? log?.value ?? 0)))}
                        >
                          {log ? 'تحديث' : 'حفظ'}
                        </button>
                      </div>
                    )}
                    {habit.recordType === 'check' && (
                      <button
                        className={`habit-action ${done ? 'habit-action-done' : ''}`}
                        aria-pressed={done}
                        onClick={() => onToggle(habit, log)}
                      >
                        {done ? (
                          <>
                            <Check size={14} />
                            تم اليوم
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            تسجيل اليوم
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {habit.reminderTime && (
                    <div className="habit-reminder">
                      <Clock3 size={13} />
                      تذكير يومي {habit.reminderTime}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {!habits.length && (
          <div className="empty-page">
            <h3>ابدأ بعادة واحدة</h3>
            <p>القرآن، الحركة، أو أي شيء تريد الاستمرار عليه.</p>
            <button className="primary-button" onClick={onAdd}>
              <Plus size={16} />أنشئ عادة
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function TaskModal({ projects, selectedProject, today, task, onClose, onSubmit, busy }: { projects: Project[]; selectedProject: string | null; today: string; task: Task | null; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; busy: boolean }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form ref={dialogRef} className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-editor-heading" onSubmit={onSubmit}><div className="modal-topline"><span className="modal-icon"><ListTodo size={17} /></span><span id="task-editor-heading">{task ? 'تعديل المهمة' : 'مهمة جديدة'}</span><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div><input className="task-title-input" dir="auto" autoFocus name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ما الذي تود إنجازه؟" maxLength={240} required /><textarea className="task-notes-input" dir="auto" name="notes" defaultValue={task?.notes ?? ''} placeholder="أضف ملاحظة صغيرة تساعدك…" rows={2} /><div className="modal-fields"><label><span>المشروع</span><select name="projectId" defaultValue={task?.projectId ?? selectedProject ?? ''}><option value="">صندوق الوارد</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>الأولوية</span><select name="priority" defaultValue={task?.priority ?? 'none'}><option value="none">بدون أولوية</option><option value="high">عالية</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select></label><label><span>تاريخ الاستحقاق</span><input name="dueDate" type="date" defaultValue={task?.dueDate ?? (selectedProject ? '' : today)} /></label><label><span><Stopwatch size={13} aria-hidden="true" />جلسات التركيز</span><select name="estimatedPomodoros" aria-label="عدد جلسات التركيز المتوقعة" defaultValue={String(task?.estimatedPomodoros ?? 1)}>{Array.from({ length: 20 }, (_, index) => index + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select></label><label className="modal-field-full"><span>وسوم، مفصولة بفواصل</span><input name="tags" defaultValue={task?.tags ?? ''} maxLength={300} placeholder="دراسة، مراجعة" /></label>{task && <label><span>الحالة</span><select name="status" defaultValue={task.status}><option value="todo">قيد الانتظار</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتملة</option></select></label>}</div><div className="modal-footer"><span><kbd>Esc</kbd> للإغلاق</span><button className="primary-button" type="submit" disabled={busy || !title.trim()}><Plus size={15} />{busy ? 'جارٍ الحفظ…' : task ? 'حفظ التعديلات' : 'أضف إلى يومي'}</button></div></form></div>;
}


function ProjectModal({ project, onClose, onSubmit, onDelete, busy }: { project: Project | null; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onDelete: (project: Project) => void; busy: boolean }) {
  // §4.3: a fixed palette, not a free colour picker. Legacy values still render
  // (goalStyle resolves them) but new choices come from the fixed slots.
  // An unknown legacy icon is preselected as an extra option so editing a
  // project never silently changes its icon.
  const palette = GOAL_SLOTS.map((slot) => slot.key);
  const colors = project && !palette.includes(project.color) ? [project.color, ...palette] : palette;
  const currentIcon = project?.icon ?? DEFAULT_PROJECT_ICON;
  const legacyIcon = project && !isProjectIcon(currentIcon) ? currentIcon : null;
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form ref={dialogRef} className="task-modal project-modal" role="dialog" aria-modal="true" aria-labelledby="project-editor-heading" onSubmit={onSubmit}>
    <div className="modal-topline"><span className="modal-icon"><FolderKanban size={17} /></span><span id="project-editor-heading">{project ? 'تعديل المشروع' : 'مشروع جديد'}</span><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
    <label className="journal-field-label" htmlFor="project-name">اسم المشروع</label><input id="project-name" className="task-title-input" dir="auto" name="name" autoFocus required maxLength={100} defaultValue={project?.name ?? ''} placeholder="مثلاً: تعلّم البرمجة" />
    <label className="journal-field-label" htmlFor="project-description">وصف قصير، اختياري</label><textarea id="project-description" className="task-notes-input" dir="auto" name="description" maxLength={1000} rows={2} defaultValue={project?.description ?? ''} placeholder="ما الذي تريد إنجازه في هذا المشروع؟" />
    <div className="modal-fields"><label><span>هدف التركيز الأسبوعي بالدقائق</span><input name="targetWeeklyMinutes" type="number" min="0" max="10080" step="15" defaultValue={project?.targetWeeklyMinutes ?? 0} /></label></div>
    <fieldset className="project-icon-field"><legend>أيقونة المشروع</legend>
      {legacyIcon && <div className="picker-legacy"><label className="project-icon-choice"><input type="radio" name="icon" value={legacyIcon} defaultChecked aria-label="الأيقونة الحالية" /><span><FolderKanban size={17} /></span></label><small>الأيقونة الحالية</small></div>}
      {PROJECT_ICON_GROUPS.map((group) => <div className="picker-group" key={group.label}>
        <p className="picker-group__label">{group.label}</p>
        <div className="picker-grid">{group.ids.map((value) => { const Icon = projectIcons[value]; const label = PROJECT_ICON_LABELS[value]; return <label key={value} className="project-icon-choice" title={label}><input type="radio" name="icon" value={value} defaultChecked={!legacyIcon && value === currentIcon} aria-label={label} /><span><Icon size={18} /></span></label>; })}</div>
      </div>)}
    </fieldset>
    <fieldset className="project-color-field"><legend>لون المشروع</legend>
      <div className="picker-grid picker-grid--color">{colors.map((value, index) => { const slot = GOAL_SLOTS.find((item) => item.key === value); const label = slot?.label ?? 'اللون الحالي'; return <label key={value} className="project-color-choice" title={label}><input type="radio" name="color" value={value} defaultChecked={value === (project?.color ?? DEFAULT_GOAL_KEY) || (!project && index === 0)} aria-label={label} /><i style={{ backgroundColor: goalStyle(value).solid }} /></label>; })}</div>
      <p className="picker-hint">{formatArNumber(GOAL_SLOTS.length)} لوناً ثابتاً، لكل منها اسم حتى لا يكون اللون هو الإشارة الوحيدة.</p>
    </fieldset>
    <div className="modal-footer">{project ? <button className="text-button-danger" type="button" onClick={() => onDelete(project)} disabled={busy}><Trash2 size={15} />حذف المشروع</button> : <span>يمكنك تعديل المشروع لاحقاً</span>}<button className="primary-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : project ? 'حفظ التعديلات' : 'إنشاء المشروع'}</button></div>
  </form></div>;
}

function HabitModal({ habit, onClose, onSubmit, busy }: { habit: Habit | null; onClose: () => void; onSubmit: (body: unknown) => Promise<void>; busy: boolean }) {
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [type, setType] = useState<Habit['recordType']>(habit?.recordType ?? 'check');
  const [target, setTarget] = useState(String(habit?.targetValue ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? 'مرة');
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime ?? '');
  const [color, setColor] = useState(habit?.color ?? '#138A78');
  const [icon, setIcon] = useState(habit?.icon ?? DEFAULT_HABIT_ICON);
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose);
  const palette = GOAL_SLOTS.map((slot) => slot.key);
  const colors = habit && !palette.includes(habit.color) ? [habit.color, ...palette] : palette;
  // An unknown legacy icon stays selectable so editing never silently changes it.
  const legacyIcon = habit && !isHabitIcon(habit.icon) ? habit.icon : null;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form ref={dialogRef} className="task-modal habit-modal" role="dialog" aria-modal="true" aria-label={habit ? 'تعديل العادة' : 'إضافة عادة جديدة'} onSubmit={(event) => { event.preventDefault(); void onSubmit({ name: name.trim(), description: description.trim() || null, recordType: type, targetValue: Number(target), unit, reminderTime: reminderTime || null, color, icon }); }}>
    <div className="modal-topline"><span className="modal-icon modal-icon-habit"><Target size={17} /></span><span>{habit ? 'تعديل العادة' : 'عادة جديدة'}</span><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
    <label className="journal-field-label" htmlFor="habit-name">اسم العادة</label><input id="habit-name" className="task-title-input" dir="auto" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="ما العادة التي تريد بناءها؟" required maxLength={100} />
    <label className="journal-field-label" htmlFor="habit-description">وصف، اختياري</label><textarea id="habit-description" className="task-notes-input" dir="auto" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="أضف تذكيراً لطيفاً لنفسك" />
    <div className="modal-fields"><label><span>طريقة التتبع</span><select value={type} onChange={(event) => { const value = event.target.value as Habit['recordType']; setType(value); setUnit(value === 'duration' ? 'دقيقة' : value === 'quantity' ? 'صفحات' : 'مرة'); }}><option value="check">إنجاز بسيط</option><option value="quantity">عدد / كمية</option><option value="duration">مدة زمنية</option></select></label>{type !== 'check' && <><label><span>الهدف اليومي</span><input type="number" min="1" max="10000" value={target} onChange={(event) => setTarget(event.target.value)} /></label><label><span>الوحدة</span><input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={30} /></label></>}<label><span>تذكير اختياري</span><input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label></div>
    <fieldset className="project-icon-field habit-icon-field"><legend>أيقونة العادة</legend>
      {legacyIcon && <div className="picker-group picker-legacy"><p className="picker-group__label">الأيقونة الحالية</p><div className="picker-grid"><label className="project-icon-choice" title="الأيقونة الحالية"><input type="radio" name="habitIcon" checked={icon === legacyIcon} onChange={() => setIcon(legacyIcon)} aria-label="الأيقونة الحالية" /><span>{(() => { const Icon = habitIconFor(legacyIcon); return <Icon size={18} />; })()}</span></label></div></div>}
      {HABIT_ICON_GROUPS.map((group) => <div className="picker-group" key={group.label}>
        <p className="picker-group__label">{group.label}</p>
        <div className="picker-grid">{group.ids.map((value) => { const Icon = habitIcons[value]; const label = HABIT_ICON_LABELS[value]; return <label key={value} className="project-icon-choice" title={label}><input type="radio" name="habitIcon" checked={!legacyIcon && icon === value} onChange={() => setIcon(value)} aria-label={label} /><span><Icon size={18} /></span></label>; })}</div>
      </div>)}
      <p className="picker-hint">{formatArNumber(Object.keys(habitIcons).length)} أيقونة في {formatArNumber(HABIT_ICON_GROUPS.length)} مجموعات، لكل منها اسم يقرأه قارئ الشاشة.</p>
    </fieldset>
    <fieldset className="project-color-field"><legend>لون العادة</legend><div className="picker-grid picker-grid--color">{colors.map((value, index) => <label key={value} className="project-color-choice"><input type="radio" name="habitColor" checked={color === value} onChange={() => setColor(value)} aria-label={GOAL_SLOTS.find((slot) => slot.key === value)?.label ?? `لون ${index + 1}`} /><i style={{ backgroundColor: goalStyle(value).solid }} /></label>)}</div></fieldset>
    <div className="modal-footer"><span>يمكنك تعديلها لاحقاً</span><button className="primary-button" type="submit" disabled={busy || !name.trim() || (type !== 'check' && Number(target) < 1)}><Plus size={15} />{busy ? 'جارٍ الحفظ…' : habit ? 'حفظ التعديلات' : 'أنشئ العادة'}</button></div>
  </form></div>;
}

function FocusModal({ tasks, selectedId, setSelectedId, mode, setMode, pomodoroMinutes, setPomodoroMinutes, onClose, onStart }: { tasks: Task[]; selectedId: string; setSelectedId: (id: string) => void; mode: 'pomodoro' | 'stopwatch'; setMode: (mode: 'pomodoro' | 'stopwatch') => void; pomodoroMinutes: number; setPomodoroMinutes: (minutes: number) => void; onClose: () => void; onStart: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialogRef} className="focus-modal" role="dialog" aria-modal="true" aria-label="جلسة تركيز هادئة"><div className="modal-topline"><span className="modal-icon modal-icon-focus"><Timer size={17} /></span><span>جلسة تركيز هادئة</span><button className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div><div className="focus-modal-timer"><div className="modal-timer-ring"><svg className="timer-ring" viewBox="0 0 220 220" aria-hidden="true" focusable="false"><circle cx="110" cy="110" r="100" fill="none" stroke="var(--line)" strokeWidth="10" />{mode === 'pomodoro' && <circle cx="110" cy="110" r="100" fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={2 * Math.PI * 100} strokeDashoffset={0} transform="rotate(-90 110 110)" />}</svg><div className="timer-ring__label"><span>{mode === 'pomodoro' ? `${String(pomodoroMinutes).padStart(2, '0')}:00` : '∞'}</span><small>{mode === 'pomodoro' ? `${formatArNumber(pomodoroMinutes)} دقيقة تركيز` : 'مؤقت مفتوح'}</small></div></div></div><div className="focus-mode-switch"><button type="button" className={mode === 'pomodoro' ? 'mode-active' : ''} aria-pressed={mode === 'pomodoro'} onClick={() => setMode('pomodoro')}><Timer size={14} />بومودورو، {formatArNumber(pomodoroMinutes)} دقيقة</button><button type="button" className={mode === 'stopwatch' ? 'mode-active' : ''} aria-pressed={mode === 'stopwatch'} onClick={() => setMode('stopwatch')}><Clock3 size={14} />مؤقت مفتوح</button></div>{mode === 'pomodoro' && <label className="focus-task-select focus-duration-select"><span>مدة التركيز</span><select value={pomodoroMinutes} onChange={(event) => setPomodoroMinutes(Number(event.target.value))}>{[10, 15, 20, 25, 30, 45, 60, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} دقيقة</option>)}</select></label>}<label className="focus-task-select"><span>على ماذا ستركز؟ <small>اختياري</small></span><select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">اختر مهمة أو اتركها فارغة</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><button className="primary-button focus-start-wide" onClick={onStart}><Play size={16} fill="currentColor" />ابدأ التركيز</button><div className="focus-modal-note"><Sparkles size={13} />أغلق ما يشتت انتباهك. هذه اللحظة لك.</div></div></div>;
}

function FocusDock({ session, tick, tasks, busy, onFinish, onStop }: { session: FocusSession; tick: number; tasks: Task[]; busy: boolean; onFinish: () => void; onStop: () => void }) {
  const elapsed = Math.max(0, Math.floor((tick - new Date(session.startedAt).getTime()) / 1000));
  const remaining = getRemainingSeconds(new Date(session.startedAt).getTime(), session.plannedSeconds, 0, tick);
  const task = tasks.find((item) => item.id === session.taskId);
  const display = session.mode === 'stopwatch' ? formatClock(elapsed) : formatClock(remaining);
  const finishRef = useRef(onFinish);
  const autoFinishedSession = useRef<string | null>(null);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);
  useEffect(() => {
    if (session.mode === 'pomodoro' && remaining === 0 && autoFinishedSession.current !== session.id) {
      autoFinishedSession.current = session.id;
      finishRef.current();
    }
  }, [remaining, session.mode, session.id]);
  return <div className="focus-dock"><span className="dock-live"><i />تركيز</span><span className="dock-title">{task?.title ?? 'جلسة تركيز مستقلة'}</span><b className="dock-timer">{display}</b><button className="dock-stop" onClick={onStop} disabled={busy} title="إنهاء الجلسة" aria-label="إنهاء جلسة التركيز"><Pause size={14} fill="currentColor" /><span>إنهاء</span></button><button className="dock-done" onClick={onFinish} disabled={busy} title="إكمال الجلسة" aria-label="إكمال جلسة التركيز"><Check size={15} /></button></div>;
}


export default function Home() {
  return <AuthGate><WinitApp /></AuthGate>;
}
