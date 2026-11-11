'use client';

import { useState } from 'react';
import type { Habit } from '@/lib/types';
import { Plus, Target, X } from '../icons';
import { habitIcons, habitIconFor } from '../habit-icons';
import {
  DEFAULT_HABIT_ICON,
  HABIT_ICON_GROUPS,
  HABIT_ICON_LABELS,
  isHabitIcon,
} from '@/lib/habit-icons';
import { GOAL_SLOTS, goalStyle } from '@/lib/goals';
import { formatArNumber } from '@/lib/core';
import { useConfirm } from './ConfirmDialog';
import useDialogFocus from './useDialogFocus';

export type HabitModalProps = {
  habit: Habit | null;
  onClose: () => void;
  onSubmit: (body: unknown) => Promise<void>;
  busy: boolean;
};

export function HabitModal({ habit, onClose, onSubmit, busy }: HabitModalProps) {
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [type, setType] = useState<Habit['recordType']>(habit?.recordType ?? 'check');
  const [target, setTarget] = useState(String(habit?.targetValue ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? 'مرة');
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime ?? '');
  const [color, setColor] = useState(habit?.color ?? '#138A78');
  const [icon, setIcon] = useState(habit?.icon ?? DEFAULT_HABIT_ICON);

  const dirty =
    name !== (habit?.name ?? '') ||
    description !== (habit?.description ?? '') ||
    type !== (habit?.recordType ?? 'check') ||
    target !== String(habit?.targetValue ?? 1) ||
    unit !== (habit?.unit ?? 'مرة') ||
    reminderTime !== (habit?.reminderTime ?? '') ||
    color !== (habit?.color ?? '#138A78') ||
    icon !== (habit?.icon ?? DEFAULT_HABIT_ICON);

  const { confirm, confirmDialog } = useConfirm();
  const requestClose = async () => {
    if (busy) return;
    if (dirty) {
      const discard = await confirm({
        title: 'تغييرات غير محفوظة',
        message: 'لديك تغييرات لم تُحفظ في هذه العادة. هل تريد إغلاق النافذة وتجاهل التعديلات؟',
        confirmLabel: 'تجاهل التغييرات',
        cancelLabel: 'متابعة التعديل',
      });
      if (!discard) return;
    }
    onClose();
  };
  const close = () => {
    void requestClose();
  };
  const dialogRef = useDialogFocus<HTMLFormElement>(close);
  const palette = GOAL_SLOTS.map((slot) => slot.key);
  const colors = habit && !palette.includes(habit.color) ? [habit.color, ...palette] : palette;
  // An unknown legacy icon stays selectable so editing never silently changes it.
  const legacyIcon = habit && !isHabitIcon(habit.icon) ? habit.icon : null;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        ref={dialogRef}
        className="task-modal habit-modal"
        role="dialog"
        aria-modal="true"
        aria-label={habit ? 'تعديل العادة' : 'إضافة عادة جديدة'}
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({
            name: name.trim(),
            description: description.trim() || null,
            recordType: type,
            targetValue: Number(target),
            unit,
            reminderTime: reminderTime || null,
            color,
            icon,
          });
        }}
      >
        <div className="modal-topline">
          <span className="modal-icon modal-icon-habit">
            <Target size={17} />
          </span>
          <span>{habit ? 'تعديل العادة' : 'عادة جديدة'}</span>
          <button type="button" className="icon-button" onClick={close} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <label className="journal-field-label" htmlFor="habit-name">
          اسم العادة
        </label>
        <input
          id="habit-name"
          className="task-title-input"
          dir="auto"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="ما العادة التي تريد بناءها؟"
          required
          maxLength={100}
        />
        <label className="journal-field-label" htmlFor="habit-description">
          وصف، اختياري
        </label>
        <textarea
          id="habit-description"
          className="task-notes-input"
          dir="auto"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          placeholder="أضف تذكيراً لطيفاً لنفسك"
        />
        <div className="modal-fields">
          <label>
            <span>طريقة التتبع</span>
            <select
              value={type}
              onChange={(event) => {
                const value = event.target.value as Habit['recordType'];
                setType(value);
                setUnit(value === 'duration' ? 'دقيقة' : value === 'quantity' ? 'صفحات' : 'مرة');
              }}
            >
              <option value="check">إنجاز بسيط</option>
              <option value="quantity">عدد / كمية</option>
              <option value="duration">مدة زمنية</option>
            </select>
          </label>
          {type !== 'check' && (
            <>
              <label>
                <span>الهدف اليومي</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                />
              </label>
              <label>
                <span>الوحدة</span>
                <input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={30} />
              </label>
            </>
          )}
          <label>
            <span>تذكير اختياري</span>
            <input
              type="time"
              value={reminderTime}
              onChange={(event) => setReminderTime(event.target.value)}
            />
          </label>
        </div>
        <fieldset className="project-icon-field habit-icon-field">
          <legend>أيقونة العادة</legend>
          {legacyIcon && (
            <div className="picker-group picker-legacy">
              <p className="picker-group__label">الأيقونة الحالية</p>
              <div className="picker-grid">
                <label className="project-icon-choice" title="الأيقونة الحالية">
                  <input
                    type="radio"
                    name="habitIcon"
                    checked={icon === legacyIcon}
                    onChange={() => setIcon(legacyIcon)}
                    aria-label="الأيقونة الحالية"
                  />
                  <span>
                    {(() => {
                      const Icon = habitIconFor(legacyIcon);
                      return <Icon size={18} />;
                    })()}
                  </span>
                </label>
              </div>
            </div>
          )}
          {HABIT_ICON_GROUPS.map((group) => (
            <div className="picker-group" key={group.label}>
              <p className="picker-group__label">{group.label}</p>
              <div className="picker-grid">
                {group.ids.map((value) => {
                  const Icon = habitIcons[value];
                  const label = HABIT_ICON_LABELS[value];
                  return (
                    <label key={value} className="project-icon-choice" title={label}>
                      <input
                        type="radio"
                        name="habitIcon"
                        checked={!legacyIcon && icon === value}
                        onChange={() => setIcon(value)}
                        aria-label={label}
                      />
                      <span>
                        <Icon size={18} />
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="picker-hint">
            {formatArNumber(Object.keys(habitIcons).length)} أيقونة في {formatArNumber(HABIT_ICON_GROUPS.length)}{' '}
            مجموعات، لكل منها اسم يقرأه قارئ الشاشة.
          </p>
        </fieldset>
        <fieldset className="project-color-field">
          <legend>لون العادة</legend>
          <div className="picker-grid picker-grid--color">
            {colors.map((value, index) => (
              <label key={value} className="project-color-choice">
                <input
                  type="radio"
                  name="habitColor"
                  checked={color === value}
                  onChange={() => setColor(value)}
                  aria-label={GOAL_SLOTS.find((slot) => slot.key === value)?.label ?? `لون ${index + 1}`}
                />
                <i style={{ backgroundColor: goalStyle(value).solid }} />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="modal-footer">
          <span>يمكنك تعديلها لاحقاً</span>
          <button
            className="primary-button"
            type="submit"
            disabled={busy || !name.trim() || (type !== 'check' && Number(target) < 1)}
          >
            <Plus size={15} />
            {busy ? 'جارٍ الحفظ…' : habit ? 'حفظ التعديلات' : 'أنشئ العادة'}
          </button>
        </div>
      </form>
      {confirmDialog}
    </div>
  );
}

export default HabitModal;
