'use client';

/**
 * Live countdown for an active focus session.
 *
 * Owns its own one-second interval so a running timer re-renders this span
 * instead of the whole dashboard. `role="timer"` marks it as a time display
 * without making screen readers announce every tick (`aria-live="off"`); start
 * and end are announced once, by the toast/report path.
 */
import { useEffect, useState } from 'react';
import { formatClock, getRemainingSeconds } from '@/lib/core';
import type { FocusSession } from '@/lib/types';
import { useLocale } from '../locale';

export function LiveTimer({ session, className }: { session: FocusSession; className?: string }) {
  const { t } = useLocale();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [session.id, session.startedAt]);

  const startedAt = new Date(session.startedAt).getTime();
  const seconds = session.mode === 'stopwatch'
    ? Math.floor((now - startedAt) / 1000)
    : getRemainingSeconds(startedAt, session.plannedSeconds, 0, now);

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={`${t('متبقي من جلسة التركيز')} ${formatClock(seconds)}`}
      className={className}
    >
      {formatClock(seconds)}
    </span>
  );
}

export default LiveTimer;
