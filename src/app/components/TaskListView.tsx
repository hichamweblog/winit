'use client';

import { useMemo } from 'react';
import type { Project, Task } from '@/lib/types';
import { Plus, Timer } from '../icons';
import { TaskRow } from './TaskRow';
import { CountBadge } from './atoms';
import { AR_LOCALE, formatArNumber, formatDuration, PRIORITY_ORDER } from '@/lib/core';
import { tasksLabel } from '@/lib/semantics';

export type TaskListViewProps = {
  title: string;
  tasks: Task[];
  projects: Project[];
  project?: Project;
  today: string;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onEdit: (task: Task) => void;
  onAdd: () => void;
};

export function TaskListView({
  title,
  tasks,
  projects,
  project,
  today,
  onComplete,
  onDelete,
  onStart,
  onEdit,
  onAdd,
}: TaskListViewProps) {
  const currentProject = (id: string | null) => projects.find((item) => item.id === id);

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    const sorted = [...tasks].sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const dateCmp = (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
      if (dateCmp !== 0) return dateCmp;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });

    for (const task of sorted) {
      const key =
        task.dueDate && task.dueDate < today
          ? 'متأخرة'
          : task.dueDate === today
          ? 'اليوم'
          : task.dueDate
          ? new Intl.DateTimeFormat(AR_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(
              new Date(`${task.dueDate}T12:00:00`)
            )
          : 'بلا موعد';
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks, today]);

  return (
    <section className="list-page">
      <div className="page-title-row">
        <div>
          <h1>{title}</h1>
          <p>
            {project?.description ||
              (tasks.length ? (
                <span aria-label={tasksLabel(tasks.length)}>
                  <bdi>{formatArNumber(tasks.length)}</bdi> تنتظر وقتك
                </span>
              ) : (
                'مساحة واضحة لما يستحق انتباهك.'
              ))}
          </p>
          {project?.targetWeeklyMinutes ? (
            <span className="project-target">
              <Timer size={13} />
              هدف التركيز الأسبوعي: {formatDuration(project.targetWeeklyMinutes * 60)}
            </span>
          ) : null}
        </div>
        <div className="page-title-actions">
          <button className="primary-button" onClick={onAdd}>
            <Plus size={17} />
            مهمة جديدة
          </button>
        </div>
      </div>

      {tasks.length ? (
        <div className="task-groups">
          {[...groups.entries()].map(([label, list]) => (
            <section className="task-group" key={label}>
              <div className="group-title">
                <span>{label}</span>
                <CountBadge count={list.length} />
              </div>
              <div className="task-list">
                {list.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={currentProject(task.projectId)}
                    today={today}
                    onComplete={() => onComplete(task.id)}
                    onStart={() => onStart(task.id)}
                    onEdit={() => onEdit(task)}
                    onDelete={() => onDelete(task.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="empty-page">
          <h3>لا توجد مهام هنا بعد</h3>
          <p>أضف أول مهمة، وسنساعدك على إبقاء الصورة واضحة.</p>
          <button className="primary-button" onClick={onAdd}>
            <Plus size={16} />
            أضف مهمة
          </button>
        </div>
      )}
    </section>
  );
}

export default TaskListView;
