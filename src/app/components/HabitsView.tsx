'use client';

import { useState, type CSSProperties } from 'react';
import type { Habit, Log } from '@/lib/types';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from '../icons';
import { RowActions } from './atoms';
import HabitHistory from './HabitHistory';
import { habitIconFor } from '../habit-icons';
import { addDays, getWeekStart, localDateKey } from '@/lib/core';
import { goalStyle } from '@/lib/goals';

export type HabitsViewProps = {
  habits: Habit[];
  logs: Log[];
  today: string;
  onToggle: (habit: Habit, log?: Log) => void;
  onSetValue: (habit: Habit, value: number) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  onAdd: () => void;
  onReorder: (next: Habit[]) => void;
  invalidationToken?: string | number;
};

export function HabitsView({
  habits,
  logs,
  today,
  onToggle,
  onSetValue,
  onEdit,
  onDelete,
  onAdd,
  onReorder,
  invalidationToken,
}: HabitsViewProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [draggedHabitId, setDraggedHabitId] = useState<string | null>(null);
  const [dragOverHabitId, setDragOverHabitId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded = habits.length > 0 && habits.every((h) => expanded[h.id]);
  const toggleAll = () => {
    if (allExpanded) {
      setExpanded({});
    } else {
      const all: Record<string, boolean> = {};
      habits.forEach((h) => {
        all[h.id] = true;
      });
      setExpanded(all);
    }
  };

  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= habits.length) return;
    const updated = [...habits];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onReorder(updated);
  };

  return (
    <section className="list-page habits-page" aria-labelledby="habits-heading">
      <div className="page-title-row">
        <div>
          <h1 id="habits-heading">مساحة العادات</h1>
          <p>تابع تقدّمك من دون ضغط؛ كل عودة هي بداية جديدة.</p>
        </div>
        <div className="page-title-actions">
          {habits.length > 0 && (
            <button
              type="button"
              className="ghost-button habit-expand-all-btn"
              onClick={toggleAll}
              aria-label={allExpanded ? 'طي كل التفاصيل' : 'عرض كل التفاصيل'}
            >
              {allExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              <span>{allExpanded ? 'طي التفاصيل' : 'عرض التفاصيل'}</span>
            </button>
          )}
          <button className="primary-button" onClick={onAdd}>
            <Plus size={17} />
            عادة جديدة
          </button>
        </div>
      </div>
      <div className="habit-dashboard-list">
        {habits.map((habit, index) => {
          const log = logs.find((item) => item.habitId === habit.id && item.logDate === today);
          const done = Boolean(log && log.value >= habit.targetValue);
          const Icon = habitIconFor(habit.icon);
          const weekStart = getWeekStart(new Date(`${today}T12:00:00`));
          const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          const progress =
            habit.recordType === 'check'
              ? done
                ? 100
                : 0
              : Math.min(100, Math.round(((log?.value ?? 0) / habit.targetValue) * 100));
          const kind =
            habit.recordType === 'duration'
              ? 'مدة يومية'
              : habit.recordType === 'quantity'
              ? 'هدف يومي'
              : 'إنجاز يومي';
          const isExpanded = Boolean(expanded[habit.id]);
          const isDragging = draggedHabitId === habit.id;
          const isOver = dragOverHabitId === habit.id;

          return (
            <article
              className={`habit-card ${isExpanded ? 'habit-card-expanded' : 'habit-card-compact'} ${
                isDragging ? 'is-dragging' : ''
              } ${isOver ? 'drag-over' : ''}`}
              key={habit.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', habit.id);
                e.dataTransfer.effectAllowed = 'move';
                setDraggedHabitId(habit.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverHabitId !== habit.id) setDragOverHabitId(habit.id);
              }}
              onDragLeave={() => {
                if (dragOverHabitId === habit.id) setDragOverHabitId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const sourceId = e.dataTransfer.getData('text/plain');
                setDraggedHabitId(null);
                setDragOverHabitId(null);
                if (!sourceId || sourceId === habit.id) return;
                const sourceIndex = habits.findIndex((h) => h.id === sourceId);
                const targetIndex = habits.findIndex((h) => h.id === habit.id);
                if (sourceIndex === -1 || targetIndex === -1) return;
                const nextHabits = [...habits];
                const [moved] = nextHabits.splice(sourceIndex, 1);
                nextHabits.splice(targetIndex, 0, moved);
                onReorder(nextHabits);
              }}
            >
              <div
                className="habit-card-summary row-interactive"
                tabIndex={0}
                role="button"
                aria-expanded={isExpanded}
                aria-controls={`habit-details-${habit.id}`}
                aria-label={`تفاصيل عادة ${habit.name}`}
                onClick={() => toggleExpand(habit.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(habit.id);
                  }
                }}
              >
                <div className="habit-summary-main">
                  <span
                    className="habit-drag-handle"
                    role="button"
                    tabIndex={0}
                    aria-label={`إعادة ترتيب عادة ${habit.name}`}
                    title="اسحب لإعادة الترتيب (أو الأسهم)"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        moveHabit(index, 'up');
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        moveHabit(index, 'down');
                      }
                    }}
                  >
                    <GripVertical size={16} />
                  </span>
                  <span
                    className="habit-icon"
                    style={{ color: goalStyle(habit.color).onSoft, background: goalStyle(habit.color).soft }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="habit-summary-info">
                    <strong className="habit-summary-title">
                      <bdi>{habit.name}</bdi>
                    </strong>
                    <div className="habit-summary-meta-row">
                      {done ? (
                        <span className="habit-summary-badge habit-badge-done">
                          <Check size={12} /> اكتمل هدف اليوم
                        </span>
                      ) : habit.recordType === 'check' ? (
                        <span className="habit-summary-badge">
                          {habit.targetValue} {habit.unit} كل يوم
                        </span>
                      ) : (
                        <span className="habit-summary-badge">
                          {log ? `${log.value} من ${habit.targetValue} ${habit.unit}` : `هدف اليوم: ${habit.targetValue} ${habit.unit}`}{' '}
                          ({progress}%)
                        </span>
                      )}
                      {habit.reminderTime && (
                        <span className="habit-summary-badge habit-reminder-badge">
                          <Clock3 size={11} /> {habit.reminderTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="habit-summary-side" onClick={(e) => e.stopPropagation()}>
                  {habit.recordType === 'check' ? (
                    <button
                      className={`habit-toggle habit-toggle-large ${done ? 'done' : ''}`}
                      onClick={() => onToggle(habit, log)}
                      aria-label={`تسجيل عادة ${habit.name}`}
                    >
                      {done && <Check size={14} />}
                    </button>
                  ) : (
                    <span
                      className="habit-progress-pill"
                      style={{ color: goalStyle(habit.color).onSoft, background: goalStyle(habit.color).soft }}
                    >
                      {progress}%
                    </span>
                  )}
                  <span className="habit-expand-icon" aria-hidden="true">
                    <ChevronDown className={`habit-chevron ${isExpanded ? 'is-expanded' : ''}`} size={18} />
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div id={`habit-details-${habit.id}`} className="habit-card-details">
                  <div className="habit-card-top">
                    <div className="habit-card-title">
                      <span className="habit-type-label">{kind}</span>
                      {habit.description && <p className="habit-details-desc">{habit.description}</p>}
                    </div>
                    <div className="habit-card-tools">
                      <RowActions>
                        <button
                          type="button"
                          className="icon-button row-action"
                          onClick={() => moveHabit(index, 'up')}
                          disabled={index === 0}
                          aria-label={`تحريك عادة ${habit.name} لأعلى`}
                          title="تحريك لأعلى"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button row-action"
                          onClick={() => moveHabit(index, 'down')}
                          disabled={index === habits.length - 1}
                          aria-label={`تحريك عادة ${habit.name} لأسفل`}
                          title="تحريك لأسفل"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button row-action"
                          onClick={() => onEdit(habit)}
                          aria-label={`تعديل عادة ${habit.name}`}
                          title="تعديل"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-button row-action row-action-danger"
                          onClick={() => onDelete(habit)}
                          aria-label={`حذف عادة ${habit.name}`}
                          title="حذف"
                        >
                          <Trash2 size={14} />
                        </button>
                      </RowActions>
                    </div>
                  </div>
                  <div className="habit-progress-copy">
                    <span>
                      {done
                        ? 'اكتمل هدف اليوم'
                        : log
                        ? `${log.value} من ${habit.targetValue} ${habit.unit}`
                        : `هدف اليوم: ${habit.targetValue} ${habit.unit}`}
                    </span>
                    <b>
                      <bdi>{progress}%</bdi>
                    </b>
                  </div>
                  <div
                    className="habit-progress-track"
                    role="progressbar"
                    aria-label={`تقدم ${habit.name} اليوم`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                  >
                    <span
                      style={{
                        transform: `scaleX(${progress / 100})`,
                        background: goalStyle(habit.color).solid,
                      }}
                    />
                  </div>
                  <div className="habit-week">
                    {weekDays.map((day, i) => {
                      const key = localDateKey(day);
                      const entry = logs.find((item) => item.habitId === habit.id && item.logDate === key);
                      const met = (entry?.value ?? 0) >= habit.targetValue;
                      const state = met ? 'done' : key >= today ? 'future' : 'missed';
                      const label = `${['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'][i]}: ${
                        met ? 'اكتمل' : key > today ? 'قادم' : 'لم يسجّل'
                      }`;
                      return (
                        <span
                          key={key}
                          className="week-strip__day"
                          data-state={state}
                          data-today={key === today}
                          title={label}
                          aria-label={label}
                          role="img"
                          style={{ '--goal-solid': goalStyle(habit.color).solid } as CSSProperties}
                        >
                          {met ? <Check size={13} /> : null}
                        </span>
                      );
                    })}
                  </div>
                  <HabitHistory
                    habitId={habit.id}
                    habitName={habit.name}
                    color={habit.color}
                    unit={habit.unit}
                    invalidationToken={invalidationToken}
                  />
                  <div className="habit-card-bottom">
                    {habit.recordType === 'check' ? (
                      <span>تسجيل بنقرة واحدة</span>
                    ) : (
                      <div className="habit-log-editor">
                        <label htmlFor={`habit-value-${habit.id}`}>قيمة اليوم</label>
                        <input
                          id={`habit-value-${habit.id}`}
                          type="number"
                          min="0"
                          max="10000"
                          step="1"
                          value={values[habit.id] ?? String(log?.value ?? '')}
                          onChange={(event) => setValues({ ...values, [habit.id]: event.target.value })}
                        />
                        <span>{habit.unit}</span>
                        <button
                          className="habit-action"
                          onClick={() => onSetValue(habit, Math.max(0, Number(values[habit.id] ?? log?.value ?? 0)))}
                        >
                          {log ? 'تحديث' : 'حفظ'}
                        </button>
                      </div>
                    )}
                    {habit.recordType === 'check' && (
                      <button
                        className={`habit-action ${done ? 'habit-action-done' : ''}`}
                        aria-pressed={done}
                        onClick={() => onToggle(habit, log)}
                      >
                        {done ? (
                          <>
                            <Check size={14} />
                            تم اليوم
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            تسجيل اليوم
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {habit.reminderTime && (
                    <div className="habit-reminder">
                      <Clock3 size={13} />
                      تذكير يومي {habit.reminderTime}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
        {!habits.length && (
          <div className="empty-page">
            <h3>ابدأ بعادة واحدة</h3>
            <p>القرآن، الحركة، أو أي شيء تريد الاستمرار عليه.</p>
            <button className="primary-button" onClick={onAdd}>
              <Plus size={16} />أنشئ عادة
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default HabitsView;
