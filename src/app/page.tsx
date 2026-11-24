'use client';

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Languages,
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
import ShortcutHelp from './components/ShortcutHelp';
import OfflineNotice from './components/OfflineNotice';
import AuthGate, { useAuth } from './components/AuthGate';
import Link from 'next/link';
import { useLocale } from './locale';
import { projectIconFor } from './project-icons';
import { truncateWords } from '@/lib/label';
import { api } from '@/lib/client-api';
import type { Habit, JournalEntry, Log, Project, Task } from '@/lib/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, AR_LOCALE, localDateKey } from '@/lib/core';
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

// i18n-exempt-start: navigation label data, rendered through t()
const navGroups: { label: string; ids: View[] }[] = [
  { label: 'مساحتي', ids: ['today', 'upcoming', 'inbox', 'all'] },
  { label: 'المتابعة', ids: ['calendar', 'habits', 'journal', 'stats'] },
]; // i18n-exempt-end

function WinitApp() {
  const auth = useAuth();
  const { language, setLanguage, t } = useLocale();
  const avatarLetter = (auth.user?.name ?? 'و').trim().charAt(0) || 'و'; // i18n-exempt: fallback glyph
  const [data, setData] = useState<Dataset | null>(null);
  const [view, setViewState] = useState<View>('today');
  const [selectedProject, setSelectedProjectState] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [taskInitialDueDate, setTaskInitialDueDate] = useState<string | undefined>();
  const [showHabitAdd, setShowHabitAdd] = useState(false);
  const [showProjectAdd, setShowProjectAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitMutationCount, setHabitMutationCount] = useState(0);
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [mobileViews, setMobileViews] = useState<View[]>(defaultMobileViews);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [showFocus, setShowFocus] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(false);
  const mobileMenuTrigger = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' } | null>(null);
  const notify = (message: string, kind: 'success' | 'error' = 'success') => setNotice({ message, kind });
  const [focusTaskId, setFocusTaskId] = useState('');
  const [focusMode, setFocusMode] = useState<'pomodoro' | 'stopwatch'>('pomodoro');
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalTotal, setJournalTotal] = useState(0);
  const [journalNextCursor, setJournalNextCursor] = useState<string | null>(null);
  const [journalSearch, setJournalSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
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
    if (`${url.pathname}${url.search}` !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState(null, '', url);
    }
  }, []);
  const setView = useCallback((next: View) => navigate(next), [navigate]);
  const closeMobileMenu = useCallback((restoreFocus = true) => {
    const wasOpen = mobileMenu;
    setMobileMenu(false);
    if (wasOpen && restoreFocus) window.requestAnimationFrame(() => mobileMenuTrigger.current?.focus());
  }, [mobileMenu]);
  const openMobileMenu = useCallback((trigger?: HTMLElement) => {
    mobileMenuTrigger.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setMobileMenu(true);
  }, []);
  const switchView = useCallback((next: View, projectId: string | null = null) => {
    navigate(next, projectId);
    closeMobileMenu();
  }, [closeMobileMenu, navigate]);

  const refresh = useCallback(async (retryCount = 1) => {
    try {
      const now = new Date();
      const todayKey = localDateKey(now);
      const fromKey = localDateKey(addDays(new Date(`${todayKey}T12:00:00`), -89));
      const dataset = await api<Dataset>(`/api/overview?date=${encodeURIComponent(todayKey)}&from=${encodeURIComponent(fromKey)}`);
      setData(dataset);
    } catch (error) {
      if (retryCount > 0) {
        // Automatically retry once after 1s on serverless cold start or network blip
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return refresh(retryCount - 1);
      }
      notify(error instanceof Error ? error.message : t('تعذر الاتصال'), 'error');
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const loadJournal = useCallback(async (cursor: string | null = null, append = false) => {
    const requestId = ++journalRequestId.current;
    setJournalLoading(true);
    try {
      const params = new URLSearchParams();
      if (cursor) params.set('before', cursor);
      if (journalQuery) params.set('q', journalQuery);
      const page = await api<JournalPage>(`/api/journal?${params}`);
      if (requestId !== journalRequestId.current) return;
      setJournalEntries((current) => append ? [...current, ...page.entries] : page.entries);
      setJournalTotal(page.total);
      setJournalNextCursor(page.nextCursor);
    } catch (error) {
      if (requestId === journalRequestId.current) notify(error instanceof Error ? error.message : t('تعذر تحميل اليوميات'), 'error');
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
    const media = window.matchMedia('(max-width: 1099px)');
    const syncLayout = () => {
      setMobileLayout(media.matches);
      if (!media.matches) setMobileMenu(false);
    };
    syncLayout();
    media.addEventListener('change', syncLayout);
    return () => media.removeEventListener('change', syncLayout);
  }, []);
  useEffect(() => {
    if (!mobileMenu || !mobileLayout) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const focusable = () => [...sidebar.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((node) => node.offsetParent !== null);
    focusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (document.querySelector('.modal-backdrop [role="dialog"], .modal-backdrop [role="alertdialog"]')) return;
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) {
        event.preventDefault();
        sidebar.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [mobileMenu, mobileLayout]);
  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
      const inDialog = Boolean(target?.closest('[role="dialog"], [role="alertdialog"]'));
      const modalOpen = showAdd || showHabitAdd || showProjectAdd || showFocus || showJournalEditor || showShortcuts || Boolean(confirmDialog);

      if (event.key === 'Escape') {
        if (mobileMenu) { closeMobileMenu(); return; }
        if (!modalOpen && query) { setQuery(''); return; }
      }
      // Search is the one accelerator that must work while typing elsewhere.
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (typing || inDialog || modalOpen) return;
      if (event.key === '?') { event.preventDefault(); setShowShortcuts(true); return; }
      if ((event.key === 'n' || event.key === 'N') && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault(); setFocusTaskId(''); setEditingTask(null); setShowAdd(true); return;
      }
      if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) return;
      event.preventDefault(); setFocusTaskId(''); setShowAdd(true);
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [closeMobileMenu, mobileMenu, showAdd, showHabitAdd, showProjectAdd, showFocus, showJournalEditor, showShortcuts, confirmDialog, query]);
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
      const storedDensity = window.localStorage.getItem('winit-density');
      if (storedDensity === 'compact' || storedDensity === 'comfortable') {
        setDensity(storedDensity);
        document.documentElement.dataset.density = storedDensity;
      }
    } catch { /* retain defaults if browser storage is unavailable */ }
  }, []);
  useEffect(() => {
    if (!notice || !data) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice, data]);

  const today = data?.today ?? localDateKey();
  const gregorianDate = useMemo(
    () => new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : AR_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${today}T12:00:00`)),
    [today, language]
  );
  const hijriDate = useMemo(
    () => new Intl.DateTimeFormat(language === 'en' ? 'en-u-ca-islamic-nu-latn' : 'ar-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${today}T12:00:00`)),
    [today, language]
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
    document.documentElement.dataset.theme = nextMode === 'dark' ? 'winit-energy-dark' : 'winit-energy';
    try { window.localStorage.setItem('winit-mode', nextMode); } catch { /* keep the current-page choice if storage is unavailable */ }
    setDarkMode(nextMode === 'dark');
  };
  const changeDensity = (next: 'comfortable' | 'compact') => {
    setDensity(next);
    document.documentElement.dataset.density = next;
    try { window.localStorage.setItem('winit-density', next); } catch { /* keep this session's choice */ }
  };

  const mutate = async (url: string, method: string, body?: unknown) => {
    setBusy(true);
    try {
      await api(url, { method, body });
      await refresh();
      return true;
    } catch (error) { notify(error instanceof Error ? error.message : t('تعذر حفظ التغييرات'), 'error'); return false; }
    finally { setBusy(false); }
  };

  /**
   * A first run used to be a blank pane with no way to see what the app looks
   * like populated. This writes three real tasks through the same endpoint the
   * editor uses, so nothing is special-cased in the database.
   */
  const seedDemoData = async () => {
    setSeeding(true);
    try {
      const samples = [
        { title: t('مراجعة الأسبوع في عشر دقائق'), priority: 'medium', estimatedPomodoros: 2 },
        { title: t('قراءة عشرين صفحة'), priority: 'low', estimatedPomodoros: 1 },
        { title: t('مكالمة مع العائلة'), priority: 'high', estimatedPomodoros: 1 },
      ];
      for (const sample of samples) {
        await api('/api/tasks', { method: 'POST', body: { ...sample, dueDate: today } });
      }
      await refresh();
      notify(t('أضفنا ثلاث مهام لتبدأ منها.'));
    } catch (error) {
      notify(error instanceof Error ? error.message : t('تعذر إضافة البيانات التجريبية'), 'error');
    } finally {
      setSeeding(false);
    }
  };
  const openTaskEditor = (task: Task | null = null, initialDueDate?: string) => {
    setEditingTask(task);
    setTaskInitialDueDate(initialDueDate);
    setShowAdd(true);
  };
  const deleteTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const okToDelete = await confirm({
      title: t('حذف المهمة'),
      message: t('ستُحذف مهمة «{title}» نهائياً. لا يمكن التراجع عن هذا الإجراء.', { title: task?.title ?? '' }),
      confirmLabel: t('حذف المهمة'),
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
    else notify(t('حُذفت المهمة'));
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
      notify(error instanceof Error ? error.message : t('تعذر حفظ المهمة'), 'error');
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
      notify(error instanceof Error ? error.message : t('تعذر حفظ المشروع'), 'error');
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
      notify(error instanceof Error ? error.message : t('تعذر حفظ العادة'), 'error');
    } finally {
      setBusy(false);
    }
  };
  const deleteProject = async (project: Project) => {
    const okToDelete = await confirm({
      title: t('حذف المشروع'),
      message: t('سيُحذف مشروع «{name}». مهامه لن تُحذف، بل تُنقل إلى صندوق الوارد.', { name: project.name }),
      confirmLabel: t('حذف المشروع'),
    });
    if (!okToDelete) return;
    const ok = await mutate(`/api/projects/${project.id}`, 'DELETE');
    if (ok && selectedProject === project.id) switchView('all');
  };
  const deleteHabit = async (habit: Habit) => {
    const okToDelete = await confirm({
      title: t('حذف العادة'),
      message: t('ستُحذف عادة «{name}» مع كامل سجلّها التاريخي. لا يمكن التراجع.', { name: habit.name }),
      confirmLabel: t('حذف العادة'),
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
      notify(error instanceof Error ? error.message : t('تعذر حفظ ترتيب المشاريع'), 'error');
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
    notify(t('تم نقل مشروع «{name}» {direction}', { name: moved.name, direction: direction === 'up' ? t('للأعلى') : t('للأسفل') }));
  };
  const reorderHabits = async (nextHabits: Habit[]) => {
    setData((prev) => (prev ? { ...prev, habits: nextHabits } : prev));
    try {
      await api('/api/habits/reorder', {
        method: 'POST',
        body: { ids: nextHabits.map((h) => h.id) },
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : t('تعذر حفظ ترتيب العادات'), 'error');
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
      notify(error instanceof Error ? error.message : t('تعذر حفظ حالة المهمة'), 'error');
      void refresh();
    }
  };

  /** Bulk actions run sequentially so the optimistic store never races itself. */
  const bulkComplete = async (ids: string[]) => {
    for (const id of ids) await completeTask(id);
    notify(t('تم إكمال {count} مهمة', { count: ids.length }));
  };

  const bulkDelete = async (ids: string[]) => {
    const okToDelete = await confirm({
      title: t('حذف {count} مهمة', { count: ids.length }),
      message: t('ستُحذف المهام المحددة نهائياً. لا يمكن التراجع عن هذا الإجراء.'),
      confirmLabel: t('حذف'),
    });
    if (!okToDelete) return;
    for (const id of ids) await mutate(`/api/tasks/${id}`, 'DELETE');
  };

  const bulkMove = async (ids: string[], projectId: string | null) => {
    for (const id of ids) await mutate(`/api/tasks/${id}`, 'PATCH', { projectId });
    notify(t('تم نقل {count} مهمة', { count: ids.length }));
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
      notify(error instanceof Error ? error.message : t('تعذر تسجيل العادة'), 'error');
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
      notify(t('تم تنزيل نسخة كاملة من بياناتك بنجاح'));
    } catch (error) {
      notify(error instanceof Error ? error.message : t('تعذر تصدير البيانات'), 'error');
    }
  };
  const deleteAccount = async () => {
    const okToDelete = await confirm({
      title: t('حذف الحساب نهائياً'),
      message: t('هل أنت متأكد من رغبتك في حذف حسابك نهائياً؟ سيتم مسح كافة البيانات والمشاريع فوراً دون إمكانية استرجاع.'),
      confirmLabel: t('حذف الحساب نهائياً'),
    });
    if (!okToDelete) return;
    try {
      await api('/api/account', { method: 'DELETE' });
      window.location.reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : t('تعذر حذف الحساب'), 'error');
    }
  };
  const startFocus = async (taskId?: string) => {
    const task = tasks.find((item) => item.id === (taskId || focusTaskId));
    const result = await mutate('/api/focus/start', 'POST', { taskId: task?.id ?? null, projectId: task?.projectId ?? null, mode: focusMode, plannedSeconds: focusMode === 'pomodoro' ? pomodoroMinutes * 60 : 4 * 60 * 60 });
    if (result) { notify(t('بدأت جلسة التركيز')); setShowFocus(true); }
  };
  const finishFocus = async (completed: boolean) => {
    if (!activeSession) return;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000));
    const actualSeconds = activeSession.mode === 'pomodoro' ? Math.min(elapsed, activeSession.plannedSeconds) : elapsed;
    const finished = await mutate(`/api/focus/${activeSession.id}/finish`, 'POST', { actualSeconds, completed });
    if (finished) {
      notify(completed
        ? t('أُنجزت جلسة تركيز · {count} دقيقة', { count: Math.max(1, Math.round(actualSeconds / 60)) })
        : t('أُنهيت الجلسة دون إكمال'));
      setShowFocus(false);
    }
  };
  const saveJournal = async (input: JournalInput, entryId?: string) => {
    setJournalSaving(true);
    try {
      await api<JournalEntry>(entryId ? `/api/journal/${entryId}` : '/api/journal', {
        method: entryId ? 'PATCH' : 'POST', body: input,
      });
      setShowJournalEditor(false);
      setEditingJournal(null);
      notify(entryId ? t('حُفظت تعديلاتك') : t('حُفظت التدوينة'));
      await loadJournal();
    } catch (error) {
      notify(error instanceof Error ? error.message : t('تعذر حفظ التدوينة'), 'error');
    } finally { setJournalSaving(false); }
  };
  const deleteJournal = async (entryId: string) => {
    const okToDelete = await confirm({
      title: t('حذف التدوينة'),
      message: t('ستُحذف هذه التدوينة نهائياً. لا يمكن التراجع عن هذا الإجراء.'),
      confirmLabel: t('حذف التدوينة'),
    });
    if (!okToDelete) return;
    try {
      await api(`/api/journal/${entryId}`, { method: 'DELETE' });
      setJournalEntries((current) => current.filter((entry) => entry.id !== entryId));
      setJournalTotal((current) => Math.max(0, current - 1));
      notify(t('حُذفت التدوينة'));
    } catch (error) { notify(error instanceof Error ? error.message : t('تعذر حذف التدوينة'), 'error'); }
  };

  const headingArabic = selectedProject ? getProject(selectedProject)?.name ?? t('المشروع') : view === 'today' ? t('اليوم') : view === 'upcoming' ? t('القادم') : view === 'inbox' ? t('صندوق الوارد') : view === 'all' ? t('كل المهام') : view === 'stats' ? t('إحصائيات') : view === 'settings' ? t('الإعدادات') : view === 'calendar' ? t('التقويم') : view === 'habits' ? t('عاداتي') : view === 'journal' ? t('اليوميات') : t('المشروع');
  const heading = selectedProject ? headingArabic : t(headingArabic);
  /**
   * Everything in the current view, completed tasks included. TaskListView owns
   * the open/all/done filter, so the "مكتملة" filter can actually show something.
   */
  const scopedTasks = useMemo(() => {
    if (selectedProject) return tasks.filter((task) => task.projectId === selectedProject);
    if (view === 'today') return tasks.filter((task) => task.dueDate !== null && task.dueDate <= today);
    if (view === 'upcoming') { const end = localDateKey(addDays(new Date(`${today}T12:00:00`), 7)); return tasks.filter((task) => task.dueDate && task.dueDate >= today && task.dueDate <= end); }
    if (view === 'inbox') return tasks.filter((task) => !task.projectId);
    return tasks;
  }, [tasks, view, selectedProject, today]);
  const hasActiveModal = showAdd || showHabitAdd || showProjectAdd || showFocus || showJournalEditor || showShortcuts || Boolean(confirmDialog);

  if (!data && notice) return <div className="app-error"><h1>{t('تعذر فتح مساحتك.')}</h1><p>{notice.message}</p><button className="btn btn-primary primary-button" onClick={() => { setNotice(null); void refresh(); }}>{t('أعد المحاولة')}</button></div>;
  if (!data) return <div className="app-loading" aria-label={t('جارٍ تحميل مساحة العمل')}><div className="loading-skeleton loading-title" /><div className="loading-skeleton loading-row" /><div className="loading-skeleton loading-row" /><div className="loading-skeleton loading-panel" /></div>;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t('تجاوز إلى المحتوى')}</a>
      <aside
        ref={sidebarRef}
        id="app-sidebar"
        className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}
        aria-label={t('القائمة الرئيسية')}
        aria-hidden={mobileLayout && !mobileMenu ? true : undefined}
        aria-modal={mobileLayout && mobileMenu && !hasActiveModal ? true : undefined}
        role={mobileLayout && mobileMenu ? 'dialog' : undefined}
        inert={mobileLayout && !mobileMenu}
        tabIndex={-1}
      >
        <div className="brand-row"><WinItLogo height={32} /><button className="icon-button sidebar-close" onClick={() => closeMobileMenu()} aria-label={t('إغلاق القائمة')}><X size={18} /></button></div>
        <div className="workspace-switch"><button type="button" className="workspace-avatar" onClick={() => { closeMobileMenu(false); setView('settings'); }} aria-label={t('فتح الإعدادات')} title={t('فتح الإعدادات')}>{avatarLetter}</button><span className="workspace-txt"><b><bdi>{auth.user?.demo ? t('مساحة تجريبية') : auth.user?.name ?? t('حسابي')}</bdi></b><small><bdi>{auth.user?.demo ? t('مشتركة، غير خاصة') : auth.user?.email ?? t('نسخة خاصة بك')}</bdi></small></span>{!auth.user?.demo && <button type="button" className="icon-button sign-out" onClick={() => { closeMobileMenu(); void auth.signOut(); }} aria-label={t('تسجيل الخروج')} title={t('تسجيل الخروج')}><Logout size={16} /></button>}</div>
        {/* Four items per group instead of nine in one column: the sidebar
            lists what you work on, then what you review. Settings sits alone. */}
        <nav className="main-nav" aria-label={t('التنقل بين الصفحات')}>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{t(group.label)}</div>
              {group.ids.map((id) => {
                const item = views.find((option) => option.id === id);
                if (!item) return null;
                const Icon = item.icon;
                const active = view === item.id && !selectedProject;
                const count = id === 'today'
                  ? todayTasks.length
                  : id === 'inbox'
                    ? tasks.filter((task) => task.status !== 'completed' && !task.projectId).length
                    : null;
                return <button key={item.id} className={`nav-item ${active ? 'nav-active' : ''}`} onClick={() => switchView(item.id)} aria-current={active ? 'page' : undefined}><Icon size={17} strokeWidth={1.8} /><span>{t(item.label)}</span>{count ? <i className="nav-count">{count}</i> : null}</button>;
              })}
            </div>
          ))}
        </nav>
        <div className="project-head"><div className="nav-label">{t('المشاريع')}</div><button className="tiny-add" aria-label={t('إضافة مشروع')} onClick={() => { setEditingProject(null); setShowProjectAdd(true); }}><Plus size={16} /></button></div>
        <nav className="project-nav" aria-label={t('قائمة المشاريع')}>
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
                  aria-label={t('إعادة ترتيب مشروع {name}', { name: project.name })}
                  title={t('اسحب لإعادة الترتيب (أو الأسهم)')}
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
                    aria-label={t('تحريك مشروع {name} لأعلى', { name: project.name })}
                    title={t('تحريك لأعلى')}
                    style={{ width: '18px', height: '16px', minWidth: '18px', minHeight: '16px', padding: 0, opacity: index === 0 ? 0.25 : 0.75 }}
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    className="icon-button project-reorder-btn"
                    onClick={(e) => { e.stopPropagation(); moveProject(index, 'down'); }}
                    disabled={index === projects.length - 1}
                    aria-label={t('تحريك مشروع {name} لأسفل', { name: project.name })}
                    title={t('تحريك لأسفل')}
                    style={{ width: '18px', height: '16px', minWidth: '18px', minHeight: '16px', padding: 0, opacity: index === projects.length - 1 ? 0.25 : 0.75 }}
                  >
                    <ArrowDown size={11} />
                  </button>
                </span>
                <button className={`project-item ${active ? 'project-active' : ''}`} onClick={() => switchView('all', project.id)} aria-current={active ? 'page' : undefined}>
                  <span className="project-icon" style={{ color: goalStyle(project.color).onSoft, backgroundColor: goalStyle(project.color).soft }}><Icon size={14} /></span>
                  <span className="project-item-name" title={project.name}><bdi aria-hidden="true">{truncateWords(project.name)}</bdi><span className="sr-only">{project.name}</span></span>
                  <span className="project-count">{count}</span>
                </button>
                <button className="project-manage" aria-label={t('تعديل {name}', { name: project.name })} title={t('تعديل المشروع')} onClick={() => { setEditingProject(project); setShowProjectAdd(true); }}><Pencil size={14} /></button>
                <button className="project-manage project-remove" aria-label={t('حذف {name}', { name: project.name })} title={t('حذف المشروع')} onClick={() => void deleteProject(project)}><Trash2 size={14} /></button>
              </div>
            );
          })}
        </nav>
        <nav className="main-nav settings-nav" aria-label={t('الإعدادات')}>
          {(() => {
            const item = views.find((option) => option.id === 'settings');
            if (!item) return null;
            const Icon = item.icon;
            const active = view === 'settings' && !selectedProject;
            return <button className={`nav-item ${active ? 'nav-active' : ''}`} onClick={() => switchView('settings')} aria-current={active ? 'page' : undefined}><Icon size={17} strokeWidth={1.8} /><span>{t(item.label)}</span></button>;
          })()}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-quote"><p>{t('خطوة صغيرة كل يوم تصنع طريقاً عظيماً.')}</p><span>{t('استمر، أنت في الطريق الصحيح')}</span></div></div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label={t('إغلاق القائمة')} onClick={() => closeMobileMenu()} />}

      <main id="main-content" tabIndex={-1} className="main-area" aria-hidden={mobileLayout && mobileMenu ? true : undefined} inert={mobileLayout && mobileMenu}>
        <OfflineNotice />
        <header className="topbar">
          <div className="topbar-start">
            <button className="icon-button mobile-menu-button" onClick={(event) => openMobileMenu(event.currentTarget)} aria-label={t('فتح القائمة')} aria-expanded={mobileMenu} aria-controls="app-sidebar"><Menu size={20} /></button>
            <div className="breadcrumbs" title={heading}><b>{heading}</b></div>
          </div>
          <div className="topbar-search">
            <Search size={15} aria-hidden="true" />
            <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('ابحث في المهام…')} aria-label={t('ابحث في المهام')} enterKeyHint="search" />
            {query
              ? <button type="button" className="icon-button" onClick={() => setQuery('')} aria-label={t('مسح البحث')}><X size={13} /></button>
              : <kbd aria-hidden="true">Ctrl+K</kbd>}
          </div>
          <div className="topbar-end">
            <button type="button" className="today-date" onClick={() => setView('calendar')} title={`${gregorianDate} ${t('الموافق')} ${hijriDate}`} aria-label={t('فتح التقويم')}><span>{gregorianDate}</span><span className="today-date-separator" aria-hidden="true"> • </span><span className="today-date-hijri">{hijriDate}</span></button>
            <button className="icon-button shortcut-help-button" onClick={() => setShowShortcuts(true)} aria-label={t('اختصارات لوحة المفاتيح')} title={t('اختصارات لوحة المفاتيح')}><span aria-hidden="true">?</span></button>
            <button className="icon-button language-toggle" onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} aria-label={t('تغيير اللغة')} title={t('تغيير اللغة')}><Languages size={18} /></button>
            <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={darkMode ? t('التبديل إلى المظهر الفاتح') : t('التبديل إلى المظهر الداكن')} aria-pressed={darkMode}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
          </div>
        </header>
        <div className="page-content">
          {view === 'today' && !selectedProject && <TodayDashboard {...{ today, todayTasks, tasks, projects, habits, todayLogs, todayFocusSeconds, completedToday, activeSession, startFocus, finishFocus, setShowFocus, setShowAdd, setFocusTaskId, setView, switchView, mutate, toggleHabit, completeTask, logs, sessions, pomodoroMinutes, userName: auth.user?.name, onOpenTimer: () => setShowFocus(true) }} onSeedDemo={() => void seedDemoData()} seeding={seeding} setShowAdd={(show) => show ? openTaskEditor() : setShowAdd(false)} onEditTask={openTaskEditor} onDeleteTask={deleteTask} />}
          {view === 'journal' && <JournalView entries={journalEntries} total={journalTotal} hasMore={journalNextCursor !== null} search={journalSearch} loading={journalLoading} onSearch={setJournalSearch} onNew={() => { setEditingJournal(null); setShowJournalEditor(true); }} onEdit={(entry) => { setEditingJournal(entry); setShowJournalEditor(true); }} onDelete={(id) => void deleteJournal(id)} onLoadMore={() => void loadJournal(journalNextCursor, true)} />}
          {view !== 'today' && view !== 'journal' && (view === 'stats' ? <StatsView tasks={tasks} sessions={sessions} habits={habits} logs={logs} today={today} /> : view === 'settings' ? <SettingsView darkMode={darkMode} onToggleTheme={toggleTheme} pomodoroMinutes={pomodoroMinutes} onPomodoroChange={setTimerMinutes} mobileViews={mobileViews} mobileViewOptions={mobileViewOptions} onMobileViewsChange={(next) => saveMobileViews(next as View[])} density={density} onDensityChange={changeDensity} onExportData={exportAccountData} onDeleteAccount={deleteAccount} /> : view === 'calendar' ? <CalendarView tasks={tasks} projects={projects} today={today} month={calendarMonth} setMonth={setCalendarMonth} onEdit={openTaskEditor} onAdd={(date) => openTaskEditor(null, date)} /> : view === 'habits' ? <HabitsView habits={habits} logs={logs} today={today} invalidationToken={habitMutationCount} onToggle={toggleHabit} onSetValue={async (habit, value) => { const ok = await mutate(`/api/habits/${habit.id}/log`, 'POST', { date: today, value }); if (ok) setHabitMutationCount((c) => c + 1); }} onEdit={(habit) => { setEditingHabit(habit); setShowHabitAdd(true); }} onDelete={(habit) => void deleteHabit(habit)} onAdd={() => { setEditingHabit(null); setShowHabitAdd(true); }} onReorder={(next) => void reorderHabits(next)} /> : <TaskListView title={heading} tasks={scopedTasks} projects={projects} query={query} project={selectedProject ? projects.find((item) => item.id === selectedProject) : undefined} today={today} onBulkComplete={(ids) => void bulkComplete(ids)} onBulkDelete={(ids) => void bulkDelete(ids)} onBulkMove={(ids, projectId) => void bulkMove(ids, projectId)} onComplete={(id) => void completeTask(id)} onDelete={(id) => void deleteTask(id)} onStart={(id) => { setFocusTaskId(id); void startFocus(id); }} onEdit={openTaskEditor} onAdd={() => openTaskEditor()} onClearSearch={() => setQuery('')} />)}
        </div>
        <footer className="app-footer">
          <span>{t('مصمّم لأيامك، لا لمزيد من الضجيج.')}</span>
          <nav className="app-footer-links" aria-label={t('صفحات قانونية')}>
            <Link href="/privacy">{t('الخصوصية')}</Link>
            <Link href="/terms">{t('الشروط')}</Link>
          </nav>
        </footer>
        {/* Phone-first add affordance: a thumb-reachable button instead of a
            keyboard shortcut hint. Hidden on views that have their own add. */}
        {(view === 'today' || view === 'upcoming' || view === 'inbox' || view === 'all' || selectedProject) && scopedTasks.length > 0 && !activeSession && (
          <button className="fab-add" onClick={() => openTaskEditor()} aria-label={t('أضف مهمة جديدة')}><Plus size={24} /></button>
        )}
        <nav className="mobile-tabs" aria-label={t('التنقل الرئيسي')} style={{ gridTemplateColumns: `repeat(${mobileViews.length + 1}, minmax(0, 1fr))` }}>
          {mobileViews.map((id) => { const item = mobileViewOptions.find((option) => option.id === id); if (!item) return null; const Icon = item.icon; return <button key={id} className={view === id && !selectedProject ? 'mobile-tab-active' : ''} onClick={() => switchView(id)} aria-current={view === id && !selectedProject ? 'page' : undefined}><Icon size={19} /><span>{t(item.label)}</span></button>; })}
          <button className={selectedProject || !mobileViews.includes(view) ? 'mobile-tab-active' : ''} onClick={(event) => openMobileMenu(event.currentTarget)} aria-label={t('المزيد من القوائم')} aria-expanded={mobileMenu} aria-controls="app-sidebar" aria-current={selectedProject || !mobileViews.includes(view) ? 'page' : undefined}><MoreHorizontal size={20} /><span>{t('المزيد')}</span></button>
        </nav>
      </main>

      {confirmDialog}
      {showShortcuts && <ShortcutHelp onClose={() => setShowShortcuts(false)} />}
      {showAdd && <TaskModal key={editingTask?.id ?? 'new'} projects={projects} selectedProject={selectedProject} today={today} initialDueDate={taskInitialDueDate} task={editingTask} onClose={() => { setShowAdd(false); setEditingTask(null); setTaskInitialDueDate(undefined); }} onSubmit={addTask} busy={busy} />}
      {showHabitAdd && <HabitModal key={editingHabit?.id ?? 'new'} habit={editingHabit} onClose={() => { setShowHabitAdd(false); setEditingHabit(null); }} onSubmit={saveHabit} busy={busy} />}
      {showProjectAdd && <ProjectModal key={editingProject?.id ?? 'new'} project={editingProject} onClose={() => { setShowProjectAdd(false); setEditingProject(null); }} onSubmit={addProject} onDelete={(target) => { setShowProjectAdd(false); setEditingProject(null); void deleteProject(target); }} busy={busy} />}
      {showJournalEditor && <JournalEditor key={editingJournal?.id ?? 'new'} entry={editingJournal} today={today} busy={journalSaving} onClose={() => setShowJournalEditor(false)} onSave={saveJournal} />}
      {showFocus && <FocusModal tasks={tasks.filter((t) => t.status !== 'completed')} selectedId={focusTaskId} setSelectedId={setFocusTaskId} mode={focusMode} setMode={setFocusMode} pomodoroMinutes={pomodoroMinutes} setPomodoroMinutes={setTimerMinutes} session={activeSession} busy={busy} onFinish={(completed) => void finishFocus(completed)} onClose={() => setShowFocus(false)} onStart={() => void startFocus()} />}
      {activeSession && !showFocus && <FocusDock session={activeSession} tasks={tasks} busy={busy} onFinish={(completed = true) => void finishFocus(completed)} onStop={() => void finishFocus(false)} onExpand={() => setShowFocus(true)} />}
      {notice && <div className={`toast toast-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'} aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}>{notice.message}<button onClick={() => setNotice(null)} aria-label={t('إغلاق')}><X size={15} /></button></div>}
    </div>
  );
}

export default function Home() {
  return <AuthGate><WinitApp /></AuthGate>;
}
