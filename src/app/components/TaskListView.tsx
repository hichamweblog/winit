'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Project, Task } from '@/lib/types';
import { Plus, Timer } from '../icons';
import { TaskRow } from './TaskRow';
import { CountBadge } from './atoms';
import { AR_LOCALE, formatArNumber, formatDuration, PRIORITY_ORDER } from '@/lib/core';
import { tasksLabel } from '@/lib/semantics';
import { useLocale } from '../locale';

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
  const { language, t } = useLocale();
  const [listMode, setListMode] = useState<'combined' | 'separate'>('separate');
  useEffect(() => {
    if (!project) { setListMode('separate'); return; }
    try {
      setListMode(window.localStorage.getItem(`winit-project-list-mode:${project.id}`) === 'combined' ? 'combined' : 'separate');
    } catch { setListMode('separate'); }
  }, [project?.id]);
  const changeListMode = (next: 'combined' | 'separate') => {
    setListMode(next);
    if (project) {
      try { window.localStorage.setItem(`winit-project-list-mode:${project.id}`, next); } catch { /* keep current view */ }
    }
  };
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
          ? t('متأخرة')
          : task.dueDate === today
          ? t('اليوم')
          : task.dueDate
          ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : AR_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(
              new Date(`${task.dueDate}T12:00:00`)
            )
          : t('بلا موعد');
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks, today, language]);
  const visibleGroups = project && listMode === 'combined'
    ? new Map([[t('كل المهام'), [...groups.values()].flat()]])
    : groups;

  return (
    <section className="list-page">
      <div className="page-title-row">
        <div>
          <h1>{title}</h1>
          <p>
            {project?.description ||
              (tasks.length ? (
                <span aria-label={tasksLabel(tasks.length)}>
                  <bdi>{formatArNumber(tasks.length)}</bdi> {t('تنتظر وقتك')}
                </span>
              ) : (
                t('مساحة واضحة لما يستحق انتباهك.')
              ))}
          </p>
          {project?.targetWeeklyMinutes ? (
            <span className="project-target">
              <Timer size={13} />
              {t('هدف التركيز الأسبوعي:')} {formatDuration(project.targetWeeklyMinutes * 60)}
            </span>
          ) : null}
        </div>
        <div className="page-title-actions">
          {project && (
            <div className="page-view-switch" role="group" aria-label={t('تجميع مهام المشروع')}>
              <button type="button" className={listMode === 'combined' ? 'page-view-active' : ''} aria-pressed={listMode === 'combined'} onClick={() => changeListMode('combined')}>{t('عرض موحد')}</button>
              <button type="button" className={listMode === 'separate' ? 'page-view-active' : ''} aria-pressed={listMode === 'separate'} onClick={() => changeListMode('separate')}>{t('مقسمة حسب الموعد')}</button>
            </div>
          )}
          <button className="btn btn-primary primary-button" onClick={onAdd}>
            <Plus size={17} />
            {t('مهمة جديدة')}
          </button>
        </div>
      </div>

      {tasks.length ? (
        <div className="task-groups">
          {[...visibleGroups.entries()].map(([label, list]) => (
            <section className="task-group" key={label}>
              <div className="group-title">
                <span>{t(label)}</span>
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
          <h3>{t('لا توجد مهام هنا بعد')}</h3>
          <p>{t('أضف أول مهمة، وسنساعدك على إبقاء الصورة واضحة.')}</p>
          <button className="btn btn-primary primary-button" onClick={onAdd}>
            <Plus size={16} />
            {t('أضف مهمة')}
          </button>
        </div>
      )}
    </section>
  );
}

export default TaskListView;
