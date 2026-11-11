'use client';

import { useState } from 'react';
import type { Project, Task } from '@/lib/types';
import { ListTodo, Plus, Stopwatch, X } from '../icons';
import { useConfirm } from './ConfirmDialog';
import useDialogFocus from './useDialogFocus';

export type TaskModalProps = {
  projects: Project[];
  selectedProject: string | null;
  today: string;
  task: Task | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  busy: boolean;
};

export function TaskModal({
  projects,
  selectedProject,
  today,
  task,
  onClose,
  onSubmit,
  busy,
}: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [projectId, setProjectId] = useState(task?.projectId ?? selectedProject ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'none');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? (selectedProject ? '' : today));
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(String(task?.estimatedPomodoros ?? 1));
  const [tags, setTags] = useState(task?.tags ?? '');
  const [status, setStatus] = useState(task?.status ?? 'todo');

  const dirty =
    title !== (task?.title ?? '') ||
    notes !== (task?.notes ?? '') ||
    projectId !== (task?.projectId ?? selectedProject ?? '') ||
    priority !== (task?.priority ?? 'none') ||
    dueDate !== (task?.dueDate ?? (selectedProject ? '' : today)) ||
    estimatedPomodoros !== String(task?.estimatedPomodoros ?? 1) ||
    tags !== (task?.tags ?? '') ||
    (task ? status !== task.status : false);

  const { confirm, confirmDialog } = useConfirm();
  const requestClose = async () => {
    if (busy) return;
    if (dirty) {
      const discard = await confirm({
        title: 'تغييرات غير محفوظة',
        message: 'لديك تغييرات لم تُحفظ في هذه المهمة. هل تريد إغلاق النافذة وتجاهل التعديلات؟',
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
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-editor-heading"
        onSubmit={onSubmit}
      >
        <div className="modal-topline">
          <span className="modal-icon">
            <ListTodo size={17} />
          </span>
          <span id="task-editor-heading">{task ? 'تعديل المهمة' : 'مهمة جديدة'}</span>
          <button type="button" className="icon-button" onClick={close} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        <input
          className="task-title-input"
          dir="auto"
          autoFocus
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ما الذي تود إنجازه؟"
          maxLength={240}
          required
        />
        <textarea
          className="task-notes-input"
          dir="auto"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أضف ملاحظة صغيرة تساعدك…"
          rows={2}
        />
        <div className="modal-fields">
          <label>
            <span>المشروع</span>
            <select name="projectId" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">صندوق الوارد</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>الأولوية</span>
            <select
              name="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
            >
              <option value="none">بدون أولوية</option>
              <option value="high">عالية</option>
              <option value="medium">متوسطة</option>
              <option value="low">منخفضة</option>
            </select>
          </label>
          <label>
            <span>تاريخ الاستحقاق</span>
            <input name="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <label>
            <span>
              <Stopwatch size={13} aria-hidden="true" />
              جلسات التركيز
            </span>
            <select
              name="estimatedPomodoros"
              aria-label="عدد جلسات التركيز المتوقعة"
              value={estimatedPomodoros}
              onChange={(e) => setEstimatedPomodoros(e.target.value)}
            >
              {Array.from({ length: 20 }, (_, index) => index + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="modal-field-full">
            <span>وسوم، مفصولة بفواصل</span>
            <input
              name="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              maxLength={300}
              placeholder="دراسة، مراجعة"
            />
          </label>
          {task && (
            <label>
              <span>الحالة</span>
              <select name="status" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
                <option value="todo">قيد الانتظار</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="completed">مكتملة</option>
              </select>
            </label>
          )}
        </div>
        <div className="modal-footer">
          <span>
            <kbd>Esc</kbd> للإغلاق
          </span>
          <button className="primary-button" type="submit" disabled={busy || !title.trim()}>
            <Plus size={15} />
            {busy ? 'جارٍ الحفظ…' : task ? 'حفظ التعديلات' : 'أضف إلى يومي'}
          </button>
        </div>
      </form>
      {confirmDialog}
    </div>
  );
}

export default TaskModal;
