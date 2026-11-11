'use client';

import { useState } from 'react';
import type { Project } from '@/lib/types';
import { FolderKanban, Trash2, X } from '../icons';
import { projectIcons } from '../project-icons';
import {
  DEFAULT_PROJECT_ICON,
  PROJECT_ICON_GROUPS,
  PROJECT_ICON_LABELS,
  isProjectIcon,
} from '@/lib/project-icons';
import { DEFAULT_GOAL_KEY, GOAL_SLOTS, goalStyle } from '@/lib/goals';
import { formatArNumber } from '@/lib/core';
import { useConfirm } from './ConfirmDialog';
import useDialogFocus from './useDialogFocus';

export type ProjectModalProps = {
  project: Project | null;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (project: Project) => void;
  busy: boolean;
};

export function ProjectModal({ project, onClose, onSubmit, onDelete, busy }: ProjectModalProps) {
  // §4.3: a fixed palette, not a free colour picker. Legacy values still render
  // (goalStyle resolves them) but new choices come from the fixed slots.
  // An unknown legacy icon is preselected as an extra option so editing a
  // project never silently changes its icon.
  const palette = GOAL_SLOTS.map((slot) => slot.key);
  const colors = project && !palette.includes(project.color) ? [project.color, ...palette] : palette;
  const currentIcon = project?.icon ?? DEFAULT_PROJECT_ICON;
  const legacyIcon = project && !isProjectIcon(currentIcon) ? currentIcon : null;

  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [targetWeeklyMinutes, setTargetWeeklyMinutes] = useState(String(project?.targetWeeklyMinutes ?? 0));
  const initialIcon = legacyIcon || currentIcon;
  const [icon, setIcon] = useState(initialIcon);
  const initialColor = project?.color ?? colors[0] ?? DEFAULT_GOAL_KEY;
  const [color, setColor] = useState(initialColor);

  const dirty =
    name !== (project?.name ?? '') ||
    description !== (project?.description ?? '') ||
    Number(targetWeeklyMinutes) !== (project?.targetWeeklyMinutes ?? 0) ||
    icon !== initialIcon ||
    color !== initialColor;

  const { confirm, confirmDialog } = useConfirm();
  const requestClose = async () => {
    if (busy) return;
    if (dirty) {
      const discard = await confirm({
        title: 'تغييرات غير محفوظة',
        message: 'لديك تغييرات لم تُحفظ في هذا المشروع. هل تريد إغلاق النافذة وتجاهل التعديلات؟',
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

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        ref={dialogRef}
        className="task-modal project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-editor-heading"
        onSubmit={onSubmit}
      >
        <div className="modal-topline">
          <span className="modal-icon">
            <FolderKanban size={17} />
          </span>
          <span id="project-editor-heading">{project ? 'تعديل المشروع' : 'مشروع جديد'}</span>
          <button type="button" className="icon-button" onClick={close} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <label className="journal-field-label" htmlFor="project-name">
          اسم المشروع
        </label>
        <input
          id="project-name"
          className="task-title-input"
          dir="auto"
          name="name"
          autoFocus
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثلاً: تعلّم البرمجة"
        />
        <label className="journal-field-label" htmlFor="project-description">
          وصف قصير، اختياري
        </label>
        <textarea
          id="project-description"
          className="task-notes-input"
          dir="auto"
          name="description"
          maxLength={1000}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="ما الذي تريد إنجازه في هذا المشروع؟"
        />
        <div className="modal-fields">
          <label>
            <span>هدف التركيز الأسبوعي بالدقائق</span>
            <input
              name="targetWeeklyMinutes"
              type="number"
              min="0"
              max="10080"
              step="15"
              value={targetWeeklyMinutes}
              onChange={(e) => setTargetWeeklyMinutes(e.target.value)}
            />
          </label>
        </div>
        <fieldset className="project-icon-field">
          <legend>أيقونة المشروع</legend>
          {legacyIcon && (
            <div className="picker-legacy">
              <label className="project-icon-choice">
                <input
                  type="radio"
                  name="icon"
                  value={legacyIcon}
                  checked={icon === legacyIcon}
                  onChange={() => setIcon(legacyIcon)}
                  aria-label="الأيقونة الحالية"
                />
                <span>
                  <FolderKanban size={17} />
                </span>
              </label>
              <small>الأيقونة الحالية</small>
            </div>
          )}
          {PROJECT_ICON_GROUPS.map((group) => (
            <div className="picker-group" key={group.label}>
              <p className="picker-group__label">{group.label}</p>
              <div className="picker-grid">
                {group.ids.map((value) => {
                  const Icon = projectIcons[value];
                  const label = PROJECT_ICON_LABELS[value];
                  return (
                    <label key={value} className="project-icon-choice" title={label}>
                      <input
                        type="radio"
                        name="icon"
                        value={value}
                        checked={icon === value}
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
        </fieldset>
        <fieldset className="project-color-field">
          <legend>لون المشروع</legend>
          <div className="picker-grid picker-grid--color">
            {colors.map((value) => {
              const slot = GOAL_SLOTS.find((item) => item.key === value);
              const label = slot?.label ?? 'اللون الحالي';
              return (
                <label key={value} className="project-color-choice" title={label}>
                  <input
                    type="radio"
                    name="color"
                    value={value}
                    checked={color === value}
                    onChange={() => setColor(value)}
                    aria-label={label}
                  />
                  <i style={{ backgroundColor: goalStyle(value).solid }} />
                </label>
              );
            })}
          </div>
          <p className="picker-hint">
            {formatArNumber(GOAL_SLOTS.length)} لوناً ثابتاً، لكل منها اسم حتى لا يكون اللون هو الإشارة الوحيدة.
          </p>
        </fieldset>
        <div className="modal-footer">
          {project ? (
            <button
              className="text-button-danger"
              type="button"
              onClick={() => onDelete(project)}
              disabled={busy}
            >
              <Trash2 size={15} />
              حذف المشروع
            </button>
          ) : (
            <span>يمكنك تعديل المشروع لاحقاً</span>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : project ? 'حفظ التعديلات' : 'إنشاء المشروع'}
          </button>
        </div>
      </form>
      {confirmDialog}
    </div>
  );
}

export default ProjectModal;
