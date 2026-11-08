'use client';

/**
 * Statistics section.
 *
 * Charts are plain CSS bars over semantic tokens — no chart library, so nothing
 * fights the design system or the dark theme. Every bar is a `<div>` inside a
 * labelled figure with a text equivalent, so the chart is readable without
 * sight and the numbers are never colour-only.
 */
import { useMemo, useState } from 'react';
import { Check, Flame, Stopwatch, Target, TrendingUp, Trophy } from '../icons';
import { PriorityFlag } from './atoms';
import { habitIconFor } from '../habit-icons';
import { AR_LOCALE, addDays, formatArNumber, formatDuration, getWeekStart, localDateKey } from '@/lib/core';
import { goalStyle } from '@/lib/goals';
import { PRIORITIES } from '@/lib/semantics';
import {
  completionByPriority, dailyBuckets, habitStandings, longestActiveStreak, summarise, weeklyFocus,
} from '@/lib/stats';
import type { FocusSession, Habit, Log, Task } from '@/lib/types';

type Range = 7 | 30 | 90;
const RANGES: { id: Range; label: string }[] = [
  { id: 7, label: '7 أيام' },
  { id: 30, label: '30 يومًا' },
  { id: 90, label: '90 يومًا' },
];

const shortDate = (key: string) =>
  new Intl.DateTimeFormat(AR_LOCALE, { day: 'numeric', month: 'short' }).format(new Date(`${key}T12:00:00`));

function Kpi({ icon, value, label, hint }: { icon: React.ReactNode; value: string; label: string; hint?: string }) {
  return (
    <div className="stat-card kpi-card">
      <span className="kpi-icon" aria-hidden="true">{icon}</span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value"><bdi>{value}</bdi></strong>
      {hint && <span className="kpi-hint">{hint}</span>}
    </div>
  );
}

export default function StatsView({ tasks, sessions, habits, logs, today }: {
  tasks: Task[]; sessions: FocusSession[]; habits: Habit[]; logs: Log[]; today: string;
}) {
  const [range, setRange] = useState<Range>(30);
  const from = localDateKey(addDays(new Date(`${today}T12:00:00`), -(range - 1)));

  const summary = useMemo(() => summarise(tasks, sessions, habits, logs, from, today), [tasks, sessions, habits, logs, from, today]);
  const buckets = useMemo(() => dailyBuckets(tasks, sessions, from, today), [tasks, sessions, from, today]);
  const weeks = useMemo(() => weeklyFocus(sessions, today, 8), [sessions, today]);
  const priorities = useMemo(() => completionByPriority(tasks, from, today), [tasks, from, today]);
  const standings = useMemo(() => habitStandings(habits, logs, today, from), [habits, logs, today, from]);
  const streak = useMemo(() => longestActiveStreak(buckets), [buckets]);

  const weekStart = localDateKey(getWeekStart(new Date(`${today}T12:00:00`)));
  const thisWeek = buckets.filter((bucket) => bucket.date >= weekStart);
  const maxDay = Math.max(1, ...buckets.map((bucket) => bucket.seconds));
  const maxWeek = Math.max(1, ...weeks.map((week) => week.seconds));
  const priorityTotal = Object.values(priorities).reduce((sum, value) => sum + value, 0);
  const empty = summary.focusSeconds === 0 && summary.completedTasks === 0 && summary.sessionCount === 0;

  return (
    <section className="stats-page">
      <div className="page-title-row">
        <div>
          <h1>إحصائيات</h1>
          <p>من {shortDate(from)} إلى {shortDate(today)}</p>
        </div>
        <div className="segmented-control" role="group" aria-label="النطاق الزمني">
          {RANGES.map((option) => (
            <button
              key={option.id}
              className={range === option.id ? 'segment-active' : ''}
              aria-pressed={range === option.id}
              onClick={() => setRange(option.id)}
            >{option.label}</button>
          ))}
        </div>
      </div>

      <section className="stats-grid" aria-label="ملخص الفترة">
        <Kpi icon={<Stopwatch size={18} />} value={formatDuration(summary.focusSeconds)} label="وقت التركيز" hint={`${formatArNumber(summary.sessionCount)} جلسة مكتملة`} />
        <Kpi icon={<Check size={18} />} value={formatArNumber(summary.completedTasks)} label="مهام أُنجزت" hint={`${formatArNumber(Math.round(summary.completionRate * 100))}٪ من مهام الفترة`} />
        <Kpi icon={<Target size={18} />} value={`${formatArNumber(Math.round(summary.habitConsistency * 100))}٪`} label="ثبات العادات" hint={`${formatArNumber(habits.length)} عادة متابَعة`} />
        <Kpi icon={<Flame size={18} />} value={formatArNumber(streak)} label="أطول سلسلة أيام" hint={`${formatArNumber(summary.activeDays)} يوم نشط`} />
      </section>

      {empty ? (
        <div className="empty-page">
          <h3>لا بيانات في هذه الفترة بعد</h3>
          <p>أنجز مهمة أو ابدأ جلسة تركيز، وستظهر أرقامك هنا.</p>
        </div>
      ) : (
        <>
          <div className="stats-two-col">
            <figure className="panel chart-panel">
              <figcaption>
                <h2><TrendingUp size={16} />التركيز اليومي</h2>
                <span className="chart-caption">أعلى يوم: {summary.bestDay ? `${shortDate(summary.bestDay.date)} · ${formatDuration(summary.bestDay.seconds)}` : '—'}</span>
              </figcaption>
              <div className="bar-chart" role="img" aria-label={`التركيز اليومي خلال ${range} يومًا. المجموع ${formatDuration(summary.focusSeconds)}. أعلى يوم ${summary.bestDay ? `${shortDate(summary.bestDay.date)} بمقدار ${formatDuration(summary.bestDay.seconds)}` : 'لا يوجد'}.`}>
                {buckets.map((bucket) => (
                  <span className="bar-slot" key={bucket.date} title={`${shortDate(bucket.date)}: ${formatDuration(bucket.seconds)}`}>
                    <i
                      className="bar-fill"
                      data-current={bucket.date === today ? 'true' : undefined}
                      style={{ height: `${Math.max(bucket.seconds ? 6 : 2, Math.round((bucket.seconds / maxDay) * 100))}%` }}
                    />
                  </span>
                ))}
              </div>
              <div className="chart-axis"><span>{shortDate(from)}</span><span>{shortDate(today)}</span></div>
            </figure>

            <figure className="panel chart-panel">
              <figcaption>
                <h2><Stopwatch size={16} />آخر 8 أسابيع</h2>
                <span className="chart-caption">هذا الأسبوع: {formatDuration(thisWeek.reduce((sum, bucket) => sum + bucket.seconds, 0))}</span>
              </figcaption>
              <div className="bar-chart bar-chart-weeks" role="img" aria-label={`التركيز الأسبوعي: ${weeks.map((week, index) => `${index === weeks.length - 1 ? 'هذا الأسبوع' : `أسبوع ${shortDate(week.start)}`} ${formatDuration(week.seconds)}`).join('، ')}.`}>
                {weeks.map((week, index) => (
                  <span className="bar-slot" key={week.start} title={`${shortDate(week.start)}: ${formatDuration(week.seconds)}`}>
                    <i
                      className="bar-fill"
                      data-current={index === weeks.length - 1 ? 'true' : undefined}
                      style={{ height: `${Math.max(week.seconds ? 6 : 2, Math.round((week.seconds / maxWeek) * 100))}%` }}
                    />
                  </span>
                ))}
              </div>
              <div className="chart-axis"><span>{shortDate(weeks[0].start)}</span><span>الآن</span></div>
            </figure>
          </div>

          <div className="stats-two-col">
            <section className="panel chart-panel" aria-labelledby="priority-breakdown">
              <h2 id="priority-breakdown">المهام المنجزة حسب الأولوية</h2>
              {priorityTotal ? (
                <ul className="priority-breakdown">
                  {(['high', 'medium', 'low', 'none'] as const).map((id) => {
                    const count = priorities[id];
                    const percent = Math.round((count / priorityTotal) * 100);
                    return (
                      <li key={id}>
                        <span className="breakdown-key">
                          {id === 'none'
                            ? <span className="breakdown-none" role="img" aria-label={PRIORITIES.none.label}>—</span>
                            : <PriorityFlag priority={id} size={15} />}
                        </span>
                        <span className="breakdown-track" role="img" aria-label={`${PRIORITIES[id].label}: ${formatArNumber(count)} مهمة، ${formatArNumber(percent)}٪`}>
                          <i style={{ inlineSize: `${percent}%`, background: PRIORITIES[id].color }} />
                        </span>
                        <bdi className="breakdown-value">{formatArNumber(count)}</bdi>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="panel-empty">لا مهام منجزة في هذه الفترة.</p>}
            </section>

            <section className="panel chart-panel" aria-labelledby="habit-standings">
              <h2 id="habit-standings"><Trophy size={16} />ثبات العادات</h2>
              {standings.length ? (
                <ul className="habit-standings">
                  {standings.map(({ habit, rate, streak: habitStreak, loggedDays }) => {
                    const Icon = habitIconFor(habit.icon);
                    const style = goalStyle(habit.color);
                    return (
                      <li key={habit.id}>
                        <span className="standing-icon" style={{ color: style.onSoft, background: style.soft }} aria-hidden="true"><Icon size={15} /></span>
                        <span className="standing-copy">
                          <b><bdi>{habit.name}</bdi></b>
                          <span className="standing-track" role="img" aria-label={`${habit.name}: ${formatArNumber(Math.round(rate * 100))}٪، ${formatArNumber(loggedDays)} يوم مسجّل`}>
                            <i style={{ inlineSize: `${Math.round(rate * 100)}%`, background: style.solid }} />
                          </span>
                        </span>
                        <span className="standing-streak" role="img" aria-label={`سلسلة حالية ${formatArNumber(habitStreak)} يوم`} title={`سلسلة حالية: ${habitStreak}`}>
                          <Flame size={13} /><bdi>{formatArNumber(habitStreak)}</bdi>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="panel-empty">أضف عادة لتتابع ثباتها هنا.</p>}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
