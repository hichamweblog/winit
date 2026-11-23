'use client';

import { useState, type DragEvent } from 'react';
import type { Project, Task } from '@/lib/types';
import { TaskRow } from './TaskRow';
import { useLocale } from '../locale';

const columns: { status: Task['status']; label: string }[] = [
  { status: 'todo', label: 'قيد الانتظار' },
  { status: 'in_progress', label: 'قيد التنفيذ' },
  { status: 'completed', label: 'مكتملة' },
];

export default function KanbanBoard({
  tasks, projects, today, onStatusChange, onComplete, onDelete, onStart, onEdit,
}: {
  tasks: Task[];
  projects: Project[];
  today: string;
  onStatusChange: (taskId: string, status: Task['status']) => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onEdit: (task: Task) => void;
}) {
  const { t } = useLocale();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Task['status'] | null>(null);

  const beginDrag = (event: DragEvent<HTMLDivElement>, task: Task) => {
    setDragging(task.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.id);
  };
  const dropOn = (event: DragEvent<HTMLElement>, status: Task['status']) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || dragging;
    const task = tasks.find((item) => item.id === id);
    if (task && task.status !== status) onStatusChange(task.id, status);
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="kanban-board" aria-label={t('لوحة كانبان للمشروع')}>
      {columns.map(({ status, label }) => {
        const items = tasks.filter((task) => task.status === status);
        return (
          <section
            key={status}
            className={`kanban-column ${dragOver === status ? 'kanban-column-over' : ''}`}
            onDragOver={(event) => { event.preventDefault(); setDragOver(status); }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(null); }}
            onDrop={(event) => dropOn(event, status)}
            aria-label={`${t(label)} · ${items.length}`}
          >
            <header className="kanban-column-head">
              <h2>{t(label)}</h2>
              <span className="count-badge" aria-label={`${items.length} ${t('مهام')}`}>{items.length}</span>
            </header>
            {items.length ? (
              <div className="kanban-cards">
                {items.map((task) => (
                  <div
                    key={task.id}
                    className={`kanban-card ${dragging === task.id ? 'kanban-card-dragging' : ''}`}
                    draggable
                    onDragStart={(event) => beginDrag(event, task)}
                    onDragEnd={() => { setDragging(null); setDragOver(null); }}
                  >
                    <TaskRow
                      task={task}
                      project={projects.find((project) => project.id === task.projectId)}
                      today={today}
                      onComplete={() => onComplete(task.id)}
                      onDelete={() => onDelete(task.id)}
                      onStart={() => onStart(task.id)}
                      onEdit={() => onEdit(task)}
                    />
                    <label className="kanban-move-control">
                      <span>{t('Move to')}</span>
                      <select aria-label={`${t('Move task')} ${task.title}`} value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value as Task['status'])}>
                        {columns.map((column) => <option key={column.status} value={column.status}>{t(column.label)}</option>)}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="kanban-column-empty">{t('اسحب مهمة إلى هنا')}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
