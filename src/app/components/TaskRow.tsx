'use client';

import { memo, type CSSProperties } from 'react';
import type { Project, Task } from '@/lib/types';
import { Check, Pencil, Play } from '../icons';
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
};

export const TaskRow = memo(function TaskRow({
  task,
  project,
  today,
  onComplete,
  onStart,
  onEdit,
}: TaskRowProps) {
  const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'completed';
  const isDone = task.status === 'completed';

  return (
    <div className={`task-row ${isDone ? 'task-done' : ''}`}>
      <button
        className={`checkbox ${isDone ? 'checked' : ''}`}
        onClick={onComplete}
        aria-label={isDone ? 'إلغاء إكمال المهمة' : 'إكمال المهمة'}
      >
        {isDone && <Check size={13} />}
      </button>
      <div className="task-body">
        <div className="task-title-line">
          <strong className="task-title">{task.title}</strong>
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
      </div>
      <RowActions>
        <button className="icon-button row-action" onClick={onStart} aria-label="بدء جلسة تركيز" title="بدء جلسة تركيز">
          <Play size={13} />
        </button>
        <button className="icon-button row-action" onClick={onEdit} aria-label="تعديل المهمة" title="تعديل">
          <Pencil size={13} />
        </button>
      </RowActions>
    </div>
  );
});

export default TaskRow;
