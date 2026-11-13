'use client';

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  GripVertical,
  Logout,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sun,
  Trash2,
  X,
} from './icons';
import CalendarView from './components/CalendarView';
import { WinItLogo } from './components/Logo';
import { useConfirm } from './components/ConfirmDialog';
import StatsView from './components/StatsView';
import SettingsView from './components/SettingsView';
import TodayDashboard from './components/TodayDashboard';
import TaskListView from './components/TaskListView';
import JournalView from './components/JournalView';
import JournalEditor from './components/JournalEditor';
import HabitsView from './components/HabitsView';
import TaskModal from './components/TaskModal';
import ProjectModal from './components/ProjectModal';
import HabitModal from './components/HabitModal';
import FocusModal from './components/FocusModal';
import FocusDock from './components/FocusDock';
import AuthGate, { useAuth } from './components/AuthGate';
import { projectIconFor } from './project-icons';
import { tasksLabel } from '@/lib/semantics';
import { truncateWords } from '@/lib/label';
import { api } from '@/lib/client-api';
import type { FocusSession, Habit, JournalEntry, Log, Project, Task } from '@/lib/types';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { addDays, AR_LOCALE, formatArHijriDate, localDateKey } from '@/lib/core';
import { goalStyle } from '@/lib/goals';
import {
  defaultMobileViews,
  mobileViewOptions,
  views,
  type Dataset,
  type JournalInput,
  type JournalPage,
  type View,
} from './types';

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
  const [habitMutationCount, setHabitMutationCount] = useState(0);
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
    window.history.replaceState(null, '', url);
  }, []);
  const setView = useCallback((next: View) => navigate(next), [navigate]);
  const switchView = useCallback((next: View, projectId: string | null = null) => {
    navigate(next, projectId);
    setMobileMenu(false);
  }, [navigate]);

  const refresh = useCallback(async (retryCount = 1) => {
    try {
      const now = new Date();
      const todayKey = localDateKey(now);
      const fromKey = localDateKey(addDays(new Date(`${todayKey}T12:00:00`), -20));
      const dataset = await api<Dataset>(`/api/overview?date=${encodeURIComponent(todayKey)}&from=${encodeURIComponent(fromKey)}`);
      setData(dataset);
    } catch (error) {
      if (retryCount > 0) {
        // Automatically retry once after 1s on serverless cold start or network blip
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return refresh(retryCount - 1);
      }
      notify(error instanceof Error ? error.message : 'تعذر الاتصال', 'error');
    }
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
  const gregorianDate = useMemo(
    () => new Intl.DateTimeFormat(AR_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${today}T12:00:00`)),
    [today]
  );
  const hijriDate = useMemo(
    () => formatArHijriDate(new Date(`${today}T12:00:00`)),
    [today]
  );
  const tasks = data?.tasks ?? [];
  const projects = data?.projects ?? [];
  const getProject = (id: string | null) => projects.find((project) => project.id === id);
  const habits = data?.habits ?? [];
  const logs = data?.logs ?? [];
  const sessions = data?.focusSessions ?? [];
  const activeSession = [...sessions].reverse().find((s) => !s.endedAt && !s.isCompleted);
  const todayTasks = tasks.filter((task) => task.status !== 'completed' && task.dueDate !== null && task.dueDate <= today);
  const completedToday = tasks.filter((task) => task.status === 'completed' && (task.completedAt ? localDateKey(new Date(task.completedAt)) : '') === today).length;
  const todayLogs = habits.map((habit) => ({ habit, log: logs.find((log) => log.habitId === habit.id && log.logDate === today) }));
  const todayFocusSeconds = sessions.filter((s) => localDateKey(new Date(s.startedAt)) === today).reduce((total, s) => total + s.actualSeconds, 0);
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
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    const payload = {
      title,
      projectId: String(form.get('projectId') ?? '') || null,
      priority: String(form.get('priority') || 'none'),
      dueDate: String(form.get('dueDate') || (view === 'today' ? today : '')) || null,
      estimatedPomodoros: Number(form.get('estimatedPomodoros') || 1),
      notes: String(form.get('notes') || '') || null,
      tags: String(form.get('tags') || ''),
      ...(editingTask ? { status: String(form.get('status') || editingTask.status) } : {}),
    };
    setBusy(true);
    try {
      const url = editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks';
      const method = editingTask ? 'PATCH' : 'POST';
      const saved = await api<Task>(url, { method, body: payload });
      setData((prev) => {
        if (!prev) return prev;
        if (editingTask) {
          return { ...prev, tasks: prev.tasks.map((t) => (t.id === saved.id ? saved : t)) };
        }
        return { ...prev, tasks: [saved, ...prev.tasks] };
      });
      setShowAdd(false);
      setEditingTask(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حفظ المهمة', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    if (!name) return;
    const payload = {
      name,
      description: String(form.get('description') ?? '').trim() || null,
      color: String(form.get('color') ?? '#9b315f'),
      icon: String(form.get('icon') ?? 'folder'),
      targetWeeklyMinutes: Math.max(0, Number(form.get('targetWeeklyMinutes') ?? 0)),
    };
    setBusy(true);
    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
      const method = editingProject ? 'PATCH' : 'POST';
      const saved = await api<Project>(url, { method, body: payload });
      setData((prev) => {
        if (!prev) return prev;
        if (editingProject) {
          return { ...prev, projects: prev.projects.map((p) => (p.id === saved.id ? saved : p)) };
        }
        return { ...prev, projects: [...prev.projects, saved] };
      });
      setShowProjectAdd(false);
      setEditingProject(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حفظ المشروع', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveHabit = async (body: unknown) => {
    setBusy(true);
    try {
      const url = editingHabit ? `/api/habits/${editingHabit.id}` : '/api/habits';
      const method = editingHabit ? 'PATCH' : 'POST';
      const saved = await api<Habit>(url, { method, body });
      setData((prev) => {
        if (!prev) return prev;
        if (editingHabit) {
          return { ...prev, habits: prev.habits.map((h) => (h.id === saved.id ? saved : h)) };
        }
        return { ...prev, habits: [...prev.habits, saved] };
      });
      setShowHabitAdd(false);
      setEditingHabit(null);
      setHabitMutationCount((c) => c + 1);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حفظ العادة', 'error');
    } finally {
      setBusy(false);
    }
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
    const ok = await mutate(`/api/habits/${habit.id}`, 'DELETE');
    if (ok) setHabitMutationCount((c) => c + 1);
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
  const moveProject = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projects.length) return;
    const updated = [...projects];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    void reorderProjects(updated);
    notify(`تم نقل مشروع «${moved.name}» ${direction === 'up' ? 'للأعلى' : 'للأسفل'}`);
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
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isDone = task.status === 'completed';
    const nextStatus = isDone ? 'todo' : 'completed';
    const nextCompletedAt = isDone ? null : new Date().toISOString();
    const endpoint = isDone ? `/api/tasks/${taskId}/restore` : `/api/tasks/${taskId}/complete`;

    // Optimistic UI update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: nextStatus, completedAt: nextCompletedAt }
            : t,
        ),
      };
    });

    try {
      const updated = await api<Task>(endpoint, { method: 'POST' });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === taskId ? updated : t)),
        };
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حفظ حالة المهمة', 'error');
      void refresh();
    }
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

    try {
      const result = await api<Log | { ok: boolean; value: number }>(`/api/habits/${habit.id}/log`, {
        method: 'POST',
        body: { date: today, value },
      });
      if (result && 'id' in result) {
        setData((prev) => {
          if (!prev) return prev;
          const filtered = prev.logs.filter((l) => !(l.habitId === habit.id && l.logDate === today));
          return { ...prev, logs: [...filtered, result as Log] };
        });
      } else if (value === 0) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            logs: prev.logs.filter((l) => !(l.habitId === habit.id && l.logDate === today)),
          };
        });
      }
      setHabitMutationCount((c) => c + 1);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر تسجيل العادة', 'error');
      void refresh();
    }
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
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000));
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
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      moveProject(index, 'up');
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      moveProject(index, 'down');
                    }
                  }}
                >
                  <GripVertical size={13} />
                </span>
                <span className="project-reorder-buttons" style={{ display: 'inline-flex', flexDirection: 'column', gap: '1px', flex: 'none' }}>
                  <button
                    type="button"
                    className="icon-button project-reorder-btn"
                    onClick={(e) => { e.stopPropagation(); moveProject(index, 'up'); }}
                    disabled={index === 0}
                    aria-label={`تحريك مشروع ${project.name} لأعلى`}
                    title="تحريك لأعلى"
                    style={{ width: '18px', height: '16px', minWidth: '18px', minHeight: '16px', padding: 0, opacity: index === 0 ? 0.25 : 0.75 }}
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    className="icon-button project-reorder-btn"
                    onClick={(e) => { e.stopPropagation(); moveProject(index, 'down'); }}
                    disabled={index === projects.length - 1}
                    aria-label={`تحريك مشروع ${project.name} لأسفل`}
                    title="تحريك لأسفل"
                    style={{ width: '18px', height: '16px', minWidth: '18px', minHeight: '16px', padding: 0, opacity: index === projects.length - 1 ? 0.25 : 0.75 }}
                  >
                    <ArrowDown size={11} />
                  </button>
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
        <header className="topbar"><div className="topbar-start"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="فتح القائمة" aria-expanded={mobileMenu} aria-controls="app-sidebar"><Menu size={20} /></button><div className="breadcrumbs"><b>{heading}</b></div></div><div className="topbar-end"><span className="today-date" title={`${gregorianDate} الموافق ${hijriDate}`}><span>{gregorianDate}</span><span className="today-date-separator" aria-hidden="true"> • </span><span className="today-date-hijri">{hijriDate}</span></span><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={darkMode ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الداكن'} aria-pressed={darkMode}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><div className="top-avatar" aria-hidden="true">{avatarLetter}</div></div></header>
        <div className="page-content">
          {view === 'today' && !selectedProject && <TodayDashboard {...{ today, todayTasks, tasks, projects, habits, todayLogs, todayFocusSeconds, completedToday, activeSession, startFocus, finishFocus, setShowFocus, setShowAdd, setFocusTaskId, setView, switchView, mutate, toggleHabit, completeTask, logs, sessions }} setShowAdd={(show) => show ? openTaskEditor() : setShowAdd(false)} onEditTask={openTaskEditor} onDeleteTask={deleteTask} />}
          {view === 'journal' && <JournalView entries={journalEntries} total={journalTotal} search={journalSearch} loading={journalLoading} onSearch={setJournalSearch} onNew={() => { setEditingJournal(null); setShowJournalEditor(true); }} onEdit={(entry) => { setEditingJournal(entry); setShowJournalEditor(true); }} onDelete={(id) => void deleteJournal(id)} onLoadMore={() => void loadJournal(journalEntries.length, true)} />}
          {view !== 'today' && view !== 'journal' && (view === 'stats' ? <StatsView tasks={tasks} sessions={sessions} habits={habits} logs={logs} today={today} /> : view === 'settings' ? <SettingsView darkMode={darkMode} onToggleTheme={toggleTheme} pomodoroMinutes={pomodoroMinutes} onPomodoroChange={setTimerMinutes} mobileViews={mobileViews} mobileViewOptions={mobileViewOptions} onMobileViewsChange={(next) => saveMobileViews(next as View[])} onExportData={exportAccountData} onDeleteAccount={deleteAccount} /> : view === 'calendar' ? <CalendarView tasks={tasks} projects={projects} today={today} month={calendarMonth} setMonth={setCalendarMonth} onEdit={openTaskEditor} onAdd={() => openTaskEditor()} /> : view === 'habits' ? <HabitsView habits={habits} logs={logs} today={today} invalidationToken={habitMutationCount} onToggle={toggleHabit} onSetValue={async (habit, value) => { const ok = await mutate(`/api/habits/${habit.id}/log`, 'POST', { date: today, value }); if (ok) setHabitMutationCount((c) => c + 1); }} onEdit={(habit) => { setEditingHabit(habit); setShowHabitAdd(true); }} onDelete={(habit) => void deleteHabit(habit)} onAdd={() => { setEditingHabit(null); setShowHabitAdd(true); }} onReorder={(next) => void reorderHabits(next)} /> : <TaskListView title={heading} tasks={filteredTasks} projects={projects} project={selectedProject ? projects.find((item) => item.id === selectedProject) : undefined} today={today} onComplete={(id) => void completeTask(id)} onDelete={(id) => void deleteTask(id)} onStart={(id) => { setFocusTaskId(id); void startFocus(id); }} onEdit={openTaskEditor} onAdd={() => openTaskEditor()} />)}
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
      {activeSession && <FocusDock session={activeSession} tasks={tasks} busy={busy} onFinish={(completed = true) => void finishFocus(completed)} onStop={() => void finishFocus(false)} />}
      {notice && <div className={`toast toast-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'} aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}>{notice.message}<button onClick={() => setNotice(null)} aria-label="إغلاق"><X size={15} /></button></div>}
    </div>
  );
}

export default function Home() {
  return <AuthGate><WinitApp /></AuthGate>;
}
