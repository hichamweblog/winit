'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusSession, Task } from '@/lib/types';
import { Check, Pause } from '../icons';
import { formatClock, getRemainingSeconds } from '@/lib/core';

export type FocusDockProps = {
  session: FocusSession;
  tasks: Task[];
  busy: boolean;
  onFinish: (completed?: boolean) => void;
  onStop: () => void;
};

export function FocusDock({ session, tasks, busy, onFinish, onStop }: FocusDockProps) {
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
        تركيز
      </span>
      <span className="dock-title">{task?.title ?? 'جلسة تركيز مستقلة'}</span>
      <b className="dock-timer">{display}</b>
      <button className="dock-stop" onClick={onStop} disabled={busy} title="إنهاء الجلسة" aria-label="إنهاء جلسة التركيز">
        <Pause size={14} fill="currentColor" />
        <span>إنهاء</span>
      </button>
      <button
        className="dock-done"
        onClick={() => onFinish(true)}
        disabled={busy}
        title="إكمال الجلسة"
        aria-label="إكمال جلسة التركيز"
      >
        <Check size={15} />
      </button>
    </div>
  );
}

export default FocusDock;
