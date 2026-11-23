'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusSession, Task } from '@/lib/types';
import { Check, ChevronDown, Clock3, Pause, Play, Sparkles, Timer, X } from '../icons';
import { formatArNumber, formatClock, getRemainingSeconds } from '@/lib/core';
import useDialogFocus from './useDialogFocus';
import { useLocale } from '../locale';

export type FocusModalProps = {
  tasks: Task[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  mode: 'pomodoro' | 'stopwatch';
  setMode: (mode: 'pomodoro' | 'stopwatch') => void;
  pomodoroMinutes: number;
  setPomodoroMinutes: (minutes: number) => void;
  onClose: () => void;
  onStart: () => void;
  session?: FocusSession;
  busy?: boolean;
  onFinish?: (completed: boolean) => void;
};

export function FocusModal({
  tasks,
  selectedId,
  setSelectedId,
  mode,
  setMode,
  pomodoroMinutes,
  setPomodoroMinutes,
  onClose,
  onStart,
  session,
  busy = false,
  onFinish,
}: FocusModalProps) {
  const { t } = useLocale();
  const [now, setNow] = useState(Date.now());
  const finishedSession = useRef<string | null>(null);
  const finishRef = useRef(onFinish);
  useEffect(() => { finishRef.current = onFinish; }, [onFinish]);
  useEffect(() => {
    if (!session) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.id]);
  const remainingSeconds = session ? getRemainingSeconds(new Date(session.startedAt).getTime(), session.plannedSeconds, 0, now) : 0;
  useEffect(() => {
    if (session?.mode === 'pomodoro' && remainingSeconds === 0 && finishedSession.current !== session.id) {
      finishedSession.current = session.id;
      finishRef.current?.(true);
    }
  }, [session?.id, session?.mode, remainingSeconds]);
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className={`focus-modal ${session ? 'focus-modal-live' : ''}`} role="dialog" aria-modal="true" aria-label={t(session ? 'جلسة تركيز جارية' : 'جلسة تركيز هادئة')}>
        {session ? (
          <>
            <div className="modal-topline">
              <span className="modal-icon modal-icon-focus"><Timer size={17} /></span>
              <span>{t('جلسة تركيز جارية')}</span>
              <button type="button" className="icon-button" onClick={onClose} aria-label={t('تصغير المؤقت')} title={t('تصغير المؤقت')}><ChevronDown size={18} /></button>
            </div>
            <div className="focus-live-content">
              <span className="focus-live-state"><i />{t('جلسة نشطة')}</span>
              <strong className="focus-live-clock">{formatClock(session.mode === 'stopwatch' ? Math.floor((now - new Date(session.startedAt).getTime()) / 1000) : remainingSeconds)}</strong>
              <span className="focus-live-label">{t(session.mode === 'pomodoro' ? 'متبقي من جلسة التركيز' : 'وقت التركيز المنقضي')}</span>
              <h1>{tasks.find((task) => task.id === session.taskId)?.title ?? t('جلسة تركيز مستقلة')}</h1>
              <p>{t('أغلق ما يشتت انتباهك. هذه اللحظة لك.')}</p>
            </div>
            <div className="focus-live-actions">
              <button type="button" className="ghost-button" onClick={onClose}><ChevronDown size={17} />{t('تصغير إلى المؤقت المصغر')}</button>
              <button type="button" className="danger-button" disabled={busy} onClick={() => onFinish?.(false)}><Pause size={15} />{t('إنهاء الجلسة')}</button>
              <button type="button" className="primary-button" disabled={busy} onClick={() => onFinish?.(true)}><Check size={16} />{t('إكمال الجلسة')}</button>
            </div>
          </>
        ) : (
          <>
        <div className="modal-topline">
          <span className="modal-icon modal-icon-focus">
            <Timer size={17} />
          </span>
          <span>{t('جلسة تركيز هادئة')}</span>
          <button className="icon-button" onClick={onClose} aria-label={t('إغلاق')}>
            <X size={18} />
          </button>
        </div>
        <div className="focus-modal-timer">
          <div className="modal-timer-ring">
            <svg className="timer-ring" viewBox="0 0 220 220" aria-hidden="true" focusable="false">
              <circle cx="110" cy="110" r="100" fill="none" stroke="var(--line)" strokeWidth="10" />
              {mode === 'pomodoro' && (
                <circle
                  cx="110"
                  cy="110"
                  r="100"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 100}
                  strokeDashoffset={0}
                  transform="rotate(-90 110 110)"
                />
              )}
            </svg>
            <div className="timer-ring__label">
              <span>{mode === 'pomodoro' ? `${String(pomodoroMinutes).padStart(2, '0')}:00` : '∞'}</span>
              <small>
                {mode === 'pomodoro' ? `${formatArNumber(pomodoroMinutes)} ${t('دقيقة تركيز')}` : t('مؤقت مفتوح')}
              </small>
            </div>
          </div>
        </div>
        <div className="focus-mode-switch">
          <button
            type="button"
            className={mode === 'pomodoro' ? 'mode-active' : ''}
            aria-pressed={mode === 'pomodoro'}
            onClick={() => setMode('pomodoro')}
          >
            <Timer size={14} />
            {t('بومودورو،')} {formatArNumber(pomodoroMinutes)} {t('دقيقة')}
          </button>
          <button
            type="button"
            className={mode === 'stopwatch' ? 'mode-active' : ''}
            aria-pressed={mode === 'stopwatch'}
            onClick={() => setMode('stopwatch')}
          >
            <Clock3 size={14} />
            {t('مؤقت مفتوح')}
          </button>
        </div>
        {mode === 'pomodoro' && (
          <label className="focus-task-select focus-duration-select">
            <span>{t('مدة التركيز')}</span>
            <select
              value={pomodoroMinutes}
              onChange={(event) => setPomodoroMinutes(Number(event.target.value))}
            >
              {[10, 15, 20, 25, 30, 45, 60, 90].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} {t('دقيقة')}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="focus-task-select">
          <span>
            {t('على ماذا ستركز؟')} <small>{t('اختياري')}</small>
          </span>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">{t('اختر مهمة أو اتركها فارغة')}</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button focus-start-wide" onClick={onStart}>
          <Play size={16} fill="currentColor" />
          {t('ابدأ التركيز')}
        </button>
        <div className="focus-modal-note">
          <Sparkles size={13} />
          {t('أغلق ما يشتت انتباهك. هذه اللحظة لك.')}
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FocusModal;
