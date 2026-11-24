'use client';

import { memo } from 'react';
import type { Habit, Log } from '@/lib/types';
import { Check } from '../icons';
import { habitIconFor } from '../habit-icons';
import { goalStyle } from '@/lib/goals';
import { useLocale } from '../locale';

export type HabitRowProps = {
  habit: Habit;
  log?: Log;
  onToggle: () => void;
};

export const HabitRow = memo(function HabitRow({ habit, log, onToggle }: HabitRowProps) {
  const { t } = useLocale();
  const done = Boolean(log && log.value >= habit.targetValue);
  const Icon = habitIconFor(habit.icon);
  const label =
    habit.recordType === 'check'
      ? done
        ? t('تم إنجاز العادة اليوم')
        : t('انقر لتسجيل العادة اليوم')
      : done
      ? t('اكتمل هدف اليوم')
      : t('{value} من {target} {unit}', { value: log?.value ?? 0, target: habit.targetValue, unit: habit.unit });

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
        aria-label={t('تسجيل عادة {name}', { name: habit.name })}
      >
        {done ? <Check size={14} /> : <span className="habit-toggle-idle" />}
      </button>
    </div>
  );
});

export default HabitRow;
