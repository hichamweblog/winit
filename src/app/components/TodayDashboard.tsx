'use client';

import type { FocusSession, Habit, Log, Project, Task } from '@/lib/types';
import type { View } from '../types';
import { ArrowLeft, NotebookPen, Play, Plus, Timer } from '../icons';
import { CountBadge, SessionCount } from './atoms';
import { TaskRow } from './TaskRow';
import { HabitRow } from './HabitRow';
import {
  addDays,
  formatClock,
  formatDuration,
  getRemainingSeconds,
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
  startFocus: (id?: string) => Promise<void>;
  finishFocus: (completed: boolean) => Promise<void>;
  setShowFocus: (show: boolean) => void;
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
};

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
    startFocus,
    setShowFocus,
    setShowAdd,
    setFocusTaskId,
    setView,
    switchView,
    toggleHabit,
    completeTask,
    sessions,
    onEditTask,
    onDeleteTask,
  } = props;

  const sorted = [...todayTasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const doneHabits = todayLogs.filter(({ habit, log }) => log && log.value >= habit.targetValue).length;
  const weekStartDate = getWeekStart(new Date(`${today}T12:00:00`));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));
  const currentProject = (id: string | null) => projects.find((project) => project.id === id);

  return (
    <>
      <section className="welcome-row">
        <div>
          <h1>صباح الخير، لنصنع يوماً جميلاً.</h1>
          <p>رتّب أفكارك، خذ نفساً عميقاً، وابدأ بما يهمّ حقاً.</p>
        </div>
      </section>

      <section className="stats-grid" aria-label="ملخص اليوم">
        <div className="stat-card">
          <span className="stat-label">المهام المكتملة</span>
          <strong className="stat-value">
            {completedToday}
            <small> من {completedToday + todayTasks.length}</small>
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">وقت التركيز</span>
          <strong className="stat-value">
            {formatDuration(todayFocusSeconds)}
            <small> اليوم</small>
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">العادات المكتملة</span>
          <strong className="stat-value">
            {doneHabits}
            <small> من {habits.length}</small>
          </strong>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel tasks-panel">
          <div className="panel-heading">
            <div>
              <h2>
                مهام اليوم <CountBadge count={todayTasks.length} />
              </h2>
            </div>
            <div className="panel-heading-actions">
              <button className="text-link" onClick={() => setView('all')}>
                كل المهام
              </button>
              <button
                className="icon-button soft-button add-task-compact"
                onClick={() => {
                  setFocusTaskId('');
                  setShowAdd(true);
                }}
                aria-label="أضف مهمة جديدة"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          {sorted.length ? (
            <div className="task-list">
              {sorted.slice(0, 6).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  project={currentProject(task.projectId)}
                  today={today}
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
              <b>قائمتك هادئة الآن</b>
              <span>لحظة جميلة لتضيف مهمة تخدم أهدافك.</span>
            </div>
          )}
        </section>

        <section className="panel habits-panel">
          <div className="panel-heading">
            <div>
              <h2>
                عادات اليوم <span className="heading-count">{doneHabits}/{habits.length}</span>
              </h2>
            </div>
            <button className="icon-button soft-button" onClick={() => setView('habits')} aria-label="عرض العادات">
              <ArrowLeft size={16} />
            </button>
          </div>
          <div className="habit-list">
            {todayLogs.map(({ habit, log }) => (
              <HabitRow key={habit.id} habit={habit} log={log} onToggle={() => void toggleHabit(habit, log)} />
            ))}
          </div>
          <div className="habit-note">
            <span>لا تبحث عن الكمال، فقط عُد كل يوم.</span>
          </div>
        </section>
      </div>

      <div className="lower-grid">
        <section className="panel focus-panel">
          <div className="focus-copy">
            <span className="focus-label">
              {activeSession && <span className="live-dot" />} {activeSession ? 'جلسة تركيز جارية' : 'مؤقت التركيز'}
            </span>
            <h3>{activeSession ? 'أنت في قلب الإنجاز.' : 'امنح هدفك انتباهك.'}</h3>
            <p>
              {activeSession
                ? 'اترك المشتتات جانباً، أنت تقوم بعمل رائع.'
                : 'جلسة واحدة هادئة قد تغيّر شكل يومك.'}
            </p>
            <button
              className="primary-button focus-cta-position"
              disabled={Boolean(activeSession)}
              onClick={() => {
                if (!activeSession) setShowFocus(true);
              }}
            >
              <Play size={15} fill="currentColor" />
              {activeSession ? 'جلسة جارية، تابعها من الشريط' : 'ابدأ جلسة تركيز'}
            </button>
          </div>
          <div className="focus-visual">
            <div className="timer-halo halo-outer" />
            <div className="timer-halo halo-inner" />
            <div className="timer-center">
              <Timer size={23} />
              <span>
                {activeSession
                  ? activeSession.mode === 'stopwatch'
                    ? formatClock(
                        Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000)
                      )
                    : formatClock(
                        getRemainingSeconds(
                          new Date(activeSession.startedAt).getTime(),
                          activeSession.plannedSeconds
                        )
                      )
                  : '25:00'}
              </span>
            </div>
            <span className="focus-orbit-dot" />
          </div>
        </section>

        <section className="panel week-panel">
          <div className="week-heading">
            <div>
              <h3>التركيز خلال الأسبوع</h3>
            </div>
            <button className="text-link" onClick={() => setView('calendar')}>
              التقويم
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
                  <span className="week-bar-track">
                    <i style={{ height: `${height}px` }} />
                  </span>
                  <span className="week-day-label">{['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'][index]}</span>
                </div>
              );
            })}
          </div>
          <div className="week-summary">
            <span>
              {formatDuration(
                sessions
                  .filter(
                    (s) =>
                      localDateKey(new Date(s.startedAt)) >= localDateKey(weekStartDate) &&
                      localDateKey(new Date(s.startedAt)) <= today
                  )
                  .reduce((acc, s) => acc + s.actualSeconds, 0)
              )}{' '}
              تركيز هذا الأسبوع
            </span>
            <SessionCount
              count={
                sessions.filter(
                  (s) =>
                    s.isCompleted &&
                    localDateKey(new Date(s.startedAt)) >= localDateKey(weekStartDate) &&
                    localDateKey(new Date(s.startedAt)) <= today
                ).length
              }
              size={13}
            />
          </div>
        </section>
      </div>

      <section className="quote-banner">
        <div>
          <p>«أحب الأعمال إلى الله أدومها وإن قل»</p>
          <span>تذكير لطيف: الثبات أجمل من السرعة.</span>
        </div>
        <button className="journal-quick-link" onClick={() => switchView('journal')}>
          <NotebookPen size={15} />
          دوّن فكرة
        </button>
      </section>
    </>
  );
}

export default TodayDashboard;
