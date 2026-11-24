'use client';

/**
 * Small shared UI atoms.
 *
 * Two rules run through all of them:
 *  1. Meaning is an icon + a colour. The Arabic word lives in `aria-label`, not
 *     on screen, so rows stay narrow enough for a phone.
 *  2. Destructive/secondary row actions are hidden until hover or focus, and
 *     always visible on touch (see `.row-actions` in globals.css).
 */
import type { ReactNode } from 'react';
import { Clock3, Flag, Stopwatch } from '../icons';
import { prioritySemantics, sessionsLabel, tasksLabel } from '@/lib/semantics';
import { AR_LOCALE, formatArNumber } from '@/lib/core';
import { useLocale } from '../locale';

/** Coloured flag. Renders nothing for `none` so unprioritised rows stay clean. */
export function PriorityFlag({ priority, size = 14 }: { priority: string; size?: number }) {
  const { t } = useLocale();
  const semantics = prioritySemantics(priority);
  if (semantics.id === 'none') return null;
  return (
    <span className="priority-flag" style={{ color: semantics.color }} role="img" aria-label={t(semantics.label)} title={t(semantics.label)}>
      <Flag size={size} fill={semantics.id === 'high' ? 'currentColor' : 'none'} />
    </span>
  );
}

/** Session count as icon + number, never the word "جلسات". */
export function SessionCount({ count, size = 12 }: { count: number; size?: number }) {
  const { language } = useLocale();
  if (!count || count < 1) return null;
  const label = language === 'en' ? `${count} focus session${count === 1 ? '' : 's'}` : sessionsLabel(count);
  return (
    <span className="meta-chip" role="img" aria-label={label} title={label}>
      <Stopwatch size={size} />
      <bdi>{formatArNumber(count)}</bdi>
    </span>
  );
}

/** Task count as icon-free number with an accessible name. */
export function CountBadge({ count, kind = 'tasks' }: { count: number; kind?: 'tasks' }) {
  const { language } = useLocale();
  const label = kind === 'tasks' ? language === 'en' ? `${count} task${count === 1 ? '' : 's'}` : tasksLabel(count) : String(count);
  return <span className="count-badge" role="img" aria-label={label} title={label}><bdi>{formatArNumber(count)}</bdi></span>;
}

/** Due date, shortened; "today" stays a word because it is the useful signal. */
export function DueChip({ date, today }: { date: string; today: string }) {
  const { language, t } = useLocale();
  const locale = language === 'en' ? 'en-GB' : AR_LOCALE;
  const isToday = date === today;
  const overdue = date < today;
  const text = isToday
    ? t('اليوم')
    : new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
  const longDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));
  const label = isToday
    ? t('مستحقة اليوم')
    : overdue
      ? t('مستحقة في {date}، متأخرة', { date: longDate })
      : t('مستحقة في {date}', { date: longDate });
  return (
    <span className="meta-chip" data-overdue={overdue && !isToday ? 'true' : undefined} role="img" aria-label={label} title={label}>
      <Clock3 size={12} />
      <bdi>{text}</bdi>
    </span>
  );
}

/**
 * Row action cluster. Hidden at rest, revealed on row hover/focus-within, and
 * always shown under `pointer: coarse`. Children stay in the tab order.
 */
export function RowActions({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`row-actions ${className}`.trim()}>{children}</span>;
}
