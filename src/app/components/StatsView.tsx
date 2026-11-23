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
import { useLocale } from '../locale';
import { Check, Flame, Stopwatch, Target, TrendingUp, Trophy } from '../icons';
import { PriorityFlag } from './atoms';
import { habitIconFor } from '../habit-icons';
import { AR_LOCALE, addDays, formatDuration, getWeekStart, localDateKey } from '@/lib/core';
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

const shortDate = (key: string, language: 'ar' | 'en') =>
  new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : AR_LOCALE, { day: 'numeric', month: 'short' }).format(new Date(`${key}T12:00:00`));

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
  const { language, t } = useLocale();
  const formatNumber = (value: number) => new Intl.NumberFormat(language === 'en' ? 'en' : AR_LOCALE).format(value);
  const formatStatDuration = (seconds: number) => {
    if (language === 'ar') return formatDuration(seconds);
    const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  };
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
  const empty = summary.focusSeconds === 0 && summary.completedTasks === 0 && summary.sessionCount === 0 && summary.habitConsistency === 0;

  return (
    <section className="stats-page">
      <div className="page-title-row">
        <div>
          <h1>{t('إحصائيات')}</h1>
          <p>{language === 'en' ? `${shortDate(from, language)} to ${shortDate(today, language)}` : `من ${shortDate(from, language)} إلى ${shortDate(today, language)}`}</p>
        </div>
        <div className="segmented-control" role="group" aria-label={t('النطاق الزمني')}>
          {RANGES.map((option) => (
            <button
              key={option.id}
              className={range === option.id ? 'segment-active' : ''}
              aria-pressed={range === option.id}
              onClick={() => setRange(option.id)}
            >{language === 'en' ? `${option.id} days` : option.label}</button>
          ))}
        </div>
      </div>

      <section className="stats-grid" aria-label={t('ملخص الفترة')}>
        <Kpi icon={<Stopwatch size={18} />} value={formatStatDuration(summary.focusSeconds)} label={t('وقت التركيز')} hint={language === 'en' ? `${summary.sessionCount} completed sessions` : `${formatNumber(summary.sessionCount)} جلسة مكتملة`} />
        <Kpi icon={<Check size={18} />} value={formatNumber(summary.completedTasks)} label={t('مهام أُنجزت')} hint={language === 'en' ? `${Math.round(summary.completionRate * 100)}% of tasks in range` : `${formatNumber(Math.round(summary.completionRate * 100))}٪ من مهام الفترة`} />
        <Kpi icon={<Target size={18} />} value={`${formatNumber(Math.round(summary.habitConsistency * 100))}${language === 'en' ? '%' : '٪'}`} label={t('ثبات العادات')} hint={language === 'en' ? `${habits.length} habits tracked` : `${formatNumber(habits.length)} عادة متابَعة`} />
        <Kpi icon={<Flame size={18} />} value={formatNumber(streak)} label={t('أطول سلسلة أيام')} hint={language === 'en' ? `${summary.activeDays} active days` : `${formatNumber(summary.activeDays)} يوم نشط`} />
      </section>

      {empty ? (
        <div className="empty-page">
          <h3>{t('لا بيانات في هذه الفترة بعد')}</h3>
          <p>{t('أنجز مهمة أو ابدأ جلسة تركيز، وستظهر أرقامك هنا.')}</p>
        </div>
      ) : (
        <>
          <div className="stats-two-col">
            <figure className="panel chart-panel">
              <figcaption>
                <h2><TrendingUp size={16} />{t('التركيز اليومي')}</h2>
                <span className="chart-caption">{t('أعلى يوم:')} {summary.bestDay ? `${shortDate(summary.bestDay.date, language)} · ${formatStatDuration(summary.bestDay.seconds)}` : '—'}</span>
              </figcaption>
              <div className="bar-chart" role="img" aria-label={language === 'en' ? `Daily focus over ${range} days. Total ${formatStatDuration(summary.focusSeconds)}. Best day ${summary.bestDay ? `${shortDate(summary.bestDay.date, language)} at ${formatStatDuration(summary.bestDay.seconds)}` : 'none'}.` : `التركيز اليومي خلال ${range} يومًا. المجموع ${formatStatDuration(summary.focusSeconds)}. أعلى يوم ${summary.bestDay ? `${shortDate(summary.bestDay.date, language)} بمقدار ${formatStatDuration(summary.bestDay.seconds)}` : 'لا يوجد'}.`}>
                {buckets.map((bucket) => (
                  <span className="bar-slot" key={bucket.date} title={`${shortDate(bucket.date, language)}: ${formatStatDuration(bucket.seconds)}`}>
                    <i
                      className="bar-fill"
                      data-current={bucket.date === today ? 'true' : undefined}
                      style={{ height: `${Math.max(bucket.seconds ? 6 : 2, Math.round((bucket.seconds / maxDay) * 100))}%` }}
                    />
                  </span>
                ))}
              </div>
              <div className="chart-axis"><span>{shortDate(from, language)}</span><span>{shortDate(today, language)}</span></div>
            </figure>

            <figure className="panel chart-panel">
              <figcaption>
                <h2><Stopwatch size={16} />{t('آخر 8 أسابيع')}</h2>
                <span className="chart-caption">{t('هذا الأسبوع:')} {formatStatDuration(thisWeek.reduce((sum, bucket) => sum + bucket.seconds, 0))}</span>
              </figcaption>
              <div className="bar-chart bar-chart-weeks" role="img" aria-label={language === 'en' ? `Weekly focus: ${weeks.map((week, index) => `${index === weeks.length - 1 ? 'This week' : `Week of ${shortDate(week.start, language)}`} ${formatStatDuration(week.seconds)}`).join(', ')}.` : `التركيز الأسبوعي: ${weeks.map((week, index) => `${index === weeks.length - 1 ? 'هذا الأسبوع' : `أسبوع ${shortDate(week.start, language)}`} ${formatStatDuration(week.seconds)}`).join('، ')}.`}>
                {weeks.map((week, index) => (
                  <span className="bar-slot" key={week.start} title={`${shortDate(week.start, language)}: ${formatStatDuration(week.seconds)}`}>
                    <i
                      className="bar-fill"
                      data-current={index === weeks.length - 1 ? 'true' : undefined}
                      style={{ height: `${Math.max(week.seconds ? 6 : 2, Math.round((week.seconds / maxWeek) * 100))}%` }}
                    />
                  </span>
                ))}
              </div>
              <div className="chart-axis"><span>{shortDate(weeks[0].start, language)}</span><span>{t('الآن')}</span></div>
            </figure>
          </div>

          <div className="stats-two-col">
            <section className="panel chart-panel" aria-labelledby="priority-breakdown">
              <h2 id="priority-breakdown">{t('المهام المنجزة حسب الأولوية')}</h2>
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
                        <span className="breakdown-track" role="img" aria-label={language === 'en' ? `${t(PRIORITIES[id].label)}: ${count} tasks, ${percent}%` : `${PRIORITIES[id].label}: ${formatNumber(count)} مهمة، ${formatNumber(percent)}٪`}>
                          <i style={{ inlineSize: `${percent}%`, background: PRIORITIES[id].color }} />
                        </span>
                        <bdi className="breakdown-value">{formatNumber(count)}</bdi>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="panel-empty">{t('لا مهام منجزة في هذه الفترة.')}</p>}
            </section>

            <section className="panel chart-panel" aria-labelledby="habit-standings">
              <h2 id="habit-standings"><Trophy size={16} />{t('ثبات العادات')}</h2>
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
                          <span className="standing-track" role="img" aria-label={language === 'en' ? `${habit.name}: ${Math.round(rate * 100)}% consistency, ${loggedDays} logged days` : `${habit.name}: ${formatNumber(Math.round(rate * 100))}٪، ${formatNumber(loggedDays)} يوم مسجّل`}>
                            <i style={{ inlineSize: `${Math.round(rate * 100)}%`, background: style.solid }} />
                          </span>
                        </span>
                        <span className="standing-streak" role="img" aria-label={language === 'en' ? `Current streak: ${habitStreak} days` : `سلسلة حالية ${formatNumber(habitStreak)} يوم`} title={language === 'en' ? `Current streak: ${habitStreak}` : `سلسلة حالية: ${habitStreak}`}>
                          <Flame size={13} /><bdi>{formatNumber(habitStreak)}</bdi>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="panel-empty">{t('أضف عادة لتتابع ثباتها هنا.')}</p>}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
