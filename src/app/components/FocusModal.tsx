'use client';

import type { Task } from '@/lib/types';
import { Clock3, Play, Sparkles, Timer, X } from '../icons';
import { formatArNumber } from '@/lib/core';
import useDialogFocus from './useDialogFocus';

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
}: FocusModalProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className="focus-modal" role="dialog" aria-modal="true" aria-label="جلسة تركيز هادئة">
        <div className="modal-topline">
          <span className="modal-icon modal-icon-focus">
            <Timer size={17} />
          </span>
          <span>جلسة تركيز هادئة</span>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">
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
                {mode === 'pomodoro' ? `${formatArNumber(pomodoroMinutes)} دقيقة تركيز` : 'مؤقت مفتوح'}
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
            بومودورو، {formatArNumber(pomodoroMinutes)} دقيقة
          </button>
          <button
            type="button"
            className={mode === 'stopwatch' ? 'mode-active' : ''}
            aria-pressed={mode === 'stopwatch'}
            onClick={() => setMode('stopwatch')}
          >
            <Clock3 size={14} />
            مؤقت مفتوح
          </button>
        </div>
        {mode === 'pomodoro' && (
          <label className="focus-task-select focus-duration-select">
            <span>مدة التركيز</span>
            <select
              value={pomodoroMinutes}
              onChange={(event) => setPomodoroMinutes(Number(event.target.value))}
            >
              {[10, 15, 20, 25, 30, 45, 60, 90].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} دقيقة
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="focus-task-select">
          <span>
            على ماذا ستركز؟ <small>اختياري</small>
          </span>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">اختر مهمة أو اتركها فارغة</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button focus-start-wide" onClick={onStart}>
          <Play size={16} fill="currentColor" />
          ابدأ التركيز
        </button>
        <div className="focus-modal-note">
          <Sparkles size={13} />
          أغلق ما يشتت انتباهك. هذه اللحظة لك.
        </div>
      </div>
    </div>
  );
}

export default FocusModal;
