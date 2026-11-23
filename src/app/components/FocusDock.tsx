'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusSession, Task } from '@/lib/types';
import { Check, ChevronUp, Pause } from '../icons';
import { formatClock, getRemainingSeconds } from '@/lib/core';
import { useLocale } from '../locale';

export type FocusDockProps = {
  session: FocusSession;
  tasks: Task[];
  busy: boolean;
  onFinish: (completed?: boolean) => void;
  onStop: () => void;
  onExpand: () => void;
};

export function FocusDock({ session, tasks, busy, onFinish, onStop, onExpand }: FocusDockProps) {
  const { t } = useLocale();
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    setTick(Date.now());
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session.id]);

  const elapsed = Math.max(0, Math.floor((tick - new Date(session.startedAt).getTime()) / 1000));
  const remaining = getRemainingSeconds(new Date(session.startedAt).getTime(), session.plannedSeconds, 0, tick);
  const task = tasks.find((item) => item.id === session.taskId);
  const display = session.mode === 'stopwatch' ? formatClock(elapsed) : formatClock(remaining);

  const finishRef = useRef(onFinish);
  const autoFinishedSession = useRef<string | null>(null);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (session.mode === 'pomodoro' && remaining === 0 && autoFinishedSession.current !== session.id) {
      autoFinishedSession.current = session.id;
      finishRef.current(true);
    }
  }, [remaining, session.mode, session.id]);

  return (
    <div className="focus-dock">
      <span className="dock-live">
        <i />
        {t('تركيز')}
      </span>
      <span className="dock-title">{task?.title ?? t('جلسة تركيز مستقلة')}</span>
      <b className="dock-timer">{display}</b>
      <button type="button" className="dock-expand" onClick={onExpand} title={t('تكبير المؤقت')} aria-label={t('تكبير المؤقت')}>
        <ChevronUp size={16} />
      </button>
      <button className="dock-stop" onClick={onStop} disabled={busy} title={t('إنهاء الجلسة')} aria-label={t('إنهاء جلسة التركيز')}>
        <Pause size={14} fill="currentColor" />
        <span>{t('إنهاء')}</span>
      </button>
      <button
        className="dock-done"
        onClick={() => onFinish(true)}
        disabled={busy}
        title={t('إكمال الجلسة')}
        aria-label={t('إكمال جلسة التركيز')}
      >
        <Check size={15} />
      </button>
    </div>
  );
}

export default FocusDock;
