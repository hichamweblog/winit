'use client';

import { memo } from 'react';
import type { Habit, Log } from '@/lib/types';
import { Check } from '../icons';
import { habitIconFor } from '../habit-icons';
import { goalStyle } from '@/lib/goals';

export type HabitRowProps = {
  habit: Habit;
  log?: Log;
  onToggle: () => void;
};

export const HabitRow = memo(function HabitRow({ habit, log, onToggle }: HabitRowProps) {
  const done = Boolean(log && log.value >= habit.targetValue);
  const Icon = habitIconFor(habit.icon);
  const label =
    habit.recordType === 'check'
      ? done
        ? 'تم إنجاز العادة اليوم'
        : 'انقر لتسجيل العادة اليوم'
      : done
      ? 'اكتمل هدف اليوم'
      : `${log?.value ?? 0} من ${habit.targetValue} ${habit.unit}`;

  return (
    <div className={`habit-row ${done ? 'habit-done' : ''}`}>
      <span
        className="habit-icon"
        style={{ color: goalStyle(habit.color).onSoft, background: goalStyle(habit.color).soft }}
      >
        <Icon size={18} />
      </span>
      <div className="habit-info">
        <strong className="habit-title">{habit.name}</strong>
        <span className="habit-status-caption">{label}</span>
      </div>
      <button
        className={`habit-toggle ${done ? 'done' : ''}`}
        onClick={onToggle}
        aria-label={`تسجيل عادة ${habit.name}`}
      >
        {done ? <Check size={14} /> : <span className="habit-toggle-idle" />}
      </button>
    </div>
  );
});

export default HabitRow;
