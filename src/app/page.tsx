'use client';

import {
  Activity, ArrowDownLeft, ArrowLeft, BookOpen, CalendarDays,
  Check, ChevronLeft, ChevronRight, Clock3,
  Code2, Feather, Flag, FolderKanban, Globe2, Grid2X2,
  Inbox, Info, Languages, ListTodo, Menu, Moon, MoreHorizontal, NotebookPen, Pause,
  Pencil, Play, Plus, Search, Settings2, Sparkles, Sun, Target, Timer, Trash2,
  X, Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, formatClock, formatDuration, getHabitStreak, getRemainingSeconds, getTaskQuadrant, getWeekStart, localDateKey, PRIORITY_ORDER } from '@/lib/core';

type Project = { id: string; name: string; color: string; icon: string; description: string | null; targetWeeklyMinutes: number };
type Task = { id: string; title: string; projectId: string | null; priority: 'none' | 'low' | 'medium' | 'high'; status: 'todo' | 'in_progress' | 'completed'; dueDate: string | null; estimatedPomodoros: number; tags: string; notes: string | null; createdAt: string; completedAt: string | null };
type Habit = { id: string; name: string; description: string | null; icon: string; color: string; recordType: 'check' | 'quantity' | 'duration'; targetValue: number; unit: string; reminderTime: string | null };
type Log = { id: string; habitId: string; logDate: string; value: number };
type FocusSession = { id: string; projectId: string | null; taskId: string | null; mode: 'pomodoro' | 'stopwatch'; plannedSeconds: number; actualSeconds: number; startedAt: string; endedAt: string | null; isCompleted: boolean };
type JournalMood = 'grateful' | 'calm' | 'energized' | 'tired' | 'anxious' | 'reflective';
type JournalEntry = { id: string; entryDate: string; title: string | null; content: string; mood: JournalMood | null; createdAt: string; updatedAt: string };
type JournalInput = Pick<JournalEntry, 'entryDate' | 'content'> & Pick<JournalEntry, 'title' | 'mood'>;
type JournalPage = { entries: JournalEntry[]; total: number; offset: number; limit: number };
type View = 'today' | 'upcoming' | 'inbox' | 'all' | 'matrix' | 'calendar' | 'habits' | 'journal';
type Dataset = { projects: Project[]; tasks: Task[]; habits: Habit[]; logs: Log[]; focusSessions: FocusSession[]; today: string };

const views: { id: View; label: string; icon: typeof Inbox }[] = [
  { id: 'today', label: 'اليوم', icon: Sun },
  { id: 'upcoming', label: 'القادم', icon: CalendarDays },
  { id: 'inbox', label: 'صندوق الوارد', icon: Inbox },
  { id: 'all', label: 'كل المهام', icon: ListTodo },
  { id: 'journal', label: 'اليوميات', icon: NotebookPen },
];
const mobileViewOptions: { id: View; label: string; icon: typeof Inbox }[] = [
  { id: 'today', label: 'اليوم', icon: Sun },
  { id: 'upcoming', label: 'القادم', icon: CalendarDays },
  { id: 'inbox', label: 'الوارد', icon: Inbox },
  { id: 'all', label: 'المهام', icon: ListTodo },
  { id: 'matrix', label: 'الأولويات', icon: Grid2X2 },
  { id: 'calendar', label: 'التقويم', icon: CalendarDays },
  { id: 'habits', label: 'العادات', icon: Activity },
  { id: 'journal', label: 'اليوميات', icon: NotebookPen },
];
const defaultMobileViews: View[] = ['today', 'upcoming', 'habits', 'journal'];
const projectIconOptions = ['code', 'languages', 'book-open', 'feather', 'globe', 'folder'];
const projectIcons: Record<string, typeof Code2> = { code: Code2, languages: Languages, 'book-open': BookOpen, feather: Feather, globe: Globe2, folder: FolderKanban };
const priorityLabel = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة', none: '' };
const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const weekdays = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const journalMoods: { id: JournalMood; label: string }[] = [
  { id: 'grateful', label: 'ممتن' }, { id: 'calm', label: 'هادئ' },
  { id: 'energized', label: 'متحمس' }, { id: 'tired', label: 'متعب' },
  { id: 'anxious', label: 'قلق' }, { id: 'reflective', label: 'متأمل' },
];
const safeJson = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.error ?? 'حدث خطأ غير متوقع'); }
  return response.json();
};

function useDialogFocus<T extends HTMLElement>(onEscape?: () => void) {
  const ref = useRef<T>(null);
  const escapeHandler = useRef(onEscape);
  escapeHandler.current = onEscape;
  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
    focusable()[0]?.focus();
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); escapeHandler.current?.(); return; }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) { event.preventDefault(); panel.focus(); return; }
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => { document.removeEventListener('keydown', handleKeydown); document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
  }, []);
  return ref;
}

export default function Home() {
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
  const [showNavSettings, setShowNavSettings] = useState(false);
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
  const [calendarOffset, setCalendarOffset] = useState(0);
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
    try { const now = new Date(); const todayKey = localDateKey(now); const fromKey = localDateKey(addDays(new Date(`${todayKey}T12:00:00`), -20)); setData(await safeJson<Dataset>(await fetch(`/api/overview?date=${encodeURIComponent(todayKey)}&from=${encodeURIComponent(fromKey)}`, { cache: 'no-store' }))); }
    catch (error) { notify(error instanceof Error ? error.message : 'تعذر الاتصال', 'error'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const loadJournal = useCallback(async (offset = 0, append = false) => {
    const requestId = ++journalRequestId.current;
    setJournalLoading(true);
    try {
      const params = new URLSearchParams({ offset: String(offset) });
      if (journalQuery) params.set('q', journalQuery);
      const page = await safeJson<JournalPage>(await fetch(`/api/journal?${params}`, { cache: 'no-store' }));
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
      const validViews: View[] = ['today', 'upcoming', 'inbox', 'all', 'matrix', 'calendar', 'habits', 'journal'];
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
      if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey) || showAdd || showHabitAdd || showProjectAdd || showFocus || showJournalEditor || showNavSettings) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]') || target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault(); setFocusTaskId(''); setShowAdd(true);
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [mobileMenu, showAdd, showHabitAdd, showProjectAdd, showFocus, showJournalEditor, showNavSettings]);
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
      await safeJson(await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }));
      await refresh();
      return true;
    } catch (error) { notify(error instanceof Error ? error.message : 'تعذر حفظ التغييرات', 'error'); return false; }
    finally { setBusy(false); }
  };

  const openTaskEditor = (task: Task | null = null) => { setEditingTask(task); setShowAdd(true); };
  const deleteTask = async (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!window.confirm(`حذف المهمة «${task?.title ?? ''}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    await mutate(`/api/tasks/${taskId}`, 'DELETE');
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
    if (!window.confirm(`حذف مشروع «${project.name}»؟ ستُنقل مهامه إلى صندوق الوارد.`)) return;
    const ok = await mutate(`/api/projects/${project.id}`, 'DELETE');
    if (ok && selectedProject === project.id) switchView('all');
  };
  const deleteHabit = async (habit: Habit) => {
    if (!window.confirm(`حذف عادة «${habit.name}» وسجلّها التاريخي؟`)) return;
    await mutate(`/api/habits/${habit.id}`, 'DELETE');
  };
  const setTimerMinutes = (minutes: number) => {
    setPomodoroMinutes(minutes);
    try { window.localStorage.setItem('winit-pomodoro-minutes', String(minutes)); } catch { /* keep this session's selection */ }
  };
  const saveMobileViews = (nextViews: View[]) => {
    setMobileViews(nextViews);
    try { window.localStorage.setItem('winit-mobile-views', JSON.stringify(nextViews)); } catch { /* keep this session's selection */ }
  };
  const toggleHabit = async (habit: Habit, existing?: Log) => {
    const value = existing ? 0 : (habit.recordType === 'check' ? 1 : habit.targetValue);
    await mutate(`/api/habits/${habit.id}/log`, 'POST', { date: today, value });
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
      const response = await fetch(entryId ? `/api/journal/${entryId}` : '/api/journal', {
        method: entryId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
      });
      await safeJson<JournalEntry>(response);
      setShowJournalEditor(false);
      setEditingJournal(null);
      notify(entryId ? 'حُفظت تعديلاتك' : 'حُفظت التدوينة');
      await loadJournal();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'تعذر حفظ التدوينة', 'error');
    } finally { setJournalSaving(false); }
  };
  const deleteJournal = async (entryId: string) => {
    if (!window.confirm('حذف هذه التدوينة نهائياً؟')) return;
    try {
      await safeJson(await fetch(`/api/journal/${entryId}`, { method: 'DELETE' }));
      setJournalEntries((current) => current.filter((entry) => entry.id !== entryId));
      setJournalTotal((current) => Math.max(0, current - 1));
      notify('حُذفت التدوينة');
    } catch (error) { notify(error instanceof Error ? error.message : 'تعذر حذف التدوينة', 'error'); }
  };

  const heading = selectedProject ? getProject(selectedProject)?.name ?? 'المشروع' : view === 'today' ? 'اليوم' : view === 'upcoming' ? 'القادم' : view === 'inbox' ? 'صندوق الوارد' : view === 'all' ? 'كل المهام' : view === 'matrix' ? 'مصفوفة الأولويات' : view === 'calendar' ? 'التقويم' : view === 'habits' ? 'عاداتي' : view === 'journal' ? 'اليوميات' : 'المشروع';
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
        <div className="brand-row"><div className="brand-mark"><Sparkles size={18} strokeWidth={2.2} /></div><span className="brand-name">winit<span className="brand-dot">.</span></span><button className="icon-button sidebar-close" onClick={() => setMobileMenu(false)} aria-label="إغلاق القائمة"><X size={18} /></button></div>
        <div className="workspace-switch"><span className="workspace-avatar">و</span><span className="workspace-txt"><b>مساحتي الشخصية</b><small>نسخة خاصة بك</small></span></div>
        <div className="nav-label">مساحتي</div>
        <nav className="main-nav" aria-label="التنقل بين الصفحات">
          {views.map((item, index) => {
            const Icon = item.icon; const active = view === item.id && !selectedProject;
            const count = index === 0 ? todayTasks.length : index === 2 ? tasks.filter((t) => t.status !== 'completed' && !t.projectId).length : null;
            return <button key={item.id} className={`nav-item ${active ? 'nav-active' : ''}`} onClick={() => switchView(item.id)}><Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{count ? <i className="nav-count">{count}</i> : null}</button>;
          })}
          <button className={`nav-item ${view === 'matrix' ? 'nav-active' : ''}`} onClick={() => switchView('matrix')}><Grid2X2 size={17} strokeWidth={1.8} /><span>مصفوفة الأولويات</span></button>
          <button className={`nav-item ${view === 'calendar' ? 'nav-active' : ''}`} onClick={() => switchView('calendar')}><CalendarDays size={17} strokeWidth={1.8} /><span>التقويم</span></button>
          <button className={`nav-item ${view === 'habits' ? 'nav-active' : ''}`} onClick={() => switchView('habits')}><Activity size={17} strokeWidth={1.8} /><span>العادات</span></button>
        </nav>
        <div className="project-head"><div className="nav-label">المشاريع</div><button className="tiny-add" aria-label="إضافة مشروع" onClick={() => { setEditingProject(null); setShowProjectAdd(true); }}><Plus size={16} /></button></div>
        <nav className="project-nav">
          {projects.map((project) => { const Icon = projectIcons[project.icon] ?? FolderKanban; const active = selectedProject === project.id; const count = tasks.filter((t) => t.projectId === project.id && t.status !== 'completed').length; return <div key={project.id} className="project-item-row"><button className={`project-item ${active ? 'project-active' : ''}`} onClick={() => switchView('all', project.id)}><span className="project-icon" style={{ color: project.color, backgroundColor: `${project.color}12` }}><Icon size={14} /></span><span className="project-item-name">{project.name}</span><span className="project-count">{count}</span></button><button className="project-manage" aria-label={`تعديل ${project.name}`} title="تعديل المشروع" onClick={() => { setEditingProject(project); setShowProjectAdd(true); }}><Pencil size={14} /></button><button className="project-manage project-remove" aria-label={`حذف ${project.name}`} title="حذف المشروع" onClick={() => void deleteProject(project)}><Trash2 size={14} /></button></div>; })}
        </nav>
        <div className="sidebar-bottom"><button className="nav-customize" onClick={() => { setShowNavSettings(true); setMobileMenu(false); }}><Settings2 size={16} />تخصيص شريط الهاتف</button><div className="sidebar-quote"><p>خطوة صغيرة كل يوم<br />تصنع طريقاً عظيماً.</p><span>استمر، أنت في الطريق الصحيح</span></div><div className="profile-row"><div className="profile-avatar">م</div><div className="profile-info"><b>مساحتي</b><span>مساحة شخصية</span></div></div></div>
      </aside>
      {mobileMenu && <button className="mobile-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileMenu(false)} />}

      <main className="main-area">
        <header className="topbar"><div className="topbar-start"><button className="icon-button mobile-menu-button" onClick={() => setMobileMenu(true)} aria-label="فتح القائمة" aria-expanded={mobileMenu} aria-controls="app-sidebar"><Menu size={20} /></button><div className="breadcrumbs"><span>مساحتي</span><ChevronLeft size={14} /><b>{heading}</b></div></div><div className="topbar-end"><span className="today-date">{new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${today}T12:00:00`))}</span><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={darkMode ? 'التبديل إلى المظهر الفاتح' : 'التبديل إلى المظهر الداكن'} aria-pressed={darkMode}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><div className="top-avatar">م</div></div></header>
        <div className="page-content">
          {view === 'today' && !selectedProject && <TodayDashboard {...{ today, todayTasks, tasks, projects, habits, todayLogs, todayFocusSeconds, completedToday, activeSession, focusTick, startFocus, finishFocus, setShowFocus, setShowAdd, setFocusTaskId, setView, switchView, mutate, toggleHabit, logs, sessions }} setShowAdd={(show) => show ? openTaskEditor() : setShowAdd(false)} onEditTask={openTaskEditor} />}
          {view === 'journal' && <JournalView entries={journalEntries} total={journalTotal} search={journalSearch} loading={journalLoading} onSearch={setJournalSearch} onNew={() => { setEditingJournal(null); setShowJournalEditor(true); }} onEdit={(entry) => { setEditingJournal(entry); setShowJournalEditor(true); }} onDelete={(id) => void deleteJournal(id)} onLoadMore={() => void loadJournal(journalEntries.length, true)} />}
          {view !== 'today' && view !== 'journal' && (view === 'matrix' ? <MatrixView tasks={tasks.filter((t) => t.status !== 'completed')} projects={projects} today={today} onComplete={(id) => void mutate(`/api/tasks/${id}/complete`, 'POST')} onStart={(id) => { setFocusTaskId(id); void startFocus(id); }} onEdit={(task) => openTaskEditor(task)} onAdd={() => openTaskEditor()} /> : view === 'calendar' ? <CalendarView tasks={tasks} today={today} offset={calendarOffset} setOffset={setCalendarOffset} onEdit={openTaskEditor} /> : view === 'habits' ? <HabitsView habits={habits} logs={logs} today={today} onToggle={toggleHabit} onSetValue={(habit, value) => void mutate(`/api/habits/${habit.id}/log`, 'POST', { date: today, value })} onEdit={(habit) => { setEditingHabit(habit); setShowHabitAdd(true); }} onDelete={(habit) => void deleteHabit(habit)} onAdd={() => { setEditingHabit(null); setShowHabitAdd(true); }} /> : <TaskListView title={heading} tasks={filteredTasks} projects={projects} project={selectedProject ? projects.find((item) => item.id === selectedProject) : undefined} today={today} onComplete={(id) => void mutate(`/api/tasks/${id}/complete`, 'POST')} onDelete={(id) => void deleteTask(id)} onStart={(id) => { setFocusTaskId(id); void startFocus(id); }} onEdit={openTaskEditor} onAdd={() => openTaskEditor()} />)}
        </div>
        <footer className="app-footer"><span>مصمّم لأيامك، لا لمزيد من الضجيج.</span><span>أنجز ما يهمّك</span></footer>
        <nav className="mobile-tabs" aria-label="التنقل الرئيسي" style={{ gridTemplateColumns: `repeat(${mobileViews.length + 1}, minmax(0, 1fr))` }}>
          {mobileViews.map((id) => { const item = mobileViewOptions.find((option) => option.id === id); if (!item) return null; const Icon = item.icon; return <button key={id} className={view === id && !selectedProject ? 'mobile-tab-active' : ''} onClick={() => switchView(id)} aria-current={view === id && !selectedProject ? 'page' : undefined}><Icon size={19} /><span>{item.label}</span></button>; })}
          <button className={selectedProject || !mobileViews.includes(view) ? 'mobile-tab-active' : ''} onClick={() => setMobileMenu(true)} aria-label="المزيد من القوائم" aria-expanded={mobileMenu}><MoreHorizontal size={20} /><span>المزيد</span></button>
        </nav>
      </main>

      {showAdd && <TaskModal key={editingTask?.id ?? 'new'} projects={projects} selectedProject={selectedProject} today={today} task={editingTask} onClose={() => { setShowAdd(false); setEditingTask(null); }} onSubmit={addTask} busy={busy} />}
      {showHabitAdd && <HabitModal key={editingHabit?.id ?? 'new'} habit={editingHabit} onClose={() => { setShowHabitAdd(false); setEditingHabit(null); }} onSubmit={saveHabit} busy={busy} />}
      {showProjectAdd && <ProjectModal key={editingProject?.id ?? 'new'} project={editingProject} onClose={() => { setShowProjectAdd(false); setEditingProject(null); }} onSubmit={addProject} busy={busy} />}
      {showNavSettings && <MobileNavSettingsModal selected={mobileViews} onSave={(next) => { saveMobileViews(next); setShowNavSettings(false); }} onClose={() => setShowNavSettings(false)} />}
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
  toggleHabit: (habit: Habit, log?: Log) => Promise<void>; logs: Log[]; sessions: FocusSession[];
  onEditTask: (task: Task) => void;
};

function TodayDashboard(props: DashboardProps) {
  const { today, todayTasks, tasks, projects, habits, todayLogs, todayFocusSeconds, completedToday, activeSession, focusTick, startFocus, setShowFocus, setShowAdd, setFocusTaskId, setView, switchView, mutate, toggleHabit, logs, sessions, onEditTask } = props;
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
      <section className="panel tasks-panel"><div className="panel-heading"><div><h2>مهام اليوم <span className="heading-count">{todayTasks.length}</span></h2></div><button className="text-link" onClick={() => setView('all')}>كل المهام</button></div>
        {sorted.length ? <div className="task-list">{sorted.slice(0, 6).map((task) => <TaskRow key={task.id} task={task} project={currentProject(task.projectId)} onComplete={() => void mutate(`/api/tasks/${task.id}/complete`, 'POST')} onStart={() => { setFocusTaskId(task.id); void startFocus(task.id); }} onEdit={() => onEditTask(task)} />)}</div> : <div className="empty-state"><b>قائمتك هادئة الآن</b><span>لحظة جميلة لتضيف مهمة تخدم أهدافك.</span></div>}
        <button className="add-task-inline" aria-keyshortcuts="Meta+Enter Control+Enter" onClick={() => { setFocusTaskId(''); setShowAdd(true); }}><Plus size={17} /><span>أضف مهمة جديدة</span><kbd>Ctrl / ⌘ ↵</kbd></button>
      </section>
      <section className="panel habits-panel"><div className="panel-heading"><div><h2>عادات اليوم <span className="heading-count">{doneHabits}/{habits.length}</span></h2></div><button className="icon-button soft-button" onClick={() => setView('habits')} aria-label="عرض العادات"><ArrowLeft size={16} /></button></div>
        <div className="habit-list">{todayLogs.map(({ habit, log }) => <HabitRow key={habit.id} habit={habit} log={log} onToggle={() => void toggleHabit(habit, log)} />)}</div>
        <div className="habit-note"><span>لا تبحث عن الكمال، فقط عُد كل يوم.</span></div>
      </section>
    </div>
    <div className="lower-grid"><section className="panel focus-panel"><div className="focus-copy"><span className="focus-label">{activeSession && <span className="live-dot" />} {activeSession ? 'جلسة تركيز جارية' : 'مؤقت التركيز'}</span><h3>{activeSession ? 'أنت في قلب الإنجاز.' : 'امنح هدفك انتباهك.'}</h3><p>{activeSession ? 'اترك المشتتات جانباً، أنت تقوم بعمل رائع.' : 'جلسة واحدة هادئة قد تغيّر شكل يومك.'}</p><button className="primary-button focus-cta-position" disabled={Boolean(activeSession)} onClick={() => { if (!activeSession) setShowFocus(true); }}><Play size={15} fill="currentColor" />{activeSession ? 'جلسة جارية، تابعها من الشريط' : 'ابدأ جلسة تركيز'}</button></div><div className="focus-visual"><div className="timer-halo halo-outer" /><div className="timer-halo halo-inner" /><div className="timer-center"><Timer size={23} /><span>{activeSession ? activeSession.mode === 'stopwatch' ? formatClock(Math.floor((focusTick - new Date(activeSession.startedAt).getTime()) / 1000)) : formatClock(getRemainingSeconds(new Date(activeSession.startedAt).getTime(), activeSession.plannedSeconds, 0, focusTick)) : '25:00'}</span></div><span className="focus-orbit-dot" /></div></section>
      <section className="panel week-panel"><div className="week-heading"><div><h3>التركيز خلال الأسبوع</h3></div><button className="text-link" onClick={() => setView('calendar')}>التقويم</button></div><div className="week-bars">{weekDays.map((day, index) => { const key = localDateKey(day); const count = sessions.filter((s) => localDateKey(new Date(s.startedAt)) === key).reduce((acc, s) => acc + s.actualSeconds, 0); const height = Math.min(48, Math.max(count ? 12 : 5, count / 60 * 1.3)); return <div className={`week-day ${key === today ? 'week-day-current' : ''}`} key={key}><span className="week-bar-track"><i style={{ height: `${height}px` }} /></span><span className="week-day-label">{['ن', 'ث', 'ر', 'خ', 'ج', 'س', 'ح'][index]}</span></div>; })}</div><div className="week-summary"><span>{formatDuration(sessions.filter((s) => localDateKey(new Date(s.startedAt)) >= localDateKey(weekStartDate) && localDateKey(new Date(s.startedAt)) <= today).reduce((acc, s) => acc + s.actualSeconds, 0))} تركيز هذا الأسبوع</span><span>{sessions.filter((s) => s.isCompleted && localDateKey(new Date(s.startedAt)) >= localDateKey(weekStartDate) && localDateKey(new Date(s.startedAt)) <= today).length} جلسات</span></div></section></div>
    <section className="quote-banner"><div><p>«أحب الأعمال إلى الله أدومها وإن قل»</p><span>تذكير لطيف: الثبات أجمل من السرعة.</span></div><button className="journal-quick-link" onClick={() => switchView('journal')}><NotebookPen size={15} />دوّن فكرة</button></section>
  </>;
}

function TaskRow({ task, project, onComplete, onStart, onEdit }: { task: Task; project?: Project; onComplete: () => void; onStart: () => void; onEdit: () => void }) {
  return <div className="task-row"><button className="task-check" onClick={onComplete} aria-label={`إكمال ${task.title}`}><Check size={13} /></button><div className="task-body"><span className="task-title">{task.title}</span><div className="task-meta">{project && <span className="task-project"><i style={{ background: project.color }} />{project.name}</span>}{task.dueDate && <span className="task-time"><Clock3 size={11} />{task.dueDate === localDateKey() ? 'اليوم' : new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('ar', { day: 'numeric', month: 'short' })}</span>}{task.estimatedPomodoros > 1 && <span className="task-pomodoros"><Timer size={11} />{task.estimatedPomodoros}</span>}</div></div><span className={`priority-mark priority-${task.priority}`} aria-hidden="true" />{task.priority !== 'none' && <span className={`task-priority-label task-priority-${task.priority}`}>{priorityLabel[task.priority]}</span>}<button className="task-edit" onClick={onEdit} aria-label={`تعديل ${task.title}`}><Pencil size={14} /></button><button className="task-play" onClick={onStart} aria-label={`التركيز على ${task.title}`}><Play size={13} /></button></div>;
}

function HabitRow({ habit, log, onToggle }: { habit: Habit; log?: Log; onToggle: () => void }) {
  const complete = Boolean(log && log.value >= habit.targetValue);
  const Icon = habit.icon === 'languages' ? Languages : habit.icon === 'activity' ? Activity : habit.icon === 'target' ? Target : BookOpen;
  return <div className={`habit-row ${complete ? 'habit-complete' : ''}`}><span className="habit-icon" style={{ color: habit.color, background: `${habit.color}12` }}><Icon size={16} /></span><div className="habit-copy"><b>{habit.name}</b><span>{complete ? 'أُنجزت اليوم، أحسنت!' : `${habit.targetValue} ${habit.unit}${habit.reminderTime ? `، ${habit.reminderTime}` : ''}`}</span></div><button className={`habit-check ${complete ? 'habit-check-done' : ''}`} style={complete ? { backgroundColor: habit.color, borderColor: habit.color } : undefined} onClick={onToggle} aria-label={complete ? 'إلغاء إنجاز العادة' : 'تسجيل إنجاز العادة'}>{complete && <Check size={14} />}</button></div>;
}

function TaskListView({ title, tasks, projects, project, today, onComplete, onDelete, onStart, onEdit, onAdd }: { title: string; tasks: Task[]; projects: Project[]; project?: Project; today: string; onComplete: (id: string) => void; onDelete: (id: string) => void; onStart: (id: string) => void; onEdit: (task: Task) => void; onAdd: () => void }) {
  const groups = new Map<string, Task[]>();
  for (const task of [...tasks].sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])) {
    const key = task.dueDate && task.dueDate < today ? 'متأخرة' : task.dueDate === today ? 'اليوم' : task.dueDate ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' }) : 'بلا موعد';
    groups.set(key, [...(groups.get(key) ?? []), task]);
  }
  return <section className="list-page"><div className="page-title-row"><div><h1>{title}</h1><p>{project?.description || (tasks.length ? `${tasks.length} مهام تنتظر وقتك` : 'مساحة واضحة لما يستحق انتباهك.')}</p>{project?.targetWeeklyMinutes ? <span className="project-target"><Timer size={13} />هدف التركيز الأسبوعي: {formatDuration(project.targetWeeklyMinutes * 60)}</span> : null}</div><button className="primary-button" onClick={onAdd}><Plus size={17} />مهمة جديدة</button></div>
    {tasks.length ? <div className="task-groups">{[...groups].map(([label, list]) => <section className="task-group" key={label}><div className="group-title"><span>{label}</span><i>{list.length}</i></div>{list.map((task) => { const project = projects.find((p) => p.id === task.projectId); return <div className="expanded-task" key={task.id}><button className="task-check" onClick={() => onComplete(task.id)} aria-label="إكمال"><Check size={13} /></button><div className="expanded-task-copy"><b>{task.title}</b><div className="expanded-meta">{project && <span><i style={{ background: project.color }} />{project.name}</span>}{task.priority !== 'none' && <span className={`priority-text priority-text-${task.priority}`}><Flag size={11} />{priorityLabel[task.priority]}</span>}{task.estimatedPomodoros > 1 && <span><Timer size={11} />{task.estimatedPomodoros} جلسات</span>}</div>{task.notes && <p>{task.notes}</p>}</div><button className="task-edit" onClick={() => onEdit(task)} aria-label={`تعديل ${task.title}`}><Pencil size={14} /></button><button className="task-play visible-play" onClick={() => onStart(task.id)} aria-label="بدء التركيز"><Play size={13} /></button><button className="icon-button delete-task" onClick={() => onDelete(task.id)} aria-label="حذف المهمة"><Trash2 size={15} /></button></div>; })}</section>)}</div> : <div className="empty-page"><h3>لا توجد مهام هنا بعد</h3><p>أضف أول مهمة، وسنساعدك على إبقاء الصورة واضحة.</p><button className="primary-button" onClick={onAdd}><Plus size={16} />أضف مهمة</button></div>}
  </section>;
}

function JournalView({ entries, total, search, loading, onSearch, onNew, onEdit, onDelete, onLoadMore }: {
  entries: JournalEntry[]; total: number; search: string; loading: boolean;
  onSearch: (value: string) => void; onNew: () => void; onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void; onLoadMore: () => void;
}) {
  const dateLabel = (value: string) => new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  const moodLabel = (value: JournalMood | null) => journalMoods.find((mood) => mood.id === value)?.label;
  return <section className="list-page journal-page" aria-labelledby="journal-heading">
    <div className="page-title-row journal-title-row"><div><h1 id="journal-heading">دفتر اليوميات</h1><p>اكتب ما تريد تذكّره، بلا ضغط ولا قالب مفروض.</p></div><button className="primary-button" onClick={onNew}><NotebookPen size={17} />تدوينة جديدة</button></div>
    <div className="journal-prompt"><div><span>سؤال اليوم</span><h2>ما الشيء الذي تود أن تحتفظ به من هذا اليوم؟</h2><p>سطر واحد يكفي. يمكنك العودة إليه متى شئت.</p></div><button className="journal-prompt-action" onClick={onNew}>ابدأ الكتابة <Pencil size={15} /></button></div>
    <aside className="journal-privacy-note" role="note"><Info size={16} /><p>ملاحظة خصوصية: هذه نسخة تجريبية بلا تسجيل دخول. تجنّب تدوين معلومات شديدة الحساسية.</p></aside>
    <div className="journal-toolbar"><span className="journal-count">{total} {total === 1 ? 'تدوينة' : 'تدوينات'}</span><label className="journal-search"><Search size={17} /><input type="search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="ابحث في تدويناتك" aria-label="ابحث في التدوينات" /></label></div>
    {loading && !entries.length ? <div className="journal-loading" role="status" aria-live="polite" aria-label="جارٍ تحميل اليوميات"><div /><div /><div /></div> : entries.length ? <div className="journal-list" aria-busy={loading}>
      {entries.map((entry) => <article className="journal-entry" key={entry.id}><div className="journal-entry-head"><div><time dateTime={entry.entryDate}>{dateLabel(entry.entryDate)}</time><h2>{entry.title || 'تدوينة يومية'}</h2></div>{moodLabel(entry.mood) && <span className={`journal-mood mood-${entry.mood}`}>{moodLabel(entry.mood)}</span>}</div><p className="journal-excerpt">{entry.content}</p><div className="journal-entry-foot"><span>آخر تعديل {new Intl.DateTimeFormat('ar', { hour: 'numeric', minute: '2-digit' }).format(new Date(entry.updatedAt))}</span><div><button className="journal-edit" onClick={() => onEdit(entry)}><Pencil size={14} />تعديل</button><button className="journal-delete" onClick={() => onDelete(entry.id)} aria-label={`حذف تدوينة ${dateLabel(entry.entryDate)}`}><Trash2 size={15} /></button></div></div></article>)}
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
  const requestClose = () => {
    if (busy) return;
    if (dirty && !window.confirm('لديك تغييرات غير محفوظة. هل تريد إغلاق المحرر؟')) return;
    onClose();
  };
  const dialogRef = useDialogFocus<HTMLFormElement>(requestClose);
  return <div className="modal-backdrop journal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}><form ref={dialogRef} className="task-modal journal-editor-modal" role="dialog" aria-modal="true" aria-labelledby="journal-editor-heading" onSubmit={(event) => { event.preventDefault(); if (!content.trim()) return; onSave({ entryDate, title: title.trim() || null, content, mood }, entry?.id); }}><div className="modal-topline"><span className="modal-icon"><NotebookPen size={17} /></span><span id="journal-editor-heading">{entry ? 'تعديل التدوينة' : 'تدوينة جديدة'}</span><button type="button" className="icon-button" onClick={requestClose} aria-label="إغلاق المحرر" disabled={busy}><X size={18} /></button></div><label className="journal-field-label" htmlFor="journal-title">عنوان اختياري</label><input id="journal-title" className="journal-title-input" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="كلمة تلخّص يومك" /><div className="journal-date-field"><label className="journal-field-label" htmlFor="journal-date">تاريخ التدوينة</label><input id="journal-date" type="date" required value={entryDate} onChange={(event) => setEntryDate(event.target.value)} /></div><fieldset className="journal-mood-field"><legend>كيف كان شعورك؟ <span>اختياري</span></legend><div className="journal-mood-options">{journalMoods.map((option) => <button key={option.id} type="button" className={`journal-mood-option ${mood === option.id ? 'mood-selected' : ''}`} aria-pressed={mood === option.id} onClick={() => setMood(mood === option.id ? null : option.id)}>{option.label}</button>)}</div></fieldset><label className="journal-field-label" htmlFor="journal-content">ما الذي تود تدوينه؟</label><textarea id="journal-content" className="journal-content-input" value={content} onChange={(event) => setContent(event.target.value)} maxLength={20000} required placeholder="اكتب بحرية. لا تحتاج إلى صياغة مثالية…" /><div className="journal-editor-foot"><span>{content.length.toLocaleString('ar')} / ٢٠٬٠٠٠ حرف</span><button className="primary-button" type="submit" disabled={busy || !content.trim()}>{busy ? 'جارٍ الحفظ…' : 'حفظ التدوينة'}</button></div></form></div>;
}

function MatrixView({ tasks, projects, today, onComplete, onStart, onEdit, onAdd }: { tasks: Task[]; projects: Project[]; today: string; onComplete: (id: string) => void; onStart: (id: string) => void; onEdit: (task: Task) => void; onAdd: () => void }) {
  const columns = [{ id: 'do', title: 'افعل الآن', sub: 'مهم وعاجل', color: '#bd6961', icon: Zap }, { id: 'schedule', title: 'خطّط له', sub: 'مهم وغير عاجل', color: '#518b7e', icon: CalendarDays }, { id: 'delegate', title: 'فوّضه', sub: 'عاجل وغير مهم', color: '#cd9856', icon: ArrowDownLeft }, { id: 'later', title: 'اتركه لوقت آخر', sub: 'غير عاجل وغير مهم', color: '#81899b', icon: MoreHorizontal }];
  return <section className="list-page matrix-page"><div className="page-title-row"><div><h1>مصفوفة الأولويات</h1><p>رتّب مهامك بحسب ما هو مهم ومستعجل فعلاً.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} />مهمة جديدة</button></div><div className="matrix-grid">{columns.map((column) => { const Icon = column.icon; const items = tasks.filter((task) => getTaskQuadrant(task, today) === column.id); return <section className="matrix-column" key={column.id}><div className="matrix-heading"><span className="matrix-icon" style={{ color: column.color, background: `${column.color}12` }}><Icon size={16} /></span><div><b>{column.title}</b><small>{column.sub}</small></div><i>{items.length}</i></div><div className="matrix-items">{items.length ? items.map((task) => <div className="matrix-task" key={task.id}><button className="task-check" onClick={() => onComplete(task.id)} aria-label="إكمال"><Check size={12} /></button><div><b>{task.title}</b><small>{projects.find((p) => p.id === task.projectId)?.name ?? 'صندوق الوارد'}</small></div><button className="task-edit" onClick={() => onEdit(task)} aria-label={`تعديل ${task.title}`}><Pencil size={13} /></button><button className="matrix-play" onClick={() => onStart(task.id)} aria-label="ابدأ التركيز"><Play size={12} /></button></div>) : <div className="matrix-empty">مساحة خالية، أحسنت.</div>}</div></section>; })}</div></section>;
}

function CalendarView({ tasks, today, offset, setOffset, onEdit }: { tasks: Task[]; today: string; offset: number; setOffset: (n: number) => void; onEdit: (task: Task) => void }) {
  const base = new Date(`${today}T12:00:00`); base.setDate(base.getDate() + offset * 7); const start = getWeekStart(base); const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const weekTasks = tasks.filter((task) => task.dueDate && task.dueDate >= localDateKey(days[0]) && task.dueDate <= localDateKey(days[6]));
  const weekDone = weekTasks.filter((task) => task.status === 'completed').length;
  const dateRange = `${new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' }).format(days[0])} — ${new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long', year: 'numeric' }).format(days[6])}`;
  return <section className="list-page calendar-page" aria-labelledby="calendar-heading">
    <div className="page-title-row calendar-title-row"><div><h1 id="calendar-heading">تقويم الأسبوع</h1><p>{dateRange}</p></div><div className="calendar-controls"><button className="icon-button" onClick={() => setOffset(offset - 1)} aria-label="الأسبوع السابق"><ChevronRight size={18} /></button><button className="today-button" onClick={() => setOffset(0)}>هذا الأسبوع</button><button className="icon-button" onClick={() => setOffset(offset + 1)} aria-label="الأسبوع التالي"><ChevronLeft size={18} /></button></div></div>
    <div className="calendar-summary"><span className="calendar-summary-icon"><CalendarDays size={17} /></span><div><b>{weekTasks.length} مهام مجدولة</b><span>{weekDone} مكتملة هذا الأسبوع</span></div><span className="calendar-summary-progress">{weekTasks.length ? Math.round(weekDone / weekTasks.length * 100) : 0}٪</span></div>
    <div className="calendar-grid" aria-label="أيام الأسبوع">
      {days.map((day, i) => { const key = localDateKey(day); const dayTasks = tasks.filter((task) => task.dueDate === key); const done = dayTasks.filter((task) => task.status === 'completed').length; return <section className={`calendar-day ${key === today ? 'calendar-today' : ''}`} key={key} aria-label={`${weekdays[i]} ${new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' }).format(day)}`}>
        <div className="calendar-day-head"><div><span>{weekdays[i]}</span><b>{new Intl.DateTimeFormat('ar', { day: 'numeric' }).format(day)}</b></div>{key === today ? <span className="calendar-today-badge">اليوم</span> : <span className="calendar-day-count">{dayTasks.length} مهام</span>}</div>
        <div className="calendar-day-content">{dayTasks.length ? dayTasks.map((task) => <button type="button" key={task.id} className={`calendar-task ${task.status === 'completed' ? 'calendar-task-done' : ''}`} onClick={() => onEdit(task)} aria-label={`تعديل مهمة: ${task.title}`}><i className={`priority-mark priority-${task.priority}`} /><span>{task.title}</span>{task.status === 'completed' && <Check size={13} />}</button>) : <div className="calendar-empty"><span className="calendar-empty-mark" />{key === today ? 'ابدأ بخطوة لطيفة' : 'مساحة مفتوحة'}</div>}</div>
        <div className="calendar-day-foot">{done > 0 ? <span><Check size={12} />{done} مكتملة</span> : <span>{dayTasks.length ? 'خطوة بخطوة' : 'اترك وقتاً للراحة'}</span>}</div>
      </section>; })}
    </div>
    <div className="calendar-tip"><Sparkles size={15} /><span>اترك مساحة بين المهام؛ الراحة جزء من الخطة.</span></div>
  </section>;
}

function HabitsView({ habits, logs, today, onToggle, onSetValue, onEdit, onDelete, onAdd }: { habits: Habit[]; logs: Log[]; today: string; onToggle: (habit: Habit, log?: Log) => void; onSetValue: (habit: Habit, value: number) => void; onEdit: (habit: Habit) => void; onDelete: (habit: Habit) => void; onAdd: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const days = Array.from({ length: 21 }, (_, i) => addDays(new Date(`${today}T12:00:00`), i - 20));
  return <section className="list-page habits-page" aria-labelledby="habits-heading">
    <div className="page-title-row"><div><h1 id="habits-heading">مساحة العادات</h1><p>تابع تقدّمك من دون ضغط؛ كل عودة هي بداية جديدة.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} />عادة جديدة</button></div>
    <div className="habit-dashboard-list">{habits.map((habit) => {
      const log = logs.find((item) => item.habitId === habit.id && item.logDate === today);
      const done = Boolean(log && log.value >= habit.targetValue);
      const Icon = habit.icon === 'languages' ? Languages : habit.icon === 'activity' ? Activity : habit.icon === 'target' ? Target : BookOpen;
      const history = days.map((day) => logs.find((item) => item.habitId === habit.id && item.logDate === localDateKey(day)));
      const streak = getHabitStreak(history.map((item) => item?.value), habit.targetValue);
      const progress = habit.recordType === 'check' ? (done ? 100 : 0) : Math.min(100, Math.round((log?.value ?? 0) / habit.targetValue * 100));
      const kind = habit.recordType === 'duration' ? 'مدة يومية' : habit.recordType === 'quantity' ? 'هدف يومي' : 'إنجاز يومي';
      return <article className="habit-card" key={habit.id}>
        <div className="habit-card-top"><span className="habit-icon habit-large-icon" style={{ color: habit.color, background: `${habit.color}18` }}><Icon size={20} /></span><div className="habit-card-title"><span className="habit-type-label">{kind}</span><h2>{habit.name}</h2><p>{habit.description || `${habit.targetValue} ${habit.unit} كل يوم`}</p></div><div className="habit-card-tools"><span className="streak-pill"><Sparkles size={13} />{streak} يوم</span><button className="habit-manage" onClick={() => onEdit(habit)} aria-label={`تعديل عادة ${habit.name}`}><Pencil size={14} /></button><button className="habit-manage habit-remove" onClick={() => onDelete(habit)} aria-label={`حذف عادة ${habit.name}`}><Trash2 size={14} /></button></div></div>
        <div className="habit-progress-copy"><span>{done ? 'اكتمل هدف اليوم' : log ? `${log.value} من ${habit.targetValue} ${habit.unit}` : `هدف اليوم: ${habit.targetValue} ${habit.unit}`}</span><b>{progress}٪</b></div><div className="habit-progress-track" role="progressbar" aria-label={`تقدم ${habit.name} اليوم`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ transform: `scaleX(${progress / 100})`, background: habit.color }} /></div>
        <div className="habit-history-head"><span>آخر 21 يوماً</span><span>ابدأ من جديد متى شئت</span></div><div className="habit-heatmap" dir="ltr">{history.map((item, index) => { const value = item?.value ?? 0; const label = `${localDateKey(days[index])}: ${value ? `${value} ${habit.unit}` : 'لا يوجد تسجيل'}${value >= habit.targetValue ? '، اكتمل الهدف' : value ? '، تقدّم جزئي' : ''}`; return <span key={index} className={`habit-day ${value >= habit.targetValue ? 'heat-complete' : value > 0 ? 'heat-partial' : ''}`} style={value ? { backgroundColor: habit.color, opacity: value >= habit.targetValue ? 1 : 0.48 } : undefined} title={label} aria-label={label} role="img" />; })}</div>
        <div className="habit-card-bottom">{habit.recordType === 'check' ? <span>تسجيل بنقرة واحدة</span> : <div className="habit-log-editor"><label htmlFor={`habit-value-${habit.id}`}>قيمة اليوم</label><input id={`habit-value-${habit.id}`} type="number" min="0" max="10000" step="1" value={values[habit.id] ?? String(log?.value ?? '')} onChange={(event) => setValues({ ...values, [habit.id]: event.target.value })} /><span>{habit.unit}</span><button className="habit-action" onClick={() => onSetValue(habit, Math.max(0, Number(values[habit.id] ?? log?.value ?? 0)))}>{log ? 'تحديث' : 'حفظ'}</button></div>}{habit.recordType === 'check' && <button className={`habit-action ${done ? 'habit-action-done' : ''}`} aria-pressed={done} onClick={() => onToggle(habit, log)}>{done ? <><Check size={14} />تم اليوم</> : <><Plus size={14} />تسجيل اليوم</>}</button>}</div>
        {habit.reminderTime && <div className="habit-reminder"><Clock3 size={13} />تذكير يومي {habit.reminderTime}</div>}
      </article>;
    })}{!habits.length && <div className="empty-page"><h3>ابدأ بعادة واحدة</h3><p>القرآن، الحركة، أو أي شيء تريد الاستمرار عليه.</p><button className="primary-button" onClick={onAdd}><Plus size={16} />أنشئ عادة</button></div>}</div>
  </section>;
}

function TaskModal({ projects, selectedProject, today, task, onClose, onSubmit, busy }: { projects: Project[]; selectedProject: string | null; today: string; task: Task | null; onClose: () => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; busy: boolean }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form ref={dialogRef} className="task-modal" role="dialog" aria-modal="true" aria-labelledby="task-editor-heading" onSubmit={onSubmit}><div className="modal-topline"><span className="modal-icon"><ListTodo size={17} /></span><span id="task-editor-heading">{task ? 'تعديل المهمة' : 'مهمة جديدة'}</span><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div><input className="task-title-input" autoFocus name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ما الذي تود إنجازه؟" maxLength={240} required /><textarea className="task-notes-input" name="notes" defaultValue={task?.notes ?? ''} placeholder="أضف ملاحظة صغيرة تساعدك…" rows={2} /><div className="modal-fields"><label><span>المشروع</span><select name="projectId" defaultValue={task?.projectId ?? selectedProject ?? ''}><option value="">صندوق الوارد</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label><span>الأولوية</span><select name="priority" defaultValue={task?.priority ?? 'none'}><option value="none">بدون أولوية</option><option value="high">عالية</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select></label><label><span>تاريخ الاستحقاق</span><input name="dueDate" type="date" defaultValue={task?.dueDate ?? (selectedProject ? '' : today)} /></label><label><span>جلسات التركيز</span><select name="estimatedPomodoros" defaultValue={String(task?.estimatedPomodoros ?? 1)}>{Array.from({ length: 20 }, (_, index) => index + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'جلسة' : 'جلسات'}</option>)}</select></label><label className="modal-field-full"><span>وسوم، مفصولة بفواصل</span><input name="tags" defaultValue={task?.tags ?? ''} maxLength={300} placeholder="دراسة، مراجعة" /></label>{task && <label><span>الحالة</span><select name="status" defaultValue={task.status}><option value="todo">قيد الانتظار</option><option value="in_progress">قيد التنفيذ</option><option value="completed">مكتملة</option></select></label>}</div><div className="modal-footer"><span><kbd>Esc</kbd> للإغلاق</span><button className="primary-button" type="submit" disabled={busy || !title.trim()}><Plus size={15} />{busy ? 'جارٍ الحفظ…' : task ? 'حفظ التعديلات' : 'أضف إلى يومي'}</button></div></form></div>;
}


function MobileNavSettingsModal({ selected, onSave, onClose }: { selected: View[]; onSave: (next: View[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(selected);
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose);
  const toggle = (id: View, checked: boolean) => setDraft((current) => checked ? [...current, id] : current.filter((value) => value !== id));
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form ref={dialogRef} className="task-modal nav-settings-modal" role="dialog" aria-modal="true" aria-labelledby="nav-settings-heading" onSubmit={(event) => { event.preventDefault(); if (draft.length) onSave(draft); }}>
    <div className="modal-topline"><span className="modal-icon"><Settings2 size={17} /></span><span id="nav-settings-heading">تخصيص الشريط السفلي</span><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
    <p className="modal-helper">اختر حتى أربعة أقسام تظهر بجانب «المزيد». يمكنك تغيير الاختيار متى شئت.</p>
    <fieldset className="nav-choice-grid"><legend>الأقسام</legend>{mobileViewOptions.map((item) => { const Icon = item.icon; const checked = draft.includes(item.id); return <label key={item.id} className={`nav-choice ${checked ? 'nav-choice-active' : ''}`}><input type="checkbox" checked={checked} disabled={!checked && draft.length >= 4} onChange={(event) => toggle(item.id, event.target.checked)} /><Icon size={17} /><span>{item.label}</span><i>{checked ? <Check size={14} /> : null}</i></label>; })}</fieldset>
    <div className="modal-footer"><span>{draft.length} / 4 أقسام</span><button className="primary-button" type="submit" disabled={!draft.length}><Check size={15} />حفظ الاختيار</button></div>
  </form></div>;
}

function ProjectModal({ project, onClose, onSubmit, busy }: { project: Project | null; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; busy: boolean }) {
  const palette = ['#9B315F', '#C17632', '#3F7C71', '#4E69B4', '#8358A5', '#2584A7'];
  const colors = project && !palette.includes(project.color) ? [project.color, ...palette] : palette;
  const iconLabels: Record<string, string> = { code: 'برمجة', languages: 'لغات', 'book-open': 'قراءة', feather: 'كتابة', globe: 'ثقافة', folder: 'عام' };
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form ref={dialogRef} className="task-modal project-modal" role="dialog" aria-modal="true" aria-labelledby="project-editor-heading" onSubmit={onSubmit}>
    <div className="modal-topline"><span className="modal-icon"><FolderKanban size={17} /></span><span id="project-editor-heading">{project ? 'تعديل المشروع' : 'مشروع جديد'}</span><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
    <label className="journal-field-label" htmlFor="project-name">اسم المشروع</label><input id="project-name" className="task-title-input" name="name" autoFocus required maxLength={100} defaultValue={project?.name ?? ''} placeholder="مثلاً: تعلّم البرمجة" />
    <label className="journal-field-label" htmlFor="project-description">وصف قصير، اختياري</label><textarea id="project-description" className="task-notes-input" name="description" maxLength={1000} rows={2} defaultValue={project?.description ?? ''} placeholder="ما الذي تريد إنجازه في هذا المشروع؟" />
    <div className="modal-fields"><label><span>هدف التركيز الأسبوعي بالدقائق</span><input name="targetWeeklyMinutes" type="number" min="0" max="10080" step="15" defaultValue={project?.targetWeeklyMinutes ?? 0} /></label></div>
    <fieldset className="project-icon-field"><legend>أيقونة المشروع</legend><div>{projectIconOptions.map((value) => { const Icon = projectIcons[value]; return <label key={value} className="project-icon-choice"><input type="radio" name="icon" value={value} defaultChecked={value === (project?.icon ?? 'folder')} aria-label={iconLabels[value]} /><span><Icon size={17} /></span></label>; })}</div></fieldset>
    <fieldset className="project-color-field"><legend>لون المشروع</legend><div>{colors.map((value, index) => <label key={value} className="project-color-choice"><input type="radio" name="color" value={value} defaultChecked={value === (project?.color ?? colors[0]) || (!project && index === 0)} aria-label={`لون ${index + 1}`} /><i style={{ backgroundColor: value }} /></label>)}</div></fieldset>
    <div className="modal-footer"><span>يمكنك تعديل المشروع لاحقاً</span><button className="primary-button" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : project ? 'حفظ التعديلات' : 'إنشاء المشروع'}</button></div>
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
  const [icon, setIcon] = useState(habit?.icon ?? 'target');
  const dialogRef = useDialogFocus<HTMLFormElement>(onClose);
  const palette = ['#138A78', '#D4894D', '#6D78D8', '#CC6D78', '#2584A7'];
  const colors = habit && !palette.includes(habit.color) ? [habit.color, ...palette] : palette;
  const iconOptions = [{ id: 'book-open', label: 'قراءة', Icon: BookOpen }, { id: 'activity', label: 'حركة', Icon: Activity }, { id: 'languages', label: 'لغة', Icon: Languages }, { id: 'target', label: 'هدف', Icon: Target }];
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form ref={dialogRef} className="task-modal habit-modal" role="dialog" aria-modal="true" aria-label={habit ? 'تعديل العادة' : 'إضافة عادة جديدة'} onSubmit={(event) => { event.preventDefault(); void onSubmit({ name: name.trim(), description: description.trim() || null, recordType: type, targetValue: Number(target), unit, reminderTime: reminderTime || null, color, icon }); }}>
    <div className="modal-topline"><span className="modal-icon modal-icon-habit"><Target size={17} /></span><span>{habit ? 'تعديل العادة' : 'عادة جديدة'}</span><button type="button" className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div>
    <label className="journal-field-label" htmlFor="habit-name">اسم العادة</label><input id="habit-name" className="task-title-input" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="ما العادة التي تريد بناءها؟" required maxLength={100} />
    <label className="journal-field-label" htmlFor="habit-description">وصف، اختياري</label><textarea id="habit-description" className="task-notes-input" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="أضف تذكيراً لطيفاً لنفسك" />
    <div className="modal-fields"><label><span>طريقة التتبع</span><select value={type} onChange={(event) => { const value = event.target.value as Habit['recordType']; setType(value); setUnit(value === 'duration' ? 'دقيقة' : value === 'quantity' ? 'صفحات' : 'مرة'); }}><option value="check">إنجاز بسيط</option><option value="quantity">عدد / كمية</option><option value="duration">مدة زمنية</option></select></label>{type !== 'check' && <><label><span>الهدف اليومي</span><input type="number" min="1" max="10000" value={target} onChange={(event) => setTarget(event.target.value)} /></label><label><span>الوحدة</span><input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={30} /></label></>}<label><span>تذكير اختياري</span><input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} /></label></div>
    <fieldset className="project-icon-field"><legend>أيقونة العادة</legend><div>{iconOptions.map(({ id, label, Icon }) => <label key={id} className="project-icon-choice"><input type="radio" name="habitIcon" checked={icon === id} onChange={() => setIcon(id)} aria-label={label} /><span><Icon size={17} /></span></label>)}</div></fieldset>
    <fieldset className="project-color-field"><legend>لون العادة</legend><div>{colors.map((value, index) => <label key={value} className="project-color-choice"><input type="radio" name="habitColor" checked={color === value} onChange={() => setColor(value)} aria-label={`لون ${index + 1}`} /><i style={{ backgroundColor: value }} /></label>)}</div></fieldset>
    <div className="modal-footer"><span>يمكنك تعديلها لاحقاً</span><button className="primary-button" type="submit" disabled={busy || !name.trim() || (type !== 'check' && Number(target) < 1)}><Plus size={15} />{busy ? 'جارٍ الحفظ…' : habit ? 'حفظ التعديلات' : 'أنشئ العادة'}</button></div>
  </form></div>;
}

function FocusModal({ tasks, selectedId, setSelectedId, mode, setMode, pomodoroMinutes, setPomodoroMinutes, onClose, onStart }: { tasks: Task[]; selectedId: string; setSelectedId: (id: string) => void; mode: 'pomodoro' | 'stopwatch'; setMode: (mode: 'pomodoro' | 'stopwatch') => void; pomodoroMinutes: number; setPomodoroMinutes: (minutes: number) => void; onClose: () => void; onStart: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialogRef} className="focus-modal" role="dialog" aria-modal="true" aria-label="جلسة تركيز هادئة"><div className="modal-topline"><span className="modal-icon modal-icon-focus"><Timer size={17} /></span><span>جلسة تركيز هادئة</span><button className="icon-button" onClick={onClose} aria-label="إغلاق"><X size={18} /></button></div><div className="focus-modal-timer"><div className="modal-timer-ring"><span>{mode === 'pomodoro' ? `${String(pomodoroMinutes).padStart(2, '0')}:00` : '∞'}</span><small>{mode === 'pomodoro' ? `${pomodoroMinutes} دقيقة تركيز` : 'مؤقت مفتوح'}</small></div></div><div className="focus-mode-switch"><button type="button" className={mode === 'pomodoro' ? 'mode-active' : ''} aria-pressed={mode === 'pomodoro'} onClick={() => setMode('pomodoro')}><Timer size={14} />بومودورو، 25 دقيقة</button><button type="button" className={mode === 'stopwatch' ? 'mode-active' : ''} aria-pressed={mode === 'stopwatch'} onClick={() => setMode('stopwatch')}><Clock3 size={14} />مؤقت مفتوح</button></div>{mode === 'pomodoro' && <label className="focus-task-select focus-duration-select"><span>مدة التركيز</span><select value={pomodoroMinutes} onChange={(event) => setPomodoroMinutes(Number(event.target.value))}>{[10, 15, 20, 25, 30, 45, 60, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} دقيقة</option>)}</select></label>}<label className="focus-task-select"><span>على ماذا ستركز؟ <small>اختياري</small></span><select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">اختر مهمة أو اتركها فارغة</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select></label><button className="primary-button focus-start-wide" onClick={onStart}><Play size={16} fill="currentColor" />ابدأ التركيز</button><div className="focus-modal-note"><Sparkles size={13} />أغلق ما يشتت انتباهك. هذه اللحظة لك.</div></div></div>;
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
