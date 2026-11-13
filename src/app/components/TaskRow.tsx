'use client';

import { memo, type CSSProperties } from 'react';
import type { Project, Task } from '@/lib/types';
import { Check, Pencil, Play, Trash2 } from '../icons';
import { DueChip, PriorityFlag, RowActions, SessionCount } from './atoms';
import { goalStyle } from '@/lib/goals';
import { truncateWords } from '@/lib/label';

export type TaskRowProps = {
  task: Task;
  project?: Project;
  today: string;
  onComplete: () => void;
  onStart: () => void;
  onEdit: () => void;
  onDelete?: () => void;
};

export const TaskRow = memo(function TaskRow({
  task,
  project,
  today,
  onComplete,
  onStart,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const isDone = task.status === 'completed';

  return (
    <div className={`task-row row-interactive ${isDone ? 'task-done' : ''}`}>
      <button
        type="button"
        className="task-check"
        role="checkbox"
        aria-checked={isDone}
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        aria-label={isDone ? `إلغاء إكمال ${task.title}` : `إكمال ${task.title}`}
      >
        <Check size={13} />
      </button>
      <button
        type="button"
        className="task-body"
        onClick={onEdit}
        aria-label={`تعديل ${task.title}`}
      >
        <div className="task-title-line">
          <strong className="task-title">
            <bdi>{task.title}</bdi>
          </strong>
          {task.priority !== 'none' && <PriorityFlag priority={task.priority} />}
        </div>
        <div className="task-meta">
          {project && (
            <span
              className="meta-item project-pill"
              style={{ '--project-color': goalStyle(project.color).solid } as CSSProperties}
            >
              <span className="project-dot" />
              {truncateWords(project.name)}
            </span>
          )}
          {task.dueDate && <DueChip date={task.dueDate} today={today} />}
          {task.estimatedPomodoros > 0 && <SessionCount count={task.estimatedPomodoros} size={11} />}
        </div>
        {task.notes && (
          <p className="task-notes-snippet" dir="auto">
            <bdi>{task.notes}</bdi>
          </p>
        )}
      </button>
      <RowActions>
        <button
          type="button"
          className="icon-button row-action"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label={`تعديل ${task.title}`}
          title="تعديل"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="icon-button row-action"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          aria-label={`بدء التركيز على ${task.title}`}
          title="بدء جلسة تركيز"
        >
          <Play size={13} />
        </button>
        {onDelete && (
          <button
            type="button"
            className="icon-button row-action row-action-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={`حذف ${task.title}`}
            title="حذف"
          >
            <Trash2 size={14} />
          </button>
        )}
      </RowActions>
    </div>
  );
});

export default TaskRow;
