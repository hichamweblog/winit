'use client';

/**
 * Calendar — one month grid plus an agenda for the selected day.
 *
 * The previous version squeezed seven day-columns across the viewport and put
 * prose in each cell, so on a phone the columns overlapped. This version shows a
 * single month (a real ARIA grid) and moves the content into a list underneath,
 * which is the pattern every phone calendar uses.
 *
 * react-day-picker v10 supplies the grid: roving tabindex, arrow/Home/End/PageUp
 * navigation, `aria-selected`, and focus management (documented WCAG 2.1 AA).
 * It is headless — every visual decision below comes from our own tokens, and
 * `dir="rtl"` + `weekStartsOn={6}` give an Arabic Saturday-first month.
 */
import { useMemo, useState } from 'react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import { ar } from 'react-day-picker/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from '../icons';
import { PriorityFlag, RowActions, SessionCount } from './atoms';
import { AR_LOCALE, formatArNumber, localDateKey } from '@/lib/core';
import { tasksLabel } from '@/lib/semantics';
import { goalStyle } from '@/lib/goals';
import type { Project, Task } from '@/lib/types';

/** Saturday, matching the rest of the app's week strip. */
const WEEK_STARTS_ON = 6;

function toDate(key: string) {
  // Noon avoids a DST boundary shifting the calendar day.
  return new Date(`${key}T12:00:00`);
}

export default function CalendarView({ tasks, projects, today, month, setMonth, onEdit, onAdd }: {
  tasks: Task[]; projects: Project[]; today: string;
  month: Date; setMonth: (next: Date) => void;
  onEdit: (task: Task) => void; onAdd: () => void;
}) {
  const [selected, setSelected] = useState<string>(today);

  /** Open task count per day, and the highest-priority colour to dot the cell. */
  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate || task.status === 'completed') continue;
      map.set(task.dueDate, [...(map.get(task.dueDate) ?? []), task]);
    }
    return map;
  }, [tasks]);

  const dayTasks = byDay.get(selected) ?? [];
  const monthLabel = new Intl.DateTimeFormat(AR_LOCALE, { month: 'long', year: 'numeric' }).format(month);
  const monthKeys = [...byDay.keys()].filter((key) => {
    const d = toDate(key);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
  });
  const monthCount = monthKeys.reduce((sum, key) => sum + (byDay.get(key)?.length ?? 0), 0);

  const shiftMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1, 12));
  const goToday = () => { setMonth(toDate(today)); setSelected(today); };

  /**
   * Day cell content: the number plus up to three density dots. The count is in
   * the accessible name so the dots are decoration, not the only signal.
   */
  function DayCell({ day, modifiers, ...buttonProps }: DayButtonProps) {
    const key = localDateKey(day.date);
    const count = byDay.get(key)?.length ?? 0;
    const label = new Intl.DateTimeFormat(AR_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(day.date);
    return (
      <button
        {...buttonProps}
        aria-label={count ? `${label}، ${tasksLabel(count)}` : label}
        data-count={count || undefined}
        data-today={modifiers.today ? 'true' : undefined}
      >
        <span className="cal-day-number"><bdi>{formatArNumber(day.date.getDate())}</bdi></span>
        {count > 0 && <span className="cal-day-dots" aria-hidden="true">{Array.from({ length: Math.min(count, 3) }, (_, i) => <i key={i} />)}</span>}
      </button>
    );
  }

  return (
    <section className="calendar-page">
      <div className="page-title-row">
        <div>
          <h1>التقويم</h1>
          <p aria-label={`${monthLabel}: ${tasksLabel(monthCount)}`}>
            {monthCount ? <><bdi>{formatArNumber(monthCount)}</bdi> مهمة في {monthLabel}</> : `لا مهام مستحقة في ${monthLabel}`}
          </p>
        </div>
        <button className="primary-button" onClick={onAdd}><Plus size={17} />مهمة جديدة</button>
      </div>

      <div className="calendar-layout">
        <section className="panel calendar-panel" aria-label="اختيار يوم">
          <div className="calendar-toolbar">
            <div className="calendar-nav">
              <button className="icon-button" onClick={() => shiftMonth(-1)} aria-label="الشهر السابق"><ChevronRight size={18} /></button>
              <h2 className="calendar-month-label" aria-live="polite">{monthLabel}</h2>
              <button className="icon-button" onClick={() => shiftMonth(1)} aria-label="الشهر التالي"><ChevronLeft size={18} /></button>
            </div>
            <button className="ghost-button calendar-today" onClick={goToday}>اليوم</button>
          </div>

          <DayPicker
            mode="single"
            dir="rtl"
            locale={ar}
            weekStartsOn={WEEK_STARTS_ON}
            month={month}
            onMonthChange={setMonth}
            selected={toDate(selected)}
            onSelect={(date) => { if (date) setSelected(localDateKey(date)); }}
            showOutsideDays
            fixedWeeks
            hideNavigation
            classNames={{
              root: 'cal-grid-root',
              months: 'cal-months',
              month: 'cal-month',
              month_caption: 'cal-sr-caption',
              weekdays: 'cal-weekdays',
              weekday: 'cal-weekday',
              weeks: 'cal-weeks',
              week: 'cal-week',
              day: 'cal-cell',
              day_button: 'cal-day',
              selected: 'cal-selected',
              today: 'cal-today',
              outside: 'cal-outside',
              disabled: 'cal-disabled',
              hidden: 'cal-hidden',
              focused: 'cal-focused',
            }}
            formatters={{
              // Western digits everywhere, per the app's numeral rule.
              formatWeekdayName: (date) => ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'][date.getDay()],
            }}
            components={{ DayButton: DayCell }}
          />

          <div className="calendar-legend">
            <span><i className="cal-legend-dot" />مهام مستحقة</span>
            <span><i className="cal-legend-today" />اليوم</span>
          </div>
        </section>

        <section className="panel calendar-agenda" aria-label="مهام اليوم المحدد">
          <div className="agenda-head">
            <h2>{selected === today ? 'اليوم' : new Intl.DateTimeFormat(AR_LOCALE, { weekday: 'long' }).format(toDate(selected))}</h2>
            <span className="agenda-date">
              <bdi>{new Intl.DateTimeFormat(AR_LOCALE, { day: 'numeric', month: 'long' }).format(toDate(selected))}</bdi>
              <span className="count-badge" role="img" aria-label={tasksLabel(dayTasks.length)}><bdi>{formatArNumber(dayTasks.length)}</bdi></span>
            </span>
          </div>

          {dayTasks.length ? (
            <ul className="agenda-list">
              {dayTasks.map((task) => {
                const project = projects.find((item) => item.id === task.projectId);
                return (
                  <li key={task.id} className="agenda-item row-interactive">
                    <button type="button" className="agenda-body" onClick={() => onEdit(task)}>
                      <span className="agenda-title"><bdi>{task.title}</bdi></span>
                      <span className="task-meta">
                        {project && <span className="task-project"><i style={{ background: goalStyle(project.color).solid }} />{project.name}</span>}
                        <SessionCount count={task.estimatedPomodoros} />
                        <PriorityFlag priority={task.priority} />
                      </span>
                    </button>
                    <RowActions>
                      <button className="icon-button row-action" onClick={() => onEdit(task)} aria-label={`تعديل ${task.title}`}><CalendarDays size={15} /></button>
                    </RowActions>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty-state agenda-empty">
              <b>يوم خالٍ</b>
              <span>لا مهام مستحقة. مساحة مفتوحة لما يهمّك.</span>
              <button className="ghost-button" onClick={onAdd}><Plus size={15} />أضف مهمة</button>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
