'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '../locale';
import type { FocusSession } from '@/lib/types';
import type { Log, Habit, Project, Task } from '@/lib/types';
import type { View } from '../types';
import { ArrowLeft, Check, NotebookPen, Play, Plus, Timer } from '../icons';
import { CountBadge, SessionCount } from './atoms';
import { TaskRow } from './TaskRow';
import { HabitRow } from './HabitRow';
import { LiveTimer } from './LiveTimer';
import {
  addDays,
  formatClock,
  formatDuration,
  getWeekStart,
  localDateKey,
  PRIORITY_ORDER,
} from '@/lib/core';

export type DashboardProps = {
  today: string;
  todayTasks: Task[];
  tasks: Task[];
  projects: Project[];
  habits: Habit[];
  todayLogs: { habit: Habit; log: Log | undefined }[];
  todayFocusSeconds: number;
  completedToday: number;
  activeSession?: FocusSession;
  pomodoroMinutes: number;
  userName?: string;
  startFocus: (id?: string) => Promise<void>;
  finishFocus: (completed: boolean) => Promise<void>;
  setShowFocus: (show: boolean) => void;
  onOpenTimer: () => void;
  setShowAdd: (show: boolean) => void;
  setFocusTaskId: (id: string) => void;
  setView: (view: View) => void;
  switchView: (view: View, projectId?: string | null) => void;
  mutate: (url: string, method: string, body?: unknown) => Promise<boolean>;
  toggleHabit: (habit: Habit, log?: Log) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  logs: Log[];
  sessions: FocusSession[];
  onEditTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onSeedDemo?: () => void;
  seeding?: boolean;
};

/** Greeting follows the clock so the first thing on screen is never a lie. */
function greetingFor(hour: number): string {
  // i18n-exempt: returned into t() at the call site.
  if (hour >= 5 && hour < 12) return 'صباح الخير، لنصنع يوماً جميلاً.';
  if (hour >= 12 && hour < 17) return 'طاب يومك، لنصنع يوماً جميلاً.'; // i18n-exempt
  if (hour >= 17 && hour < 22) return 'مساء الخير، لنصنع يوماً جميلاً.'; // i18n-exempt
  return 'ليلة هادئة، لنصنع يوماً جميلاً.'; // i18n-exempt
}

export function TodayDashboard(props: DashboardProps) {
  const {
    today,
    todayTasks,
    projects,
    habits,
    todayLogs,
    todayFocusSeconds,
    completedToday,
    activeSession,
    pomodoroMinutes,
    userName,
    setShowFocus,
    onOpenTimer,
    setShowAdd,
    setFocusTaskId,
    setView,
    switchView,
    toggleHabit,
    completeTask,
    startFocus,
    sessions,
    onEditTask,
    onDeleteTask,
    onSeedDemo,
    seeding,
    tasks,
  } = props;

  const { t } = useLocale();
  // Rendered at hydration time; the server-rendered greeting is the Arabic
  // morning one, so the first paint is stable and the correction is invisible.
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => { setHour(new Date().getHours()); }, []);

  const sorted = [...todayTasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const doneHabits = todayLogs.filter(({ habit, log }) => log && log.value >= habit.targetValue).length;
  const weekStartDate = getWeekStart(new Date(`${today}T12:00:00`));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const currentProject = (id: string | null) => projects.find((project) => project.id === id);
  const plannedMinutes = Math.round(pomodoroMinutes);
  const weekSeconds = sessions
    .filter(
      (s) =>
        localDateKey(new Date(s.startedAt)) >= localDateKey(weekStartDate) &&
        localDateKey(new Date(s.startedAt)) <= today
    )
    .reduce((acc, s) => acc + s.actualSeconds, 0);

  return (
    <>
      <section className="welcome-row">
        <div>
          {userName && <span className="welcome-name">{t('أهلاً')} <bdi>{userName}</bdi></span>}
          <h1>{t(hour === null ? 'صباح الخير، لنصنع يوماً جميلاً.' : greetingFor(hour))}</h1>
          <p>{t('رتّب أفكارك، خذ نفساً عميقاً، وابدأ بما يهمّ حقاً.')}</p>
        </div>
      </section>

      {/* One quiet line instead of three cards: the numbers are context, not the point. */}
      <div className="stat-line" aria-label={t('ملخص اليوم')}>
        <span><b>{completedToday}</b> {t('من')} <b>{completedToday + todayTasks.length}</b> {t('مهام')}</span>
        <i className="stat-line-dot" aria-hidden="true" />
        <span><b>{formatDuration(todayFocusSeconds)}</b> {t('تركيز')}</span>
        <i className="stat-line-dot" aria-hidden="true" />
        <span><b>{doneHabits}</b> {t('من')} <b>{habits.length}</b> {t('عادات')}</span>
      </div>

      <div className="dashboard-grid">
        <section className="panel tasks-panel tasks-hero" aria-labelledby="today-tasks-heading">
          <div className="panel-heading">
            <div>
              <h2 id="today-tasks-heading">
                {t('مهام اليوم')} <CountBadge count={todayTasks.length} />
              </h2>
              {sorted.length > 0 && (
                <p className="hero-next">
                  {t('التالي:')} <bdi>{sorted[0].title}</bdi>
                </p>
              )}
            </div>
            <div className="panel-heading-actions">
              <button className="text-link" onClick={() => setView('all')}>
                {t('كل المهام')}
              </button>
              <button
                className="icon-button soft-button add-task-compact"
                onClick={() => {
                  setFocusTaskId('');
                  setShowAdd(true);
                }}
                aria-label={t('أضف مهمة جديدة')}
                title={t('أضف مهمة جديدة')}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          {sorted.length ? (
            <div className="task-list">
              {sorted.slice(0, 6).map((task, index) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={currentProject(task.projectId)}
                  today={today}
                  featured={index === 0}
                  onComplete={() => void completeTask(task.id)}
                  onStart={() => {
                    setFocusTaskId(task.id);
                    void startFocus(task.id);
                  }}
                  onEdit={() => onEditTask(task)}
                  onDelete={onDeleteTask ? () => onDeleteTask(task.id) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <b>{t('قائمتك هادئة الآن')}</b>
              <span>{t('لحظة جميلة لتضيف مهمة تخدم أهدافك.')}</span>
              <button className="btn btn-primary primary-button" onClick={() => setShowAdd(true)}>
                <Plus size={16} />
                {t('أضف مهمة')}
              </button>
              {!tasks.length && onSeedDemo && (
                <button type="button" className="text-link" onClick={onSeedDemo} disabled={seeding}>
                  {seeding ? t('نضيف البيانات…') : t('أو ابدأ بثلاث مهام تجريبية')}
                </button>
              )}
            </div>
          )}
        </section>

        <section className="panel habits-panel" aria-labelledby="today-habits-heading">
          <div className="panel-heading">
            <div>
              <h2 id="today-habits-heading">
                {t('عادات اليوم')} <span className="heading-count">{doneHabits}/{habits.length}</span>
              </h2>
            </div>
            <button className="icon-button soft-button" onClick={() => setView('habits')} aria-label={t('عرض العادات')} title={t('عرض العادات')}>
              <ArrowLeft size={16} />
            </button>
          </div>
          <div className="habit-list">
            {todayLogs.map(({ habit, log }) => (
              <HabitRow key={habit.id} habit={habit} log={log} onToggle={() => void toggleHabit(habit, log)} />
            ))}
            {!todayLogs.length && (
              <div className="empty-state">
                <b>{t('ابدأ بعادة واحدة')}</b>
                <span>{t('عادة صغيرة تتكرر أفضل من خطة كبيرة تنتظر.')}</span>
                <button type="button" className="ghost-button" onClick={() => setView('habits')}>{t('أضف عادة')}</button>
              </div>
            )}
          </div>
          <div className="habit-note">
            <span>{t('لا تبحث عن الكمال، فقط عُد كل يوم.')}</span>
          </div>
        </section>
      </div>

      <div className="lower-grid">
        <section className="panel focus-panel focus-mini">
          <div className="focus-copy">
            <span className="focus-label">
              {activeSession && <span className="live-dot" />} {t(activeSession ? 'جلسة تركيز جارية' : 'مؤقت التركيز')}
            </span>
            <h3>{t(activeSession ? 'أنت في قلب الإنجاز.' : 'امنح هدفك انتباهك.')}</h3>
            <p>{t(activeSession ? 'اترك المشتتات جانباً، أنت تقوم بعمل رائع.' : 'جلسة واحدة هادئة قد تغيّر شكل يومك.')}</p>
            <button
              className="btn btn-primary primary-button focus-cta-position"
              onClick={() => (activeSession ? onOpenTimer() : setShowFocus(true))}
            >
              <Play size={15} fill="currentColor" />
              {t(activeSession ? 'افتح المؤقت' : 'ابدأ جلسة تركيز')}
            </button>
          </div>
          <div className="focus-mini-clock">
            <Timer size={18} />
            {activeSession ? (
              <LiveTimer session={activeSession} />
            ) : (
              <span className="focus-mini-value">{formatClock(plannedMinutes * 60)}</span>
            )}
            <small>{t('مدة الجلسة')} · {plannedMinutes} {t('دقيقة')}</small>
          </div>
        </section>

        <section className="panel week-panel">
          <div className="week-heading">
            <div>
              <h3>{t('التركيز خلال الأسبوع')}</h3>
            </div>
            <button className="text-link" onClick={() => setView('calendar')}>
              {t('التقويم')}
            </button>
          </div>
          <div className="week-bars">
            {weekDays.map((day, index) => {
              const key = localDateKey(day);
              const count = sessions
                .filter((s) => localDateKey(new Date(s.startedAt)) === key)
                .reduce((acc, s) => acc + s.actualSeconds, 0);
              const height = Math.min(48, Math.max(count ? 12 : 5, (count / 60) * 1.3));
              return (
                <div className={`week-day ${key === today ? 'week-day-current' : ''}`} key={key}>
                  <span className="week-bar-track" aria-hidden="true">
                    <i style={{ height: `${height}px` }} />
                  </span>
                  <span className="week-day-label">{[t('س'), t('ح'), t('ن'), t('ث'), t('ر'), t('خ'), t('ج')][index]}</span>
                  <span className="visually-hidden">
                    {new Intl.DateTimeFormat('ar', { weekday: 'long' }).format(day)}: {formatDuration(count)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="week-summary">
            <span>
              {formatDuration(weekSeconds)} {t('تركيز هذا الأسبوع')}
            </span>
            <SessionCount
              count={sessions.filter((s) => s.isCompleted && localDateKey(new Date(s.startedAt)) >= localDateKey(weekStartDate) && localDateKey(new Date(s.startedAt)) <= today).length}
              size={13}
            />
          </div>
        </section>
      </div>

      <div className="journal-strip">
        <span className="journal-strip-copy">
          <Check size={14} aria-hidden="true" />
          {t('تذكير لطيف: الثبات أجمل من السرعة.')}
        </span>
        <button className="journal-quick-link" onClick={() => switchView('journal')}>
          <NotebookPen size={15} />
          {t('دوّن فكرة')}
        </button>
      </div>
    </>
  );
}

export default TodayDashboard;
