'use client';

import type { Project, Task } from '@/lib/types';
import { Plus, Trash2 } from '../icons';
import { TaskRow } from './TaskRow';

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

  return (
    <section className="list-page">
      <div className="page-title-row">
        <div>
          <h1>{title}</h1>
          {project?.description && <p>{project.description}</p>}
        </div>
        <div className="page-title-actions">
          <button className="primary-button" onClick={onAdd}>
            <Plus size={17} />
            مهمة جديدة
          </button>
        </div>
      </div>
      <div className="task-list">
        {tasks.length ? (
          tasks.map((task) => (
            <div className="task-item-wrap" key={task.id}>
              <TaskRow
                task={task}
                project={currentProject(task.projectId)}
                today={today}
                onComplete={() => onComplete(task.id)}
                onStart={() => onStart(task.id)}
                onEdit={() => onEdit(task)}
              />
              <button
                className="icon-button row-action row-action-danger delete-task-btn"
                onClick={() => onDelete(task.id)}
                aria-label="حذف المهمة"
                title="حذف المهمة"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <b>لا توجد مهام هنا</b>
            <span>أضف مهمة للبدء في هذا القسم.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default TaskListView;
